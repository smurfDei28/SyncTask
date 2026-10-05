import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { joinProject, collaborationError } from '@/services/projectService';
import { Screen } from '@/components/Screen';
import { BackButton } from '@/components/BackButton';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { sharedStyles } from '@/constants/theme';

export default function JoinProjectScreen() {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  async function join() {
    if (!user || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const id = await joinProject(user, code);
      router.replace({ pathname: '/project/[id]', params: { id } });
    } catch (error) { setError(collaborationError(error)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Screen><BackButton /><Text style={sharedStyles.title}>Join Project</Text>
    <Text style={sharedStyles.subtitle}>Ask the project owner for an invitation code. Each code works once and expires after seven days.</Text>
    <Input label="Invitation code" value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} />
    {!!error && <Text accessibilityRole="alert" style={sharedStyles.error}>{error}</Text>}
    <Button title={busy ? 'Joining…' : 'Join Project'} disabled={busy} onPress={join} />
  </Screen>;
}
