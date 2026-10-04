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

export default function TaskDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tasks, members, toggleChecklist, setTaskStatus } = useProjects();
  const task = tasks.find(item => item.id === id);
  if (!task) return <Screen><BackButton /><EmptyState title="Task not found" message="This task is not available in this session." /></Screen>;
  const status = getTaskStatus(task, tasks);
  const blocked = status === 'blocked';
  const dependency = tasks.find(item => item.id === task.dependsOnTaskId);
  const allChecked = task.checklist.every(item => item.completed);
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
      {task.checklist.map(item => <ChecklistItem key={item.id} item={item} disabled={blocked} onToggle={() => toggleChecklist(task.id, item.id)} />)}
      {!task.checklist.length && <Text style={sharedStyles.subtitle}>No checklist items. Progress stays at 0%; you can complete this task manually.</Text>}
    </View>
    <Button title="Start Task" disabled={blocked || status === 'completed' || status === 'in_progress'} onPress={() => setTaskStatus(task.id, 'in_progress')} />
    <Button title={status === 'completed' ? 'Task Completed' : 'Mark Completed'} disabled={blocked || !allChecked || status === 'completed'} onPress={() => setTaskStatus(task.id, 'completed')} />
    {!blocked && !allChecked && <Text style={sharedStyles.subtitle}>Finish all checklist items to mark this task completed.</Text>}
    {status === 'completed' && <Text style={sharedStyles.subtitle}>Uncheck an item to reopen this task.</Text>}
  </Screen>;
}
