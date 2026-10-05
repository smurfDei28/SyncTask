import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/colors';

export default function TabsLayout() {
  return <Tabs screenOptions={{
    headerShown: false, tabBarActiveTintColor: colors.primary,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
  }}>
    <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: 'house.fill', android: 'home', web: 'home' }} tintColor={color} size={size} /> }} />
    <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: 'list.bullet', android: 'checklist', web: 'checklist' }} tintColor={color} size={size} /> }} />
  </Tabs>;
}
