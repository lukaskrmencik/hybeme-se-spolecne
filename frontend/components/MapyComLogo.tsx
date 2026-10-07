import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

/** Mapy.com app symbol (assets/images/logos/mapy-com-symbol-aplikace-rgb-1.svg), drawn inline so it stays sharp. */
export function MapyComLogo({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 249.45 249.45" accessibilityLabel="Mapy.com">
      <Defs>
        {/* The original rotates the circle by -45° and its gradient by +45°, which together make it vertical. */}
        <LinearGradient id="mapyComGradient" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#34d313" />
          <Stop offset="1" stopColor="#1eae00" />
        </LinearGradient>
      </Defs>
      <Circle cx="124.72" cy="124.72" r="124.72" fill="url(#mapyComGradient)" />
      <Path
        fill="#fff"
        d="M181.96,84.4c3.65,10.6.95,22.33-1.08,70.33-.38,8.85.64,22.66-10.07,21.63-1.16-.11-3.41-1.25-4.63-2.99-1.85-2.62-2.72-5.83-3.69-13.21-1.46-11.06-.11-42.9-.24-45.63-.05-.98.1-2.04-.37-2.73-.14-.21-.6-.91-1.74.23-5.95,6.47-22.65,21.62-28.42,25.72-9.45,6.71-11.9-2.79-14.61-8-3.44-6.63-10.69-22.62-12.31-23.87-1.23-.95-1.33.4-1.57,1.21-.59,1.99-3.69,23.19-7.04,34.76-3.6,12.42-9.87,29.55-16.1,37.72-3.79,4.97-19.6,8.86-22.91,9.01-.27.06-1.28.15-.97-.97,1.43-5.12,12.12-27.87,14.98-38.21,4.64-12.14,11.72-40.15,12.62-58.92.76-12.36-.34-23.9-.49-27.25,0-4.48,4.6-6.93,7.19-7.46,2.97-.6,9.47-1.79,16.11,5.55,3.92,4.33,9.96,18.7,11.62,22.27,2.08,4.46,10.39,23.27,13.07,29.83,4.91-4.39,11.37-11.13,17.96-18.23,7.07-7.63,16.18-20.05,19.82-23.98,1.51-2.17,9.67,3.9,12.87,13.21"
      />
    </Svg>
  );
}
