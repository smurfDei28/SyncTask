import { Pressable, Text, StyleSheet } from 'react-native';
import { ChecklistItem as Item } from '@/types';
import { colors } from '@/constants/colors';
export function ChecklistItem({ item, disabled = false, onToggle }: { item: Item; disabled?: boolean; onToggle: () => void }) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={item.title}
    accessibilityState={{ checked: item.completed, disabled }} disabled={disabled} onPress={onToggle}
    style={({ pressed }) => [styles.row, (disabled || pressed) && { opacity: 0.55 }]}>
    <Text style={[styles.check, item.completed && styles.checked]}>{item.completed ? '?' : ''}</Text>
    <Text style={[styles.title, item.completed && { textDecorationLine: 'line-through', color: colors.secondaryText }]}>{item.title}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 8 },
  check: { width: 26, height: 26, borderWidth: 1, borderColor: colors.border, borderRadius: 6, textAlign: 'center', textAlignVertical: 'center', color: colors.surface, fontSize: 18 },
  checked: { borderColor: colors.primary, backgroundColor: colors.primary },
  title: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 22 },
});
