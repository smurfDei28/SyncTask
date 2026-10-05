const assert = require('node:assert/strict');
const { before, beforeEach, after, test } = require('node:test');
const fs = require('node:fs');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, collection, setDoc, getDoc, getDocs, query, where, updateDoc, writeBatch, arrayUnion, serverTimestamp, Timestamp } = require('firebase/firestore');
const domainLoader = require('./load-domain.cjs');
let env;
const projectId = 'demo-synctask-tests';
const project = { name: 'Shared Project', description: '', deadline: '2026-10-30', ownerId: 'owner',
  memberIds: ['owner', 'editor', 'viewer'], members: { owner: { name: 'Owner', role: 'owner' }, editor: { name: 'Editor', role: 'editor' }, viewer: { name: 'Viewer', role: 'viewer' } },
  taskIds: ['task'], revision: 0, joinInviteId: '', createdAt: Timestamp.now(), updatedAt: Timestamp.now() };
const task = { id: 'task', projectId: 'p', title: 'Implement', description: '', assignedTo: 'editor', deadline: '2026-10-20',
  status: 'todo', dependsOnTaskId: '', checklist: [{ id: 'task-c0', title: 'First', completed: false }, { id: 'task-c1', title: 'Second', completed: false }] };
function db(uid) { return env.authenticatedContext(uid, { email: uid + '@student.edu' }).firestore(); }
function service(uid) { return domainLoader({ '@/firebase/config': { getFirebaseServices: () => ({ db: db(uid) }) } })('src/services/projectService.ts'); }
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Run this suite using npm run test:rules.');
  env = await initializeTestEnvironment({ projectId, firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') } });
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const database = context.firestore();
    await setDoc(doc(database, 'projects/p'), project);
    await setDoc(doc(database, 'projects/p/tasks/task'), task);
    await setDoc(doc(database, 'users/owner'), { uid: 'owner', name: 'Owner', email: 'owner@student.edu', createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  });
});
after(async () => { await env?.cleanup(); });

