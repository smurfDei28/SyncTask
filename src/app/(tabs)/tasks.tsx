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

export default function TasksScreen() {
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const { projects, tasks, members } = useProjects();
  const project = projects.find(item => item.id === projectId) ?? projects[0];
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const projectTasks = tasks.filter(task => task.projectId === project.id);
  const visible = projectTasks.filter(task => filter === 'all' || getTaskStatus(task, tasks) === filter);
  const filters: (TaskStatus | 'all')[] = ['all', 'todo', 'in_progress', 'blocked', 'completed'];
  return <SafeAreaView style={styles.safe}>
    <FlatList data={visible} keyExtractor={task => task.id} contentContainerStyle={styles.content}
      ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      ListHeaderComponent={<View style={{ gap: 20, marginBottom: 24 }}>
        <Text style={sharedStyles.title}>Tasks</Text><Text style={sharedStyles.subtitle}>{project.name}</Text>
        <Button title="+ Create Task" onPress={() => router.push({ pathname: '/task/create', params: { projectId: project.id } })} />
        <View style={styles.filters}>{filters.map(value => <Choice key={value} selected={filter === value}
          label={value === 'all' ? 'All' : statusLabels[value]} onPress={() => setFilter(value)} />)}</View>
        <Text style={sharedStyles.subtitle}>{visible.length} {visible.length === 1 ? 'task' : 'tasks'}</Text>
      </View>}
      renderItem={({ item }) => <TaskCard task={item} tasks={tasks} members={members} />}
      ListEmptyComponent={<EmptyState title="No tasks here" message="Choose another filter or create a task for your team." />}
    />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, width: '100%', maxWidth: 560, alignSelf: 'center', flexGrow: 1 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
