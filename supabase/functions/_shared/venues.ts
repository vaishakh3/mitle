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
    priceLevel?: string;
    businessStatus?: string;
  }>;
}

const PRICE_NUMBER: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

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
  targetBudget = 2,
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
            'places.displayName,places.formattedAddress,places.location,places.rating,places.googleMapsUri,places.priceLevel,places.businessStatus',
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
        (p) => p.location?.latitude != null
          && p.displayName?.text
          && p.businessStatus !== 'CLOSED_PERMANENTLY',
      );
      if (places.length === 0) continue;
      // Quality leads, but avoid surprising someone with a venue far outside
      // the private budget they selected during onboarding.
      const venueScore = (place: (typeof places)[number]) => {
        const rating = (place.rating ?? 3.8) / 5;
        const price = place.priceLevel ? PRICE_NUMBER[place.priceLevel] : undefined;
        const budgetFit = price == null
          ? 0.6
          : 1 - Math.min(Math.abs(price - targetBudget), 3) / 3;
        return rating * 0.72 + budgetFit * 0.28;
      };
      const best = [...places].sort((a, b) => venueScore(b) - venueScore(a))[0];
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
