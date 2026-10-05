import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BackButton } from '@/components/BackButton';
import { Choice } from '@/components/Choice';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { colors } from '@/constants/colors';
import { sharedStyles } from '@/constants/theme';
import { useProjects } from '@/context/ProjectContext';
import { getTaskNotifications, NotificationType, notificationDeadlineLabel } from '@/utils/notifications';

type Filter = 'all' | 'due' | 'overdue' | 'blocked';
const labels: Record<NotificationType, string> = { due_today: 'Due today', due_soon: 'Due soon', overdue: 'Overdue', blocked: 'Blocked' };
const typeColors: Record<NotificationType, string> = { due_today: colors.warning, due_soon: colors.primary, overdue: colors.danger, blocked: colors.blocked };

export default function NotificationsScreen() {
  const { tasks } = useProjects();
  const [filter, setFilter] = useState<Filter>('all');
  const notifications = useMemo(() => getTaskNotifications(tasks), [tasks]);
  const visible = notifications.filter(notification => filter === 'all' ||
    (filter === 'due' && (notification.type === 'due_today' || notification.type === 'due_soon')) || notification.type === filter);
  return <Screen><BackButton to="home" />
    <View style={{ gap: 6 }}><Text style={sharedStyles.title}>Notifications</Text><Text style={sharedStyles.subtitle}>Task reminders that need your attention.</Text></View>
    <View style={styles.filters}>{([['all', 'All'], ['due', 'Due Soon'], ['overdue', 'Overdue'], ['blocked', 'Blocked']] as [Filter, string][]).map(([value, label]) =>
      <Choice key={value} selected={filter === value} label={label} onPress={() => setFilter(value)} />)}</View>
    {visible.map(notification => <Pressable key={notification.id} accessibilityRole="button" accessibilityLabel={'Open task reminder: ' + notification.title}
      onPress={() => router.push({ pathname: '/task/[id]', params: { id: notification.taskId } })} style={({ pressed }) => [sharedStyles.card, styles.card, pressed && styles.pressed]}>
      <View style={[styles.indicator, { backgroundColor: typeColors[notification.type] }]} /><View style={styles.copy}>
        <Text style={[styles.type, { color: typeColors[notification.type] }]}>{labels[notification.type]}</Text><Text style={styles.title}>{notification.title}</Text>
        <Text style={sharedStyles.subtitle}>{notification.message}</Text>{notification.deadline && <Text style={styles.deadline}>{notificationDeadlineLabel(notification.deadline)}</Text>}
      </View></Pressable>)}
    {!visible.length && <EmptyState title={filter === 'all' ? 'All caught up' : 'No matching notifications'} message={filter === 'all' ? 'There are no active task reminders right now.' : 'Choose another filter to see other reminders.'} />}
  </Screen>;
}
const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, card: { flexDirection: 'row', gap: 14, padding: 18 }, pressed: { opacity: 0.7 },
  indicator: { width: 5, borderRadius: 4, alignSelf: 'stretch' }, copy: { flex: 1, gap: 5 }, type: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' }, deadline: { color: colors.secondaryText, fontSize: 13, fontWeight: '600', marginTop: 3 },
});
