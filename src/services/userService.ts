import { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase/config';
import { User } from '@/types';

// Also repairs a missing profile after an interrupted registration. Never
// overwrite createdAt on an existing profile or store passwords/tokens.
export async function ensureUserProfile(account: FirebaseUser): Promise<User> {
  const { db } = getFirebaseServices();
  const reference = doc(db, 'users', account.uid);
  const snapshot = await getDoc(reference);
  const fallbackName = account.displayName?.trim() || account.email?.split('@')[0] || 'Student';
  if (!snapshot.exists()) {
    await setDoc(reference, {
      uid: account.uid, name: fallbackName, email: account.email ?? '',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  }
  const data = snapshot.data();
  return {
    id: account.uid,
    name: typeof data?.name === 'string' && data.name.trim() ? data.name : fallbackName,
    email: account.email ?? '',
  };
}
