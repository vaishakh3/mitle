import { Linking } from 'react-native';
import type { CurrentMatch } from './types';

function compactUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function calendarUrl(match: CurrentMatch): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Milte · one real hour',
    dates: `${compactUtc(match.window_start!)}/${compactUtc(match.window_end!)}`,
    location: `${match.venue!.name}, ${match.venue!.address}`,
    details: 'A private Milte plan. Meet in public, travel independently, and share the plan with someone you trust.',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export async function addToCalendar(match: CurrentMatch): Promise<void> {
  await Linking.openURL(calendarUrl(match));
}
