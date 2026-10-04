import { createContext, PropsWithChildren, useContext, useReducer, useRef } from 'react';
import { members, projects, tasks as mockTasks } from '@/data/mockData';
import { Project, Task, User } from '@/types';
import { NewTaskInput, reconcileTasks, taskReducer, validateNewTask } from '@/utils/tasks';

interface ProjectContextValue {
  projects: Project[];
  members: User[];
  tasks: Task[];
  createTask: (input: NewTaskInput) => string | null;
  toggleChecklist: (taskId: string, itemId: string) => void;
  setTaskStatus: (taskId: string, status: 'in_progress' | 'completed') => void;
}
const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: PropsWithChildren) {
  const [tasks, dispatch] = useReducer(taskReducer, mockTasks, reconcileTasks);
  const nextTaskId = useRef(26);

  function createTask(input: NewTaskInput): string | null {
    const id = 'local-task-' + nextTaskId.current;
    const error = validateNewTask(input, tasks, projects, members, id);
    if (error) return error;
    nextTaskId.current += 1;
    dispatch({ type: 'create', task: {
      id, ...input, title: input.title.trim(), description: input.description.trim(),
      status: 'todo',
      checklist: input.checklist.map((title, index) => ({ id: id + '-c' + index, title: title.trim(), completed: false })),
    } });
    return null;
  }

  return <ProjectContext.Provider value={{
    projects, members, tasks, createTask,
    toggleChecklist: (taskId, itemId) => dispatch({ type: 'toggleChecklist', taskId, itemId }),
    setTaskStatus: (taskId, status) => dispatch({ type: 'setStatus', taskId, status }),
  }}>{children}</ProjectContext.Provider>;
}

export function useProjects() {
  const value = useContext(ProjectContext);
  if (!value) throw new Error('ProjectProvider is required');
  return value;
}
