import { Task } from '@/types';
import { getTaskStatus } from './tasks';

export function getTaskProgress(task: Task) {
  return task.checklist.length
    ? Math.round(task.checklist.filter(item => item.completed).length / task.checklist.length * 100)
    : 0;
}

export function getProjectProgress(projectId: string, tasks: Task[]) {
  const selected = tasks.filter(task => task.projectId === projectId);
  const completed = selected.filter(task => getTaskStatus(task, tasks) === 'completed').length;
  return {
    completed, total: selected.length,
    percentage: selected.length ? Math.round(completed / selected.length * 100) : 0,
  };
}
