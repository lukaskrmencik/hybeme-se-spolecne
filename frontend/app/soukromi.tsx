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
    title: 'Správce osobních údajů',
    blocks: [
      `Správcem osobních údajů je ${LEGAL.operatorName}, se sídlem ${LEGAL.operatorAddress}, IČO: ${LEGAL.operatorId} (dále jen „správce“). Kontaktní e-mail: ${LEGAL.operatorEmail}.`,
      `Pověřenec pro ochranu osobních údajů: ${LEGAL.dpoContact}.`,
      `Aplikace „Hýbeme se společně“ dostupná na adrese ${LEGAL.website} (dále jen „aplikace“) vznikla s finanční podporou společnosti ${LEGAL.partner}. Tato společnost nemá k osobním údajům uživatelů přístup.`,
    ],
  },
  {
    title: 'Rozsah a účely zpracování',
    blocks: [
      'Správce zpracovává tyto kategorie osobních údajů:',
      {
        list: [
          'Údaje o uživatelském účtu: jméno nebo přezdívka, e-mailová adresa, heslo a datum registrace, za účelem vedení účtu a přihlašování. Heslo je uloženo výhradně v podobě kryptografického otisku, ze kterého je nelze zpětně zjistit.',
          'Údaje z účtu Google: v případě přihlášení prostřednictvím služby Google identifikátor účtu, jméno, e-mailová adresa a profilová fotografie, za účelem přihlášení.',
          'Údaje o návštěvách: navštívené místo, datum a čas návštěvy, zvolený sport a přidělené body, za účelem výpočtu bodů a sestavení žebříčků.',
          'Poloha zařízení: údaje o poloze (GPS) zpracovává aplikace výhradně v zařízení uživatele, a to za účelem ověření přítomnosti u místa a zobrazení polohy na mapě. Údaje o poloze nejsou předávány na server správce ani jím ukládány.',
          'Fotografie: fotografie pořízené uživatelem k návštěvám a profilová fotografie, za účelem jejich zobrazení ostatním uživatelům. Každá fotografie je před uložením automaticky posouzena programem provozovaným na serveru správce z hlediska nevhodného obsahu. Fotografie nejsou předávány třetím osobám.',
          'Nahlášení obsahu: nahlášený obsah, datum a čas nahlášení a poznámka oznamovatele, za účelem moderování obsahu. Totožnost oznamovatele není nahlášenému uživateli sdělena.',
          'Provozní záznamy: IP adresa a čas požadavků na server, za účelem zajištění bezpečnosti a řešení technických poruch.',
          'Data ukládaná v zařízení: aplikace ukládá v zařízení uživatele přihlašovací údaje relace, seznam míst a dosud neodeslané návštěvy, aby byla funkční i bez připojení k internetu. Aplikace nepoužívá reklamní ani sledovací cookies ani analytické nástroje.',
        ],
      },
    ],
  },
  {
    title: 'Právní základ zpracování',
    blocks: [
      'Osobní údaje uvedené v čl. 2, s výjimkou provozních záznamů, zpracovává správce na základě souhlasu subjektu údajů podle čl. 6 odst. 1 písm. a) nařízení Evropského parlamentu a Rady (EU) 2016/679, obecného nařízení o ochraně osobních údajů (dále jen „GDPR“), uděleného při registraci.',
      'Je-li uživateli méně než 15 let, je zpracování zákonné pouze tehdy, byl-li souhlas udělen nebo schválen jeho zákonným zástupcem (čl. 8 GDPR ve spojení s § 7 zákona č. 110/2019 Sb., o zpracování osobních údajů). Uživatel tuto skutečnost potvrzuje při registraci.',
      'Souhlas lze kdykoli odvolat, zejména zrušením účtu. Odvoláním souhlasu není dotčena zákonnost zpracování před jeho odvoláním.',
      'Provozní záznamy zpracovává správce na základě oprávněného zájmu na zajištění bezpečného provozu aplikace podle čl. 6 odst. 1 písm. f) GDPR.',
    ],
  },
  {
    title: 'Příjemci osobních údajů',
    blocks: [
      {
        list: [
          'Ostatní uživatelé a veřejnost: jméno, profilová fotografie a body uživatele jsou zobrazeny v žebříčcích, a to i na veřejně přístupné úvodní stránce aplikace. U fotografií přidaných k místům je zobrazeno jméno jejich autora.',
          'Pověření pracovníci správce, kteří aplikaci spravují, v rozsahu nezbytném pro její správu.',
          'Hetzner Online GmbH, Německo, jako zpracovatel zajišťující provoz serverů v Evropské unii.',
          'Sendinblue SAS (Brevo), Francie, jako zpracovatel zajišťující odesílání e-mailů, v rozsahu e-mailové adresy uživatele.',
          'Seznam.cz, a.s., poskytovatel mapových podkladů Mapy.com, který při načítání mapy získává IP adresu zařízení. Po zvolení funkce „Navigovat“ je uživatel přesměrován do služby Mapy.com.',
          'Google LLC, pouze v případě přihlášení prostřednictvím služby Google. Google zpracovává údaje podle vlastních zásad a může je předávat mimo Evropskou unii.',
        ],
      },
      'Osobní údaje nejsou prodávány, využívány k marketingovým účelům ani předávány dalším osobám.',
    ],
  },
  {
    title: 'Doba uložení',
    blocks: [
      'Osobní údaje jsou uchovávány po dobu existence uživatelského účtu. Po zrušení účtu (v aplikaci Účet → Smazat účet) jsou účet, návštěvy, body a fotografie neprodleně vymazány. Ze záložních kopií jsou odstraněny nejpozději do 14 dnů.',
      'Provozní záznamy jsou vymazány nejpozději po 14 dnech.',
    ],
  },
  {
    title: 'Automatizované rozhodování',
    blocks: [
      'Nedochází k automatizovanému rozhodování s právními či obdobně závažnými účinky ani k profilování ve smyslu čl. 22 GDPR. Automatická kontrola fotografií a věrohodnosti návštěv slouží pouze k dodržování pravidel aplikace a o nahlášeném obsahu rozhoduje člověk.',
    ],
  },
  {
    title: 'Práva subjektu údajů',
    blocks: [
      'Uživatel má právo:',
      {
        list: [
          'na přístup ke svým osobním údajům a na jejich kopii (čl. 15 GDPR),',
          'na opravu nepřesných údajů (čl. 16 GDPR); jméno lze změnit přímo v aplikaci,',
          'na výmaz (čl. 17 GDPR), zejména zrušením účtu v aplikaci,',
          'na omezení zpracování (čl. 18 GDPR),',
          'na přenositelnost údajů (čl. 20 GDPR),',
          'vznést námitku proti zpracování na základě oprávněného zájmu (čl. 21 GDPR),',
          'kdykoli odvolat souhlas se zpracováním (čl. 7 odst. 3 GDPR),',
          'podat stížnost u Úřadu pro ochranu osobních údajů, Pplk. Sochora 27, 170 00 Praha 7, www.uoou.gov.cz (čl. 77 GDPR).',
        ],
      },
      `Práva lze uplatnit u správce na adrese ${LEGAL.operatorEmail} nebo u pověřence pro ochranu osobních údajů (${LEGAL.dpoContact}). Za uživatele mladšího 15 let uplatňuje práva jeho zákonný zástupce.`,
    ],
  },
  {
    title: 'Zabezpečení osobních údajů',
    blocks: [
      'Správce přijal přiměřená technická a organizační opatření k ochraně osobních údajů, zejména šifrovaný přenos dat (HTTPS), ukládání hesel výhradně v podobě otisku, umístění serverů v Evropské unii a omezení přístupu do administrace na pověřené osoby.',
    ],
  },
  {
    title: 'Změny zásad',
    blocks: [
      'Správce je oprávněn tyto zásady měnit. O podstatné změně bude uživatel informován v aplikaci a bude požádán o udělení souhlasu s novým zněním.',
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
