import { Text, TextInput, TextInputProps, View, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
interface Props extends TextInputProps { label: string }
export function Input({ label, style, ...props }: Props) {
 return <View style={{ gap: 8 }}><Text style={styles.label}>{label}</Text>
 <TextInput {...props} accessibilityLabel={label} placeholderTextColor={colors.secondaryText} style={[styles.input, style]} /></View>;
}
const styles = StyleSheet.create({
 label: { fontSize: 14, fontWeight: '600', color: colors.text },
 input: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.text, fontSize: 16 },
});
