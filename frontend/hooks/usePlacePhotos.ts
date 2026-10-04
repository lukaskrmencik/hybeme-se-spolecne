import { useEffect, useState } from 'react';
import {
  fetchPlacePhotos,
  getCachedPlacePhotos,
  isPlacePhotosFresh,
  onPlacePhotosInvalidated,
} from '../services/placePhotos';
import { PlacePhoto } from '../types/photo';

export function usePlacePhotos(placeId: number | null) {
  const [photos, setPhotos] = useState<PlacePhoto[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(
    () =>
      onPlacePhotosInvalidated((id) => {
        if (id === placeId) setVersion((v) => v + 1);
      }),
    [placeId]
  );

  useEffect(() => {
    if (placeId == null) {
      setPhotos(null);
      return;
    }
    let active = true;
    setPhotos(getCachedPlacePhotos(placeId));
    setFailed(false);
    if (isPlacePhotosFresh(placeId)) return;

    setLoading(true);
    fetchPlacePhotos(placeId)
      .then((list) => {
        if (active) setPhotos(list);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [placeId, version]);

  return { photos, loading, failed };
}