test('members can query their projects and tasks; outsiders and guests cannot read them', async () => {
  for (const uid of ['owner', 'editor', 'viewer']) {
    const database = db(uid);
    const result = await assertSucceeds(getDocs(query(collection(database, 'projects'), where('memberIds', 'array-contains', uid))));
    assert.equal(result.size, 1);
    await assertSucceeds(getDocs(collection(database, 'projects/p/tasks')));
  }
  await assertFails(getDoc(doc(db('outsider'), 'projects/p')));
  await assertFails(getDocs(collection(db('outsider'), 'projects/p/tasks')));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'projects/p')));
  await assertFails(getDocs(collection(db('editor'), 'projects')));
});
test('owner can create a saved project; cannot impersonate another owner', async () => {
  const id = await service('owner').createProject({ id: 'owner', name: 'Owner', email: 'owner@student.edu' }, 'New project', 'Details', '2026-10-30');
  const result = await getDoc(doc(db('owner'), 'projects', id));
  assert.equal(result.data().name, 'New project');
  await assertFails(setDoc(doc(db('editor'), 'projects/forged'), { ...project, ownerId: 'owner', memberIds: ['owner'], taskIds: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
});
test('editors can save tasks and checklist updates; viewers cannot write even with a revision bump', async () => {
  await service('editor').saveNewTask('editor', { projectId: 'p', title: 'New', description: '', assignedTo: 'owner', deadline: '2026-10-20', checklist: [] });
  await service('editor').mutateTasks('p', 'editor', { type: 'toggleChecklist', taskId: 'task', itemId: 'task-c0' });
  assert.equal((await getDoc(doc(db('viewer'), 'projects/p/tasks/task'))).data().checklist[0].completed, true);
  const database = db('viewer');
  const batch = writeBatch(database);
  batch.update(doc(database, 'projects/p'), { revision: 3, updatedAt: serverTimestamp() });
  batch.update(doc(database, 'projects/p/tasks/task'), { title: 'Unauthorized' });
  await assertFails(batch.commit());
  await assertFails(updateDoc(doc(db('editor'), 'projects/p/tasks/task'), { title: 'No transaction' }));
});
test('concurrent editors preserve both checklist updates through transaction retries', async () => {
  await Promise.all(['task-c0', 'task-c1'].map(itemId => service('editor').mutateTasks('p', 'editor', { type: 'toggleChecklist', taskId: 'task', itemId } )));
  const saved = (await getDoc(doc(db('owner'), 'projects/p/tasks/task'))).data();
  assert(saved.checklist.every(item => item.completed));
  assert.equal((await getDoc(doc(db('owner'), 'projects/p'))).data().revision, 2);
});
test('owner issues a one-use invite; join is atomic and gives the intended role', async () => {
  const ownerService = service('owner');
  const id = await ownerService.createInvitation({ ...project, id: 'p' }, 'viewer');
  await assertSucceeds(getDocs(query(collection(db('owner'), 'invitations'), where('projectId', '==', 'p'))));
  await assertFails(getDocs(query(collection(db('editor'), 'invitations'), where('projectId', '==', 'p'))));
  await service('newcomer').joinProject({ id: 'newcomer', name: 'New Member', email: 'newcomer@student.edu' }, id);
  const saved = (await getDoc(doc(db('newcomer'), 'projects/p'))).data();
  assert.equal(saved.members.newcomer.role, 'viewer');
  await assert.rejects(service('another').joinProject({ id: 'another', name: 'Another', email: 'another@student.edu' }, id), /already used/);
  await assertFails(getDoc(doc(db('another'), 'projects/p')));
});
test('joining without consuming an invite, escalating its role, or consuming without joining is denied', async () => {
  const id = await service('owner').createInvitation({ ...project, id: 'p' }, 'viewer');
  const database = db('newcomer');
  const update = { memberIds: arrayUnion('newcomer'), 'members.newcomer': { name: 'New Member', role: 'viewer' }, joinInviteId: id, updatedAt: serverTimestamp() };
  await assertFails(updateDoc(doc(database, 'projects/p'), update));
  await assertFails(updateDoc(doc(database, 'invitations', id), { acceptedBy: 'newcomer' }));
  const batch = writeBatch(database);
  batch.update(doc(database, 'projects/p'), { ...update, 'members.newcomer': { name: 'New Member', role: 'editor' } });
  batch.update(doc(database, 'invitations', id), { acceptedBy: 'newcomer' });
  await assertFails(batch.commit());
});
test('expired and revoked invites fail; only owner can issue or revoke invitations', async () => {
  const id = await service('owner').createInvitation({ ...project, id: 'p' }, 'editor');
  await assertFails(service('editor').createInvitation({ ...project, id: 'p' }, 'editor'));
  await assertFails(service('viewer').revokeInvitation(id));
  await env.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), 'invitations', id), { expiresAt: Timestamp.fromMillis(Date.now() - 1000) }));
  await assert.rejects(service('newcomer').joinProject({ id: 'newcomer', name: 'New Member' }, id), /expired/);
  await service('owner').revokeInvitation(id);
  await assert.rejects(service('newcomer').joinProject({ id: 'newcomer', name: 'New Member' }, id), /revoked/);
});
test('owners change roles and remove members; editors cannot promote themselves', async () => {
  await service('owner').changeMember('p', 'owner', 'viewer', 'editor');
  assert.equal((await getDoc(doc(db('viewer'), 'projects/p'))).data().members.viewer.role, 'editor');
  await assertFails(updateDoc(doc(db('editor'), 'projects/p'), { 'members.editor.role': 'owner', updatedAt: serverTimestamp() }));
  await assert.rejects(service('owner').changeMember('p', 'owner', 'editor', 'remove'), /Reassign/);
  await service('owner').changeMember('p', 'owner', 'viewer', 'remove');
  await assertFails(getDoc(doc(db('viewer'), 'projects/p')));
  await assertFails(getDoc(doc(db('viewer'), 'projects/p/tasks/task')));
});
test('transaction-backed task edit, reassignment, delete, and dependency validation work', async () => {
  const editorService = service('editor');
  await editorService.mutateTasks('p', 'editor', { type: 'edit', taskId: 'task', input: { projectId: 'p', title: 'Reassigned', description: 'Updated', assignedTo: 'owner', deadline: '2026-10-25', checklist: ['First'] } });
  const saved = (await getDoc(doc(db('owner'), 'projects/p/tasks/task'))).data();
  assert.equal(saved.assignedTo, 'owner'); assert.equal(saved.title, 'Reassigned');
  await editorService.saveNewTask('editor', { projectId: 'p', title: 'Dependent', description: '', assignedTo: 'editor', deadline: '2026-10-26', checklist: [], dependsOnTaskId: 'task' });
  await assert.rejects(editorService.mutateTasks('p', 'editor', { type: 'delete', taskId: 'task' }), /dependencies/);
  const parent = (await getDoc(doc(db('owner'), 'projects/p'))).data();
  const childId = parent.taskIds.find(id => id !== 'task');
  await editorService.mutateTasks('p', 'editor', { type: 'delete', taskId: childId });
  await editorService.mutateTasks('p', 'editor', { type: 'delete', taskId: 'task' });
  assert.equal((await getDocs(collection(db('owner'), 'projects/p/tasks'))).size, 0);
});
