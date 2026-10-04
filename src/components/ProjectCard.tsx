import { View, Text, StyleSheet } from 'react-native';
import { Project, Task } from '@/types';
import { colors } from '@/constants/colors';
import { sharedStyles } from '@/constants/theme';
import { getProjectProgress } from '@/utils/progress';
import { ProgressBar } from './ProgressBar';
export function ProjectCard({ project, tasks }: { project: Project; tasks: Task[] }) {
 const progress = getProjectProgress(project.id, tasks);
 const deadline = new Date(project.deadline + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
 return <View style={sharedStyles.card}><Text style={styles.badge}>GROUP PROJECT</Text>
 <Text style={styles.title}>{project.name}</Text><Text style={sharedStyles.subtitle}>{project.description}</Text>
 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <Text style={{ color: colors.text }}>Project progress</Text><Text style={styles.percent}>{progress.percentage}%</Text></View>
 <ProgressBar percentage={progress.percentage} /><Text style={sharedStyles.subtitle}>{progress.completed} of {progress.total} tasks completed</Text>
 <View style={styles.footer}><Text style={sharedStyles.subtitle}>Deadline: {deadline}</Text><Text style={sharedStyles.subtitle}>{project.memberIds.length} members</Text></View></View>;
}
const styles = StyleSheet.create({
 badge: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
 title: { color: colors.text, fontSize: 22, fontWeight: '700', lineHeight: 29 },
 percent: { color: colors.primary, fontSize: 20, fontWeight: '700' },
 footer: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, gap: 8 },
});
