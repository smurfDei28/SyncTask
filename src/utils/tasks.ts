import { Project, Task, TaskStatus, User } from '@/types';
import { isValidDeadline } from './dates';

export interface NewTaskInput {
  projectId: string;
  title: string;
  description: string;
  assignedTo: string;
  deadline: string;
  dependsOnTaskId?: string;
  checklist: string[];
}

export function getTaskStatus(task: Task, tasks: Task[], visited = new Set<string>()): TaskStatus {
  if (visited.has(task.id)) return 'blocked';
  const nextVisited = new Set(visited).add(task.id);
  if (task.dependsOnTaskId) {
    const dependency = tasks.find(item => item.id === task.dependsOnTaskId);
    if (!dependency || getTaskStatus(dependency, tasks, nextVisited) !== 'completed') return 'blocked';
  }
  if (task.status === 'blocked') {
    return task.checklist.some(item => item.completed) ? 'in_progress' : 'todo';
  }
  return task.status;
}

// Reconcile the whole chain after each change. Reopening a prerequisite also
// reopens completed dependents; they must be completed again after unblocking.
export function reconcileTasks(tasks: Task[]): Task[] {
  return tasks.map(task => ({ ...task, status: getTaskStatus(task, tasks) }));
}

export function wouldCreateCycle(taskId: string, dependencyId: string, tasks: Task[]): boolean {
  const seen = new Set<string>([taskId]);
  let next: string | undefined = dependencyId;
  while (next) {
    if (seen.has(next)) return true;
    seen.add(next);
    next = tasks.find(task => task.id === next)?.dependsOnTaskId;
  }
  return false;
}

export function validateNewTask(input: NewTaskInput, tasks: Task[], projects: Project[], members: User[], taskId?: string): string | null {
  const project = projects.find(item => item.id === input.projectId);
  if (!project) return 'Please select a valid project.';
  if (!input.title.trim()) return 'Please enter a task title.';
  if (!members.some(member => member.id === input.assignedTo && project.memberIds.includes(member.id))) return 'Please select a team member.';
  if (!isValidDeadline(input.deadline)) return 'Enter a real deadline in YYYY-MM-DD format.';
  if (input.checklist.some(title => !title.trim())) return 'Checklist items cannot be blank. Fill them in or remove them.';
  if (input.dependsOnTaskId) {
    if (taskId && wouldCreateCycle(taskId, input.dependsOnTaskId, tasks)) return 'A task cannot depend on itself or create a circular dependency.';
    if (!tasks.some(task => task.id === input.dependsOnTaskId && task.projectId === input.projectId)) return 'Please select a valid dependency from this project.';
  }
  return null;
}

export type TaskAction =
  | { type: 'create'; task: Task }
  | { type: 'toggleChecklist'; taskId: string; itemId: string }
  | { type: 'setStatus'; taskId: string; status: 'in_progress' | 'completed' };

export function taskReducer(tasks: Task[], action: TaskAction): Task[] {
  if (action.type === 'create') {
    if (tasks.some(task => task.id === action.task.id)) return tasks;
    if (action.task.dependsOnTaskId && (
      !tasks.some(task => task.id === action.task.dependsOnTaskId && task.projectId === action.task.projectId) ||
      wouldCreateCycle(action.task.id, action.task.dependsOnTaskId, tasks)
    )) return tasks;
    return reconcileTasks([...tasks, action.task]);
  }
  const target = tasks.find(task => task.id === action.taskId);
  if (!target || getTaskStatus(target, tasks) === 'blocked') return tasks;
  if (action.type === 'setStatus' && action.status === 'completed' && !target.checklist.every(item => item.completed)) return tasks;
  return reconcileTasks(tasks.map(task => {
    if (task.id !== action.taskId) return task;
    if (action.type === 'setStatus') return { ...task, status: action.status };
    if (!task.checklist.some(item => item.id === action.itemId)) return task;
    const checklist = task.checklist.map(item => item.id === action.itemId ? { ...item, completed: !item.completed } : item);
    return { ...task, checklist, status: task.status === 'completed' || checklist.some(item => item.completed) ? 'in_progress' : task.status };
  }));
}
