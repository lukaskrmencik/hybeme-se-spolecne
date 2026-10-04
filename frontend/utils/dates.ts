const CZECH_FORMAT = /^(\d{1,2})\.(\d{1,2})\.(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/;
const SQL_FORMAT = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Backend serializes visit timestamps as "d.m.Y H:i" in UTC without a zone suffix.
 * The custom formats must be matched before Date.parse, because V8 reads
 * "01.10.2026" as January 10th and treats zone-less SQL dates as local time.
 */
export function parseVisitTime(value: string): number {
  if (typeof value !== 'string' || value.length === 0) return NaN;
  const trimmed = value.trim();

  const czech = CZECH_FORMAT.exec(trimmed);
  if (czech) {
    const [, d, m, y, h, min, s] = czech;
    return Date.UTC(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), s ? Number(s) : 0);
  }

  const sql = SQL_FORMAT.exec(trimmed);
  if (sql) {
    const [, y, m, d, h, min, s] = sql;
    return Date.UTC(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), s ? Number(s) : 0);
  }

  // Laravel sends Carbon objects as "…T10:00:00.000000Z". Hermes is stricter than V8 about
  // the six fraction digits, so cut them down to milliseconds.
  return Date.parse(trimmed.replace(/(\.\d{3})\d+/, '$1'));
}

export function formatVisitTime(value: string): string {
  const ms = parseVisitTime(value);
  if (isNaN(ms)) return value;
  return new Date(ms).toLocaleString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function sortNewestFirst<T extends { timestamp: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => parseVisitTime(b.timestamp) - parseVisitTime(a.timestamp));
}
