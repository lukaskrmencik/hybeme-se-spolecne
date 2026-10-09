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
        <title>Hýbeme se společně</title>
        <meta name="description" content="Objevuj Benátecko, navštěvuj zajímavá místa, sbírej body a poměř síly s ostatními." />

        {/* Preview when the link is shared (Messenger, WhatsApp, Facebook…). */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Hýbeme se společně" />
        <meta property="og:title" content="Hýbeme se společně" />
        <meta property="og:description" content="Objevuj Benátecko, navštěvuj zajímavá místa, sbírej body a poměř síly s ostatními." />
        <meta property="og:image" content="https://hybemesespolecne.cz/icons/icon-512.png" />
        <meta property="og:url" content="https://hybemesespolecne.cz/" />
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
