import { PublicVisit, Visit } from '../types/user';
import { resolveMediaUrl } from '../services/api';
import { formatVisitTime } from './dates';

/** A visit as the journal shows it, the same for the own history and another player's profile. */
export interface JournalVisit {
  id: number;
  placeId: number;
  placeName: string;
  /** [lat, lng] */
  position: [number, number] | null;
  sportName: string;
  reward: number;
  isCombination: boolean;
  /** 0 = start of a chain, 1.. = steps of the chain, null = a visit on its own. */
  order: number | null;
  when: string;
  photos: { id: number; url: string }[];
}

export type JournalEntry =
  | { kind: 'chain'; key: string; visits: JournalVisit[]; total: number }
  | { kind: 'single'; key: string; visit: JournalVisit };

const day = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${d}. ${m}. ${y}`;
};

export function fromOwnVisit(v: Visit): JournalVisit {
  const coords = v.place?.coordinates?.coordinates;
  return {
    id: v.id,
    placeId: v.place_id,
    placeName: v.place?.name ?? `Místo #${v.place_id}`,
    position: coords ? [coords[1], coords[0]] : null,
    sportName: v.sport?.name ?? 'Sport',
    reward: v.reward,
    isCombination: v.is_combination,
    order: v.combination_order,
    when: formatVisitTime(v.timestamp),
    photos: (v.photos ?? []).map((p) => ({ id: p.id, url: resolveMediaUrl(p.photo_url) })),
  };
}

export function fromPublicVisit(v: PublicVisit): JournalVisit {
  const coords = v.place?.coordinates?.coordinates;
  return {
    id: v.id,
    placeId: v.place_id,
    placeName: v.place?.name ?? `Místo #${v.place_id}`,
    position: coords ? [coords[1], coords[0]] : null,
    sportName: v.sport?.name ?? 'Sport',
    reward: v.reward,
    isCombination: v.is_combination,
    order: v.combination_order,
    when: day(v.date),
    photos: v.photos.map((p) => ({ id: p.id, url: resolveMediaUrl(p.photo_url) })),
  };
}

/**
 * Groups visits (newest first) into combination chains and visits on their own, newest first.
 * A chain starts with order 0 and goes on with the combination visits after it; its visits are oldest first.
 */
export function groupJournal(visits: JournalVisit[]): JournalEntry[] {
  const entries: JournalEntry[] = [];
  let chain: JournalVisit[] | null = null;
  const closeChain = () => {
    if (chain && chain.length > 1) {
      entries.push({ kind: 'chain', key: `c${chain[0].id}`, visits: chain, total: chain.reduce((s, v) => s + v.reward, 0) });
    } else if (chain) {
      entries.push({ kind: 'single', key: `s${chain[0].id}`, visit: chain[0] });
    }
    chain = null;
  };

  for (const visit of [...visits].reverse()) {
    if (visit.isCombination && chain) {
      chain.push(visit);
    } else {
      closeChain();
      // A combination whose start is not in the list (e.g. hidden) still begins a chain of its own.
      if (visit.order === 0 || visit.isCombination) chain = [visit];
      else entries.push({ kind: 'single', key: `s${visit.id}`, visit });
    }
  }
  closeChain();
  return entries.reverse();
}
