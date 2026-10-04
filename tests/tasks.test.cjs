const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();

// Load the pure TypeScript domain code with the existing compiler, without
// adding a test framework or booting React Native.
function load(file) {
  const absolute = path.resolve(file);
  if (cache.has(absolute)) return cache.get(absolute);
  const exports = {};
  cache.set(absolute, exports);
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const localRequire = specifier => load(specifier.startsWith('@/')
    ? 'src/' + specifier.slice(2) + '.ts'
    : path.resolve(path.dirname(absolute), specifier + '.ts'));
  new Function('exports', 'require', code)(exports, localRequire);
  return exports;
}
const data = load('src/data/mockData.ts');
const { getTaskStatus, reconcileTasks, taskReducer, validateNewTask, wouldCreateCycle } = load('src/utils/tasks.ts');
const { getTaskProgress, getProjectProgress } = load('src/utils/progress.ts');
const { isValidDeadline, isOverdue } = load('src/utils/dates.ts');
const initial = () => reconcileTasks(data.tasks);
const input = { projectId: 'p1', title: 'Demo task', description: '', assignedTo: 'u1', deadline: '2026-10-30', checklist: [] };
function finish(tasks, id) {
  for (const item of tasks.find(task => task.id === id).checklist) {
    if (!item.completed) tasks = taskReducer(tasks, { type: 'toggleChecklist', taskId: id, itemId: item.id });
  }
  return taskReducer(tasks, { type: 'setStatus', taskId: id, status: 'completed' });
}

test('initial project and checklist progress match the classroom demo', () => {
  const tasks = initial();
  assert.equal(data.members.length, 5);
  assert.deepEqual(getProjectProgress('p1', tasks), { completed: 18, total: 25, percentage: 72 });
  assert.equal(getTaskProgress(tasks.find(task => task.id === 't19')), 75);
  assert.deepEqual(['todo','in_progress','blocked','completed'].map(status => tasks.filter(task => getTaskStatus(task, tasks) === status).length), [2,3,2,18]);
  assert(tasks.every(task => !('difficulty' in task)));
  assert.equal(getTaskProgress({ checklist: [] }), 0);
  assert.equal(getProjectProgress('missing', tasks).percentage, 0);
});

test('blocked controls are enforced in state as well as the UI', () => {
  const tasks = initial();
  const blocked = tasks.find(task => task.id === 't20');
  for (const action of [
    { type: 'setStatus', taskId: blocked.id, status: 'in_progress' },
    { type: 'setStatus', taskId: blocked.id, status: 'completed' },
    { type: 'toggleChecklist', taskId: blocked.id, itemId: blocked.checklist[0].id },
  ]) assert.equal(taskReducer(tasks, action), tasks);
  assert.equal(taskReducer(tasks, { type: 'setStatus', taskId: 't19', status: 'completed' }), tasks);
});

test('completion unblocks each dependency and updates project progress', () => {
  let tasks = finish(initial(), 't19');
  assert.equal(getTaskStatus(tasks.find(task => task.id === 't20'), tasks), 'todo');
  assert.equal(getTaskStatus(tasks.find(task => task.id === 't21'), tasks), 'blocked');
  assert.deepEqual(getProjectProgress('p1', tasks), { completed: 19, total: 25, percentage: 76 });
  tasks = taskReducer(tasks, { type: 'setStatus', taskId: 't20', status: 'in_progress' });
  assert.equal(tasks.find(task => task.id === 't20').status, 'in_progress');
  tasks = finish(tasks, 't20');
  assert.equal(getTaskStatus(tasks.find(task => task.id === 't21'), tasks), 'todo');
  tasks = finish(tasks, 't21');
  assert.equal(getProjectProgress('p1', tasks).completed, 21);
});

test('reopening a completed prerequisite blocks the whole chain and recalculates counts', () => {
  let tasks = finish(finish(finish(initial(), 't19'), 't20'), 't21');
  tasks = taskReducer(tasks, { type: 'toggleChecklist', taskId: 't19', itemId: tasks.find(task => task.id === 't19').checklist[0].id });
  assert.equal(getTaskProgress(tasks.find(task => task.id === 't19')), 75);
  assert.equal(tasks.find(task => task.id === 't19').status, 'in_progress');
  assert.equal(tasks.find(task => task.id === 't20').status, 'blocked');
  assert.equal(tasks.find(task => task.id === 't21').status, 'blocked');
  assert.equal(getProjectProgress('p1', tasks).completed, 18);
  tasks = finish(tasks, 't19');
  assert.equal(tasks.find(task => task.id === 't20').status, 'in_progress');
  assert.equal(tasks.find(task => task.id === 't21').status, 'blocked');
});

