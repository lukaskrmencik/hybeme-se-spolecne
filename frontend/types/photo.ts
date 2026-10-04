export interface VisitPhoto {
  id: number;
  visit_id: number;
  photo_url: string;
  created_at?: string;
}

/** Photo shown in the gallery of a place. */
export interface PlacePhoto {
  id: number;
  url: string;
  author: string | null;
  takenAt: string | null;
}
