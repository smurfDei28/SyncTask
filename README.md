# SyncTask ? Phase 3

Expo SDK 57 / React Native / TypeScript / Expo Router. Authentication and user profiles now use Firebase; the sample project, five members, 25 tasks, checklists, and dependencies remain in local React state. Initial project progress remains 18/25 (72%). The final logo is unchanged.

## Firebase setup (manual)

1. Install dependencies with `npm.cmd install`.
2. In [Firebase Console](https://console.firebase.google.com/), create or select a project.
3. Project overview ? Add app ? Web (`</>`). Register a Web App; Hosting is not needed. Copy its Firebase configuration from Project settings ? General ? Your apps ? SDK setup and configuration.
4. Authentication ? Get started (if shown) ? Sign-in method ? Email/Password ? enable the Email/Password provider ? Save. Email link sign-in is not used.
5. Firestore Database ? Create database ? select a region ? start in production mode.
6. Firestore Database ? Rules: replace the rules with the contents of `firestore.rules` and click Publish. This file allows only the signed-in owner to get/create/update `users/{uid}`, validates profile fields, and denies all other collections. No Firebase CLI, Hosting, or deployment configuration is added.
7. In PowerShell, `Copy-Item .env.example .env`. Fill all seven variables below. Use Firebase's Web App values and your actual school email domain, with no `@`, protocol, or subdomain wildcard.
8. Stop and restart Expo after editing .env. If old values remain cached, use `npx.cmd expo start --go --clear`.

```dotenv
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_ALLOWED_EMAIL_DOMAIN=
```

.env is ignored by Git; .env.example contains no real values. EXPO_PUBLIC values are included in the app bundle, so use only Firebase client configuration here, never service-account keys or other server secrets. The storage bucket value is part of configuration only; Firebase Storage is not used.

The school domain check is exact and case-insensitive. Registration and Login reject different domains, subdomains, and lookalike suffixes. Missing configuration blocks submission and shows which variables need attention. This client validation does not establish ownership of an email address; email verification is not included in this phase.

## Run in PowerShell

```powershell
cd C:\Users\ejay\SyncTask
npx.cmd expo start --go
```

Scan the QR code in Expo Go supporting SDK 57. Keep the phone and computer on the same network.

## Authentication behavior

Register validates a trimmed name of 2?80 characters, normalized school email, password of at least eight characters with uppercase/lowercase/number/special character, and exact confirmation. It creates the Auth account, sets displayName, then writes users/{uid} with uid, name, email, createdAt, and updatedAt (server timestamps). Passwords and tokens are never stored in Firestore.

Login uses email/password Auth and reads the owner profile; a missing profile from an interrupted registration is created on login. Duplicate email, invalid credentials, disabled account, weak password, request/network failures, and profile failures have readable messages. Failed profile setup keeps the authenticated app closed; if account creation already succeeded, sign in after fixing connectivity or Firestore rules rather than registering again.

Firebase Auth observation controls routing. The existing branded splash remains visible while restoring the session. Restored users go to Home; signed-out users go to Login without briefly showing the wrong screen. AsyncStorage persists native sessions; browser-local persistence is used on web. Fast Refresh reuses the app/Auth instances. A small TypeScript declaration supplies Firebase 12's React Native persistence export missing from its default public types.

Home greets the real profile/display name. The signed-in account remains separate from the five sample project members. Sign Out uses Firebase and clears session-local project/task edits; the original mock dataset remains intact. Auth persists across reloads; local tasks do not.

## Existing task flow

Home ? Project Dashboard ? Tasks ? Details/Create Task. Filters, checklist toggles, explicit task completion, progress, and dependency blocking remain local. Database Setup ? Connect Frontend ? Testing is the demo chain. Database Setup starts at 75%; finishing and completing it changes the project to 19/25 (76%) and unblocks Connect Frontend.

## Checks

```powershell
npx.cmd tsc --noEmit
npx.cmd expo lint
node --test tests/tasks.test.cjs tests/auth.test.cjs
npx.cmd expo install --check
npx.cmd expo export --platform android --output-dir dist --no-bytecode
```

Unit/service tests use fake Firebase adapters and do not create real accounts or documents. Live Firebase calls require your configured project and manual phone tests. The export is a local bundling check, not publishing.

## Android phone test checklist

1. With .env missing, confirm the clear setup error and disabled auth submission.
2. Configure Firebase, publish the rules, fill .env, and restart Expo. Verify the final logo on loading, Login, and Register.
3. Register with a real school email and strong password. Test spaces/short names, wrong domains (including subdomains and lookalikes), weak passwords, mismatched confirmation, and rapid double taps.
4. Confirm the Authentication user has a displayName and users/{uid} has the five expected fields, timestamps, and no password/token.
5. Home should greet your name and show 72%, 18/25, and five mock members.
6. Sign out, test incorrect credentials and duplicate registration, then sign in again. Test network failure and retry.
7. Close/reopen Expo Go or reload the app. Your Auth session should persist and open Home without a Login flash. Sign out and reload: you should remain signed out.
8. Test dashboard navigation, filters, checklist toggles, Create Task, dependency unblocking/reblocking, and progress updates. Local edits reset on reload/sign-out.
9. In the Firestore Rules Playground, test that an unauthenticated user and another UID cannot read/write your profile, and that the owner can access users/{their UID}. Projects/tasks must stay denied.

Phase 3 stops here. No Firestore project/task migration, invitations, analytics, uploads, notifications, or production deployment.
