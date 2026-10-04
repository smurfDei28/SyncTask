import { router } from 'expo-router';
import { Button } from './Button';
export function BackButton({ to = 'tasks' }: { to?: 'tasks' | 'home' }) {
  return <Button title={to === 'home' ? '? Back to Home' : '? Back to Tasks'} variant="secondary"
    onPress={() => router.replace(to === 'home' ? '/(tabs)/home' : '/(tabs)/tasks')} />;
}
