import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirebaseServices, firebaseSetupError, allowedEmailDomain } from '@/firebase/config';
import { login, logout, registerAccount } from '@/services/authService';
import { ensureUserProfile } from '@/services/userService';
import { User } from '@/types';
import { authErrorMessage, AuthFlowError } from '@/utils/authErrors';
import { RegistrationInput, validateLogin, validateRegistration } from '@/utils/authValidation';

interface AuthValue {
  user: User | null;
  loading: boolean;
  submitting: boolean;
  setupError: string | null;
  sessionError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  register: (input: RegistrationInput) => Promise<void>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!firebaseSetupError);
  const [submitting, setSubmitting] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(firebaseSetupError);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const busy = useRef(false);
  const generation = useRef(0);
  const mounted = useRef(true);

  async function synchronize(account: FirebaseUser | null) {
    const version = ++generation.current;
    try {
      const profile = account ? await ensureUserProfile(account) : null;
      if (mounted.current && version === generation.current) {
        setUser(profile);
        setSessionError(null);
      }
    } catch {
      if (mounted.current && version === generation.current) {
        setUser(null);
        setSessionError(authErrorMessage(new AuthFlowError('profile/unavailable')));
      }
      throw new AuthFlowError('profile/unavailable');
    } finally {
      if (mounted.current && version === generation.current) setLoading(false);
    }
  }

  useEffect(() => {
    mounted.current = true;
    if (firebaseSetupError) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const { auth } = getFirebaseServices();
        unsubscribe = onAuthStateChanged(auth, account => {
          if (!busy.current) void synchronize(account).catch(() => {});
        }, () => {
          setUser(null);
          setSessionError('Unable to restore your session. Please sign in again.');
          setLoading(false);
        });
      } catch {
        setSetupError('Firebase initialization failed. Check the .env configuration and restart Expo.');
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      mounted.current = false;
      generation.current += 1;
      unsubscribe?.();
    };
  }, []);

  async function run(action: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    generation.current += 1;
    setSubmitting(true);
    setSessionError(null);
    try {
      await action();
      await synchronize(getFirebaseServices().auth.currentUser);
    } catch (error) {
      throw new Error(authErrorMessage(error));
    } finally {
      busy.current = false;
      if (mounted.current) { setSubmitting(false); setLoading(false); }
    }
  }

  async function signIn(email: string, password: string) {
    const error = validateLogin(email, password, allowedEmailDomain);
    if (error) throw new Error(error);
    await run(() => login(email, password));
  }
  async function register(input: RegistrationInput) {
    const error = validateRegistration(input, allowedEmailDomain);
    if (error) throw new Error(error);
    await run(() => registerAccount(input));
  }

  return <AuthContext.Provider value={{
    user, loading, submitting, setupError, sessionError, signIn, register,
    signOut: () => run(logout),
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is required');
  return value;
}
