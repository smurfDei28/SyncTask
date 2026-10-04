import { ActivityIndicator, Text, View } from 'react-native';
import { Brand } from './Brand';
import { Screen } from './Screen';
import { colors } from '@/constants/colors';
import { sharedStyles } from '@/constants/theme';

export function SessionSplash() {
  return <Screen><View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20, paddingVertical: 64 }}>
    <Brand large />
    <Text style={sharedStyles.subtitle}>Keep your team in sync.</Text>
    <ActivityIndicator color={colors.primary} size="large" accessibilityLabel="Restoring your session" />
  </View></Screen>;
}
