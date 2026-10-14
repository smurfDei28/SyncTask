import { getFirebaseServices } from '@/firebase/config';

// Set in .env, for example http://192.168.1.23:8000 for a phone on the same Wi-Fi.
// Expo needs the literal process.env.EXPO_PUBLIC_* form so the value is inlined at build time.
const assistantUrl = (process.env.EXPO_PUBLIC_ASSISTANT_URL ?? '').trim().replace(/\/+$/, '');

// Demo diagnostics: when true, the tab shows the address and the device's error text.
const debugMode = process.env.EXPO_PUBLIC_ASSISTANT_DEBUG === 'true';

// Answers take about 5 to 15 seconds on the demo model. Allow extra time for a cold start.
const TIMEOUT_MS = 90_000;

export class AssistantError extends Error {}

type AskResponse = { answer?: unknown; message?: unknown };

export function assistantSetupError(): string | null {
  return assistantUrl
    ? null
    : 'Assistant setup required. Set EXPO_PUBLIC_ASSISTANT_URL in .env to the backend address, then restart Expo.';
}

export async function askAssistant(question: string): Promise<string> {
  const setupError = assistantSetupError();
  if (setupError) throw new AssistantError(setupError);

  const account = getFirebaseServices().auth.currentUser;
  if (!account) throw new AssistantError('Please sign in again to use the assistant.');
  const token = await account.getIdToken();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  console.log('[assistant] POST', `${assistantUrl}/ask`);
  let response: Response;
  try {
    response = await fetch(`${assistantUrl}/ask`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.warn('[assistant] request to', assistantUrl, 'failed:', detail);
    const hint =
      "Can't reach the assistant. Check that the backend is running and that your phone is on the same Wi-Fi.";
    throw new AssistantError(
      timedOut
        ? 'The assistant took too long to answer. Try again.'
        : debugMode
          ? `${hint} [${assistantUrl}] ${detail}`
          : hint,
    );
  } finally {
    clearTimeout(timer);
  }

  const body = (await response.json().catch(() => ({}))) as AskResponse;
  if (response.status === 401) {
    throw new AssistantError('Your session expired. Sign out and sign in again.');
  }
  if (!response.ok) {
    const message =
      typeof body.message === 'string' ? body.message : 'The assistant could not answer. Try again.';
    throw new AssistantError(debugMode ? `${message} (HTTP ${response.status})` : message);
  }
  if (typeof body.answer !== 'string') {
    throw new AssistantError('The assistant sent an unexpected reply.');
  }
  return body.answer;
}
