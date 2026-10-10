import { apiFetch, resolveMediaUrl } from './api';
import { PlacePhoto, VisitPhoto } from '../types/photo';

interface PlaceDetail {
  photos?: VisitPhoto[];
  admin_photos?: { id: number; photo_url: string; created_at?: string }[];
  latest_visits?: { id: number; timestamp: string; user?: { name: string } | null }[];
}

const MAX_AGE_MS = 2 * 60 * 1000;
const cache = new Map<number, { at: number; photos: PlacePhoto[] }>();
const listeners = new Set<(placeId: number) => void>();

export function getCachedPlacePhotos(placeId: number): PlacePhoto[] | null {
  return cache.get(placeId)?.photos ?? null;
}

export function isPlacePhotosFresh(placeId: number): boolean {
  const hit = cache.get(placeId);
  return !!hit && Date.now() - hit.at < MAX_AGE_MS;
}

/** The admin's photos first, then visitors' photos newest first. The author is known for the latest visits. */
export async function fetchPlacePhotos(placeId: number): Promise<PlacePhoto[]> {
  const res = await apiFetch<{ data: PlaceDetail }>(`places/${placeId}`);
  const visits = new Map((res.data.latest_visits ?? []).map((v) => [v.id, v]));
  const photos = [...(res.data.photos ?? [])]
    .sort((a, b) => b.id - a.id)
    .map((p) => {
      const visit = visits.get(p.visit_id);
      return {
        id: p.id,
        visitId: p.visit_id,
        url: resolveMediaUrl(p.photo_url),
        author: visit?.user?.name ?? null,
        takenAt: visit?.timestamp ?? p.created_at ?? null,
      };
    });
  // Ids of the two tables can collide, so the admin's ones get a negative id in the gallery.
  const official = (res.data.admin_photos ?? []).map((p) => ({
    id: -p.id,
    url: resolveMediaUrl(p.photo_url),
    author: null,
    takenAt: null,
    official: true,
  }));
  const all = [...official, ...photos];
  cache.set(placeId, { at: Date.now(), photos: all });
  return all;
}

/** Called after new photos of the place were uploaded, so an open gallery reloads. */
export function invalidatePlacePhotos(placeId: number): void {
  cache.delete(placeId);
  listeners.forEach((fn) => fn(placeId));
}

export function onPlacePhotosInvalidated(fn: (placeId: number) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