test('task creation validates required fields, IDs, checklist and calendar dates', () => {
  const validate = change => validateNewTask({ ...input, ...change }, initial(), data.projects, data.members, 'new');
  assert.equal(validate({}), null);
  for (const change of [{ title: ' ' }, { assignedTo: '' }, { assignedTo: 'missing' }, { projectId: 'missing' },
    { deadline: '2026-02-30' }, { deadline: '10/30/2026' }, { deadline: '' }, { checklist: [' '] },
    { dependsOnTaskId: 'missing' }, { dependsOnTaskId: 'new' }]) assert.equal(typeof validate(change), 'string');
  assert(isValidDeadline('2028-02-29'));
  assert(!isValidDeadline('2026-02-29'));
  assert(!isOverdue('2026-10-04', new Date(2026, 9, 4, 23)));
  assert(isOverdue('2026-10-03', new Date(2026, 9, 4)));
});

test('self, direct, and longer cycles are rejected and corrupt chains fail closed', () => {
  const tasks = initial();
  assert(wouldCreateCycle('t19', 't19', tasks));
  assert(wouldCreateCycle('t19', 't20', tasks));
  assert(wouldCreateCycle('t19', 't21', tasks));
  const corrupt = tasks.map(task => task.id === 't19' ? { ...task, dependsOnTaskId: 't21' } : task);
  assert.equal(getTaskStatus(corrupt.find(task => task.id === 't19'), corrupt), 'blocked');
  const invalid = { ...tasks[18], dependsOnTaskId: 'missing' };
  assert.equal(getTaskStatus(invalid, tasks), 'blocked');
});

test('new tasks update totals, handle empty checklists, and derive blocking immediately', () => {
  let tasks = initial();
  const created = { ...input, id: 'new', status: 'todo', checklist: [] };
  tasks = taskReducer(tasks, { type: 'create', task: created });
  assert.deepEqual(getProjectProgress('p1', tasks), { completed: 18, total: 26, percentage: 69 });
  tasks = taskReducer(tasks, { type: 'setStatus', taskId: 'new', status: 'completed' });
  assert.equal(getProjectProgress('p1', tasks).completed, 19);
  const waiting = { ...created, id: 'waiting', dependsOnTaskId: 't19' };
  tasks = taskReducer(tasks, { type: 'create', task: waiting });
  assert.equal(tasks.find(task => task.id === 'waiting').status, 'blocked');
  assert.equal(taskReducer(tasks, { type: 'create', task: waiting }), tasks);
  assert.equal(taskReducer(tasks, { type: 'create', task: { ...created, id: 'bad', dependsOnTaskId: 'missing' } }), tasks);
  tasks = finish(tasks, 't19');
  assert.equal(tasks.find(task => task.id === 'waiting').status, 'todo');
  assert.equal(data.tasks.length, 25);
});

test('all phase 1 and phase 2 navigation targets exist and are protected', () => {
  for (const route of ['index', '(auth)/login', '(auth)/register', '(tabs)/home', '(tabs)/tasks', 'project/[id]', 'task/[id]', 'task/create']) {
    assert(fs.existsSync('src/app/' + route + '.tsx'), route);
  }
  const root = fs.readFileSync('src/app/_layout.tsx', 'utf8');
  for (const route of ['(tabs)', 'project/[id]', 'task/[id]', 'task/create']) {
    assert(root.slice(root.indexOf('guard={!!user}')).includes('name="' + route + '"'));
  }
  const brand = fs.readFileSync('src/components/Brand.tsx', 'utf8');
  assert(brand.includes('synctask-logo.png'));
  assert(brand.includes('resizeMode="contain"'));
  assert(fs.readFileSync('src/components/AuthForm.tsx', 'utf8').includes('<Brand />'));
  assert(fs.readFileSync('src/components/SessionSplash.tsx', 'utf8').includes('<Brand large />'));
});
