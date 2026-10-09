/**
 * Map of the area around Benátky for use without signal: OpenStreetMap vector tiles that
 * deploy/offline-map.sh builds on the server and the service worker keeps on the phone.
 * The map shows it only when Mapy.com tiles cannot load (their terms forbid storing them).
 */
export const OFFLINE_MAP = {
  url: '/offline-map/area.pmtiles',
  /** [[south, west], [north, east]]: the same 50 × 50 km box as BBOX in the script. */
  bounds: [
    [50.06, 14.47],
    [50.52, 15.19],
  ],
  /** Highest zoom stored in the file, further in the tiles are scaled up. */
  maxDataZoom: 14,
} as const;

export type OfflineMap = typeof OFFLINE_MAP;
