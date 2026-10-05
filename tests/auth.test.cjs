const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loader(modules = {}, environment = {}) {
  const cache = new Map();
  function load(file) {
    const absolute = path.resolve(file);
    if (cache.has(absolute)) return cache.get(absolute);
    const exports = {};
    cache.set(absolute, exports);
    const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText;
    const localRequire = name => {
      if (name in modules) return modules[name];
      if (name.startsWith('@/')) return load('src/' + name.slice(2) + '.ts');
      if (name.startsWith('.')) return load(path.resolve(path.dirname(absolute), name + '.ts'));
      throw new Error('Unexpected test import: ' + name);
    };
    new Function('exports', 'require', 'process', code)(exports, localRequire, { env: environment });
    return exports;
  }
  return load;
}
const load = loader();
const validation = load('src/utils/authValidation.ts');
const errors = load('src/utils/authErrors.ts');
const { validateFirebaseEnvironment } = load('src/firebase/environment.ts');
const domain = 'student.school.edu.ph'; // Test fixture only, never application config.
const validInput = { name: '  Ejay Reyes  ', email: ' EJAY@STUDENT.SCHOOL.EDU.PH ', password: 'StrongPass1!', confirmation: 'StrongPass1!' };

test('school email normalization accepts only the exact configured domain', () => {
  for (const email of ['ejay@student.school.edu.ph', 'EJAY@STUDENT.SCHOOL.EDU.PH']) {
    assert.equal(validation.validateSchoolEmail(email, domain), null);
  }
  for (const email of ['ejay@gmail.com', 'ejay@yahoo.com', 'ejay@another.edu',
    'ejay@student.school.edu.ph.fake.com', 'ejay@sub.student.school.edu.ph',
    'ejay@@student.school.edu.ph', 'ejay student.school.edu.ph', '']) {
    assert.equal(typeof validation.validateSchoolEmail(email, domain), 'string', email);
  }
  assert.equal(validation.normalizeEmail(validInput.email), 'ejay@student.school.edu.ph');
  assert.equal(validation.validateSchoolEmail(validInput.email, ' STUDENT.SCHOOL.EDU.PH '), null);
});
test('missing or malformed allowed domain fails closed', () => {
  for (const value of [undefined, '', ' ', '@student.school.edu.ph', 'https://student.school.edu.ph', '*.school.edu.ph']) {
    assert.match(validation.validateSchoolEmail(validInput.email, value), /Setup required/);
  }
});
test('registration enforces trimmed name, strong password, and exact confirmation', () => {
  assert.equal(validation.validateRegistration(validInput, domain), null);
  for (const name of ['', '  ', ' A ', 'x'.repeat(81)]) {
    assert.equal(typeof validation.validateRegistration({ ...validInput, name }, domain), 'string');
  }
  for (const password of ['', 'Aa1!', 'lowercase1!', 'UPPERCASE1!', 'NoNumber!!', 'NoSpecial12', 'WhiteSpace1 ']) {
    assert.equal(typeof validation.validateRegistration({ ...validInput, password, confirmation: password }, domain), 'string', password);
  }
  for (const confirmation of ['', 'StrongPass1! ', 'strongPass1!']) {
    assert.equal(typeof validation.validateRegistration({ ...validInput, confirmation }, domain), 'string');
  }
});
test('login does not impose new registration password rules on existing accounts', () => {
  assert.equal(validation.validateLogin(validInput.email, 'old-password', domain), null);
  assert.equal(typeof validation.validateLogin(validInput.email, '', domain), 'string');
  assert.equal(typeof validation.validateLogin('bad', 'old-password', domain), 'string');
});
test('missing Firebase values are reported by variable name without leaking values', () => {
  const error = validateFirebaseEnvironment({ apiKey: 'not-a-real-key' });
  assert(error.includes('EXPO_PUBLIC_FIREBASE_PROJECT_ID'));
  assert(error.includes('EXPO_PUBLIC_ALLOWED_EMAIL_DOMAIN'));
  assert(!error.includes('not-a-real-key'));
  assert.equal(validateFirebaseEnvironment({
    apiKey: 'fixture', authDomain: 'fixture', projectId: 'fixture', storageBucket: 'fixture',
    messagingSenderId: 'fixture', appId: 'fixture', allowedEmailDomain: domain,
  }), null);
});
test('Firebase errors are mapped to safe readable messages', () => {
  assert.match(errors.authErrorMessage({ code: 'auth/email-already-in-use' }), /already exists/);
  for (const code of ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password']) {
    assert.equal(errors.authErrorMessage({ code }), 'Incorrect email or password.');
  }
  for (const code of ['auth/weak-password', 'auth/network-request-failed', 'auth/too-many-requests',
    'auth/user-disabled', 'profile/registration-incomplete', 'permission-denied']) {
    assert(!errors.authErrorMessage({ code }).includes(code));
  }
  assert.equal(errors.authErrorMessage(new Error('internal-sensitive-details')), 'Something went wrong. Please try again.');
});

