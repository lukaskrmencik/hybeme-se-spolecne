/**
 * Who runs the app, for the privacy policy and the terms of use.
 * Values in [DOPLNIT …] must be filled in by the school before the launch; the pages show them
 * highlighted so they cannot be missed. Have both texts checked by the school's data protection officer.
 */
export const LEGAL = {
  /** Bump when the texts change in a way users must agree to again (the app then asks everyone). */
  termsVersion: '2026-10-07',
  effectiveFrom: '7. 10. 2026',

  operatorName: 'Základní škola Benátky nad Jizerou',
  operatorAddress: 'Husovo náměstí 55, 294 71 Benátky nad Jizerou',
  operatorId: '[DOPLNIT IČO školy]',
  operatorEmail: '[DOPLNIT kontaktní e-mail školy]',
  /** Every public school must have a data protection officer (pověřenec, čl. 37 GDPR). */
  dpoContact: '[DOPLNIT jméno a e-mail pověřence pro ochranu osobních údajů]',
  partner: 'ŠKOENERGO',
  website: 'https://hybemesespolecne.cz',
} as const;

/** True for a value the school still has to fill in. */
export const isPlaceholder = (value: string) => value.startsWith('[DOPLNIT');
