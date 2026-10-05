import { Text, View } from 'react-native';
import { useProjects } from '@/context/ProjectContext';
import { sharedStyles } from '@/constants/theme';
import { Button } from './Button';

export function DataStatus() {
  const { loading, error, retry } = useProjects();
  if (error) return <View style={{ gap: 8 }}><Text accessibilityRole="alert" style={sharedStyles.error}>{error}</Text><Button title="Retry loading" onPress={retry} variant="secondary" /></View>;
  return loading ? <Text style={sharedStyles.subtitle}>Loading your shared workspace…</Text> : null;
}
