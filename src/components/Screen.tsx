import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
export function Screen({ children }: PropsWithChildren) {
 return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
 <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>{children}</ScrollView>
 </KeyboardAvoidingView></SafeAreaView>;
}
const styles = StyleSheet.create({
 safe: { flex: 1, backgroundColor: colors.background },
 content: { flexGrow: 1, padding: 24, gap: 28, width: '100%', maxWidth: 560, alignSelf: 'center' },
});
