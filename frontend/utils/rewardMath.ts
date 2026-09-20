import { getDistanceInMeters } from './distance';
import { Sport } from '../types/sport';
import { Place } from '../types/place';
import { Visit } from '../types/user';

const POINTS_PER_KM = parseFloat(process.env.EXPO_PUBLIC_POINTS_PER_KM || '50');

export function calculateCombinationReward(
  currentPlace: Place,
  sport: Sport,
  lastVisit: Visit | null,
  isCombinationChecked: boolean
): number {
  // Pokud uživatel nezaškrtl kombinaci, nebo nemá žádnou historii, dostane jen základ
  if (!isCombinationChecked || !lastVisit) {
    return currentPlace.default_reward;
  }

  const lastVisitComb = lastVisit.combination_order !== null ? lastVisit.combination_order : 0;
  
  // Zastropování komba na levelu 4 (jak máš v PHP min($lastVisitComb + 1, 4))
  const combMultLevel = Math.min(lastVisitComb + 1, 4);

  let combMult = 1;
  if (combMultLevel === 1) combMult = sport.comb_mult_1;
  if (combMultLevel === 2) combMult = sport.comb_mult_2;
  if (combMultLevel === 3) combMult = sport.comb_mult_3;
  if (combMultLevel === 4) combMult = sport.comb_mult_4;

  // Souřadnice obou míst
  const [currLng, currLat] = currentPlace.coordinates.coordinates;
  const [lastLng, lastLat] = lastVisit.place.coordinates.coordinates;

  const distanceInMeters = getDistanceInMeters(currLat, currLng, lastLat, lastLng);
  const distanceInKilometers = distanceInMeters / 1000;

  // Odměna = floor((Základ + (Vzdálenost * BodyZaKm)) * Multiplikátor)
  const reward = Math.floor(
    (currentPlace.default_reward + (distanceInKilometers * POINTS_PER_KM)) * combMult
  );

  return reward;
}