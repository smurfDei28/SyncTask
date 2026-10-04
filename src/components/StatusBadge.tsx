import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { TaskStatus } from '@/types';
export const statusLabels: Record<TaskStatus, string> = {
  todo: 'To Do', in_progress: 'In Progress', blocked: 'Blocked', completed: 'Completed',
};
const statusColors: Record<TaskStatus, string> = {
  todo: colors.secondaryText, in_progress: colors.primary, blocked: colors.blocked, completed: '#15803D',
};
export function StatusBadge({ status }: { status: TaskStatus }) {
  return <View style={[styles.badge, { borderColor: statusColors[status] }]}>
    <Text style={[styles.label, { color: statusColors[status] }]}>{statusLabels[status]}</Text>
  </View>;
}
const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.surface },
  label: { fontSize: 12, fontWeight: '600' },
});
