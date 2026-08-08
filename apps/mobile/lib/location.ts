import * as Location from 'expo-location';
import { upsertProfile } from './api';

/** Best-effort location refresh; matching needs a reasonably fresh point. */
export async function refreshLocation(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return false;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await upsertProfile({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      location_updated_at: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}
