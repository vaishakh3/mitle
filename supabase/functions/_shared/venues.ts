// Venue selection via Google Places API (New). Falls back to a mock venue
// when no API key is configured (local development).

export interface Venue {
  name: string;
  address: string;
  lat: number;
  lng: number;
  mapsUrl: string;
}

interface PlacesResult {
  places?: Array<{
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    rating?: number;
    googleMapsUri?: string;
  }>;
}

export function mockVenue(lat: number, lng: number): Venue {
  return {
    name: 'The Serendipity Cafe (mock)',
    address: 'Somewhere lovely between you two',
    lat,
    lng,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  };
}

/**
 * Picks a cafe near the midpoint of the two users. Prefers well-rated places,
 * widens the search radius once before giving up and using the mock.
 */
export async function pickVenue(
  lat: number,
  lng: number,
  apiKey: string | undefined,
  fetchFn: typeof fetch = fetch,
): Promise<Venue> {
  if (!apiKey) return mockVenue(lat, lng);

  for (const radius of [2000, 5000]) {
    try {
      const res = await fetchFn('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'places.displayName,places.formattedAddress,places.location,places.rating,places.googleMapsUri',
        },
        body: JSON.stringify({
          includedTypes: ['cafe'],
          maxResultCount: 10,
          rankPreference: 'POPULARITY',
          locationRestriction: {
            circle: { center: { latitude: lat, longitude: lng }, radius },
          },
        }),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as PlacesResult;
      const places = (data.places ?? []).filter(
        (p) => p.location?.latitude != null && p.displayName?.text,
      );
      if (places.length === 0) continue;
      // prefer the best-rated; ties broken by API's popularity ordering
      const best = [...places].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
      return {
        name: best.displayName!.text!,
        address: best.formattedAddress ?? '',
        lat: best.location!.latitude!,
        lng: best.location!.longitude!,
        mapsUrl:
          best.googleMapsUri ??
          `https://www.google.com/maps/search/?api=1&query=${best.location!.latitude},${best.location!.longitude}`,
      };
    } catch (_err) {
      // fall through to wider radius / mock
    }
  }
  return mockVenue(lat, lng);
}
