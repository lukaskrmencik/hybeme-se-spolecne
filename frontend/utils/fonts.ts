import React from 'react';
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

// The web gets Nunito from the stylesheet in app/+html.tsx (smaller WOFF2 files, there before any JavaScript).
export const nunitoFonts: Record<string, number> =
  Platform.OS === 'web'
    ? {}
    : {
        'Nunito-Regular': files.regular,
        'Nunito-SemiBold': files.semiBold,
        'Nunito-Bold': files.bold,
        'Nunito-ExtraBold': files.extraBold,
        'Nunito-Black': files.black,
      };
