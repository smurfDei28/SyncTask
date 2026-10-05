import { Task } from '@/types';
import { formatDeadline, isOverdue } from './dates';
import { getTaskStatus } from './tasks';

export type NotificationType = 'due_today' | 'due_soon' | 'overdue' | 'blocked';

export interface TaskNotification {
  id: string;
  taskId: string;
  type: NotificationType;
  title: string;
  message: string;
  deadline?: string;
}

function calendarDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function daysUntil(deadline: string, now: Date): number {
  const dueDate = new Date(deadline + 'T00:00:00');
  return Math.round((dueDate.getTime() - calendarDay(now).getTime()) / 86_400_000);
}

const notificationOrder: Record<NotificationType, number> = { overdue: 0, due_today: 1, due_soon: 2, blocked: 3 };

/** Creates current in-app reminders from the task collection. Nothing is persisted. */
export function getTaskNotifications(tasks: Task[], now = new Date()): TaskNotification[] {
  const notifications: TaskNotification[] = [];
  for (const task of tasks) {
    // A persisted completed task never receives a reminder, even if malformed
    // dependency data would otherwise make its calculated status blocked.
    if (task.status === 'completed') continue;
    const status = getTaskStatus(task, tasks);
    if (status === 'completed') continue;
    if (status === 'blocked') notifications.push({
      id: task.id + '-blocked', taskId: task.id, type: 'blocked', title: task.title,
      message: task.title + ' is blocked until its dependency is completed.',
    });
    if (isOverdue(task.deadline, now)) {
      notifications.push({ id: task.id + '-overdue', taskId: task.id, type: 'overdue', title: task.title, message: task.title + ' is overdue.', deadline: task.deadline });
      continue;
    }
    const remainingDays = daysUntil(task.deadline, now);
    if (remainingDays === 0) notifications.push({
      id: task.id + '-due-today', taskId: task.id, type: 'due_today', title: task.title, message: task.title + ' is due today.', deadline: task.deadline,
    });
    else if (remainingDays >= 1 && remainingDays <= 3) notifications.push({
      id: task.id + '-due-soon', taskId: task.id, type: 'due_soon', title: task.title,
      message: task.title + ' is due in ' + remainingDays + (remainingDays === 1 ? ' day.' : ' days.'), deadline: task.deadline,
    });
  }
  return notifications.sort((left, right) => notificationOrder[left.type] - notificationOrder[right.type] || left.deadline?.localeCompare(right.deadline ?? '') || left.title.localeCompare(right.title));
}

export function notificationDeadlineLabel(deadline?: string): string | null {
  return deadline ? 'Due ' + formatDeadline(deadline, true) : null;
}
