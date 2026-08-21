import { GeoPlacesClient, SearchNearbyCommand, type SearchNearbyResultItem } from '@aws-sdk/client-geo-places';
import { midpoint } from './domain.js';

export interface Venue {
  name: string;
  address: string;
  lat: number;
  lng: number;
  maps_url: string;
}

const places = new GeoPlacesClient({});
const allowFallback = process.env.ALLOW_VENUE_FALLBACK === 'true';

export class VenueUnavailableError extends Error {
  constructor() {
    super('A verified public venue could not be selected right now. Please try again shortly.');
    this.name = 'VenueUnavailableError';
  }
}

export function fallbackVenue(lat: number, lng: number): Venue {
  return {
    name: 'A public place near your midpoint',
    address: 'Open Maps to review the area before you leave',
    lat,
    lng,
    maps_url: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  };
}

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function localDayAndMinute(at: Date, timeZone: string): { day: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(value('weekday'));
  return { day, minute: Number(value('hour')) * 60 + Number(value('minute')) };
}

function durationMinutes(value?: string): number | null {
  const match = value?.match(/^PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return null;
  return Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
}

function openMinute(value?: string): number | null {
  const match = value?.match(/^T(\d{2})(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function isVenueOpenAt(item: SearchNearbyResultItem, at: Date): boolean | null {
  const components = item.OpeningHours?.flatMap((hours) => hours.Components ?? []) ?? [];
  if (!components.length) return null;
  const { day, minute } = localDayAndMinute(at, item.TimeZone?.Name || 'Asia/Kolkata');
  const previousDay = (day + 6) % 7;
  for (const component of components) {
    const starts = openMinute(component.OpenTime);
    const duration = durationMinutes(component.OpenDuration);
    if (starts == null || duration == null || duration <= 0) continue;
    const byDay = component.Recurrence?.match(/(?:^|;)BYDAY=([^;]+)/)?.[1]?.split(',') ?? DAY_CODES;
    const ends = starts + duration;
    if (byDay.includes(DAY_CODES[day]) && minute >= starts && minute < Math.min(ends, 1440)) return true;
    if (ends > 1440 && byDay.includes(DAY_CODES[previousDay]) && minute < ends - 1440) return true;
  }
  return false;
}

export async function chooseVenue(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  meetStart = new Date(),
): Promise<Venue> {
  const center = midpoint(a, b);
  for (const radius of [2000, 5000]) {
    try {
      const response = await places.send(new SearchNearbyCommand({
        QueryPosition: [center.lng, center.lat],
        QueryRadius: radius,
        MaxResults: 12,
        IntendedUse: 'Storage',
        Language: 'en',
        AdditionalFeatures: ['TimeZone'],
        Filter: {
          IncludeCategories: [
            'coffee_shop',
            'tea_house',
            'coffee-tea',
            'library',
            'gallery',
            'history_museum',
            'shopping_mall',
          ],
        },
      }));
      const candidates = response.ResultItems?.filter((item) => item.Position?.length === 2 && item.Title) ?? [];
      const result = candidates.find((item) => isVenueOpenAt(item, meetStart) === true)
        ?? candidates.find((item) => isVenueOpenAt(item, meetStart) === null);
      if (!result?.Position || !result.Title) continue;
      const [lng, lat] = result.Position;
      return {
        name: result.Title,
        address: result.Address?.Label ?? 'Address available in Maps',
        lat,
        lng,
        maps_url: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      };
    } catch (error) {
      console.warn('Amazon Location venue lookup failed', error instanceof Error ? error.name : 'UnknownError');
    }
  }
  if (allowFallback) return fallbackVenue(center.lat, center.lng);
  throw new VenueUnavailableError();
}
