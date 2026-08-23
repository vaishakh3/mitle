export interface PushMessage {
  to: string;
  title: string;
  body: string;
}

export async function sendPush(messages: PushMessage[]): Promise<string[]> {
  const valid = messages.filter((message) => /^Expo(nent)?PushToken\[/.test(message.to));
  if (!valid.length) return [];
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(valid),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.warn('Expo push delivery returned', response.status);
      return [];
    }
    const result = await response.json() as { data?: Array<{ status?: string; details?: { error?: string } }> };
    return (result.data ?? []).flatMap((ticket, index) =>
      ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered' && valid[index]
        ? [valid[index].to]
        : []
    );
  } catch (error) {
    console.warn('Expo push delivery failed', error instanceof Error ? error.name : 'UnknownError');
    return [];
  }
}
