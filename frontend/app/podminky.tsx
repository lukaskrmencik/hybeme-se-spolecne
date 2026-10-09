import { LegalPage, LegalSection } from '../components/legal/LegalPage';
import { LEGAL } from '../constants/legal';
import { Seo } from '../components/Seo';

const SUMMARY = [
  'Aplikace je zdarma a používání je dobrovolné.',
  'Mladším 15 let musí registraci povolit rodič nebo jiný zákonný zástupce.',
  'Bezpečnost je víc než body: dodržuj pravidla silničního provozu a na kole nekoukej do telefonu.',
  'Hraj fér: žádné auto, falešná poloha ani víc účtů.',
  'Přidávej jen slušné fotky a jméno. Nevhodný obsah smažeme.',
];

const SECTIONS: LegalSection[] = [
  {
    title: 'Úvodní ustanovení',
    blocks: [
      `Tyto podmínky používání (dále jen „podmínky“) upravují používání aplikace „Hýbeme se společně“ dostupné na adrese ${LEGAL.website} (dále jen „aplikace“), jejímž provozovatelem je ${LEGAL.operatorName}, se sídlem ${LEGAL.operatorAddress}, IČO: ${LEGAL.operatorId} (dále jen „provozovatel“). Aplikace vznikla s finanční podporou společnosti ${LEGAL.partner}.`,
      'Účelem aplikace je podpora pohybových aktivit: uživatelé získávají body za návštěvy vybraných míst pěšky, během nebo na kole. Používání aplikace je bezplatné a dobrovolné.',
      'Registrací uživatel potvrzuje, že se s podmínkami seznámil a souhlasí s nimi. Zpracování osobních údajů upravují Zásady ochrany osobních údajů.',
    ],
  },
  {
    title: 'Uživatelé',
    blocks: [
      {
        list: [
          'Aplikaci může používat každá fyzická osoba. Uživatel mladší 15 let se smí registrovat pouze se souhlasem svého zákonného zástupce.',
          'Zákonný zástupce nezletilého uživatele odpovídá za používání aplikace nezletilým a za dohled nad ním při přesunech mezi místy.',
          'Každý uživatel smí mít pouze jeden účet a nesmí jej přenechat jiné osobě. Uživatel je povinen uvést e-mailovou adresu, ke které má přístup, a chránit své přihlašovací údaje.',
        ],
      },
    ],
  },
  {
    title: 'Bezpečnost',
    blocks: [
      'Uživatel je povinen zejména:',
      {
        list: [
          'dodržovat pravidla silničního provozu, při jízdě na kole používat ochrannou přilbu a nepoužívat telefon za jízdy,',
          'přizpůsobit trasu a tempo svým schopnostem, počasí a denní době,',
          'nevstupovat na soukromé pozemky ani do uzavřených či nebezpečných prostor.',
        ],
      },
      'Provozovatel doporučuje, aby mladší děti navštěvovaly místa v doprovodu dospělé osoby.',
      'Provozovatel neodpovídá za újmu vzniklou porušením pravidel silničního provozu nebo těchto podmínek ani za stav míst a cest k nim, které nespravuje. Za dodržování pravidel odpovídá uživatel, u nezletilého uživatele jeho zákonný zástupce.',
    ],
  },
  {
    title: 'Body a pravidla hry',
    blocks: [
      'Body se přidělují podle pravidel uvedených v aplikaci (návštěvy, kombinace, žebříčky). Provozovatel je oprávněn pravidla upravit, zejména za účelem zachování spravedlnosti hry.',
      {
        list: [
          'Zakázáno je zejména přesouvat se dopravním prostředkem v případech, kdy se body udělují za chůzi, běh nebo jízdu na kole, falšovat polohu zařízení a používat více účtů nebo účet jiné osoby.',
          'Aplikace automaticky ověřuje, zda přesun mezi místy odpovídá zvolenému sportu. Nevěrohodnou kombinaci může započítat pouze jako běžnou návštěvu nebo návštěvu nezapočítat.',
          'Body nemají peněžní hodnotu a nejsou směnitelné. Případné soutěže o ceny se řídí samostatnými pravidly.',
        ],
      },
    ],
  },
  {
    title: 'Obsah vkládaný uživateli',
    blocks: [
      {
        list: [
          'Uživatel smí vkládat pouze fotografie, které sám pořídil, a jméno, které není vulgární, urážlivé ani zavádějící a nevydává se za jinou osobu.',
          'Zakázáno je vkládat obsah urážlivý, vulgární, násilný, sexuální či nenávistný, fotografie jiných osob bez jejich souhlasu a osobní údaje třetích osob.',
          'Vložením fotografie uděluje uživatel provozovateli bezúplatnou nevýhradní licenci k jejímu zobrazování ostatním uživatelům v aplikaci, a to do doby, než fotografii odstraní uživatel nebo provozovatel.',
          'Nevhodný obsah může nahlásit kterýkoli uživatel. Fotografie jsou dále kontrolovány automaticky; o nahlášeném obsahu rozhoduje správce aplikace.',
        ],
      },
    ],
  },
  {
    title: 'Porušení podmínek',
    blocks: [
      'Při porušení podmínek je provozovatel oprávněn odstranit fotografii nebo profilovou fotografii, změnit nevhodné jméno, odebrat body nebo zrušit účet, v případě závažného porušení i bez předchozího upozornění.',
    ],
  },
  {
    title: 'Provoz aplikace',
    blocks: [
      'Provozovatel nezaručuje nepřetržitou dostupnost aplikace. Je oprávněn měnit místa, sporty a pravidla bodování nebo provoz aplikace ukončit.',
    ],
  },
  {
    title: 'Zrušení účtu',
    blocks: [
      'Uživatel může účet kdykoli zrušit v aplikaci (Účet → Smazat účet). Zrušením účtu jsou vymazány i návštěvy, body a fotografie uživatele.',
    ],
  },
  {
    title: 'Závěrečná ustanovení',
    blocks: [
      'Provozovatel je oprávněn podmínky měnit. O podstatné změně bude uživatel informován v aplikaci a bude požádán o souhlas s novým zněním; bez tohoto souhlasu nelze aplikaci dále používat.',
      'Tyto podmínky se řídí právním řádem České republiky.',
      `Dotazy a připomínky lze zasílat na adresu ${LEGAL.operatorEmail}.`,
    ],
  },
];

export default function TermsScreen() {
  return (
    <>
      <Seo
        title="Podmínky používání"
        description="Podmínky používání aplikace Hýbeme se společně: kdo ji může používat, pravidla bezpečnosti, bodování a vkládání fotek."
        path="/podminky"
      />
      <LegalPage
        title="Podmínky používání"
        summary={SUMMARY}
        sections={SECTIONS}
        other={{ href: '/soukromi', label: 'Zásady ochrany osobních údajů' }}
      />
    </>
  );
}
