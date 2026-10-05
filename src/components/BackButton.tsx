import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '@/constants/colors';
export function BackButton({ to = 'tasks' }: { to?: 'tasks' | 'home' }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={to === 'home' ? 'Back to Home' : 'Back to Tasks'}
    onPress={() => router.replace(to === 'home' ? '/(tabs)/home' : '/(tabs)/tasks')} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
    <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} tintColor={colors.primary} size={20} />
    <Text style={styles.label}>{to === 'home' ? 'Back to Home' : 'Back to Tasks'}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { minHeight: 52, padding: 14, borderRadius: 12, backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.55 }, label: { fontSize: 16, fontWeight: '600', color: colors.primary },
});
