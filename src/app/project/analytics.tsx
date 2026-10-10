import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/BackButton';
import { DataStatus } from '@/components/DataStatus';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { colors } from '@/constants/colors';
import { sharedStyles } from '@/constants/theme';
import { useProjects } from '@/context/ProjectContext';
import { isOverdue } from '@/utils/dates';
import { getTaskStatus } from '@/utils/tasks';

export default function ProjectAnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { projects, tasks, members, loading, error } = useProjects();

  if (loading || error) {
    return (
      <Screen>
        <BackButton to="home" />
        <DataStatus />
      </Screen>
    );
  }

  const project = projects.find((item) => item.id === id);

  if (!project) {
    return (
      <Screen>
        <BackButton to="home" />
        <EmptyState
          title="Project not found"
          message="Return to Home to open your project."
        />
      </Screen>
    );
  }

  const projectTasks = tasks.filter(
    (task) => task.projectId === project.id
  );

  const getStatus = (status: string) =>
    projectTasks.filter(
      (task) => getTaskStatus(task, projectTasks) === status
    ).length;

  const total = projectTasks.length;
  const completed = getStatus('completed');
  const inProgress = getStatus('in_progress');
  const todo = getStatus('todo');
  const blocked = getStatus('blocked');

  const overdue = projectTasks.filter(
    (task) =>
      getTaskStatus(task, projectTasks) !== 'completed' &&
      isOverdue(task.deadline)
  ).length;

  const completionPercentage =
    total === 0 ? 0 : Math.round((completed / total) * 100);

  const teamMembers = members.filter((member) =>
    project.memberIds.includes(member.id)
  );

  return (
    <Screen>
      <BackButton to="home" />

      <Text style={sharedStyles.title}>Project Analytics</Text>

      <Text style={sharedStyles.subtitle}>
        Performance overview for {project.name}
      </Text>

      {/* Overall Progress */}
      <View style={styles.card}>
        <Text style={styles.heading}>Overall Progress</Text>

        <Text style={styles.percentage}>
          {completionPercentage}%
        </Text>

        <View style={styles.progressBackground}>
          <View
            style={[
              styles.progressFill,
              { width: `${completionPercentage}%` },
            ]}
          />
        </View>

        <Text style={sharedStyles.subtitle}>
          {completed} of {total} tasks completed
        </Text>
      </View>

      {/* Task Statistics */}
      <View style={styles.card}>
        <Text style={styles.heading}>Task Statistics</Text>

        <StatRow
          label="Total Tasks"
          value={total}
          color={colors.text}
        />

        <StatRow
          label="Completed"
          value={completed}
          color={colors.success}
        />

        <StatRow
          label="In Progress"
          value={inProgress}
          color={colors.primary}
        />

        <StatRow
          label="To Do"
          value={todo}
          color={colors.secondaryText}
        />

        <StatRow
          label="Blocked"
          value={blocked}
          color={colors.blocked}
        />

        <StatRow
          label="Overdue"
          value={overdue}
          color={colors.danger}
        />
      </View>

      {/* Team Performance */}
      <View style={styles.card}>
        <Text style={styles.heading}>Team Performance</Text>

        {teamMembers.map((member) => {
          const assignedTasks = projectTasks.filter(
            (task) => task.assignedTo === member.id
          );

          const memberCompleted = assignedTasks.filter(
            (task) =>
              getTaskStatus(task, projectTasks) === 'completed'
          ).length;

          const memberPercentage =
            assignedTasks.length === 0
              ? 0
              : Math.round(
                  (memberCompleted / assignedTasks.length) * 100
                );

          return (
            <View key={member.id} style={styles.member}>
              <View style={styles.memberHeader}>
                <Text style={styles.memberName}>
                  {member.name}
                </Text>

                <Text style={styles.memberPercentage}>
                  {memberPercentage}%
                </Text>
              </View>

              <View style={styles.progressBackground}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${memberPercentage}%` },
                  ]}
                />
              </View>

              <Text style={sharedStyles.subtitle}>
                {memberCompleted} of {assignedTasks.length} assigned
                tasks completed
              </Text>
            </View>
          );
        })}

        {teamMembers.length === 0 && (
          <Text style={sharedStyles.subtitle}>
            No team members found.
          </Text>
        )}
      </View>

      {/* Project Summary */}
      <View style={styles.card}>
        <Text style={styles.heading}>Project Summary</Text>

        <Text style={sharedStyles.subtitle}>
          Your team has completed {completionPercentage}% of the
          project's tasks.
        </Text>

        {overdue > 0 && (
          <Text style={styles.warning}>
            ⚠ {overdue} overdue task{overdue === 1 ? '' : 's'} need
            attention.
          </Text>
        )}

        {blocked > 0 && (
          <Text style={styles.blocked}>
            {blocked} task{blocked === 1 ? '' : 's'} are currently
            blocked by dependencies.
          </Text>
        )}

        {total > 0 && completed === total && (
          <Text style={styles.success}>
            ✓ All project tasks have been completed!
          </Text>
        )}
      </View>
    </Screen>
  );
}

function StatRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={sharedStyles.subtitle}>{label}</Text>

      <Text style={[styles.statValue, { color }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    gap: 16,
  },

  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },

  percentage: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.primary,
  },

  progressBackground: {
    height: 10,
    width: '100%',
    backgroundColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 10,
  },

  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },

  member: {
    gap: 8,
  },

  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },

  memberPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },

  warning: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '600',
  },

  blocked: {
    color: colors.blocked,
    fontSize: 15,
    fontWeight: '600',
  },

  success: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '600',
  },
});