function firebaseHarness({ platform = 'android', configured = true, profileExists = false, failProfile = false } = {}) {
  const calls = [];
  const app = { name: '[DEFAULT]' };
  let initializedApp = false;
  let initializedAuth = false;
  const auth = { currentUser: null };
  const storage = { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };
  const account = { uid: 'uid-fixture', email: 'ejay@student.school.edu.ph', displayName: null };
  const environment = configured ? {
    EXPO_PUBLIC_FIREBASE_API_KEY: 'fixture',
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'fixture.firebaseapp.com',
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'fixture',
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: 'fixture',
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'fixture',
    EXPO_PUBLIC_FIREBASE_APP_ID: 'fixture',
    EXPO_PUBLIC_ALLOWED_EMAIL_DOMAIN: domain,
  } : {};
  const modules = {
    'react-native': { Platform: { OS: platform } },
    '@react-native-async-storage/async-storage': { __esModule: true, default: storage },
    'firebase/app': {
      getApps: () => initializedApp ? [app] : [],
      getApp: () => app,
      initializeApp: options => { initializedApp = true; calls.push(['initializeApp', options]); return app; },
    },
    'firebase/auth': {
      browserLocalPersistence: 'browser-persistence',
      getReactNativePersistence: value => { assert.equal(value, storage); calls.push(['nativePersistence']); return 'native-persistence'; },
      initializeAuth: (_app, options) => {
        calls.push(['initializeAuth', options]);
        if (initializedAuth) throw { code: 'auth/already-initialized' };
        initializedAuth = true; return auth;
      },
      getAuth: () => auth,
      createUserWithEmailAndPassword: async (_auth, email, password) => {
        calls.push(['createAccount', email]); account.email = email; auth.currentUser = account;
        assert.equal(password, validInput.password);
        return { user: account };
      },
      updateProfile: async (user, value) => { calls.push(['updateProfile', value]); user.displayName = value.displayName; },
      signInWithEmailAndPassword: async (_auth, email, password) => { calls.push(['login', email, password]); auth.currentUser = account; },
      signOut: async () => { calls.push(['logout']); auth.currentUser = null; },
    },
    'firebase/firestore': {
      getFirestore: () => 'db',
      doc: (_db, collection, id) => { assert.equal(collection, 'users'); return collection + '/' + id; },
      getDoc: async reference => {
        calls.push(['getDoc', reference]);
        if (failProfile) throw { code: 'permission-denied' };
        return { exists: () => profileExists, data: () => profileExists ? { name: 'Stored Name', createdAt: 'original-date' } : undefined };
      },
      serverTimestamp: () => 'server-timestamp',
      setDoc: async (reference, value) => { calls.push(['setDoc', reference, value]); },
    },
  };
  return { load: loader(modules, environment), calls, auth, account };
}
test('native initialization uses AsyncStorage persistence and safely reuses instances', () => {
  const harness = firebaseHarness();
  const config = harness.load('src/firebase/config.ts');
  const first = config.getFirebaseServices();
  const second = config.getFirebaseServices();
  assert.equal(first.app, second.app);
  assert.equal(first.auth, second.auth);
  assert.equal(harness.calls.filter(call => call[0] === 'initializeApp').length, 1);
  assert.equal(harness.calls.find(call => call[0] === 'initializeAuth')[1].persistence, 'native-persistence');
});
test('web initialization selects browser-local persistence', () => {
  const harness = firebaseHarness({ platform: 'web' });
  harness.load('src/firebase/config.ts').getFirebaseServices();
  assert.equal(harness.calls.find(call => call[0] === 'initializeAuth')[1].persistence, 'browser-persistence');
  assert.equal(harness.calls.filter(call => call[0] === 'nativePersistence').length, 0);
});
test('missing environment prevents Firebase initialization', () => {
  const harness = firebaseHarness({ configured: false });
  const config = harness.load('src/firebase/config.ts');
  assert.match(config.firebaseSetupError, /EXPO_PUBLIC_FIREBASE_API_KEY/);
  assert.throws(() => config.getFirebaseServices(), /Firebase setup required/);
  assert.equal(harness.calls.length, 0);
});
test('invalid registration does not send a Firebase request', async () => {
  const harness = firebaseHarness();
  const service = harness.load('src/services/authService.ts');
  await assert.rejects(() => service.registerAccount({ ...validInput, email: 'ejay@gmail.com' }), /school email/);
  await assert.rejects(() => service.registerAccount({ ...validInput, password: 'weak' }), /Password/);
  assert.equal(harness.calls.length, 0);
});
test('registration creates Auth account, sets name, then writes owner profile with server timestamps', async () => {
  const harness = firebaseHarness();
  await harness.load('src/services/authService.ts').registerAccount(validInput);
  assert.equal(harness.calls.find(call => call[0] === 'createAccount')[1], 'ejay@student.school.edu.ph');
  assert.deepEqual(harness.calls.find(call => call[0] === 'updateProfile')[1], { displayName: 'Ejay Reyes' });
  const write = harness.calls.find(call => call[0] === 'setDoc');
  assert.equal(write[1], 'users/uid-fixture');
  assert.deepEqual(write[2], { uid: 'uid-fixture', name: 'Ejay Reyes', email: 'ejay@student.school.edu.ph', createdAt: 'server-timestamp', updatedAt: 'server-timestamp' });
  assert(harness.calls.findIndex(call => call[0] === 'updateProfile') < harness.calls.findIndex(call => call[0] === 'setDoc'));
  assert.equal(harness.auth.currentUser.uid, 'uid-fixture');
});
test('partial registration reports account creation honestly and signs out', async () => {
  const harness = firebaseHarness({ failProfile: true });
  await assert.rejects(() => harness.load('src/services/authService.ts').registerAccount(validInput),
    error => error.code === 'profile/registration-incomplete');
  assert.equal(harness.auth.currentUser, null);
  assert(harness.calls.some(call => call[0] === 'logout'));
});
test('profile reading prefers stored name and preserves original timestamps', async () => {
  const harness = firebaseHarness({ profileExists: true });
  const profile = await harness.load('src/services/userService.ts').ensureUserProfile(harness.account);
  assert.deepEqual(profile, { id: 'uid-fixture', name: 'Stored Name', email: 'ejay@student.school.edu.ph' });
  assert.equal(harness.calls.filter(call => call[0] === 'setDoc').length, 0);
});
test('login normalizes email, allows existing passwords, and logout invokes Firebase', async () => {
  const harness = firebaseHarness();
  const service = harness.load('src/services/authService.ts');
  await service.login(validInput.email, 'older-pass');
  assert.deepEqual(harness.calls.find(call => call[0] === 'login').slice(1), ['ejay@student.school.edu.ph', 'older-pass']);
  await service.logout();
  assert.equal(harness.auth.currentUser, null);
});
test('auth routing waits for the observer and shared workspace resets between users', () => {
  const root = fs.readFileSync('src/app/_layout.tsx', 'utf8');
  assert(root.includes('if (loading) return <SessionSplash />'));
  const context = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');
  assert(context.includes('onAuthStateChanged'));
  assert(context.includes('if (busy.current) return'));
  assert(context.includes('generation.current'));
  assert(!fs.existsSync('src/context/MockAuth.tsx'));
  assert(root.includes("key={user?.id ?? 'signed-out'}"));
  assert(fs.readFileSync('src/app/index.tsx', 'utf8').includes("'/\u0028auth\u0029/login'"));
  assert(fs.readFileSync('.gitignore', 'utf8').split(/\r?\n/).includes('.env'));
});
