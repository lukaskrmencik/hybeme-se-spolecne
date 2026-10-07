import { LegalPage, LegalSection } from '../components/legal/LegalPage';
import { LEGAL } from '../constants/legal';

// Keep in sync with what the app really does. Checked in the code (October 2026): the GPS position never
// leaves the phone, a visit sends only the place, sport and time; photos are moderated on our own server.

const SUMMARY = [
  'Ukládáme jen to, co aplikace potřebuje: účet, návštěvy, body a fotky, které přidáš.',
  'Tvoje GPS poloha zůstává v telefonu. Na server posíláme jen to, které místo jsi navštívil(a) a kdy.',
  'Jméno, profilová fotka a body jsou vidět v žebříčku, i na webu. Klidně používej přezdívku.',
  'Mladším 15 let musí registraci povolit rodič nebo jiný zákonný zástupce.',
  'Údaje neprodáváme a nepoužíváme k reklamě. Účet i se všemi údaji můžeš kdykoli smazat.',
];

const SECTIONS: LegalSection[] = [
  {
    title: 'Kdo tvoje údaje zpracovává',
    blocks: [
      `Správcem osobních údajů je ${LEGAL.operatorName}, ${LEGAL.operatorAddress}, IČO: ${LEGAL.operatorId} (dále „škola“). Kontakt: ${LEGAL.operatorEmail}.`,
      `Pověřenec pro ochranu osobních údajů: ${LEGAL.dpoContact}.`,
      `Aplikace „Hýbeme se společně“ (${LEGAL.website}) vznikla s podporou hlavního partnera ${LEGAL.partner}. Partner k osobním údajům uživatelů přístup nemá.`,
    ],
  },
  {
    title: 'Jaké údaje zpracováváme a proč',
    blocks: [
      {
        list: [
          'Účet: jméno (nebo přezdívka), e-mail, heslo a datum registrace. Heslo ukládáme jen jako zašifrovaný otisk, takže ho nikdo nezná, ani správci. Účet potřebuješ, aby se ti body počítaly.',
          'Přihlášení přes Google: pokud ho použiješ, dostaneme od Googlu identifikátor účtu, jméno, e-mail a profilovou fotku.',
          'Návštěvy: které místo, kdy, jakým sportem a kolik bodů za něj. Z toho počítáme body, kombinace a žebříček.',
          'Poloha: aplikace používá GPS telefonu jen v telefonu, aby ověřila, že jsi u místa, a ukázala tě na mapě. Polohu na server neposíláme ani neukládáme.',
          'Fotky: fotky, které přidáš k návštěvě, a profilová fotka. Každou fotku před uložením automaticky zkontroluje program na našem serveru, jestli neobsahuje nevhodný obsah. Fotky nikam dál neposíláme.',
          'Nahlášení: pokud nahlásíš nevhodnou fotku nebo jméno, uložíme, co jsi nahlásil(a), kdy a s jakou poznámkou. Vidí to jen správci a nahlášený uživatel se nedozví, od koho nahlášení přišlo.',
          'Technické záznamy: server si krátce pamatuje IP adresu a čas požadavků, abychom mohli řešit poruchy a útoky.',
          'V telefonu: aplikace si ukládá přihlášení, seznam míst a ještě neodeslané návštěvy, aby fungovala i bez signálu. Nepoužíváme reklamní ani sledovací cookies a žádné analytické nástroje.',
        ],
      },
    ],
  },
  {
    title: 'Na jakém základě údaje zpracováváme',
    blocks: [
      'Údaje o účtu, návštěvách, bodech a fotkách zpracováváme na základě tvého souhlasu (čl. 6 odst. 1 písm. a) obecného nařízení o ochraně osobních údajů, GDPR), který dáváš při registraci.',
      'Pokud ti ještě nebylo 15 let, musí souhlas dát rodič nebo jiný zákonný zástupce (čl. 8 GDPR a § 7 zákona č. 110/2019 Sb., o zpracování osobních údajů). Při registraci to potvrzuješ zaškrtnutím.',
      'Souhlas můžeš kdykoli odvolat smazáním účtu. Technické záznamy serveru zpracováváme z oprávněného zájmu na bezpečném provozu aplikace (čl. 6 odst. 1 písm. f) GDPR).',
    ],
  },
  {
    title: 'Kdo další může údaje vidět',
    blocks: [
      {
        list: [
          'Ostatní uživatelé a návštěvníci webu: v žebříčku (i na veřejné úvodní stránce) vidí tvoje jméno, profilovou fotku a body. U fotek, které přidáš k místu, vidí i tvoje jméno.',
          'Správci aplikace z řad školy: vidí údaje potřebné ke správě, například seznam účtů a nahlášený obsah.',
          'Hetzner Online GmbH (Německo): na jejích serverech v EU aplikace běží.',
          'Brevo (Sendinblue SAS, Francie): odesílá e-maily, například ověřovací kód při registraci. Vidí tvůj e-mail.',
          'Seznam.cz, a.s. (Mapy.com): z jejích serverů telefon stahuje mapu, takže vidí tvou IP adresu. Když klepneš na Navigovat, otevře se Mapy.com s trasou k místu.',
          'Google: jen pokud se přihlásíš přes Google. Google údaje zpracovává podle svých zásad a může je zpracovávat i mimo EU.',
        ],
      },
      'Tvoje údaje nikomu neprodáváme, nepoužíváme je k reklamě a nepředáváme je dalším firmám.',
    ],
  },
  {
    title: 'Jak dlouho údaje uchováváme',
    blocks: [
      'Údaje uchováváme, dokud máš účet. Když účet smažeš (Účet → Smazat účet), okamžitě smažeme účet, návštěvy, body i fotky. Ze záloh zmizí nejpozději do 14 dnů.',
      'Technické záznamy serveru mažeme nejpozději po 14 dnech.',
    ],
  },
  {
    title: 'Tvoje práva',
    blocks: [
      {
        list: [
          'vědět, jaké údaje o tobě máme, a dostat jejich kopii,',
          'nechat opravit nepřesné údaje (jméno si změníš přímo v Účtu),',
          'nechat údaje smazat (smazáním účtu v aplikaci),',
          'požádat o omezení zpracování nebo vznést námitku,',
          'odvolat souhlas,',
          'podat stížnost u Úřadu pro ochranu osobních údajů (Pplk. Sochora 27, 170 00 Praha 7, www.uoou.gov.cz).',
        ],
      },
      `S čímkoli se obrať na školu (${LEGAL.operatorEmail}) nebo na pověřence (${LEGAL.dpoContact}). Za dítě mladší 15 let jedná rodič nebo jiný zákonný zástupce.`,
    ],
  },
  {
    title: 'Jak údaje chráníme',
    blocks: [
      'Spojení s aplikací je šifrované (HTTPS), hesla ukládáme jen jako otisk, server je v EU a do administrace mají přístup jen pověření správci.',
    ],
  },
  {
    title: 'Změny zásad',
    blocks: [
      'Když zásady podstatně změníme, aplikace tě při dalším otevření požádá, abys nové znění odsouhlasil(a).',
    ],
  },
];

export default function PrivacyScreen() {
  return (
    <LegalPage
      title="Zásady ochrany osobních údajů"
      summary={SUMMARY}
      sections={SECTIONS}
      other={{ href: '/podminky', label: 'Podmínky používání aplikace' }}
    />
  );
}
