const assert = require('node:assert/strict');
const { test } = require('node:test');
const domainLoader = require('./load-domain.cjs');

function harness(platform = 'android', granted = true) {
  const scheduled = new Map();
  const calls = [];
  const notifications = {
    AndroidImportance: { DEFAULT: 3 }, SchedulableTriggerInputTypes: { DATE: 'date' },
    setNotificationHandler() {}, setNotificationChannelAsync: async () => {},
    getPermissionsAsync: async () => ({ granted }), requestPermissionsAsync: async () => ({ granted }),
    getAllScheduledNotificationsAsync: async () => [...scheduled.values()],
    cancelScheduledNotificationAsync: async id => { calls.push(['cancel', id]); scheduled.delete(id); },
    scheduleNotificationAsync: async value => {
      calls.push(['schedule', value.identifier]); scheduled.set(value.identifier, value); return value.identifier;
    },
  };
  const service = domainLoader({ 'react-native': { Platform: { OS: platform } }, 'expo-notifications': notifications })('src/services/reminderService.ts');
  return { service, scheduled, calls };
}
const plan = signature => [{ id: 'synctask:user:task:0', taskId: 'task', title: 'Due', body: signature,
  signature, date: new Date(Date.now() + 86400000) }];

test('scheduled alerts remain stable and deadline edits replace rather than duplicate them', async () => {
  const { service, scheduled, calls } = harness();
  await service.synchronizeReminders(plan('first'));
  await service.synchronizeReminders(plan('first'));
  assert.equal(calls.filter(call => call[0] === 'schedule').length, 1);
  await service.synchronizeReminders(plan('edited'));
  assert.equal(scheduled.size, 1); assert.equal([...scheduled.values()][0].content.data.signature, 'edited');
  assert.equal(calls.filter(call => call[0] === 'cancel').length, 1);
});
test('completion, reassignment, disabling and sign-out cancel pending alerts', async () => {
  const { service, scheduled } = harness();
  await service.synchronizeReminders(plan('first'));
  await service.synchronizeReminders([]);
  assert.equal(scheduled.size, 0);
});
test('queued sign-out cleanup wins over an in-flight scheduling operation', async () => {
  const { service, scheduled } = harness();
  await Promise.all([service.synchronizeReminders(plan('first')), service.synchronizeReminders([])]);
  assert.equal(scheduled.size, 0);
});
test('permission denial is explained and never schedules alerts', async () => {
  const { service, scheduled } = harness('android', false);
  await assert.rejects(service.requestReminderPermission(), /phone settings/);
  await service.synchronizeReminders(plan('first'));
  assert.equal(scheduled.size, 0);
});
test('web keeps device notifications disabled and explains the available alternative', async () => {
  const { service, scheduled } = harness('web');
  await assert.rejects(service.requestReminderPermission(), /due-task list/);
  await service.synchronizeReminders(plan('first'));
  assert.equal(scheduled.size, 0);
});
