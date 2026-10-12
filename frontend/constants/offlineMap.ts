export const OFFLINE_MAP = {
  url: '/offline-map/area.pmtiles',
  bounds: [
    [50.06, 14.47],
    [50.52, 15.19],
  ],
  maxDataZoom: 14,
} as const;

export type OfflineMap = typeof OFFLINE_MAP;
