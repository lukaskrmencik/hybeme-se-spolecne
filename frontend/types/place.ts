export interface PlaceCoordinates {
  type: 'Point';
  coordinates: [number, number];
}

export interface Place {
  id: number;
  name: string;
  coordinates: PlaceCoordinates;
  image_url: string | null;
  default_reward: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlacesApiResponse {
  status: string;
  status_code: number;
  data: {
    page: number;
    per_page: number;
    total_pages: number;
    total_items: number;
    items: Place[];
  };
}