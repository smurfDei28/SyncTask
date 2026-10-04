import { StyleSheet } from 'react-native';
import { colors } from './colors';
export const theme = { radius: 16, spacing: 24 } as const;
export const sharedStyles = StyleSheet.create({
 title: { fontSize: 28, fontWeight: '700', color: colors.text },
 subtitle: { fontSize: 15, lineHeight: 23, color: colors.secondaryText },
 card: { backgroundColor: colors.surface, borderRadius: theme.radius, borderWidth: 1, borderColor: colors.border, padding: 24, gap: 20 },
 link: { color: colors.primary, fontWeight: '600', fontSize: 15, paddingVertical: 12 },
 error: { color: colors.danger, fontSize: 14 },
});
