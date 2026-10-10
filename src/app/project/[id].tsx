import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { DataStatus } from '@/components/DataStatus';
import { EmptyState } from '@/components/EmptyState';
import { ProjectCard } from '@/components/ProjectCard';
import { Screen } from '@/components/Screen';
import { statusLabels } from '@/components/StatusBadge';
import { TaskCard } from '@/components/TaskCard';
import { colors } from '@/constants/colors';
import { sharedStyles } from '@/constants/theme';
import { useProjects } from '@/context/ProjectContext';
import { TaskStatus } from '@/types';
import { isOverdue } from '@/utils/dates';
import { getTaskStatus } from '@/utils/tasks';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

export default function ProjectDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { projects, tasks, members, loading, error } = useProjects();
  if (loading || error) return <Screen><BackButton to="home" /><DataStatus /></Screen>;
  const project = projects.find(item => item.id === id);
  if (!project) return <Screen><BackButton to="home" /><EmptyState title="Project not found" message="Return to Home to open your project." /></Screen>;
  const selected = tasks.filter(task => task.projectId === project.id);
  const statuses: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'completed'];
  const blocked = selected.filter(task => getTaskStatus(task, tasks) === 'blocked');
  const upcoming = selected.filter(task => !['completed', 'blocked'].includes(getTaskStatus(task, tasks)))
    .sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 3);
  return <Screen><BackButton to="home" /><Text style={sharedStyles.title}>Project Dashboard</Text>
    <ProjectCard project={project} tasks={tasks} />
    <Button title="View Tasks" onPress={() => router.push({ pathname: '/(tabs)/tasks', params: { projectId: project.id } })} />
    <Button title="View Analytics" variant="secondary" onPress={() => router.push(`/project/analytics?id=${project.id}`)}/>
    <Button title="Team & Invitations" variant="secondary" onPress={() => router.push({ pathname: '/project/members', params: { projectId: project.id } })} />
    <View style={sharedStyles.card}><Text style={styles.heading}>Task Status</Text>
      {statuses.map(status => <View key={status} style={styles.row}><Text style={sharedStyles.subtitle}>{statusLabels[status]}</Text><Text style={styles.count}>{selected.filter(task => getTaskStatus(task, tasks) === status).length}</Text></View>)}
      <View style={styles.row}><Text style={sharedStyles.subtitle}>Overdue</Text><Text style={styles.count}>{selected.filter(task => getTaskStatus(task, tasks) !== 'completed' && isOverdue(task.deadline)).length}</Text></View>
    </View>
    <Text style={styles.heading}>Upcoming Tasks</Text>
    {upcoming.map(task => <TaskCard key={task.id} task={task} tasks={tasks} members={members} />)}
    {!upcoming.length && <EmptyState title="All caught up" message="There are no upcoming tasks ready to work on." />}
    <Text style={styles.heading}>Blocked Tasks</Text>
    {blocked.map(task => <TaskCard key={task.id} task={task} tasks={tasks} members={members} />)}
    {!blocked.length && <EmptyState title="No blocked tasks" message="Your team's prerequisites are complete." />}
    <View style={sharedStyles.card}><Text style={styles.heading}>Team Members</Text>
      {members.filter(member => project.memberIds.includes(member.id)).map(member => <View key={member.id} style={{ gap: 4 }}>
        <Text style={{ color: colors.text, fontWeight: '600' }}>{member.name}</Text>
        <Text style={sharedStyles.subtitle}>{selected.filter(task => task.assignedTo === member.id).length} assigned tasks</Text>
      </View>)}
    </View>
    <View style={sharedStyles.card}><Text style={styles.heading}>Progress</Text><Text style={sharedStyles.subtitle}>Overall progress is shown above and updates when a task is marked completed.</Text>
    </View>
  </Screen>;
}
const styles = {
  heading: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  row: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  count: { fontSize: 16, fontWeight: '700' as const, color: colors.text },
};
