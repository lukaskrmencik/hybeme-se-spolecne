// react-dom comes with react-native-web for the web build; only createPortal is used (admin tooltips).
declare module 'react-dom' {
  import type { ReactNode, ReactPortal } from 'react';
  export function createPortal(children: ReactNode, container: Element | DocumentFragment): ReactPortal;
}
