import { View, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
export function ProgressBar({ percentage }: { percentage: number }) {
 const value = Number.isFinite(percentage) ? Math.max(0, Math.min(100, percentage)) : 0;
 return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: value }} accessibilityLabel="Completion progress" style={styles.track}>
 <View style={[styles.fill, { width: `${value}%` }]} /></View>;
}
const styles = StyleSheet.create({
 track: { height: 8, borderRadius: 4, backgroundColor: colors.primaryLight, overflow: 'hidden' },
 fill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
});
