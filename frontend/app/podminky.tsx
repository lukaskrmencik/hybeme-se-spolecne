import { LegalPage, LegalSection } from '../components/legal/LegalPage';
import { LEGAL } from '../constants/legal';

const SUMMARY = [
  'Aplikace je zdarma a používání je dobrovolné.',
  'Mladším 15 let musí registraci povolit rodič nebo jiný zákonný zástupce.',
  'Bezpečnost je víc než body: dodržuj pravidla silničního provozu a na kole nekoukej do telefonu.',
  'Hraj fér: žádné auto, falešná poloha ani víc účtů.',
  'Přidávej jen slušné fotky a jméno. Nevhodný obsah smažeme.',
];

const SECTIONS: LegalSection[] = [
  {
    title: 'Úvod',
    blocks: [
      `Aplikaci „Hýbeme se společně“ (${LEGAL.website}) provozuje ${LEGAL.operatorName}, ${LEGAL.operatorAddress}, IČO: ${LEGAL.operatorId} (dále „škola“), s podporou hlavního partnera ${LEGAL.partner}.`,
      'Aplikace má motivovat k pohybu: za návštěvy zajímavých míst pěšky, během nebo na kole se sbírají body. Je zdarma a její používání je dobrovolné.',
      'Registrací souhlasíš s těmito podmínkami. Jak zacházíme s osobními údaji, popisují Zásady ochrany osobních údajů.',
    ],
  },
  {
    title: 'Kdo může aplikaci používat',
    blocks: [
      {
        list: [
          'Aplikaci může používat každý. Pokud ti ještě nebylo 15 let, potřebuješ k registraci souhlas rodiče nebo jiného zákonného zástupce.',
          'Rodiče a zákonní zástupci odpovídají za to, jak jejich dítě aplikaci používá, a za dohled nad ním na cestách.',
          'Každý může mít jen jeden účet a nesmí ho půjčovat ostatním. Při registraci uveď e-mail, ke kterému máš přístup.',
        ],
      },
    ],
  },
  {
    title: 'Bezpečnost na cestě',
    blocks: [
      {
        list: [
          'Dodržuj pravidla silničního provozu. Na kole nos přilbu a telefon nepoužívej za jízdy, zastav.',
          'Trasu a tempo přizpůsob svým silám, počasí a denní době. Body nikam neutečou.',
          'Nevstupuj na soukromé pozemky, do uzavřených nebo nebezpečných míst. Místa v aplikaci jsou veřejně přístupná.',
          'Mladší děti by měly chodit nebo jezdit s dospělým.',
        ],
      },
      'Aplikaci používáš na vlastní odpovědnost. Škola neodpovídá za úrazy ani škody vzniklé cestou k místům; za dodržování pravidel odpovídá každý sám, u dětí jejich rodiče.',
    ],
  },
  {
    title: 'Body a fér hra',
    blocks: [
      'Body se počítají podle pravidel popsaných v aplikaci (návštěvy, kombinace, žebříčky). Pravidla se mohou upravit, aby hra zůstala spravedlivá.',
      {
        list: [
          'Je zakázáno podvádět: jezdit autem či jiným dopravním prostředkem tam, kde se počítá chůze, běh nebo kolo, falšovat polohu, používat více účtů nebo cizí účet.',
          'Aplikace automaticky kontroluje, jestli přesun mezi místy odpovídá zvolenému sportu. Podezřelou kombinaci může započítat jen jako běžnou návštěvu nebo návštěvu odmítnout.',
          'Body nemají peněžní hodnotu a nelze je směnit. Případné soutěže o ceny se řídí samostatnými pravidly.',
        ],
      },
    ],
  },
  {
    title: 'Fotky, jména a chování',
    blocks: [
      {
        list: [
          'Přidávej jen fotky, které jsi pořídil(a) sám/sama, a jméno, které není vulgární ani urážlivé a nevydává se za někoho jiného.',
          'Zakázané jsou fotky urážlivé, vulgární, násilné, sexuální nebo nenávistné a fotky jiných lidí bez jejich souhlasu. Nezveřejňuj ani osobní údaje druhých (adresy, telefonní čísla apod.).',
          'Přidáním fotky souhlasíš, že ji aplikace zobrazí ostatním uživatelům u daného místa, a to dokud ji nesmažeš ty nebo správce.',
          'Nevhodný obsah může kdokoli nahlásit. Fotky navíc automaticky kontroluje program; kontrola se může splést, proto o nahlášeném obsahu rozhoduje správce.',
        ],
      },
    ],
  },
  {
    title: 'Porušení pravidel',
    blocks: [
      'Při porušení těchto podmínek může správce odstranit fotku nebo profilovou fotku, změnit nevhodné jméno, odebrat body nebo zrušit účet, u závažného porušení i bez předchozího upozornění.',
    ],
  },
  {
    title: 'Provoz aplikace',
    blocks: [
      'Škola se snaží, aby aplikace fungovala spolehlivě, ale nezaručuje nepřetržitý provoz. Může měnit místa, sporty a pravidla bodování nebo provoz aplikace ukončit.',
    ],
  },
  {
    title: 'Zrušení účtu',
    blocks: ['Účet můžeš kdykoli zrušit v aplikaci (Účet → Smazat účet). Smažou se tím i tvoje návštěvy, body a fotky.'],
  },
  {
    title: 'Změny podmínek a kontakt',
    blocks: [
      'Když podmínky podstatně změníme, aplikace tě při dalším otevření požádá o souhlas s novým zněním.',
      `S dotazy a připomínkami se obracej na školu: ${LEGAL.operatorEmail}.`,
    ],
  },
];

export default function TermsScreen() {
  return (
    <LegalPage
      title="Podmínky používání"
      summary={SUMMARY}
      sections={SECTIONS}
      other={{ href: '/soukromi', label: 'Zásady ochrany osobních údajů' }}
    />
  );
}
