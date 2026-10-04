import React from 'react';
import { Asset } from 'expo-asset';
import { Platform, StyleSheet, Text, TextInput } from 'react-native';

const FAMILIES: Record<string, string> = {
  '400': 'Nunito-Regular',
  normal: 'Nunito-Regular',
  '500': 'Nunito-SemiBold',
  '600': 'Nunito-SemiBold',
  '700': 'Nunito-Bold',
  bold: 'Nunito-Bold',
  '800': 'Nunito-ExtraBold',
  '900': 'Nunito-Black',
};

function fontFor(style: unknown): string {
  const flat = (StyleSheet.flatten(style) ?? {}) as { fontFamily?: string; fontWeight?: string | number };
  const current = flat.fontFamily;
  if (typeof current === 'string' && current.startsWith('Nunito')) return current;
  return FAMILIES[String(flat.fontWeight ?? '400')] ?? 'Nunito-Regular';
}

/** Routes every Text and TextInput through Nunito, picking the file by fontWeight. */
function patch(Component: { render?: (...args: unknown[]) => React.ReactElement }) {
  const original = Component.render;
  if (!original || (original as { patched?: boolean }).patched) return;

  const render = function (this: unknown, ...args: unknown[]) {
    const element = original.apply(this, args);
    if (!React.isValidElement(element)) return element;
    const props = element.props as { style?: unknown };
    return React.cloneElement(element, {
      style: [props.style, { fontFamily: fontFor(props.style), fontWeight: '400' }],
    } as never);
  };
  (render as { patched?: boolean }).patched = true;
  Component.render = render;
}

// react-native-web rejects the style rewrite (CSSStyleDeclaration). On web the font
// comes from the stylesheet in +html.tsx; native needs an explicit family per text node.
if (Platform.OS !== 'web') {
  patch(Text as never);
  patch(TextInput as never);
}

const files = {
  regular: require('../assets/fonts/Nunito-Regular.ttf'),
  semiBold: require('../assets/fonts/Nunito-SemiBold.ttf'),
  bold: require('../assets/fonts/Nunito-Bold.ttf'),
  extraBold: require('../assets/fonts/Nunito-ExtraBold.ttf'),
  black: require('../assets/fonts/Nunito-Black.ttf'),
};

export const nunitoFonts = {
  'Nunito-Regular': files.regular,
  'Nunito-SemiBold': files.semiBold,
  'Nunito-Bold': files.bold,
  'Nunito-ExtraBold': files.extraBold,
  'Nunito-Black': files.black,
};

/**
 * react-native-web gives every Text and TextInput `font: 14px System`, which beats a font-family
 * set on body, so the app silently rendered in the system font. Register one "Nunito" family
 * with the real weights from the bundled files and force it on every element except icons
 * (those carry an inline font-family and keep it).
 */
function installWebFont() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('nunito-web-font')) return;

  const faces: [number, unknown][] = [
    [400, files.regular],
    [500, files.semiBold],
    [600, files.semiBold],
    [700, files.bold],
    [800, files.extraBold],
    [900, files.black],
  ];
  const fontFaces = faces
    .map(
      ([weight, file]) =>
        `@font-face { font-family: 'Nunito'; font-style: normal; font-weight: ${weight}; font-display: block; src: url('${
          Asset.fromModule(file as number).uri
        }') format('truetype'); }`
    )
    .join('\n');

  const style = document.createElement('style');
  style.id = 'nunito-web-font';
  style.textContent = `${fontFaces}
#root div, #root span, #root input, #root textarea, #root button { font-family: Nunito, sans-serif; }
#root *:focus, #root *:focus-visible { outline: none !important; -webkit-tap-highlight-color: transparent; }
#root input, #root textarea { box-shadow: none !important; }`;
  document.head.appendChild(style);
}

installWebFont();
