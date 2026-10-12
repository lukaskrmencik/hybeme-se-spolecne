import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="cs">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}

        {/* Preview when the link is shared (Messenger, WhatsApp, Facebook…); the public pages add their own
            description, title and image through components/Seo. */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Hýbeme se společně" />
        <meta property="og:locale" content="cs_CZ" />

        {/* Installable app (PWA): manifest, icons and the look when started from the home screen. */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#FFFFFF" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Hýbeme se společně" />
        {isProduction && <script dangerouslySetInnerHTML={{ __html: registerServiceWorker }} />}

        {/* The weights the first screen of the landing page uses, so its text does not wait for them. */}
        {PRELOADED_FONTS.map((name) => (
          <link key={name} rel="preload" href={`/fonts/nunito-${name}.woff2`} as="font" type="font/woff2" crossOrigin="" />
        ))}
        <style dangerouslySetInnerHTML={{ __html: webFont }} />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

// Only the production build: in development a service worker would keep serving old bundles.
const isProduction = process.env.NODE_ENV === 'production';

const registerServiceWorker = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
    // Downloads the offline map in the background (once, then only when it changes).
    navigator.serviceWorker.ready.then(function (registration) {
      if (registration.active) registration.active.postMessage('sync-offline-map');
    });
  });
}`;

const PRELOADED_FONTS = ['regular', 'extrabold', 'black'];

/**
 * Nunito on the web: one family with real weights, in the HTML itself, so prerendered pages show it before any
 * JavaScript runs. The files in public/fonts are cut down to Latin with Czech letters and WOFF2 (17 kB instead
 * of 125 kB each; native uses the full TTFs from assets/fonts).
 * react-native-web gives every text `font: 14px System`, which beats a font-family set on body, so the family is
 * forced on every element except icons (those carry an inline font-family and keep it). `:is(#root, body)` also
 * reaches dialogs (Modal), which are rendered outside #root, and keeps the id's weight that beats react-native-web's classes.
 */
// public/fonts/ionicons-landing.woff2 holds only the icons of components/landing/LandingIcon.tsx, cut from
// node_modules/@expo/vector-icons/.../Fonts/Ionicons.ttf with the npm package subset-font (target woff2).
const FONT_FILES: [number, string][] = [
  [400, 'regular'],
  [500, 'semibold'],
  [600, 'semibold'],
  [700, 'bold'],
  [800, 'extrabold'],
  [900, 'black'],
];
const webFont = `${FONT_FILES.map(
  ([weight, name]) =>
    `@font-face { font-family: 'Nunito'; font-style: normal; font-weight: ${weight}; font-display: swap; src: url('/fonts/nunito-${name}.woff2') format('woff2'); }`
).join('\n')}
:is(#root, body) :is(div, span, h1, h2, h3, input, textarea, button) { font-family: Nunito, sans-serif; }
@font-face { font-family: 'ionicons-landing'; font-display: block; src: url('/fonts/ionicons-landing.woff2') format('woff2'); }
:is(#root, body) [data-landing-icon] { font-family: 'ionicons-landing' !important; }
#root *:focus, #root *:focus-visible { outline: none !important; -webkit-tap-highlight-color: transparent; }
#root input, #root textarea { box-shadow: none !important; }`;

const responsiveBackground = `
body {
  background-color: #F5F7F2;
  font-family: Nunito, sans-serif;
}
input, textarea, button {
  font-family: inherit;
}
*:focus, *:focus-visible, input:focus, textarea:focus {
  outline: none !important;
  -webkit-tap-highlight-color: transparent;
}
input, textarea {
  box-shadow: none !important;
  -webkit-appearance: none;
  appearance: none;
  background-color: transparent;
}
input:-webkit-autofill, input:-webkit-autofill:focus, textarea:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 100px #F5F7F2 inset !important;
  -webkit-text-fill-color: #133F63 !important;
  caret-color: #133F63;
}`;
