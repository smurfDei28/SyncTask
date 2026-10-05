import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from './AuthContext';
import { useProjects } from './ProjectContext';
import { dueTasks, reminderPlan } from '@/utils/reminders';
import { requestReminderPermission, synchronizeReminders } from '@/services/reminderService';
import { Task } from '@/types';

const ReminderContext = createContext<{
  enabled: boolean; busy: boolean; error: string; due: Task[]; toggle: () => Promise<void>;
} | null>(null);

export function ReminderProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const { tasks, loading, error: dataError } = useProjects();
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(!user);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());
  const lock = useRef(false);
  const alive = useRef(true);
  const uid = user?.id;
  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    if (uid) void AsyncStorage.getItem('reminders:' + uid).then(value => {
      if (!cancelled) { setEnabled(value === 'enabled'); setReady(true); }
    }).catch(() => { if (!cancelled) { setError('Unable to load reminder settings.'); setReady(true); } });
    else { void synchronizeReminders([]).catch(() => {}); }
    return () => { cancelled = true; alive.current = false; void synchronizeReminders([]).catch(() => {}); };
  }, [uid]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') setNow(new Date()); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  const plan = uid && enabled ? reminderPlan(tasks, uid, now) : [];
  const signature = JSON.stringify(plan.map(item => [item.id, item.signature]));
  useEffect(() => {
    if (!ready || (enabled && (loading || dataError))) return;
    let cancelled = false;
    void synchronizeReminders(plan).catch(() => { if (!cancelled) setError('Could not schedule phone reminders. Check notification permissions and try toggling them again.'); });
    return () => { cancelled = true; };
  }, [signature, ready, loading, dataError, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  const taskIds = tasks.map(task => task.id).join(',');
  useEffect(() => {
    if (Platform.OS === 'web' || !uid) return;
    let cancelled = false;
    let remove: (() => void) | undefined;
    void import('expo-notifications').then(module => {
      if (cancelled) return;
      const open = (response: import('expo-notifications').NotificationResponse) => {
        const id = response.notification.request.content.data?.taskId;
        if (typeof id === 'string' && taskIds.split(',').includes(id)) {
          router.push({ pathname: '/task/[id]', params: { id } });
          void module.clearLastNotificationResponseAsync();
        }
      };
      const subscription = module.addNotificationResponseReceivedListener(open);
      remove = () => subscription.remove();
      const last = module.getLastNotificationResponse();
      if (last) open(last);
    }).catch(() => {});
    return () => { cancelled = true; remove?.(); };
  }, [uid, taskIds]);
  async function toggle() {
    if (!uid || !ready || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const next = !enabled;
      if (next) await requestReminderPermission();
      await AsyncStorage.setItem('reminders:' + uid, next ? 'enabled' : 'disabled');
      if (alive.current) setEnabled(next);
    } catch (error) { if (alive.current) setError(error instanceof Error ? error.message : 'Unable to update reminders.'); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  return <ReminderContext.Provider value={{ enabled, busy: busy || !ready, error, due: uid ? dueTasks(tasks, uid, now) : [], toggle }}>{children}</ReminderContext.Provider>;
}

export function useReminders() {
  const value = useContext(ReminderContext);
  if (!value) throw new Error('ReminderProvider is required');
  return value;
}
