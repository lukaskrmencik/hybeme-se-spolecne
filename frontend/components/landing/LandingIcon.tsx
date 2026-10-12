import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform } from 'react-native';

const GLYPHS = {
  'arrow-forward': 0xf133,
  'logo-google-playstore': 0xf3f6,
  'download-outline': 0xf2ba,
  'chevron-up': 0xf241,
  'chevron-down': 0xf232,
} as const;

export type LandingIconName = keyof typeof GLYPHS;

export function LandingIcon({ name, size, color }: { name: LandingIconName; size: number; color: string }) {
  if (Platform.OS !== 'web') return <Ionicons name={name} size={size} color={color} />;
  return (
    <span
      aria-hidden
      data-landing-icon=""
      style={{ fontFamily: 'ionicons-landing', fontSize: size, lineHeight: `${size}px`, color, fontWeight: 400, fontStyle: 'normal' }}
    >
      {String.fromCodePoint(GLYPHS[name])}
    </span>
  );
}
