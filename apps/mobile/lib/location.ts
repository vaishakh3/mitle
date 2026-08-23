import * as Location from 'expo-location';
import { upsertProfile } from './api';
import { roundLocationPoint } from './location-privacy';

const CURRENT_FIX_TIMEOUT_MS = 12_000;
const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;
const LAST_KNOWN_REQUIRED_ACCURACY_METRES = 2_000;

async function getUsablePosition(): Promise<Location.LocationObject | null> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const current = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null),
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), CURRENT_FIX_TIMEOUT_MS);
      }),
    ]);
    if (current) return current;
  } finally {
    if (timeout) clearTimeout(timeout);
  }

  return Location.getLastKnownPositionAsync({
    maxAge: LAST_KNOWN_MAX_AGE_MS,
    requiredAccuracy: LAST_KNOWN_REQUIRED_ACCURACY_METRES,
  }).catch(() => null);
}

/** Best-effort location refresh; matching needs a reasonably fresh point. */
export async function refreshLocation(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return false;
    const pos = await getUsablePosition();
    if (!pos) return false;
    const point = roundLocationPoint(pos.coords.latitude, pos.coords.longitude);
    await upsertProfile({
      ...point,
      location_updated_at: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}
