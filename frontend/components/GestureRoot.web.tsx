import { View } from 'react-native';

/**
 * The web needs no gesture root, and react-native-gesture-handler with Reanimated is about a megabyte of
 * JavaScript that every page, the landing page included, would download first.
 */
export const GestureRoot = View;
