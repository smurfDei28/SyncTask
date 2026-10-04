export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))
    ? null : 'Please enter a valid email address.';
}

export function validateSchoolEmail(email: string, allowedDomain: string | undefined): string | null {
  const domain = allowedDomain?.trim().toLowerCase();
  if (!domain) return 'Setup required: EXPO_PUBLIC_ALLOWED_EMAIL_DOMAIN is missing.';
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(domain) || domain.includes('..')) {
    return 'Setup required: EXPO_PUBLIC_ALLOWED_EMAIL_DOMAIN must be an email domain only.';
  }
  const error = validateEmail(email);
  if (error) return error;
  return normalizeEmail(email).split('@')[1] === domain
    ? null : 'Please use your school email address.';
}

export interface RegistrationInput { name: string; email: string; password: string; confirmation: string }

export function validateRegistration(input: RegistrationInput, allowedDomain: string | undefined): string | null {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) return 'Full name must be between 2 and 80 characters.';
  const emailError = validateSchoolEmail(input.email, allowedDomain);
  if (emailError) return emailError;
  if (input.password.length < 8 || !/[A-Z]/.test(input.password) ||
      !/[a-z]/.test(input.password) || !/[0-9]/.test(input.password) ||
      !/[^A-Za-z0-9\s]/.test(input.password)) {
    return 'Password must have 8+ characters, an uppercase letter, a lowercase letter, a number, and a special character.';
  }
  if (!input.confirmation || input.password !== input.confirmation) return 'Passwords must match exactly.';
  return null;
}

export function validateLogin(email: string, password: string, allowedDomain: string | undefined): string | null {
  return validateSchoolEmail(email, allowedDomain) || (!password ? 'Please enter your password.' : null);
}
