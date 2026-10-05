import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SessionSplash } from '@/components/SessionSplash';
import { ProjectProvider } from '@/context/ProjectContext';
import { colors } from '@/constants/colors';

function Navigation() {
  const { user, loading } = useAuth();
  if (loading) return <SessionSplash />;
  return (
    <ProjectProvider key={user?.id ?? 'signed-out'}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="project/[id]" />
          <Stack.Screen name="task/[id]" />
          <Stack.Screen name="task/create" />
          <Stack.Screen name="notifications" />
        </Stack.Protected>
      </Stack>
    </ProjectProvider>
  );
}
export default function RootLayout() {
  return <AuthProvider><Navigation /></AuthProvider>;
}
