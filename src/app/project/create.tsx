import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { createProject, collaborationError } from '@/services/projectService';
import { Screen } from '@/components/Screen';
import { BackButton } from '@/components/BackButton';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { sharedStyles } from '@/constants/theme';

export default function CreateProjectScreen() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  async function save() {
    if (!user || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const id = await createProject(user, name, description, deadline);
      router.replace({ pathname: '/project/[id]', params: { id } });
    } catch (error) { setError(collaborationError(error)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Screen><BackButton /><Text style={sharedStyles.title}>Create Project</Text>
    <Input label="Project name" value={name} onChangeText={setName} maxLength={120} />
    <Input label="Description" value={description} onChangeText={setDescription} multiline maxLength={2000} />
    <Input label="Deadline" placeholder="YYYY-MM-DD" value={deadline} onChangeText={setDeadline} maxLength={10} />
    <Text style={sharedStyles.subtitle}>You’ll be the project owner. Invite teammates after creating your project.</Text>
    {!!error && <Text accessibilityRole="alert" style={sharedStyles.error}>{error}</Text>}
    <Button title={busy ? 'Creating…' : 'Create Project'} onPress={save} disabled={busy} />
  </Screen>;
}
