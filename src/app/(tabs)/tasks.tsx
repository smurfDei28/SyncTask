import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Choice } from '@/components/Choice';
import { EmptyState } from '@/components/EmptyState';
import { TaskCard } from '@/components/TaskCard';
import { statusLabels } from '@/components/StatusBadge';
import { colors } from '@/constants/colors';
import { sharedStyles } from '@/constants/theme';
import { useProjects } from '@/context/ProjectContext';
import { TaskStatus } from '@/types';
import { getTaskStatus } from '@/utils/tasks';
import { useAuth } from '@/context/AuthContext';
import { DataStatus } from '@/components/DataStatus';
import { Screen } from '@/components/Screen';
import { Input } from '@/components/Input';

export default function TasksScreen({ personal = false }: { personal?: boolean }) {
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const { projects, tasks, members, loading, error, canEditProject } = useProjects();
  const { user } = useAuth();
  const project = projects.find(item => item.id === projectId) ?? projects[0];
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [mine, setMine] = useState(personal);
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState<{ id: string; source?: string }>({ id: '', source: projectId });
  const selected = projects.find(item => item.id === ((selection.source === projectId && selection.id) || projectId)) ?? project;
  if (loading || error) return <Screen><DataStatus /></Screen>;
  if (!selected) return <Screen><EmptyState title="No projects yet" message="Create or join a project from Home to start working." /></Screen>;
  const projectTasks = mine ? tasks.filter(task => task.assignedTo === user?.id) : tasks.filter(task => task.projectId === selected.id);
  const visible = projectTasks.filter(task => (filter === 'all' || getTaskStatus(task, tasks) === filter) &&
    (task.title + ' ' + task.description).toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.deadline.localeCompare(b.deadline) || a.title.localeCompare(b.title));
  const filters: (TaskStatus | 'all')[] = ['all', 'todo', 'in_progress', 'blocked', 'completed'];
  return <SafeAreaView style={styles.safe}>
    <FlatList data={visible} keyExtractor={task => task.id} contentContainerStyle={styles.content}
      ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      ListHeaderComponent={<View style={{ gap: 20, marginBottom: 24 }}>
        <Text style={sharedStyles.title}>{mine ? 'My Tasks' : 'Tasks'}</Text><Text style={sharedStyles.subtitle}>{mine ? 'Your assignments across all projects · earliest deadline first' : selected.name}</Text>
        {!personal && <View style={styles.filters}><Choice label="Project Tasks" selected={!mine} onPress={() => setMine(false)} /><Choice label="My Tasks" selected={mine} onPress={() => setMine(true)} /></View>}
        {!mine && <View style={styles.filters}>{projects.map(item => <Choice key={item.id} label={item.name} selected={selected.id === item.id} onPress={() => setSelection({ id: item.id, source: projectId })} />)}</View>}
        <Input label="Search tasks" value={search} onChangeText={setSearch} placeholder="Title or description" />
        {!mine && canEditProject(selected.id) && <Button title="+ Create Task" onPress={() => router.push({ pathname: '/task/create', params: { projectId: selected.id } })} />}
        {!mine && !canEditProject(selected.id) && <Text style={sharedStyles.subtitle}>You have read-only access to this project.</Text>}
        <View style={styles.filters}>{filters.map(value => <Choice key={value} selected={filter === value}
          label={value === 'all' ? 'All' : statusLabels[value]} onPress={() => setFilter(value)} />)}</View>
        <Text style={sharedStyles.subtitle}>{visible.length} {visible.length === 1 ? 'task' : 'tasks'}</Text>
      </View>}
      renderItem={({ item }) => <View style={{ gap: 8 }}>{mine && <Text style={sharedStyles.subtitle}>{projects.find(project => project.id === item.projectId)?.name}</Text>}<TaskCard task={item} tasks={tasks} members={members} /></View>}
      ListEmptyComponent={<EmptyState title="No tasks here" message="Choose another filter or create a task for your team." />}
    />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, width: '100%', maxWidth: 560, alignSelf: 'center', flexGrow: 1 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
