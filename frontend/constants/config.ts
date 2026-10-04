const num = (value: string | undefined, fallback: number): number => {
  const parsed = value != null ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  apiUrlWeb: process.env.EXPO_PUBLIC_API_URL_WEB || 'http://localhost/api/',
  apiUrlMobile: process.env.EXPO_PUBLIC_API_URL_MOBILE || 'http://192.168.0.86/api/',
  apiUrlProd: process.env.EXPO_PUBLIC_API_URL_PROD || 'https://hybemesespolecne.cz/api/',
  defaultLat: num(process.env.EXPO_PUBLIC_DEFAULT_LAT, 50.293056),
  defaultLng: num(process.env.EXPO_PUBLIC_DEFAULT_LNG, 14.829167),
  visitRadiusMeters: num(process.env.EXPO_PUBLIC_VISIT_RADIUS_METERS, 50),
  pointsPerKm: num(process.env.EXPO_PUBLIC_POINTS_PER_KM, 10),
  routingCoefficient: num(process.env.EXPO_PUBLIC_ROUTING_COEFFICIENT, 1.23),
  placeCooldownHours: num(process.env.EXPO_PUBLIC_PLACE_COOLDOWN_HOURS, 72),
  minVisitIntervalMinutes: num(process.env.EXPO_PUBLIC_MIN_VISIT_INTERVAL_MINUTES, 5),
  /** Web OAuth client id. Android asks for ID tokens issued to it too, so the backend checks one audience. */
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  /** Mapy.com tiles; without a key the map falls back to OpenStreetMap. */
  mapyApiKey: process.env.EXPO_PUBLIC_MAPY_API_KEY || '',
  mapyMapset: process.env.EXPO_PUBLIC_MAPY_MAPSET || 'outdoor',
} as const;
