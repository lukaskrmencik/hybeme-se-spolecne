const CZECH_FORMAT = /^(\d{1,2})\.(\d{1,2})\.(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/;
const SQL_FORMAT = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;

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
