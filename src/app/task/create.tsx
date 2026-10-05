import { useLocalSearchParams } from 'expo-router';
import { TaskForm } from '@/components/TaskForm';
import { useProjects } from '@/context/ProjectContext';
import { Screen } from '@/components/Screen';
import { DataStatus } from '@/components/DataStatus';
import { BackButton } from '@/components/BackButton';
import { EmptyState } from '@/components/EmptyState';

export default function CreateTaskScreen() {
  const { projectId, taskId } = useLocalSearchParams<{ projectId?: string; taskId?: string }>();
  const { projects, tasks, loading, error } = useProjects();
  if (loading || error) return <Screen><BackButton /><DataStatus /></Screen>;
  const task = tasks.find(item => item.id === taskId);
  const project = projects.find(item => item.id === (task?.projectId ?? projectId ?? projects[0]?.id));
  if (!project || (taskId && !task)) return <Screen><BackButton /><EmptyState title="Not available" message="This project or task may have been removed, or your access changed." /></Screen>;
  return <TaskForm key={task?.id ?? project.id} projectId={project.id} task={task} />;
}
