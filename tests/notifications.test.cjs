const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  const absolute = path.resolve(file);
  if (cache.has(absolute)) return cache.get(absolute);
  const exports = {}; cache.set(absolute, exports);
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const localRequire = specifier => load(specifier.startsWith('@/') ? 'src/' + specifier.slice(2) + '.ts' : path.resolve(path.dirname(absolute), specifier + '.ts'));
  new Function('exports', 'require', code)(exports, localRequire); return exports;
}
const { getTaskNotifications } = load('src/utils/notifications.ts');
const now = new Date(2026, 9, 5, 14);
const task = (id, deadline, status = 'todo', dependsOnTaskId) => ({ id, projectId: 'p1', title: id, description: '', assignedTo: 'u1', deadline, status, dependsOnTaskId, checklist: [] });
test('creates one deterministic deadline reminder for each incomplete task', () => {
  const notifications = getTaskNotifications([task('overdue', '2026-10-04'), task('today', '2026-10-05'), task('soon', '2026-10-07'), task('later', '2026-10-09'), task('done', '2026-10-04', 'completed')], now);
  assert.deepEqual(notifications.map(item => [item.taskId, item.type]), [['overdue', 'overdue'], ['today', 'due_today'], ['soon', 'due_soon']]);
  assert.equal(notifications.find(item => item.taskId === 'soon').message, 'soon is due in 2 days.');
});
test('blocked reminders track dependencies and disappear once the prerequisite is completed', () => {
  const blocked = task('blocked', '2026-10-20', 'todo', 'prerequisite');
  let notifications = getTaskNotifications([task('prerequisite', '2026-10-20'), blocked], now);
  assert.deepEqual(notifications.map(item => [item.taskId, item.type]), [['blocked', 'blocked']]);
  notifications = getTaskNotifications([task('prerequisite', '2026-10-20', 'completed'), blocked], now);
  assert.deepEqual(notifications, []);
});
test('completed tasks never receive deadline or blocked reminders', () => {
  assert.deepEqual(getTaskNotifications([task('done', '2026-10-04', 'completed', 'missing')], now), []);
});
