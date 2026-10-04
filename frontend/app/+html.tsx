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
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

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
