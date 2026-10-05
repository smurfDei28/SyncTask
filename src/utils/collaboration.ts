import { SharedProject, Task, User } from '@/types';
import { isValidDeadline } from './dates';
import { NewTaskInput, reconcileTasks, taskReducer, TaskAction, validateNewTask } from './tasks';

export function canEdit(project: SharedProject | undefined, uid: string | undefined) {
  return !!project && !!uid && ['owner', 'editor'].includes(project.members[uid]?.role);
}

export function projectMembers(project: SharedProject): User[] {
  return project.memberIds.map(id => ({ id, name: project.members[id].name, email: '' }));
}

export function validateProject(name: string, description: string, deadline: string) {
  if (!name.trim() || name.trim().length > 120) throw new Error('Enter a project name of 1–120 characters.');
  if (description.trim().length > 2000) throw new Error('Keep the description under 2,000 characters.');
  if (!isValidDeadline(deadline)) throw new Error('Enter a real deadline in YYYY-MM-DD format.');
}

export type SharedTaskAction = TaskAction
  | { type: 'edit'; taskId: string; input: NewTaskInput }
  | { type: 'delete'; taskId: string };

// Called with fresh transaction data, so validation also catches concurrent changes.
export function applySharedTaskAction(project: SharedProject, tasks: Task[], action: SharedTaskAction): Task[] {
  if (action.type === 'create' || action.type === 'edit') {
    const input = action.type === 'create'
      ? { ...action.task, checklist: action.task.checklist.map(item => item.title) } : action.input;
    const id = action.type === 'create' ? action.task.id : action.taskId;
    const error = validateNewTask(input, tasks, [project], projectMembers(project), id);
    if (error) throw new Error(error);
    if (input.title.trim().length > 120 || input.description.trim().length > 2000 ||
      input.checklist.length > 30 || input.checklist.some(title => title.trim().length > 120)) {
      throw new Error('Use a title up to 120 characters, a description up to 2,000, and up to 30 checklist items of 120 characters.');
    }
    if (input.projectId !== project.id) throw new Error('Tasks cannot move between projects.');
    if (action.type === 'create' && tasks.length >= 100) throw new Error('This project has reached its 100-task limit.');
  }
  if (action.type === 'edit') {
    const old = tasks.find(task => task.id === action.taskId);
    if (!old) throw new Error('This task was removed.');
    // Preserve completed steps only when their position and text are unchanged.
    const checklist = action.input.checklist.map((title, index) => ({
      id: old.id + '-c' + index, title: title.trim(),
      completed: old.checklist[index]?.title === title.trim() && old.checklist[index]?.completed === true,
    }));
    return reconcileTasks(tasks.map(task => task.id === old.id ? {
      ...old, ...action.input, title: action.input.title.trim(), description: action.input.description.trim(),
      checklist, status: old.status === 'completed' && !checklist.every(item => item.completed) ? 'in_progress' : old.status,
    } : task));
  }
  if (action.type === 'delete') {
    if (!tasks.some(task => task.id === action.taskId)) throw new Error('This task was already removed.');
    if (tasks.some(task => task.dependsOnTaskId === action.taskId)) throw new Error('Remove this task’s dependencies from other tasks before deleting it.');
    return tasks.filter(task => task.id !== action.taskId);
  }
  const updated = taskReducer(tasks, action);
  if (updated === tasks) throw new Error('This task cannot be changed. Refresh and check its prerequisites and checklist.');
  return updated;
}
