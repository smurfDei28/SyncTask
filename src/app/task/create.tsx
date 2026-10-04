import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { Choice } from '@/components/Choice';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { sharedStyles } from '@/constants/theme';
import { colors } from '@/constants/colors';
import { useProjects } from '@/context/ProjectContext';

export default function CreateTaskScreen() {
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const { projects, tasks, members, createTask } = useProjects();
  const project = projects.find(item => item.id === (projectId ?? projects[0]?.id));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [dependency, setDependency] = useState('');
  const [checklist, setChecklist] = useState<{ id: number; title: string }[]>([]);
  const nextItemId = useRef(1);
  const saving = useRef(false);
  const [error, setError] = useState('');
  if (!project) return <Screen><BackButton /><EmptyState title="Project not found" message="Return to Tasks and select a project." /></Screen>;
  function save() {
    if (!project || saving.current) return;
    const error = createTask({ projectId: project.id, title, description, assignedTo, deadline, dependsOnTaskId: dependency || undefined, checklist: checklist.map(item => item.title) });
    setError(error ?? '');
    if (!error) {
      saving.current = true;
      router.replace({ pathname: '/(tabs)/tasks', params: { projectId: project.id } });
    }
  }
  return <Screen><BackButton /><Text style={sharedStyles.title}>Create Task</Text>
    <Text style={sharedStyles.subtitle}>{project.name}</Text>
    <View style={sharedStyles.card}>
      <Input label="Task title *" placeholder="What needs to be done?" value={title} onChangeText={setTitle} />
      <Input label="Description" placeholder="Add helpful details" value={description} onChangeText={setDescription} multiline style={{ minHeight: 100, textAlignVertical: 'top' }} />
      <Input label="Deadline *" placeholder="YYYY-MM-DD, e.g. 2026-10-30" value={deadline} onChangeText={setDeadline} autoCapitalize="none" maxLength={10} />
    </View>
    <View style={sharedStyles.card}><Text style={{ color: colors.text, fontWeight: '600' }}>Assigned member *</Text>
      {members.filter(member => project.memberIds.includes(member.id)).map(member => <Choice key={member.id} label={member.name} selected={assignedTo === member.id} onPress={() => setAssignedTo(member.id)} />)}
    </View>
    <View style={sharedStyles.card}><Text style={{ color: colors.text, fontWeight: '600' }}>Depends On (optional)</Text>
      <Text style={sharedStyles.subtitle}>Select a prerequisite. Your task will wait until it is completed.</Text>
      <Choice label="None" selected={!dependency} onPress={() => setDependency('')} />
      {tasks.filter(task => task.projectId === project.id).map(task => <Choice key={task.id} label={task.title} selected={dependency === task.id} onPress={() => setDependency(task.id)} />)}
    </View>
    <View style={sharedStyles.card}><Text style={{ color: colors.text, fontWeight: '600' }}>Checklist</Text>
      {!checklist.length && <Text style={sharedStyles.subtitle}>Optional: break the task into smaller steps.</Text>}
      {checklist.map((item, index) => <View key={item.id} style={{ gap: 8 }}>
        <Input label={'Item ' + (index + 1)} placeholder="Checklist step" value={item.title} onChangeText={title => setChecklist(items => items.map(entry => entry.id === item.id ? { ...entry, title } : entry))} />
        <Button title={'Remove item ' + (index + 1)} variant="secondary" onPress={() => setChecklist(items => items.filter(entry => entry.id !== item.id))} />
      </View>)}
      <Button title="+ Add Checklist Item" variant="secondary" onPress={() => { const id = nextItemId.current++; setChecklist(items => [...items, { id, title: '' }]); }} />
    </View>
    {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={sharedStyles.error}>{error}</Text>}
    <Button title="Save Task" onPress={save} />
  </Screen>;
}
