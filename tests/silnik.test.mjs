/**
 * SILNIK ZGODNOŚCI Z PALANTIREM — testy.
 *
 * ⚠ CZEGO TE TESTY PILNUJĄ W PIERWSZEJ KOLEJNOŚCI: nie tego, że reguła coś zgłasza, tylko tego,
 * że zgłasza to WE WŁAŚCIWYM PRZYPADKU I NIE ZGŁASZA W SĄSIEDNIM. Reguła projektowa, która
 * łapie za szeroko, jest gorsza od jej braku: czytelnik traci czas na sprawdzanie fałszywych
 * trafień, a po trzecim przestaje czytać cały raport. Dlatego przy każdej regule stoi para
 * „ma trafić” / „NIE ma trafić”, a nie samo trafienie.
 *
 * ⚠ DRUGA RZECZ: każda reguła MUSI mieć cytat ze źródła. Bez niego narzędzie orzeka o naszym
 * guście, a nie o zgodności z cudzą praktyką — i tego nie da się obronić przed klientem.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ocen, REGULY, KATEGORIE, KLASY, WERSJA } from '../engine/palantir.mjs';
import { normalizuj, wczytajTekst, rozpoznajFormat, krotnosc, nazwaApi, rozbijTyp } from '../engine/normalizuj.mjs';
import {
  wierszeDoKlasyfikacji, wierszeAkcji, wierszeStruktur, znaleziskaZEtykiet, kluczCache,
  TRYBY, TRYB_DOMYSLNY,
  ksztaltZadania, zlyKsztalt,
} from '../web/ai.mjs';
import {
  wlaczona as historiaWlaczona, zTrescia as historiaZTrescia, wpis as wpisHistorii,
} from '../web/historia.mjs';

const KORZEN = join(dirname(fileURLToPath(import.meta.url)), '..');
const czytaj = (p) => readFileSync(join(KORZEN, p), 'utf8');

/** Minimalna poprawna ontologia — punkt odniesienia, od którego psujemy po jednej rzeczy. */
const czysta = () => ({
  ontology: 'test',
  objectTypes: [{
    apiName: 'Invoice',
    displayName: 'Faktura',
    pluralDisplayName: 'Faktury',
    description: 'Dokument rozliczeniowy wystawiony klientowi za wykonaną pracę.',
    primaryKey: 'invoiceId',
    titleProperty: 'invoiceNumber',
    status: 'active',
    visibility: 'normal',
    implements: [],
    properties: [
      { apiName: 'invoiceId', type: 'string', required: true, description: 'Klucz faktury z systemu księgowego.' },
      { apiName: 'invoiceNumber', type: 'string', required: true, description: 'Numer widoczny dla klienta.' },
      { apiName: 'issuedDate', type: 'date', required: true, description: 'Dzień wystawienia dokumentu.' },
    ],
  }, {
    apiName: 'Customer',
    displayName: 'Kontrahent',
    pluralDisplayName: 'Kontrahenci',
    description: 'Podmiot, któremu wystawiamy faktury i który zamawia pracę.',
    primaryKey: 'customerId',
    titleProperty: 'customerName',
    status: 'active',
    visibility: 'prominent',
    implements: [],
    properties: [
      { apiName: 'customerId', type: 'string', required: true, description: 'Klucz kontrahenta.' },
      { apiName: 'customerName', type: 'string', required: true, description: 'Nazwa, którą posługuje się handlowiec.' },
    ],
  }],
  linkTypes: [{
    apiName: 'customer', from: 'Invoice', to: 'Customer',
    cardinality: 'MANY_TO_ONE', reverseName: 'invoices', status: 'active',
    /* ⚠ KAŻDA STRONA MA WŁASNĄ NAZWĘ DLA UŻYTKOWNIKA (docs:4161) — i obie są obowiązkowe. */
    displayName: 'Kontrahent', reverseDisplayName: 'Faktury',
    description: 'Komu wystawiono tę fakturę.',
  }],
  actionTypes: [{
    apiName: 'issueInvoice',
    description: 'Wystawia fakturę za zakończoną pracę.',
    status: 'active',
    parameters: [{ apiName: 'customer', type: 'reference', required: true }],
    rules: [{ op: 'create', target: 'Invoice' }],
    submissionCriteria: [{ id: 'ma-klienta', on: 'customer', operator: 'not-null', message: 'wskaż klienta' }],
  }],
  functions: [],
  interfaces: [],
  sharedPropertyTypes: [],
});

/** Uruchamia silnik i oddaje zbiór id reguł, które trafiły. */
const trafienia = (o) => new Set(ocen(o).znaleziska.map((z) => z.id));

