import { Place } from '../types/place';
import { Sport } from '../types/sport';
import { Visit } from '../types/user';
import { calculateReward, predictCombination, CombinationPrediction } from './rewardMath';
import { checkVisitEligibility, VisitEligibility, ALLOWED } from './visitRules';

export type PlaceState = 'open' | 'wait' | 'done';

export interface PlaceAvailability {
  single: VisitEligibility;
  combo: VisitEligibility;
  prediction: CombinationPrediction | null;
  comboValid: boolean;
  state: PlaceState;
  visitable: boolean;
  pinReward: number | null;
  pinIsCombo: boolean;
  waitMinutes: number | null;
  comboReason: string | null;
  reason: string | null;
}

export function formatWait(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function getPlaceAvailability(
  place: Place,
  sport: Sport | null,
  visits: Visit[],
  lastVisit: Visit | null,
  now: number
): PlaceAvailability {
  const single = checkVisitEligibility(place, visits, false, now);
  const combo = lastVisit ? checkVisitEligibility(place, visits, true, now) : ALLOWED;
  const prediction = lastVisit && sport ? predictCombination(place, sport, lastVisit, now) : null;

  const comboValid = !!lastVisit && combo.allowed && !!prediction?.valid;
  const comboSoon = !!lastVisit && combo.allowed && prediction?.kind === 'fast';

  const comboWait = comboSoon ? prediction?.waitMinutes ?? null : null;
  const singleWait = single.kind === 'min_interval' ? single.waitMinutes ?? null : null;

  let state: PlaceState;
  let waitMinutes: number | null = null;
  if (single.kind === 'cooldown') {
    state = 'done';
    waitMinutes = single.waitMinutes ?? null;
  } else if (comboValid) {
    state = 'open';
  } else if (comboSoon) {
    state = 'wait';
    waitMinutes = comboWait;
  } else if (single.allowed) {
    state = 'open';
  } else {
    state = 'wait';
    waitMinutes = singleWait;
  }

  const pinIsCombo = state !== 'done' && (comboValid || comboSoon);
  const pinReward = state === 'done' ? null : calculateReward(place, sport, lastVisit, pinIsCombo);

  const comboReason = !lastVisit
    ? null
    : !combo.allowed
      ? combo.reason
      : comboSoon && comboWait != null
        ? `Kombinace bude možná za ${formatWait(comboWait)}, teď je to na ni moc rychle.`
        : prediction && !prediction.valid
          ? prediction.message
          : null;

  let reason: string | null;
  if (state === 'wait') {
    const parts: string[] = [];
    if (comboWait != null) {
      parts.push(`Kombinace (+${calculateReward(place, sport, lastVisit, true)} b.) bude možná za ${formatWait(comboWait)}.`);
    }
    if (singleWait != null) parts.push(`Samostatná návštěva za ${formatWait(singleWait)}.`);
    reason = parts.join(' ') || null;
  } else {
    reason = single.reason;
  }

  return {
    single,
    combo,
    prediction,
    comboValid,
    state,
    visitable: state === 'open',
    pinReward,
    pinIsCombo,
    waitMinutes,
    comboReason,
    reason,
  };
}
