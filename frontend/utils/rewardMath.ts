import { getDistanceInMeters } from './distance';
import { parseVisitTime } from './dates';
import { config } from '../constants/config';
import { Sport } from '../types/sport';
import { Place } from '../types/place';
import { Visit } from '../types/user';

export interface CombinationPrediction {
  valid: boolean;
  speed: number;
  message: string;
  /** Why the combination is not possible. `fast` is temporary, it passes with time. */
  kind: 'ok' | 'no_last' | 'sport' | 'time' | 'fast' | 'slow';
  /** For `fast`: minutes until the speed to the place drops under the sport limit. */
  waitMinutes: number | null;
}

const distanceBetween = (a: Place, b: Place): number => {
  const [aLng, aLat] = a.coordinates.coordinates;
  const [bLng, bLat] = b.coordinates.coordinates;
  return getDistanceInMeters(aLat, aLng, bLat, bLng);
};

export function getCombinationLevel(lastVisit: Visit | null): number {
  if (!lastVisit) return 0;
  return Math.min((lastVisit.combination_order ?? 0) + 1, 4);
}

export function getCombinationMultiplier(sport: Sport, level: number): number {
  if (level >= 4) return Number(sport.comb_mult_4);
  if (level === 3) return Number(sport.comb_mult_3);
  if (level === 2) return Number(sport.comb_mult_2);
  if (level === 1) return Number(sport.comb_mult_1);
  return 1;
}

/** Same formula as calc_combination_reward() on the backend. */
export function calculateReward(place: Place, sport: Sport | null, lastVisit: Visit | null, isCombination: boolean): number {
  const base = Number(place.default_reward) || 0;
  if (!isCombination || !lastVisit?.place || !sport) return base;

  const multiplier = getCombinationMultiplier(sport, getCombinationLevel(lastVisit));
  const km = distanceBetween(place, lastVisit.place) / 1000;
  const reward = Math.floor((base + km * config.pointsPerKm) * multiplier);
  // A NaN would travel to the map as null and show a dash instead of points.
  return Number.isFinite(reward) ? reward : base;
}

/** Predicts whether AntiCheatService would accept the visit as a combination. */
export function predictCombination(place: Place, sport: Sport, lastVisit: Visit | null, nowMs: number): CombinationPrediction {
  if (!lastVisit?.place) {
    return { valid: false, speed: 0, kind: 'no_last', waitMinutes: null, message: 'Není předchozí návštěva.' };
  }

  if (lastVisit.sport_id != null && sport.id !== lastVisit.sport_id) {
    return {
      valid: false,
      speed: 0,
      kind: 'sport',
      waitMinutes: null,
      message: `Kombinace vyžaduje stejný sport jako předchozí návštěva (${lastVisit.sport?.name ?? 'jiný sport'}).`,
    };
  }

  const elapsedHours = (nowMs - parseVisitTime(lastVisit.timestamp)) / 3_600_000;
  if (!(elapsedHours > 0)) {
    return { valid: false, speed: 0, kind: 'time', waitMinutes: null, message: 'Čas návštěvy musí být po předchozí návštěvě.' };
  }

  const km = (distanceBetween(place, lastVisit.place) * config.routingCoefficient) / 1000;
  const speed = km / elapsedHours;
  const minSpeed = Number(sport.min_speed);
  const maxSpeed = Number(sport.max_speed);

  if (speed < minSpeed) {
    return {
      valid: false,
      speed,
      kind: 'slow',
      waitMinutes: null,
      message: `Příliš nízká rychlost (${speed.toFixed(1)} km/h, minimum ${minSpeed} km/h).`,
    };
  }
  if (speed > maxSpeed) {
    return {
      valid: false,
      speed,
      kind: 'fast',
      waitMinutes: maxSpeed > 0 ? Math.max(1, Math.ceil((km / maxSpeed - elapsedHours) * 60)) : null,
      message: `Na kombinaci je to teď moc rychle (${speed.toFixed(1)} km/h, maximum ${maxSpeed} km/h).`,
    };
  }
  return { valid: true, speed, kind: 'ok', waitMinutes: null, message: '' };
}
