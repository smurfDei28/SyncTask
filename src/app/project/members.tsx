import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Share, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useProjects } from '@/context/ProjectContext';
import { changeMember, collaborationError, createInvitation, revokeInvitation, subscribeInvitations } from '@/services/projectService';
import { Invitation } from '@/types';
import { Screen } from '@/components/Screen';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { Choice } from '@/components/Choice';
import { DataStatus } from '@/components/DataStatus';
import { EmptyState } from '@/components/EmptyState';
import { sharedStyles } from '@/constants/theme';

export default function MembersScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { user } = useAuth();
  const { projects, loading, error: dataError } = useProjects();
  const project = projects.find(item => item.id === projectId);
  const owner = !!project && project.ownerId === user?.id;
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [removeId, setRemoveId] = useState('');
  const lock = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!owner || !projectId) return;
    return subscribeInvitations(projectId, setInvitations, error => setError(collaborationError(error)));
  }, [owner, projectId]);
  async function run(action: () => Promise<unknown>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); } catch (error) { setError(collaborationError(error)); }
    finally { lock.current = false; setBusy(false); }
  }
  if (loading || dataError) return <Screen><BackButton /><DataStatus /></Screen>;
  if (!project) return <Screen><BackButton /><EmptyState title="Project unavailable" message="Your access may have changed." /></Screen>;
  return <Screen><BackButton /><Text style={sharedStyles.title}>Team & Invitations</Text>
    <Text style={sharedStyles.subtitle}>{project.name}</Text>
    <Text style={sharedStyles.subtitle}>Owners manage invitations and membership. Editors create and change tasks. Viewers can read the project.</Text>
    {!!error && <Text accessibilityRole="alert" style={sharedStyles.error}>{error}</Text>}
    {project.memberIds.map(id => <View key={id} style={sharedStyles.card}>
      <Text style={sharedStyles.subtitle}>{project.members[id].name} · {project.members[id].role}</Text>
      {owner && id !== project.ownerId && <>
        <Button title={project.members[id].role === 'editor' ? 'Make Viewer' : 'Make Editor'} disabled={busy}
          onPress={() => run(() => changeMember(project.id, user!.id, id, project.members[id].role === 'editor' ? 'viewer' : 'editor'))} variant="secondary" />
        {removeId === id ? <><Text style={sharedStyles.subtitle}>Remove this member’s access? Their tasks must be reassigned first.</Text>
          <Button title="Confirm Removal" disabled={busy} onPress={() => run(async () => { await changeMember(project.id, user!.id, id, 'remove'); setRemoveId(''); })} />
          <Button title="Cancel" disabled={busy} onPress={() => setRemoveId('')} variant="secondary" />
        </> : <Button title="Remove Member" disabled={busy} variant="secondary" onPress={() => setRemoveId(id)} />}
      </>}
    </View>)}
    {owner && <>
      <View style={sharedStyles.card}><Text style={sharedStyles.title}>Invite a Teammate</Text>
        <Choice label="Editor" selected={role === 'editor'} onPress={() => setRole('editor')} />
        <Choice label="Viewer" selected={role === 'viewer'} onPress={() => setRole('viewer')} />
        <Button title={busy ? 'Please wait…' : 'Create Invitation Code'} disabled={busy} onPress={() => run(() => createInvitation(project, role))} />
        <Text style={sharedStyles.subtitle}>Share codes privately. Anyone with a code and a SyncTask account can use it.</Text>
      </View>
      {invitations.map(invitation => <View key={invitation.id} style={sharedStyles.card}>
        <Text selectable style={sharedStyles.subtitle}>{invitation.id}</Text>
        <Text style={sharedStyles.subtitle}>{invitation.role} · {invitation.acceptedBy ? 'Used' : invitation.expiresAt <= now ? 'Expired' : 'Available'} · expires {new Date(invitation.expiresAt).toLocaleDateString()}</Text>
        {!invitation.acceptedBy && invitation.expiresAt > now && <Button title="Share Code" variant="secondary" disabled={busy}
          onPress={() => run(() => Share.share({ message: `Join ${project.name} in SyncTask. Open Join Project and enter this invitation code: ${invitation.id}` }))} />}
        <Button title={invitation.acceptedBy ? 'Remove Used Code' : 'Revoke Code'} variant="secondary" disabled={busy} onPress={() => run(() => revokeInvitation(invitation.id))} />
      </View>)}
    </>}
  </Screen>;
}
