const assert = require('node:assert/strict');
const { test } = require('node:test');
const load = require('./load-domain.cjs')();
const { applySharedTaskAction, canEdit, validateProject } = load('src/utils/collaboration.ts');
const { reminderPlan, dueTasks } = load('src/utils/reminders.ts');
const project = { id: 'p', memberIds: ['owner', 'editor', 'viewer'], members: {
  owner: { name: 'Owner', role: 'owner' }, editor: { name: 'Editor', role: 'editor' }, viewer: { name: 'Viewer', role: 'viewer' },
} };
const task = { id: 't', projectId: 'p', title: 'Ship', description: '', assignedTo: 'editor',
  deadline: '2026-10-07', status: 'completed', checklist: [{ id: 't-c0', title: 'Review', completed: true }] };
const input = { ...task, checklist: ['Review'] };

test('owner/editor can edit; viewers and outsiders cannot', () => {
  assert(canEdit(project, 'owner')); assert(canEdit(project, 'editor'));
  assert(!canEdit(project, 'viewer')); assert(!canEdit(project, 'outsider')); assert(!canEdit(undefined, 'owner'));
});
test('editing preserves completed steps, and changed steps reopen completed tasks', () => {
  let updated = applySharedTaskAction(project, [task], { type: 'edit', taskId: 't', input: { ...input, title: 'Publish', assignedTo: 'owner' } });
  assert.equal(updated[0].checklist[0].completed, true);
  assert.equal(updated[0].assignedTo, 'owner'); assert.equal(updated[0].status, 'completed');
  updated = applySharedTaskAction(project, [task], { type: 'edit', taskId: 't', input: { ...input, checklist: ['New review'] } });
  assert.equal(updated[0].checklist[0].completed, false); assert.equal(updated[0].status, 'in_progress');
});
test('editing rejects cross-project moves, departed assignees and dependency cycles', () => {
  for (const change of [{ projectId: 'elsewhere' }, { assignedTo: 'departed' }, { dependsOnTaskId: 't' }]) {
    assert.throws(() => applySharedTaskAction(project, [task], { type: 'edit', taskId: 't', input: { ...input, ...change } }));
  }
  const dependent = { ...task, id: 'child', dependsOnTaskId: 't' };
  assert.throws(() => applySharedTaskAction(project, [task, dependent], { type: 'edit', taskId: 't', input: { ...input, dependsOnTaskId: 'child' } }), /circular/);
});
test('deleting a prerequisite is blocked until dependencies are removed', () => {
  assert.throws(() => applySharedTaskAction(project, [task, { ...task, id: 'child', dependsOnTaskId: 't' }], { type: 'delete', taskId: 't' }), /dependencies/);
  assert.deepEqual(applySharedTaskAction(project, [task], { type: 'delete', taskId: 't' }), []);
});
test('project validation catches impossible dates and oversized fields', () => {
  assert.doesNotThrow(() => validateProject('Project', '', '2026-10-30'));
  for (const [name, desc, date] of [['', '', '2026-10-30'], ['Project', '', '2026-02-30'], ['Project', 'x'.repeat(2001), '2026-10-30']]) {
    assert.throws(() => validateProject(name, desc, date));
  }
});
test('reminders use local 9 AM, skip completed/other-user/past tasks and include blocked tasks', () => {
  const pending = { ...task, status: 'todo' };
  const tasks = [pending, { ...pending, id: 'other', assignedTo: 'owner' }, { ...task, id: 'done' },
    { ...pending, id: 'blocked', dependsOnTaskId: 'missing' }, { ...pending, id: 'past', deadline: '2026-10-01' }];
  const plan = reminderPlan(tasks, 'editor', new Date(2026, 9, 5, 12));
  assert.equal(plan.length, 4); assert(plan.every(item => item.date.getHours() === 9));
  assert.deepEqual(plan.filter(item => item.taskId === 't').map(item => item.date.getDate()), [6, 7]);
  assert(plan.find(item => item.taskId === 'blocked').body.includes('prerequisite'));
  assert.equal(reminderPlan([{ ...pending, assignedTo: 'owner' }], 'editor').length, 0);
  assert.equal(reminderPlan([task], 'editor').length, 0);
});
test('due list includes overdue and tomorrow, excludes later and completed assignments', () => {
  const tasks = ['2026-10-01', '2026-10-05', '2026-10-06', '2026-10-07'].map((deadline, index) => ({ ...task, id: String(index), status: 'todo', deadline }));
  assert.deepEqual(dueTasks([...tasks, { ...task, deadline: '2026-10-05' }], 'editor', new Date(2026, 9, 5, 23)).map(item => item.id), ['0', '1', '2']);
});
test('phone reminder plan is bounded and reschedules after changing the deadline', () => {
  const tasks = Array.from({ length: 100 }, (_, index) => ({ ...task, id: String(index), status: 'todo' }));
  const now = new Date(2026, 9, 5);
  assert.equal(reminderPlan(tasks, 'editor', now).length, 60);
  assert.notEqual(reminderPlan([tasks[0]], 'editor', now)[0].signature,
    reminderPlan([{ ...tasks[0], deadline: '2026-10-08' }], 'editor', now)[0].signature);
});
