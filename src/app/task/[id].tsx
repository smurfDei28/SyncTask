import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { ChecklistItem } from '@/components/ChecklistItem';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { StatusBadge } from '@/components/StatusBadge';
import { sharedStyles } from '@/constants/theme';
import { colors } from '@/constants/colors';
import { useProjects } from '@/context/ProjectContext';
import { formatDeadline } from '@/utils/dates';
import { getTaskProgress } from '@/utils/progress';
import { getTaskStatus } from '@/utils/tasks';
import { useRef, useState } from 'react';
import { DataStatus } from '@/components/DataStatus';
import { collaborationError } from '@/services/projectService';

export default function TaskDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tasks, members, toggleChecklist, setTaskStatus, deleteTask, canEditProject, loading, error: dataError } = useProjects();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const lock = useRef(false);
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); } catch (error) { setError(collaborationError(error)); }
    finally { lock.current = false; setBusy(false); }
  }
  if (loading || dataError) return <Screen><BackButton /><DataStatus /></Screen>;
  const task = tasks.find(item => item.id === id);
  if (!task) return <Screen><BackButton /><EmptyState title="Task not found" message="This task is not available in this session." /></Screen>;
  const status = getTaskStatus(task, tasks);
  const blocked = status === 'blocked';
  const dependency = tasks.find(item => item.id === task.dependsOnTaskId);
  const allChecked = task.checklist.every(item => item.completed);
  const editable = canEditProject(task.projectId);
  return <Screen><BackButton /><Text style={sharedStyles.title}>{task.title}</Text>
    <Text style={sharedStyles.subtitle}>{task.description || 'No description added.'}</Text>
    <View style={sharedStyles.card}>
      <StatusBadge status={status} />
      <Text style={sharedStyles.subtitle}>Assigned to: {members.find(member => member.id === task.assignedTo)?.name}</Text>
      <Text style={sharedStyles.subtitle}>Deadline: {formatDeadline(task.deadline)}</Text>
      <Text style={[sharedStyles.title, { color: colors.primary }]}>{getTaskProgress(task)}%</Text>
      <ProgressBar percentage={getTaskProgress(task)} />
      <Text style={sharedStyles.subtitle}>{task.checklist.filter(item => item.completed).length} of {task.checklist.length} checklist items completed</Text>
    </View>
    {!!task.dependsOnTaskId && <View style={sharedStyles.card}>
      <Text style={{ color: blocked ? colors.blocked : colors.text, fontWeight: '700', fontSize: 18 }}>{blocked ? 'TASK BLOCKED' : 'Dependency'}</Text>
      <Text style={sharedStyles.subtitle}>{blocked ? 'Waiting for: ' : ''}{dependency?.title ?? 'Unavailable dependency'}</Text>
      {dependency && <><StatusBadge status={getTaskStatus(dependency, tasks)} />
        <Button title="View prerequisite" variant="secondary" onPress={() => router.push({ pathname: '/task/[id]', params: { id: dependency.id } })} /></>}
      {blocked && <Text style={sharedStyles.subtitle}>Complete the prerequisite before starting or changing this task.</Text>}
    </View>}
    <View style={sharedStyles.card}><Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Checklist</Text>
      {task.checklist.map(item => <ChecklistItem key={item.id} item={item} disabled={blocked || busy || !editable} onToggle={() => run(() => toggleChecklist(task.id, item.id))} />)}
      {!task.checklist.length && <Text style={sharedStyles.subtitle}>No checklist items. Progress stays at 0%; you can complete this task manually.</Text>}
    </View>
    {!!error && <Text accessibilityRole="alert" style={sharedStyles.error}>{error}</Text>}
    {!editable && <Text style={sharedStyles.subtitle}>You have read-only access to this project.</Text>}
    {editable && <>
    <Button title="Start Task" disabled={busy || blocked || status === 'completed' || status === 'in_progress'} onPress={() => run(() => setTaskStatus(task.id, 'in_progress'))} />
    <Button title={status === 'completed' ? 'Task Completed' : 'Mark Completed'} disabled={busy || blocked || !allChecked || status === 'completed'} onPress={() => run(() => setTaskStatus(task.id, 'completed'))} />
    {status === 'completed' && !task.checklist.length && <Button title="Reopen Task" disabled={busy || blocked} onPress={() => run(() => setTaskStatus(task.id, 'in_progress'))} variant="secondary" />}
    <Button title="Edit Task" disabled={busy} variant="secondary" onPress={() => router.push({ pathname: '/task/create', params: { taskId: task.id, projectId: task.projectId } })} />
    {confirmDelete ? <>
      <Text style={sharedStyles.subtitle}>Permanently delete this task? Tasks that depend on it must be edited first.</Text>
      <Button title="Confirm Delete" disabled={busy} onPress={() => run(async () => { await deleteTask(task.id); router.replace({ pathname: '/(tabs)/tasks', params: { projectId: task.projectId } }); })} />
      <Button title="Cancel" disabled={busy} variant="secondary" onPress={() => setConfirmDelete(false)} />
    </> : <Button title="Delete Task" disabled={busy} variant="secondary" onPress={() => setConfirmDelete(true)} />}
    </>}
    {!blocked && !allChecked && <Text style={sharedStyles.subtitle}>Finish all checklist items to mark this task completed.</Text>}
    {status === 'completed' && <Text style={sharedStyles.subtitle}>Uncheck an item to reopen this task.</Text>}
  </Screen>;
}
