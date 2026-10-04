import { apiFetch, resolveMediaUrl } from './api';
import { PlacePhoto, VisitPhoto } from '../types/photo';

interface PlaceDetail {
  photos?: VisitPhoto[];
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

/** Newest first. The author is known for photos of the latest visits of the place. */
export async function fetchPlacePhotos(placeId: number): Promise<PlacePhoto[]> {
  const res = await apiFetch<{ data: PlaceDetail }>(`places/${placeId}`);
  const visits = new Map((res.data.latest_visits ?? []).map((v) => [v.id, v]));
  const photos = [...(res.data.photos ?? [])]
    .sort((a, b) => b.id - a.id)
    .map((p) => {
      const visit = visits.get(p.visit_id);
      return {
        id: p.id,
        url: resolveMediaUrl(p.photo_url),
        author: visit?.user?.name ?? null,
        takenAt: visit?.timestamp ?? p.created_at ?? null,
      };
    });
  cache.set(placeId, { at: Date.now(), photos });
  return photos;
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
