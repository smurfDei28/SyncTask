export interface FirebaseEnvironment {
  apiKey?: string; authDomain?: string; projectId?: string; storageBucket?: string;
  messagingSenderId?: string; appId?: string; allowedEmailDomain?: string;
}
const variables: Record<keyof FirebaseEnvironment, string> = {
  apiKey: 'EXPO_PUBLIC_FIREBASE_API_KEY',
  authDomain: 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  projectId: 'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  storageBucket: 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'EXPO_PUBLIC_FIREBASE_APP_ID',
  allowedEmailDomain: 'EXPO_PUBLIC_ALLOWED_EMAIL_DOMAIN',
};
export function validateFirebaseEnvironment(environment: FirebaseEnvironment): string | null {
  const missing = (Object.keys(variables) as (keyof FirebaseEnvironment)[])
    .filter(key => !environment[key]?.trim()).map(key => variables[key]);
  return missing.length
    ? 'Firebase setup required. Fill these variables in .env and restart Expo: ' + missing.join(', ')
    : null;
}
