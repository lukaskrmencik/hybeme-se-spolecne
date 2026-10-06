export interface Sport {
  id: number;
  name: string;
  icon_url: string;
  average_speed: number;
  max_speed: number;
  min_speed: number;
  comb_mult_1: number;
  comb_mult_2: number;
  comb_mult_3: number;
  comb_mult_4: number;
  /** Mapy.com route planning for the navigation button (see utils/navigation). */
  mapy_route_type?: string;
  is_active: boolean;
}