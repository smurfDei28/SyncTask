import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/constants/colors';

export default function TabsLayout() {
  return <Tabs screenOptions={{
    headerShown: false, tabBarActiveTintColor: colors.primary,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
  }}>
    <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>?</Text> }} />
    <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>?</Text> }} />
  </Tabs>;
}
