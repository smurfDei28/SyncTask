import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { SessionSplash } from '@/components/SessionSplash';

export default function SplashScreen() {
  const { user, loading } = useAuth();
  if (loading) return <SessionSplash />;
  return <Redirect href={user ? '/(tabs)/home' : '/(auth)/login'} />;
}
