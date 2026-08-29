import type { RelationshipContact } from '@/domain/models';

type Place = { keys: string[]; latitude: number; longitude: number };

// Coarse, offline city centres keep contact locations private. No address is sent to a geocoder.
const PLACES: Place[] = [
  { keys: ['brisbane'], latitude: -27.47, longitude: 153.03 },
  { keys: ['gold coast'], latitude: -28.02, longitude: 153.4 },
  { keys: ['sunshine coast'], latitude: -26.65, longitude: 153.07 },
  { keys: ['sydney'], latitude: -33.87, longitude: 151.21 },
  { keys: ['melbourne'], latitude: -37.81, longitude: 144.96 },
  { keys: ['adelaide'], latitude: -34.93, longitude: 138.6 },
  { keys: ['perth'], latitude: -31.95, longitude: 115.86 },
  { keys: ['canberra'], latitude: -35.28, longitude: 149.13 },
  { keys: ['hobart'], latitude: -42.88, longitude: 147.33 },
  { keys: ['darwin'], latitude: -12.46, longitude: 130.84 },
  { keys: ['auckland'], latitude: -36.85, longitude: 174.76 },
  { keys: ['wellington'], latitude: -41.29, longitude: 174.78 },
  { keys: ['london'], latitude: 51.51, longitude: -0.13 },
  { keys: ['paris'], latitude: 48.86, longitude: 2.35 },
  { keys: ['berlin'], latitude: 52.52, longitude: 13.41 },
  { keys: ['amsterdam'], latitude: 52.37, longitude: 4.9 },
  { keys: ['rome'], latitude: 41.9, longitude: 12.5 },
  { keys: ['lisbon'], latitude: 38.72, longitude: -9.14 },
  { keys: ['new york', 'nyc'], latitude: 40.71, longitude: -74.01 },
  { keys: ['los angeles'], latitude: 34.05, longitude: -118.24 },
  { keys: ['san francisco'], latitude: 37.77, longitude: -122.42 },
  { keys: ['seattle'], latitude: 47.61, longitude: -122.33 },
  { keys: ['toronto'], latitude: 43.65, longitude: -79.38 },
  { keys: ['vancouver'], latitude: 49.28, longitude: -123.12 },
  { keys: ['mexico city'], latitude: 19.43, longitude: -99.13 },
  { keys: ['sao paulo', 'são paulo'], latitude: -23.55, longitude: -46.63 },
  { keys: ['cape town'], latitude: -33.92, longitude: 18.42 },
  { keys: ['johannesburg'], latitude: -26.2, longitude: 28.05 },
  { keys: ['dubai'], latitude: 25.2, longitude: 55.27 },
  { keys: ['mumbai'], latitude: 19.08, longitude: 72.88 },
  { keys: ['delhi'], latitude: 28.61, longitude: 77.21 },
  { keys: ['singapore'], latitude: 1.35, longitude: 103.82 },
  { keys: ['hong kong'], latitude: 22.32, longitude: 114.17 },
  { keys: ['tokyo'], latitude: 35.68, longitude: 139.69 },
  { keys: ['seoul'], latitude: 37.57, longitude: 126.98 },
];

export function approximateContactCoordinates(location: string) {
  const normalized = location.trim().toLocaleLowerCase();
  if (!normalized) return null;
  const place = PLACES.find((candidate) => candidate.keys.some((key) => normalized.includes(key)));
  return place ? { latitude: place.latitude, longitude: place.longitude } : null;
}

export function mappableContact(contact: RelationshipContact) {
  if (contact.latitude !== null && contact.longitude !== null) {
    return { contact, latitude: contact.latitude, longitude: contact.longitude };
  }
  const coordinates = approximateContactCoordinates(contact.location);
  return coordinates ? { contact, ...coordinates } : null;
}
