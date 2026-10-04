import { useRef, useState } from 'react';
import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { Brand } from './Brand';
import { Button } from './Button';
import { Input } from './Input';
import { Screen } from './Screen';
import { sharedStyles } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { allowedEmailDomain } from '@/firebase/config';
import { validateLogin, validateRegistration } from '@/utils/authValidation';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const isRegister = mode === 'register';
  const { signIn, register, submitting, setupError, sessionError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const pending = useRef(false);

  async function submit() {
    if (pending.current || submitting || setupError) return;
    const input = { name, email, password, confirmation };
    const validation = isRegister
      ? validateRegistration(input, allowedEmailDomain)
      : validateLogin(email, password, allowedEmailDomain);
    if (validation) { setError(validation); return; }
    pending.current = true;
    setError('');
    try {
      if (isRegister) await register(input);
      else await signIn(email, password);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to sign in. Please try again.');
    } finally {
      pending.current = false;
    }
  }

  return <Screen><View style={{ paddingTop: 20 }}><Brand /></View>
    <View style={{ gap: 8 }}><Text style={sharedStyles.title}>{isRegister ? 'Create Account' : 'Welcome Back'}</Text>
      <Text style={sharedStyles.subtitle}>{isRegister ? 'Start keeping your student team in sync.' : 'Your team?s next step starts here.'}</Text>
    </View>
    <View style={sharedStyles.card}>
      {isRegister && <Input label="Full Name" placeholder="Your full name" value={name} onChangeText={setName} autoComplete="name" editable={!submitting} maxLength={80} />}
      <Input label="Email" placeholder="Your school email address" value={email} onChangeText={setEmail}
        autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" editable={!submitting} />
      <Input label="Password" placeholder={isRegister ? 'At least 8 characters' : 'Your password'} value={password} onChangeText={setPassword}
        secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={isRegister ? 'new-password' : 'current-password'} editable={!submitting} />
      {isRegister && <>
        <Text style={[sharedStyles.subtitle, { fontSize: 12 }]}>Use 8+ characters with uppercase and lowercase letters, a number, and a special character.</Text>
        <Input label="Confirm Password" placeholder="Re-enter your password" value={confirmation} onChangeText={setConfirmation}
          secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={!submitting} />
      </>}
      {!!(setupError || error || sessionError) && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={sharedStyles.error}>{setupError || error || sessionError}</Text>}
      <Button title={submitting ? (isRegister ? 'Creating Account?' : 'Signing In?') : (isRegister ? 'Create Account' : 'Sign In')}
        disabled={submitting || !!setupError} onPress={submit} />
    </View>
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Text style={sharedStyles.subtitle}>{isRegister ? 'Already have an account?' : 'New to SyncTask?'}</Text>
      {!submitting && <Link href={isRegister ? '/(auth)/login' : '/(auth)/register'} replace style={sharedStyles.link}>{isRegister ? 'Sign In' : 'Register'}</Link>}
    </View>
  </Screen>;
}
