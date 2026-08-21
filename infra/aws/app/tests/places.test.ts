import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('@aws-sdk/client-geo-places', () => ({
  GeoPlacesClient: class GeoPlacesClient { send = mocks.send; },
  SearchNearbyCommand: class SearchNearbyCommand { constructor(public input: unknown) {} },
}));

describe('production venue selection', () => {
  beforeEach(() => {
    mocks.send.mockReset();
    delete process.env.ALLOW_VENUE_FALLBACK;
    vi.resetModules();
  });

  it('returns a named real place from current map data', async () => {
    mocks.send.mockResolvedValueOnce({ ResultItems: [{ Title: 'City Café', Position: [76.28, 9.97], Address: { Label: 'Market Road' } }] });
    const { chooseVenue } = await import('../src/places.js');
    await expect(chooseVenue({ lat: 9.96, lng: 76.27 }, { lat: 9.98, lng: 76.29 })).resolves.toMatchObject({
      name: 'City Café',
      address: 'Market Road',
      lat: 9.97,
      lng: 76.28,
    });
  });

  it('prefers a café whose published hours cover the planned meet', async () => {
    const opening = (days: string) => [{ Components: [{ OpenTime: 'T180000', OpenDuration: 'PT4H00M', Recurrence: `FREQ:WEEKLY;BYDAY=${days}` }] }];
    mocks.send.mockResolvedValueOnce({ ResultItems: [
      { Title: 'Closed Café', Position: [76.27, 9.96], TimeZone: { Name: 'Asia/Kolkata' }, OpeningHours: opening('MO') },
      { Title: 'Open Café', Position: [76.28, 9.97], TimeZone: { Name: 'Asia/Kolkata' }, OpeningHours: opening('TU') },
    ] });
    const { chooseVenue } = await import('../src/places.js');
    await expect(chooseVenue(
      { lat: 9.96, lng: 76.27 },
      { lat: 9.98, lng: 76.29 },
      new Date('2026-08-25T13:30:00.000Z'),
    )).resolves.toMatchObject({ name: 'Open Café' });
  });

  it('fails safely instead of inventing a midpoint venue', async () => {
    mocks.send.mockRejectedValue(new Error('provider unavailable'));
    const { chooseVenue, VenueUnavailableError } = await import('../src/places.js');
    await expect(chooseVenue({ lat: 9.96, lng: 76.27 }, { lat: 9.98, lng: 76.29 })).rejects.toBeInstanceOf(VenueUnavailableError);
    expect(mocks.send).toHaveBeenCalledTimes(2);
  });
});