describe('silnik — higiena narzędzia', () => {
  it('każda reguła z listy ma kategorię i klasę z zadeklarowanych słowników', () => {
    const idKategorii = new Set(KATEGORIE.map((k) => k.id));
    const idKlas = new Set(Object.keys(KLASY));
    for (const r of REGULY) {
      expect(idKategorii, `${r.id}: nieznana kategoria "${r.kategoria}"`).toContain(r.kategoria);
      expect(idKlas, `${r.id}: nieznana klasa "${r.klasa}"`).toContain(r.klasa);
    }
  });

  it('budżety kategorii sumują się do 100 — inaczej „wynik na 100” jest nieprawdą', () => {
    expect(KATEGORIE.reduce((a, k) => a + k.budzet, 0)).toBe(100);
  });

  it('id reguł są unikalne', () => {
    const id = REGULY.map((r) => r.id);
    expect(new Set(id).size, `duplikaty: ${id.filter((x, i) => id.indexOf(x) !== i)}`).toBe(id.length);
  });

  it('⚠ KAŻDE zgłoszone znalezisko niesie cytat ze źródła', () => {
    /* Reguła bez źródła orzeka o naszym guście, nie o praktyce Palantira. */
    const zly = JSON.parse(czytaj('web/public/przyklad-zly.json'));
    const r = ocen(normalizuj(zly));
    expect(r.znaleziska.length).toBeGreaterThan(10);
    for (const z of r.znaleziska) {
      expect(typeof z.zrodlo, `${z.id} bez pola \`zrodlo\``).toBe('string');
      expect(z.zrodlo.length, `${z.id}: cytat pusty albo skrócony do bezużyteczności`).toBeGreaterThan(30);
      expect(typeof z.jak, `${z.id} nie mówi, JAK to naprawić`).toBe('string');
      expect(z.jak.length, `${z.id}: „jak” jest puste`).toBeGreaterThan(15);
    }
  });

  it('wynik jest deterministyczny — dwa przebiegi dają identyczny raport (szablon i przykład zły)', () => {
    /* ⚠ Do 09.2026 ten test liczył na dużej ontologii produkcyjnej, której to repo nie ma.
       Szablon i przykład zły pokrywają obie ścieżki: wynik 100 i raport z kilkudziesięcioma
       znaleziskami każdej klasy. */
    for (const o of [normalizuj(wczytajTekst(czytaj('web/public/szablon.yaml')).dane),
      normalizuj(JSON.parse(czytaj('web/public/przyklad-zly.json')))]) {
      expect(JSON.stringify(ocen(o))).toBe(JSON.stringify(ocen(o)));
    }
  });

  it('pusta ontologia nie wywraca silnika', () => {
    const r = ocen({ objectTypes: [], linkTypes: [], actionTypes: [], functions: [], interfaces: [], sharedPropertyTypes: [] });
    expect(r.wynik).toBe(100);
    expect(r.znaleziska).toEqual([]);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   ZNALEZISKO PRZYJĘTE Z POWODEM (`acceptedFindings`, zestaw 1.2)
   ──────────────────────────────────────────────────────────────────────────────────────────
   ⚠ MECHANIZM MA DWIE STRONY I OBIE TRZEBA PILNOWAĆ. Bez przyjęć to samo znalezisko wraca
   w każdym raporcie i uczy czytelnika, że wynik zawiera stałe tło. Z przyjęciami bez bramek
   narzędzie staje się WYCISZACZEM: dowolne znalezisko schodzi z wyniku jednym wpisem. Dlatego
   każdy test niżej stoi w parze „przyjęte działa" / „przyjąć się NIE DA".
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('silnik 1.2 — znalezisko przyjęte z powodem', () => {
  /** Kanon, na którym CELOWO zapala JEDNA reguła klasy `uwaga`. Id bierzemy z raportu, a nie
   *  z pamięci — reguła bywa przenumerowana, a test ma pilnować MECHANIZMU, nie numeru.
   *  ⚠ POLE NAZYWA SIĘ `value`, A DO ZESTAWU 1.3 NAZYWAŁO SIĘ `amount` — i ta podmiana jest
   *  częścią dostrojenia `P14`: `amount` pada w dokumentacji jako ZWYKŁA właściwość wydatku,
   *  a `value` stoi w kolumnie ZŁYCH przykładów wiersza „Ambiguous terms”. Kanon, na którym
   *  reguła zapalała z powodu, którego źródło nie potwierdza, nie był dobrym kanonem. */
  const zUwaga = () => {
    const o = czysta();
    o.sharedPropertyTypes = [
      { apiName: 'Money', kind: 'struct', description: 'Kwota z walutą.', fields: [{ apiName: 'net', type: 'decimal' }] },
    ];
    o.objectTypes[0].properties.push(
      { apiName: 'value', type: 'struct', sharedPropertyType: 'Money', required: false, description: 'Kwota dokumentu.' },
    );
    return o;
  };

  /** Pierwsze znalezisko danej klasy w raporcie — razem z celem, po którym da się je przyjąć. */
  const pierwsze = (o, klasa) => {
    const z = ocen(o).znaleziska.find((x) => x.klasa === klasa);
    expect(z, `kanon testowy nie zapala ani jednej reguły klasy \`${klasa}\` — test stracił przedmiot`).toBeTruthy();
    /* Cel bierzemy z ADRESU znaleziska: to jest dokładnie to, co człowiek przepisze do wpisu. */
    const cel = /^[A-Za-z]+/.exec(String(z.gdzie).replace(/^[a-zA-Z]+\[/, ''))?.[0];
    return { z, cel: cel ?? String(z.gdzie) };
  };

  it('kanon BEZ klucza przyjęć zachowuje się jak dotąd — pusta lista `przyjete`, wynik bez zmian', () => {
    const o = zUwaga();
    const bez = ocen(o);
    const zPusta = ocen({ ...o, acceptedFindings: [] });
    expect(bez.przyjete).toEqual([]);
    expect(zPusta.wynik, 'pusta lista przyjęć zmieniła wynik — mechanizm nie jest neutralny').toBe(bez.wynik);
    expect(zPusta.znaleziska.length).toBe(bez.znaleziska.length);
  });

  it('przyjęte znalezisko SCHODZI z listy i NIE liczy się do wyniku — ale zostaje widoczne z powodem', () => {
    const o = zUwaga();
    const bez = ocen(o);
    const { z, cel } = pierwsze(o, 'uwaga');
    const r = ocen({
      ...o,
      acceptedFindings: [{
        rule: z.id, target: cel,
        why: 'Sprawdzone przy przeglądzie: kształt jest tu decyzją, nie przeoczeniem.',
        decidedBy: 'właściciel', date: '2026-09-16',
      }],
    });
    expect(r.znaleziska.some((x) => x.id === z.id && x.gdzie === z.gdzie), 'przyjęte znalezisko dalej stoi na liście głównej').toBe(false);
    expect(r.przyjete.some((x) => x.id === z.id), 'przyjęte znalezisko przepadło zamiast zejść na osobną listę').toBe(true);
    expect(r.przyjete[0].przyjeteDlaczego, 'przyjęcie bez powodu w raporcie — to jest cała różnica wobec wyciszenia').toMatch(/decyzją/);
    expect(r.wynik, 'przyjęcie nie zdjęło kosztu znaleziska z wyniku').toBeGreaterThan(bez.wynik);
  });

  it('⚠ ZŁAMANIA NIE DA SIĘ PRZYJĄĆ — silnik zgłasza to jako złamanie, a znalezisko zostaje', () => {
    const o = czysta();
    /* Typ obiektu BEZ klucza głównego — `P35`, klasa `zlamanie`. */
    delete o.objectTypes[0].primaryKey;
    const { z, cel } = pierwsze(o, 'zlamanie');
    const r = ocen({
      ...o,
      acceptedFindings: [{ rule: z.id, target: cel, why: 'Zostawiamy, bo tak jest wygodniej w kodzie.' }],
    });
    expect(r.przyjete, 'złamanie zeszło z listy — mechanizm przyjęć stał się wyciszaczem').toEqual([]);
    expect(r.znaleziska.some((x) => x.id === z.id), 'przyjęte złamanie zniknęło z raportu').toBe(true);
    expect(r.znaleziska.some((x) => x.id === 'P55'), 'silnik nie zgłosił próby przyjęcia złamania').toBe(true);
  });

  it('przyjęcie RYZYKA bez adresata i daty jest zgłaszane (`P56`), z nimi — przechodzi', () => {
    const o = czysta();
    /* God Object — `P01`, klasa `ryzyko`: dorzucamy właściwości ponad próg. */
    for (let i = 0; i < 40; i += 1) {
      o.objectTypes[0].properties.push({ apiName: `pole${i}`, type: 'string', required: false, description: `Pole numer ${i}.` });
    }
    const { z, cel } = pierwsze(o, 'ryzyko');
    const bezAdresata = ocen({ ...o, acceptedFindings: [{ rule: z.id, target: cel, why: 'Typ jest szeroki świadomie — tak wygląda dokument u tego klienta.' }] });
    expect(bezAdresata.znaleziska.some((x) => x.id === 'P56'), 'ryzyko przyjęte bez adresata i daty przeszło bez słowa').toBe(true);

    const zAdresatem = ocen({
      ...o,
      acceptedFindings: [{
        rule: z.id, target: cel,
        why: 'Typ jest szeroki świadomie — tak wygląda dokument u tego klienta.',
        decidedBy: 'właściciel', date: '2026-09-16',
      }],
    });
    expect(zAdresatem.znaleziska.some((x) => x.id === 'P56'), 'poprawne przyjęcie ryzyka dalej jest zgłaszane').toBe(false);
    expect(zAdresatem.przyjete.some((x) => x.id === z.id), 'poprawnie przyjęte ryzyko nie zeszło na listę przyjętych').toBe(true);
  });

  it('PRZYJĘCIE OSIEROCONE jest złamaniem — i tak samo przyjęcie reguły spoza zestawu (`P57`)', () => {
    const o = zUwaga();
    const sierota = ocen({
      ...o,
      acceptedFindings: [{ rule: 'P09', target: 'TypuKtoregoNieMa', why: 'Powód, który nie ma już przedmiotu.' }],
    });
    expect(sierota.znaleziska.some((x) => x.id === 'P57'), 'przyjęcie celujące w typ spoza modelu przeszło bez słowa').toBe(true);

    const obcaRegula = ocen({
      ...o,
      acceptedFindings: [{ rule: 'P999', target: 'Invoice', why: 'Reguła, której to narzędzie nie zna.' }],
    });
    expect(obcaRegula.znaleziska.some((x) => x.id === 'P57'), 'przyjęcie reguły spoza zestawu przeszło bez słowa').toBe(true);
  });

  /* ⚠ ZESTAW 1.3 · CEL `*` — LUKA MECHANIZMU ZAŁATANA, A NIE FURTKA. Reguła orzekająca o CAŁYM
     modelu (granica wierszowa, konwencja dat) nie wskazuje żadnego wpisu, więc do 1.2 nie dawało
     się jej przyjąć w ogóle — a bywa decyzją tak samo jak każda inna. Ta para testów pilnuje obu
     stron: gwiazdka BIERZE znalezisko o zasięgu całego modelu i NIE TKNIE ani jednego, które
     wskazuje konkretny wpis. */
  it('⚠ cel `*` przyjmuje znalezisko o zasięgu CAŁEGO modelu', () => {
    const o = czysta();
    /* `P16` — dwa style nazw naraz; jej adres to `objectTypes[*]`, czyli CAŁY model. */
    o.objectTypes[0].properties.push({ apiName: 'issued_at', type: 'timestamp', description: 'Chwila wystawienia.' });
    const bez = ocen(o);
    const szerokie = bez.znaleziska.find((z) => String(z.gdzie).endsWith('[*]'));
    expect(szerokie, 'kanon testowy nie zapala ani jednej reguły o zasięgu całego modelu').toBeTruthy();
    const r = ocen({
      ...o,
      acceptedFindings: [{
        rule: szerokie.id, target: '*',
        why: 'Ten model nie ma dziś takiej granicy i to jest decyzja, nie przeoczenie.',
        decidedBy: 'właściciel', date: '2026-09-16',
      }],
    });
    expect(r.przyjete.some((x) => x.id === szerokie.id), 'gwiazdka nie wzięła znaleziska o zasięgu całego modelu').toBe(true);
    expect(r.znaleziska.some((x) => x.id === szerokie.id && x.gdzie === szerokie.gdzie), 'przyjęte znalezisko dalej stoi na liście głównej').toBe(false);
  });

  it('⚠ cel `*` NIE JEST WYCISZACZEM — nie tyka znaleziska wskazującego konkretny wpis', () => {
    const o = czysta();
    /* God Object — `P01` wskazuje KONKRETNY typ, więc gwiazdka ma go nie ruszyć. */
    for (let i = 0; i < 40; i += 1) {
      o.objectTypes[0].properties.push({ apiName: `pole${i}`, type: 'string', required: false, description: `Pole numer ${i}.` });
    }
    const r = ocen({
      ...o,
      acceptedFindings: [{
        rule: 'P01', target: '*',
        why: 'Próba przyjęcia hurtem — ma się nie udać.',
        decidedBy: 'właściciel', date: '2026-09-16',
      }],
    });
    expect(r.przyjete, 'gwiazdka wzięła znalezisko wskazujące KONKRETNY wpis — mechanizm stał się wyciszaczem').toEqual([]);
    expect(r.znaleziska.some((x) => x.id === 'P01'), 'znalezisko o konkretnym wpisie zniknęło').toBe(true);
  });

  it('numer zestawu reguł podbity — zestaw 2.0 bada rzeczy, których 1.3 nie badał (1.4–1.9 scalone w nim)', () => {
    /* ⚠ 1.4 (3.0 · K5c, D10b): silnik nauczył się TYPU WARTOŚCI. Do 1.3 widział wyłącznie napis
       typu i `sharedPropertyType`, więc typ wskazany polem `valueType` był NIEWIDZIALNY — wypadał
       jako sierota (`P46`), choć kanon bierze go wprost. Przy okazji `P44` przestało dotyczyć
       skalarów: zdanie, na którym ta reguła stoi, mówi o CUSTOM TYPES (rekordach), a *value type*
       jest u Foundry osobnym zasobem, który wolno mieć BEZ konsumenta. */
    /* ⚠ 1.5 (3.0 · K9): `P15` pyta o FORMĘ zapisu czasu, a `P20` wymaga MNOGOŚCI (docs:20222, 20553, 20565) —
       numer 1.4 wziął K5c, więc strojenie K9 jest zestawem 1.5 i zawiera oba. */
    /* ⚠ 1.6 (3.0 · K10): kanon w 100 % w kształcie Foundry — dziewięć nowych reguł; numer skakał na gałęzi
       K10 z 1.3, a po scaleniu 17.09.2026 zestaw 1.6 zawiera także 1.4 i 1.5. */
    /* ⚠ 1.7 (3.0 · A14, decyzja właściciela A7 z 18.09.2026): `P40` przestaje dopasowywać POLSKIE
       rdzenie wrażliwe W ŚRODKU angielskich słów. `sourceName` zapalał znalezisko, bo niesie
       litery `cena` na styku `sour|ceNa|me` — polskie rdzenie są krótkie i takie kolizje robią.
       Numer idzie w górę, bo trafienie znika CZYJEMUŚ modelowi, a nie tylko naszemu. */
    /* ⚠ 1.8 (3.1 · K12b): silnik nauczył się, że PARAMETR AKCJI NIE JEST JEDNĄ RZECZĄ. Do 1.7 każdy
       parametr liczył się jako powierzchnia ontologii, więc typ z repozytorium funkcji stojący przy
       nim zapalał `P45` (typ kodu jako typ parametru) i `P52` (struktura w strukturze) — oba jako
       ZŁAMANIA, których nie da się przyjąć. Dla akcji DEKLARATYWNEJ to prawda i tam reguły trzymają
       pełną ostrość; przy regule `runFunction` strzałka leci odwrotnie: „Every input of the function
       is created as a parameter on the action type" (`docs:4927`), więc parametr jest SKUTKIEM
       sygnatury i wolno mu wziąć typ z kodu — `docs:8315` (rekord z polami-referencjami do obiektów,
       podany jako lista funkcji edycji) i `docs:5946` („must contain a list of structs") pokazują
       oba kształty, których parametrem `STRUCT` z Ontology Managera (`docs:5799`) zapisać się NIE DA.
       Numer idzie w górę, bo dwa ZŁAMANIA przestają zapalać się CZYJEMUŚ modelowi, a nie tylko
       naszemu; przy okazji domknięcie typów idzie także po `valueType`, więc `P44`/`P46` widzą
       typ wartości brany WYŁĄCZNIE przez pola struktury. */
    /* ⚠ 1.9 (25.09.2026): sześć reguł niezależnych od klucza obcego (`P84`–`P89`: głębokość
       `derived.via`, typ współdzielony na ≤1 typie, N:M bez tabeli łączącej, delete deklaratywny
       bez referencji/z kaskadą, wiele obiektów z listy w akcji deklaratywnej, akcja na interfejsie
       spoza kontraktu). Do 1.8 model łamiący te zasady dostawał 100/100 WYŁĄCZNIE dlatego, że
       zestaw nie miał o nich reguł — cisza narzędzia, nie zgodność modelu. `P82`/`P83` są
       ZAREZERWOWANE dla dwóch reguł klucza obcego, które przychodzą osobnym zestawem. */
    /* ⚠ 2.0 (25.09.2026; po 1.9 idzie 2.0, nie 1.10): `P82` (klucz obcy nie jest właściwością albo
       typ ≠ typ klucza głównego celu, `docs:3915`, `docs:3923`), `P83` (nazwa klucza obcego = nazwa
       strony linku, `docs:3962`), `P86` przepuszcza tabelę łączącą `joinTable` (`docs:3934–3944`),
       a `P11`/`P27` przestają liczyć kolumny kluczy obcych. */
    expect(WERSJA).toBe('2.0');
    for (const id of ['P55', 'P56', 'P57', 'P58', 'P64', 'P66', 'P72', 'P73', 'P75', 'P77', 'P79', 'P81',
      'P82', 'P83', 'P84', 'P85', 'P86', 'P87', 'P88', 'P89'])
      expect(REGULY.map((r) => r.id), `${id} nie stoi w spisie reguł — narzędzie bada coś, o czym nie mówi`).toContain(id);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   AGNOSTYCZNOŚĆ SILNIKA — ASERCJA, NIE OBIETNICA
   ──────────────────────────────────────────────────────────────────────────────────────────
   ⚠ ZASADA WŁAŚCICIELA (16.09.2026): „walidator powinien być OGÓLNY, nie dopasowany do naszej
   ontologii; będę z niego korzystać ja i inni devowie z innymi onto”. Architektura już tak stoi:
   `normalizuj.mjs` rozpoznaje format i sprowadza go do kanonu nazwanego po Foundry'emu,
   a `palantir.mjs` liczy reguły na kanonie i NIE WIE, skąd przyszedł plik.

   Do dziś tej granicy pilnowała wyłącznie czyjaś uważność — i już raz przeciekła: reguła
   podpowiadała, żeby poprawić klucz, którego czytelnik u siebie nie zobaczy. Tego nie widać
   w przeglądzie kodu, bo jedno słowo w prozie wygląda niewinnie; widać dopiero wtedy, gdy ktoś
   obcy przeczyta radę i jej nie zrozumie.

   ⚠ LISTA ZAKAZANYCH SŁÓW JEST WYPROWADZONA, A NIE PRZEPISANA. Bierzemy ją z tego, co czyta
   gałąź `nueve` normalizatora — czyli z definicji „klucz NASZEGO manifestu”. Dzięki temu
   dołożenie pola po tamtej stronie SAMO rozszerza asercję; lista przepisana ręcznie zostałaby
   w tyle przy pierwszej zmianie i nikt by tego nie zauważył.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('⚠ silnik nie zna ANI JEDNEGO klucza żadnego konkretnego formatu', () => {
  /**
   * ⚠ LISTA JEST MIGAWKĄ, BO KONWERTERA TU NIE MA. Do 09.2026 test wyprowadzał zakazane słowa
   * z gałęzi `nueve` normalizatora — ta gałąź mieszka dziś w repozytorium, które trzyma format
   * `nueve`, a to repo zna tylko kanon i szablon Foundry. Nowy klucz formatu dopisuje się do
   * fikstury, zanim trafi do konwertera; kebab-case jest podpisem cudzego pliku, a kanon mówi
   * camelCase'em (`objectTypes`, `apiName`, `titleProperty`).
   */
  const MIGAWKA = JSON.parse(czytaj('tests/fixtures/slowa-formatu-nueve.json'));
  const ZAKAZANE = [...MIGAWKA.slowa, ...MIGAWKA.pozaKonwerterem];

  /**
   * ⚠ WYJĄTKI SĄ PUSTE I TO NIE JEST LENISTWO. Dwa słowa (`link-mapping`, `satisfied-by`)
   * przyjmuje też szablon publiczny jako alias, więc kusiło, żeby je tu wpisać — zamiast tego
   * PRZEPISALIŚMY PROZĘ reguły `P47` na nazwy kanoniczne (`mapping` / `linkMapping` /
   * `satisfiedBy`), bo czytelnik narzędzia widzi u siebie kanon, a nie cudzy plik.
   * Wyjątek wolno dopisać wyłącznie dla słowa, które jest słowem FOUNDRY'EGO — i tylko
   * z powodem wpisanym obok, nie samą nazwą.
   */
  const WYJATKI = new Map([]);

  it('migawka nie jest pusta i niesie klucze-podpisy formatu', () => {
    expect(MIGAWKA.slowa.length, 'migawka przestała cokolwiek pilnować?').toBeGreaterThan(10);
    for (const oczekiwany of ['shared-properties', 'function-types', 'actions-contract', 'title-property']) {
      expect(MIGAWKA.slowa, `${oczekiwany} musi być w migawce`).toContain(oczekiwany);
    }
  });

  it('⚠ `palantir.mjs` nie zawiera żadnego z nich — ani w kodzie, ani w prozie', () => {
    const silnik = czytaj('engine/palantir.mjs');
    const trafione = ZAKAZANE.filter((tk) => !WYJATKI.has(tk)).filter((tk) => silnik.includes(tk));
    expect(trafione,
      'silnik liczy reguły na KANONIE i nie ma prawa znać słownictwa żadnego konkretnego '
      + 'formatu — przepisz prozę na nazwy kanoniczne zamiast zmiękczać tę asercję').toEqual([]);
  });

  it('⚠ normalizator nie ma czytnika formatu `nueve` — taki plik dostaje ODMOWĘ z instrukcją', () => {
    const src = czytaj('engine/normalizuj.mjs');
    expect(src, 'czytnik formatu `nueve` mieszka w repozytorium, które go trzyma')
      .not.toMatch(/function zNaszego|NASZ MANIFEST → KSZTAŁT KANONICZNY/);
    expect(() => normalizuj({ objects: [{ id: 'core.Order' }] })).toThrow(/nueve.*kanon/);
    expect(() => normalizuj({ 'shared-properties': [] })).toThrow(/kanon/);
  });

  it('⚠ silnik nie czyta ANI JEDNEGO pliku — całą wiedzę dostaje kanonem w argumencie', () => {
    /* Bliźniacza granica do walidatora formatu: reguła, która musi zajrzeć do pliku, nie jest
       regułą projektową. Silnik sięgający po czyjś manifest przestałby działać u kogokolwiek
       innego, a u autora wyglądałby dalej na zielony. ⚠ Sprawdzamy WEJŚCIE, nie wzmianki. */
    const silnik = czytaj('engine/palantir.mjs');
    expect(silnik, 'żadnego wejścia poza argumentem `ocen`').not.toMatch(/readFileSync|readFile\b|\bfetch\s*\(|require\s*\(/);
    expect(silnik, 'żadnego importu — nawet z sąsiedniego pliku').not.toMatch(/^import\s/m);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   WEJŚCIE `kanon` — repozytorium z WŁASNYM formatem wysyła ontologię już zamienioną na kanon
   ──────────────────────────────────────────────────────────────────────────────────────────
   ⚠ PO CO TO JEST. Kanon przepuszczony przez czytnik Foundry'ego gubi to, czego szablon nie zna
   (przyjęte znaleziska, kontrakt akcji, wiązki linków): zmierzone na ontologii produkcyjnej —
   100 / 1 znalezisko wprost i 66,9 / 217 po ponownym czytaniu. Dlatego kanon rozpoznaje się
   PRZED formatem Foundry i przechodzi do silnika bez zmian.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
describe('wejście `kanon` — kanon wprost, bez ponownego czytania', () => {
  const kanonZ = (sciezka, json) => {
    const t = czytaj(sciezka);
    return JSON.parse(JSON.stringify(normalizuj(json ? JSON.parse(t) : wczytajTekst(t).dane)));
  };

  it('kanon rozpoznaje się po `formatWejscia` i przechodzi TEN SAM obiekt, nie kopia', () => {
    const k = kanonZ('web/public/szablon.yaml', false);
    expect(rozpoznajFormat(k)).toBe('kanon');
    expect(normalizuj(k), 'kanonu się nie przepisuje').toBe(k);
  });

  it('⚠ wynik z kanonu po JSON-ie = wynik z pliku — dla szablonu i dla przykładu złego', () => {
    for (const [p, json] of [['web/public/szablon.yaml', false], ['web/public/przyklad-zly.json', true]]) {
      const t = czytaj(p);
      const zPliku = ocen(normalizuj(json ? JSON.parse(t) : wczytajTekst(t).dane));
      const zKanonu = ocen(kanonZ(p, json));
      expect(zKanonu.wynik, p).toBe(zPliku.wynik);
      expect(zKanonu.znaleziska.map((z) => `${z.id}@${z.gdzie}`), p)
        .toEqual(zPliku.znaleziska.map((z) => `${z.id}@${z.gdzie}`));
    }
  });

  it('⚠ PRZYJĘCIE W KANONIE DZIAŁA — właśnie ono ginęło przy ponownym czytaniu jako Foundry', () => {
    const k = kanonZ('web/public/przyklad-zly.json', true);
    const przed = ocen(k);
    /* Przyjęcie wskazuje REGUŁĘ i NAZWĘ z modelu (tu: typ obiektu z adresu znaleziska);
       klasy `zlamanie` przyjąć się nie da (`P55`), więc bierzemy każdą inną. */
    const cel = przed.znaleziska
      .filter((z) => z.klasa !== 'zlamanie')
      .map((z) => ({ z, typ: /^objectTypes\[([^\]]+)\]/.exec(String(z.gdzie ?? ''))?.[1] }))
      .find((x) => x.typ);
    expect(cel, 'przykład zły musi mieć choć jedno znalezisko do przyjęcia (nie `zlamanie`)').toBeTruthy();
    k.acceptedFindings = [{ rule: cel.z.id, target: cel.typ, why: 'test: przyjęcie jedzie w kanonie', decidedBy: 'test', date: '2026-09-24' }];
    const po = ocen(JSON.parse(JSON.stringify(k)));
    expect(po.przyjete.length, 'przyjęcie z kanonu ma zostać odczytane').toBeGreaterThan(0);
    expect(po.znaleziska.length).toBeLessThan(przed.znaleziska.length);
  });

  it('plik z `formatWejscia`, ale bez `objectTypes`, NIE jest kanonem', () => {
    expect(rozpoznajFormat({ formatWejscia: 'nueve' })).toBe(null);
  });
});

describe('silnik — reguła trafia TAM, gdzie ma, i NIE trafia obok', () => {
  it('czysta ontologia przechodzi bez ani jednego znaleziska', () => {
    const r = ocen(czysta());
    expect(r.znaleziska.map((z) => `${z.id} ${z.co}`)).toEqual([]);
    expect(r.wynik).toBe(100);
  });

  it('P01/P02 · God Object po liczbie właściwości — próg, nie „dużo”', () => {
    const pole = (n) => ({ apiName: `pole${n}`, type: 'string', description: `Opis pola numer ${n}.` });
    const zTyloma = (ile) => {
      const o = czysta();
      o.objectTypes[0].properties.push(...Array.from({ length: ile }, (_, i) => pole(i)));
      return trafienia(o);
    };
    expect(zTyloma(10).has('P01')).toBe(false);
    expect(zTyloma(10).has('P02')).toBe(false);
    expect(zTyloma(25).has('P02')).toBe(true);
    expect(zTyloma(25).has('P01')).toBe(false);   // ostrzeżenie, jeszcze nie złamanie
    expect(zTyloma(45).has('P01')).toBe(true);
  });

  it('P03 · dyskryminator łapie się od TRZECH rodzajów, nie od dwóch', () => {
    const zRodzajami = (lista) => {
      const o = czysta();
      o.objectTypes[0].properties.push({ apiName: 'kind', type: `enum(${lista.join('|')})`, description: 'Rodzaj.' });
      o.objectTypes[0].discriminatorValues = lista;
      return trafienia(o);
    };
    expect(zRodzajami(['a', 'b']).has('P03')).toBe(false);
    expect(zRodzajami(['a', 'b', 'c']).has('P03')).toBe(true);
  });

  it('P05 · silos systemowy — skrót systemu tak, zwykłe angielskie słowo NIE', () => {
    const zNazwa = (n) => { const o = czysta(); o.objectTypes[0].apiName = n; return trafienia(o); };
    for (const n of ['ErpOrder', 'SapCustomer', 'CrmContact', 'LegacyPlan']) {
      expect(zNazwa(n).has('P05'), `${n} powinno być silosem`).toBe(true);
    }
    /* ⚠ REGRESJA Z PIERWSZEGO PRZEBIEGU: `source`/`raw`/`external` były na liście prefiksów
       i wyprodukowały fałszywy dodatni na `SourceChange`. Te nazwy są rzeczownikami domeny. */
    for (const n of ['SourceChange', 'RawMaterial', 'ExternalAudit', 'Source']) {
      expect(zNazwa(n).has('P05'), `${n} NIE jest silosem — to rzeczownik domeny`).toBe(false);
    }
  });

  it('P06 · wersja i rok w nazwie — także w camelCase, ale bez Base64 i Iso8601', () => {
    const zNazwa = (n) => { const o = czysta(); o.objectTypes[0].apiName = n; return trafienia(o); };
    for (const n of ['ContractV2', 'Order2024', 'PlanRev3', 'contract_v2', 'Sales1999']) {
      expect(zNazwa(n).has('P06'), `${n} niesie wersję/rok`).toBe(true);
    }
    for (const n of ['Contract', 'Base64Payload', 'Iso8601Stamp', 'Invoice', 'Utf8Document']) {
      expect(zNazwa(n).has('P06'), `${n} NIE niesie wersji`).toBe(false);
    }
  });

  it('P07 · reguła trzech — dwa typy o wspólnym kształcie przechodzą, trzy nie', () => {
    const kopia = (nazwa) => ({
      apiName: nazwa,
      description: `Kopia bytu klienta w wydaniu ${nazwa}, z tymi samymi polami.`,
      primaryKey: 'id', titleProperty: 'fullName', status: 'active', visibility: 'normal', implements: [],
      properties: ['id', 'fullName', 'emailAddress', 'phoneNumber', 'postalAddress']
        .map((n) => ({ apiName: n, type: 'string', description: `Pole ${n} tego kontrahenta.` })),
    });
    const zIloma = (ile) => {
      const o = czysta();
      o.objectTypes.push(...['SalesParty', 'SupportParty', 'BillingParty'].slice(0, ile).map(kopia));
      return trafienia(o);
    };
    expect(zIloma(2).has('P07')).toBe(false);
    expect(zIloma(3).has('P07')).toBe(true);
  });

  it('P07 · wspólny interfejs ZDEJMUJE zarzut duplikatu — to jest cała recepta Palantira', () => {
    const o = czysta();
    for (const n of ['SalesParty', 'SupportParty', 'BillingParty']) {
      o.objectTypes.push({
        apiName: n, description: `Strona handlowa w wydaniu ${n}.`,
        primaryKey: 'id', titleProperty: 'fullName', status: 'active', visibility: 'normal',
        implements: ['PartyBase'],
        properties: ['id', 'fullName', 'emailAddress', 'phoneNumber', 'postalAddress']
          .map((x) => ({ apiName: x, type: 'string', description: `Pole ${x}.` })),
      });
    }
    expect(trafienia(o).has('P07')).toBe(false);
  });

  it('P08 · interfejs użyty w sygnaturze funkcji przestaje być „nieskonsumowany”', () => {
    const zInterfejsem = (uzyty) => {
      const o = czysta();
      o.interfaces.push({
        apiName: 'Billable', description: 'Cokolwiek da się policzyć do faktury.',
        status: 'active', properties: [{ apiName: 'amountDue', type: 'decimal' }],
        actionConstraints: [{ apiName: 'invoice' }], implementedBy: ['Invoice'],
      });
      if (uzyty) {
        o.functions.push({
          apiName: 'dueAmount', description: 'Kwota do zapłaty.', status: 'active',
          inputs: [{ apiName: 'subject', type: 'Billable', typeRaw: 'Billable' }],
          output: { type: 'decimal', typeRaw: 'decimal' },
        });
      }
      return trafienia(o);
    };
    expect(zInterfejsem(false).has('P08')).toBe(true);
    expect(zInterfejsem(true).has('P08')).toBe(false);
  });

  /* ══════════════════════════════════════════════════════════════════════════════════════
     ZESTAW 1.3 · DWIE REGUŁY DOSTROJONE DO DOKUMENTACJI, NIE DO NASZEGO MANIFESTU
     ──────────────────────────────────────────────────────────────────────────────────────
     Obie zmiany mają ten sam powód: reguła była OSTRZEJSZA niż źródło, na które się powołuje,
     więc zgłaszała kształt, który Foundry stawia w kolumnie DOBRYCH przykładów albo wprost
     opisuje jako wymóg platformy. Rozjemcą jest dokumentacja, nie wynik — dlatego testy stoją
     na SYNTETYCZNYM kanonie, a nie na naszym pliku.
     ══════════════════════════════════════════════════════════════════════════════════════ */

  /* ══════════════════════════════════════════════════════════════════════════════════════
     ZESTAW 1.4 · SILNIK UCZY SIĘ TYPU WARTOŚCI (3.0 · K5c, D10b)
     ──────────────────────────────────────────────────────────────────────────────────────
     Do 1.3 użycie typu przez pole `valueType` było dla reguł NIEWIDZIALNE: `uzytyW` czytał
     wyłącznie napis typu i `sharedPropertyType`. Skutek był jednostronny i cichy — typ wskazany
     jako wartość wypadał jako SIEROTA (`P46`), choć kanon bierze go wprost. Przy okazji wyszła
     druga rzecz: `P44` mówi o CUSTOM TYPES („Custom types used in function signatures are
     different from the generated classes used for Ontology struct properties”), czyli
     o REKORDACH — a *value type* jest u Foundry osobnym zasobem, który wolno mieć BEZ konsumenta
     („If your value type has no consumers, you can freely change these constraints”).
     ⚠ TESTY STOJĄ NA SYNTETYCZNYM KANONIE, nie na naszym pliku — rozjemcą jest dokumentacja.
     ══════════════════════════════════════════════════════════════════════════════════════ */

  it('P46 (1.4) · typ wskazany polem `valueType` NIE jest sierotą — to jest użycie, nie deklaracja', () => {
    const zTypem = (wepnij) => {
      const o = czysta();
      o.sharedPropertyTypes = [...(o.sharedPropertyTypes ?? []),
        { apiName: 'core.Severity', type: 'enum(ok|warning|critical)', description: 'Trzy stopnie.', isStruct: false, fields: [] }];
      if (wepnij) o.functionTypes = o.functionTypes ?? [];
      if (wepnij) o.functions = [...(o.functions ?? []),
        { apiName: 'f', description: 'Funkcja.', inputs: [], output: { type: 'enum(ok|warning|critical)', typeRaw: 'enum(ok|warning|critical)', valueType: 'core.Severity' } }];
      return ocen(o).znaleziska.filter((z) => z.id === 'P46');
    };
    expect(zTypem(false).length, 'typ bez ANI JEDNEGO konsumenta ma dalej wypadać jako sierota').toBeGreaterThan(0);
    expect(zTypem(true), '`valueType` w sygnaturze nie policzył się jako użycie — a to jest użycie').toEqual([]);
  });

  it('P44 (1.4) · TYP WARTOŚCI używany tylko przez sygnatury NIE jest „typem kodu w złej grupie”', () => {
    const o = czysta();
    o.sharedPropertyTypes = [...(o.sharedPropertyTypes ?? []),
      /* SKALAR — u Foundry *value type*, osobny zasób od *shared property type* */
      { apiName: 'core.Severity', type: 'enum(ok|warning|critical)', description: 'Trzy stopnie.', isStruct: false, fields: [] },
      /* REKORD — o TYM mówi zdanie, na którym stoi P44 */
      { apiName: 'core.Rekord', type: 'struct', description: 'Rekord.', isStruct: true, fields: [{ apiName: 'a', type: 'string', typeRaw: 'string' }] }];
    o.functions = [...(o.functions ?? []),
      { apiName: 'f', description: 'Funkcja.', inputs: [{ apiName: 'x', type: 'struct(core.Rekord)', typeRaw: 'struct(core.Rekord)' }], output: { type: 'enum(ok|warning|critical)', typeRaw: 'enum(ok|warning|critical)', valueType: 'core.Severity' } }];
    const z = ocen(o).znaleziska.filter((x) => x.id === 'P44');
    expect(z.length, 'REKORD używany tylko przez sygnaturę ma dalej być zgłoszony — to jest custom type w złej grupie').toBe(1);
    expect(JSON.stringify(z), 'silnik wziął TYP WARTOŚCI za typ kodu — a Foundry trzyma je w dwóch różnych miejscach').not.toMatch(/core\.Severity/);
  });

  it('P14 (1.3) · `status`/`name` NIE są niedookreślone — tabela „Naming rules” stawia je w DOBRYCH przykładach', () => {
    const zPolem = (apiName) => {
      const o = czysta();
      o.objectTypes[0].properties.push({ apiName, type: 'string', description: `Pole ${apiName}.` });
      return ocen(o).znaleziska.filter((z) => z.id === 'P14');
    };
    /* Kolumna „Good examples” wiersza „Properties”: `age`, `status`, `lastInspectionDate`.
       Akapit „Indicators” anty-wzorca Misnomer potępia `status` i `name` — ale to lista OBJAWÓW,
       a tabela jest REGUŁĄ; przy sprzeczności rozstrzyga reguła. */
    for (const dobre of ['status', 'name', 'age', 'lastInspectionDate'])
      expect(zPolem(dobre), `\`${dobre}\` stoi u Foundry w kolumnie DOBRYCH przykładów`).toEqual([]);
    /* Wiersz „Ambiguous terms”, kolumna „Bad examples”: `value`, `quantity`, `score`. */
    for (const zle of ['value', 'quantity', 'score'])
      expect(zPolem(zle).length, `\`${zle}\` jest wprost w kolumnie ZŁYCH przykładów`).toBe(1);
  });

  it('P14 (1.3) · `amount` i `flag` WYPADŁY — dokumentacja używa `amount` neutralnie, a `flag` nie pada w niej wcale', () => {
    const o = czysta();
    o.objectTypes[0].properties.push(
      { apiName: 'amount', type: 'decimal', description: 'Kwota dokumentu.' },
      { apiName: 'flag', type: 'boolean', description: 'Znacznik.' },
    );
    expect(ocen(o).znaleziska.filter((z) => z.id === 'P14'),
      'słowo bez pokrycia w źródle produkuje szum, którego czytelnik nie ma jak podważyć').toEqual([]);
  });

  it('P11 (1.3) · KLUCZ GŁÓWNY nie jest „powtórzeniem bez typu współdzielonego” — ma go KAŻDY typ z definicji', () => {
    const o = czysta();
    for (const n of ['Shipment', 'Payment', 'Refund']) {
      o.objectTypes.push({
        apiName: n, description: `Dokument ${n} w obiegu rozliczeń.`,
        primaryKey: 'id', titleProperty: 'id', status: 'active', visibility: 'normal',
        implements: [], properties: [{ apiName: 'id', type: 'string', required: true, description: `Klucz ${n}.` }],
      });
    }
    const p11 = ocen(o).znaleziska.filter((z) => z.id === 'P11');
    expect(p11.map((z) => z.co),
      '`id` na trzech typach to definicja platformy, a nie zbieżność do posprzątania').toEqual([]);
  });

  it('P11 (1.3) · pole Z KONTRAKTU INTERFEJSU nie jest powtórzeniem — metadane mieszkają NA INTERFEJSIE', () => {
    /* „To implement an interface, an object type must contain the interface's shared properties
       or declare a mapping of existing object properties onto the interface shared properties.”
       Obie drogi są tu sprawdzone: pole o TEJ SAMEJ nazwie i pole ZMAPOWANE pod inną. */
    const zKontraktem = (mapuj) => {
      const o = czysta();
      o.interfaces.push({
        apiName: 'Occupancy', description: 'Cokolwiek zajmuje zasób w czasie.',
        status: 'active', properties: [{ apiName: 'startsAt', type: 'timestamp' }],
        actionConstraints: [], implementedBy: [],
      });
      for (const n of ['Booking', 'Outage', 'Training']) {
        o.objectTypes.push({
          apiName: n, description: `Zajętość rodzaju ${n}.`,
          primaryKey: 'id', titleProperty: 'id', status: 'active', visibility: 'normal',
          implements: ['Occupancy'],
          implementsDetails: mapuj
            ? [{ interface: 'Occupancy', mapping: { startsAt: 'beginsAt' }, linkMapping: {}, actionMapping: {} }]
            : [],
          properties: [
            { apiName: 'id', type: 'string', required: true, description: `Klucz ${n}.` },
            { apiName: mapuj ? 'beginsAt' : 'startsAt', type: 'timestamp', description: 'Początek zajętości.' },
          ],
        });
      }
      return ocen(o).znaleziska.filter((z) => z.id === 'P11').map((z) => z.co);
    };
    expect(zKontraktem(false), 'pole o nazwie z kontraktu — kontrakt JEST centralą metadanych').toEqual([]);
    expect(zKontraktem(true), 'pole ZMAPOWANE na kontrakt — ta sama centrala, inna nazwa u implementatora').toEqual([]);
  });

  it('P11 (1.3) · zbieżność BEZ kontraktu i BEZ klucza trafia dalej — reguła nie zmiękła, tylko przestała kłamać', () => {
    const o = czysta();
    for (const n of ['Press', 'Cutter', 'Laminator']) {
      o.objectTypes.push({
        apiName: n, description: `Maszyna ${n} na hali.`,
        primaryKey: 'id', titleProperty: 'id', status: 'active', visibility: 'normal',
        implements: [], properties: [
          { apiName: 'id', type: 'string', required: true, description: `Klucz ${n}.` },
          { apiName: 'webWidthMm', type: 'int', description: 'Szerokość wstęgi w milimetrach.' },
        ],
      });
    }
    expect(ocen(o).znaleziska.filter((z) => z.id === 'P11').length,
      'pole powtórzone na trzech typach, za którym nie stoi ani jedna deklaracja').toBe(1);
  });

  it('P19/P20 · Action Sprawl — po liczbie akcji na typ i po nazwie `set[Pole]`', () => {
    const o = czysta();
    for (let i = 0; i < 11; i += 1) {
      o.actionTypes.push({
        apiName: `setPole${i}`, description: `Ustawia pole ${i}.`, status: 'active',
        parameters: [{ apiName: 'v', type: 'string', required: true }],
        rules: [{ op: 'modify', target: `Invoice.pole${i}` }],
        submissionCriteria: [{ id: 'x', on: 'v', operator: 'not-null', message: 'podaj' }],
      });
    }
    const t = trafienia(o);
    expect(t.has('P19'), 'ponad 10 akcji na jednym typie').toBe(true);
    expect(t.has('P20'), 'nazwa `set[Pole]` przy jednej edycji jednego pola').toBe(true);
    /* Akcja o nazwie opisującej OPERACJĘ nie jest sprawlem, choćby zmieniała jedno pole. */
    const o2 = czysta();
    o2.actionTypes.push({
      apiName: 'approveInvoice', description: 'Zatwierdza fakturę do wysyłki.', status: 'active',
      parameters: [{ apiName: 'invoice', type: 'reference', required: true }],
      rules: [{ op: 'modify', target: 'Invoice.approvalState' }],
      submissionCriteria: [{ id: 'x', on: 'invoice', operator: 'not-null', message: 'wskaż' }],
    });
    expect(trafienia(o2).has('P20')).toBe(false);
  });

  /* ══════════════════════════════════════════════════════════════════════════════════════
     ZESTAW 1.5 · DWIE KOLEJNE REGUŁY DOSTROJONE DO DOKUMENTACJI (3.0 · K9)
     ──────────────────────────────────────────────────────────────────────────────────────
     Ten sam powód, co przy 1.3: reguła była OSTRZEJSZA niż źródło, na które się powołuje.
     `P15` karał model za to, że ROZRÓŻNIA TYPY słowem; `P20` — za to, że ZGRUPOWAŁ pola
     w strukturę zamiast je spłaszczyć, czyli za wykonanie sąsiedniej reguły. Testy stoją na
     SYNTETYCZNYM kanonie, bo rozjemcą jest dokumentacja, a nie nasz plik.
     ══════════════════════════════════════════════════════════════════════════════════════ */

  it('P15 (1.5) · konwencja ROZRÓŻNIAJĄCA TYP jest JEDNĄ konwencją — `…At` dla chwili, `…Date` dla dnia', () => {
    const o = czysta();
    o.objectTypes[0].properties.push(
      { apiName: 'createdAt', type: 'timestamp', description: 'Chwila założenia dokumentu.' },
      { apiName: 'approvedAt', type: 'timestamp', description: 'Chwila zatwierdzenia.' },
      { apiName: 'dueDate', type: 'date', description: 'Dzień wymagalności.' },
    );
    expect(ocen(o).znaleziska.filter((z) => z.id === 'P15'),
      'model rozróżniający chwilę od dnia SŁOWEM dostaje znalezisko za konsekwencję — a Foundry '
      + 'żąda „a single convention consistently” (docs:20113), nie „jednego słowa”').toEqual([]);
  });

  it('P15 (1.5) · TO SAMO SŁOWO O DWÓCH TYPACH dalej zapala — reguła nie zmiękła, tylko przestała kłamać', () => {
    const o = czysta();
    o.objectTypes[0].properties.push(
      { apiName: 'createdAt', type: 'timestamp', description: 'Chwila założenia.' },
      { apiName: 'shippedAt', type: 'date', description: 'Dzień wysyłki — ale pod słowem CHWILI.' },
    );
    const z = ocen(o).znaleziska.filter((x) => x.id === 'P15');
    expect(z.length, 'jedno słowo niosące raz chwilę, a raz dzień, to konwencja, która nic nie znaczy').toBe(1);
    expect(z[0].co, 'znalezisko nie mówi, KTÓRE słowo się rozjechało').toMatch(/…at/);
  });

  it('P15 (1.5) · DWIE FORMY ZAPISU zapalają — to jest DOKŁADNIE zły przykład z dokumentacji', () => {
    const o = czysta();
    o.objectTypes[0].properties.push(
      { apiName: 'createdDate', type: 'date', description: 'Dzień założenia.' },
      { apiName: 'dateOfApproval', type: 'date', description: 'Dzień zatwierdzenia — prefiksem.' },
    );
    const z = ocen(o).znaleziska.filter((x) => x.id === 'P15');
    expect(z.length, '„Mixing `createdDate` and `dateOfCreation`” jest w dokumentacji kolumną '
      + 'ZŁYCH przykładów (docs:20113)').toBe(1);
    expect(z[0].co).toMatch(/dwie formy zapisu/);
  });

  it('P15 (1.5) · pole BEZ SŁOWA CZASU tej reguły nie dotyczy — o nie pyta `P14`', () => {
    const o = czysta();
    o.objectTypes[0].properties.push(
      { apiName: 'createdAt', type: 'timestamp', description: 'Chwila założenia.' },
      { apiName: 'plannedCompletion', type: 'timestamp', description: 'Kiedy to wyjdzie.' },
      { apiName: 'materialDelivery', type: 'date', description: 'Dostawa surowca.' },
    );
    expect(ocen(o).znaleziska.filter((z) => z.id === 'P15'),
      'reguła o KONWENCJI NAZW zaczęła orzekać o tym, czy nazwa w ogóle mówi o czasie').toEqual([]);
  });

  it('P20 (1.5) · akcja podmieniająca STRUKTURĘ nie jest akcją jednopolową', () => {
    const o = czysta();
    o.objectTypes[0].properties.push({
      apiName: 'billingAddress', type: 'struct', typeRaw: 'struct(Address)',
      description: 'Adres do faktury: ulica, miasto, kod.',
    });
    o.actionTypes.push({
      apiName: 'updateBillingAddress', description: 'Zmienia adres do faktury.', status: 'active',
      parameters: [{ apiName: 'address', type: 'struct', required: true }],
      rules: [{ op: 'modify', target: 'Invoice.billingAddress' }],
      submissionCriteria: [{ id: 'x', on: 'address', operator: 'not-null', message: 'podaj adres' }],
    });
    expect(ocen(o).znaleziska.filter((z) => z.id === 'P20'),
      'akcja zmieniająca GRUPĘ POWIĄZANYCH PÓL w jednym zgłoszeniu robi dokładnie to, o co prosi '
      + 'kolumna „Prefer” (docs:20592) — karanie jej to karanie za wykonanie reguły o strukturach '
      + '(docs:19928)').toEqual([]);
  });

  /* Skrót na trzy testy niżej: jedna akcja `set[Pole]` pisząca dokładnie jedno pole skalarne. */
  const jednopolowa = (pole, typPola = 'string') => ({
    apiName: `set${pole[0].toUpperCase()}${pole.slice(1)}`,
    description: `Ustawia ${pole}.`, status: 'active',
    parameters: [{ apiName: 'v', type: typPola, required: true }],
    rules: [{ op: 'modify', target: `Invoice.${pole}` }],
    submissionCriteria: [{ id: 'x', on: 'v', operator: 'not-null', message: 'podaj' }],
  });

  it('P20 (1.5) · DWIE akcje na dwóch RÓŻNYCH polach skalarnych zapalają — to jest „many”', () => {
    const o = czysta();
    o.objectTypes[0].properties.push(
      { apiName: 'internalNote', type: 'string', description: 'Notatka.' },
      { apiName: 'externalRef', type: 'string', description: 'Odsyłacz do systemu klienta.' },
    );
    o.actionTypes.push(jednopolowa('internalNote'), jednopolowa('externalRef'));
    const z = ocen(o).znaleziska.filter((x) => x.id === 'P20');
    expect(z.length, 'dwie akcje, każda na innym polu skalarnym tego samego typu, to dokładnie '
      + '„many narrowly-scoped action types that EACH modify a single property” (docs:20553) '
      + '— i dopiero tu jest co z czym zepnąć w jedną operację (docs:20592)').toBe(2);
    expect(z[0].co, 'znalezisko nie mówi, że chodzi o pole SKALARNE').toMatch(/SKALARNEJ/);
  });

  /* ⚠ DRUGI WARUNEK DOSTROJENIA (zestaw 1.5, dopisek integratora do K9-5): ROZDROBNIENIE
     WYMAGA MNOGOŚCI. Anty-wzorzec brzmi „Creating MANY single-property actions INSTEAD OF
     cohesive business operations” (`docs:20222`), a rozwiązaniem jest „bundle RELATED changes”
     (`docs:20592`) — jedno i drugie zakłada DRUGĄ edycję, którą dałoby się dołożyć. Wiersz
     karty o jednej edytowalnej liczbie jest CAŁĄ operacją, a nie jej kawałkiem. */
  it('P20 (1.5) · JEDYNA taka akcja na typie NIE jest rozdrobnieniem — nie ma się z czym zepnąć', () => {
    const o = czysta();
    o.objectTypes[0].properties.push({ apiName: 'internalNote', type: 'string', description: 'Notatka.' });
    o.actionTypes.push(jednopolowa('internalNote'));
    expect(ocen(o).znaleziska.filter((z) => z.id === 'P20'),
      'jedna akcja to nie „many” (docs:20222), a „bundle related changes into meaningful '
      + 'workflows” (docs:20592) nie ma tu czego zbundlować — reguła byłaby OSTRZEJSZA od źródła')
      .toEqual([]);
  });

  it('P20 (1.5) · dwie akcje na TYM SAMYM polu to nie rozdrobnienie, tylko dwa gesty o jednej wartości', () => {
    const o = czysta();
    o.objectTypes[0].properties.push({ apiName: 'internalNote', type: 'string', description: 'Notatka.' });
    o.actionTypes.push(jednopolowa('internalNote'), {
      ...jednopolowa('internalNote'), apiName: 'setInternalNoteFromTemplate',
      description: 'Ustawia notatkę z szablonu.',
    });
    expect(ocen(o).znaleziska.filter((z) => z.id === 'P20'),
      'rozdrobnienie to „KAWAŁKI” jednej operacji na RÓŻNYCH polach — dwie drogi do tej samej '
      + 'wartości nie dają się scalić w szerszą operację biznesową').toEqual([]);
  });

  it('P20 (1.5) · akcje na DWÓCH RÓŻNYCH typach nie sumują się — reguła liczy w obrębie typu', () => {
    const o = czysta();
    o.objectTypes[0].properties.push({ apiName: 'internalNote', type: 'string', description: 'Notatka.' });
    o.objectTypes.push({
      apiName: 'Customer', description: 'Kontrahent.', primaryKey: 'customerId',
      titleProperty: 'customerName', status: 'active', visibility: 'normal', implements: [],
      properties: [
        { apiName: 'customerId', type: 'string', required: true, description: 'Klucz.' },
        { apiName: 'customerName', type: 'string', required: true, description: 'Nazwa.' },
        { apiName: 'creditLimit', type: 'double', description: 'Limit kupiecki.' },
      ],
    });
    o.actionTypes.push(jednopolowa('internalNote'), {
      apiName: 'setCreditLimit', description: 'Ustawia limit kupiecki.', status: 'active',
      parameters: [{ apiName: 'v', type: 'double', required: true }],
      rules: [{ op: 'modify', target: 'Customer.creditLimit' }],
      submissionCriteria: [{ id: 'x', on: 'v', operator: 'not-null', message: 'podaj' }],
    });
    expect(ocen(o).znaleziska.filter((z) => z.id === 'P20'),
      'wskaźnikiem sprawlu jest „More than 10 action types for A SINGLE OBJECT TYPE” '
      + '(docs:20565) — liczenie w poprzek typów robiłoby z każdego modelu sprawl').toEqual([]);
  });

  it('P24 · ⚠ pole POCHODNE edytowane przez akcję — tego nie da się zbudować w Foundry', () => {
    const o = czysta();
    o.objectTypes[0].properties.push({
      apiName: 'lineCount', type: 'integer', description: 'Liczba pozycji faktury.',
      derived: { by: 'countLines' },
    });
    expect(trafienia(o).has('P24'), 'samo pole pochodne jeszcze nie jest błędem').toBe(false);
    o.actionTypes.push({
      apiName: 'recount', description: 'Przelicza pozycje.', status: 'active',
      parameters: [{ apiName: 'invoice', type: 'reference', required: true }],
      rules: [{ op: 'modify', target: 'Invoice.lineCount' }],
      submissionCriteria: [{ id: 'x', on: 'invoice', operator: 'not-null', message: 'wskaż' }],
    });
    const z = ocen(o).znaleziska.find((x) => x.id === 'P24');
    expect(z, 'edycja pola pochodnego musi być zgłoszona').toBeTruthy();
    expect(z.klasa, 'to jest ZŁAMANIE, nie uwaga — platforma odmówi zapisu').toBe('zlamanie');
  });

  it('P32 · link nie może być dojrzalszy niż jego końce', () => {
    const o = czysta();
    o.objectTypes[1].status = 'experimental';
    expect(trafienia(o).has('P32'), 'link `active` między `active` a `experimental`').toBe(true);
    o.linkTypes[0].status = 'experimental';
    expect(trafienia(o).has('P32'), 'po zrównaniu zarzut znika').toBe(false);
  });

  it('P35/P37/P38/P39 · klucz główny: brak, wycofywany człon, niedeterminizm, w pustkę', () => {
    const bezKlucza = czysta(); delete bezKlucza.objectTypes[0].primaryKey;
    expect(trafienia(bezKlucza).has('P35')).toBe(true);

    const wPustke = czysta(); wPustke.objectTypes[0].primaryKey = 'nieMaTakiegoPola';
    expect(trafienia(wPustke).has('P39')).toBe(true);

    const losowy = czysta();
    losowy.objectTypes[0].primaryKey = 'rowNum';
    losowy.objectTypes[0].properties.push({ apiName: 'rowNum', type: 'integer', description: 'Numer wiersza z eksportu.' });
    expect(trafienia(losowy).has('P38')).toBe(true);

    const zSunsetem = czysta();
    zSunsetem.objectTypes[0].primaryKey = ['invoiceId', 'environment'];
    zSunsetem.objectTypes[0].properties.push({
      apiName: 'environment', type: 'string', description: 'Środowisko.',
      sunset: { replacedBy: '—', why: 'środowisko jest stosem, nie polem' },
    });
    const t = trafienia(zSunsetem);
    expect(t.has('P37'), 'człon klucza przeznaczony do wycofania').toBe(true);
    expect(t.has('P36'), 'przy okazji: klucz złożony').toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   PARSER YAML — BLOKI `|` I `>`
   ──────────────────────────────────────────────────────────────────────────────────────────
   ⚠ TA GRUPA POWSTAŁA Z REALNEJ ODMOWY, NIE Z OSTROŻNOŚCI. Ktoś spoza zespołu wrzucił swoją
   ontologię (34 typy, wszystkie opisy blokami `>-`) i dostał TRZY RAZY pod rząd:
       „ani JSON, ani YAML: nie rozumiem linii: «Lustro konta z serwisu identity…»”
   Komunikat wskazywał PIERWSZĄ LINIĘ TREŚCI zamiast nagłówka bloku, więc mylił o jedną linię
   i o całą przyczynę — a przyczyną było to, że parser nie znał składni, którą pisze KAŻDY,
   kto ma opis dłuższy niż linia (i którą wypluwa każdy model poproszony o przepisanie
   schematu na nasz szablon — czyli dokładnie to, o co prosi krok 2 na stronie).
   Reguły zwijania są tu sprawdzane CO DO ZNAKU, bo to one decydują o cudzym TEKŚCIE.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
describe('parser YAML — bloki `|` i `>`', () => {
  const y = (t) => wczytajTekst(t).dane;

  it('⚠ `>-` — dokładnie ten plik, który narzędzie ODRZUCAŁO', () => {
    const wejscie = [
      'objectTypes:',
      '  - apiName: Account',
      '    description: >-',
      '      Lustro konta z serwisu identity, który jest jedynym źródłem prawdy o haśle,',
      '      sesji i roli. Tabela `users`.',
      '    primaryKey: accountId',
    ].join('\n');
    const o = y(wejscie).objectTypes[0];
    expect(o.description).toBe(
      'Lustro konta z serwisu identity, który jest jedynym źródłem prawdy o haśle, sesji i roli. Tabela `users`.');
    /* ⚠ I klucz PO bloku musi wrócić na swoje miejsce — blok, który zjada następną linię,
       gubiłby dane po cichu, czyli gorzej niż odmową. */
    expect(o.primaryKey).toBe('accountId');
  });

  it('cztery odmiany bloku zwijają się wedle YAML-a, co do znaku', () => {
    expect(y('a: |\n  jeden\n  dwa\n').a).toBe('jeden\ndwa\n');      // literał, domyślne ucięcie
    expect(y('a: |-\n  jeden\n  dwa\n').a).toBe('jeden\ndwa');        // literał, `-`
    expect(y('a: >\n  jeden\n  dwa\n').a).toBe('jeden dwa\n');        // zwijany, domyślne
    expect(y('a: >-\n  jeden\n  dwa\n').a).toBe('jeden dwa');          // zwijany, `-`
    expect(y('a: |+\n  jeden\n\n\nb: 1\n').a).toBe('jeden\n\n\n');   // `+` trzyma ogon
  });

  it('⚠ TRZY REGUŁY ZWIJANIA, KTÓRE ZMIENIAJĄ TEKST — i dlatego stoją w teście', () => {
    /* pusta linia daje ZNAK KOŃCA LINII, a nie spację */
    expect(y('a: >-\n  jeden\n\n  dwa\n').a).toBe('jeden\ndwa');
    /* linia WCIĘTA GŁĘBIEJ zostaje dosłownie, ze swoim wcięciem… */
    expect(y('a: >-\n  jeden\n   wciete\n  dwa\n').a).toBe('jeden\n wciete\ndwa');
    /* …a jawne wcięcie liczy się OD NAGŁÓWKA i działa w obu kolejnościach wskaźników */
    expect(y('a: |2-\n   jeden\n').a).toBe(' jeden');
    expect(y('a: |-2\n   jeden\n').a).toBe(' jeden');
  });

  it('blok stoi też w pozycji listy — z kluczem i bez', () => {
    expect(y('xs:\n  - opis: >-\n      jeden\n      dwa\n    id: 5\n').xs).toEqual([{ opis: 'jeden dwa', id: 5 }]);
    expect(y('xs:\n  - >-\n      jeden dwa\n').xs).toEqual(['jeden dwa']);
  });

  it('⚠ CIAŁO BLOKU JEST TEKSTEM, NIE SKŁADNIĄ', () => {
    /* Myślnik w literale to kreska w zdaniu, a nie pozycja listy; dwukropek to dwukropek,
       a nie klucz. Bez tego blok z wypunktowaniem rozsadzałby strukturę dokumentu. */
    expect(y('a: |-\n  - to nie lista\n  - druga\nb: 2\n')).toEqual({ a: '- to nie lista\n- druga', b: 2 });
    expect(y('a: |-\n  klucz: nie mapa\nb: 2\n')).toEqual({ a: 'klucz: nie mapa', b: 2 });
    /* …ani nagłówek bloku w środku bloku */
    expect(y('a: |-\n  opis: |\n    wciete\n  druga\nb: 2\n').a).toBe('opis: |\n  wciete\ndruga');
  });

  it('blok bez ciała jest pustym napisem, a nie połkniętym kluczem', () => {
    expect(y('a: >-\nb: 2\n')).toEqual({ a: '', b: 2 });
  });

  it('po bloku dokument wraca na swój poziom — także do mapy zagnieżdżonej', () => {
    expect(y('a: >-\n  tekst\nb: 2\nc:\n  d: 3\n')).toEqual({ a: 'tekst', b: 2, c: { d: 3 } });
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   PLIK PO BIBLIOTECE YAML — kształt, którego NIKT nie wybiera świadomie
   ──────────────────────────────────────────────────────────────────────────────────────────
   ⚠ TRZECIA ODMOWA Z RZĘDU NA POPRAWNYM PLIKU. Ten sam człowiek spoza zespołu wrzucił swoją
   ontologię po raz trzeci — tym razem przepuszczoną przez bibliotekę YAML — i dostał
   „linia 59: pozycja listy poza listą — «- apiName: Account»". Emiter zapisuje sekwencję na
   TYM SAMYM wcięciu co klucz, łamie długie wartości co ~100 znaków i cytuje je, gdy trzeba.
   Nikt tego nie wybiera: tak po prostu wychodzi z `yaml.safe_dump`.
   ⚠ WZORCEM JEST PRAWDZIWY PARSER, NIE NASZE WYOBRAŻENIE. Fikstura obok (`walidator-emiter.*`)
   to plik wygenerowany PyYAML-em razem z jego własnym odczytem — jeżeli kiedyś się rozjedziemy,
   to widać po stronie, która ma rację.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
describe('parser YAML — plik po bibliotece (emiter)', () => {
  const y2 = (t) => wczytajTekst(t).dane;

  it('⚠ CZYTAMY TO SAMO, CO PRAWDZIWY PARSER — co do znaku', () => {
    const tekst = czytaj('tests/fixtures/walidator-emiter.yaml');
    const wzorzec = JSON.parse(czytaj('tests/fixtures/walidator-emiter.json'));
    expect(wczytajTekst(tekst).dane).toEqual(wzorzec);
  });

  it('⚠ SEKWENCJA WOLNO STAĆ NA TYM SAMYM WCIĘCIU CO KLUCZ — to był ten błąd', () => {
    /* `wciecie + 1` jako miejsce dziecka było ZAŁOŻENIEM, nie odczytem: przy zerowym wcięciu
       pierwszy myślnik zdejmował własną listę ze stosu. */
    expect(y2('objectTypes:\n- apiName: Account\n  status: active\n- apiName: Task\n'))
      .toEqual({ objectTypes: [{ apiName: 'Account', status: 'active' }, { apiName: 'Task' }] });
    /* …i tak samo GŁĘBIEJ w drzewie, gdzie lista siedzi pod kluczem pozycji listy. */
    expect(y2('a:\n- b:\n  - c\n').a[0].b).toEqual(['c']);
  });

  it('wartość łamana na kilka linii — w apostrofach, w cudzysłowie i bez cudzysłowu', () => {
    expect(y2("a: 'jeden\n  dwa'\n").a).toBe('jeden dwa');
    expect(y2('a: "jeden\n  dwa"\n').a).toBe('jeden dwa');
    expect(y2('a: jeden\n  dwa\nb: 2\n')).toEqual({ a: 'jeden dwa', b: 2 });
    /* ⚠ `''` w apostrofach to APOSTROF, a nie koniec cytatu. */
    expect(y2("a: 'to jest don''t'\n").a).toBe("to jest don't");
  });

  it('⚠ `\\` NA KOŃCU LINII ZNACZY ZŁAMANIE BEZ SPACJI — i to w KAŻDYM kawałku', () => {
    /* Emiter łamie długi tekst również w środku wyrazu i zaznacza to backslashem. Pierwsza
       wersja honorowała znacznik tylko przy drugim kawałku, więc z „rozerwałoby" robiło się
       „rozerwał oby", a z „czego identity" — „czego  identity". */
    expect(y2('a: "roz\\\n  \\erwałoby"\n').a).toBe('rozerwałoby');
    expect(y2('a: "jeden\\\n  \\ dwa\\\n  \\ trzy"\n').a).toBe('jeden dwa trzy');
  });

  it('⚠ POLSKIE ZNAKI JAKO ESCAPE — emiter domyślnie NIE pisze unicode', () => {
    /* `allow_unicode=False` jest w PyYAML-u DOMYŚLNE, więc „Zamówienie" jedzie jako
       `"Zam\xF3wienie"`. Bez odkodowania czytelnik widział w raporcie backslashe. */
    expect(y2('a: "Zam\\xF3wienie"\n').a).toBe('Zamówienie');
    expect(y2('a: "d\\u0142ugi"\n').a).toBe('długi');
    /* W APOSTROFACH escape'ów nie ma — backslash jest backslashem. */
    expect(y2("a: 'Zam\\xF3wienie'\n").a).toBe('Zam\\xF3wienie');
  });

  it('klucz bywa cytowany, otagowany albo pusty', () => {
    expect(y2('- "apiName": "Order"\n')).toEqual([{ apiName: 'Order' }]);
    /* ⚠ `!!bool "true":` przywozi round-trip przez YAML 1.1, gdzie klucz `on` jest BOOLEANEM. */
    expect(y2('a:\n  !!bool "true": order\n').a).toEqual({ true: 'order' });
    expect(y2('a: !!bool \'true\'\nb: !!str 123\n')).toEqual({ a: true, b: '123' });
    /* Klucz, pod którym nie ma nic, jest PUSTĄ WARTOŚCIĄ — tak czyta go każdy parser. */
    expect(y2('a:\nb: 2\n')).toEqual({ a: null, b: 2 });
    /* …a wartość wolno postawić linię niżej. */
    expect(y2('a:\n  bez dwukropka\n')).toEqual({ a: 'bez dwukropka' });
  });

  it('⚠ PLIK KOLEGI OTWIERA SIĘ W CAŁOŚCI — 30 typów, nie komunikat', () => {
    /* Regresja na SKRÓCIE prawdziwego zgłoszenia: gdyby któraś z tych rzeczy znów przestała
       działać, plik nie tyle dostałby zły wynik, co NIE OTWORZYŁBY SIĘ WCALE. */
    const o = normalizuj(wczytajTekst(czytaj('tests/fixtures/walidator-emiter.yaml')).dane);
    expect(o.formatWejscia).toBe('foundry');
    expect(o.objectTypes).toHaveLength(2);
    expect(o.objectTypes[0].properties).toHaveLength(3);
    expect(o.actionTypes[0].apiName).toBe('planOrder');
    expect(ocen(o).wynik).toBeGreaterThan(0);
  });
});

describe('parser YAML — komunikat ma się dać naprawić', () => {
  const y2 = (t) => wczytajTekst(t).dane;

  it('⚠ BŁĄD NIESIE NUMER LINII', () => {
    /* Bez numeru autor pliku widzi zdanie ze środka własnego opisu i nie ma jak zgadnąć,
       że chodzi o linię WYŻEJ. Dokładnie to zdarzyło się przy zgłoszeniu z 15.09.2026.
       ⚠ Wejście jest takie, które ODRZUCA TAKŻE PRAWDZIWY PARSER (PyYAML: ScannerError) —
       inaczej test pilnowałby naszej niedoróbki zamiast komunikatu. */
    expect(() => wczytajTekst('a: 1\nbez dwukropka\n')).toThrow(/linia 2/);
  });

  it('⚠ ŻADNEJ RADY „ZAPISZ TO BLOKIEM” — bo nie ma już przypadku, w którym byłaby trafna', () => {
    /* Rada istniała, dopóki odrzucaliśmy wartość łamaną na kilka linii. Dziś taka wartość
       czyta się normalnie, więc po tej stronie zostały wyłącznie linie NAPRAWDĘ popsute —
       a im rada o blokach kazała naprawiać nie to. Zdjęta razem ze swoim powodem. */
    expect(czytaj('engine/normalizuj.mjs'))
      .not.toMatch(/wielolinijkowy opis zapisz blokiem/);
    let blad;
    try { wczytajTekst('objectTypes:\n  - apiName: A\n  źle wcięte\n'); } catch (e) { blad = e.message; }
    expect(blad).toMatch(/linia 3/);
    expect(blad).not.toMatch(/>-/);
  });

  it('⚠ ZNAKI ZEROWEJ SZEROKOŚCI SĄ ZDEJMOWANE, ale ZWJ i ZWNJ ZOSTAJĄ', () => {
    /* U+200B nie jest dla `trim()` białą spacją, więc linia z samym tym znakiem była
       „treścią”, której parser nie rozumiał — a komunikat pokazywał ZNAK, KTÓREGO NIE WIDAĆ.
       Tekst przeklejony z czatu nosi je między blokami. */
    expect(y2('a: 1\n\u200b\nb: 2\n')).toEqual({ a: 1, b: 2 });
    /* ⚠ A TEGO RUSZYĆ NIE WOLNO: ZWJ spaja emoji, ZWNJ litery w piśmie perskim i indyjskim —
       ich zdjęcie zmieniłoby cudzy TEKST, zamiast posprzątać po wklejeniu. */
    expect(y2('a: "x\u200dy\u200cz"\n').a).toBe('x\u200dy\u200cz');
  });
});

describe('normalizator — przyjmuje oba kształty i nie zgaduje', () => {
  it('krotności tłumaczą się w obie strony', () => {
    expect(krotnosc('N:1')).toBe('MANY_TO_ONE');
    expect(krotnosc('MANY_TO_MANY')).toBe('MANY_TO_MANY');
    expect(krotnosc('1:N')).toBe('ONE_TO_MANY');
    expect(krotnosc('bzdura')).toBeNull();
  });

  it('szablon YAML parsuje się i jest wzorem — 100/100', () => {
    const { dane, skladnia } = wczytajTekst(czytaj('web/public/szablon.yaml'));
    expect(skladnia).toBe('yaml');
    const r = ocen(normalizuj(dane));
    expect(r.znaleziska.map((z) => `${z.id} ${z.co}`), 'szablon ma być wzorem, nie „prawie”').toEqual([]);
    expect(r.wynik).toBe(100);
  });

  it('szablon JSON niesie DOKŁADNIE to samo co YAML — inaczej rozjadą się pierwszego dnia', () => {
    const y = wczytajTekst(czytaj('web/public/szablon.yaml')).dane;
    const j = wczytajTekst(czytaj('web/public/szablon.json')).dane;
    expect(j).toEqual(y);
  });

  it('wejście, które nie jest ontologią, odmawia Z POWODEM', () => {
    expect(() => wczytajTekst('')).toThrow(/puste/);
    expect(() => wczytajTekst('{niepoprawny json')).toThrow();
    expect(normalizuj({ cokolwiek: 1 })).toBeNull();
  });
});

describe('przykład zły — fikstura uczy i pilnuje zasięgu reguł', () => {
  const zly = () => normalizuj(JSON.parse(czytaj('web/public/przyklad-zly.json')));

  it('łapie wszystkie wzorce, dla których został napisany', () => {
    const t = trafienia(zly());
    for (const [id, po_co] of [
      ['P05', 'ErpOrderData — silos systemowy'],
      ['P06', 'ContractV2 — wersja w nazwie'],
      ['P07', 'trzy kopie kontrahenta'],
      ['P12', 'Item — nazwa ogólna'],
      ['P20', 'jedenaście akcji set[Pole]'],
      ['P21', 'recalculateAllTotals — akcja bez parametrów'],
      ['P39', 'Item — klucz w pustkę'],
    ]) expect(t.has(id), `${id} (${po_co}) nie trafił`).toBe(true);
  });

  it('wynik jest wyraźnie niższy niż szablonu — inaczej narzędzie niczego nie rozróżnia', () => {
    const zlyWynik = ocen(zly()).wynik;
    const dobryWynik = ocen(normalizuj(wczytajTekst(czytaj('web/public/szablon.yaml')).dane)).wynik;
    expect(dobryWynik).toBe(100);
    expect(zlyWynik).toBeLessThan(65);
  });
});

describe('wersja zestawu reguł', () => {
  it('numer ma DWIE liczby i idzie co 0.1 — konwencja domu, nie semver', () => {
    expect(WERSJA, `„${WERSJA}” nie wygląda jak N.M`).toMatch(/^\d+\.\d+$/);
  });

  it('numer jedzie w KAŻDYM raporcie — bez niego nie wiadomo, czy dwa wyniki da się porównać', () => {
    const r = ocen(czysta());
    expect(r.wersjaRegul).toBe(WERSJA);
  });

  it('⚠ strona pokazuje TĘ SAMĄ wersję co silnik — rozjazd tych dwóch miejsc jest kłamstwem', () => {
    /* Odznaka ma w HTML-u wartość statyczną (żeby strona mówiła prawdę także z `file://`),
       więc nic poza tym testem nie pilnuje, żeby nie została przy starym numerze. */
    const html = czytaj('web/public/index.html');
    const m = html.match(/id="znaczekWersji"[^>]*>wersja ([\d.]+)</);
    expect(m, 'nie znalazłem odznaki wersji w index.html').toBeTruthy();
    expect(m[1], `strona mówi ${m?.[1]}, silnik ${WERSJA}`).toBe(WERSJA);
    /* Akapit z numerem pod lidem zniknął 15.09.2026 (decyzja właściciela: odznaka w rogu wystarcza, a to, jak
       rośnie numer, stoi w zakładce „Jak liczymy wynik”) — pilnujemy już tylko odznaki. */
  });

  it('⚠ WYKŁAD O NUMERACJI NIE WRACA NA STRONĘ GŁÓWNĄ', () => {
    /* Sam komentarz wyżej nie wystarczył: akapit WRÓCIŁ — gałąź odbita przed jego zdjęciem
       przywiozła go z powrotem i właściciel musiał prosić drugi raz. Tego nie łapie przegląd
       kodu, bo w diffie stale nie widać: gałąź nie „dodała akapitu", tylko nie wiedziała, że
       go zdjęto. Łapie to asercja NIEOBECNOŚCI, i po to tu jest.
       Zasada zostaje w zakładce „Jak liczymy wynik" i w CLAUDE.md — na pierwszym ekranie nie
       ma jej czym obronić: czytelnik przyszedł sprawdzić SWÓJ model, a nie przeczytać
       konwencję wersjonowania NASZEGO narzędzia. */
    const html = czytaj('web/public/index.html');
    const glowna = html.slice(0, html.indexOf('<div id="dokumentacja"'));
    expect(glowna, 'akapit o numeracji wrócił nad pole wklejania').not.toMatch(/rośnie co 0,1/);
    expect(glowna).not.toMatch(/akapitWersji/);
  });
});

describe('P44/P45/P46 · typ ONTOLOGII kontra typ z REPOZYTORIUM FUNKCJI', () => {
  /* ⚠ Foundry mówi to wprost: „Custom types used in function signatures are DIFFERENT from the
     generated classes used for Ontology struct properties”. Typ współdzielony jest TYPEM POLA;
     rekord wejścia/wyjścia funkcji żyje w repozytorium kodu funkcji. Te testy pilnują, żeby
     reguła rozstrzygała po UŻYCIU, a nie po tym, w której grupie ktoś wpis postawił. */

  const zTypami = ({ shared = [], fnTypes = [], uzycie = {} } = {}) => {
    const o = czysta();
    o.sharedPropertyTypes = shared;
    o.functionTypes = fnTypes;
    if (uzycie.wlasciwosc) {
      o.objectTypes[0].properties.push({
        apiName: 'poleTestowe', type: uzycie.wlasciwosc, typeRaw: uzycie.wlasciwosc,
        description: 'Pole użyte w teście przynależności typów.',
      });
    }
    if (uzycie.parametr) {
      o.actionTypes[0].parameters.push({
        apiName: 'parametrTestowy', type: uzycie.parametr, typeRaw: uzycie.parametr, required: false,
      });
    }
    if (uzycie.sygnatura) {
      o.functions.push({
        apiName: 'policz', description: 'Funkcja użyta w teście przynależności typów.',
        status: 'active',
        inputs: [{ apiName: 'wejscie', type: uzycie.sygnatura, typeRaw: uzycie.sygnatura }],
        output: { type: 'decimal', typeRaw: 'decimal' },
      });
    }
    if (uzycie.zwrotAkcji) {
      o.actionTypes[0].returns = { type: uzycie.zwrotAkcji, typeRaw: uzycie.zwrotAkcji };
    }
    /* ⚠ KONTRAKT AKCJI — jeden wpis mówiący, co obowiązuje KAŻDĄ akcję. Kanoniczny klucz
       `actionContract`; `kopertaKontraktu` i `wynikKontraktu` to jego dwie połowy. */
    if (uzycie.kopertaKontraktu || uzycie.wynikKontraktu) {
      const typPola = (x) => (x ? { type: x, typeRaw: x } : undefined);
      o.actionContract = {
        envelope: typPola(uzycie.kopertaKontraktu),
        outcome: typPola(uzycie.wynikKontraktu),
        log: 'generated',
      };
    }
    return o;
  };
  const typ = (apiName, fields = []) => ({ apiName, type: 'struct', isStruct: true, fields });

  it('P44 · rekord używany WYŁĄCZNIE przez sygnaturę funkcji nie należy do typów ontologii', () => {
    const t = trafienia(zTypami({
      shared: [typ('SolverInput')],
      uzycie: { sygnatura: 'SolverInput' },
    }));
    expect(t.has('P44')).toBe(true);
  });

  it('⚠ P44 NIE trafia w typ używany przez OBOJE — funkcje normalnie biorą typy ontologiczne', () => {
    /* To jest warunek, który najłatwiej zepsuć przy „porządkowaniu” reguły: pytanie brzmi
       „czy to jest WYŁĄCZNIE typ kodu”, a nie „czy dotyka go funkcja”. */
    const t = trafienia(zTypami({
      shared: [typ('Quantity')],
      uzycie: { wlasciwosc: 'Quantity', sygnatura: 'Quantity' },
    }));
    expect(t.has('P44'), 'typ użyty i jako właściwość, i w sygnaturze ZOSTAJE w ontologii').toBe(false);
  });

  it('P44 NIE trafia w typ używany tylko przez ontologię', () => {
    const t = trafienia(zTypami({ shared: [typ('Quantity')], uzycie: { wlasciwosc: 'Quantity' } }));
    expect(t.has('P44')).toBe(false);
  });

  it('P44 widzi też parametr akcji jako powierzchnię ONTOLOGII', () => {
    const t = trafienia(zTypami({
      shared: [typ('GateVerdict')],
      uzycie: { parametr: 'struct(GateVerdict)', sygnatura: 'struct(GateVerdict)' },
    }));
    expect(t.has('P44'), 'parametr akcji trzyma typ w ontologii').toBe(false);
  });

  it('⚠ P44 liczy ZWROT AKCJI jako powierzchnię KODU, nie ontologii', () => {
    /* W Ontology Managerze akcji nie deklaruje się własnego zwrotu — platforma oddaje swój
       `ActionResults`. Własny rekord zwrotu jest więc tym samym bytem co custom type funkcji.
       Bez tego `platform.ActionOutcome` był dla reguły NIEWIDZIALNY (regresja z pierwszego
       przebiegu: wypadał do P46 jako „nieużywany nigdzie”). */
    const t = trafienia(zTypami({
      shared: [typ('ActionOutcome')],
      uzycie: { zwrotAkcji: 'struct(ActionOutcome)' },
    }));
    expect(t.has('P44'), 'zwrot akcji to typ kodu').toBe(true);
    expect(t.has('P46'), 'i NIE jest sierotą — coś go używa').toBe(false);
  });

  it('⚠ ZAGNIEŻDŻENIE DZIEDZICZY PRZYNALEŻNOŚĆ — w obie strony', () => {
    /* Typ siedzący wyłącznie w środku innego typu nie stoi w żadnej sygnaturze wprost.
       Bez domknięcia reguła oskarżałaby go o złe miejsce, choć model jest poprawny. */
    const wKodzie = trafienia(zTypami({
      shared: [typ('SolverInput', [{ apiName: 'tasks', type: 'list(struct(SolverTask))', typeRaw: 'list(struct(SolverTask))' }]),
        typ('SolverTask')],
      uzycie: { sygnatura: 'SolverInput' },
    }));
    expect(wKodzie.has('P44'), 'oba są typami kodu — zgłoszone razem').toBe(true);
    expect(wKodzie.has('P46'), 'zagnieżdżony NIE jest sierotą').toBe(false);

    const wOntologii = trafienia(zTypami({
      shared: [typ('Address', [{ apiName: 'geo', type: 'struct(GeoPoint)', typeRaw: 'struct(GeoPoint)' }]),
        typ('GeoPoint')],
      uzycie: { wlasciwosc: 'struct(Address)' },
    }));
    expect(wOntologii.has('P44'), 'zagnieżdżony w typie ontologii ZOSTAJE w ontologii').toBe(false);
  });

  it('P45 · typ kodu użyty jako typ WŁAŚCIWOŚCI to złamanie, nie porządek', () => {
    const o = zTypami({ fnTypes: [typ('SolverInput')], uzycie: { wlasciwosc: 'struct(SolverInput)' } });
    const z = ocen(o).znaleziska.find((x) => x.id === 'P45');
    expect(z, 'typ z repozytorium kodu nie ma RID-u — nie da się go wybrać jako typu pola').toBeTruthy();
    expect(z.klasa).toBe('zlamanie');
  });

  it('P45 NIE trafia, gdy typ kodu stoi wyłącznie w sygnaturach', () => {
    const t = trafienia(zTypami({ fnTypes: [typ('SolverInput')], uzycie: { sygnatura: 'SolverInput' } }));
    expect(t.has('P45')).toBe(false);
    expect(t.has('P44'), 'i P44 też milczy — wpis stoi we WŁAŚCIWEJ grupie').toBe(false);
  });

  it('P46 · typ, do którego nic nie sięga', () => {
    expect(trafienia(zTypami({ shared: [typ('Sierota')] })).has('P46')).toBe(true);
    expect(trafienia(zTypami({ shared: [typ('Uzyty')], uzycie: { sygnatura: 'Uzyty' } })).has('P46')).toBe(false);
  });

  /* ══════════════════════════════════════════════════════════════════════════════════════════
     KONTRAKT AKCJI — JEDEN WPIS ZAMIAST KOPII PRZY KAŻDEJ AKCJI (kanon `actionContract`, od 1.1)
     ────────────────────────────────────────────────────────────────────────────────────────
     ⚠ TO JEST FAŁSZYWY ALARM, KTÓRY REGUŁA PRODUKOWAŁA NA POPRAWNYM MODELU. Koperta żądania
     i rekord wyniku zgłoszenia obowiązują KAŻDĄ akcję — u Foundry są kształtem PLATFORMY, więc
     model, który chce je nazwać, deklaruje je RAZ. Silnik liczył `returns` i `envelope` PER AKCJA,
     nie znał pojęcia kontraktu i wypisywał taki typ jako sierotę, a razem z nim wszystko, co
     siedzi w jego środku (domknięcie nie miało od czego zacząć). Poprawka stoi po stronie
     NARZĘDZIA: kanon dostał ogólny klucz, a kontrakt liczy się jak `returns`.
     ══════════════════════════════════════════════════════════════════════════════════════════ */

  it('⚠ typ użyty WYŁĄCZNIE przez kontrakt akcji NIE jest sierotą', () => {
    const t = trafienia(zTypami({
      fnTypes: [typ('ActionOutcome')],
      uzycie: { wynikKontraktu: 'struct(ActionOutcome)' },
    }));
    expect(t.has('P46'), 'kontrakt grupowy JEST użyciem — tak samo jak zwrot pojedynczej akcji').toBe(false);
    expect(t.has('P45'), 'i stoi we WŁAŚCIWEJ grupie, bo kontrakt to powierzchnia KODU').toBe(false);
  });

  it('⚠ typ zagnieżdżony w typie z kontraktu też NIE jest sierotą', () => {
    /* Domknięcie przechodnie działało od 0.2 — brakowało mu ZIARNA. Rekord siedzący w polu
       rekordu z kontraktu nie stoi nigdzie wprost i bez tego ziarna przepadał razem z rodzicem. */
    const t = trafienia(zTypami({
      fnTypes: [
        typ('ActionOutcome', [{ apiName: 'criteria', type: 'list(struct(CriterionResult))', typeRaw: 'list(struct(CriterionResult))' }]),
        typ('CriterionResult'),
      ],
      uzycie: { wynikKontraktu: 'struct(ActionOutcome)' },
    }));
    expect(t.has('P46'), 'dziecko dziedziczy przynależność po rodzicu z kontraktu').toBe(false);
  });

  it('⚠ typ z kontraktu postawiony w grupie ONTOLOGII dalej dostaje P44 — reguła nie zmiękła', () => {
    /* Poprawka miała zdjąć FAŁSZYWY alarm, a nie otworzyć furtkę: kontrakt jest powierzchnią
       KODU, więc typ z kontraktu stojący między typami właściwości jest w złej grupie tak samo,
       jak rekord brany wyłącznie przez sygnaturę funkcji. */
    const t = trafienia(zTypami({
      shared: [typ('ActionEnvelope')],
      uzycie: { kopertaKontraktu: 'struct(ActionEnvelope)' },
    }));
    expect(t.has('P44'), 'typ kodu w grupie ontologii — to się nie zmienia').toBe(true);
    expect(t.has('P46'), 'ale sierotą już nie jest').toBe(false);
  });

  it('kanon BEZ kontraktu zachowuje się dokładnie jak dotąd', () => {
    /* ⚠ Format zapisany po Foundry'emu tego klucza nie ma i mieć nie powinien — koperta i wynik
       zgłoszenia są tam kształtem platformy, nie zasobem ontologii. Brak klucza ma więc znaczyć
       „nie dotyczy”, a nie zmieniać czegokolwiek w liczeniu użyć. */
    const o = zTypami({ shared: [typ('Sierota')], uzycie: { sygnatura: 'Uzyty' } });
    o.sharedPropertyTypes.push(typ('Uzyty'));
    expect(o.actionContract, 'helper bez kontraktu nie zakłada klucza').toBeUndefined();
    const t = trafienia(o);
    expect(t.has('P46'), 'sierota bez kontraktu dalej jest sierotą').toBe(true);
    expect(ocen(o).znaleziska.find((z) => z.id === 'P46').co).toMatch(/`Sierota`/);
  });

  it('brak grupy `functionTypes` NIE jest brakiem — to normalny stan modelu', () => {
    /* Ontologia, która nie rozdziela typów, ma po prostu wszystko w jednej grupie.
       Reguła orzeka o UMIEJSCOWIENIU, nie o obecności grupy. */
    const o = czysta();
    delete o.functionTypes;
    expect(() => ocen(o)).not.toThrow();
    expect(trafienia(o).has('P45')).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   WARSTWA AI — TRYB TANI (klasyfikacja)
   ──────────────────────────────────────────────────────────────────────────────────────────
   ⚠ Te testy NIE wołają żadnego modelu i nie potrzebują klucza. Testują dokładnie to, co jest
   tu warte testowania: CZĘŚCI CZYSTE — co wysyłamy, co robimy z odpowiedzią i czego z niej
   NIE przepuszczamy dalej. Model jest zewnętrzny i niedeterministyczny; nasza obrona przed
   jego pomyłką jest kodem, więc to kod musi być sprawdzony.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('warstwa AI — tryb tani: co wysyłamy', () => {
  const model = () => ({
    objectTypes: [
      { apiName: 'core.Order', properties: [{ apiName: 'id' }, { apiName: 'client' }] },
      { apiName: 'platform.Edit', visibility: 'HIDDEN', properties: [{ apiName: 'before' }, { apiName: 'after' }] },
    ],
  });

  it('wiersz to NAZWA i pola — nic więcej', () => {
    const w = wierszeDoKlasyfikacji(model());
    expect(w[0].wiersz).toBe('core.Order|id,client');
    expect(w[1].wiersz).toBe('platform.Edit|before,after');
  });

  it('pola są przycięte do sześciu — koszt rośnie z każdym, a rozstrzyga pierwszych kilka', () => {
    const o = { objectTypes: [{ apiName: 'X', properties: Array.from({ length: 20 }, (_, i) => ({ apiName: `p${i}` })) }] };
    expect(wierszeDoKlasyfikacji(o)[0].wiersz.split('|')[1].split(',')).toHaveLength(6);
  });

  it('⚠ widoczność jest czytana MAŁYMI LITERAMI — `HIDDEN` i `hidden` to ta sama deklaracja', () => {
    expect(wierszeDoKlasyfikacji(model())[1].visibility).toBe('hidden');
  });

  it('⚠ limit wierszy TNIE i to musi być widać — ocena części nie jest oceną całości', () => {
    const o = { objectTypes: Array.from({ length: 300 }, (_, i) => ({ apiName: `T${i}`, properties: [] })) };
    expect(wierszeDoKlasyfikacji(o)).toHaveLength(200);
  });
});

describe('warstwa AI — tryb tani: co robimy z odpowiedzią', () => {
  const wiersze = () => wierszeDoKlasyfikacji({
    objectTypes: [
      { apiName: 'core.Order', properties: [{ apiName: 'id' }] },
      { apiName: 'platform.Tab', properties: [{ apiName: 'name' }] },
      { apiName: 'platform.Event', visibility: 'hidden', properties: [{ apiName: 'at' }] },
    ],
  });
  const id = (r) => new Set(r.znaleziska.map((z) => z.id));

  it('AI-V1 · maszyneria bez `hidden` trafia', () => {
    const r = znaleziskaZEtykiet(wiersze(), { maszyneria: ['platform.Tab'] });
    expect(id(r).has('AI-V1')).toBe(true);
    expect(r.znaleziska.find((z) => z.id === 'AI-V1').elementy).toEqual(['platform.Tab']);
  });

  it('AI-V1 NIE trafia w maszynerię, która JUŻ jest `hidden` — reguła ma milczeć, gdy jest dobrze', () => {
    const r = znaleziskaZEtykiet(wiersze(), { maszyneria: ['platform.Event'] });
    expect(id(r).has('AI-V1')).toBe(false);
  });

  it('AI-V2 · rzeczownik domeny schowany przed ludźmi trafia', () => {
    /* `platform.Event` ma `hidden`, a model NIE uznał go za maszynerię ⇒ to domena pod `hidden`. */
    const r = znaleziskaZEtykiet(wiersze(), { maszyneria: [] });
    expect(id(r).has('AI-V2')).toBe(true);
  });

  it('AI-V3 · niepewne wychodzą jako DO DECYZJI, nie jako wada modelu', () => {
    const r = znaleziskaZEtykiet(wiersze(), { niepewne: ['core.Order'] });
    const z = r.znaleziska.find((x) => x.id === 'AI-V3');
    expect(z.klasa).toBe('do-decyzji');
    /* Niepewny typ nie może jednocześnie zostać oskarżony o schowaną domenę ani o maszynerię. */
    expect(id(r).has('AI-V1')).toBe(false);
  });

  it('⚠ NAZWA SPOZA WYSŁANEJ TABELI WYPADA — model nie ma jak dopisać do raportu bytu, którego nie ma', () => {
    const r = znaleziskaZEtykiet(wiersze(), { maszyneria: ['platform.Tab', 'ZmyslonyTyp', 'DROP TABLE'] });
    expect(r.maszyneria).toEqual(['platform.Tab']);
    expect(r.pominieto, 'a liczba odrzuconych jest RAPORTOWANA — cicha filtracja ukryłaby, że model zmyśla').toBe(2);
  });

  it('⚠ odpowiedź całkiem od rzeczy nie wywraca raportu, tylko nic nie zgłasza', () => {
    for (const smiec of [null, {}, { maszyneria: 'nie-tablica' }, { maszyneria: [null, 7] }]) {
      const r = znaleziskaZEtykiet(wiersze(), smiec);
      expect(r.znaleziska.filter((z) => z.id === 'AI-V1')).toHaveLength(0);
    }
  });

  it('pominięcie znaczy DOMENA — i podział jest zupełny', () => {
    const r = znaleziskaZEtykiet(wiersze(), { maszyneria: ['platform.Tab'], niepewne: ['platform.Event'] });
    expect(r.domena).toEqual(['core.Order']);
    expect(r.maszyneria.length + r.niepewne.length + r.domena.length).toBe(3);
  });

  it('każde znalezisko AI niesie `jak`, a te o Palantirze także CYTAT — ta sama poprzeczka co dla kodu', () => {
    const r = znaleziskaZEtykiet(wiersze(), { maszyneria: ['platform.Tab'], niepewne: ['core.Order'] });
    for (const z of r.znaleziska) {
      expect(z.jak, `${z.id} bez recepty`).toBeTruthy();
      expect(z.zrodlo, `${z.id} bez pola źródła`).toBeTruthy();
    }
    expect(r.znaleziska.find((z) => z.id === 'AI-V1').zrodlo).toMatch(/non-semantic types as hidden/);
  });

  it('⚠ `hidden` NIE JEST podawane jako zabezpieczenie — to klasyczna pomyłka i recepta musi ją uprzedzać', () => {
    const r = znaleziskaZEtykiet(wiersze(), { maszyneria: ['platform.Tab'] });
    expect(r.znaleziska.find((z) => z.id === 'AI-V1').jak).toMatch(/NIE uprawnienie/);
  });
});

describe('warstwa AI — cache i tryby', () => {
  it('klucz cache\'u zmienia się z KAŻDYM znakiem treści, trybem i modelem', () => {
    const a = kluczCache('klasyfikacja', 'm', 'tresc');
    expect(kluczCache('klasyfikacja', 'm', 'tresc')).toBe(a);
    expect(kluczCache('recenzja', 'm', 'tresc')).not.toBe(a);
    expect(kluczCache('klasyfikacja', 'INNY', 'tresc')).not.toBe(a);
    expect(kluczCache('klasyfikacja', 'm', 'tresC')).not.toBe(a);
  });

  it('⚠ klucz nie niesie treści — to skrót, nie zapis ontologii', () => {
    const k = kluczCache('klasyfikacja', 'm', 'core.TajnyKontrahent|nazwa');
    expect(k).not.toMatch(/Tajny/);
    expect(k).toMatch(/^[0-9a-f]{32}$/);
  });

  it('⚠ DOMYŚLNY TRYB TO DZIŚ PEŁNY SKAN — zmiana świadoma i TYMCZASOWA', () => {
    /* Do 0.5 domyślna była `klasyfikacja` („domyślnie tanio, drogo na życzenie”). Od 0.6 jest
       odwrotnie i powód stoi w `ai.mjs`: reguł jest pięćdziesiąt kilka, a nie wiemy, czego
       wśród nich BRAKUJE — pełny skan jest dziś jedynym narzędziem, które to pokazuje, a jego
       wnioski lądują w historii jako amunicja na nowe reguły. Gdy historia przestanie przynosić
       nowe klasy przeoczeń, domyślnym trybem wraca `klasyfikacja`. Ten test pilnuje, żeby ta
       zmiana została DECYZJĄ, a nie czyimś przeoczeniem przy następnej edycji. */
    expect(TRYB_DOMYSLNY).toBe('skan');
    expect(TRYBY, 'tani tryb ZOSTAJE — to on jest kierunkiem docelowym').toContain('klasyfikacja');
    expect(czytaj('web/ai.mjs')).toMatch(/TYMCZASOWA/);
  });

  it('⚠ O KOSZCIE DECYDUJE SERWER, NIE STRONA — i dlatego strona nie wysyła pola `ai`', () => {
    /* Przełącznik zniknął 16.09.2026 (model jedzie zawsze, serwer gasi go po terminie).
       Gdyby strona dalej wysyłała `ai`/`tryb`, decyzja o rachunku siedziałaby w kodzie,
       który każdy podmieni w devtoolsach — a tego nie widać po niczym poza fakturą. */
    const html = czytaj('web/public/index.html');
    expect(html, 'kontrolka trybu zeszła ze strony').not.toMatch(/id="trybAi"/);
    expect(html, 'i przełącznik AI też').not.toMatch(/id="etykietaAi"/);
    expect(html, 'ciało żądania niesie SAM TEKST').toMatch(/JSON\.stringify\(\{ tekst \}\)/);
    const srv = czytaj('web/server.mjs');
    expect(srv, 'brak pola znaczy WŁĄCZONE, jawne `false` dalej działa (skrypty, testy)')
      .toMatch(/zadanie\.ai !== false && aiCzynne\(\)/);
  });

  it('⚠ OSĄD MODELU MA TERMIN, I JEST TO DATA STAŁA', () => {
    /* „Dwa tygodnie od startu" liczyłoby się od uruchomienia kontenera, więc odnawiałoby się
       przy każdym redeployu i termin nigdy by nie nadszedł — wyłącznik, który wygląda na
       wyłącznik i nim nie jest. Przedłużenie ma być świadomym ruchem (`AI_DO` w env). */
    const srv = czytaj('web/server.mjs');
    expect(srv).toMatch(/const AI_DO = new Date\(process\.env\.AI_DO \?\? '20\d\d-\d\d-\d\dT/);
    expect(srv, 'po terminie model nie jedzie').toMatch(/aiCzynne = \(\) => aiDostepne\(\) && !poTerminie\(\)/);
    expect(srv, 'i `/api/zdrowie` mówi, do kiedy').toMatch(/aiDo:/);
  });

  it('⚠ PEŁNY SKAN DOSTAJE LISTĘ REGUŁ KODU — bez niej model wypisuje to, co kod już policzył', () => {
    const src = czytaj('web/ai.mjs');
    expect(src).toMatch(/CO SPRAWDZA JUŻ KOD/);
    expect(src, 'i ma nazwać KLASY przeoczeń, nie tylko pojedyncze znaleziska').toMatch(/klasyPrzeoczen/);
    expect(czytaj('web/server.mjs'), 'lista reguł musi realnie jechać do modelu')
      .toMatch(/skanuj\(o, projekt, REGULY\)/);
  });

  it('serwer spada na TANI tryb przy nieznanej wartości', () => {
    const src = czytaj('web/server.mjs');
    expect(src).toMatch(/TRYBY\.includes\(zadanie\.tryb\) \? zadanie\.tryb : TRYB_DOMYSLNY/);
  });

  it('⚠ raport pokazuje MODEL i ZUŻYCIE TOKENÓW — narzędzie wołające cudzy model ma pokazywać rachunek', () => {
    const html = czytaj('web/public/index.html');
    expect(html).toMatch(/tok\. wejścia/);
    expect(html).toMatch(/r\.ai\.model/);
    expect(html).toMatch(/z pamięci podręcznej/);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   P47 — KONTRAKT INTERFEJSU WYMAGANY, ALE NIESPEŁNIONY (A6)
   ──────────────────────────────────────────────────────────────────────────────────────────
   ⚠ Reguła orzeka WYŁĄCZNIE o kontraktach z `required: true`. Kontrakt bez tej flagi bywa
   świadomie opcjonalny — tak radzi się go trzymać, dopóki implementator jest jeden — więc
   karanie za niego zamieniłoby ostrożność w usterkę. Połowa testów niżej pilnuje właśnie tego.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('P47 · wymagany kontrakt interfejsu bez pokrycia u implementatora', () => {
  /** Ontologia z jednym interfejsem i jednym typem, który się do niego przyznaje. */
  const zKontraktem = ({ kontrakt, implementuje }) => {
    const o = czysta();
    o.interfaces = [{ apiName: 'Schedulable', description: 'Coś, co da się postawić na osi czasu.', ...kontrakt }];
    o.objectTypes[0].implements = implementuje ? [implementuje] : [];
    return o;
  };
  const t47 = (o) => trafienia(o).has('P47');

  it('wymagana WŁAŚCIWOŚĆ, której implementator nie ma → trafia', () => {
    expect(t47(zKontraktem({
      kontrakt: { properties: [{ apiName: 'duration', type: 'integer', required: true }] },
      implementuje: 'Schedulable',
    }))).toBe(true);
  });

  it('ta sama właściwość WSKAZANA MAPOWANIEM na istniejące pole → NIE trafia', () => {
    expect(t47(zKontraktem({
      kontrakt: { properties: [{ apiName: 'duration', type: 'integer', required: true }] },
      implementuje: { interface: 'Schedulable', mapping: { duration: 'issuedDate' } },
    }))).toBe(false);
  });

  it('właściwość o TEJ SAMEJ nazwie u implementatora → NIE trafia (mapowanie jest opcjonalne)', () => {
    const o = zKontraktem({
      kontrakt: { properties: [{ apiName: 'invoiceNumber', type: 'string', required: true }] },
      implementuje: 'Schedulable',
    });
    expect(t47(o)).toBe(false);
  });

  it('⚠ kontrakt BEZ `required` → NIE trafia, choć nikt go nie spełnia', () => {
    expect(t47(zKontraktem({
      kontrakt: { properties: [{ apiName: 'duration', type: 'integer' }] },
      implementuje: 'Schedulable',
    }))).toBe(false);
    expect(t47(zKontraktem({
      kontrakt: { properties: [{ apiName: 'duration', type: 'integer', required: false }] },
      implementuje: 'Schedulable',
    }))).toBe(false);
  });

  it('wymagany KONTRAKT AKCJI bez wskazania, co go spełnia → trafia', () => {
    expect(t47(zKontraktem({
      kontrakt: { actionConstraints: [{ apiName: 'placeOnAxis', required: true }] },
      implementuje: 'Schedulable',
    }))).toBe(true);
  });

  it('kontrakt akcji wskazujący akcję, której W MODELU NIE MA → trafia', () => {
    expect(t47(zKontraktem({
      kontrakt: { actionConstraints: [{ apiName: 'placeOnAxis', required: true, satisfiedBy: { Invoice: 'nieistniejacaAkcja' } }] },
      implementuje: 'Schedulable',
    }))).toBe(true);
  });

  it('kontrakt akcji spełniony ISTNIEJĄCĄ akcją → NIE trafia (obie konwencje mapowania)', () => {
    expect(t47(zKontraktem({
      kontrakt: { actionConstraints: [{ apiName: 'placeOnAxis', required: true, satisfiedBy: { Invoice: 'issueInvoice' } }] },
      implementuje: 'Schedulable',
    })), 'wskazanie po stronie INTERFEJSU (`satisfied-by`)').toBe(false);
    expect(t47(zKontraktem({
      kontrakt: { actionConstraints: [{ apiName: 'placeOnAxis', required: true }] },
      implementuje: { interface: 'Schedulable', actionMapping: { placeOnAxis: 'issueInvoice' } },
    })), 'wskazanie po stronie IMPLEMENTATORA (`action-mapping`)').toBe(false);
  });

  it('wymagany LINK kontraktu — mapowanie na własny link implementatora liczy się jako spełnienie', () => {
    expect(t47(zKontraktem({
      kontrakt: { linkConstraints: [{ apiName: 'availability', to: 'Customer', required: true }] },
      implementuje: 'Schedulable',
    })), 'linku o tej nazwie nie ma').toBe(true);
    expect(t47(zKontraktem({
      kontrakt: { linkConstraints: [{ apiName: 'availability', to: 'Customer', required: true }] },
      implementuje: { interface: 'Schedulable', linkMapping: { availability: 'customer' } },
    })), '`link-mapping` wskazuje istniejący link `customer`').toBe(false);
  });

  it('⚠ implementator SPOZA modelu → NIE trafia; nie ma o czym orzekać, a zgadywanie to fałszywe trafienie', () => {
    const o = czysta();
    o.interfaces = [{
      apiName: 'Schedulable', description: 'Coś, co da się postawić na osi.',
      properties: [{ apiName: 'duration', type: 'integer', required: true }],
      implementedBy: ['TypSpozaTegoPliku'],
    }];
    expect(t47(o)).toBe(false);
  });

  it('implementator wymieniony PO STRONIE INTERFEJSU (`implemented-by`) też jest sprawdzany', () => {
    const o = czysta();
    o.interfaces = [{
      apiName: 'Schedulable', description: 'Coś, co da się postawić na osi.',
      properties: [{ apiName: 'duration', type: 'integer', required: true }],
      implementedBy: ['Invoice'],
    }];
    expect(t47(o), 'deklaracja bywa zapisana z jednej albo z drugiej strony').toBe(true);
  });
});

describe('warstwa AI — kształt żądania zależy od RODZINY modelu', () => {
  it('rodzina GPT-5/6 i `o*` dostaje inny kształt niż 4.x', () => {
    for (const m of ['gpt-5.6-luna', 'gpt-5.6-terra', 'gpt-6-astra', 'o3-mini']) {
      expect(ksztaltZadania(m), m).toBe('rozumujacy');
    }
    for (const m of ['gpt-4o-mini', 'gpt-4.1', 'gpt-3.5-turbo']) {
      expect(ksztaltZadania(m), m).toBe('klasyczny');
    }
  });

  it('⚠ 400 mówiące o nieobsługiwanym parametrze URUCHAMIA odwrót, a zwykłe 400 nie', () => {
    expect(zlyKsztalt(400, "Unsupported parameter: 'max_tokens' is not supported with this model.")).toBe(true);
    expect(zlyKsztalt(400, 'Unsupported value: temperature does not support 0')).toBe(true);
    expect(zlyKsztalt(400, 'Invalid API key provided'), 'to nie jest sprawa kształtu').toBe(false);
    expect(zlyKsztalt(429, 'max_tokens'), 'limit tempa to nie zły kształt').toBe(false);
  });

  it('domyślne modele są ustawione świadomie: tani do klasyfikacji, mocniejszy do recenzji', () => {
    const src = czytaj('web/ai.mjs');
    expect(src).toMatch(/OPENAI_MODEL \?\? 'gpt-5\.6-terra'/);
    expect(src).toMatch(/OPENAI_MODEL_MALY \?\? 'gpt-5\.6-luna'/);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   P48 + AI-A1 — JEDNA AKCJA, KILKA OPERACJI
   ──────────────────────────────────────────────────────────────────────────────────────────
   ⚠ Podział roboty jest tu CELOWY i wynika z pomiaru: licznik dostaje NAZWĘ (sygnał pewny,
   zero fałszywych trafień na prawdziwym modelu), a osąd „czy te parametry znaczą co innego
   zależnie od przełącznika” idzie do modelu językowego, bo dwa liczniki, które to udawały,
   dawały 100% fałszywych trafień. Testy niżej pilnują OBU stron tej granicy.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('P48 · nazwa akcji wymieniająca dwie operacje', () => {
  const zAkcja = (apiName) => {
    const o = czysta();
    o.actionTypes = [{
      apiName, description: 'Robi coś z fakturą.', status: 'active',
      parameters: [{ apiName: 'invoice', type: 'reference', required: true }],
      rules: [{ op: 'modify', target: 'Invoice.issuedDate' }],
    }];
    return o;
  };
  const t48 = (nazwa) => trafienia(zAkcja(nazwa)).has('P48');

  it('trafia w nazwy, które wymieniają dwie czynności', () => {
    for (const n of ['addOrRemoveTag', 'createOrUpdateCustomer', 'saveAndSendInvoice', 'upsertOrder', 'upsert']) {
      expect(t48(n), n).toBe(true);
    }
  });

  it('⚠ NIE trafia, gdy „Or”/„And” siedzi w ŚRODKU słowa — to jest cała pułapka tej reguły', () => {
    /* `setOrderNote` ma „Or” w „Order”, `handleReturn` ma „and” w „handle”, a `brandInvoice`
       w „brand”. Reguła szukająca gołego „or” zgłosiłaby wszystkie trzy. */
    for (const n of ['setOrderNote', 'handleReturn', 'brandInvoice', 'reorderQueue', 'recordPayment']) {
      expect(t48(n), n).toBe(false);
    }
  });

  it('⚠ recepta NIE popycha w drugą skrajność — akcja per pole to osobny błąd (P20)', () => {
    const z = ocen(normalizuj(zAkcja('addOrRemoveTag'))).znaleziska.find((x) => x.id === 'P48');
    expect(z.jak).toMatch(/set\[Właściwość\]/);
    expect(z.jak, 'jeden przycisk spina KONTRAKT, nie wspólna akcja').toMatch(/KONTRAKT AKCJI/);
  });
});

describe('AI-A1 · osąd modelu o akcji robiącej kilka rzeczy', () => {
  const model = () => ({
    objectTypes: [{ apiName: 'core.Order', properties: [{ apiName: 'id' }] }],
    actionTypes: [
      { apiName: 'planOrder', parameters: [{ apiName: 'order' }, { apiName: 'day' }] },
      { apiName: 'manageTimelineItem', parameters: [{ apiName: 'kind' }, { apiName: 'order' }, { apiName: 'duration' }] },
    ],
  });

  it('wiersz akcji to NAZWA i parametry — nic więcej', () => {
    expect(wierszeAkcji(model())[1].wiersz).toBe('manageTimelineItem|kind,order,duration');
  });

  it('wskazana akcja wychodzi jako sugestia z listą elementów', () => {
    const r = znaleziskaZEtykiet(
      wierszeDoKlasyfikacji(model()), { akcjeWieloznaczne: ['manageTimelineItem'] }, wierszeAkcji(model()),
    );
    const z = r.znaleziska.find((x) => x.id === 'AI-A1');
    expect(z.elementy).toEqual(['manageTimelineItem']);
    expect(z.co).toMatch(/^1 akcja wygląda/);
  });

  it('⚠ nazwa akcji spoza wysłanej tabeli WYPADA i jest policzona', () => {
    const r = znaleziskaZEtykiet(
      wierszeDoKlasyfikacji(model()), { akcjeWieloznaczne: ['manageTimelineItem', 'ZmyslonaAkcja'] }, wierszeAkcji(model()),
    );
    expect(r.akcjeWieloznaczne).toEqual(['manageTimelineItem']);
    expect(r.pominieto).toBe(1);
  });

  it('brak akcji w odpowiedzi = brak znaleziska; stara sygnatura (bez akcji) dalej działa', () => {
    const r = znaleziskaZEtykiet(wierszeDoKlasyfikacji(model()), { maszyneria: [] });
    expect(r.znaleziska.some((z) => z.id === 'AI-A1')).toBe(false);
    expect(r.akcjeWieloznaczne).toEqual([]);
  });

  it('⚠ prompt UPRZEDZA o dwóch pomyłkach, które sam zmierzyłem na liczniku', () => {
    const src = czytaj('web/ai.mjs');
    expect(src, 'tryb pracy silnika to jedna operacja z opcjami').toMatch(/szybciej\s*\n?albo dokładniej/);
    expect(src, 'podmiana elementów składowych to jedna operacja').toMatch(/kasujący stare klauzule/);
  });
});

describe('AI-A1 · model nie powtarza tego, co znalazł KOD', () => {
  const model = () => ({
    objectTypes: [{ apiName: 'core.Order', properties: [{ apiName: 'id' }] }],
    actionTypes: [
      { apiName: 'addOrRemoveTag', parameters: [{ apiName: 'order' }] },
      { apiName: 'manageTimelineItem', parameters: [{ apiName: 'kind' }, { apiName: 'order' }] },
    ],
  });
  const wynik = (juz) => znaleziskaZEtykiet(
    wierszeDoKlasyfikacji(model()),
    { akcjeWieloznaczne: ['addOrRemoveTag', 'manageTimelineItem'] },
    wierszeAkcji(model()),
    juz,
  );

  it('nazwa zgłoszona już przez kod wypada z bloku AI i jest policzona osobno', () => {
    const r = wynik(new Set(['addOrRemoveTag']));
    expect(r.akcjeWieloznaczne).toEqual(['manageTimelineItem']);
    expect(r.powtorzoneZaKodem, 'to nie jest pomyłka modelu, więc nie liczy się jako `pominieto`').toBe(1);
    expect(r.pominieto).toBe(0);
  });

  it('bez listy zgłoszonych nic nie wypada — argument jest opcjonalny', () => {
    expect(wynik().akcjeWieloznaczne).toHaveLength(2);
  });

  it('⚠ REGRESJA: odsiewamy po regule, która mówi TO SAMO, a nie po każdej wzmiance', () => {
    /* Pierwsza wersja zbierała nazwy ze WSZYSTKICH znalezisk kodu, więc akcja, o której kod
       powiedział „bez opisu” albo „bez kryteriów zgłoszenia”, uciszała znalezisko modelu
       o czymś zupełnie innym — i tryb tracił dokładnie to, dla czego powstał. Złapane na
       żywym żądaniu, nie w teście; stąd ta asercja czyta ŹRÓDŁO. */
    const src = czytaj('web/server.mjs');
    expect(src).toMatch(/\.filter\(\(z\) => z\.id === 'P48'\)/);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   POKRYCIE AUDYTU `ZGODNOSC-Z-PALANTIREM.md` — 20 rozjazdów, jeden test na klasę
   ──────────────────────────────────────────────────────────────────────────────────────────
   ⚠ PO CO TO ISTNIEJE: audyt był pisany RĘCZNIE, przez czytanie dokumentacji Palantira obok
   manifestu. Walidator ma te same rozjazdy łapać MASZYNOWO — u nas i u każdego innego. Bez
   tego pliku „silnik to wykrywa” jest twierdzeniem z pamięci: reguła może jutro przestać
   kąsać (patrz harness mutacyjny), a nikt tego nie zauważy, bo raport dalej będzie zielony.
   Każdy wpis niesie MINIMALNĄ ontologię odtwarzającą rozjazd i regułę, która ma się odezwać.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('pokrycie audytu — każdy rozjazd ma regułę, która go łapie', () => {
  /** Najmniejszy poprawny model — od niego psujemy po jednej rzeczy. */
  const min = () => ({
    ontology: 'test',
    objectTypes: [{
      apiName: 'Invoice', description: 'Dokument rozliczeniowy.', primaryKey: 'invoiceId',
      titleProperty: 'invoiceNumber', status: 'active', visibility: 'normal', implements: [],
      properties: [
        { apiName: 'invoiceId', type: 'string', required: true, description: 'Klucz.' },
        { apiName: 'invoiceNumber', type: 'string', required: true, description: 'Numer.' },
      ],
    }],
    linkTypes: [], actionTypes: [], interfaces: [], functions: [],
    sharedPropertyTypes: [], functionTypes: [],
  });
  const typ = (apiName, pola = []) => ({
    apiName, description: `Typ ${apiName}.`, primaryKey: 'id', titleProperty: 'name',
    status: 'active', visibility: 'normal',
    properties: [
      { apiName: 'id', type: 'string', required: true, description: 'Klucz.' },
      { apiName: 'name', type: 'string', description: 'Nazwa.' }, ...pola,
    ],
  });
  const lapie = (o, regula) => expect([...trafienia(o)], `${regula} miała się odezwać`).toContain(regula);

  it('A1 · pole „liczone” liczone NIE z linków → P49', () => {
    const o = min();
    o.objectTypes[0].properties.push({
      apiName: 'total', type: 'decimal', description: 'Suma.', derived: { by: 'formulaWKodzie' },
    });
    lapie(o, 'P49');
    /* ...a liczone PO LINKU z agregacją jest w porządku i reguła ma milczeć. */
    const dobre = min();
    dobre.linkTypes.push({
      apiName: 'items', from: 'Invoice', to: 'Invoice', cardinality: 'ONE_TO_MANY',
      reverseName: 'invoice', status: 'active', description: 'Pozycje faktury.',
    });
    dobre.objectTypes[0].properties.push({
      apiName: 'total', type: 'decimal', description: 'Suma.', derived: { by: 'sum(items.amount)' },
    });
    expect(trafienia(dobre).has('P49'), 'link + agregacja to WŁAŚNIE derived property').toBe(false);
  });

  it('A2 · akcja edytuje pole liczone → P24', () => {
    const o = min();
    o.objectTypes[0].properties.push({ apiName: 'total', type: 'decimal', description: 'Suma.', derived: { by: 'sum(items.amount)' } });
    o.actionTypes.push({
      apiName: 'recalcTotal', description: 'Przelicza sumę.', status: 'active',
      parameters: [{ apiName: 'invoice', type: 'reference', required: true }],
      rules: [{ op: 'modify', target: 'Invoice.total' }],
    });
    lapie(o, 'P24');
  });

  it('A3 · typ współdzielony, który nie jest właściwością niczego → P44 albo P46', () => {
    const o = min();
    o.sharedPropertyTypes.push({ apiName: 'OrderFacts', description: 'Paczka faktów.', fields: [{ apiName: 'a', type: 'string' }] });
    const t = trafienia(o);
    expect(t.has('P44') || t.has('P46')).toBe(true);
  });

  it('A4 · status wyłącznie na obiektach → P31', () => {
    const o = min();
    o.actionTypes.push({ apiName: 'issueInvoice', description: 'Wystawia fakturę.', parameters: [{ apiName: 'x', type: 'string' }], rules: [{ op: 'create', target: 'Invoice' }] });
    lapie(o, 'P31');
  });

  it('A5 · brak widoczności → P33 (a KTÓRE typy schować, mówi AI-V1)', () => {
    const o = min();
    delete o.objectTypes[0].visibility;
    lapie(o, 'P33');
    const r = znaleziskaZEtykiet(
      wierszeDoKlasyfikacji({ objectTypes: [{ apiName: 'platform.Tab', properties: [{ apiName: 'name' }] }] }),
      { maszyneria: ['platform.Tab'] },
    );
    expect(r.znaleziska.map((z) => z.id)).toContain('AI-V1');
  });

  it('A6 · interfejs BEZ NICZEGO → P09; wymagany kontrakt bez pokrycia → P47', () => {
    /* ⚠ ZESTAW 1.6: `P09` przestała pytać o kontrakty AKCJI (te są u Foundry OPCJONALNE,
       `docs:19159`) i pyta o to, czy interfejs deklaruje COŚKOLWIEK — właściwość, więz linku
       albo kontrakt akcji (`docs:19068`). Fikstura schodzi więc do interfejsu PUSTEGO. */
    const o = min();
    o.interfaces.push({ apiName: 'Schedulable', description: 'Umowa bez ani jednego składnika.', properties: [], implementedBy: ['Invoice'] });
    lapie(o, 'P09');
    const z = min();
    z.interfaces.push({ apiName: 'Schedulable', description: 'Da się ułożyć.', properties: [{ apiName: 'duration', type: 'integer', required: true }], implementedBy: ['Invoice'] });
    lapie(z, 'P47');
  });

  it('A7 · interfejs, którego nic nie konsumuje → P08', () => {
    const o = min();
    o.interfaces.push({ apiName: 'Schedulable', description: 'Da się ułożyć.', properties: [{ apiName: 'duration', type: 'integer' }], implementedBy: ['Invoice'] });
    lapie(o, 'P08');
  });

  it('B1 i B2 · jeden typ niesie kilka bytów na dyskryminatorze → P03', () => {
    const o = min();
    o.objectTypes[0].discriminatorValues = ['machine', 'tool', 'person'];
    o.objectTypes[0].properties.push({ apiName: 'kind', type: 'enum(machine|tool|person)', description: 'Rodzaj.' });
    lapie(o, 'P03');
  });

  it('B3 · typ z kilkudziesięcioma płaskimi polami → P01', () => {
    const o = min();
    for (let i = 0; i < 59; i += 1) o.objectTypes[0].properties.push({ apiName: `p${i}`, type: 'string', description: 'Pole.' });
    lapie(o, 'P01');
  });

  /* ⚠ OD ZESTAWU 1.5 ROZDROBNIENIE WYMAGA MNOGOŚCI (`docs:20222` — „many single-property
     actions”), więc pokrycie audytu stawia DWIE takie akcje na dwóch RÓŻNYCH polach. Do 1.5
     stała tu jedna i to było ostrzejsze niż źródło: jedna akcja nie ma się z czym zepnąć. */
  it('B4 · Action Sprawl po nazwie → P20 (a po liczbie akcji na typ → P19)', () => {
    const o = min();
    o.objectTypes[0].properties.push({ apiName: 'total', type: 'double', description: 'Kwota.' });
    o.actionTypes.push({
      apiName: 'setInvoiceNumber', description: 'Ustawia numer.', status: 'active',
      parameters: [{ apiName: 'v', type: 'string', required: true }],
      rules: [{ op: 'modify', target: 'Invoice.invoiceNumber' }],
    }, {
      apiName: 'setInvoiceTotal', description: 'Ustawia kwotę.', status: 'active',
      parameters: [{ apiName: 'v', type: 'double', required: true }],
      rules: [{ op: 'modify', target: 'Invoice.total' }],
    });
    lapie(o, 'P20');
  });

  it('B5 · ta sama relacja jako link N:M I jako obiekt pośredni → P50', () => {
    const o = min();
    /* ⚠ ZESTAW 1.6: dubletem jest CZYSTY obiekt łączący — poza kluczem głównym i kluczami obcymi
       nie niesie własnej właściwości. Obiekt z treścią (`level`, `role`, `startDate`) jest ENCJĄ
       i link obok niego jest drugim WIDOKIEM, a nie drugą prawdą (`docs:20062`). Dlatego fikstura
       zdejmuje pośredniczej `name` i nazywa jego dwie kolumny kluczy obcych. */
    const zlaczenie = typ('Skill');
    zlaczenie.properties = [
      { apiName: 'id', type: 'string', required: true, description: 'Klucz złączenia.' },
      { apiName: 'personId', type: 'string', description: 'Klucz obcy osoby.' },
      { apiName: 'machineId', type: 'string', description: 'Klucz obcy maszyny.' },
    ];
    zlaczenie.titleProperty = 'id';
    o.objectTypes.push(typ('Person'), typ('Machine'), zlaczenie);
    o.linkTypes.push(
      { apiName: 'staffs', from: 'Person', to: 'Machine', cardinality: 'MANY_TO_MANY', reverseName: 'staffedBy', status: 'active', description: 'Kto obsługuje maszynę.' },
      { apiName: 'skillPerson', from: 'Skill', to: 'Person', cardinality: 'MANY_TO_ONE', reverseName: 'skills', status: 'active', description: 'Czyja kwalifikacja.', foreignKeyProperty: 'personId', foreignKeyObjectType: 'Skill' },
      { apiName: 'skillMachine', from: 'Skill', to: 'Machine', cardinality: 'MANY_TO_ONE', reverseName: 'machineSkills', status: 'active', description: 'Na jakiej maszynie.', foreignKeyProperty: 'machineId', foreignKeyObjectType: 'Skill' },
    );
    lapie(o, 'P50');
    /* ⚠ DOPEŁNIENIE: bez obiektu pośredniego ta sama relacja jest sprawą `P30`, nie `P50` —
       te dwie reguły nie mogą trafiać naraz, bo mówią rzeczy przeciwne. */
    const bezObiektu = min();
    bezObiektu.objectTypes.push(typ('Person'), typ('Machine'));
    bezObiektu.linkTypes.push({ apiName: 'staffs', from: 'Person', to: 'Machine', cardinality: 'MANY_TO_MANY', reverseName: 'staffedBy', status: 'active', description: 'Kto obsługuje.' });
    const t = trafienia(bezObiektu);
    expect(t.has('P30'), 'N:M bez obiektu → P30').toBe(true);
    expect(t.has('P50'), 'i NIGDY oba naraz').toBe(false);
  });

  it('C2 · klucz główny stoi na polu z `sunset` → P37', () => {
    const o = min();
    o.objectTypes[0].properties[0].sunset = 'wchodzi id z ERP';
    lapie(o, 'P37');
  });

  it('D2 · wrażliwe pola bez granicy wierszowej → P41', () => {
    const o = min();
    o.objectTypes[0].properties.push({ apiName: 'price', type: 'decimal', description: 'Cena.', classification: 'poufne' });
    lapie(o, 'P41');
  });

  it('⚠ CZTERECH POZYCJI AUDYTU NIE DA SIĘ ZMECHANIZOWAĆ — i to jest zapisane, nie przemilczane', () => {
    /* Ten test nie sprawdza kodu. Trzyma LISTĘ, żeby „brak reguły” nie wyglądał na przeoczenie,
       i żeby następna sesja nie dopisywała reguł, których nie da się obronić cytatem.
       ⚠ 15.09.2026 (manifest 2.9, fala E7): C1, C3, D1, D2 i D4 zostały w manifeście ZAŁATWIONE —
       rola przeszła do `core.Role`, uzasadnienie dziennika przepisano na cytaty, `manual` nazwano
       edit-only property, doszedł klucz `row-access`, a płaska gramatyka kryteriów dostała zapis
       z warunkiem zmiany. LISTA NIŻEJ SIĘ PRZEZ TO NIE ZMIENIA i to nie jest niedopatrzenie:
       mówi ona o tym, czego nie umie ZMECHANIZOWAĆ SILNIK, a nie o tym, co jest w manifeście
       otwarte. Silnik dalej nie sprawdzi ani precyzji cytatu w prozie, ani tego, czy pole bez
       ścieżki jest decyzją, czy brakiem — i dlatego te pozycje zostają tu z tymi samymi powodami. */
    const niemechanizowalne = {
      C1: 'reguła namespace\'ów jest NASZĄ konwencją, nie Palantira → walidator strukturalny i test zgodności',
      C3: 'precyzja cytatu w prozie manifestu — maszyna nie sprawdzi, czy zdanie oddaje dokumentację',
      D1: 'edit-only property wymaga wiedzy „czy to pole ma źródło danych”, której kanoniczny kształt nie niesie',
      D3: 'execution context w kryteriach — NIEWYKORZYSTANA MOŻLIWOŚĆ, nie rozjazd',
      D4: 'płaska gramatyka kryteriów — jak wyżej: brak użycia funkcji nie jest usterką',
      D5: 'niewykorzystane wartości statusu (`example`, `promoted`) — jak wyżej',
    };
    expect(Object.keys(niemechanizowalne)).toHaveLength(6);
    const idRegul = new Set(REGULY.map((r) => r.id));
    for (const p of ['P49', 'P50']) expect(idRegul.has(p), `${p} musi być w REGULY`).toBe(true);
  });
});

describe('P50 · obiekt pośredni — trzy fałszywki, przez które reguła przeszła 8:1', () => {
  /* Pierwsza wersja predykatu zgłosiła OSIEM relacji ontologii produkcyjnej, z czego SIEDEM
     fałszywie. Każda z trzech przyczyn ma tu własny test — bo to one, a nie sama reguła,
     decydują, czy raport da się czytać. */
  const typ = (apiName) => ({
    apiName, description: `Typ ${apiName}.`, primaryKey: 'id', titleProperty: 'name',
    status: 'active', visibility: 'normal',
    properties: [
      { apiName: 'id', type: 'string', required: true, description: 'Klucz.' },
      { apiName: 'name', type: 'string', description: 'Nazwa.' },
    ],
  });
  const link = (apiName, from, to, cardinality) => ({
    apiName, from, to, cardinality, reverseName: `${apiName}Rev`, status: 'active',
    description: `Relacja ${apiName}.`,
  });
  const model = (typy, linkiL) => ({
    ontology: 'test', objectTypes: typy.map(typ), linkTypes: linkiL,
    actionTypes: [], interfaces: [], functions: [], sharedPropertyTypes: [], functionTypes: [],
  });

  it('⚠ RELACJA ZWROTNA (A↔A) nie ma pośrednika — inaczej każdy typ z linkiem do A nim jest', () => {
    const o = model(['Operation', 'Order'], [
      link('predecessors', 'Operation', 'Operation', 'MANY_TO_MANY'),
      link('operations', 'Order', 'Operation', 'ONE_TO_MANY'),
    ]);
    expect(trafienia(o).has('P50'), '`Order` NIE jest tabelą pośredniczącą dla `Operation ↔ Operation`').toBe(false);
  });

  it('⚠ KONIEC RELACJI nie jest jej pośrednikiem', () => {
    const o = model(['Operation', 'Resource', 'Stage'], [
      link('eligible', 'Operation', 'Resource', 'MANY_TO_MANY'),
      link('stage', 'Operation', 'Stage', 'MANY_TO_ONE'),
    ]);
    expect(trafienia(o).has('P50'), '`Operation` jest KOŃCEM `eligible`, nie pośrednikiem').toBe(false);
  });

  it('⚠ RZECZOWNIK DZIEDZINY z linkami na boki nie jest tabelą pośredniczącą', () => {
    /* `Operation` dotyka `Stage` i `Resource`, ale ma też własne linki gdzie indziej — to jest
       byt, nie złączenie. Tabela pośrednicząca NIE MA innych wyjść niż dwa końce. */
    const o = model(['Stage', 'Resource', 'Operation', 'Order', 'Treatment'], [
      link('capable', 'Stage', 'Resource', 'MANY_TO_MANY'),
      link('opStage', 'Operation', 'Stage', 'MANY_TO_ONE'),
      link('opResource', 'Operation', 'Resource', 'MANY_TO_ONE'),
      link('opOrder', 'Operation', 'Order', 'MANY_TO_ONE'),
      link('opTreatment', 'Operation', 'Treatment', 'MANY_TO_MANY'),
    ]);
    expect(trafienia(o).has('P50')).toBe(false);
  });

  it('...a PRAWDZIWE złączenie dalej trafia — zawężenie nie zjadło reguły', () => {
    const o = model(['Person', 'Machine', 'Skill'], [
      link('staffs', 'Person', 'Machine', 'MANY_TO_MANY'),
      { ...link('skillOf', 'Skill', 'Person', 'MANY_TO_ONE'), foreignKeyProperty: 'personId', foreignKeyObjectType: 'Skill' },
      { ...link('skillFor', 'Skill', 'Machine', 'MANY_TO_ONE'), foreignKeyProperty: 'machineId', foreignKeyObjectType: 'Skill' },
    ]);
    /* ⚠ ZESTAW 1.6: sam KSZTAŁT GRAFU już nie wystarcza — pośrednik musi być CZYSTY, czyli poza
       kluczem głównym i dwoma kluczami obcymi nie nieść ani jednej własnej właściwości. */
    const skill = o.objectTypes.find((x) => x.apiName === 'Skill');
    skill.titleProperty = 'id';
    skill.properties = [
      { apiName: 'id', type: 'string', required: true, description: 'Klucz złączenia.' },
      { apiName: 'personId', type: 'string', description: 'Klucz obcy osoby.' },
      { apiName: 'machineId', type: 'string', description: 'Klucz obcy maszyny.' },
    ];
    expect(trafienia(o).has('P50'), '`Skill` nie niesie własnej treści — to jest złączenie').toBe(true);
  });

  it('⚠ TEN SAM predykat karmi P30 — i to jego naprawa OBUDZIŁA regułę, która fałszywie milczała', () => {
    /* Stary predykat brał za pośrednika dowolny typ dotykający obu końców, więc `P30` („N:M bez
       obiektu pośredniego”) uznawał relację za obsłużoną i nie zgłaszał jej. Na naszym manifeście
       ucisza to było DZIESIĘĆ relacji. */
    const o = model(['Stage', 'Resource', 'Operation', 'Order'], [
      link('capable', 'Stage', 'Resource', 'MANY_TO_MANY'),
      link('opStage', 'Operation', 'Stage', 'MANY_TO_ONE'),
      link('opResource', 'Operation', 'Resource', 'MANY_TO_ONE'),
      link('opOrder', 'Operation', 'Order', 'MANY_TO_ONE'),
    ]);
    expect(trafienia(o).has('P30'), '`Operation` nie jest złączeniem, więc relacja NIE jest obsłużona').toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   HISTORIA SPRAWDZEŃ — zapis, który ZMIENIA OBIETNICĘ STRONY
   ──────────────────────────────────────────────────────────────────────────────────────────
   ⚠ Ta grupa pilnuje przede wszystkim JEDNEJ rzeczy: że włączenie historii nie zostawia na
   stronie nieprawdziwego zdania. Do 0.6 w stopce stało „twoja ontologia nie jest nigdzie
   zapisywana”; gdyby ten tekst został wpisany na sztywno, pierwsze włączenie historii na
   serwerze zamieniłoby go w kłamstwo — i nikt by tego nie zobaczył, bo strona wygląda tak samo.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('historia sprawdzeń', () => {
  it('⚠ WŁĄCZONA DOMYŚLNIE, razem z treścią — i wyłącza się JAWNIE', () => {
    /* Decyzja właściciela: „zapisujemy wszystko by default”. Do tej zmiany historia była
       domyślnie wyłączona; obie decyzje są w porządku, ale żadna nie ma prawa zmienić się
       przypadkiem — dlatego stoi tu asercja, a nie komentarz. */
    expect(historiaWlaczona()).toBe(true);
    expect(historiaZTrescia()).toBe(true);
    const src = czytaj('web/historia.mjs');
    expect(src, 'wyłącznik musi być jawny').toMatch(/HISTORIA === '0'/);
    expect(src, 'treść ma osobny przełącznik').toMatch(/HISTORIA_TRESC === '0'/);
    expect(src, 'i limit, bo wielki plik nie jest amunicją, a zapełni dysk').toMatch(/HISTORIA_MAX_BAJTOW/);
  });

  it('⚠ BAZA BEZ ZALEŻNOŚCI — `node:sqlite`, bo usługa wstaje bez `npm install`', () => {
    const src = czytaj('web/historia.mjs');
    /* `import … from` albo `createRequire(…)('node:sqlite')` — to drugie, bo vitest 2 nie umie
       załadować prefiksowego `node:sqlite` przez import (patrz nagłówek historia.mjs). Liczy się
       to, że to moduł WBUDOWANY, a nie paczka z npm. */
    expect(src).toMatch(/from 'node:sqlite'|\)\('node:sqlite'\)/);
    expect(src).not.toMatch(/from 'sqlite3'|from 'better-sqlite3'/);
    expect(czytaj('Dockerfile'), 'a obraz musi mieć Node z tym modułem').toMatch(/node:2[4-9]/);
  });

  it('⚠ HISTORIA ODPOWIADA NA PYTANIE, DLA KTÓREGO POWSTAŁA: co wraca i jak często', () => {
    const src = czytaj('web/historia.mjs');
    expect(src, 'klasy przeoczeń mają WŁASNĄ tabelę — to po niej pytamy najczęściej').toMatch(/CREATE TABLE IF NOT EXISTS przeoczenia/);
    expect(src).toMatch(/GROUP BY klasa ORDER BY ile DESC/);
    expect(czytaj('web/server.mjs'), 'i trasa, która to wystawia (za tokenem)').toMatch(/co'\) === 'przeoczenia'/);
  });

  it('⚠ REGRESJA: `zapisz` jest SYNCHRONICZNE — wołanie go jak obietnicy dawało 422', () => {
    /* `node:sqlite` jest synchroniczne, więc `zapisz` zwraca boolean. Pierwsza wersja wołała
       `historia.zapisz(...).catch(() => {})` — pierwsze żądanie przechodziło (zapis się udawał),
       a `.catch` nie jest funkcją boolean-a, więc wyjątek leciał w górę i KAŻDE kolejne żądanie
       wracało jako 422. Złapane trzema strzałami pod rząd, nie testem. */
    const src = czytaj('web/server.mjs');
    expect(src).toMatch(/historia\.zapisz\(\{ raport, tekst, ip \}\);/);
    expect(src).not.toMatch(/historia\.zapisz\([^)]*\)\.catch/);
  });

  it('⚠ REGRESJA: statystyki czyta się po ANGIELSKICH nazwach silnika', () => {
    /* Pierwsza wersja czytała `wejscie.typow` (polskie), a silnik wystawia `objectTypes`.
       Efekt: kolumny pełne `null`, nie do odróżnienia od kolumn, których nikt nie wypełnił. */
    const w = wpisHistorii({
      raport: { wejscie: { objectTypes: 5, properties: 13, linkTypes: 2, actionTypes: 3, interfaces: 1 }, projekt: {} },
      tekst: 'x',
    });
    expect(w.statystyki).toEqual({ typow: 5, wlasciwosci: 13, linkow: 2, akcji: 3, interfejsow: 1 });
  });

  it('wpis niesie to, z czego da się pisać reguły: wynik, znaleziska KODU i wnioski MODELU', () => {
    const w = wpisHistorii({
      raport: {
        wersja: '0.6',
        wejscie: { format: 'foundry', skladnia: 'json', ontology: 'x', typow: 3 },
        projekt: { wynik: 88.5, kategorie: [], znaleziska: [{ id: 'P03', klasa: 'ryzyko', co: 'coś' }] },
        ai: { tryb: 'skan', model: 'm', znaleziska: [{ element: 'core.Order', co: 'napis zamiast bytu' }], klasyPrzeoczen: [] },
      },
      tekst: '{"objectTypes":[]}',
    });
    expect(w.wynik).toBe(88.5);
    expect(w.kod[0].id).toBe('P03');
    expect(w.ai.znaleziska[0].element, 'wnioski modelu są tu NAJWAŻNIEJSZE').toBe('core.Order');
    expect(w.skrot, 'skrót wejścia — po nim widać powtórkę, bez trzymania pliku').toMatch(/^[0-9a-f]{16}$/);
  });

  it('⚠ wpis NIE NIESIE adresu IP — sam fakt, że żądanie skądś przyszło, wystarczy do liczenia', () => {
    const w = wpisHistorii({ raport: { projekt: {} }, tekst: 'x', ip: '203.0.113.7' });
    expect(JSON.stringify(w)).not.toMatch(/203\.0\.113\.7/);
    expect(w.zIp).toBe(true);
  });

  it('wpis liczy znaleziska po klasach — po tym widać, czy model się psuje, czy poprawia', () => {
    const w = wpisHistorii({
      raport: { projekt: { znaleziska: [
        { id: 'P01', klasa: 'zlamanie', co: 'a' }, { id: 'P03', klasa: 'ryzyko', co: 'b' },
        { id: 'P14', klasa: 'uwaga', co: 'c' }, { id: 'P28', klasa: 'uwaga', co: 'd' },
      ] } },
      tekst: 'x',
    });
    expect([w.zlaman, w.ryzyk, w.uwag]).toEqual([1, 1, 2]);
  });

  it('⚠ STOPKA CZYTA STAN Z SERWERA, a nie ma go wpisanego na sztywno', () => {
    const html = czytaj('web/public/index.html');
    expect(html).toMatch(/id="obietnicaZapisu"/);
    expect(html, 'i przepisuje się, gdy serwer mówi, że zapisuje').toMatch(/z\.historia/);
    expect(html, 'z osobnym zdaniem, gdy zapisuje także TREŚĆ').toMatch(/z\.historiaTresc/);
    expect(czytaj('web/server.mjs'), '`/api/zdrowie` musi ten stan podawać')
      .toMatch(/historia: historia\.wlaczona\(\)/);
  });

  it('⚠ HISTORIA NIE JEST PUBLICZNA — a od podglądu na stronie znaczy to WIĘCEJ', () => {
    /* Do 16.09 z bazy wychodziły same metryki. Od kiedy zegarek w pasku otwiera pojedyncze
       sprawdzenie, wychodzi też TREŚĆ wrzuconego pliku — czyli cudzy model biznesu z adresu,
       który jest publiczny. Jedyne, co dzieli zbiór do poprawiania reguł od wycieku, to token. */
    const src = czytaj('web/server.mjs');
    expect(src, 'bez tokenu trasy NIE MA — 404, nie 401').toMatch(/HISTORIA_TOKEN/);
    expect(src).toMatch(/nie ma takiej trasy/);
    /* ⚠ OBIE trasy za tą samą bramką — lista i pojedynczy wpis. */
    const listowa = src.indexOf("sciezka === '/api/historia'");
    const pojedyncza = src.indexOf('/^\\/api\\/historia\\/');
    expect(pojedyncza, 'trasa pojedynczego wpisu istnieje').toBeGreaterThan(0);
    for (const poz of [listowa, pojedyncza]) {
      expect(src.slice(poz, poz + 400), 'brak wywołania bramki przy trasie')
        .toMatch(/historiaOtwarta\(\)/);
    }
    /* ⚠ Lista DALEJ nie wybiera treści: po niej chodzi się, żeby coś znaleźć, a nie żeby
       czytać. Gwiazdka w tym `SELECT` wystawiłaby wszystko naraz jednym znakiem. */
    const hist = czytaj('web/historia.mjs');
    /* ⚠ Wycinamy SAMO CIAŁO `ostatnie()` — do klamry na początku linii. Wcześniejsza wersja
       ciachała „do następnej funkcji" i po dołożeniu `jedno()` łapała jej komentarz, w którym
       słowo `tresc` stoi zupełnie legalnie. Test ma pilnować ZAPYTANIA, nie prozy obok. */
    const od = hist.indexOf('export function ostatnie');
    const zapytanie = hist.slice(od, hist.indexOf('\n}', od));
    expect(zapytanie, 'SELECT bez kolumny `tresc`').not.toMatch(/tresc/);
    expect(zapytanie, 'i bez gwiazdki, która wciągnęłaby ją z powrotem').not.toMatch(/SELECT \*/);
  });

  it('⚠ NIEUDANE SPRAWDZENIE TEŻ JEST SESJĄ — bo to ono uczy najwięcej', () => {
    /* Trzy odmowy z rzędu, od których zaczęły się ostatnie poprawki parsera, nie zostawiły
       w bazie ANI JEDNEGO śladu i wróciły do nas pocztą pantoflową. */
    const src = czytaj('web/server.mjs');
    const katch = src.slice(src.indexOf('} catch (e) {', src.indexOf("sciezka === '/api/waliduj'")));
    expect(katch.slice(0, 600), 'zapis wpisu z powodem, zanim pójdzie 422').toMatch(/historia\.zapisz\(\{ raport: null/);
    const hist = czytaj('web/historia.mjs');
    expect(hist, 'kolumna na powód').toMatch(/tresc TEXT, blad TEXT/);
    /* ⚠ Na prodzie baza JUŻ STOI — `CREATE TABLE IF NOT EXISTS` nie dokłada do niej kolumny. */
    expect(hist, 'migracja istniejącej bazy').toMatch(/ALTER TABLE sprawdzenia ADD COLUMN/);
  });

  it('⚠ NOWY MODUŁ JEST W OBRAZIE, a wolumen montuje się ZAWSZE', () => {
    expect(czytaj('Dockerfile'), 'brak `import`-u to kontener, który nie wstaje').toMatch(/historia\.mjs/);
    const wdroz = czytaj('deploy/wdroz.sh');
    expect(wdroz, 'bez wolumenu baza ginie przy każdym redeployu').toMatch(/walidator-dane/);
    expect(wdroz.match(/-v ~\/walidator-dane/g) ?? [], 'obie gałęzie `docker run`, z plikiem env i bez')
      .toHaveLength(2);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   P27 + AI-S1 — POLA, KTÓRE RAZEM OPISUJĄ JEDNO POJĘCIE
   ──────────────────────────────────────────────────────────────────────────────────────────
   Podział roboty rozstrzygnięty POMIAREM, nie gustem: `P27` grupuje po WSPÓLNYM WYRAZIE
   i na `production.PlanningPolicy` widzi 32 z 59 pól. Pozostałych 27 też opisuje pojęcia
   (`dayBoundaryHour` + `dueTime` + `calendarWindowDays` = doba), ale spoiwa nie ma w NAZWIE,
   tylko w ZNACZENIU — i to jest pytanie dla modelu, nie dla licznika.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('P27 · rodzina pól prosząca się o strukturę', () => {
  const zPolami = (nazwy) => {
    const o = czysta();
    for (const n of nazwy) o.objectTypes[0].properties.push({ apiName: n, type: 'string', description: 'Pole.' });
    return o;
  };
  const p27 = (o) => ocen(o).znaleziska.filter((z) => z.id === 'P27');

  it('rodzina po PREFIKSIE trafia od czterech pól', () => {
    expect(p27(zPolami(['addressStreet', 'addressCity', 'addressZip', 'addressCountry'])).length).toBe(1);
  });

  it('⚠ REGRESJA: jednowyrazowy prefiks NIE MOŻE wpaść do kubełka rzeczowników', () => {
    /* Klucze obu detekcji zderzały się na jednowyrazowej rodzinie (`speed`), przez co dostawała
       wyższy próg i znalezisko z pierwotnego `P27` po cichu znikało. Stąd `p:` w kluczu. */
    expect(p27(zPolami(['speedManual', 'speedIndex', 'speedSource', 'speedOverride'])).length).toBe(1);
  });

  it('⚠ rodzina po RZECZOWNIKU w środku nazwy — tego prefiks nie widzi ani razu', () => {
    const t = p27(zPolami(['minShiftLength', 'maxShiftLength', 'shiftGridStep', 'maxShiftsPerDay']));
    expect(t.length, 'wszystkie cztery mówią o ZMIANIE').toBe(1);
    expect(t[0].co).toMatch(/shift/);
  });

  it('⚠ KWALIFIKATOR NIE JEST POJĘCIEM — `min`/`max`/`default` nie sklejają rodziny', () => {
    /* Bez stoplisty `minShiftLength` i `maxOrderValue` byłyby „rodziną” przez wspólne `min`/`max`,
       a `defaultSpeed` i `defaultColor` przez `default`. Rodzina bierze się z RZECZOWNIKA. */
    expect(p27(zPolami(['minAlpha', 'maxBeta', 'minGamma', 'maxDelta'])).length).toBe(0);
    expect(p27(zPolami(['defaultAlpha', 'defaultBeta', 'defaultGamma', 'defaultDelta'])).length)
      .toBeLessThanOrEqual(1);
  });

  it('⚠ JEDNA RODZINA — JEDNO ZNALEZISKO, choć pasuje do obu detekcji', () => {
    /* `gateMaterial`… pasuje i jako prefiks `gate`, i jako rzeczownik `gate`. Raport, który
       mówi dwa razy to samo, czyta się jak dwa problemy. */
    const t = p27(zPolami(['gateMaterial', 'gateTechnology', 'gateDone', 'gateTool', 'gateStock']));
    expect(t.length).toBe(1);
  });
});

describe('AI-S1 · grupa pól, której spoiwem jest ZNACZENIE, nie nazwa', () => {
  const model = () => ({
    objectTypes: [{
      apiName: 'Policy',
      properties: ['dayBoundaryHour', 'dueTime', 'calendarWindowDays', 'softHorizon', 'hardHorizon',
        'a', 'b', 'c', 'd', 'e', 'f', 'g'].map((n) => ({ apiName: n })),
    }],
  });
  const odpowiedz = (struktury) => znaleziskaZEtykiet(
    wierszeDoKlasyfikacji(model()), { struktury }, [], new Set(), wierszeStruktur(model()),
  );

  it('grupa z prawdziwych pól przechodzi i niesie nazwę pojęcia', () => {
    const r = odpowiedz([{ typ: 'Policy', pojecie: 'doba', pola: ['dayBoundaryHour', 'dueTime', 'calendarWindowDays'] }]);
    expect(r.struktury).toHaveLength(1);
    expect(r.znaleziska.find((z) => z.id === 'AI-S1').elementy[0]).toMatch(/doba/);
  });

  it('⚠ ZMYŚLONE POLE I ZMYŚLONY TYP WYPADAJĄ — i są policzone', () => {
    const r = odpowiedz([
      { typ: 'Policy', pojecie: 'x', pola: ['dayBoundaryHour', 'nieMaTakiego', 'aniTakiego'] },
      { typ: 'CalkiemInny', pojecie: 'y', pola: ['a', 'b', 'c'] },
    ]);
    expect(r.struktury, 'pierwsza grupa spada poniżej trzech prawdziwych pól').toHaveLength(0);
    expect(r.pominieto).toBe(3);
  });

  it('grupa krótsza niż trzy pola nie jest strukturą', () => {
    expect(odpowiedz([{ typ: 'Policy', pojecie: 'horyzont', pola: ['softHorizon', 'hardHorizon'] }]).struktury)
      .toHaveLength(0);
  });

  it('⚠ do modelu idą tylko typy o WIELU polach — reszta byłaby płaceniem za nic', () => {
    const maly = { objectTypes: [{ apiName: 'Maly', properties: [{ apiName: 'a' }, { apiName: 'b' }] }] };
    expect(wierszeStruktur(maly)).toHaveLength(0);
    expect(wierszeStruktur(model())).toHaveLength(1);
  });

  it('⚠ MODEL DOSTAJE KANDYDATÓW LICZNIKA DO ROZSTRZYGNIĘCIA, a nie polecenie ich omijania', () => {
    /* Pierwsza wersja kazała modelowi POMIJAĆ rodziny leksykalne („te widzi licznik”). To było
       gorsze rozwiązanie tego samego problemu: licznik zostawał sam ze swoim zgadywaniem, a jego
       fałszywe sklejki (wspólny wyraz ≠ jeden byt) nie miały kto obalić. Dziś kandydaci JADĄ
       do modelu po werdykt, a licznik za swoją nominację nie odejmuje punktów. */
    const src = czytaj('web/ai.mjs');
    expect(src).toMatch(/PODEJRZENIA LICZNIKA/);
    expect(src, 'i mówi wprost, czego szukać poza kandydatami').toMatch(/spoiwem jest ZNACZENIE/);
    expect(src).not.toMatch(/NIE WYPISUJ grup, których nazwy mają wspólny wyraz/);
  });

  it('recepta niesie cytat i UCZCIWIE wymienia ograniczenia struktur w Foundry', () => {
    const r = odpowiedz([{ typ: 'Policy', pojecie: 'doba', pola: ['dayBoundaryHour', 'dueTime', 'calendarWindowDays'] }]);
    const z = r.znaleziska.find((x) => x.id === 'AI-S1');
    expect(z.zrodlo).toMatch(/Group semantically related fields into structs/);
    expect(z.jak, 'bez zagnieżdżania, pola nie tablicami, kłopot z polami pochodnymi').toMatch(/zagnieżdżania/);
    expect(z.jak, 'i ostrzeżenie: tnij po POJĘCIU, nie po zakładce ekranu').toMatch(/nie po zakładce/);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   KOD NOMINUJE, MODEL ROZSTRZYGA — klasa `podpowiedz` (0 pkt)
   ──────────────────────────────────────────────────────────────────────────────────────────
   ⚠ To jest odpowiedź na pytanie, którego licznik nie umie zadać: „te nazwy mają wspólny
   wyraz” jest dowodem na PYTANIE, nie na usterkę. `medianCost` i `medianDelay` nie są jednym
   bytem, a wspólny wyraz mają. Odejmowanie za to punktów byłoby karaniem kogoś za NASZE
   zgadywanie — więc kandydat idzie na ekran za ZERO punktów, a rozstrzyga model albo człowiek.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('klasa `podpowiedz` — kod wskazuje, nie orzeka', () => {
  it('⚠ KOSZTUJE ZERO — i to jest cała różnica wobec `uwaga`', () => {
    expect(KLASY.podpowiedz.koszt).toBe(0);
    const o = czysta();
    for (const n of ['addressStreet', 'addressCity', 'addressZip', 'addressCountry']) {
      o.objectTypes[0].properties.push({ apiName: n, type: 'string', description: 'Pole.' });
    }
    const r = ocen(o);
    expect(r.znaleziska.some((z) => z.id === 'P27' && z.klasa === 'podpowiedz')).toBe(true);
    /* ⚠ Niezmiennik, a nie porównanie dwóch modeli: dołożenie pól budzi też INNE reguły, więc
       „ten sam model bez rodziny” nie jest tym samym modelem. Liczy się to, że suma kosztów
       z podpowiedziami i bez nich jest IDENTYCZNA. */
    const koszt = (lista) => lista.reduce((a, z) => a + KLASY[z.klasa].koszt, 0);
    expect(koszt(r.znaleziska)).toBe(koszt(r.znaleziska.filter((z) => z.klasa !== 'podpowiedz')));
  });

  it('podpowiedź niesie PEŁNĄ listę pól i stabilny klucz — bez nich nie ma czego rozstrzygać', () => {
    const o = czysta();
    for (const n of ['gateA', 'gateB', 'gateC', 'gateD']) {
      o.objectTypes[0].properties.push({ apiName: n, type: 'string', description: 'Pole.' });
    }
    const z = ocen(o).znaleziska.find((x) => x.id === 'P27');
    expect(z.elementy).toHaveLength(4);
    /* ⚠ Klucz jest KRÓTKI i bez spacji — model ma go przepisać co do znaku. Adres
       (`P19:actionTypes[* → production.Task]`) przepisuje się źle i werdykt przepada. */
    expect(z.kandydat).toMatch(/^P27#\d+$/);
  });

  it('⚠ REGRESJA: `regula()` nie gubi pól, których nie zna', () => {
    /* Konstruktor znaleziska destrukturyzował STAŁĄ listę pól, więc `elementy` i `kandydat`
       wypadały po cichu — kandydaci `P27` nie dojeżdżali do warstwy modelu, a licznik wyglądał,
       jakby ich w ogóle nie produkował. Złapane na żywym żądaniu (`kandydatowKodu: 0`). */
    const src = czytaj('engine/palantir.mjs');
    expect(src).toMatch(/const regula = \(ok, \{[^}]*\.\.\.reszta \}\)/);
  });

  it('model ODRZUCA kandydata — i tylko takiego, którego kod naprawdę zgłosił', () => {
    const kandydaci = [{ klucz: 'Policy:median', pola: ['medianCost', 'medianDelay', 'medianQty'] }];
    const r = znaleziskaZEtykiet(
      wierszeDoKlasyfikacji({ objectTypes: [{ apiName: 'Policy', properties: [{ apiName: 'a' }] }] }),
      { odrzucone: ['Policy:median', 'CalkiemZmyslony:klucz'] },
      [], new Set(), [], kandydaci,
    );
    expect(r.odrzuconePodejrzenia, 'zmyślony klucz nie ma jak wejść do raportu').toEqual(['Policy:median']);
    expect(r.podejrzenKodu).toBe(1);
  });

  it('⚠ PROMPT DAJE WZORCE, nie listę słów — i mówi, co strukturą NIE jest', () => {
    const src = czytaj('web/ai.mjs');
    expect(src, 'wartość wielopolowa, z metadanymi, z wyborem').toMatch(/CO NAPRAWDĘ JEST STRUKTURĄ/);
    expect(src, 'i kontrprzykład: pola powiązane TEMATEM, a nie bytem').toMatch(/TO NIE JEST STRUKTURA/);
    expect(src, 'plus test „bez siebie nawzajem nic nie znaczą”').toMatch(/nie jest adresem/);
    expect(src, 'i polecenie rozstrzygnięcia podejrzeń licznika').toMatch(/ODRZUĆ TE, KTÓRE SĄ UZASADNIONE/);
  });

  it('serwer wysyła do modelu KAŻDĄ podpowiedź, nie tylko rodziny pól', () => {
    const src = czytaj('web/server.mjs');
    expect(src).toMatch(/z\.klasa === 'podpowiedz' && z\.kandydat/);
    expect(src, 'z twierdzeniem, bo po samym kluczu nie da się nic rozstrzygnąć').toMatch(/co: z\.co/);
    expect(src).toMatch(/klasyfikuj\(o, \{ juzZgloszone: nazwyZKodu, kandydaci \}\)/);
  });

  it('⚠ KAŻDA podpowiedź dostaje klucz SAMA — nowa reguła nie może zostać bez werdyktu', () => {
    /* ⚠ Fikstura musi odpalić regułę, która NAPRAWDĘ jest podpowiedzią. `kind` z trzema
       wartościami nią nie jest — dyskryminator stoi w dokumentacji jako wskaźnik God Objecta
       wprost, więc kosztuje (`P03`, `ryzyko`). Rodzina pól to nasz własny detektor. */
    const o = czysta();
    for (const n of ['addressStreet', 'addressCity', 'addressZip', 'addressCountry']) {
      o.objectTypes[0].properties.push({ apiName: n, type: 'string', description: 'Pole.' });
    }
    const podp = ocen(o).znaleziska.filter((z) => z.klasa === 'podpowiedz');
    expect(podp.length).toBeGreaterThan(0);
    for (const z of podp) expect(z.kandydat, `${z.id} bez klucza`).toMatch(/^P\d+#\d+$/);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   KRYTERIUM KOSZTU — za co wolno odejmować punkty
   ──────────────────────────────────────────────────────────────────────────────────────────
   ⚠ To jest najważniejsza granica całego narzędzia, bo to ona decyduje, czy liczba 0–100
   cokolwiek znaczy. Punkty kosztuje WYŁĄCZNIE to, co wynika z SAMEGO PLIKU:
     (a) sprzeczność albo rzecz, której Foundry nie zbuduje,
     (b) brak deklaracji, której Foundry wymaga (status, opis, klucz, nazwa powrotna),
     (c) WSKAŹNIK WYMIENIONY W DOKUMENTACJI DOSŁOWNIE („more than 10 action types”,
         „names that read like Set [Property]”, „many properties that are frequently null”).
   Wszystko inne — nasz własny detektor stojący na progu albo wzorcu nazwy — jest PODPOWIEDZIĄ
   za zero punktów, bo poprawny model regularnie takie rzeczy wywołuje.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('kryterium kosztu — punkty tylko za to, co widać w pliku', () => {
  it('klasa `podpowiedz` nie kosztuje ani punktu, a jest jej ponad tuzin', () => {
    expect(KLASY.podpowiedz.koszt).toBe(0);
    const hinty = REGULY.filter((r) => r.klasa === 'podpowiedz');
    expect(hinty.length, 'to nie jest wyjątek dla jednej reguły, tylko klasa reguł').toBeGreaterThanOrEqual(15);
  });

  it('⚠ WSKAŹNIKI Z DOKUMENTACJI DALEJ KOSZTUJĄ — B4 nie zniknęło', () => {
    /* Palantir wymienia je wprost przy Action Sprawl, więc nie są naszym zgadywaniem.
       `P20` mówi w uzasadnieniu, że osobny gest bywa uzasadniony — i po to jest werdykt
       modelu, a nie zerowanie kosztu. */
    const wgId = new Map(REGULY.map((r) => [r.id, r]));
    expect(wgId.get('P19').klasa, '„more than 10 action types for a single object type”').toBe('ryzyko');
    expect(wgId.get('P20').klasa, '„action names that read like Set [Property]”').toBe('uwaga');
    expect(wgId.get('P01').klasa, '„many properties that are frequently null”').toBe('ryzyko');
    expect(wgId.get('P03').klasa, '„property meanings change based on another property’s value”').toBe('ryzyko');
  });

  it('⚠ NASZE WŁASNE DETEKTORY NIE KOSZTUJĄ — nawet gdy mają cytat przy uzasadnieniu', () => {
    const wgId = new Map(REGULY.map((r) => [r.id, r]));
    for (const id of ['P27', 'P30', 'P36', 'P38', 'P40', 'P48', 'P51', 'P23', 'P26', 'P28', 'P54']) {
      expect(wgId.get(id).klasa, `${id} stoi na progu albo nazwie — nie wolno mu kosztować`).toBe('podpowiedz');
    }
  });

  it('sprzeczności i braki kosztują dalej', () => {
    const wgId = new Map(REGULY.map((r) => [r.id, r]));
    for (const id of ['P24', 'P32', 'P35', 'P37', 'P39', 'P45', 'P47', 'P52']) {
      expect(wgId.get(id).klasa, `${id} to sprzeczność albo rzecz niebudowalna`).toBe('zlamanie');
    }
    for (const id of ['P31', 'P42', 'P43', 'P33']) {
      expect(['ryzyko', 'uwaga'], `${id} to brak deklaracji`).toContain(wgId.get(id).klasa);
    }
  });

  it('⚠ SZABLON DALEJ 100/100, a przykład zły dalej wyraźnie niżej', () => {
    const wynik = (p, json) => {
      const t = json ? JSON.parse(czytaj(p)) : wczytajTekst(czytaj(p)).dane;
      return ocen(normalizuj(t)).wynik;
    };
    const szablon = wynik('web/public/szablon.yaml', false);
    const zly = wynik('web/public/przyklad-zly.json', true);
    expect(szablon).toBe(100);
    expect(zly, 'przeklasyfikowanie nie ma prawa zrównać złego modelu ze wzorcem').toBeLessThan(80);
  });
});

describe('rejestr reguł nie może kłamać o klasie', () => {
  it('⚠ KLASA W `REGULY` ZGADZA SIĘ Z TYM, CO REGUŁA NAPRAWDĘ EMITUJE', () => {
    /* Znalezione testem, nie przeglądem: `P27` emitował `podpowiedz` (0 pkt), a rejestr —
       który karmi zakładkę „Reguły” i wszystkie testy chodzące po klasach — mówił `uwaga`.
       Czytelnik widziałby w dokumentacji narzędzia inną cenę niż ta, którą płaci. */
    const src = czytaj('engine/palantir.mjs');
    const wRejestrze = new Map(REGULY.map((r) => [r.id, r.klasa]));
    const wKodzie = new Map();
    for (const m of src.matchAll(/id: '(P\d+)', klasa: '([a-z]+)'/g)) wKodzie.set(m[1], m[2]);
    expect(wKodzie.size, 'każda reguła z rejestru ma miejsce wywołania').toBe(wRejestrze.size);
    for (const [id, klasa] of wKodzie) {
      expect(klasa, `${id}: kod mówi ${klasa}, rejestr ${wRejestrze.get(id)}`).toBe(wRejestrze.get(id));
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════════════════════
   `P52` · `P53` · `P54` — TRZY ZNALEZISKA Z PRACY NAD MANIFESTEM, PRZENIESIONE DO NARZĘDZIA
   ────────────────────────────────────────────────────────────────────────────────────────
   Wszystkie trzy wyszły z przeglądu NASZEGO modelu, a nie z czytania dokumentacji — i dlatego
   mają tu po parze testów „ma trafić” / „NIE ma trafić”. Każda z nich ma sąsiada, w którego
   łatwo trafić przez pomyłkę, i ten sąsiad jest tu wypisany z nazwiska.
   ════════════════════════════════════════════════════════════════════════════════════════ */

describe('P52 · struktura w strukturze — ale TYLKO tam, gdzie Foundry musi ją założyć', () => {
  /* ⚠ Znalezisko z ontologii produkcyjnej: `core.GateVerdict` → `core.TechnologyGaps` →
     `core.TechnologyGap`, a `GateVerdict` stoi jako PARAMETR akcji `addToPlan`. Pola struct
     property type są płaskie, więc tego kształtu nie da się w Ontology Managerze założyć.
     Ten sam rekord UŻYTY WYŁĄCZNIE W SYGNATURZE FUNKCJI jest w porządku — custom type
     w repozytorium kodu to zwykły `interface` TypeScriptu i zagnieżdża się do woli. */

  const struktura = (apiName, pola) => ({
    apiName, type: 'struct', isStruct: true,
    fields: pola.map(([n, typ]) => ({ apiName: n, type: typ, typeRaw: typ })),
  });
  const zeStrukturami = ({ shared = [], fnTypes = [], uzycie = {} } = {}) => {
    const o = czysta();
    o.sharedPropertyTypes = shared;
    o.functionTypes = fnTypes;
    if (uzycie.wlasciwosc) {
      o.objectTypes[0].properties.push({
        apiName: 'poleTestowe', type: uzycie.wlasciwosc, typeRaw: uzycie.wlasciwosc,
        description: 'Pole użyte w teście zagnieżdżania struktur.',
      });
    }
    if (uzycie.parametr) {
      o.actionTypes[0].parameters.push({
        apiName: 'parametrTestowy', type: uzycie.parametr, typeRaw: uzycie.parametr, required: false,
      });
    }
    if (uzycie.sygnatura) {
      o.functions.push({
        apiName: 'policz', description: 'Funkcja użyta w teście zagnieżdżania struktur.',
        status: 'active',
        inputs: [{ apiName: 'wejscie', type: uzycie.sygnatura, typeRaw: uzycie.sygnatura }],
        output: { type: 'decimal', typeRaw: 'decimal' },
      });
    }
    return o;
  };

  it('struktura stojąca jako typ WŁAŚCIWOŚCI nie może nieść drugiej struktury', () => {
    const t = trafienia(zeStrukturami({
      shared: [struktura('Verdict', [['gaps', 'struct(Gaps)']]), struktura('Gaps', [['count', 'integer']])],
      uzycie: { wlasciwosc: 'struct(Verdict)' },
    }));
    expect(t.has('P52')).toBe(true);
  });

  it('parametr AKCJI to też powierzchnia ontologii — tam Foundry zakłada ten typ tak samo', () => {
    /* To jest DOKŁADNIE nasz przypadek: `addToPlan.panelVerdict = struct(core.GateVerdict)`. */
    const t = trafienia(zeStrukturami({
      shared: [struktura('Verdict', [['gaps', 'struct(Gaps)']]), struktura('Gaps', [['count', 'integer']])],
      uzycie: { parametr: 'struct(Verdict)' },
    }));
    expect(t.has('P52')).toBe(true);
  });

  it('⚠ P52 NIE trafia w typ KODU używany wyłącznie przez sygnaturę — tam zagnieżdżenie jest legalne', () => {
    /* Ten sąsiad jest całym sednem reguły i najprościej go zgubić przy „porządkowaniu”:
       pytanie brzmi „czy Foundry musi ten typ ZAŁOŻYĆ”, a nie „czy rekord ma rekord w środku”. */
    const t = trafienia(zeStrukturami({
      fnTypes: [struktura('SolverInput', [['tasks', 'list(struct(SolverTask))']]), struktura('SolverTask', [['minutes', 'integer']])],
      uzycie: { sygnatura: 'struct(SolverInput)' },
    }));
    expect(t.has('P52'), 'custom type w repozytorium funkcji zagnieżdża się do woli').toBe(false);
  });

  it('P52 NIE trafia w strukturę o samych polach skalarnych', () => {
    const t = trafienia(zeStrukturami({
      shared: [struktura('Money', [['amount', 'decimal'], ['currency', 'string']])],
      uzycie: { wlasciwosc: 'struct(Money)' },
    }));
    expect(t.has('P52')).toBe(false);
  });

  it('⚠ ŁAŃCUCH ZGŁASZA SIĘ CAŁY, nie pierwszym ogniwem — każde piętro to osobna rzecz do rozstrzygnięcia', () => {
    const r = ocen(zeStrukturami({
      shared: [
        struktura('A', [['b', 'struct(B)']]),
        struktura('B', [['c', 'struct(C)']]),
        struktura('C', [['ile', 'integer']]),
      ],
      uzycie: { wlasciwosc: 'struct(A)' },
    }));
    const z = r.znaleziska.find((x) => x.id === 'P52');
    expect(z, 'P52 ma trafić').toBeTruthy();
    expect(z.co, 'oba piętra w jednym znalezisku').toMatch(/2 pól struktury/);
    expect(z.co).toContain('`A.b` → `B`');
    expect(z.co).toContain('`B.c` → `C`');
  });

  it('⚠ STRUKTURA, KTÓREJ NIKT NIE UŻYWA, NIE JEST PROBLEMEM FOUNDRY — od tego jest P46', () => {
    const t = trafienia(zeStrukturami({
      shared: [struktura('Verdict', [['gaps', 'struct(Gaps)']]), struktura('Gaps', [['count', 'integer']])],
    }));
    expect(t.has('P52'), 'typ nieużywany nigdzie nie zostanie założony, więc nie ma czego odmówić').toBe(false);
    expect(t.has('P46'), 'to jest znalezisko P46, a nie P52').toBe(true);
  });
});

describe('P53 · pole wypełniane RĘKĄ, którego nie ma czym wypełnić', () => {
  /* ⚠ Reguła ze zdania właściciela: „pole `manual` bez akcji to pole, którego nikt nigdy nie
     wypełni”, z jego własnym wyjściem awaryjnym: przepuszczamy pole, które UCZCIWIE mówi
     „jeszcze mnie nie ma” (stan + nota z powodem). Krzyczy tylko to, co UDAJE, że działa. */

  const zPolemRecznym = ({ pole = {}, rules = null, statusTypu = 'active' } = {}) => {
    const o = czysta();
    o.objectTypes[0].status = statusTypu;
    o.objectTypes[0].properties.push({
      apiName: 'plannerNote', type: 'string', required: false, editOnly: true,
      description: 'Notatka planisty przy fakturze.',
      ...pole,
    });
    if (rules) o.actionTypes[0].rules = rules;
    return o;
  };

  it('pole `editOnly` na żywym typie, do którego nie pisze żadna akcja — trafia', () => {
    const t = trafienia(zPolemRecznym({ rules: [{ op: 'create', target: 'Customer' }] }));
    expect(t.has('P53')).toBe(true);
  });

  it('akcja wskazująca POLE z nazwiska — nie trafia', () => {
    const t = trafienia(zPolemRecznym({ rules: [{ op: 'modify', target: 'Invoice.plannerNote' }] }));
    expect(t.has('P53')).toBe(false);
  });

  it('⚠ akcja wskazująca sam TYP też jest drogą zapisu — nie trafia', () => {
    /* Większość modeli nie rozbija celu akcji na kolumny. Pytanie brzmi „czy istnieje droga
       zapisu”, a nie „czy ktoś wymienił to pole z nazwiska” — inaczej reguła krzyczałaby
       na każdym modelu, który deklaruje cele na poziomie typu. */
    const t = trafienia(zPolemRecznym({ rules: [{ op: 'modify', target: 'Invoice' }] }));
    expect(t.has('P53')).toBe(false);
  });

  it('akcja, która ten obiekt TWORZY, stawia przy okazji jego pola — nie trafia', () => {
    const t = trafienia(zPolemRecznym({ rules: [{ op: 'create', target: 'Invoice' }] }));
    expect(t.has('P53')).toBe(false);
  });

  it('⚠ WYJŚCIE AWARYJNE WŁAŚCICIELA: stan `planned` I NOTA z powodem — nie trafia', () => {
    const t = trafienia(zPolemRecznym({
      pole: { status: 'planned', description: 'Wchodzi z logowaniem — dziś nie ma kto tego wpisać.' },
      rules: [{ op: 'create', target: 'Customer' }],
    }));
    expect(t.has('P53'), 'model, który uczciwie mówi „jeszcze nie mam”, nie kłamie').toBe(false);
  });

  it('⚠ SAM STAN `planned` BEZ NOTY — TRAFIA, bo nota Z POWODEM jest całym warunkiem', () => {
    /* Bez tej asercji wyjście awaryjne zdegenerowałoby się w „dopisz `planned` i cisza”. */
    const t = trafienia(zPolemRecznym({
      pole: { status: 'planned', description: '' },
      rules: [{ op: 'create', target: 'Customer' }],
    }));
    expect(t.has('P53')).toBe(true);
  });

  it('⚠ pole na typie, który SAM jest niegotowy — nie trafia', () => {
    const t = trafienia(zPolemRecznym({
      statusTypu: 'experimental',
      rules: [{ op: 'create', target: 'Customer' }],
    }));
    expect(t.has('P53'), 'cały byt nie udaje, że działa — więc żadne jego pole nie udaje osobno').toBe(false);
  });

  it('pole ZWYKŁE (z rury) bez akcji — nie trafia; reguła jest o polach RĘCZNYCH', () => {
    const t = trafienia(zPolemRecznym({
      pole: { editOnly: undefined },
      rules: [{ op: 'create', target: 'Customer' }],
    }));
    expect(t.has('P53')).toBe(false);
  });

  it('⚠ JEDNO ZNALEZISKO NA MODEL, nie na pole — brak warstwy zapisu to JEDNO przeoczenie', () => {
    const o = zPolemRecznym({ rules: [{ op: 'create', target: 'Customer' }] });
    o.objectTypes[0].properties.push({
      apiName: 'plannerFlag', type: 'boolean', required: false, editOnly: true,
      description: 'Druga notatka planisty, tak samo bez drogi zapisu.',
    });
    const z = ocen(o).znaleziska.filter((x) => x.id === 'P53');
    expect(z.length, 'dwa identyczne wiersze nie niosą ani jednej informacji więcej').toBe(1);
    expect(z[0].co).toMatch(/2 pól/);
  });
});

describe('P54 · dziennik edycji, który nie niesie wartości SPRZED zmiany', () => {
  /* ⚠ Zdanie właściciela: „albo nasz magazyn ma warstwę karteczek, albo nadpisuje wiersze
     i wtedy żadna z czterech nie zadziała”. Cztery zdolności (pole ręczne, wymagalność przy
     edycji, egzekwowana klasyfikacja, cofnięcie) jadą na JEDNEJ decyzji o magazynie.
     ⚠ Reguła ŚWIADOMIE nie żąda typu „Edycja” od modelu wdrażanego NA FOUNDRY — tam warstwę
     karteczek daje platforma. Odzywa się dopiero, gdy ktoś zamodelował dziennik SAM i zrobił
     to w połowie. */

  const zDziennikiem = ({ pola, odwracalna = true, reczne = false } = {}) => {
    const o = czysta();
    o.actionTypes[0].revertible = odwracalna;
    if (reczne) {
      o.objectTypes[0].properties.push({
        apiName: 'plannerNote', type: 'string', required: false, editOnly: true,
        description: 'Notatka planisty przy fakturze.',
      });
      o.actionTypes[0].rules = [{ op: 'modify', target: 'Invoice' }];
    }
    if (pola) {
      o.objectTypes.push({
        apiName: 'Edit',
        description: 'Zapis pojedynczej zmiany wartości pola, z autorem i chwilą.',
        primaryKey: 'editId', titleProperty: 'editId', status: 'active', visibility: 'hidden',
        implements: [],
        properties: pola.map(([n, typ]) => ({
          apiName: n, type: typ, required: false,
          description: `Pole dziennika edycji: ${n}.`,
        })),
      });
    }
    return o;
  };

  it('dziennik notujący sam FAKT zmiany, przy akcji odwracalnej — trafia', () => {
    const t = trafienia(zDziennikiem({ pola: [['editId', 'string'], ['changedField', 'string'], ['editedAt', 'timestamp']] }));
    expect(t.has('P54')).toBe(true);
  });

  it('dziennik z wartością PRZED i PO — nie trafia', () => {
    const t = trafienia(zDziennikiem({
      pola: [['editId', 'string'], ['beforeValue', 'string'], ['afterValue', 'string'], ['editedAt', 'timestamp']],
    }));
    expect(t.has('P54'), 'z tego cofnięcie da się złożyć').toBe(false);
  });

  it('⚠ P54 NIE trafia w model BEZ dziennika — na Foundry warstwę karteczek daje PLATFORMA', () => {
    /* To jest sąsiad, w którego najgroźniej trafić: poprawna ontologia Foundry o żadnym
       `Edit` nie wspomina i karanie jej za to byłoby uczeniem nieprawdy. */
    const t = trafienia(zDziennikiem({ pola: null }));
    expect(t.has('P54')).toBe(false);
  });

  it('⚠ DZIENNIK DOPISYWANY BEZ ŻADNEJ OBIETNICY COFANIA JEST POPRAWNY — nie trafia', () => {
    const t = trafienia(zDziennikiem({
      pola: [['editId', 'string'], ['changedField', 'string']],
      odwracalna: false,
    }));
    expect(t.has('P54'), 'append-only „co się stało” to legalny kształt').toBe(false);
  });

  it('obietnicą jest też samo POLE RĘCZNE, nie tylko odwracalna akcja — trafia', () => {
    const t = trafienia(zDziennikiem({
      pola: [['editId', 'string'], ['changedField', 'string']],
      odwracalna: false, reczne: true,
    }));
    expect(t.has('P54')).toBe(true);
  });

  it('⚠ PARY SZUKAMY PO WYRAZACH, NIE PO PODCIĄGU — `priority` to nie jest „wartość przed"', () => {
    /* Pułapka znaleziona przy pisaniu reguły, nie przy przeglądzie: `prior` jako podciąg siedzi
       w `priority`, więc dziennik z samym `priorityAfter` wyglądałby na komplet PRZED + PO
       i reguła zamilkłaby dokładnie tam, gdzie ma mówić. */
    const t = trafienia(zDziennikiem({ pola: [['editId', 'string'], ['priorityAfter', 'integer']] }));
    expect(t.has('P54'), '`priority` nie jest wartością sprzed zmiany').toBe(true);
  });

  it('camelCase rozbija się na wyrazy — `previousValue` + `newValue` to komplet', () => {
    const t = trafienia(zDziennikiem({
      pola: [['editId', 'string'], ['previousValue', 'string'], ['newValue', 'string']],
    }));
    expect(t.has('P54')).toBe(false);
  });

  it('⚠ P54 KOSZTUJE ZERO — wykrycie idzie po NAZWIE, więc werdykt należy do modelu', () => {
    const r = ocen(zDziennikiem({ pola: [['editId', 'string'], ['changedField', 'string']] }));
    const z = r.znaleziska.find((x) => x.id === 'P54');
    expect(z.klasa).toBe('podpowiedz');
    expect(KLASY[z.klasa].koszt).toBe(0);
    expect(z.kandydat, 'każda podpowiedź jedzie do modelu po werdykt').toMatch(/^P54#\d+$/);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   K10-1 · NAZWY API — kanon rozbija id na nazwę, grupę i klucz
   ──────────────────────────────────────────────────────────────────────────────────────────
   ⚠ DRUGA POŁOWA TEGO PUNKTU JEST WAŻNIEJSZA OD PIERWSZEJ. Rozbicie nazwy jest łatwe; trudne
   jest to, żeby po rozbiciu NIC NIE PRZESTAŁO SIĘ ŁĄCZYĆ. Reguła, która nagle nie znajduje
   implementatora ani celu edycji, nie krzyczy — po prostu milknie, a raport wygląda LEPIEJ.
   Dlatego poniżej stoi asercja na NASZYM manifeście: te same przedmioty przed i po.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('K10-1 · nazwa API jest lokalna, klucz odwołań zostaje pełny', () => {
  it('`nazwaApi` rozbija id na trzy pola i nie zgaduje', () => {
    expect(nazwaApi('core.Order')).toEqual({ apiName: 'Order', namespace: 'core', qualifiedName: 'core.Order' });
    expect(nazwaApi('Invoice')).toEqual({ apiName: 'Invoice', namespace: undefined, qualifiedName: 'Invoice' });
    /* Kropka na początku albo na końcu nie jest namespace'em — nazwa zostaje w całości, a o tym,
       że jest niepoprawna, mówi REGUŁA, a nie normalizator naprawiający ją po cichu. */
    expect(nazwaApi('.Order').apiName).toBe('.Order');
    expect(nazwaApi('Order.').apiName).toBe('Order.');
    expect(nazwaApi('a.b.Order')).toEqual({ apiName: 'Order', namespace: 'a.b', qualifiedName: 'a.b.Order' });
  });

  it('⚠ format `foundry`: klucz RÓWNA SIĘ nazwie API — inaczej reguła musiałaby pytać o format', () => {
    const { dane } = wczytajTekst(czytaj('web/public/szablon.yaml'));
    const o = normalizuj(dane);
    expect(o.formatWejscia).toBe('foundry');
    expect(o.objectTypes.length).toBeGreaterThan(1);
    for (const x of [...o.objectTypes, ...o.interfaces]) expect(x.qualifiedName).toBe(x.apiName);
  });

  it('P58 · nazwa API typu musi być PascalCase z samych znaków alfanumerycznych', () => {
    const zNazwa = (n) => {
      const o = czysta();
      o.objectTypes[0].apiName = n;
      o.objectTypes[0].qualifiedName = n;
      o.linkTypes[0].from = n;
      return trafienia(o);
    };
    expect(zNazwa('Invoice').has('P58')).toBe(false);
    expect(zNazwa('SalesInvoice').has('P58')).toBe(false);
    expect(zNazwa('invoice').has('P58'), 'mała litera na początku').toBe(true);
    expect(zNazwa('Sales_Invoice').has('P58'), 'podkreślenie').toBe(true);
    expect(zNazwa('Sales-Invoice').has('P58'), 'myślnik').toBe(true);
    expect(zNazwa(`I${'x'.repeat(120)}`).has('P58'), 'ponad 100 znaków').toBe(true);
  });

  it('⚠ P58 NIE ZAPALA NA KROPCE W KLUCZU — namespace jedzie w `namespace`, nie w nazwie', () => {
    const o = czysta();
    o.objectTypes[0].apiName = 'Invoice';
    o.objectTypes[0].namespace = 'billing';
    o.objectTypes[0].qualifiedName = 'billing.Invoice';
    o.linkTypes[0].from = 'billing.Invoice';
    expect(trafienia(o).has('P58')).toBe(false);
  });

  it('P59 · dwa typy pod jedną nazwą API — mimo dwóch różnych grup', () => {
    const o = czysta();
    o.objectTypes[0].namespace = 'billing';
    o.objectTypes[0].qualifiedName = 'billing.Invoice';
    o.linkTypes[0].from = 'billing.Invoice';
    o.objectTypes.push({ ...o.objectTypes[0], namespace: 'archive', qualifiedName: 'archive.Invoice' });
    expect(trafienia(o).has('P59')).toBe(true);
  });

  it('P60 · słowo zastrzeżone jako nazwa kontraktu — porównanie jest DOKŁADNE', () => {
    const o = czysta();
    o.objectTypes[0].apiName = 'Link';
    o.objectTypes[0].qualifiedName = 'Link';
    o.linkTypes[0].from = 'Link';
    expect(trafienia(o).has('P60'), '`Link` wielką literą nie stoi na liście źródła').toBe(false);
    const o2 = czysta();
    o2.interfaces = [{
      apiName: 'object', qualifiedName: 'object',
      description: 'Kontrakt testowy o nazwie zastrzeżonej platformy.',
      properties: [], implementedBy: [],
    }];
    expect(trafienia(o2).has('P60')).toBe(true);
  });

  it('⚠ P61 JEST `uwaga`, NIE `zlamanie` — bo źródło o kolizji typ ↔ kontrakt MILCZY', () => {
    const o = czysta();
    o.interfaces = [{
      apiName: 'Invoice', qualifiedName: 'Invoice',
      description: 'Kontrakt o tej samej nazwie, co typ obiektu — pytanie do zespołu wdrożeniowego.',
      properties: [{ apiName: 'invoiceId', type: 'string' }],
      implementedBy: ['Invoice'],
    }];
    const r = ocen(o);
    const z = r.znaleziska.find((x) => x.id === 'P61');
    expect(z, 'kolizja nazw typ ↔ kontrakt ma być zgłoszona').toBeTruthy();
    expect(z.klasa, 'reguła twarda bez cytatu byłaby naszą opinią').toBe('uwaga');
    expect(z.dlaczego).toMatch(/MILCZY/);
  });

  it('P62 · nazwa właściwości: mała litera, alfanumeryczna, unikalna w typie, nie zastrzeżona', () => {
    const zPolem = (n) => {
      const o = czysta();
      o.objectTypes[0].properties.push({ apiName: n, type: 'string', description: 'Pole testowe o nazwie do sprawdzenia.' });
      return trafienia(o);
    };
    expect(zPolem('issuedBy').has('P62')).toBe(false);
    expect(zPolem('Issued').has('P62'), 'wielka litera na początku').toBe(true);
    expect(zPolem('issued_by').has('P62'), 'podkreślenie').toBe(true);
    expect(zPolem('property').has('P62'), 'słowo zastrzeżone').toBe(true);
    expect(zPolem('invoiceId').has('P62'), 'powtórzona nazwa w typie').toBe(true);
  });

  it('P63 · pole struktury o nazwie zastrzeżonej', () => {
    const o = czysta();
    o.sharedPropertyTypes = [{
      apiName: 'FilterClause', type: 'struct', isStruct: true,
      description: 'Struktura testowa z polem o nazwie zastrzeżonej.',
      fields: [{ apiName: 'property', type: 'string' }, { apiName: 'operand', type: 'string' }],
    }];
    expect(trafienia(o).has('P63')).toBe(true);
    o.sharedPropertyTypes[0].fields[0].apiName = 'propertyPath';
    expect(trafienia(o).has('P63')).toBe(false);
  });

  it('P64 · strona linku z myślnikiem nie przechodzi — OBIE strony są sprawdzane', () => {
    const zNazwami = (a, b) => {
      const o = czysta();
      o.linkTypes[0].apiName = a;
      o.linkTypes[0].reverseName = b;
      return trafienia(o);
    };
    expect(zNazwami('customer', 'invoices').has('P64')).toBe(false);
    /* ⚠ TE DWIE NAZWY SĄ SYNTETYCZNE I MUSZĄ ZOSTAĆ Z MYŚLNIKIEM — to jest ZŁY przykład, a nie
       odwołanie do naszego modelu. K6-3 przemianował krawędzie manifestu na camelCase i skrypt
       podmiany trafił tu po nazwie; przywrócone, bo test bez myślnika sprawdza, że reguła
       zapala na nazwie, która myślnika NIE MA — czyli nie sprawdza nic. */
    expect(zNazwami('parent-order', 'invoices').has('P64'), 'myślnik po stronie `to`').toBe(true);
    expect(zNazwami('customer', 'sub-orders').has('P64'), 'myślnik po stronie powrotnej').toBe(true);
    expect(zNazwami('customer', 'link').has('P64'), 'słowo zastrzeżone').toBe(true);
  });

  it('P65 · dwa przejścia z jednego typu pod tą samą nazwą — i NIE z dwóch różnych typów', () => {
    const o = czysta();
    o.linkTypes.push({
      apiName: 'customer', from: 'Invoice', to: 'Customer',
      cardinality: 'MANY_TO_ONE', reverseName: 'creditNotes', status: 'active',
      description: 'Druga krawędź o tej samej nazwie strony — z `Invoice` nieosiągalna.',
    });
    expect(trafienia(o).has('P65')).toBe(true);
    /* ⚠ TA SAMA NAZWA WIDZIANA Z DWÓCH RÓŻNYCH TYPÓW JEST W PORZĄDKU — reguła mówi o linkach
       „associated with the same object type” (docs:3965), a nie o całym modelu. */
    o.linkTypes[1].from = 'Customer';
    o.linkTypes[1].to = 'Invoice';
    expect(trafienia(o).has('P65')).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   K10-2 · TYPY BAZOWE I STRUKTURY — trzy listy, które łatwo pomylić
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('K10-2 · typ bazowy, typ wartości, jednostka', () => {
  it('`rozbijTyp` rozbija naszą gramatykę na tabelę Foundry\'ego', () => {
    expect(rozbijTyp('string').baseType).toBe('String');
    expect(rozbijTyp('int').baseType).toBe('Integer');
    expect(rozbijTyp('decimal').baseType).toBe('Decimal');
    expect(rozbijTyp('timestamp').baseType).toBe('Timestamp');
    expect(rozbijTyp('struct(core.TimeSpan)')).toEqual({ baseType: 'Struct', structTypeApiName: 'core.TimeSpan' });
    expect(rozbijTyp('list(string)')).toEqual({ baseType: 'Array', elementBaseType: 'String', elementStructTypeApiName: undefined });
    /* ⚠ `enum` NIE JEST TYPEM BAZOWYM — jest napisem z ograniczeniem typu wartości (docs:4348). */
    expect(rozbijTyp('enum(open|applied|discarded)')).toEqual({
      baseType: 'String',
      valueType: { constraint: 'oneOf', values: ['open', 'applied', 'discarded'] },
    });
    /* ⚠ `duration` też nie — jest liczbą z jednostką, a jednostki NIE domyślamy. */
    expect(rozbijTyp('duration', 'min')).toEqual({
      baseType: 'Double', valueType: { constraint: 'unit', unit: 'min' }, unit: 'min',
    });
    expect(rozbijTyp('duration').valueType.unit, 'brak jednostki ma być WIDOCZNY, a nie domyślony').toBeUndefined();
    /* Referencja nie ma typu bazowego — mówi o niej osobne pole kanonu. */
    expect(rozbijTyp('ref(core.Order)').baseType).toBeUndefined();
    expect(rozbijTyp('cosCzegoNieMa').baseType).toBeUndefined();
  });

  it('P66 · typ spoza tabeli typów bazowych', () => {
    const o = czysta();
    o.objectTypes[0].properties.push({ apiName: 'payload', type: 'json', typeRaw: 'json', description: 'Pole o typie, którego tabela nie zna.' });
    expect(trafienia(o).has('P66')).toBe(true);
    /* ⚠ NIE ZAPALA na referencji ani na wskazaniu zadeklarowanej struktury — tam typ bazowy
       z definicji nie stoi, a mówi o nich osobne pole kanonu. */
    const o2 = czysta();
    o2.actionTypes[0].parameters[0] = { apiName: 'customer', type: 'reference', reference: { kind: 'objectReference', objectTypeApiName: 'Customer' }, required: true };
    expect(trafienia(o2).has('P66')).toBe(false);
  });

  it('P67 · pole struktury-właściwości: tablica i typ spoza listy', () => {
    const zPolem = (pole) => {
      const o = czysta();
      o.objectTypes[0].properties.push({
        apiName: 'resolution', type: 'struct', typeRaw: 'struct(Resolution)',
        baseType: 'Struct', structTypeApiName: 'Resolution', description: 'Struktura testowa przy właściwości.',
      });
      o.sharedPropertyTypes = [{
        apiName: 'Resolution', type: 'struct', isStruct: true,
        description: 'Struktura testowa — pola sprawdzane regułą.',
        fields: [{ apiName: 'summary', type: 'string', baseType: 'String' }, pole],
      }];
      return trafienia(o);
    };
    expect(zPolem({ apiName: 'owner', type: 'string', baseType: 'String' }).has('P67')).toBe(false);
    expect(zPolem({ apiName: 'cost', type: 'decimal', baseType: 'Decimal' }).has('P67'), '`Decimal` jest w polu WŁAŚCIWOŚCI dozwolony').toBe(false);
    expect(zPolem({ apiName: 'tags', type: 'array', baseType: 'Array' }).has('P67'), 'pole struktury nie może być tablicą').toBe(true);
    expect(zPolem({ apiName: 'file', type: 'attachment', baseType: 'Attachment' }).has('P67'), 'typ spoza listy pól struktury').toBe(true);
  });

  it('P68 · pole PARAMETRU struct — węższa lista niż pole właściwości', () => {
    const o = czysta();
    o.sharedPropertyTypes = [{
      apiName: 'Resolution', type: 'struct', isStruct: true,
      description: 'Struktura testowa edytowana akcją.',
      fields: [{ apiName: 'summary', type: 'string', baseType: 'String' },
        { apiName: 'cost', type: 'decimal', baseType: 'Decimal' }],
    }];
    o.actionTypes[0].parameters.push({
      apiName: 'resolution', type: 'struct', typeRaw: 'struct(Resolution)',
      baseType: 'Struct', structTypeApiName: 'Resolution', required: true,
    });
    expect(trafienia(o).has('P68'), '`Decimal` w polu parametru struct (docs:5799)').toBe(true);
    o.sharedPropertyTypes[0].fields[1].baseType = 'Double';
    expect(trafienia(o).has('P68')).toBe(false);
  });

  it('P69 · jedną właściwość struct zasila DOKŁADNIE JEDEN parametr struct', () => {
    const o = czysta();
    o.sharedPropertyTypes = [{
      apiName: 'Resolution', type: 'struct', isStruct: true,
      description: 'Struktura testowa edytowana akcją.',
      fields: [{ apiName: 'summary', type: 'string', baseType: 'String' }],
    }];
    const param = (n) => ({ apiName: n, type: 'struct', typeRaw: 'struct(Resolution)', baseType: 'Struct', structTypeApiName: 'Resolution', required: true });
    o.actionTypes[0].parameters.push(param('resolution'));
    expect(trafienia(o).has('P69')).toBe(false);
    o.actionTypes[0].parameters.push(param('resolutionTwo'));
    expect(trafienia(o).has('P69')).toBe(true);
  });

  it('P70 · tablica i struktura na kluczu — dwie RÓŻNE kolumny tej samej tabeli', () => {
    const zKluczem = (baseType, gdzie) => {
      const o = czysta();
      o.objectTypes[0].properties.push({ apiName: 'zbior', type: 'array', baseType, description: 'Pole testowe stawiane na kluczu.' });
      if (gdzie === 'klucz') o.objectTypes[0].primaryKey = 'zbior';
      else o.objectTypes[0].titleProperty = 'zbior';
      return trafienia(o);
    };
    expect(zKluczem('Array', 'klucz').has('P70'), 'tablica nie jest kluczem głównym (docs:2434)').toBe(true);
    expect(zKluczem('Array', 'tytul').has('P70'), 'tablica JEST dopuszczalna jako klucz tytułu').toBe(false);
    expect(zKluczem('Struct', 'klucz').has('P70')).toBe(true);
    expect(zKluczem('Struct', 'tytul').has('P70'), 'struktura nie jest ani kluczem, ani tytułem (docs:2435)').toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   K10-3 · SKĄD WŁAŚCIWOŚĆ BIERZE WARTOŚĆ
   ──────────────────────────────────────────────────────────────────────────────────────────
   ⚠ TA REGUŁA JEST CELOWO `ryzyko`, A NIE `zlamanie`. Dokumentacja opisuje trzy rodzaje źródła
   i osobno mówi, że kolumna liczona funkcją jest bytem WIDGETU — ale nie wylicza rodzajów
   źródła zamkniętą listą ze słowem „must”. Klasa idzie za siłą cytatu, a nie za naszą pewnością.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('K10-3 · źródło wartości właściwości', () => {

  it('P72 · źródło spoza trzech, które zna ontologia', () => {
    const zeZrodlem = (src) => {
      const o = czysta();
      o.objectTypes[0].properties.push({
        apiName: 'effectiveTotal', type: 'decimal', valueSource: src,
        description: 'Pole testowe ze wskazanym źródłem wartości.',
      });
      return trafienia(o);
    };
    for (const dobre of ['datasourceColumn', 'editOnly', 'linkedObjects'])
      expect(zeZrodlem(dobre).has('P72'), `${dobre} jest źródłem, które ontologia zna`).toBe(false);
    expect(zeZrodlem('functionBacked').has('P72')).toBe(true);
    expect(zeZrodlem('cosInnego').has('P72')).toBe(true);
    /* Brak deklaracji nie jest błędem — cudzy model nie musi tego pola nieść. */
    expect(zeZrodlem(undefined).has('P72')).toBe(false);
  });

  it('⚠ P72 JEST `ryzyko` i mówi wprost, co jest cytatem, a co wnioskiem', () => {
    const o = czysta();
    o.objectTypes[0].properties.push({
      apiName: 'effectiveTotal', type: 'decimal', valueSource: 'functionBacked',
      description: 'Pole testowe liczone funkcją.',
    });
    const z = ocen(o).znaleziska.find((x) => x.id === 'P72');
    expect(z.klasa, 'regułę twardą stawia się na zdaniu „must", a nie na wnioskowaniu').toBe('ryzyko');
    expect(z.zrodlo).toMatch(/docs:10092/);
    expect(z.zrodlo).toMatch(/docs:2739/);
  });

  it('⚠ P72 NIE DUBLUJE P49 — jedna pyta o ŹRÓDŁO, druga o KSZTAŁT wyprowadzenia', () => {
    const o = czysta();
    /* Pole `derived` bez łańcucha linków: źródło jest właściwe (`linkedObjects`), ale
       wyprowadzenia nie da się zbudować — to jest przedmiot `P49`, nie `P72`. */
    o.objectTypes[0].properties.push({
      apiName: 'riskScore', type: 'decimal', valueSource: 'linkedObjects',
      derived: { by: 'scoreFormula' }, description: 'Pole liczone wzorem, nie z linków.',
    });
    const t = trafienia(o);
    expect(t.has('P49'), 'kształt wyprowadzenia').toBe(true);
    expect(t.has('P72'), 'źródło jest z listy, więc P72 ma milczeć').toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   K10-4 · AKCJA OPARTA O FUNKCJĘ — JEDNA REGUŁA I FUNKCJA EDYCJI NAZWANA JAK AKCJA
   ──────────────────────────────────────────────────────────────────────────────────────────
   ⚠ TO BYŁ DŁUG ZASTANY, A NIE NOWA REGUŁA: kanon oddawał `solveSchedule` jako sześć,
   a `revertEvent` jako sto reguł deklaratywnych — czyli opisywał kształt, którego Ontology
   Manager nie pozwoli zbudować (`docs:4878`), a żadna z 57 reguł tego nie widziała, bo żadna
   nie pytała o `rules[].op`.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('K10-4 · akcja oparta o funkcję w kanonie', () => {

  it('P73 · `runFunction` razem z inną regułą', () => {
    const o = czysta();
    o.actionTypes[0].rules = [{ op: 'runFunction', functionApiName: 'issueInvoice' }];
    o.functions = [{ apiName: 'issueInvoice', kind: 'ontologyEditFunction', description: 'Funkcja edycji akcji testowej.', inputs: [{ apiName: 'customer', type: 'reference' }] }];
    expect(trafienia(o).has('P73')).toBe(false);
    o.actionTypes[0].rules.push({ op: 'create', target: 'Invoice' });
    expect(trafienia(o).has('P73')).toBe(true);
  });

  it('P74 · wejścia funkcji akcji to nie są parametry tej akcji', () => {
    const zFunkcja = (wejscia) => {
      const o = czysta();
      o.actionTypes[0].rules = [{ op: 'runFunction', functionApiName: 'issueInvoice' }];
      o.functions = [{
        apiName: 'issueInvoice', kind: 'ontologyEditFunction',
        description: 'Funkcja edycji akcji testowej.',
        inputs: wejscia.map((n) => ({ apiName: n, type: 'string' })),
      }];
      return trafienia(o);
    };
    expect(zFunkcja(['customer']).has('P74'), 'jeden do jednego z parametrem akcji').toBe(false);
    expect(zFunkcja(['customer', 'issuedDate']).has('P74'), 'wejście bez parametru').toBe(true);
    expect(zFunkcja([]).has('P74'), 'parametr, którego funkcja nie bierze').toBe(true);
    /* Funkcja, której w modelu nie ma, to ta sama klasa błędu — reguła uruchamia pustkę. */
    const o = czysta();
    o.actionTypes[0].rules = [{ op: 'runFunction', functionApiName: 'nieMaTakiej' }];
    expect(trafienia(o).has('P74')).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   K10-5 · KRAWĘDŹ DO KONTRAKTU JEST W KANONIE WIĄZKĄ
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('K10-5 · wiązka: więz + N konkretnych krawędzi + łuk wyłączny', () => {

  it('P75 · krawędź celuje w kontrakt (format obcy, bez rozbicia)', () => {
    const o = czysta();
    o.interfaces = [{ apiName: 'Payable', qualifiedName: 'Payable', description: 'Kontrakt testowy do wskazania krawędzią.', properties: [], implementedBy: ['Customer'] }];
    o.linkTypes.push({
      apiName: 'payer', from: 'Invoice', to: 'Payable', cardinality: 'MANY_TO_ONE',
      reverseName: 'payables', status: 'active', description: 'Krawędź celowana w kontrakt.',
    });
    expect(trafienia(o).has('P75')).toBe(true);
    /* Krawędź wygenerowana przez rozbicie ma cel konkretny — reguła ma o niej milczeć. */
    o.linkTypes[1].to = 'Customer';
    o.linkTypes[1].generatedFrom = 'interfaceTargetLink';
    o.linkTypes[1].bundleApiName = 'payer';
    expect(trafienia(o).has('P75')).toBe(false);
  });

  it('⚠ P76 WIDZI TAKŻE `modify` NA KLUCZU OBCYM — inaczej przespałaby wszystkie nasze przypadki', () => {
    const o = czysta();
    o.linkBundles = [{ apiName: 'payer', from: 'Invoice', interfaceApiName: 'Payable', concrete: ['payerCustomer', 'payerPartner'] }];
    o.actionTypes[0].rules = [{ op: 'modify', target: 'payer', targetField: { kind: 'objectProperty', objectType: 'Invoice', property: 'payerId', foreignKeyOf: 'payer' } }];
    o.actionTypes[0].declaredEdits = o.actionTypes[0].rules;
    expect(trafienia(o).has('P76'), 'kluczy obcych jest N, a reguła deklaratywna nie ma po czym wybrać').toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   K10-7 · TYPE CLASSES PLANOWANIA — MECHANIZM, NIE UŻYCIE
   ────────────────────────────────────────────────────────────────────────────────────────────
   ⚠ REGUŁA ZAPALA NA KANONIE SYNTETYCZNYM, A NA NASZYM MODELU MILCZY — i to jest poprawny
   stan TAKŻE po K7-2: klasy stoją od tej fali przy CZTERECH chwilach zajętości (`docs:4456–4457`),
   ale po stronie PARAMETRÓW jeszcze ich nie ma, więc `P78` — która pyta wyłącznie o parametry —
   dalej nie ma o co zapytać. Do K7-2 stało tu: „przypisanie klas polom zapisu robi K7-2, bo dziś
   start i koniec zadania są liczone funkcją, a klasa `schedules:*` przy polu liczonym byłaby
   obietnicą bez pokrycia".
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('K10-7 · type classes planowania', () => {
  const zKlasami = (klasaPola, klasaParametru, nazwaParametru) => {
    const o = czysta();
    o.objectTypes[0].properties.push({
      apiName: 'startTime', type: 'timestamp', description: 'Chwila rozpoczęcia pracy na osi.',
      ...(klasaPola ? { typeClasses: [klasaPola] } : {}),
    });
    o.actionTypes[0].parameters.push({
      apiName: nazwaParametru, type: 'timestamp', required: false,
      ...(klasaParametru ? { typeClasses: [klasaParametru] } : {}),
    });
    return trafienia(o);
  };

  it('P78 · parametr z klasą musi mieć właściwość o TEJ SAMEJ nazwie i klasie', () => {
    const K = 'schedules:schedulable-start-time';
    expect(zKlasami(K, K, 'startTime').has('P78'), 'nazwa i klasa się zgadzają').toBe(false);
    expect(zKlasami(K, K, 'pinnedStart').has('P78'), 'parametr nazywa się inaczej niż pole (docs:32720)').toBe(true);
    expect(zKlasami(undefined, K, 'startTime').has('P78'), 'właściwość nie ma klasy (docs:32721)').toBe(true);
    expect(zKlasami(K, undefined, 'startTime').has('P78'), 'parametr bez klasy — reguła pyta o PARAMETR').toBe(false);
    expect(zKlasami(K, 'schedules:schedulable-end-time', 'startTime').has('P78'), 'ta sama nazwa, inna klasa').toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   K10-8 · METADANE OBOWIĄZKOWE — nazwy wyświetlane ze SŁOWNIKA KLIENTA
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('K10-8 · nazwy wyświetlane i metadane obowiązkowe', () => {

  it('P79 · typ bez nazwy wyświetlanej albo bez liczby mnogiej', () => {
    const zNazwami = (ui, plural) => {
      const o = czysta();
      if (ui === undefined) delete o.objectTypes[0].displayName; else o.objectTypes[0].displayName = ui;
      if (plural === undefined) delete o.objectTypes[0].pluralDisplayName; else o.objectTypes[0].pluralDisplayName = plural;
      return trafienia(o);
    };
    expect(zNazwami('Faktura', 'Faktury').has('P79')).toBe(false);
    expect(zNazwami(undefined, 'Faktury').has('P79')).toBe(true);
    expect(zNazwami('Faktura', undefined).has('P79'), 'liczba mnoga jest OBOWIĄZKOWA (docs:2087)').toBe(true);
  });

  it('P80 · strona linku bez nazwy wyświetlanej — obie strony osobno', () => {
    const zNazwami = (a, b) => {
      const o = czysta();
      if (a === undefined) delete o.linkTypes[0].displayName; else o.linkTypes[0].displayName = a;
      if (b === undefined) delete o.linkTypes[0].reverseDisplayName; else o.linkTypes[0].reverseDisplayName = b;
      return trafienia(o);
    };
    expect(zNazwami('Kontrahent', 'Faktury').has('P80')).toBe(false);
    expect(zNazwami(undefined, 'Faktury').has('P80')).toBe(true);
    expect(zNazwami('Kontrahent', undefined).has('P80'), 'druga strona też ma nazwę (docs:4161)').toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   K10-9 · STATUSY — dwa różne konflikty i dwa różne błędy platformy
   ──────────────────────────────────────────────────────────────────────────────────────────
   ⚠ NA NASZYM MODELU OBIE REGUŁY MILCZĄ — i po to są: mają to UTRZYMAĆ, a nie naprawić.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('K10-9 · statusy krawędzi, końców i kolumny', () => {
  it('P32 · typ `experimental` nie może mieć krawędzi `active` (docs:4601)', () => {
    const o = czysta();
    o.objectTypes[1].status = 'experimental';
    expect(trafienia(o).has('P32')).toBe(true);
    o.linkTypes[0].status = 'experimental';
    expect(trafienia(o).has('P32')).toBe(false);
  });

  it('P81 · klucz obcy wygaszony, a krawędź na nim stojąca — nie (docs:4597)', () => {
    const zKluczem = (sunset, statusLinku) => {
      const o = czysta();
      o.objectTypes[0].properties.push({
        apiName: 'customerId', type: 'string', description: 'Kolumna klucza obcego do kontrahenta.',
        ...(sunset ? { sunset: { replacedBy: 'partnerId', why: 'kontrahent przeprowadza się do partnera' } } : {}),
      });
      o.linkTypes[0].foreignKeyProperty = 'customerId';
      o.linkTypes[0].foreignKeyObjectType = 'Invoice';
      o.linkTypes[0].status = statusLinku;
      return trafienia(o);
    };
    expect(zKluczem(false, 'active').has('P81')).toBe(false);
    expect(zKluczem(true, 'active').has('P81')).toBe(true);
    expect(zKluczem(true, 'deprecated').has('P81'), 'wygaszone razem — konflikt znika').toBe(false);
  });

  it('⚠ P81 MILCZY NA `"?"` — „nie wiemy, w której kolumnie” to nie to samo, co „w wygaszanej"', () => {
    const o = czysta();
    o.linkTypes[0].foreignKeyProperty = '?';
    o.linkTypes[0].foreignKeyObjectType = 'Invoice';
    expect(trafienia(o).has('P81')).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   K10-11 · STROJENIA `P09` i `P50` — obie pytały o WIĘCEJ, niż żąda źródło
   ──────────────────────────────────────────────────────────────────────────────────────────
   ⚠ ROZJEMCĄ JEST DOKUMENTACJA, NIE SILNIK — i to jest ta sama figura, co przy `P14`/`P11`
   w zestawie 1.3: reguła ostrzejsza od Foundry'ego zostaje POPRAWIONA, a nie obchodzona
   przyjęciem znaleziska.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('K10-11 · P09 — kontrakty akcji są OPCJONALNE', () => {
  const zKontraktem = (i) => {
    const o = czysta();
    o.interfaces = [{
      apiName: 'Facility', qualifiedName: 'Facility',
      description: 'Kontrakt testowy — sprawdzamy, ile musi zadeklarować.',
      properties: [], linkConstraints: [], actionConstraints: [], implementedBy: ['Invoice'],
      ...i,
    }];
    return trafienia(o);
  };

  it('interfejs BEZ kontraktów akcji, ale z właściwościami — NIE jest usterką (docs:19159)', () => {
    expect(zKontraktem({ properties: [{ apiName: 'facilityName', type: 'string' }] }).has('P09')).toBe(false);
  });

  it('interfejs z samym WIĘZEM LINKU też nie — to też jest składnik umowy (docs:19068)', () => {
    expect(zKontraktem({ linkConstraints: [{ apiName: 'airlines', to: 'Customer', cardinality: 'ONE_TO_MANY' }] }).has('P09')).toBe(false);
  });

  it('interfejs z samym kontraktem akcji — jw.', () => {
    expect(zKontraktem({ actionConstraints: [{ apiName: 'reschedule', required: true }] }).has('P09')).toBe(false);
  });

  it('⚠ ZAPALA DOPIERO NA PUSTYM: zero właściwości, zero więzów, zero kontraktów', () => {
    expect(zKontraktem({}).has('P09'), 'nazwa bez umowy').toBe(true);
  });
});

describe('K10-11 · P50 — dubletem jest CZYSTY obiekt łączący, a nie każda encja', () => {
  /* Para `Task ↔ Machine` z krawędzią N:M i typem pośrednim, którego treść sterujemy. */
  const zPosrednikiem = (pola, backing) => {
    const o = czysta();
    o.objectTypes.push({
      apiName: 'Assignment', displayName: 'Przydział', pluralDisplayName: 'Przydziały',
      description: 'Typ pośredni między fakturą a kontrahentem — treść zależna od testu.',
      primaryKey: 'assignmentId', titleProperty: 'assignmentId', status: 'active', visibility: 'normal',
      properties: [
        { apiName: 'assignmentId', type: 'string', description: 'Klucz przydziału.' },
        { apiName: 'invoiceId', type: 'string', description: 'Klucz obcy faktury.' },
        { apiName: 'customerId', type: 'string', description: 'Klucz obcy kontrahenta.' },
        ...pola,
      ],
    });
    o.linkTypes[0].cardinality = 'MANY_TO_MANY';
    if (backing) o.linkTypes[0].backingObjectType = 'Assignment';
    o.linkTypes.push({
      apiName: 'assignedInvoice', from: 'Assignment', to: 'Invoice', cardinality: 'MANY_TO_ONE',
      reverseName: 'assignments', status: 'active', description: 'Której faktury dotyczy przydział.',
      displayName: 'Faktura', reverseDisplayName: 'Przydziały',
      foreignKeyProperty: 'invoiceId', foreignKeyObjectType: 'Assignment',
    }, {
      apiName: 'assignedCustomer', from: 'Assignment', to: 'Customer', cardinality: 'MANY_TO_ONE',
      reverseName: 'customerAssignments', status: 'active', description: 'Którego kontrahenta dotyczy.',
      displayName: 'Kontrahent', reverseDisplayName: 'Przydziały',
      foreignKeyProperty: 'customerId', foreignKeyObjectType: 'Assignment',
    });
    return trafienia(o);
  };

  it('CZYSTY obiekt łączący (klucz + dwa klucze obce) obok N:M — to jest dublet', () => {
    expect(zPosrednikiem([], false).has('P50')).toBe(true);
  });

  it('⚠ ENCJA Z WŁASNYMI WŁAŚCIWOŚCIAMI — NIE jest dubletem (docs:20060, docs:20062)', () => {
    /* Wzór z dokumentacji: `Employee → VentureStaffing → Venture` z `role`, `startDate`,
       `allocation`. Taki obiekt niesie treść, której link nie uniesie — i wtedy link OBOK
       niego jest drugim WIDOKIEM, a nie drugą prawdą. */
    const t = zPosrednikiem([
      { apiName: 'role', type: 'string', description: 'W jakiej roli przydzielono.' },
      { apiName: 'startDate', type: 'date', description: 'Od kiedy.' },
    ], false);
    expect(t.has('P50')).toBe(false);
  });

  it('⚠ LINK Z ZADEKLAROWANYM OBIEKTEM PODPIERAJĄCYM — pytanie jest już rozstrzygnięte (docs:3953)', () => {
    expect(zPosrednikiem([], true).has('P50'), 'model mówi, że to JEST object-backed link').toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   A14 · P40 — POLSKI RDZEŃ WRAŻLIWY ŁAPIE SIĘ NA GRANICY WYRAZU, A NIE W ŚRODKU CUDZEGO SŁOWA
   ──────────────────────────────────────────────────────────────────────────────────────────
   ⚠ POWÓD JEST KONKRETNY I MA ADRES. Do zestawu 1.6 `P40` dopasowywał rdzenie jak PODCIĄG
   całej nazwy, więc `core.OrderStatus.sourceName` zapalał znalezisko „pole o wrażliwej nazwie
   bez klasyfikacji" — bo `sour`+`ceNa`+`me` niesie w sobie litery `cena`. Nazwa mówi „nazwa
   statusu w źródle" i nie ma z ceną nic wspólnego; narzędzie twierdziło o modelu nieprawdę,
   a właściciel miał przed sobą znalezisko, którego nie da się ani naprawić, ani uczciwie
   przyjąć. Decyzja właściciela z 18.09.2026 (A7): „to jest fałszywy alarm, popraw REGUŁĘ".
   ⚠ PARA „MA TRAFIĆ" / „NIE MA TRAFIĆ" JEST TU OBOWIĄZKOWA — poprawka, która ucisza fałszywy
   alarm, uciszając przy okazji alarm PRAWDZIWY, jest gorsza od znaleziska, które naprawiała.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
describe('A14 · P40 — rdzeń wrażliwy na granicy wyrazu', () => {
  const zPolem = (apiName) => {
    const o = czysta();
    o.objectTypes[0].properties.push({ apiName, type: 'string', description: 'Pole badane przez ten test — treść bez znaczenia.' });
    return trafienia(o);
  };

  it('⚠ NIE TRAFIA: `sourceName` — polski rdzeń `cena` siedzi w środku angielskiego słowa', () => {
    expect(zPolem('sourceName').has('P40'), '`sourceName` znowu uchodzi za pole o cenie').toBe(false);
  });

  it('⚠ NIE TRAFIA: dalsze nazwy, w których rdzeń siedzi w środku wyrazu', () => {
    for (const n of ['licencjaSprzedazy', 'sourceNamespace', 'recenzja'])
      expect(zPolem(n).has('P40'), n).toBe(false);
  });

  it('TRAFIA: polski rdzeń NA POCZĄTKU wyrazu albo segmentu camelCase', () => {
    for (const n of ['cena', 'cenaBazowa', 'kosztCalkowity', 'adresDostawy', 'telefonKontaktowy'])
      expect(zPolem(n).has('P40'), n).toBe(true);
  });

  it('TRAFIA dalej po angielsku — poprawka NIE dotknęła dłuższych rdzeni', () => {
    for (const n of ['unitPrice', 'totalCost', 'emailAddress', 'apiToken', 'salaryBand'])
      expect(zPolem(n).has('P40'), n).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   P84–P89 · SZEŚĆ REGUŁ NIEZALEŻNYCH OD KLUCZA OBCEGO (zestaw 1.9)
   ──────────────────────────────────────────────────────────────────────────────────────────
   ⚠ FIKSTURY IDĄ W KANONIE WPROST (jak `czysta()`), nie przez `normalizuj()` — bo pytamy
   o SILNIK, nie o tłumaczenie formatu; `normalizuj.mjs` ma swoje własne testy.
   ⚠ KAŻDA REGUŁA MA TU DWIE RZECZY: fikstura, która ją łamie (KRZYCZY), i fikstura czysta
   (MILCZY). Trafienia na prawdziwej ontologii projektu liczy repozytorium, które ją trzyma.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('P84 · głębokość derived.via > 3 (docs:3344)', () => {
  const zGlebokoscia = (n) => {
    const o = czysta();
    o.objectTypes[0].properties.push({
      apiName: 'chainDepth', type: 'string',
      description: 'Test głębokości trawersacji przez n linków.',
      derived: { via: Array.from({ length: n }, (_, i) => `hop${i}`) },
    });
    return trafienia(o);
  };

  it('MILCZY na właściwości bez `derived` w ogóle', () => {
    expect(trafienia(czysta()).has('P84')).toBe(false);
  });

  it('MILCZY na 3 poziomach — to jest GRANICA Foundry, nie złamanie', () => {
    expect(zGlebokoscia(3).has('P84')).toBe(false);
  });

  it('KRZYCZY na 4 poziomach — Foundry unosi najwyżej 3', () => {
    expect(zGlebokoscia(4).has('P84')).toBe(true);
  });
});

describe('P85 · typ współdzielony użyty na ≤1 typie obiektu (docs:3680, docs:3814)', () => {
  const zeWspolnym = (usedBy) => {
    const o = czysta();
    o.sharedPropertyTypes = [{ apiName: 'ErpCode', type: 'string', description: 'Kod ERP.', usedBy }];
    return trafienia(o);
  };

  it('KRZYCZY (podpowiedzią), gdy `usedBy` nie wskazuje ŻADNEGO realnego typu obiektu', () => {
    expect(zeWspolnym(['jakasAkcja.parametr']).has('P85')).toBe(true);
  });

  it('KRZYCZY, gdy `usedBy` wskazuje DOKŁADNIE 1 typ obiektu', () => {
    expect(zeWspolnym(['Invoice.invoiceId']).has('P85')).toBe(true);
  });

  it('MILCZY, gdy `usedBy` wskazuje 2 różne typy obiektów', () => {
    expect(zeWspolnym(['Invoice.invoiceId', 'Customer.customerId']).has('P85')).toBe(false);
  });

  it('⚠ JEST KLASY `podpowiedz` — nie kosztuje ani jednego punktu wyniku', () => {
    const o = czysta();
    /* ⚠ WŁAŚCIWOŚĆ MUSI NAPRAWDĘ WSKAZYWAĆ TYP (nie tylko `usedBy` jako opis dla człowieka) —
       inaczej fikstura zapala DRUGĄ regułę („typ nie jest właściwością niczego”) i test mierzy
       koszt dwóch znalezisk naraz, nie jednego. */
    o.objectTypes[0].properties[0].sharedPropertyType = 'ErpCode';
    o.sharedPropertyTypes = [{ apiName: 'ErpCode', type: 'string', description: 'Kod ERP.', usedBy: ['Invoice.invoiceId'] }];
    const r = ocen(o);
    expect(r.znaleziska.filter((z) => z.id === 'P85').length).toBe(1);
    expect(r.wynik).toBe(100);
  });

  it('⚠ MILCZY NA WEJŚCIU KSZTAŁTU FOUNDRY BEZ `usedBy` — referencją jest `sharedPropertyType` '
    + 'na właściwości, `usedBy` jest tylko opisem dla człowieka (wejście bez `usedBy` dawało '
    + 'fałszywe „0 typów”, choć dwie właściwości go używały)', () => {
    const o = czysta();
    o.objectTypes[0].properties[0].sharedPropertyType = 'ErpCode';
    o.objectTypes[1].properties[0].sharedPropertyType = 'ErpCode';
    o.sharedPropertyTypes = [{ apiName: 'ErpCode', type: 'string', description: 'Kod ERP.' }];   // brak `usedBy`
    expect(trafienia(o).has('P85')).toBe(false);
  });

  it('⚠ KRZYCZY DALEJ NA WEJŚCIU BEZ `usedBy`, gdy `sharedPropertyType` wskazuje TYLKO JEDNĄ '
    + 'właściwość', () => {
    const o = czysta();
    o.objectTypes[0].properties[0].sharedPropertyType = 'ErpCode';
    o.sharedPropertyTypes = [{ apiName: 'ErpCode', type: 'string', description: 'Kod ERP.' }];
    expect(trafienia(o).has('P85')).toBe(true);
  });

  it('⚠ SUMA BEZ DUPLIKATÓW: `usedBy` i `sharedPropertyType` wskazujące TEN SAM typ liczą się '
    + 'RAZ, nie dwa razy', () => {
    const o = czysta();
    o.objectTypes[0].properties[0].sharedPropertyType = 'ErpCode';
    o.sharedPropertyTypes = [{ apiName: 'ErpCode', type: 'string', description: 'Kod ERP.', usedBy: ['Invoice.invoiceId'] }];
    expect(trafienia(o).has('P85')).toBe(true);   // dalej tylko JEDEN typ (Invoice) — nie 2
  });

  it('⚠ SZABLON PUBLICZNY BEZ `usedBy` MILCZY — `ErpCode` wskazują dwie właściwości', () => {
    const d = JSON.parse(czytaj('web/public/szablon.json'));
    for (const w of d.sharedPropertyTypes) delete w.usedBy;
    expect(ocen(normalizuj(d)).znaleziska.filter((z) => z.id === 'P85')).toEqual([]);
  });
});

describe('P86 · N:M edytowany akcją bez tabeli łączącej (docs:3938)', () => {
  const zLinkiem = (backingObjectType, edytujaca, funkcyjna, joinTable) => {
    const o = czysta();
    o.linkTypes.push({
      apiName: 'tags', from: 'Invoice', to: 'Customer', cardinality: 'MANY_TO_MANY',
      reverseName: 'invoices2', status: 'active', displayName: 'Tag', reverseDisplayName: 'Faktury',
      description: 'Relacja testowa N:M.', backingObjectType, joinTable,
    });
    if (edytujaca) {
      o.actionTypes.push({
        apiName: 'tagInvoice', description: 'Test.', status: 'active', parameters: [],
        rules: funkcyjna
          ? [{ op: 'runFunction', functionApiName: 'tagInvoice' }]
          : [{ op: 'createLink', target: 'tags' }],
        declaredEdits: [{ op: 'createLink', target: 'tags' }],
      });
    }
    return trafienia(o);
  };

  it('MILCZY, gdy nikt linku nie edytuje', () => {
    expect(zLinkiem(undefined, false).has('P86')).toBe(false);
  });

  it('KRZYCZY, gdy akcja DEKLARATYWNA edytuje N:M bez `backingObjectType`', () => {
    expect(zLinkiem(undefined, true, false).has('P86')).toBe(true);
  });

  it('KRZYCZY TAKŻE na akcji OPARTEJ O FUNKCJĘ — wymóg tabeli łączącej jest wymogiem platformy '
    + 'na samym linku, nie na kształcie reguły', () => {
    expect(zLinkiem(undefined, true, true).has('P86')).toBe(true);
  });

  it('MILCZY, gdy link ma `backingObjectType`', () => {
    expect(zLinkiem('InvoiceTag', true, false).has('P86')).toBe(false);
  });

  /* ⚠ 2.0: zaplecze N:M ma w kanonie pole Foundry — tabelę łączącą `joinTable` („Join table
     dataset”, „Generate join table”, `docs:3934–3944`). Do 1.9 reguła znała tylko `backingObjectType`. */
  it('MILCZY, gdy link ma tabelę łączącą `joinTable` (wygenerowaną albo wskazany dataset)', () => {
    expect(zLinkiem(undefined, true, false, 'generate').has('P86')).toBe(false);
    expect(zLinkiem(undefined, true, true, { dataset: 'tags_join', fromColumn: 'invoice', toColumn: 'customer' })
      .has('P86')).toBe(false);
  });

  it('szablon Foundry niesie `joinTable` do kanonu (i snake_case `join_table`)', () => {
    const m = (l) => normalizuj({ objectTypes: [{ apiName: 'A' }, { apiName: 'B' }], linkTypes: [l] }).linkTypes[0].joinTable;
    expect(m({ apiName: 'ab', from: 'A', to: 'B', cardinality: 'N:M', joinTable: 'generate' })).toBe('generate');
    expect(m({ apiName: 'ab', from: 'A', to: 'B', cardinality: 'N:M', join_table: { dataset: 'ab_join' } })).toEqual({ dataset: 'ab_join' });
    expect(m({ apiName: 'ab', from: 'A', to: 'B', cardinality: 'N:M' })).toBeUndefined();
  });
});

describe('P87 · delete deklaratywny bez referencji do obiektu albo z kaskadą (docs:5233, docs:4925)', () => {
  const zAkcja = (parametry, edycje) => {
    const o = czysta();
    o.actionTypes.push({
      apiName: 'removeInvoice', description: 'Test.', status: 'active',
      parameters: parametry, rules: edycje, declaredEdits: edycje,
    });
    return trafienia(o);
  };

  it('KRZYCZY, gdy parametr jest stringiem, nie referencją obiektu', () => {
    expect(zAkcja(
      [{ apiName: 'invoiceId', type: 'string' }],
      [{ op: 'delete', target: 'Invoice' }],
    ).has('P87')).toBe(true);
  });

  it('MILCZY, gdy parametr jest referencją TEGO typu', () => {
    expect(zAkcja(
      [{ apiName: 'invoice', type: 'reference', reference: { kind: 'objectReference', objectTypeApiName: 'Invoice' } }],
      [{ op: 'delete', target: 'Invoice' }],
    ).has('P87')).toBe(false);
  });

  it('KRZYCZY na kaskadzie — kasuje `Customer` bez WŁASNEJ referencji do `Customer`', () => {
    expect(zAkcja(
      [{ apiName: 'invoice', type: 'reference', reference: { kind: 'objectReference', objectTypeApiName: 'Invoice' } }],
      [{ op: 'delete', target: 'Invoice' }, { op: 'delete', target: 'Customer' }],
    ).has('P87')).toBe(true);
  });

  it('MILCZY na akcji OPARTEJ O FUNKCJĘ — `Run function` unosi kaskadę sama', () => {
    const o = czysta();
    o.actionTypes.push({
      apiName: 'removeInvoiceFn', description: 'Test.', status: 'active',
      parameters: [{ apiName: 'id', type: 'string' }],
      rules: [{ op: 'runFunction', functionApiName: 'removeInvoiceFn' }],
      declaredEdits: [{ op: 'delete', target: 'Invoice' }, { op: 'delete', target: 'Customer' }],
    });
    expect(trafienia(o).has('P87')).toBe(false);
  });

  it('MILCZY na wzorcu „zastąp kolekcję listą" (P88 łapie to zjawisko, nie ta reguła)', () => {
    expect(zAkcja(
      [{ apiName: 'linie', baseType: 'Array', elementBaseType: 'Struct', elementStructTypeApiName: 'InvoiceLineInput' }],
      [{ op: 'create', target: 'Customer' }, { op: 'delete', target: 'Customer' }],
    ).has('P87')).toBe(false);
  });
});

describe('P88 · wiele obiektów jednego typu z listy w akcji deklaratywnej (docs:5264, docs:5845)', () => {
  const zAkcja = (parametry, edycje) => {
    const o = czysta();
    o.actionTypes.push({
      apiName: 'saveInvoiceLines', description: 'Test.', status: 'active',
      parameters: parametry, rules: edycje, declaredEdits: edycje,
    });
    return trafienia(o);
  };

  it('KRZYCZY, gdy akcja deklaratywna TWORZY obiekt i ma parametr `list(struct(...))`', () => {
    expect(zAkcja(
      [{ apiName: 'lines', baseType: 'Array', elementBaseType: 'Struct', elementStructTypeApiName: 'InvoiceLineInput' }],
      [{ op: 'create', target: 'Invoice' }],
    ).has('P88')).toBe(true);
  });

  it('MILCZY, gdy akcja ma parametr listy struktur, ale nie TWORZY żadnego obiektu', () => {
    expect(zAkcja(
      [{ apiName: 'lines', baseType: 'Array', elementBaseType: 'Struct', elementStructTypeApiName: 'InvoiceLineInput' }],
      [{ op: 'modify', target: 'Invoice.invoiceNumber' }],
    ).has('P88')).toBe(false);
  });

  it('MILCZY, gdy lista jest `list(ref(...))`, nie `list(struct(...))` — Foundry WPROST dopuszcza '
    + 'tworzenie obiektu razem z jego linkami N:M w jednej akcji (docs:4925)', () => {
    expect(zAkcja(
      [{ apiName: 'refs', baseType: 'Array', reference: { kind: 'objectReference', objectTypeApiName: 'Customer', multiple: true } }],
      [{ op: 'create', target: 'Invoice' }],
    ).has('P88')).toBe(false);
  });

  it('MILCZY na akcji OPARTEJ O FUNKCJĘ', () => {
    const o = czysta();
    o.actionTypes.push({
      apiName: 'saveInvoiceLinesFn', description: 'Test.', status: 'active',
      parameters: [{ apiName: 'lines', baseType: 'Array', elementBaseType: 'Struct', elementStructTypeApiName: 'InvoiceLineInput' }],
      rules: [{ op: 'runFunction', functionApiName: 'saveInvoiceLinesFn' }],
      declaredEdits: [{ op: 'create', target: 'Invoice' }],
    });
    expect(trafienia(o).has('P88')).toBe(false);
  });
});

describe('P89 · akcja na interfejsie zmienia właściwość spoza kontraktu (docs:5688)', () => {
  const zAkcja = (nazwaPola) => {
    const o = czysta();
    o.interfaces = [{ apiName: 'Billable', properties: [{ apiName: 'dueDate' }] }];
    o.objectTypes[0].implements = ['Billable'];
    o.actionTypes.push({
      apiName: 'setInvoiceField', description: 'Test.', status: 'active',
      parameters: [{
        apiName: 'targets', type: 'list',
        reference: { kind: 'interfaceReference', interfaceApiName: 'Billable', multiple: true },
      }],
      rules: [{
        op: 'modify', target: `Invoice.${nazwaPola}`,
        targetField: { kind: 'objectProperty', objectType: 'Invoice', property: nazwaPola },
      }],
    });
    return trafienia(o);
  };

  it('MILCZY, gdy edytowane pole JEST w kontrakcie interfejsu', () => {
    expect(zAkcja('dueDate').has('P89')).toBe(false);
  });

  it('KRZYCZY, gdy edytowane pole jest specyficzne dla typu — spoza kontraktu', () => {
    expect(zAkcja('invoiceNumber').has('P89')).toBe(true);
  });

  it('MILCZY, gdy akcja nie bierze żadnego parametru przez interfejs', () => {
    const o = czysta();
    o.actionTypes[0].rules = [{
      op: 'modify', target: 'Invoice.invoiceNumber',
      targetField: { kind: 'objectProperty', objectType: 'Invoice', property: 'invoiceNumber' },
    }];
    expect(trafienia(o).has('P89')).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   P82 i P83 (zestaw 2.0) — KLUCZ OBCY JEST WŁAŚCIWOŚCIĄ
   ──────────────────────────────────────────────────────────────────────────────────────────
   „A foreign key is a property on one object type that stores the value of another object type's
   primary key” (`docs:3915`); kreator wiąże je, gdy „the property types of both objects match”
   (`docs:3923`); strona linku jest członkiem obiektu (`docs:3962`).
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('P82 / P83 — klucz obcy krawędzi', () => {
  /** Czysta ontologia z kluczem obcym krawędzi `customer` zapisanym jako właściwość faktury. */
  const zKluczem = () => {
    const o = czysta();
    o.objectTypes[0].properties.push({ apiName: 'customerId', type: 'string', description: 'Klucz obcy do kontrahenta.' });
    o.linkTypes[0].foreignKeyProperty = 'customerId';
    o.linkTypes[0].foreignKeyObjectType = 'Invoice';
    return o;
  };

  it('P82 · milczy, gdy klucz obcy jest właściwością z typem klucza głównego celu', () => {
    expect(trafienia(zKluczem()).has('P82')).toBe(false);
    expect(trafienia(zKluczem()).has('P83')).toBe(false);
  });

  it('P82 · krzyczy, gdy krawędź z końcem „jeden” nie wskazuje właściwości — brak, `"?"` albo nazwa w pustkę', () => {
    const bez = zKluczem();
    delete bez.linkTypes[0].foreignKeyProperty;
    expect(trafienia(bez).has('P82'), 'brak nazwy klucza obcego').toBe(true);
    const pyt = zKluczem();
    pyt.linkTypes[0].foreignKeyProperty = '?';
    expect(trafienia(pyt).has('P82'), '`"?"` — klucz obcy bez właściwości').toBe(true);
    const wPustke = zKluczem();
    wPustke.objectTypes[0].properties = wPustke.objectTypes[0].properties.filter((p) => p.apiName !== 'customerId');
    expect(trafienia(wPustke).has('P82'), 'nazwa, której nie ma w `properties`').toBe(true);
  });

  it('P82 · krzyczy, gdy typ klucza obcego ≠ typ klucza głównego celu (docs:3923)', () => {
    const o = zKluczem();
    o.objectTypes[0].properties.find((p) => p.apiName === 'customerId').type = 'integer';
    expect(trafienia(o).has('P82')).toBe(true);
  });

  it('P82 · `N:M` jest poza regułą — tam relację niesie tabela łącząca (docs:4917)', () => {
    const o = czysta();
    o.linkTypes[0].cardinality = 'MANY_TO_MANY';
    expect(trafienia(o).has('P82')).toBe(false);
  });

  it('P82 · przy celu-kontrakcie kolumna TYPU też musi być właściwością', () => {
    const o = zKluczem();
    o.linkTypes[0].foreignKeyTypeProperty = 'customerType';
    expect(trafienia(o).has('P82'), 'kolumna typu w pustkę').toBe(true);
    o.objectTypes[0].properties.push({ apiName: 'customerType', type: 'string', description: 'Typ implementatora.' });
    expect(trafienia(o).has('P82')).toBe(false);
  });

  it('P83 · krzyczy, gdy klucz obcy nazywa się jak strona linku na tym samym typie (docs:3962)', () => {
    const o = zKluczem();
    o.objectTypes[0].properties.find((p) => p.apiName === 'customerId').apiName = 'customer';
    o.linkTypes[0].foreignKeyProperty = 'customer';
    expect(trafienia(o).has('P83')).toBe(true);
    /* strona powrotna — klucz po stronie `to` przy `ONE_TO_MANY` */
    const r = zKluczem();
    r.linkTypes[0] = { ...r.linkTypes[0], from: 'Customer', to: 'Invoice', cardinality: 'ONE_TO_MANY', apiName: 'invoices', reverseName: 'customer' };
    r.objectTypes[0].properties.find((p) => p.apiName === 'customerId').apiName = 'customer';
    r.linkTypes[0].foreignKeyProperty = 'customer';
    expect(trafienia(r).has('P83'), 'kolizja z nazwą POWROTNĄ').toBe(true);
  });
});
