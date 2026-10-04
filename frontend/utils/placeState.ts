import { Place } from '../types/place';
import { Sport } from '../types/sport';
import { Visit } from '../types/user';
import { calculateReward, predictCombination, CombinationPrediction } from './rewardMath';
import { checkVisitEligibility, VisitEligibility, ALLOWED } from './visitRules';

/**
 * What a pin says, in three colours:
 * open – points can be collected right now (green)
 * wait – points are coming, only time is missing (white with a clock): the 5 min pause between
 *        visits, or the combination would be faster than the sport allows yet
 * done – the place already scored within the cooldown (grey tick)
 * Whether the points are a combination is a separate thing, shown by the link icon.
 */
export type PlaceState = 'open' | 'wait' | 'done';

export interface PlaceAvailability {
  single: VisitEligibility;
  combo: VisitEligibility;
  prediction: CombinationPrediction | null;
  /** The combination is allowed by the rules right now. */
  comboValid: boolean;
  state: PlaceState;
  /** Can be visited right now, as a single visit or a combination. */
  visitable: boolean;
  /** Points shown on the pin: the combination reward whenever a combination is possible now or later on. */
  pinReward: number | null;
  /** The pin reward is a combination reward. */
  pinIsCombo: boolean;
  waitMinutes: number | null;
  /** Why the combination switch cannot be turned on. */
  comboReason: string | null;
  /** Why the place cannot be visited. */
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
  // Only "too fast" fixes itself with time. Too slow or another sport never turns into a combination.
  const comboSoon = !!lastVisit && combo.allowed && prediction?.kind === 'fast';

  const comboWait = comboSoon ? prediction?.waitMinutes ?? null : null;
  const singleWait = single.kind === 'min_interval' ? single.waitMinutes ?? null : null;

  // The cooldown blocks the combination too, so a place that already scored is simply done.
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

  // Someone on the way needs to see what the combination will pay, even before it is possible.
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
