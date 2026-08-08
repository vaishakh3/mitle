// Expo Push API helper. Tokens come from expo-notifications on the client.

export interface PushMessage {
  to: string;
  title: string;
  body: string;
}

export async function sendPush(
  messages: PushMessage[],
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const valid = messages.filter((m) => m.to?.startsWith('ExponentPushToken'));
  if (valid.length === 0) return;
  try {
    await fetchFn('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(valid),
    });
  } catch (err) {
    console.error('push failed', err);
  }
}
