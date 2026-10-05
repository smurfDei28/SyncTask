import { Platform } from 'react-native';
import { ReminderPlan } from '@/utils/reminders';

// Serialize rescheduling with sign-out cleanup so an old session cannot leave alerts behind.
let queue: Promise<unknown> = Promise.resolve();
function serialize(action: () => Promise<void>) {
  const next = queue.catch(() => {}).then(action);
  queue = next;
  return next;
}

async function notifications() {
  const module = await import('expo-notifications');
  module.setNotificationHandler({ handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
  }) });
  if (Platform.OS === 'android') await module.setNotificationChannelAsync('task-reminders', {
    name: 'Task reminders', importance: module.AndroidImportance.DEFAULT,
  });
  return module;
}

export async function requestReminderPermission() {
  if (Platform.OS === 'web') throw new Error('Phone notifications are available on Android and iOS. Your due-task list still works here.');
  const module = await notifications();
  let permission = await module.getPermissionsAsync();
  if (!permission.granted) permission = await module.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Notifications are disabled. Allow them in your phone settings to enable reminders.');
}

export function synchronizeReminders(plan: ReminderPlan[]) {
  return serialize(async () => {
    if (Platform.OS === 'web') return;
    const module = await notifications();
    const permission = await module.getPermissionsAsync();
    const desired = permission.granted ? plan : [];
    const existing = (await module.getAllScheduledNotificationsAsync()).filter(item => item.identifier.startsWith('synctask:'));
    for (const item of existing) {
      const match = desired.find(reminder => reminder.id === item.identifier && reminder.signature === item.content.data?.signature);
      if (!match) await module.cancelScheduledNotificationAsync(item.identifier);
    }
    for (const reminder of desired) {
      if (existing.some(item => item.identifier === reminder.id && item.content.data?.signature === reminder.signature)) continue;
      if (reminder.date <= new Date()) continue;
      await module.scheduleNotificationAsync({
        identifier: reminder.id,
        content: { title: reminder.title, body: reminder.body, data: { taskId: reminder.taskId, signature: reminder.signature } },
        trigger: { type: module.SchedulableTriggerInputTypes.DATE, date: reminder.date, channelId: 'task-reminders' },
      });
    }
  });
}
