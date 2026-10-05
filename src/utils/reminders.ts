import { Task } from '@/types';
import { getTaskStatus } from './tasks';
import { isValidDeadline } from './dates';

export interface ReminderPlan { id: string; taskId: string; title: string; body: string; date: Date; signature: string }

export function dueTasks(tasks: Task[], uid: string, now = new Date()): Task[] {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  return tasks.filter(task => task.assignedTo === uid && getTaskStatus(task, tasks) !== 'completed' &&
    isValidDeadline(task.deadline) && new Date(task.deadline + 'T00:00:00') < end)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
}

export function reminderPlan(tasks: Task[], uid: string, now = new Date()): ReminderPlan[] {
  const result: ReminderPlan[] = [];
  for (const task of tasks) {
    if (task.assignedTo !== uid || getTaskStatus(task, tasks) === 'completed' || !isValidDeadline(task.deadline)) continue;
    const due = new Date(task.deadline + 'T09:00:00');
    for (const days of [1, 0]) {
      const date = new Date(due); date.setDate(date.getDate() - days);
      if (date <= now) continue;
      const body = `${task.title} is due ${days ? 'tomorrow' : 'today'}${getTaskStatus(task, tasks) === 'blocked' ? ' and is waiting on a prerequisite' : ''}.`;
      result.push({ id: `synctask:${uid}:${task.id}:${days}`, taskId: task.id,
        title: days ? 'Task due tomorrow' : 'Task due today', body, date,
        signature: `${date.getTime()}:${body}` });
    }
  }
  // Keep below iOS's pending notification limit, reserving room for other alerts.
  return result.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 60);
}
