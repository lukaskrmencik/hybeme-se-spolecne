/** Czech plural: plural(1, ['návštěva', 'návštěvy', 'návštěv']) */
export function plural(count: number, forms: [one: string, few: string, many: string]): string {
  const n = Math.abs(count);
  if (n === 1) return forms[0];
  if (n >= 2 && n <= 4) return forms[1];
  return forms[2];
}
