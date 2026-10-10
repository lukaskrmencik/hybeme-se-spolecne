import { Platform } from 'react-native';

/** Whoever opens the developer tools is most likely a pupil looking for a way to cheat. */
const DEVELOPER_EMAIL = 'krmencik.lukas@gmail.com';

const NOTE = `Ahoj, koukáš pod kapotu? To je super, přesně tak začínají programátoři.

Na rovinu: aplikace pracuje s polohou z tvého telefonu a té nikdy nejde věřit na 100 %. S trochou znalostí se tu podvádět dá, to nebudu zapírat. Jenže je to porušení podmínek používání a hlavně tím kazíš hru spolužákům, kteří ta místa opravdu obešli. A výhra podvodem není žádná výhra.

Mám pro tebe lepší výzvu: zahraj si na etického hackera. Zkus přijít na to, jak by se v aplikaci dalo podvádět nebo co se dá rozbít. Čím chytřejší a rafinovanější způsob, tím líp. Jen ho nepoužívej naostro, ale pošli mi ho na ${DEVELOPER_EMAIL}. Nejlepší nápady opravím a ty budeš vědět, že jsi aplikaci pomohl/a vylepšit.

Hodně štěstí! Lukáš, vývojář aplikace`;

/** Prints the note once in the browser console. */
export function printConsoleNote(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  console.log('%cStop, hackere! ✋', 'color:#2e9e4f;font-size:28px;font-weight:900;');
  console.log(`%c${NOTE}`, 'font-size:14px;line-height:1.5;');
}
