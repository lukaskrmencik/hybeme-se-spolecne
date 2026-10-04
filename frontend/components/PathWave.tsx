import Svg, { Path } from 'react-native-svg';

/** The green path from the logo, used once under the login title. */
export function PathWave() {
  return (
    <Svg viewBox="0 0 320 34" width="100%" height={30} style={{ marginTop: 6 }}>
      <Path
        d="M4 22 C 60 4, 110 32, 160 18 S 260 4, 316 14"
        stroke="#8BB53C"
        strokeOpacity={0.35}
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}
