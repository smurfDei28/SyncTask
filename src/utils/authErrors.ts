export function getErrorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' ? error.code : '';
}

export class AuthFlowError extends Error {
  constructor(public code: string) { super(code); }
}

export function authErrorMessage(error: unknown): string {
  switch (getErrorCode(error)) {
    case 'auth/email-already-in-use': return 'An account already exists with this email.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements': return 'Choose a stronger password that meets the requirements.';
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/user-not-found':
    case 'auth/wrong-password': return 'Incorrect email or password.';
    case 'auth/user-disabled': return 'This account is disabled. Contact your administrator.';
    case 'auth/network-request-failed':
    case 'unavailable': return 'Unable to connect. Check your internet connection and try again.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait and try again.';
    case 'auth/operation-not-allowed': return 'Email/password sign-in is not enabled. Ask the project administrator to enable it.';
    case 'auth/invalid-api-key':
    case 'auth/app-not-authorized': return 'Firebase configuration needs attention. Check your app setup.';
    case 'profile/registration-incomplete': return 'Your account was created, but profile setup failed. Check your connection and ask the administrator to check Firestore rules, then sign in to finish setup.';
    case 'profile/unavailable':
    case 'permission-denied': return 'Unable to load your profile. Check your connection or ask the administrator to check Firestore setup and rules, then try signing in again.';
    default: return 'Something went wrong. Please try again.';
  }
}
