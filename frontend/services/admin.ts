import { apiFetch, ApiError, resolveMediaUrl } from './api';
import { appendFile } from './upload';
import { Place, PlacesApiResponse } from '../types/place';
import { LocalPhoto } from '../types/visit';
import { Sport } from '../types/sport';

/** Paged list as the backend returns it (response()->pagination). */
export interface Page<T> {
  page: number;
  totalPages: number;
  totalItems: number;
  items: T[];
}

interface PaginationResponse<T> {
  data: { page: number; per_page: number; total_pages: number; total_items: number; items: T[] };
}

const toPage = <T,>(res: PaginationResponse<T>, map: (item: T) => T = (i) => i): Page<T> => ({
  page: res.data.page,
  totalPages: res.data.total_pages,
  totalItems: res.data.total_items,
  items: res.data.items.map(map),
});

function query(params: Record<string, string | number | null | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * Turns a 422 from Laravel into a sentence for a non-technical admin.
 * `labels` names the fields as the form shows them.
 */
export function describeValidationError(err: unknown, labels: Record<string, string>, fallback: string): string {
  if (!(err instanceof ApiError)) return err instanceof Error ? err.message : fallback;
  if (!err.errors) return err.error_message || fallback;
  const lines = Object.entries(err.errors).map(([field, messages]) => {
    const label = labels[field] ?? field;
    const message = messages[0] ?? '';
    if (/unik|unique|already/i.test(message)) return `${label}: tahle hodnota už existuje, zvol jinou.`;
    return `${label}: ${message}`;
  });
  return lines.join('\n') || fallback;
}

// ---- Places -------------------------------------------------------------

/** Active and inactive places, all pages. */
export async function fetchAllPlaces(): Promise<Place[]> {
  const all: Place[] = [];
  for (let page = 1; page <= 50; page++) {
    const res = await apiFetch<PlacesApiResponse>(`places${query({ per_page: 100, page, only_active: 0 })}`);
    all.push(...(res.data.items ?? []));
    if (page >= res.data.total_pages) break;
  }
  return all.sort((a, b) => a.name.localeCompare(b.name, 'cs'));
}

export interface NewPlace {
  name: string;
  defaultReward: number;
  lat: number;
  lng: number;
}

/** Returns the id of the new place. */
export async function createPlace(place: NewPlace): Promise<number> {
  const res = await apiFetch<{ data: { id: number } }>('places', {
    method: 'POST',
    body: JSON.stringify({
      name: place.name,
      default_reward: place.defaultReward,
      // GeoJSON order is [longitude, latitude].
      coordinates: { type: 'Point', coordinates: [place.lng, place.lat] },
    }),
  });
  return res.data.id;
}

export async function setPlaceActive(id: number, active: boolean): Promise<void> {
  await apiFetch(`places/${id}`, { method: 'PATCH', body: JSON.stringify({ is_active: active }) });
}

export interface PlaceAdminPhoto {
  id: number;
  photo_url: string;
}

/** Photos of the place added in the administration (visitors' photos are under Fotografie). */
export async function fetchPlaceAdminPhotos(placeId: number): Promise<PlaceAdminPhoto[]> {
  const res = await apiFetch<{ data: { admin_photos?: PlaceAdminPhoto[] } }>(`places/${placeId}`);
  return (res.data.admin_photos ?? []).map((p) => ({ ...p, photo_url: resolveMediaUrl(p.photo_url) }));
}

export async function uploadPlaceAdminPhoto(placeId: number, photo: LocalPhoto): Promise<PlaceAdminPhoto> {
  const form = new FormData();
  await appendFile(form, 'photo', { uri: photo.uri, name: `place-${Date.now()}.jpg`, type: 'image/jpeg' });
  const res = await apiFetch<{ data: PlaceAdminPhoto }>(`places/${placeId}/photos`, { method: 'POST', body: form, timeoutMs: 60_000 });
  return { ...res.data, photo_url: resolveMediaUrl(res.data.photo_url) };
}

export async function deletePlaceAdminPhoto(photoId: number): Promise<void> {
  await apiFetch(`places/photos/${photoId}`, { method: 'DELETE' });
}

// ---- Sports -------------------------------------------------------------

export async function fetchAllSports(): Promise<Sport[]> {
  const res = await apiFetch<{ data: Sport[] }>('sports?only_active=0');
  return [...(res.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'cs'));
}

export interface NewSport {
  name: string;
  min_speed: number;
  average_speed: number;
  max_speed: number;
  comb_mult_1: number;
  comb_mult_2: number;
  comb_mult_3: number;
  comb_mult_4: number;
  mapy_route_type: string;
}

export async function createSport(sport: NewSport): Promise<void> {
  await apiFetch('sports', { method: 'POST', body: JSON.stringify(sport) });
}

/** How the navigation to a place plans the route for this sport. Does not affect points or history. */
export async function setSportRouteType(id: number, routeType: string): Promise<void> {
  await apiFetch(`sports/${id}`, { method: 'PATCH', body: JSON.stringify({ mapy_route_type: routeType }) });
}

export async function setSportActive(id: number, active: boolean): Promise<void> {
  await apiFetch(`sports/${id}`, { method: 'PATCH', body: JSON.stringify({ is_active: active }) });
}

// ---- Photos -------------------------------------------------------------

export interface AdminPhoto {
  id: number;
  photo_url: string;
  created_at: string;
  visit: {
    id: number;
    user_id: number;
    place_id: number;
    timestamp: string;
    user: { id: number; name: string; email: string } | null;
    place: { id: number; name: string } | null;
  } | null;
}

export interface PhotoFilters {
  /** Author name or e-mail. */
  search?: string;
  /** Part of the place name. */
  place?: string;
  /** Y-m-d */
  from?: string | null;
}

export async function fetchPhotos(page: number, filters: PhotoFilters, perPage = 24): Promise<Page<AdminPhoto>> {
  const res = await apiFetch<PaginationResponse<AdminPhoto>>(
    `photos${query({ page, per_page: perPage, search: filters.search?.trim(), place: filters.place?.trim(), from: filters.from })}`
  );
  return toPage(res, (p) => ({ ...p, photo_url: resolveMediaUrl(p.photo_url) }));
}

export async function deletePhoto(id: number): Promise<void> {
  await apiFetch(`visits/photo/${id}`, { method: 'DELETE' });
}

// ---- Users --------------------------------------------------------------

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  provider_name: string | null;
  avatar_url: string | null;
  created_at: string;
  email_verified_at: string | null;
  visits_count: number;
  total_points: number | null;
}

export interface UserFilters {
  search?: string;
  role?: 'user' | 'admin' | null;
}

export async function fetchUsers(page: number, filters: UserFilters, perPage = 25): Promise<Page<AdminUser>> {
  const res = await apiFetch<PaginationResponse<AdminUser>>(
    `users${query({ page, per_page: perPage, search: filters.search?.trim(), role: filters.role })}`
  );
  return toPage(res, (u) => ({ ...u, avatar_url: u.avatar_url ? resolveMediaUrl(u.avatar_url) : null }));
}

/** The user gets (or loses) the administration; their own role cannot be changed. */
export async function setUserRole(id: number, role: 'user' | 'admin'): Promise<void> {
  await apiFetch(`users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
}

export async function deleteUser(id: number): Promise<void> {
  await apiFetch(`users/${id}`, { method: 'DELETE' });
}
