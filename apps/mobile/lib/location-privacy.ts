const LOCATION_DECIMAL_PLACES = 3;
const LOCATION_SCALE = 10 ** LOCATION_DECIMAL_PLACES;

/**
 * Quantize a foreground location before it leaves the device.
 * Three decimal places is roughly a 110 m grid at the equator; Android is
 * additionally configured to grant only coarse location for the Play build.
 */
export function roundLocationCoordinate(coordinate: number): number {
  return Math.round(coordinate * LOCATION_SCALE) / LOCATION_SCALE;
}

export function roundLocationPoint(latitude: number, longitude: number) {
  return {
    lat: roundLocationCoordinate(latitude),
    lng: roundLocationCoordinate(longitude),
  };
}
