import { Linking } from 'react-native';

/** Route planning of Mapy.com, set per sport in the administration. */
export type MapyRouteType = 'foot_fast' | 'foot_hiking' | 'bike_road' | 'bike_mountain';

export const ROUTE_TYPES: { value: MapyRouteType; label: string; short: string }[] = [
  { value: 'foot_fast', label: 'Pěšky – nejkratší cesta', short: 'pěšky' },
  { value: 'foot_hiking', label: 'Pěšky – po turistických trasách', short: 'pěšky po turistických trasách' },
  { value: 'bike_road', label: 'Na kole – silniční', short: 'na kole' },
  { value: 'bike_mountain', label: 'Na kole – horské', short: 'na horském kole' },
];

export const routeTypeLabel = (type: string | null | undefined, short = false): string => {
  const found = ROUTE_TYPES.find((t) => t.value === type) ?? ROUTE_TYPES[0];
  return short ? found.short : found.label;
};

interface Point {
  lat: number;
  lng: number;
}

/**
 * Route link of Mapy.com (https://developer.mapy.com/further-uses-of-mapycz/mapy-cz-url/).
 * On a phone it opens the Mapy.com app when installed (navigation starts right away in versions from
 * April 2024), otherwise the website. Coordinates go as "lon,lat".
 */
export function mapyRouteUrl(destination: Point, from: Point | null, routeType: string | null | undefined): string {
  const type = ROUTE_TYPES.some((t) => t.value === routeType) ? routeType : 'foot_fast';
  const coords = (p: Point) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`;
  const params = [
    'mapset=outdoor',
    ...(from ? [`start=${coords(from)}`] : []),
    `end=${coords(destination)}`,
    `routeType=${type}`,
    'navigate=true',
  ];
  return `https://mapy.com/fnc/v1/route?${params.join('&')}`;
}

export function openNavigation(destination: Point, from: Point | null, routeType: string | null | undefined): void {
  void Linking.openURL(mapyRouteUrl(destination, from, routeType));
}
