import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, updateProfile } from 'firebase/auth';
import { getFirebaseServices, allowedEmailDomain } from '@/firebase/config';
import { AuthFlowError } from '@/utils/authErrors';
import { normalizeEmail, RegistrationInput, validateLogin, validateRegistration } from '@/utils/authValidation';
import { ensureUserProfile } from './userService';

export async function login(email: string, password: string) {
  const error = validateLogin(email, password, allowedEmailDomain);
  if (error) throw new Error(error);
  const { auth } = getFirebaseServices();
  await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
}

export async function registerAccount(input: RegistrationInput) {
  const error = validateRegistration(input, allowedEmailDomain);
  if (error) throw new Error(error);
  const { auth } = getFirebaseServices();
  const credential = await createUserWithEmailAndPassword(auth, normalizeEmail(input.email), input.password);
  try {
    await updateProfile(credential.user, { displayName: input.name.trim() });
    await ensureUserProfile(credential.user);
  } catch {
    // Authentication and Firestore are separate services: report a partial
    // registration honestly and retain the account for recovery on next login.
    try { await firebaseSignOut(auth); } catch { /* Context keeps this session out of the app. */ }
    throw new AuthFlowError('profile/registration-incomplete');
  }
}

export async function logout() {
  await firebaseSignOut(getFirebaseServices().auth);
}
