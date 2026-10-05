import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { SharedProject, Task, User } from '@/types';
import { NewTaskInput } from '@/utils/tasks';
import { useAuth } from './AuthContext';
import { collaborationError, mutateTasks, saveNewTask, subscribeProjects, subscribeTasks } from '@/services/projectService';
import { canEdit, projectMembers } from '@/utils/collaboration';

interface ProjectContextValue {
  projects: SharedProject[]; members: User[]; tasks: Task[];
  loading: boolean; error: string | null; retry: () => void;
  canEditProject: (id: string) => boolean;
  createTask: (input: NewTaskInput) => Promise<void>;
  editTask: (id: string, input: NewTaskInput) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleChecklist: (taskId: string, itemId: string) => Promise<void>;
  setTaskStatus: (taskId: string, status: 'in_progress' | 'completed') => Promise<void>;
}
const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<SharedProject[]>([]);
  const [byProject, setByProject] = useState<Record<string, Task[]>>({});
  const [projectsLoading, setProjectsLoading] = useState(!!user);
  const [loadedIds, setLoadedIds] = useState<string[]>([]);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [taskErrors, setTaskErrors] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const uid = user?.id;
  useEffect(() => {
    if (!uid) return;
    return subscribeProjects(uid, items => {
      const ids = items.map(item => item.id);
      setProjects(items); setProjectsLoading(false);
      setByProject(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => ids.includes(id))));
      setLoadedIds(previous => previous.filter(id => ids.includes(id)));
      setTaskErrors(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => ids.includes(id))));
    },
      error => { setProjectError(collaborationError(error)); setProjects([]); setProjectsLoading(false); });
  }, [uid, attempt]);
  const projectIds = projects.map(project => project.id).sort().join(',');
  useEffect(() => {
    if (!projectIds) return;
    const ids = projectIds.split(',');
    const subscriptions = ids.map(id => subscribeTasks(id, items => {
      setByProject(previous => ({ ...previous, [id]: items }));
      setLoadedIds(previous => previous.includes(id) ? previous : [...previous, id]);
      setTaskErrors(previous => { const next = { ...previous }; delete next[id]; return next; });
    }, error => {
      setByProject(previous => ({ ...previous, [id]: [] }));
      setLoadedIds(previous => previous.includes(id) ? previous : [...previous, id]);
      setTaskErrors(previous => ({ ...previous, [id]: collaborationError(error) }));
    }));
    return () => subscriptions.forEach(unsubscribe => unsubscribe());
  }, [projectIds, attempt]);
  const tasks = projects.flatMap(project => byProject[project.id] ?? []);
  const members = Array.from(new Map(projects.flatMap(projectMembers).map(member => [member.id, member])).values());
  function identity() {
    if (!user) throw new Error('Please sign in again.');
    return user.id;
  }
  function taskProject(id: string) {
    const task = tasks.find(item => item.id === id);
    if (!task) throw new Error('Task not found.');
    return task.projectId;
  }
  return <ProjectContext.Provider value={{
    projects, members, tasks, loading: projectsLoading || projects.some(project => !loadedIds.includes(project.id)),
    error: projectError ?? Object.values(taskErrors)[0] ?? null, retry: () => {
      setProjectsLoading(true); setProjectError(null); setTaskErrors({}); setLoadedIds([]); setByProject({});
      setAttempt(value => value + 1);
    },
    canEditProject: id => canEdit(projects.find(project => project.id === id), user?.id),
    createTask: input => saveNewTask(identity(), input),
    editTask: (id, input) => mutateTasks(taskProject(id), identity(), { type: 'edit', taskId: id, input }),
    deleteTask: id => mutateTasks(taskProject(id), identity(), { type: 'delete', taskId: id }),
    toggleChecklist: (taskId, itemId) => mutateTasks(taskProject(taskId), identity(), { type: 'toggleChecklist', taskId, itemId }),
    setTaskStatus: (taskId, status) => mutateTasks(taskProject(taskId), identity(), { type: 'setStatus', taskId, status }),
  }}>{children}</ProjectContext.Provider>;
}

export function useProjects() {
  const value = useContext(ProjectContext);
  if (!value) throw new Error('ProjectProvider is required');
  return value;
}
