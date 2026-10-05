import {
  collection, doc, getDoc, onSnapshot, query, runTransaction, serverTimestamp,
  setDoc, Timestamp, where, deleteDoc, arrayUnion,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase/config';
import { Invitation, SharedProject, Task, User } from '@/types';
import { applySharedTaskAction, canEdit, SharedTaskAction, validateProject } from '@/utils/collaboration';
import { NewTaskInput } from '@/utils/tasks';

export function collaborationError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === 'permission-denied') return 'Access denied. Check your project role and publish the updated Firestore rules.';
  if (code === 'unavailable') return 'Cannot connect. Check your internet connection and try again.';
  if (code === 'aborted') return 'Another teammate changed this project. Please try again.';
  return error instanceof Error ? error.message : 'Unable to save. Please try again.';
}

export function subscribeProjects(uid: string, receive: (projects: SharedProject[]) => void, fail: (error: unknown) => void) {
  return onSnapshot(query(collection(getFirebaseServices().db, 'projects'), where('memberIds', 'array-contains', uid)),
    snapshot => receive(snapshot.docs.map(item => ({ ...item.data(), id: item.id }) as SharedProject)), fail);
}

export function subscribeTasks(projectId: string, receive: (tasks: Task[]) => void, fail: (error: unknown) => void) {
  return onSnapshot(collection(getFirebaseServices().db, 'projects', projectId, 'tasks'),
    snapshot => receive(snapshot.docs.map(item => ({ ...item.data(), id: item.id }) as Task)), fail);
}

export async function createProject(user: User, name: string, description: string, deadline: string) {
  validateProject(name, description, deadline);
  const reference = doc(collection(getFirebaseServices().db, 'projects'));
  await setDoc(reference, {
    name: name.trim(), description: description.trim(), deadline, ownerId: user.id,
    memberIds: [user.id], members: { [user.id]: { name: user.name, role: 'owner' } },
    taskIds: [], revision: 0, joinInviteId: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return reference.id;
}

export async function mutateTasks(projectId: string, uid: string, action: SharedTaskAction) {
  const { db } = getFirebaseServices();
  const reference = doc(db, 'projects', projectId);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) throw new Error('Project not found.');
    const project = { ...snapshot.data(), id: projectId } as SharedProject;
    if (!canEdit(project, uid)) throw new Error('Only owners and editors can change tasks.');
    const snapshots = await Promise.all(project.taskIds.map(id => transaction.get(doc(reference, 'tasks', id))));
    if (snapshots.some(item => !item.exists())) throw new Error('Project data is incomplete. Ask the owner to check the database.');
    const tasks = snapshots.map(item => ({ ...item.data(), id: item.id }) as Task);
    const updated = applySharedTaskAction(project, tasks, action);
    for (const task of updated) {
      if (JSON.stringify(task) !== JSON.stringify(tasks.find(item => item.id === task.id))) {
        // Firestore cannot store undefined optional fields.
        const { dependsOnTaskId, ...fields } = task;
        transaction.set(doc(reference, 'tasks', task.id), { ...fields, dependsOnTaskId: dependsOnTaskId ?? '' });
      }
    }
    for (const task of tasks) if (!updated.some(item => item.id === task.id)) transaction.delete(doc(reference, 'tasks', task.id));
    transaction.update(reference, { taskIds: updated.map(task => task.id), revision: project.revision + 1, updatedAt: serverTimestamp() });
  });
}

export async function saveNewTask(uid: string, input: NewTaskInput) {
  const reference = doc(collection(getFirebaseServices().db, 'projects', input.projectId, 'tasks'));
  await mutateTasks(input.projectId, uid, { type: 'create', task: {
    ...input, id: reference.id, title: input.title.trim(), description: input.description.trim(), status: 'todo',
    checklist: input.checklist.map((title, index) => ({ id: reference.id + '-c' + index, title: title.trim(), completed: false })),
  } });
}

export async function createInvitation(project: SharedProject, role: 'editor' | 'viewer') {
  const reference = doc(collection(getFirebaseServices().db, 'invitations'));
  await setDoc(reference, {
    projectId: project.id, projectName: project.name, role, acceptedBy: '',
    expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000), createdAt: serverTimestamp(),
  });
  return reference.id;
}

export function subscribeInvitations(projectId: string, receive: (invites: Invitation[]) => void, fail: (error: unknown) => void) {
  return onSnapshot(query(collection(getFirebaseServices().db, 'invitations'), where('projectId', '==', projectId)),
    snapshot => receive(snapshot.docs.map(item => ({ ...item.data(), id: item.id, expiresAt: item.data().expiresAt.toMillis() }) as Invitation)), fail);
}

export async function revokeInvitation(id: string) {
  await deleteDoc(doc(getFirebaseServices().db, 'invitations', id));
}

export async function joinProject(user: User, code: string) {
  if (!/^[A-Za-z0-9]{20}$/.test(code.trim())) throw new Error('Enter the complete 20-character invitation code.');
  const { db } = getFirebaseServices();
  const inviteRef = doc(db, 'invitations', code.trim());
  // This read needs only possession of the code. The project itself stays private until acceptance.
  const invite = await getDoc(inviteRef);
  if (!invite.exists()) throw new Error('Invitation not found or revoked.');
  const projectId = invite.data().projectId as string;
  const projectRef = doc(db, 'projects', projectId);
  await runTransaction(db, async transaction => {
    const freshInvite = await transaction.get(inviteRef);
    if (!freshInvite.exists()) throw new Error('Invitation not found or revoked.');
    const data = freshInvite.data();
    if (data.acceptedBy || data.expiresAt.toMillis() <= Date.now()) throw new Error('This invitation has expired or was already used.');
    // Joining avoids reading the private project before acceptance.
    transaction.update(projectRef, {
      memberIds: arrayUnion(user.id), [`members.${user.id}`]: { name: user.name, role: data.role },
      joinInviteId: inviteRef.id, updatedAt: serverTimestamp(),
    });
    transaction.update(inviteRef, { acceptedBy: user.id });
  });
  return projectId;
}

export async function changeMember(projectId: string, uid: string, memberId: string, role: 'editor' | 'viewer' | 'remove') {
  const { db } = getFirebaseServices();
  const reference = doc(db, 'projects', projectId);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) throw new Error('Project not found.');
    const project = snapshot.data() as SharedProject;
    if (project.ownerId !== uid) throw new Error('Only the owner can manage members.');
    if (memberId === project.ownerId) throw new Error('The project owner cannot be removed or demoted.');
    if (!project.members[memberId]) throw new Error('Member not found.');
    const members = { ...project.members };
    if (role === 'remove') {
      const tasks = await Promise.all(project.taskIds.map(id => transaction.get(doc(reference, 'tasks', id))));
      if (tasks.some(task => task.data()?.assignedTo === memberId)) throw new Error('Reassign this member’s tasks before removing them.');
      delete members[memberId];
    } else members[memberId] = { ...members[memberId], role };
    transaction.update(reference, { members, memberIds: Object.keys(members), updatedAt: serverTimestamp() });
  });
}
