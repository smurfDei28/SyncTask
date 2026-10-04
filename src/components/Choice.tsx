import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '@/constants/colors';
export function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress}
    style={[styles.choice, selected && styles.selected]}>
    <Text style={[styles.label, selected && { color: colors.primary, fontWeight: '600' }]}>{label}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  choice: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, backgroundColor: colors.surface },
  selected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  label: { color: colors.secondaryText, fontSize: 14 },
});
