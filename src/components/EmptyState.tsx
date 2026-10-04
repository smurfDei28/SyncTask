import { Text, View } from 'react-native';
import { sharedStyles } from '@/constants/theme';
export function EmptyState({ title, message }: { title: string; message: string }) {
  return <View style={sharedStyles.card}><Text style={[sharedStyles.title, { fontSize: 20 }]}>{title}</Text><Text style={sharedStyles.subtitle}>{message}</Text></View>;
}
