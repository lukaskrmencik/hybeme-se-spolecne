import { Visit } from '../types/user';
import { Place } from '../types/place';
import { config } from '../constants/config';
import { parseVisitTime } from './dates';

export interface VisitEligibility {
  allowed: boolean;
  reason: string | null;
  kind: 'combination_repeat' | 'cooldown' | 'min_interval' | null;
  /** Minutes until the block lifts, when it is temporary. */
  waitMinutes?: number;
}

export const ALLOWED: VisitEligibility = { allowed: true, reason: null, kind: null };

/**
 * Mirrors User::visitsCombinations() on the backend: walks visits oldest-first and assigns
 * combination_order (0 = start of a chain, 1.. = combination steps, null = standalone visit).
 * Returns visits sorted newest-first.
 */
export function withCombinationOrders(visits: Visit[]): Visit[] {
  const ascending = [...visits].sort((a, b) => parseVisitTime(a.timestamp) - parseVisitTime(b.timestamp));
  let order: number | null = null;

  const result = ascending.map((visit, i) => {
    const next = ascending[i + 1];
    let combination_order: number | null;
    if (visit.is_combination) {
      combination_order = order;
      order = (order ?? 0) + 1;
    } else if (next?.is_combination) {
      combination_order = 0;
      order = 1;
    } else {
      combination_order = null;
      order = null;
    }
    return { ...visit, combination_order };
  });

  return result.reverse();
}

/**
 * `visits` must be sorted newest-first (see withCombinationOrders). Rules mirror AntiCheatService:
 * 1. A place scores once per cooldown (72 h), as a single visit or as a combination.
 * 2. A combination cannot return to a place already in the current chain.
 * 3. Single visits need a pause after the previous visit; a combination is checked by speed instead.
 */
export function checkVisitEligibility(
  place: Place,
  visits: Visit[],
  isCombination: boolean,
  now: number
): VisitEligibility {
  if (visits.length === 0) return ALLOWED;

  const lastAtPlace = visits.find((v) => v.place_id === place.id);
  if (lastAtPlace) {
    const hoursDiff = Math.max(0, (now - parseVisitTime(lastAtPlace.timestamp)) / 3_600_000);
    if (hoursDiff < config.placeCooldownHours) {
      const hoursLeft = Math.max(1, Math.ceil(config.placeCooldownHours - hoursDiff));
      return {
        allowed: false,
        kind: 'cooldown',
        waitMinutes: hoursLeft * 60,
        reason: `Tady už body máš. Znovu za ${formatHours(hoursLeft)}.`,
      };
    }
  }

  if (isCombination) {
    for (const v of visits) {
      if (v.place_id === place.id) {
        return {
          allowed: false,
          kind: 'combination_repeat',
          reason: 'Toto místo už je součástí aktuální kombinace.',
        };
      }
      if (!v.is_combination) break;
    }
    return ALLOWED;
  }

  const minutesDiff = Math.max(0, (now - parseVisitTime(visits[0].timestamp)) / 60_000);
  if (minutesDiff < config.minVisitIntervalMinutes) {
    const minutesLeft = Math.max(1, Math.ceil(config.minVisitIntervalMinutes - minutesDiff));
    return {
      allowed: false,
      kind: 'min_interval',
      waitMinutes: minutesLeft,
      reason: `Mezi návštěvami musí být alespoň ${config.minVisitIntervalMinutes} minut. Zbývá ${minutesLeft} min.`,
    };
  }

  return ALLOWED;
}

function formatHours(hours: number): string {
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  const d = `${days} ${days === 1 ? 'den' : days < 5 ? 'dny' : 'dní'}`;
  return rest ? `${d} ${rest} h` : d;
}
