export interface VisitPhoto {
  id: number;
  visit_id: number;
  photo_url: string;
  created_at?: string;
}

export interface PlacePhoto {
  id: number;
  visitId?: number;
  url: string;
  author: string | null;
  takenAt: string | null;
  official?: boolean;
}
