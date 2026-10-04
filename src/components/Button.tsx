import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '@/constants/colors';
interface Props { title: string; onPress?: () => void; disabled?: boolean; variant?: 'primary' | 'secondary' }
export function Button({ title, onPress, disabled = false, variant = 'primary' }: Props) {
 return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
 style={({ pressed }) => [styles.button, variant === 'secondary' && styles.secondary, (pressed || disabled) && { opacity: 0.55 }]}>
 <Text style={[styles.label, variant === 'secondary' && { color: colors.primary }]}>{title}</Text></Pressable>;
}
const styles = StyleSheet.create({
 button: { minHeight: 52, padding: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
 secondary: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.border },
 label: { fontSize: 16, fontWeight: '600', color: colors.surface },
});
