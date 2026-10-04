import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { validateFirebaseEnvironment } from './environment';
import { getErrorCode } from '@/utils/authErrors';

// Expo requires literal process.env.EXPO_PUBLIC_* references for inlining.
const environment = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim(),
  allowedEmailDomain: process.env.EXPO_PUBLIC_ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase(),
};
export const allowedEmailDomain = environment.allowedEmailDomain;
export const firebaseSetupError = validateFirebaseEnvironment(environment);

export function getFirebaseServices() {
  if (firebaseSetupError) throw new Error(firebaseSetupError);
  const { allowedEmailDomain: _domain, ...options } = environment;
  const app = getApps().some(item => item.name === '[DEFAULT]') ? getApp() : initializeApp(options);
  let auth;
  try {
    auth = initializeAuth(app, {
      persistence: Platform.OS === 'web' ? browserLocalPersistence : getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    // Only reuse an existing Auth instance; do not hide unrelated init failures.
    if (getErrorCode(error) !== 'auth/already-initialized') throw error;
    auth = getAuth(app);
  }
  return { app, auth, db: getFirestore(app) };
}
