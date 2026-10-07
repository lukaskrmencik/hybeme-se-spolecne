export const colors = {
  /** Tmavší zelená z loga. Tlačítka a zelený text, bílý popisek na ní čte. */
  primary: '#52831A',
  primaryDark: '#3E6412',
  primaryLight: '#E4F0C8',
  primaryBg: '#F1F7E6',
  /** Světlá zelená přímo z loga. Akcenty, špendlíky, aktivní záložka. */
  accent: '#8BB53C',
  accentBg: '#F1F7E6',
  accentText: '#3E6412',
  /** Tmavě modrá z loga. Text, navigace, přihlašovací tlačítko. */
  navy: '#133F63',
  navyBg: '#EAF0F6',
  onNavy: '#D7E3C4',
  /** Světle modrá z loga. Kombinace. */
  sky: '#7AB6E3',
  skyBg: '#EAF4FB',
  skyText: '#2B6A99',
  background: '#F5F7F2',
  surface: '#ffffff',
  border: '#E2E7DC',
  text: '#133F63',
  muted: '#5F7385',
  inactive: '#9AA9B5',
  warn: '#B7791F',
  warnBg: '#FDF4E3',
  warnText: '#8A5A12',
  warnBorder: '#F3D7A1',
  danger: '#C2412D',
  dangerBg: '#FBEDEA',
  dangerText: '#9F2E1C',
  dangerBorder: '#F3C7C0',
  white: '#ffffff',
  /** Official Mapy.com green, only for the navigation button. */
  mapyCom: '#1EAE00',
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  full: 999,
};

export const shadows = {
  card: { boxShadow: '0px 4px 14px rgba(19, 63, 99, 0.08)' },
  button: { boxShadow: '0px 4px 10px rgba(19, 63, 99, 0.16)' },
  /** Search box and locate button floating over the map. */
  float: { boxShadow: '0px 2px 10px rgba(19, 63, 99, 0.12)' },
};

export const typography = {
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: colors.muted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
};
