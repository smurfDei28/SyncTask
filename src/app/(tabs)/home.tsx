import { useState } from 'react';
import { router } from 'expo-router';
import { View, Text, Pressable } from 'react-native';
import { Button } from '@/components/Button';
import { ProjectCard } from '@/components/ProjectCard';
import { Screen } from '@/components/Screen';
import { colors } from '@/constants/colors';
import { sharedStyles } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useProjects } from '@/context/ProjectContext';
export default function HomeScreen() {
 const { user, signOut, submitting } = useAuth();
 const [signOutError, setSignOutError] = useState('');
 async function handleSignOut() {
  setSignOutError('');
  try { await signOut(); } catch (error) { setSignOutError(error instanceof Error ? error.message : 'Unable to sign out. Please try again.'); }
 }
 const { projects, tasks } = useProjects();
 const hour = new Date().getHours();
 const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
 return <Screen><View style={{ gap: 12, paddingTop: 16 }}><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>SyncTask</Text>
 <Text style={sharedStyles.title}>{greeting}, {user?.name.split(' ')[0] ?? 'Student'}</Text><Text style={sharedStyles.subtitle}>Let’s keep your team moving together.</Text></View>
 <View style={{ gap: 8 }}><Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>Your Projects</Text><Text style={sharedStyles.subtitle}>A clear view of what you’re building.</Text></View>
 {projects.map(project => <Pressable key={project.id} accessibilityRole="button" accessibilityLabel={'Open project: ' + project.name} onPress={() => router.push({ pathname: '/project/[id]', params: { id: project.id } })}><ProjectCard project={project} tasks={tasks} /></Pressable>)}
 <View style={{ gap: 10 }}><Button title="+ Create Project" disabled variant="secondary" /><Text style={[sharedStyles.subtitle, { textAlign: 'center', fontSize: 12 }]}>Project creation is coming in a later phase.</Text></View>
 {!!signOutError && <Text accessibilityRole="alert" style={sharedStyles.error}>{signOutError}</Text>}
 <Button title={submitting ? "Signing Out?" : "Sign Out"} disabled={submitting} variant="secondary" onPress={handleSignOut} /></Screen>;
}
