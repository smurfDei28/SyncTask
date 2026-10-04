import { router } from 'expo-router';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Task, User } from '@/types';
import { colors } from '@/constants/colors';
import { sharedStyles } from '@/constants/theme';
import { getTaskProgress } from '@/utils/progress';
import { getTaskStatus } from '@/utils/tasks';
import { formatDeadline, isOverdue } from '@/utils/dates';
import { ProgressBar } from './ProgressBar';
import { StatusBadge } from './StatusBadge';

export function TaskCard({ task, tasks, members }: { task: Task; tasks: Task[]; members: User[] }) {
  const status = getTaskStatus(task, tasks);
  const progress = getTaskProgress(task);
  const dependency = tasks.find(item => item.id === task.dependsOnTaskId);
  return <Pressable accessibilityRole="button" accessibilityLabel={'Open task: ' + task.title}
    onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
    style={({ pressed }) => [sharedStyles.card, { padding: 20 }, pressed && { opacity: 0.7 }]}>
    <StatusBadge status={status} />
    <Text style={styles.title}>{task.title}</Text>
    <Text style={sharedStyles.subtitle}>Assigned to: {members.find(member => member.id === task.assignedTo)?.name ?? 'Unknown member'}</Text>
    <Text style={sharedStyles.subtitle}>Due: {formatDeadline(task.deadline, true)}</Text>
    {status !== 'completed' && isOverdue(task.deadline) && <Text style={{ color: colors.danger }}>Overdue</Text>}
    {status === 'blocked' && <Text style={styles.blocked}>Waiting for: {dependency?.title ?? 'Unavailable dependency'}</Text>}
    <View style={styles.row}><Text style={sharedStyles.subtitle}>Checklist progress</Text><Text style={styles.percentage}>{progress}%</Text></View>
    <ProgressBar percentage={progress} />
  </Pressable>;
}
const styles = StyleSheet.create({
  title: { fontSize: 19, lineHeight: 26, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  percentage: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  blocked: { color: colors.blocked, fontSize: 14, lineHeight: 21 },
});
