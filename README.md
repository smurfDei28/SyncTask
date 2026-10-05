# SyncTask — shared projects

Expo SDK 57 / React Native / TypeScript / Expo Router / Firebase Auth and Firestore.

## Features

- Email/password registration and login, school-domain validation, saved profiles, and persistent sign-in.
- Create projects and subscribe to shared projects/tasks in real time. Each account starts with an empty workspace; the old sample data is now used only by tests.
- Owners manage members and invitation codes. Editors create, edit, reassign, complete, and delete tasks. Viewers have read-only access. Firestore rules enforce these permissions.
- Single-use invitation codes grant editor or viewer access, expire after seven days, and can be revoked. Share codes privately: possession of a code plus a signed-in account is sufficient to join. Codes are not tied to an email address.
- Task checklists, deadline validation, dependency blocking, cycle detection, progress, and reopening tasks. A prerequisite cannot be deleted while other tasks depend on it.
- My Tasks shows the signed-in user's assignments across every joined project. Search by title/description, filter by status, and view tasks in deadline order.
- Home shows overdue assignments and assignments due today/tomorrow. Optional phone reminders fire at 9 AM local time the day before and the day of a deadline. Enable them on Home and allow notification permission.

## Firebase setup

1. Install dependencies: `npm.cmd ci`.
2. Create/select a Firebase project. Register a Web App and copy its client configuration from Project settings → General → Your apps.
3. Enable Authentication → Email/Password.
4. Create a Firestore database in production mode.
5. **Publish the entire updated `firestore.rules` file** in Firestore Database → Rules. The old profile-only rules deny shared projects and invitations. Alternatively, after authenticating Firebase CLI, run `npx.cmd firebase deploy --only firestore:rules --project YOUR_PROJECT_ID`.
6. Run `Copy-Item .env.example .env` and fill all seven values below. Set the exact school email domain without `@`, protocols, or wildcards.
7. Restart Expo after changing `.env`.

```dotenv
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_ALLOWED_EMAIL_DOMAIN=
```

Only use Firebase client configuration in EXPO_PUBLIC variables. Never add service account keys or server secrets. `.env` is ignored by Git. Client school-domain validation does not verify email ownership; email verification and password recovery are separate future features.

## Run

```powershell
npx.cmd expo start
```

Notification configuration is included in `app.json`. After adding native packages or changing their configuration, create/rebuild your development build following https://docs.expo.dev/develop/development-builds/create-a-build/. This repository uses generated native projects: configure them through `app.json` instead of editing `ios/` or `android/`.

## Data and consistency

- `users/{uid}` holds each account's private profile. Profiles cannot be listed or read by other users.
- `projects/{projectId}` holds metadata, owner ID, member IDs, shared display names/roles, task IDs, and a revision counter.
- `projects/{projectId}/tasks/{taskId}` holds tasks.
- `invitations/{random20CharacterCode}` holds the project ID/name, editor/viewer role, expiration, and accepted account ID. Only owners can list/create/revoke invitations. Signed-in users can retrieve a specific code to accept it.
- Invitation acceptance atomically adds membership and marks the code as used. Rules require both changes together and prevent changing the granted role.
- Task mutations read current project/task documents in a transaction and validate assignments/dependencies again. The revision counter serializes changes so simultaneous checklist updates do not overwrite one another. Removing a member requires their tasks to be reassigned first.
- Projects support up to 40 members and 100 tasks. Each task supports 30 checklist items. Each task transaction reads all tasks in that project to reconcile dependency chains; this is appropriate for small classroom teams, but increases read costs as a project grows.
- Writes require connectivity. Failed saves stay on the screen with an error and can be retried. Tasks are not optimistically reported as saved.

## Reminders and limitations

Phone reminders are local scheduled notifications, rather than server push notifications. They are refreshed when the app receives task updates, opens, or returns to the foreground. If teammates change work while this app is closed, existing alerts may remain until it is reopened. Web supports the in-app due-task list, but not phone notifications. The nearest 60 future alerts are scheduled to stay below device notification limits. Editing deadlines, reassigning tasks, completing tasks, disabling reminders, and signing out cancel or replace scheduled alerts when the app syncs. Reminder settings are saved per account on each device.

Existing mock projects are not migrated or inserted into real accounts. There is no offline write queue, chat, file upload, activity log, server push sender, or hosting deployment in this milestone.

## Automated checks

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run test:rules
npx.cmd expo export --platform android --platform web --output-dir dist --no-bytecode
```

`test:rules` launches a local Firestore emulator with the demo project `demo-synctask-tests`; it does not access production data or require Firebase login. Java is required. Tests cover member/outsider access, saved project creation, editor/viewer writes, concurrent checklist updates, single-use/expired/revoked invitations, atomic joining, privilege escalation, role changes, member removal, editing, reassignment, and deletion.

## Two-account phone checklist

1. Configure Firebase and publish the updated rules. Register/sign in with two accounts.
2. Account A: create a project; create an editor invitation and share the code.
3. Account B: Join Project with the code. Both accounts should see the same project/member list. Try the code again with a third account; it must fail.
4. Create tasks assigned to actual members. Edit a title, deadline, checklist, or assignee. Confirm the changes appear on the other device and survive app restart/sign-out.
5. Change separate checklist items on both devices at the same time. Confirm neither update is lost. Finish a prerequisite and confirm dependents unblock; reopen it and confirm dependents block again.
6. Change B to viewer. Task mutation controls should disappear/disable, and direct unauthorized writes must be rejected. Change B back to editor.
7. Try deleting a prerequisite or removing a member with assigned tasks; follow the displayed instructions before retrying. After removal, B must lose project/task access.
8. Open Tasks → My Tasks. Confirm only the current account's assignments appear, including assignments from multiple projects. Test search and status filters.
9. Enable phone reminders and grant permissions. Create a task due tomorrow; verify the device schedules reminders. Complete/reassign it, change its deadline, disable reminders, or sign out and verify alerts are canceled/replaced. Tap an alert to open its task.
10. Deny notification permission and test a failed network save. Both should explain the issue without reporting success.
