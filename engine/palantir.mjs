/**
 * SILNIK ZGODNOŚCI Z PRAKTYKĄ PALANTIR FOUNDRY — warstwa PROJEKTOWA.
 *
 * ⚠ GRANICA Z SĄSIEDNIMI NARZĘDZIAMI JEST CAŁĄ WARTOŚCIĄ TEGO PLIKU:
 *
 *   • testy zgodności z KODEM — czy manifest zgadza się z kodem, który go realizuje. Czytają pliki
 *     źródłowe, więc mieszkają w repozytorium projektu, nie tutaj.
 *   • walidator FORMATU — czy manifest jest SPÓJNY w swoim słownictwie: czy każda referencja się
 *     rozwiązuje, czy typ mieści się w gramatyce, czy id się nie powtarza. Reguły STRUKTURALNE,
 *     zależne od formatu — też w repozytorium, które dany format trzyma.
 *   • `palantir.mjs` (ten plik) — czy model jest DOBRZE ZAPROJEKTOWANY wg praktyki Foundry:
 *     czy nie jest God Objectem, czy akcje opisują operacje biznesowe, czy nazwy coś znaczą,
 *     czy interfejsy są konsumowane, czy właściwość liczona nie jest edytowana.
 *
 * Różnica w jednym zdaniu: **walidator pyta „czy to się spina”, ten plik pyta „czy to jest
 * dobry model”.** Manifest może mieć 100/100 u walidatora formatu i być jednym God Objectem z trzema
 * akcjami `setCoś` — i odwrotnie.
 *
 * ⚠ KAŻDA REGUŁA MA STAŁE ID (`P01`…) I CYTAT ZE ŹRÓDŁA. Bez cytatu reguła jest naszą opinią,
 * a to narzędzie ma orzekać o zgodności z CUDZĄ praktyką, nie z naszym gustem. Reguła bez
 * `zrodlo` nie przechodzi testu.
 *
 * ⚠ WYNIK JEST DETERMINISTYCZNY I MODEL JĘZYKOWY GO NIE DOTYKA. AI dokłada wyjaśnienia
 * i podejrzenia (`web/ai.mjs`), ale liczba 0–100 pochodzi wyłącznie stąd. Gdyby
 * liczbę liczył model, dwa uruchomienia na tym samym pliku dałyby dwa wyniki — a wtedy nie
 * da się ani wrzucić raportu do diffa, ani powiedzieć „poprawiliśmy się o 6 punktów”.
 */

/* ══════════════════════════════════════════════════════════════════════════════════════════
   0. WERSJA ZESTAWU REGUŁ
   ══════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠ TO JEST WERSJA REGUŁ, NIE WERSJA KODU — i to rozróżnienie jest tu całą treścią.
 * Wynik 0–100 zależy od tego, JAKIE reguły obowiązują i ILE kosztują. Dwa raporty da się
 * porównać („poprawiliśmy się o 6 punktów”) TYLKO wtedy, gdy powstały na tej samej wersji
 * zestawu. Dlatego numer jedzie w każdym raporcie i widnieje na stronie.
 *
 * ⚠ NUMER MA DWIE LICZBY I IDZIE CO 0.1 (0.1 → 0.2 → … → 1.0 → 1.1). Ta sama konwencja,
 * co w manifeście ontologii (`version-note`), i z tego samego powodu: numer ma mówić
 * „który to z kolei zestaw”, a nie udawać semver, którego tu nie ma czego wersjonować.
 *
 * KIEDY PODBIĆ: dołożona reguła, skasowana reguła, zmieniony koszt klasy, zmieniony budżet
 * kategorii, zmieniony próg — czyli wszystko, co może przesunąć czyjś wynik. Poprawka
 * literówki w uzasadnieniu NIE jest zmianą wersji.
 */
export const WERSJA = '2.0';
/* ⚠ 2.0 = 1.9 + `P82`/`P83` + poprawiony `P86` (25.09.2026). Po 1.9 idzie 2.0, nie 1.10 — numer
   ma dwie liczby i idzie co 0,1:
   • `P82`: klucz obcy krawędzi z końcem „jeden” nie jest właściwością typu po stronie
     „wiele” albo ma typ inny niż klucz główny celu (`docs:3915`, `docs:3923`);
   • `P83`: nazwa klucza obcego = nazwa strony linku na tym samym typie (`docs:3962`);
   • `P86` poprawiony: tabelą łączącą N:M jest `joinTable` ALBO `backingObjectType` (patrz nota reguły);
   • `P11`/`P27` nie liczą kolumn kluczy obcych (ich metadane centralizuje klucz główny celu). */
/* ⚠ 1.6 = 1.5 + K10. Numery są kolejnością ZESTAWÓW, nie scaleń: 1.4 wziął K5c (typ wartości jako
   użycie), 1.5 — K9 (`P15` forma zapisu czasu, `P20` mnogość), 1.6 — K10 (kanon w kształcie Foundry:
   nazwy API, typy bazowe, `valueSource`, akcja oparta o funkcję, wiązka do kontraktu, kryteria natywne,
   type classes, metadane, statusy). Na własnej gałęzi K10 skakał 1.3 → 1.6 z pominięciem 1.4 i 1.5, bo
   tamte klastry szły RÓWNOLEGLE; po scaleniu (17.09.2026) zestaw 1.6 ZAWIERA wszystkie trzy. Integrator
   sprawdza przy scaleniu, że każdy numer istnieje raz i że żaden raport nie powstał na numerze, który
   po drodze zmienił znaczenie.
   ⚠ 1.9 = 1.8 + `P84`–`P89` (25.09.2026). Audyt zgodności z Foundry pokazał, że 100/100 na
   kilku wzorcach nie do zbudowania był ciszą narzędzia, nie zgodnością modelu — sześć reguł niezależnych od klucza
   obcego (głębokość `derived.via`, typ współdzielony na ≤1 typie, N:M bez tabeli łączącej, delete
   deklaratywny bez referencji/z kaskadą, wiele obiektów z listy w akcji deklaratywnej, akcja na
   interfejsie spoza kontraktu) domyka tę lukę. `P82`/`P83` (FK jako właściwość, nazwa FK kolidująca
   ze stroną linku) zostają ZAREZERWOWANE dla dwóch reguł klucza obcego (weszły w 2.0, patrz wyżej). */

/**
 * CEL PRZYJĘCIA ZNACZĄCY „TEN MODEL JAKO CAŁOŚĆ” (od zestawu 1.3).
 * ⚠ NIE JEST NAZWĄ W MODELU I NIE MA NIĄ BYĆ: reguła orzekająca o całym modelu (granica wierszowa,
 * konwencja dat) nie wskazuje żadnego wpisu, więc do 1.2 nie dawało się jej przyjąć w ogóle —
 * a bywa decyzją tak samo jak każda inna. Gwiazdka dopasowuje się WYŁĄCZNIE do znaleziska, którego
 * adres kończy się na `[*]`, czyli do takiego, które samo deklaruje ten zasięg.
 */
export const CALY_MODEL = '*';

/* ══════════════════════════════════════════════════════════════════════════════════════════
   1. SŁOWNIK: wagi, kategorie, progi
   ══════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * Trzy klasy, te same co w `walidator.mjs` — żeby oba raporty dało się czytać tą samą miarą.
 * ⚠ `uwaga` kosztuje mało CELOWO: reguła projektowa bywa fałszywie dodatnia (obiekt o 30
 * właściwościach bywa uzasadniony), więc nie wolno jej kosztować tyle, co złamanej zasady.
 */
export const KLASY = {
  zlamanie: { koszt: 4, opis: 'łamie zasadę, którą Foundry stawia wprost' },
  ryzyko: { koszt: 1.5, opis: 'wpada we wzorzec, przed którym Foundry ostrzega' },
  uwaga: { koszt: 0.4, opis: 'sygnał do przejrzenia — bywa uzasadniony' },
  /* ⚠ ZERO PUNKTÓW, I TO JEST CAŁY SENS TEJ KLASY. Są rzeczy, których kod potrafi tylko
     WSKAZAĆ, nie ORZEC: „te pola mają wspólny wyraz w nazwie” jest dowodem na PYTANIE, a nie
     na usterkę. Nazwa `medianValue` / `medianTime` / `medianCost` skleiłaby trzy rzeczy, które
     nie mają ze sobą nic wspólnego poza słowem. Odejmowanie za to punktów znaczyłoby karanie
     kogoś za nasze zgadywanie — więc kandydat idzie na ekran jako PODPOWIEDŹ DO ZOBACZENIA,
     a rozstrzyga człowiek albo model (patrz `AI-S1`). */
  podpowiedz: { koszt: 0, opis: 'kandydat do obejrzenia — kod wskazuje, nie orzeka' },
};
const KOLEJNOSC_KLAS = ['zlamanie', 'ryzyko', 'uwaga', 'podpowiedz'];

export const KATEGORIE = [
  { id: 'domena', budzet: 18, opis: 'model odwzorowuje ŚWIAT, nie tabele źródłowe' },
  { id: 'abstrakcja', budzet: 14, opis: 'wspólny kształt mieszka w interfejsie, nie w kopiach' },
  { id: 'nazewnictwo', budzet: 12, opis: 'nazwy niosą znaczenie dla człowieka i agenta' },
  { id: 'akcje', budzet: 12, opis: 'akcja to OPERACJA BIZNESOWA, nie zapis do kolumny' },
  { id: 'wlasciwosci', budzet: 12, opis: 'każdy fakt w jednym miejscu; liczone nie jest edytowane' },
  { id: 'relacje', budzet: 10, opis: 'link znaczy coś w domenie, a relacja z atrybutem jest obiektem' },
  { id: 'cykl-zycia', budzet: 8, opis: 'każdy zasób mówi, jak bardzo jest gotowy i czy ma go widać' },
  { id: 'tozsamosc', budzet: 8, opis: 'klucz główny jest jeden, deterministyczny i trwały' },
  { id: 'bezpieczenstwo', budzet: 3, opis: 'wrażliwość jest POLITYKĄ modelu, nie filtrem w kodzie' },
  { id: 'dokumentacja', budzet: 3, opis: 'każdy element mówi, czym jest' },
];

/* ── Progi. ⚠ Liczby pochodzą z dokumentacji tam, gdzie Palantir je podaje, a z doświadczenia
      tam, gdzie mówi „many”. Które jest które — stoi przy regule w polu `prog`. ─────────── */
const PROG = {
  wlasciwosciOstrzezenie: 25,   // „many properties that are frequently null” — nasza kalibracja
  wlasciwosciZlamanie: 40,      // Palantir podaje przykład God Objectu ze „150+ properties”
  akcjeNaTyp: 10,               // WPROST z docs: „More than 10 action types for a single object type”
  regulaTrzech: 3,              // WPROST z docs: „three means it is time to refactor”
  wspolnePolaDuplikatu: 4,      // ile nazw właściwości musi się pokryć, żeby mówić o duplikacie
  prefiksStruktury: 4,          // ile pól o wspólnym PREFIKSIE prosi się o strukturę
  wspolnyRzeczownik: 4,         // …a ile o wspólnym RZECZOWNIKU w środku nazwy (sygnał słabszy)
  celeMegaAkcji: 12,            // ile typów naraz czyni akcję nieprzeglądalną
};

/* ── Słowniki rozpoznające wzorce. Wszystkie po ANGIELSKU, bo `apiName` jest po angielsku
      (`language.model`); polskie odpowiedniki dokładamy, bo realne modele bywają mieszane. ─ */
const NAZWY_OGOLNE_TYPU = new Set(['data', 'item', 'record', 'info', 'entity', 'object', 'thing',
  'element', 'row', 'table', 'master', 'detail', 'dane', 'obiekt', 'pozycja', 'rekord', 'element']);
/* ⚠ LISTA JEST CYTATEM, NIE NASZĄ OPINIĄ — i od zestawu 1.3 ROZJEMCĄ JEST TABELA „Naming rules”,
   a nie akapit „Indicators” anty-wzorca Misnomer. Te dwa miejsca dokumentacji mówią co innego
   i przez dwa zestawy reguł ważniejszy był przypadkiem ten słabszy:

     • TABELA stawia w kolumnie DOBRYCH przykładów właściwości `age`, `status`,
       `lastInspectionDate` i osobnym wierszem wymienia terminy do doprecyzowania:
       „Ambiguous terms → Qualify with specific meaning … `value`, `quantity`, `score`”;
     • AKAPIT „Indicators” wylicza „single generic words like `value`, `type`, `status`, `date`,
       or `name` without qualification” — czyli potępia `status`, który TABELA chwali.

   Sprzeczności nie da się rozstrzygnąć głosowaniem, więc rozstrzyga ją ROLA: tabela jest REGUŁĄ
   („Naming rules”), akapit — listą OBJAWÓW, po których poznaje się problem. Reguła wygrywa.
   Skutek: `status` i `name` WYPADŁY z tej listy (były w niej do 1.2 i produkowały jedno
   znalezisko na prawie każdym typie, który ma nazwę). Wypadły też `amount` i `flag`, wpisane
   tu kiedyś „z przykładów” — sprawdzone: `amount` pada w dokumentacji jako ZWYKŁA właściwość
   wydatku i jako przykład progu w monitorach obiektów, a `flag` nie pada w ogóle.

   ⚠ CO ZOSTAJE I SKĄD — dwa piętra, bo czytelnik ma prawo wiedzieć, które słowo jest CYTATEM,
   a które NASZYM ROZSZERZENIEM tej samej reguły:
     (a) WYPISANE W ŹRÓDLE: `value`, `quantity`, `score` (wiersz „Ambiguous terms” tabeli),
         `type` i `date` (kolumna „✗ Avoid” rozwiązania Misnomera: `type` → `productCategory`,
         `date` → `orderPlacedDate`), a także `data`, `item`, `record` — tabela odrzuca je jako
         nazwy TYPU, a jako nazwa POLA są co najmniej tak samo puste;
     (b) TEN SAM KSZTAŁT, CO WIERSZ „Ambiguous terms”: `code`, `text`, `info` — gołe rzeczowniki
         nazywające MIARĘ albo IDENTYFIKATOR bez powiedzenia, CZEGO. Objaw z akapitu wyżej
         nazywa to wprost: „The same name could reasonably refer to multiple different concepts”.
   Piętro (b) jest rozszerzeniem REGUŁY, a nie nową regułą — i dlatego klasa całego `P14` to
   `uwaga`, a jej uzasadnienie mówi wprost, że bywa fałszywie dodatnia. */
const NAZWY_OGOLNE_POLA = new Set(['value', 'quantity', 'score', 'type', 'date',
  'data', 'item', 'record', 'code', 'text', 'info',
  'wartosc', 'ilosc', 'typ', 'kod', 'dane', 'tekst', 'pozycja', 'rekord']);
/* ⚠ FILTR SZUMU DLA `P11`, A NIE DRUGA LISTA NIEDOOKREŚLONYCH — i różnica jest cała w tym, o co
   pyta która reguła. `P14` pyta, czy nazwa MÓWI, CZEGO DOTYCZY; `P11` pyta, czy TA SAMA WIELKOŚĆ
   jest zadeklarowana w kilku miejscach osobno. Przy słowie tak pospolitym jak `name` czy `status`
   powtórzenie nazwy nie jest ani przez chwilę dowodem na powtórzenie WIELKOŚCI: nazwa zamówienia
   i nazwa maszyny nie mają ze sobą nic wspólnego poza wyrazem, więc typ współdzielony nie miałby
   czego centralizować. Do zestawu 1.2 obie reguły korzystały z jednej listy i skutek był
   przypadkowy: `status` i `name` wypadły z `P14` (tabela „Naming rules” stawia je w kolumnie
   DOBRYCH przykładów) i tym samym WPADŁY do `P11` — czyli poprawka jednej reguły zepsułaby drugą.
   Stąd osobny zbiór: `P14` zwęziło się do tabeli, a filtr szumu `P11` został, gdzie był. */
const NAZWY_ZBYT_POSPOLITE = new Set([...NAZWY_OGOLNE_POLA, 'status', 'name', 'nazwa', 'label', 'title']);
const NAZWY_OGOLNE_LINKU = new Set(['related', 'relateditems', 'link', 'link1', 'ref', 'items',
  'data', 'children', 'parent', 'other', 'assoc', 'association', 'powiazane', 'link']);
/* ⚠ `i` + lookahead: `ErpOrderData` zaczyna się WIELKĄ literą, więc bez `i` prefiks nie trafia,
   a bez lookaheadu `[A-Z_]` zjadałoby literę należącą do następnego wyrazu. */
/* ⚠ WYŁĄCZNIE SKRÓTY SYSTEMÓW, nigdy zwykłe angielskie słowa. `source`, `external` i `raw`
   stały tu do pierwszego przebiegu i wyprodukowały fałszywy dodatni na `SourceChange` —
   a `RawMaterial` złapałyby tak samo. Skrót (`Erp`, `Sap`, `Stg`) nie jest rzeczownikiem
   z żadnej domeny, więc jako prefiks znaczy dokładnie jedno: skąd te dane przyszły. */
const PREFIKSY_SYSTEMOWE = /^(erp|sap|crm|mes|wms|hrm|stg|tmp|dwh|edw|ods|legacy)(?=[A-Z_])/i;
const POLA_TECHNICZNE = /^(_|etl_|_crm|_erp|dw_|dwh_|stg_|raw_|sys_)|((extracted|ingested|loaded|batched|received|synced)_?(at|ts|time)$)|^(row_?num|row_?id|record_?id|schema_?version|source_?file|load_?date|last_?etl|audit_?col|internal_?id|_?rid)$/i;
/* ⚠ DWA WZORCE, BO TO DWIE RÓŻNE RZECZY W NAZWIE — i jeden regex nie unosi obu.
   (1) ZNACZNIK WERSJI stoi po granicy wyrazu: `ContractV2`, `Order_v2`, `PlanRev3`.
       Granicą w camelCase jest WIELKA LITERA, więc `[^a-z]` (który jej nie widzi) tu nie działa.
   (2) ROK jest samymi cyframi na końcu: `Order2024`, `Sales2023`. Osobno, bo nie ma przed sobą
       żadnego znacznika — i osobno dlatego, że `Base64` albo `Iso8601` NIE są rokiem. */
const ZNACZNIK_WERSJI = /(?:^|[A-Z_\-\s])(v|ver|version|rev|revision)\d+$/i;
const ROK_W_NAZWIE = /(?:^|[^0-9])(19|20)\d{2}$/;
const maWersjeWNazwie = (n) => ZNACZNIK_WERSJI.test(n) || ROK_W_NAZWIE.test(n);
/* ⚠⚠ RDZENIE WRAŻLIWE MAJĄ DWIE LISTY I DWA SPOSOBY DOPASOWANIA (zestaw 1.7 · 3.0 · A14).
   Do zestawu 1.6 stała tu JEDNA alternatywa dopasowywana do CAŁEJ nazwy jak podciąg — i ta
   forma miała wadę widoczną dopiero na konkretnej nazwie: polskie rdzenie są krótkie i trafiają
   W ŚRODEK angielskich słów. `core.OrderStatus.sourceName` zapalał `P40`, bo `sour`+`ceNa`+`me`
   niesie w sobie litery `cena`. Nazwa mówi „nazwa statusu w źródle”, a narzędzie orzekało o niej
   „pole o wrażliwej nazwie bez klasyfikacji” — czyli twierdziło o modelu nieprawdę.
   ⚠ POPRAWKA JEST WĄSKA I ZMIERZONA: polskie rdzenie dopasowują się WYŁĄCZNIE na granicy
   wyrazu / segmentu camelCase (`cenaBazowa`, `koszt_calkowity`, `adresDostawy` — tak;
   `sourceName`, `licencja` — nie), angielskie zostają podciągiem, bo są dłuższe i takiej
   kolizji nie robią (zmierzone na 366 właściwościach manifestu: jedyne trafienia podciągiem
   to `price` i `token`, oba NA GRANICY wyrazu). ⚠ Reguła dalej ORZEKA — nie wyłączyliśmy jej
   ani nie przyjęliśmy znaleziska; poprawiliśmy narzędzie, które pytało o niewłaściwą rzecz.
   Decyzja właściciela z 18.09.2026 (A7): „to jest fałszywy alarm, popraw regułę”. */
const SLOWA_WRAZLIWE_EN = /(price|cost|salary|wage|margin|revenue|profit|discount|email|phone|pesel|ssn|iban|address|birth|medical|diagnos|password|token|secret)/i;
const RDZENIE_WRAZLIWE_PL = /^(cena|ceny|cenie|cenow|koszt|marza|marz[ay]|wynagrodz|adres|telefon|nip)/i;
const SLOWA_WRAZLIWE = {
  /** @param {string} n nazwa API właściwości */
  test: (n) => SLOWA_WRAZLIWE_EN.test(s(n))
    || wyrazy(n).some((w) => RDZENIE_WRAZLIWE_PL.test(w)),
};
const ZDOLNOSCI = /(schedulable|inspectable|billable|trackable|allocatable|auditable|depreciable|assignable|printable|shippable)/i;
const AGREGATY = /(count|total|sum|avg|average|min|max|liczba|suma|srednia)$/i;

/* ══════════════════════════════════════════════════════════════════════════════════════════
   2. POMOCNICZE
   ══════════════════════════════════════════════════════════════════════════════════════════ */

const t = (x) => (Array.isArray(x) ? x : []);
const s = (x) => (typeof x === 'string' ? x.trim() : '');
const krotka = (x) => s(x).split('.').pop();                    // `core.Order` → `Order`
const maOpis = (x) => s(x?.description).length >= 10;
const dolne = (x) => s(x).toLowerCase().replace(/[_\s-]/g, '');
/** camelCase / snake_case / kebab → wyrazy. `lastInspectionDate` → ['last','inspection','date'] */
const wyrazy = (x) => s(x).replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[\s_\-.]+/).filter(Boolean).map((w) => w.toLowerCase());
const zaokr = (x) => Math.round(x * 100) / 100;

/** Najdłuższy wspólny prefiks wyrazowy dwóch nazw — po nim poznajemy rodzinę pól `addressX`. */
function prefiksWyrazowy(a, b) {
  const [x, y] = [wyrazy(a), wyrazy(b)];
  const out = [];
  for (let i = 0; i < Math.min(x.length, y.length); i += 1) {
    if (x[i] !== y[i]) break;
    out.push(x[i]);
  }
  return out;
}

/**
 * ⚠ KWALIFIKATORY — wyrazy, które NIE nazywają pojęcia, tylko je zawężają. Bez tej listy
 * `minShiftLength` i `maxOrderValue` wylądowałyby w jednej „rodzinie” przez wspólne `min`/`max`,
 * a `defaultSpeed` i `defaultColor` przez `default`. Rodzina ma się brać z RZECZOWNIKA.
 */
const KWALIFIKATORY = new Set([
  'min', 'max', 'minimum', 'maximum', 'default', 'current', 'total', 'sum', 'avg', 'average',
  'first', 'last', 'new', 'old', 'prev', 'previous', 'next', 'is', 'has', 'can', 'should',
  'id', 'name', 'type', 'kind', 'value', 'count', 'flag', 'enabled', 'active', 'per', 'by',
]);

/**
 * Rzeczowniki wspólne dwóm nazwom — wyraz w DOWOLNYM miejscu, nie tylko na początku.
 * ⚠ To jest dopełnienie `prefiksWyrazowy`: `minShiftLength`, `maxShiftLength`, `shiftGridStep`
 * i `maxShiftsPerDay` opisują JEDNO pojęcie („zmiana”), a wspólnego prefiksu nie mają ani razu.
 * Liczba mnoga schodzi do pojedynczej, bo `shift` i `shifts` to ten sam rzeczownik.
 */
const rzeczowniki = (x) => new Set(wyrazy(x)
  .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
  .filter((w) => w.length >= 3 && !KWALIFIKATORY.has(w)));

/* ══════════════════════════════════════════════════════════════════════════════════════════
   3. REGUŁY
   ══════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * @param {object} o  ontologia w kształcie kanonicznym (`normalizuj.mjs`)
 * @returns {{wynik:number, kategorie:object[], znaleziska:object[], podsumowanie:object, statystyki:object}}
 */
export function ocen(o) {
  const znaleziska = [];
  const zbadane = Object.fromEntries(KATEGORIE.map((k) => [k.id, 0]));

  /**
   * Jedno zastosowanie jednej reguły. ⚠ Liczy się do „zbadano” TAKŻE, gdy przejdzie —
   * inaczej nie widać różnicy między „sprawdzone i czyste” a „w ogóle nie sprawdzane”.
   */
  /* ⚠ `elementy` i `kandydat` są OPCJONALNE i nie wchodzą do treści raportu na siłę: niesie je
     tylko reguła, która wskazuje KONKRETNE pola i chce, żeby ktoś (człowiek albo model) je
     rozstrzygnął. Pierwsza wersja destrukturyzowała stałą listę pól i po cichu je gubiła —
     kandydaci `P27` nie dojeżdżali do warstwy modelu, a licznik wyglądał, jakby ich nie
     produkował. Stąd jawne `...reszta`. */
  const licznikPodpowiedzi = {};
  const regula = (ok, { id, klasa, kategoria, co, gdzie, dlaczego, jak, zrodlo, prog, ...reszta }) => {
    zbadane[kategoria] += 1;
    if (!ok) {
      const wpis = { id, klasa, kategoria, co, gdzie, dlaczego, jak, zrodlo, prog, ...reszta };
      /* ⚠ KAŻDA PODPOWIEDŹ JEST KANDYDATEM DO ROZSTRZYGNIĘCIA. Klucz nadaje się tu, a nie przy
         regule, żeby nowa podpowiedź trafiała do warstwy modelu SAMA — inaczej ktoś dołoży
         regułę klasy `podpowiedz` i nikt nigdy jej nie potwierdzi ani nie obali.
         ⚠ KLUCZ JEST KRÓTKI I BEZ SPACJI (`P19#2`), a nie adresem w rodzaju
         `P19:actionTypes[* → production.Task]`. Model ma go PRZEPISAĆ co do znaku, żeby werdykt
         dało się przypiąć do znaleziska — a adres z nawiasami i strzałką przepisuje się źle
         i werdykt przepada jako „klucz spoza listy”. Zmierzone: jeden z dwóch werdyktów. */
      if (klasa === 'podpowiedz' && !wpis.kandydat) {
        licznikPodpowiedzi[id] = (licznikPodpowiedzi[id] ?? 0) + 1;
        wpis.kandydat = `${id}#${licznikPodpowiedzi[id]}`;
      }
      znaleziska.push(wpis);
    }
    return !!ok;
  };

  /**
   * ⚠⚠ KLUCZ ODWOŁAŃ TO `qualifiedName`, A `apiName` TO NAZWA, KTÓRĄ SIĘ OCENIA (zestaw 1.5).
   *
   * Od zestawu 1.5 kanon niesie przy typie obiektu i przy kontrakcie TRZY pola zamiast jednego:
   * nazwę API (lokalną, PascalCase), grupę (namespace) i pełną nazwę kwalifikowaną, która jest
   * kluczem odwołań wewnątrz kanonu (`from`/`to` krawędzi, `implements`, cele edycji, przyjęcia).
   *
   * Reguły nazw pytają o `apiName`; WSZYSTKO POZOSTAŁE łączy po kluczu. Żeby nie przepisywać
   * stu miejsc i nie ryzykować, że któreś po cichu przestanie się łączyć, listy robocze widzą pod
   * `apiName` KLUCZ (tak jak przed 1.5), a nazwa lokalna jedzie obok jako `nazwaApi`. Model
   * zapisany po Foundry'emu ma te dwie rzeczy równe, więc po tamtej stronie nic się nie zmienia.
   */
  const klucz = (x) => s(x?.qualifiedName) || s(x?.apiName);
  const zKluczem = (x) => ({ ...x, apiName: klucz(x), nazwaApi: s(x?.apiName), grupa: s(x?.namespace) });

  const obiekty = t(o.objectTypes).map(zKluczem);
  const linki = t(o.linkTypes);
  const akcje = t(o.actionTypes);
  const funkcje = t(o.functions);
  const interfejsy = t(o.interfaces).map(zKluczem);
  const wspolne = t(o.sharedPropertyTypes);
  const wszystkieWlasciwosci = obiekty.flatMap((ob) => t(ob.properties).map((p) => ({ ob, p })));

  /**
   * Cel edycji akcji → TYP OBIEKTU, którego dotyczy.
   *
   * ⚠ NIE DA SIĘ TEGO ZGADNĄĆ PO LICZBIE KROPEK, i to był realny błąd w pierwszej wersji:
   * `slice(0, 2)` działało dla `core.Order.dueDate` (namespace + typ), ale dla `Invoice.amount`
   * oddawało `Invoice.amount` zamiast `Invoice` — czyli Action Sprawl nie łapał się u NIKOGO,
   * kto nie używa namespace'ów, a to jest większość modeli. Rozstrzygamy po ZNANYCH nazwach
   * typów, od najdłuższej, i dopiero gdy żadna nie pasuje, zostawiamy cel jak stoi
   * (link albo typ, którego w modelu nie ma — to zgłasza osobna reguła).
   */
  /**
   * ⚠⚠ CO TA AKCJA ZAPISUJE — CZYTA SIĘ Z `declaredEdits`, A NIE Z `rules` (zestaw 1.5).
   *
   * Od 1.5 kanon rozdziela dwie rzeczy, które do tej pory stały w jednym polu: `rules` to reguły,
   * które Ontology Manager pokaże (a przy akcji opartej o funkcję jest to DOKŁADNIE JEDNA reguła
   * `runFunction`, `docs:4878`), a `declaredEdits` to edycje, które akcja DEKLARUJE. Reguła
   * pytająca „czy do tego pola ktokolwiek pisze” musi czytać to drugie — inaczej przy akcji
   * opartej o funkcję zamilkłaby PO CICHU i raport wyglądałby lepiej, niż jest.
   * ⚠ ODWRÓT NA `rules` JEST OBOWIĄZKOWY: kanon zbudowany innym normalizatorem może nie nieść
   * `declaredEdits` w ogóle, a wtedy regułami są edycje i trzeba czytać je.
   */
  const edycjeAkcji = (a) => (t(a?.declaredEdits).length ? t(a.declaredEdits) : t(a?.rules));

  const nazwyTypow = [...obiekty.map((x) => s(x.apiName)).filter(Boolean)].sort((a, b) => b.length - a.length);
  const typZCelu = (cel) => {
    const c = s(cel);
    if (!c) return '';
    const trafiona = nazwyTypow.find((n) => c === n || c.startsWith(`${n}.`));
    return trafiona ?? c;
  };

  /* ────────────────────────────────────────────────────────────────────────────────────────
     DOMENA — model odwzorowuje świat, nie systemy źródłowe
     ──────────────────────────────────────────────────────────────────────────────────────── */

  for (const ob of obiekty) {
    const props = t(ob.properties);

    /* P01 · God Object po liczbie właściwości */
    regula(props.length < PROG.wlasciwosciZlamanie, {
      id: 'P01', klasa: 'ryzyko', kategoria: 'domena',
      co: `\`${ob.apiName}\` ma ${props.length} właściwości`,
      gdzie: `objectTypes[${ob.apiName}]`,
      prog: `≥ ${PROG.wlasciwosciZlamanie}`,
      dlaczego: 'Typ o tylu właściwościach prawie zawsze reprezentuje kilka różnych bytów naraz. '
        + 'To jest anty-wzorzec God Object: użytkownik przestaje wiedzieć, czym ten typ JEST, '
        + 'większość pól jest pusta dla większości egzemplarzy, a reguły biznesowej nie da się '
        + 'wymusić, bo dla każdego „rodzaju” znaczy co innego.',
      jak: 'Wypisz realne byty, które ten typ dziś niesie, i zrób z nich osobne typy. '
        + 'Wspólny kształt wynieś do interfejsu, zamiast trzymać go w jednym typie z polem `kind`.',
      zrodlo: 'Ontology design: Anti-patterns → The God Object — „The object type has 150+ properties, '
        + 'most of which are null for any given object”',
    });
    if (props.length < PROG.wlasciwosciZlamanie) {
      regula(props.length < PROG.wlasciwosciOstrzezenie, {
        id: 'P02', klasa: 'podpowiedz', kategoria: 'domena',
        co: `\`${ob.apiName}\` ma ${props.length} właściwości`,
        gdzie: `objectTypes[${ob.apiName}]`,
        prog: `≥ ${PROG.wlasciwosciOstrzezenie} (kalibracja nasza — Foundry mówi „many”)`,
        dlaczego: 'Jeszcze nie God Object, ale typ zaczyna nieść więcej niż jedno pojęcie. '
          + 'Sprawdź, czy któraś grupa pól nie opisuje osobnego bytu albo nie prosi się o strukturę.',
        jak: 'Pogrupuj pola po znaczeniu. Grupa, która ma własny cykl życia → osobny typ z linkiem. '
          + 'Grupa, która zawsze jedzie razem → struktura (struct property type).',
        zrodlo: 'Ontology design: Anti-patterns → The God Object (wskaźnik: „an object type has many '
          + 'properties that are frequently null”)',
      });
    }

    /* P03 · God Object po dyskryminatorze: pole `kind`/`type` o zamkniętej liście wartości */
    const dyskryminator = props.find((p) => ['kind', 'type', 'category', 'rodzaj', 'typ'].includes(dolne(p.apiName))
      && (s(p.typeRaw).startsWith('enum') || t(ob.discriminatorValues).length > 0));
    regula(!dyskryminator || t(ob.discriminatorValues).length < 3, {
      id: 'P03', klasa: 'ryzyko', kategoria: 'domena',
      co: `\`${ob.apiName}\` rozróżnia ${t(ob.discriminatorValues).length} rodzaje polem \`${dyskryminator?.apiName ?? 'kind'}\``,
      gdzie: `objectTypes[${ob.apiName}].${dyskryminator?.apiName ?? 'kind'}`,
      prog: `≥ ${PROG.regulaTrzech} wartości dyskryminatora`,
      dlaczego: 'Pole, które mówi „jakiego rodzaju jest ten obiekt”, jest wskaźnikiem God Objectu: '
        + 'znaczenie pozostałych właściwości zaczyna zależeć od jego wartości, a walidacji nie da się '
        + 'napisać bez rozgałęzień. Przy trzech rodzajach Palantir mówi wprost: czas na refaktor.',
      jak: 'Zrób osobny typ na każdy rodzaj i wspólny INTERFEJS na to, co ich łączy. '
        + 'Foundry dopuszcza dowolnie wiele typów po jednej stronie relacji, więc podział nic nie psuje.',
      zrodlo: 'Anti-patterns → The God Object („Property meanings change based on another property\'s '
        + 'value (such as type or category)”) + Best practices → rule of three',
    });

    /* P04 · Kitchen Sink — kolumny techniczne wystawione jako właściwości */
    const techniczne = props.filter((p) => POLA_TECHNICZNE.test(s(p.apiName)));
    regula(techniczne.length === 0, {
      id: 'P04', klasa: 'ryzyko', kategoria: 'domena',
      co: `\`${ob.apiName}\` wystawia ${techniczne.length} pól technicznych: ${techniczne.slice(0, 4).map((p) => `\`${p.apiName}\``).join(', ')}`,
      gdzie: `objectTypes[${ob.apiName}].properties`,
      dlaczego: 'To są artefakty rury danych, nie fakty o świecie. Wystawione jako właściwości '
        + 'zaśmiecają model użytkownikowi i agentowi, powiększają indeks i przykrywają pola, '
        + 'które naprawdę coś znaczą.',
      jak: 'Zostaw je w zbiorze źródłowym do debugowania, a z ontologii usuń. '
        + 'Te, które MUSZĄ zostać, oznacz widocznością `hidden`.',
      zrodlo: 'Anti-patterns → The Kitchen Sink („Keep technical metadata in the backing dataset '
        + 'for debugging, but do not expose it as properties”)',
    });

    /* P05 · System Silos — nazwa typu niesie nazwę systemu źródłowego */
    regula(!PREFIKSY_SYSTEMOWE.test(krotka(ob.apiName)), {
      id: 'P05', klasa: 'ryzyko', kategoria: 'domena',
      co: `\`${ob.apiName}\` nazywa się od systemu źródłowego`,
      gdzie: `objectTypes[${ob.apiName}]`,
      dlaczego: 'Typ nazwany od systemu (`ErpOrder`, `SapCustomer`) odwzorowuje RURĘ, a nie byt. '
        + 'Gdy ten sam byt przyjdzie drugą rurą, powstanie drugi typ — i nikt nie będzie wiedział, '
        + 'który jest prawdziwy.',
      jak: 'Jeden typ na byt, zasilany połączonym zbiorem z wszystkich systemów. '
        + 'Reguły pierwszeństwa przy konflikcie ustal w rurze, nie w nazwie typu.',
      zrodlo: 'Anti-patterns → System Silos („Create a single object type representing the real-world '
        + 'entity and use data pipelines to merge information from multiple source systems”)',
    });

    /* P06 · The Time Machine — wersja albo rok w nazwie typu */
    regula(!maWersjeWNazwie(krotka(ob.apiName)), {
      id: 'P06', klasa: 'podpowiedz', kategoria: 'domena',
      co: `\`${ob.apiName}\` niesie wersję albo rok w nazwie`,
      gdzie: `objectTypes[${ob.apiName}]`,
      dlaczego: 'Historia modelowana jako osobne typy albo osobne egzemplarze („Contract v1, v2”) '
        + 'rozsadza model: liczba obiektów rośnie z liczbą ZMIAN, nie bytów, a linki przestają '
        + 'wiedzieć, do której wersji wskazywać.',
      jak: 'Jeden obiekt na byt, z właściwościami opisującymi stan BIEŻĄCY. '
        + 'Historia mieszka w osobnym, podlinkowanym typie (`…Amendment`, `…History`) albo w historii edycji.',
      zrodlo: 'Anti-patterns → The Time Machine („Use a single object per entity with linked '
        + 'history/amendment objects”)',
    });
  }

  /* ────────────────────────────────────────────────────────────────────────────────────────
     ABSTRAKCJA — DRY, interfejsy, kompozycja zamiast hierarchii
     ──────────────────────────────────────────────────────────────────────────────────────── */

  /* P07 · Reguła trzech: typy o pokrywającym się kształcie bez wspólnego interfejsu */
  {
    const zbiory = obiekty.map((ob) => ({
      ob, nazwy: new Set(t(ob.properties).map((p) => dolne(p.apiName))),
      interfejsy: new Set(t(ob.implements)),
    }));
    const rodziny = [];
    for (let i = 0; i < zbiory.length; i += 1) {
      const grupa = [zbiory[i]];
      for (let j = i + 1; j < zbiory.length; j += 1) {
        const wspolneNazwy = [...zbiory[i].nazwy].filter((n) => zbiory[j].nazwy.has(n));
        if (wspolneNazwy.length >= PROG.wspolnePolaDuplikatu) grupa.push(zbiory[j]);
      }
      if (grupa.length >= PROG.regulaTrzech) rodziny.push(grupa);
    }
    /* Zgłaszamy tylko rodziny, których członkowie NIE mają wspólnego interfejsu. */
    const widziane = new Set();
    for (const grupa of rodziny) {
      const klucz = grupa.map((g) => g.ob.apiName).sort().join('|');
      if (widziane.has(klucz)) continue;
      widziane.add(klucz);
      const wspolnyInterfejs = [...grupa[0].interfejsy].some((i) => grupa.every((g) => g.interfejsy.has(i)));
      regula(wspolnyInterfejs, {
        id: 'P07', klasa: 'podpowiedz', kategoria: 'abstrakcja',
        co: `${grupa.length} typów dzieli wspólny kształt bez wspólnego interfejsu: ${grupa.map((g) => `\`${g.ob.apiName}\``).join(', ')}`,
        gdzie: `objectTypes[${grupa.map((g) => g.ob.apiName).join(', ')}]`,
        prog: `${PROG.regulaTrzech} typy × ≥ ${PROG.wspolnePolaDuplikatu} wspólnych nazw właściwości`,
        dlaczego: 'Powtórzony kształt znaczy powtórzone akcje, powtórzone funkcje i powtórzony koszt '
          + 'utrzymania — a dla agenta AI dwuznaczność, który z tych typów jest kanoniczny.',
        jak: 'Albo jeden typ z właściwością rozróżniającą, albo wspólny interfejs. '
          + 'Reguła trzech: jeden duplikat bywa przypadkiem, dwa są wzorcem, trzy znaczą „refaktor”.',
        zrodlo: 'Best practices → Do not repeat yourself (rule of three) — „If multiple object types '
          + 'share a common shape… evaluate whether they should be a single type… or should implement '
          + 'a shared interface”',
      });
    }
  }

  /* P08 · Interfejs zadeklarowany, ale NIC go nie konsumuje */
  /* ⚠⚠ SYGNATURA NIESIE KONTRAKT TAKŻE PRZEZ TYP KODU, KTÓRY BIERZE ALBO ZWRACA (dostrojenie K7-2).
     Funkcja oddająca rekord, którego POLE jest referencją do kontraktu, konsumuje ten kontrakt tak
     samo, jak funkcja biorąca go wprost — czyta go, rozwiązuje po implementatorze i mówi o nim
     swojemu wołającemu. Reguła tego nie widziała, bo pytała o `typeRaw` SAMEJ sygnatury, a rekord
     jest tam nazwą (`list(struct(platform.HealthFinding))`).
     ⚠ TO JEST TA SAMA FIGURA, CO PRZY ROZBICIU WIĄZKI W ZESTAWIE 1.5: kształt się zmienił, reguła
     przestała widzieć konsumpcję i zaczęła zgłaszać kontrakt, który MA czytelnika. Tam odpowiedzią
     było zapytanie o więzy i wiązki, tu — o pola typów kodu w sygnaturze. Zmierzone: `core.Provenanced`
     ma czytelnika od K9 (`poolHealth` → `platform.HealthFinding.subject`), a reguła zgłaszała go dalej.
     ⚠ CZEGO TO DOSTROJENIE NIE ROBI: nie uznaje za konsumpcję samego ISTNIENIA pola w rekordzie —
     rekord musi stać w sygnaturze funkcji (na wejściu albo na wyjściu). Typ kodu, którego nikt nie
     bierze ani nie zwraca, dalej nie konsumuje niczego. */
  const typyKodu = new Map([...t(o.functionTypes), ...t(o.sharedPropertyTypes)]
    .map((x) => [s(x.apiName), x]));
  const kontraktyWTypie = (nazwaTypu, widziane = new Set()) => {
    const zebrane = new Set();
    const typ = typyKodu.get(nazwaTypu);
    if (!typ || widziane.has(nazwaTypu)) return zebrane;
    widziane.add(nazwaTypu);
    for (const f of t(typ.fields)) {
      const cel = /(?:^|\()ref\(([^)]+)\)/.exec(s(f.typeRaw))?.[1];
      if (cel) zebrane.add(cel);
      const wGlab = /struct\(([^)]+)\)/.exec(s(f.typeRaw))?.[1];
      if (wGlab) for (const x of kontraktyWTypie(wGlab, widziane)) zebrane.add(x);
    }
    return zebrane;
  };
  /** Kontrakty, które sygnatura niesie WPROST albo przez typ kodu, który bierze/zwraca. */
  const kontraktySygnatury = (typeRaw) => {
    const zebrane = new Set();
    const napis = s(typeRaw);
    for (const [nazwaTypu] of typyKodu) {
      if (napis.includes(nazwaTypu)) for (const x of kontraktyWTypie(nazwaTypu)) zebrane.add(x);
    }
    return zebrane;
  };

  for (const i of interfejsy) {
    const nazwa = i.apiName;
    const wSygnaturach = funkcje.some((f) => t(f.inputs).some((x) => s(x.typeRaw).includes(nazwa))
      || s(f.output?.typeRaw).includes(nazwa)
      || t(f.inputs).some((x) => kontraktySygnatury(x.typeRaw).has(nazwa))
      || kontraktySygnatury(f.output?.typeRaw).has(nazwa));
    const wParametrach = akcje.some((a) => t(a.parameters).some((p) => s(p.typeRaw).includes(nazwa)));
    /* ⚠ KRAWĘDŹ CELOWANA W KONTRAKT JEST W KANONIE WIĄZKĄ (zestaw 1.5), więc `to` konkretnej
       krawędzi wskazuje IMPLEMENTATORA, a nie kontrakt. Konsumpcję widać wtedy po WIĘZIE
       (`interfaceLinkConstraints`) albo po wiązce — i trzeba o nie zapytać, inaczej kontrakt
       używany WYŁĄCZNIE przez krawędź wyglądałby nagle na nieskonsumowany. Zmierzone przy
       rozbiciu: `core.TimingProfile` przechodził od `P08` do znalezisk i z powrotem. */
    const wLinkach = linki.some((l) => l.from === nazwa || l.to === nazwa)
      || t(o.linkBundles).some((b) => s(b.interfaceApiName) === nazwa || s(b.from) === nazwa)
      || t(o.interfaceLinkConstraints).some((c) => s(c.interfaceApiName) === nazwa || s(c.target) === nazwa);
    regula(wSygnaturach || wParametrach || wLinkach, {
      id: 'P08', klasa: 'ryzyko', kategoria: 'abstrakcja',
      co: `interfejs \`${nazwa}\` nie jest użyty w ŻADNEJ sygnaturze, parametrze ani linku`,
      gdzie: `interfaces[${nazwa}]`,
      dlaczego: 'Interfejs, którego nikt nie konsumuje, jest dokumentacją, a nie warstwą API. '
        + 'Cała jego wartość polega na tym, że logika napisana raz działa na każdym typie, który go '
        + 'spełnia — a to dzieje się dopiero wtedy, gdy funkcja albo akcja bierze go jako TYP.',
      jak: 'Przenieś na niego przynajmniej jedną sygnaturę, która dziś bierze typ konkretny. '
        + 'Jeśli to jeszcze niemożliwe, napisz przy interfejsie, że jest RUSZTOWANIEM na przyszłość — '
        + 'Foundry to dopuszcza, ale każe nazwać ten stan.',
      zrodlo: 'Structural guidance → Interfaces („Target interfaces in workflows: build actions, '
        + 'functions, and applications against interfaces where possible”; „Scaffold now, consolidate later”)',
    });

    /* ══════════════════════════════════════════════════════════════════════════════════════
       P09 · INTERFEJS, KTÓRY NIE DEKLARUJE NICZEGO — i dlaczego to już NIE JEST „bez akcji”

       ⚠ REGUŁA DOSTROJONA W ZESTAWIE 1.6, BO PYTAŁA O WIĘCEJ, NIŻ ŻĄDA ŹRÓDŁO. Do 1.5 zapalała
       na każdym interfejsie bez kontraktów AKCJI — i zgłaszała jako usterkę kontrakt samego
       KSZTAŁTU, który u Foundry jest pełnoprawny. Dokumentacja mówi to trzema zdaniami:
       „An interface is composed of interface properties, link type constraints, action type
       constraints, and metadata about the interface” (`docs:19068`) — czyli WYLICZA składniki,
       a nie żąda wszystkich; nagłówek kroku brzmi wprost „**Create interface action type
       constraints (optional)**” (`docs:19159`), a treść powtarza: „you can **optionally** add
       interface action type constraints” (`docs:19161`) i „**If** an interface action type
       constraint **is required for your modeling use case**…” (`docs:19171`). Wzorcowy `Facility`
       z tej samej dokumentacji ma właściwości i więz linku, a kontraktu akcji nie ma wcale.

       ⚠ CO ZOSTAJE: interfejs, który nie deklaruje ANI właściwości, ANI więzu linku, ANI
       kontraktu akcji. Taki nie opisuje żadnego wspólnego kształtu — jest nazwą bez umowy.
       ⚠ CZEGO TA REGUŁA NIE ROBI: nie pyta, czy ktokolwiek interfejs KONSUMUJE — to jest `P08`.
       ══════════════════════════════════════════════════════════════════════════════════════ */
    {
      const skladniki = t(i.properties).length + t(i.linkConstraints).length + t(i.actionConstraints).length;
      regula(skladniki > 0, {
        id: 'P09', klasa: 'uwaga', kategoria: 'abstrakcja',
        co: `interfejs \`${nazwa}\` nie deklaruje ANI właściwości, ANI więzu linku, ANI kontraktu akcji`,
        gdzie: `interfaces[${nazwa}]`,
        dlaczego: 'Interfejs składa się z właściwości, więzów linków i kontraktów akcji. Deklarujący '
          + 'zero z trzech nie opisuje żadnego wspólnego kształtu — implementator nie ma czego '
          + 'spełnić, a konsument nie ma czego się po nim spodziewać. To jest nazwa bez umowy.',
        jak: 'Dopisz to, co naprawdę jest wspólne: właściwości, więz linku albo zdolność '
          + '(kontrakt akcji). ⚠ NIE MUSISZ dokładać wszystkich trzech — kontrakty akcji są '
          + 'u Foundry OPCJONALNE i kontrakt samego kształtu jest pełnoprawny.',
        zrodlo: 'Interfaces → overview („An interface is composed of interface properties, link type '
          + 'constraints, action type constraints, and metadata about the interface”, docs:19068) '
          + '+ Create an interface → „Create interface action type constraints (optional)” '
          + '(docs:19159, docs:19161, docs:19171)',
      });
    }
  }

  /* ════════════════════════════════════════════════════════════════════════════════════════
     P51 · SYGNATURA BIERZE TYP KONKRETNY, CHOĆ ISTNIEJE UMOWA Z KILKOMA IMPLEMENTATORAMI
     ────────────────────────────────────────────────────────────────────────────────────────
     `P08` mówi, że interfejsu NIKT nie używa. `P51` mówi GDZIE dało się go użyć — i to jest
     różnica między „macie martwą deklarację” a „oto lista miejsc do przeniesienia”.

     ⚠ TYLKO GDY IMPLEMENTATORÓW JEST CO NAJMNIEJ DWÓCH. Interfejs z jednym implementatorem
     niczego jeszcze nie uogólnia — reguła napisana na nim działa dokładnie tak samo jak
     napisana na typie, więc przenosiny byłyby ceremonią.
     ⚠ KLASA `uwaga`, I TO JEST UCZCIWOŚĆ WOBEC CZYTELNIKA: z kształtu NIE WIDAĆ, które pola
     funkcja naprawdę czyta. Sygnatura ma dostać typ interfejsowy tylko wtedy, gdy KAŻDE
     czytane pole stoi w umowie; funkcja sięgająca po szerokość wstęgi albo liczbę stacji
     zostaje na typie konkretnym — i to jest poprawna odpowiedź, a nie dług.
     ⚠ NIGDY nie jest odpowiedzią poszerzenie umowy, żeby funkcja się w niej zmieściła: tak
     powstaje interfejs będący listą cech jednej implementacji.
     ════════════════════════════════════════════════════════════════════════════════════════ */
  {
    const nazwyInterfejsow = new Set(interfejsy.map((i) => s(i.apiName)));
    for (const i of interfejsy) {
      const nazwa = s(i.apiName);
      const implementatorzy = new Set([
        ...t(i.implementedBy).map(s),
        ...obiekty.filter((ob) => t(ob.implements).map(s).includes(nazwa)).map((ob) => s(ob.apiName)),
      ].filter(Boolean));
      if (implementatorzy.size < 2) continue;

      const dotyka = (napis) => [...implementatorzy].some((x) => s(napis).includes(x));
      const miejsca = [
        ...funkcje.flatMap((f) => [
          ...t(f.inputs).filter((x) => dotyka(x?.typeRaw ?? x?.type)).map((x) => `${f.apiName}(${x.apiName ?? '…'})`),
          ...(dotyka(f.output?.typeRaw ?? f.output?.type) ? [`${f.apiName} → wynik`] : []),
        ]),
        ...akcje.flatMap((a) => t(a.parameters)
          .filter((p) => dotyka(p?.typeRaw ?? p?.type))
          .map((p) => `${a.apiName}(${p.apiName})`)),
      ];
      /* Miejsce, które JUŻ bierze interfejs, nie jest kandydatem. */
      const doPrzeniesienia = miejsca.filter((m) => ![...nazwyInterfejsow].some((n) => m.includes(n)));

      regula(doPrzeniesienia.length === 0, {
        id: 'P51', klasa: 'podpowiedz', kategoria: 'abstrakcja',
        co: `\`${nazwa}\` ma ${implementatorzy.size} implementatorów, a ${doPrzeniesienia.length} `
          + `${doPrzeniesienia.length === 1 ? 'sygnatura bierze' : 'sygnatur bierze'} typ konkretny`
          + `: ${doPrzeniesienia.slice(0, 4).join(', ')}${doPrzeniesienia.length > 4 ? '…' : ''}`,
        gdzie: `interfaces[${nazwa}]`,
        dlaczego: 'Reguła napisana na typie konkretnym działa dla JEDNEGO typu. Ta sama reguła '
          + 'napisana na umowie działa dla każdego, kto ją podpisze — także dla trzeciego, '
          + 'którego jeszcze nie ma. Przy typie konkretnym trzeci implementator znaczy przejście '
          + 'po wszystkich regułach i ryzyko, że o którejś się zapomni.',
        jak: 'Przenieś sygnaturę na umowę TAM, GDZIE KAŻDE czytane pole w niej stoi. Funkcja '
          + 'sięgająca po pola spoza umowy ZOSTAJE na typie konkretnym — dopisz przy niej powód. '
          + '⚠ Nie poszerzaj umowy, żeby funkcja się zmieściła: tak powstaje interfejs będący '
          + 'listą cech jednej implementacji.',
        zrodlo: 'Structural guidance → Interfaces („Target interfaces in workflows: When building '
          + 'actions, functions, and applications, target interfaces where possible. A workflow built '
          + 'on the `SchedulableResource` interface works for arenas, conference rooms, and vehicles '
          + 'without modification”); Best practices → „Scaffold now, consolidate later”',
      });
    }
  }

  /* ════════════════════════════════════════════════════════════════════════════════════════
     P47 · KONTRAKT WYMAGANY, ALE NIESPEŁNIONY PRZEZ IMPLEMENTATORA
     ────────────────────────────────────────────────────────────────────────────────────────
     Foundry stawia to wprost: implementacja interfejsu ZNACZY spełnienie jego wymaganych
     właściwości, linków I akcji. Typ, który deklaruje `implements`, a nie ma czym spełnić
     wymaganego kontraktu, jest stanem, którego platforma nie zbuduje — stąd `zlamanie`.

     ⚠ LICZY SIĘ WYŁĄCZNIE `required: true`. Brak deklaracji NIE jest deklaracją: kontrakt bez
     `required` bywa świadomie opcjonalny (tak radzi się trzymać kontrakty, dopóki implementator
     jest jeden), a karanie za nie zamieniłoby ostrożność w usterkę.
     ⚠ JEDNO ZNALEZISKO NA PARĘ (interfejs, implementator) — brakujące pola wymienione w treści.
     ════════════════════════════════════════════════════════════════════════════════════════ */
  {
    const poNazwie = new Map(obiekty.map((ob) => [ob.apiName, ob]));
    const nazwyAkcji = new Set(akcje.map((a) => s(a.apiName)));
    for (const i of interfejsy) {
      const nazwa = i.apiName;
      /* Implementatorzy: z deklaracji interfejsu ORAZ z typów, które same się do niego przyznają. */
      const implementatorzy = [...new Set([
        ...t(i.implementedBy).map(s),
        ...obiekty.filter((ob) => t(ob.implements).map(s).includes(nazwa)).map((ob) => ob.apiName),
      ])].filter(Boolean);

      for (const nazwaImpl of implementatorzy) {
        const impl = poNazwie.get(nazwaImpl);
        /* Typ spoza modelu — nie ma o czym orzekać, a zgadywanie byłoby fałszywym trafieniem. */
        if (!impl) continue;
        const szczegoly = t(impl.implementsDetails).find((d) => s(d.interface) === nazwa) ?? {};
        const mapaPol = szczegoly.mapping ?? {};
        const mapaLinkow = szczegoly.linkMapping ?? {};
        const mapaAkcji = szczegoly.actionMapping ?? {};
        const polaImpl = new Set(t(impl.properties).map((p) => s(p.apiName)));
        const linkiImpl = new Set(linki
          .filter((l) => l.from === nazwaImpl || l.to === nazwaImpl)
          .map((l) => s(l.apiName)));

        const braki = [];
        for (const p of t(i.properties)) {
          if (p.required !== true) continue;
          const u = s(mapaPol[s(p.apiName)]) || s(p.apiName);
          if (!polaImpl.has(u)) braki.push(`właściwość \`${p.apiName}\``);
        }
        for (const l of t(i.linkConstraints)) {
          if (l.required !== true) continue;
          const u = s(mapaLinkow[s(l.apiName)]) || s(l.apiName);
          if (!linkiImpl.has(u)) braki.push(`link \`${l.apiName}\``);
        }
        for (const a of t(i.actionConstraints)) {
          if (a.required !== true) continue;
          const wskazana = s(a.satisfiedBy?.[nazwaImpl]) || s(mapaAkcji[s(a.apiName)]);
          if (!wskazana || !nazwyAkcji.has(wskazana)) braki.push(`kontrakt akcji \`${a.apiName}\``);
        }

        regula(braki.length === 0, {
          id: 'P47', klasa: 'zlamanie', kategoria: 'abstrakcja',
          /* „1 wymaganych kontraktów” czyta się jak usterka narzędzia — a narzędzie orzeka
             tu o cudzej pracy, więc na własną niechlujność nie ma budżetu. */
          co: `\`${nazwaImpl}\` deklaruje \`${nazwa}\`, a nie spełnia `
            + (braki.length === 1 ? 'wymaganego kontraktu' : `${braki.length} wymaganych kontraktów`)
            + `: ${braki.slice(0, 6).join(', ')}`,
          gdzie: `objectTypes[${nazwaImpl}].implements[${nazwa}]`,
          dlaczego: 'Implementacja interfejsu w Foundry ZNACZY spełnienie jego wymaganych właściwości, '
            + 'linków i kontraktów akcji. Deklaracja bez pokrycia obiecuje coś, czego platforma nie '
            + 'zbuduje, a funkcja napisana na interfejs dostanie typ bez pola, którego kontrakt jej '
            + 'obiecał — i wywali się na danych, nie przy zapisie modelu.',
          /* ⚠ NAZWY PÓL SĄ KANONICZNE, nie z żadnego konkretnego manifestu. Stały tu kiedyś
             zapisy kebab-case z NASZEGO pliku — a to narzędzie orzeka o cudzym modelu i nie ma
             prawa go odsyłać do klucza, którego u siebie nie zobaczy. Asercja agnostyczności
             (`tests/silnik.test.mjs`) pilnuje tego odtąd mechanicznie. */
          jak: 'Dołóż brakujące pole albo wskaż odpowiednik implementatora w mapowaniu '
            + '(`mapping` / `linkMapping` / `satisfiedBy`). Jeśli implementator tego NIE MA i mieć '
            + 'nie będzie, kontrakt nie jest wymagany — zdejmij z niego `required`, zamiast udawać.',
          zrodlo: 'Interfaces → Implement an interface („object types must have properties that satisfy '
            + "the interface's required properties, links that satisfy all required link type "
            + 'constraints, and action types that satisfy all required action type constraints”); '
            + 'Interface action type constraints („any object type that implements the interface must '
            + 'map the constraint to a concrete action type that satisfies the… constraint”)',
        });
      }
    }
  }

  /* P10 · Typ-hybryda: nazwa sklejona z dwóch zdolności */
  for (const ob of obiekty) {
    const n = krotka(ob.apiName);
    const trafienia = (n.match(new RegExp(ZDOLNOSCI.source, 'gi')) || []).length;
    regula(!(trafienia >= 1 && wyrazy(n).length >= 2), {
      id: 'P10', klasa: 'podpowiedz', kategoria: 'abstrakcja',
      co: `\`${ob.apiName}\` wygląda na typ-kombinację (nazwa skleja zdolność z bytem)`,
      gdzie: `objectTypes[${ob.apiName}]`,
      dlaczego: 'Typy w rodzaju `SchedulableBuilding` powstają, gdy zdolność nie ma gdzie mieszkać '
        + 'i doklejamy ją do bytu. Każda nowa kombinacja zdolności wymaga wtedy nowego typu, '
        + 'a sam typ przestaje odpowiadać czemukolwiek z rzeczywistości.',
      jak: 'Zdolność wynieś do interfejsu, a typ nazwij tym, czym rzecz JEST. '
        + '`Arena implements Building + SchedulableResource`, nie `SchedulableBuilding`.',
      zrodlo: 'Best practices → Composition over deep hierarchies („»Combination« types like '
        + '`SchedulableBuilding` or `InspectableVehicle` that merge two unrelated concepts”)',
    });
  }

  /* P11 · Ta sama właściwość na wielu typach bez typu współdzielonego.
     ⚠ OD ZESTAWU 1.3 REGUŁA ZNA DWA KSZTAŁTY, W KTÓRYCH METADANE SĄ JUŻ ZCENTRALIZOWANE —
     i przestaje je zgłaszać. Do 1.2 nie znała ich wcale, więc na naszym kanonie orzekała
     nieprawdę w dwóch miejscach naraz:

       (1) KLUCZ GŁÓWNY. „Every object type requires at least one property. This is because
           object types need a primary key to uniquely identify them.” Klucz jest więc polem,
           które ma KAŻDY typ — zgłaszanie „`id` powtarza się na 37 typach” jest zgłaszaniem
           definicji platformy. Typ współdzielony nic by tu nie zcentralizował: edycje są trwale
           przypięte do WARTOŚCI klucza konkretnego typu, a `id` zamówienia i `id` zadania nie
           są tą samą wielkością ani przez chwilę.
       (2) WŁAŚCIWOŚĆ Z KONTRAKTU INTERFEJSU. „To implement an interface, an object type must
           contain the interface's shared properties **or** declare a mapping of existing object
           properties onto the interface shared properties.” Metadane takiego pola mieszkają
           w JEDNYM miejscu — na interfejsie — a implementatorzy się na nie mapują. To jest
           dokładnie ta centralizacja, o którą prosi reguła; żądać obok niej jeszcze typu
           współdzielonego znaczyłoby żądać dwóch centrali na jedno pole.

       (3) KLUCZ OBCY (od zestawu 2.0). Kolumna klucza obcego przechowuje WARTOŚĆ
           KLUCZA GŁÓWNEGO drugiego typu (`docs:3915`) i musi mieć jego typ (`docs:3923`) — jej
           metadane centralizuje więc klucz główny celu, a `machineId` na sześciu typach to sześć
           krawędzi do typu `Machine`, a nie sześć kopii jednej wielkości. Typ współdzielony byłby
           tu drugą centralą obok klucza głównego.

     ⚠ CO ZOSTAJE: pole powtórzone na trzech typach, które NIE jest kluczem i NIE wynika
     z żadnego kontraktu — czyli zbieżność, za którą nie stoi ani jedna deklaracja. */
  {
    /* Nazwy pól, które na TYM typie są kluczem głównym albo przychodzą z kontraktu interfejsu. */
    const zKontraktu = new Map();
    const dodajKontrakt = (typ, nazwa) => {
      if (!typ || !nazwa) return;
      if (!zKontraktu.has(typ)) zKontraktu.set(typ, new Set());
      zKontraktu.get(typ).add(dolne(nazwa));
    };
    const wgNazwyInterfejsu = new Map(interfejsy.map((i) => [s(i.apiName), i]));
    for (const ob of obiekty) {
      for (const klucz of [t(ob.primaryKey), s(ob.primaryKey)].flat().filter(Boolean)) {
        /* klucz bywa listą członów albo pojedynczym wskazaniem, czasem z kropką */
        dodajKontrakt(ob.apiName, s(klucz).split('.').pop());
      }
      for (const nazwaI of t(ob.implements)) {
        for (const p of t(wgNazwyInterfejsu.get(s(nazwaI))?.properties)) dodajKontrakt(ob.apiName, p.apiName);
      }
      for (const d of t(ob.implementsDetails)) {
        /* mapowanie: pole KONTRAKTU → pole IMPLEMENTATORA; centralne jest obie strony */
        for (const [kontrakt, wlasne] of Object.entries(d.mapping ?? {})) {
          dodajKontrakt(ob.apiName, kontrakt);
          dodajKontrakt(ob.apiName, typeof wlasne === 'string' ? wlasne : '');
        }
      }
    }
    /* (3) kolumny kluczy obcych krawędzi — patrz baner wyżej */
    for (const l of linki) {
      for (const kol of [s(l.foreignKeyProperty), s(l.foreignKeyTypeProperty)]) {
        if (kol && kol !== '?') dodajKontrakt(s(l.foreignKeyObjectType), kol);
      }
    }
    /* Interfejs potrafi wymienić implementatorów u siebie — wtedy obiekt o tym milczy. */
    for (const i of interfejsy) {
      for (const nazwaOb of t(i.implementedBy)) {
        for (const p of t(i.properties)) dodajKontrakt(s(nazwaOb), p.apiName);
      }
    }

    const poNazwie = new Map();
    for (const { ob, p } of wszystkieWlasciwosci) {
      const k = dolne(p.apiName);
      if (zKontraktu.get(ob.apiName)?.has(k)) continue;   // klucz albo kontrakt — patrz baner wyżej
      if (!poNazwie.has(k)) poNazwie.set(k, []);
      poNazwie.get(k).push({ ob, p });
    }
    for (const [k, lista] of poNazwie) {
      if (lista.length < PROG.regulaTrzech) continue;
      if (NAZWY_ZBYT_POSPOLITE.has(k)) continue;   // wspólny jest WYRAZ, a nie wielkość — patrz baner przy zbiorze
      const majaWspolny = lista.every((x) => s(x.p.sharedPropertyType) || s(x.p.valueType));
      regula(majaWspolny, {
        id: 'P11', klasa: 'podpowiedz', kategoria: 'abstrakcja',
        co: `\`${lista[0].p.apiName}\` powtarza się na ${lista.length} typach bez typu współdzielonego`,
        gdzie: `objectTypes[${lista.map((x) => x.ob.apiName).slice(0, 5).join(', ')}].${lista[0].p.apiName}`,
        prog: `≥ ${PROG.regulaTrzech} typy`,
        dlaczego: 'Ta sama właściwość zadeklarowana osobno w kilku miejscach rozjeżdża się w metadanych: '
          + 'inny opis, inne formatowanie, inna walidacja. Typ współdzielony trzyma to w jednym miejscu. '
          + '⚠ OD ZESTAWU 1.3 REGUŁA NIE ZGŁASZA KLUCZA GŁÓWNEGO ANI POLA Z KONTRAKTU INTERFEJSU: '
          + 'klucz ma KAŻDY typ obiektu z definicji platformy, a pole kontraktu jest już '
          + 'zcentralizowane NA INTERFEJSIE — implementator się na nie mapuje. Zbieżność nazw, '
          + 'za którą stoi deklaracja, nie jest zbieżnością.',
        jak: 'Załóż shared property type (albo value type, jeśli chodzi o ograniczenie wartości) '
          + 'i wskaż go z każdego z tych pól. Jeżeli wspólna jest SAMA NAZWA, a nie wielkość '
          + '(`level` ryzyka i `level` uprawnień), zostaw je osobno — i dopisz przy nich, czemu.',
        zrodlo: 'Core concepts → Shared property („Shared properties allow for consistent data modeling '
          + 'across object types and centralized management of property metadata”); wyjątki: '
          + 'Create an object type („Every object type requires at least one property. This is because '
          + 'object types need a primary key to uniquely identify them”) oraz Interfaces → implement '
          + '(„an object type must contain the interface\'s shared properties or declare a mapping of '
          + 'existing object properties onto the interface shared properties”)',
      });
    }
  }

  /* ────────────────────────────────────────────────────────────────────────────────────────
     NAZEWNICTWO — The Misnomer
     ──────────────────────────────────────────────────────────────────────────────────────── */

  for (const ob of obiekty) {
    /* P12 · ogólna nazwa typu */
    regula(!NAZWY_OGOLNE_TYPU.has(dolne(krotka(ob.apiName))), {
      id: 'P12', klasa: 'ryzyko', kategoria: 'nazewnictwo',
      co: `\`${ob.apiName}\` to nazwa ogólna`,
      gdzie: `objectTypes[${ob.apiName}]`,
      dlaczego: 'Nazwa, która może znaczyć wszystko, nie znaczy nic. Użytkownik musi zgadywać, '
        + 'a agent AI nie ma po czym nawigować. Nazwy są przy tym najtrudniejsze do poprawienia '
        + 'PÓŹNIEJ — w Foundry typ o statusie `active` nie może już zmienić nazwy API.',
      jak: 'Nazwij konkretnym rzeczownikiem, który rozpozna ekspert domenowy: `Product`, '
        + '`SalesOrderLineItem`, `WarehouseInventoryRecord` — nie `Item`.',
      zrodlo: 'Anti-patterns → The Misnomer („Object type: Item → Object type: Product”)',
    });

    /* ══════════════════════════════════════════════════════════════════════════════════════
       P79 · METADANE, BEZ KTÓRYCH TYPU NIE DA SIĘ ZAPISAĆ

       Foundry wylicza je zamkniętą listą: „To save a new object type, the following object type
       fields must not be empty: ID · Display name · Plural display name · Backing datasource,
       unless you are creating the object type without one · API name” plus, przy właściwościach,
       „Title key · Primary key” (`docs:2083–2098`). ⚠ NAZWA W LICZBIE MNOGIEJ NIE JEST OZDOBNIKIEM
       — aplikacje pokazują nią zbiór obiektów („The name shown to anyone accessing multiple
       objects of this type in user applications”, `docs:1906`), a jej brak widać dopiero na
       ekranie użytkownika, czyli najpóźniej, jak się da.
       ⚠ KLUCZ TYTUŁU I KLUCZ GŁÓWNY MAJĄ WŁASNE REGUŁY (`P13`, `P35`) — ta pyta o NAZWY.
       ══════════════════════════════════════════════════════════════════════════════════════ */
    {
      const braki = [
        ...(s(ob.displayName) ? [] : ['nazwa wyświetlana']),
        ...(s(ob.pluralDisplayName) ? [] : ['nazwa w liczbie mnogiej']),
      ];
      regula(braki.length === 0, {
        id: 'P79', klasa: 'zlamanie', kategoria: 'dokumentacja',
        co: `\`${ob.apiName}\` nie ma metadanych, bez których typu nie da się zapisać: ${braki.join(', ')}`,
        gdzie: `objectTypes[${ob.apiName}].displayName`,
        dlaczego: 'Nazwa API jest dla kodu, a nazwa wyświetlana — dla człowieka, i platforma żąda '
          + 'obu, zanim pozwoli typ zapisać. Model bez nich opisuje coś, czego nie da się pokazać: '
          + 'użytkownik zobaczy nazwę techniczną zamiast rzeczy, którą zna, a agent AI nie będzie '
          + 'miał czym o niej mówić w języku organizacji.',
        jak: 'Dopisz obie nazwy. ⚠ W modelu wieloklienckim nie stawia się ich przy typie — stoją '
          + 'w słowniku klienta, a narzędzie budujące kanon dostaje wskazanie, który słownik wziąć.',
        zrodlo: 'Object types → Troubleshooting → Mandatory object type fields („To save a new '
          + 'object type, the following object type fields must not be empty: ID · Display name · '
          + 'Plural display name · Backing datasource… · API name”, docs:2083–2089) + Create an '
          + 'object type („Plural name: The name shown to anyone accessing multiple objects of this '
          + 'type in user applications”, docs:1906)',
      });
    }

    /* P13 · brak `titleProperty` */
    regula(s(ob.titleProperty).length > 0, {
      id: 'P13', klasa: 'ryzyko', kategoria: 'nazewnictwo',
      co: `\`${ob.apiName}\` nie wskazuje właściwości tytułowej`,
      gdzie: `objectTypes[${ob.apiName}].titleProperty`,
      dlaczego: 'Bez tytułu każdy egzemplarz pokazuje się użytkownikowi jako klucz techniczny. '
        + 'To jest pierwsza rzecz, którą widać w każdej aplikacji Foundry.',
      jak: 'Wskaż właściwość, którą człowiek wymienia, mówiąc o tym obiekcie.',
      zrodlo: 'Create an object type → „Title key: The property that acts as a display name for '
        + 'objects of this type”',
    });
  }

  /* P14 · ogólne nazwy właściwości.
     ⚠ JEDNO ZNALEZISKO NA TYP, nie na pole. Reguła nazewnicza trafia z natury szeroko
     (`status` na zleceniu bywa w porządku, na `Item` — nie), więc zgłoszenie per pole
     zalałoby raport listą, której nikt nie przeczyta, i zjadłoby budżet kategorii jednym
     systemowym nawykiem. Agregat mówi to samo i daje się przejrzeć. */
  for (const ob of obiekty) {
    const ogolne = t(ob.properties).filter((p) => NAZWY_OGOLNE_POLA.has(dolne(p.apiName)));
    regula(ogolne.length === 0, {
      id: 'P14', klasa: 'uwaga', kategoria: 'nazewnictwo',
      co: `\`${ob.apiName}\`: ${ogolne.length} właściwości o nazwie niedookreślonej (${ogolne.slice(0, 5).map((p) => `\`${p.apiName}\``).join(', ')}${ogolne.length > 5 ? '…' : ''})`,
      gdzie: `objectTypes[${ob.apiName}].properties`,
      dlaczego: '`value`, `date`, `quantity` czy `code` nie mówią, CZEGO dotyczą. '
        + 'Dwa zespoły zrozumieją je inaczej i obie interpretacje będą wyglądały na poprawne. '
        + '⚠ OD ZESTAWU 1.3 REGUŁA NIE ZGŁASZA JUŻ `status` ANI `name` — tabela „Naming rules” '
        + 'stawia je (razem z `age` i `lastInspectionDate`) w kolumnie DOBRYCH przykładów '
        + 'właściwości, a osobny wiersz „Ambiguous terms” wymienia `value`, `quantity`, `score`. '
        + 'Akapit „Indicators” anty-wzorca Misnomer potępia `status` razem z nimi, ale to jest '
        + 'lista OBJAWÓW, a tabela jest REGUŁĄ. '
        + '⚠ Ta reguła bywa fałszywie dodatnia: nazwa ogólna w typie o WĄSKIM znaczeniu '
        + 'jest czytelna. Przejrzyj listę, zamiast poprawiać ją hurtem.',
      jak: 'Doprecyzuj tam, gdzie nazwa naprawdę jest dwuznaczna: `monetaryValue`, '
        + '`quantityOnHand`, `orderPlacedDate`, `riskScore`. Nazwa, która w TYM typie ma dokładnie '
        + 'jedno znaczenie, może zostać — ale sprawdź ją, zamiast zakładać.',
      zrodlo: 'Structural guidance → Naming conventions → Naming rules (wiersz „Ambiguous terms”: '
        + '„Qualify with specific meaning … `monetaryValue`, `quantityOnHand`, `riskScore` / '
        + '`value`, `quantity`, `score`”; wiersz „Properties”: dobre przykłady `age`, `status`, '
        + '`lastInspectionDate`)',
    });
  }

  /* ════════════════════════════════════════════════════════════════════════════════════════
     P15 · JEDNA KONWENCJA NAZW CZASU — DOSTROJONA W ZESTAWIE 1.4
     ────────────────────────────────────────────────────────────────────────────────────────
     ⚠ CO SIĘ ZMIENIŁO I DLACZEGO TO NIE JEST ZGINANIE MIARY. Do 1.3 reguła liczyła STYLE
     KOŃCÓWEK i zapalała, gdy było ich więcej niż jeden — czyli model używający `…At` dla CHWILI
     i `…Date` dla DNIA dostawał znalezisko za to, że ROZRÓŻNIA TYPY. Dokumentacja żąda czego
     innego: „Dates: Follow a single convention consistently across the Ontology”, a jej JEDYNY
     zły przykład to „Mixing `createdDate` and `dateOfCreation`” (`docs:20113`) — czyli dwie
     FORMY zapisu tego samego, a nie dwa słowa dla dwóch różnych typów. Konwencja rozróżniająca
     typ JEST jedną konwencją; konwencja, w której to samo słowo znaczy raz chwilę, a raz dzień,
     nie jest żadną.
     ⚠ REGUŁA PYTA WIĘC O DWIE RZECZY, OBIE MECHANICZNE I OBIE NA KANONIE:
       (1) FORMA — słowo czasu stoi zawsze w tym samym miejscu nazwy (sufiks `createdDate`,
           prefiks `dateOfCreation`, wąż `created_date`). Dwie formy naraz to dokładnie zły
           przykład z dokumentacji.
       (2) ZGODNOŚĆ SŁOWA Z TYPEM — to samo słowo nie może nieść dwóch różnych typów, a ten sam
           typ nie może występować pod słowami z dwóch różnych grup znaczeniowych.
     ⚠ GRUPY SŁÓW SĄ WŁASNOŚCIĄ JĘZYKA, A NIE NASZEGO MANIFESTU: `at` / `start` / `end` mówią
     o CHWILI, `date` / `day` o DNIU. Silnik nie zna ani jednej nazwy z naszego pliku — bierze
     ostatni człon nazwy i typ z kanonu.
     ⚠ POLA BEZ SŁOWA CZASU (`plannedCompletion`, `materialDelivery`) TA REGUŁA POMIJA i jest to
     świadome: „czy nazwa w ogóle mówi o czasie” to inne pytanie i ma inną regułę (`P14`).
     ════════════════════════════════════════════════════════════════════════════════════════ */
  {
    /* Ostatni człon nazwy — camelCase albo wąż; z `earliestStartDate` robi `date`, a nie `start`. */
    const ostatniCzlon = (n) => {
      const bezWeza = s(n).split('_').filter(Boolean);
      const ostatni = bezWeza[bezWeza.length - 1] ?? '';
      const czlony = ostatni.split(/(?=[A-Z])/).filter(Boolean);
      return dolne(czlony[czlony.length - 1] ?? ostatni);
    };
    const pierwszyCzlon = (n) => {
      const bezWeza = s(n).split('_').filter(Boolean);
      const pierwszy = bezWeza[0] ?? '';
      const czlony = pierwszy.split(/(?=[A-Z])/).filter(Boolean);
      return dolne(czlony[0] ?? pierwszy);
    };
    /* ⚠ SŁOWA, KTÓRE W ANGIELSKIM MÓWIĄ O CZASIE — i nic poza nimi. Lista jest własnością
       JĘZYKA, a nie konkretnego manifestu: `at` / `start` / `end` / `time` wskazują CHWILĘ,
       `date` / `day` — DZIEŃ. ⚠ `time` MUSI TU BYĆ, choć kusi, żeby je pominąć: bez niego
       `startTime` rozwiązywałoby się PIERWSZYM członem (`start`) i liczyło jako forma
       PREFIKSOWA, czyli jako zły przykład z dokumentacji — a `startTime` jest zwykłym
       rzeczownikiem złożonym, nie `timeOfStart`. */
    const GRUPA_SLOWA = new Map([
      ['at', 'chwila'], ['start', 'chwila'], ['end', 'chwila'], ['time', 'chwila'],
      ['date', 'dzien'], ['day', 'dzien'],
    ]);
    const TYPY_CZASU = ['date', 'timestamp'];
    const czasowe = wszystkieWlasciwosci.filter(({ p }) => TYPY_CZASU.includes(s(p.type)));

    const formy = new Set();
    const slowoTypy = new Map();   // słowo → zbiór typów kanonu
    const typGrupy = new Map();    // typ kanonu → zbiór grup znaczeniowych
    const przyklad = new Map();    // słowo → pierwsza napotkana nazwa
    for (const { ob, p } of czasowe) {
      const nazwa = s(p.apiName);
      const ost = ostatniCzlon(nazwa);
      const pier = pierwszyCzlon(nazwa);
      const slowo = GRUPA_SLOWA.has(ost) ? ost : (GRUPA_SLOWA.has(pier) ? pier : null);
      if (!slowo) continue;
      /* Nazwa BĘDĄCA samym słowem (`at`, `day`) nie mówi o formie — nie ma czego stawiać. */
      if (nazwa.length > slowo.length) formy.add(nazwa.includes('_') ? 'waz' : (slowo === ost ? 'sufiks' : 'prefiks'));
      if (!slowoTypy.has(slowo)) slowoTypy.set(slowo, new Set());
      slowoTypy.get(slowo).add(s(p.type));
      const grupa = GRUPA_SLOWA.get(slowo);
      if (!typGrupy.has(s(p.type))) typGrupy.set(s(p.type), new Set());
      typGrupy.get(s(p.type)).add(grupa);
      if (!przyklad.has(slowo)) przyklad.set(slowo, `${ob.apiName}.${nazwa}`);
    }

    const slowoDwaTypy = [...slowoTypy].filter(([, t]) => t.size > 1);
    const typDwieGrupy = [...typGrupy].filter(([, g]) => g.size > 1);
    const zle = [
      ...(formy.size > 1 ? [`dwie formy zapisu naraz: ${[...formy].join(', ')}`] : []),
      ...slowoDwaTypy.map(([w, t]) => `słowo \`…${w}\` niesie ${t.size} różne typy (${[...t].join(', ')}; np. \`${przyklad.get(w)}\`)`),
      ...typDwieGrupy.map(([t, g]) => `typ \`${t}\` występuje pod słowami z ${g.size} grup znaczeniowych (${[...g].join(', ')})`),
    ];
    regula(zle.length === 0, {
      id: 'P15', klasa: 'podpowiedz', kategoria: 'nazewnictwo',
      co: `konwencja nazw czasu nie jest jedna: ${zle.join('; ')}`,
      gdzie: 'objectTypes[*].properties',
      dlaczego: 'Mieszanie konwencji zmusza czytelnika do pamiętania, który typ używa której. '
        + 'Przy modelu, po którym ma nawigować agent, to jest realny koszt trafności. '
        + '⚠ Reguła NIE zabrania rozróżniania typu słowem (`…At` dla chwili, `…Date` dla dnia) — '
        + 'to JEST jedna konwencja. Zapala, gdy to samo słowo znaczy dwie różne rzeczy albo gdy '
        + 'jedna rzecz ma dwa słowa.',
      jak: 'Wybierz JEDNĄ formę (sufiks albo prefiks) i przypisz słowo do typu na stałe: '
        + 'chwila zawsze `…At`, dzień zawsze `…Date`. Nazwa, która nie mówi o czasie, nie wchodzi '
        + 'do tej reguły — o nią pyta `P14`.',
      zrodlo: 'Structural guidance → Naming conventions, wiersz „Dates”: „Follow a single '
        + 'convention consistently across the Ontology”, zły przykład „Mixing `createdDate` '
        + 'and `dateOfCreation`” (docs:20113)',
    });

    /* P16 · spójność stylu identyfikatorów */
    const wszystkieNazwy = [...wszystkieWlasciwosci.map(({ p }) => s(p.apiName)), ...obiekty.map((x) => krotka(x.apiName))];
    const camel = wszystkieNazwy.filter((n) => /^[a-z]+[A-Z]/.test(n)).length;
    const snake = wszystkieNazwy.filter((n) => /_/.test(n)).length;
    regula(!(camel > 0 && snake > 0), {
      id: 'P16', klasa: 'podpowiedz', kategoria: 'nazewnictwo',
      co: `w modelu stoją obok siebie dwa style nazw: camelCase (${camel}) i snake_case (${snake})`,
      gdzie: 'objectTypes[*]',
      dlaczego: 'Dwa style w jednym modelu znaczą, że część nazw przyszła z systemu źródłowego '
        + 'bez tłumaczenia — a to jest ten sam problem co nazwy w rodzaju `dtLastInspMod`.',
      jak: 'Ujednolić. Nazwa API ma być czytelna dla człowieka, nie wierna kolumnie w bazie.',
      zrodlo: 'Best practices → Domain-driven design („Names come from source system conventions '
        + '(`dtLastInspMod`) rather than business language (`lastInspectionDate`)”)',
    });
  }

  /* ────────────────────────────────────────────────────────────────────────────────────────
     NAZWY API — reguły, które platforma stawia WPROST (zestaw 1.5)

     ⚠ TO NIE JEST REDAKCJA, TYLKO WARUNEK ZAPISU. Powyższe reguły nazewnictwa mówią, czy nazwa
     coś ZNACZY (Misnomer); te mówią, czy nazwę da się w ogóle zapisać. Dokumentacja stawia je
     jako „must”, więc klasa jest `zlamanie`, a nie `uwaga`.

     ⚠ CO JEST OCENIANE: nazwa API, czyli `apiName` kanonu — nazwa LOKALNA. Klucz odwołań
     (`qualifiedName`) bywa dłuższy i z kropkami, i to jest w porządku: kropka jest sposobem,
     w jaki model zapisuje GRUPĘ, a grupa u Foundry'ego jest osobnym polem (`docs:1908`).
     ──────────────────────────────────────────────────────────────────────────────────────── */

  /** Nazwa API typu / kontraktu: wielka litera, wyłącznie alfanumeryczna, PascalCase, 1–100. */
  const NAZWA_TYPU_OK = /^[A-Z][A-Za-z0-9]{0,99}$/;
  /** Nazwa API właściwości / parametru / strony linku: mała litera, alfanumeryczna, 1–100. */
  const NAZWA_POLA_OK = /^[a-z][A-Za-z0-9]{0,99}$/;
  /**
   * ⚠ SŁOWA ZASTRZEŻONE SĄ CYTATEM CO DO ZNAKU, nie naszą listą: „Note that there are a number of
   * reserved keywords that cannot be used for API names. They are: `ontology`, `object`,
   * `property`, `link`, `relation`, `rid`, `primaryKey`, `typeId`, and `ontologyObject`”
   * (`docs:2132`); przy linkach ta sama reguła stoi osobno („Not be a reserved keyword”,
   * `docs:3968`). Porównanie jest DOKŁADNE, bez zmiany wielkości liter — `PrimaryKey` nie jest
   * tym samym napisem co `primaryKey`, a zgadywanie, czy platforma zgłosi też jego, byłoby
   * dokładaniem reguły, której w źródle nie ma.
   */
  const SLOWA_ZASTRZEZONE = new Set(['ontology', 'object', 'property', 'link', 'relation',
    'rid', 'primaryKey', 'typeId', 'ontologyObject']);

  {
    const zasoby = [
      ...obiekty.map((x) => ({ x, rodzaj: 'objectTypes' })),
      ...interfejsy.map((x) => ({ x, rodzaj: 'interfaces' })),
    ];
    for (const { x, rodzaj } of zasoby) {
      /* P58 · nazwa API typu albo kontraktu nie spełnia reguły zapisu */
      regula(NAZWA_TYPU_OK.test(s(x.nazwaApi)), {
        id: 'P58', klasa: 'zlamanie', kategoria: 'nazewnictwo',
        co: `nazwa API \`${s(x.nazwaApi) || '—'}\` nie jest PascalCase z samych znaków alfanumerycznych`,
        gdzie: `${rodzaj}[${x.apiName}].apiName`,
        dlaczego: 'Nazwy API są warunkiem ZAPISU zasobu, a nie kwestią stylu: platforma odrzuca '
          + 'nazwę, która zaczyna się małą literą, niesie znak inny niż alfanumeryczny albo jest '
          + 'dłuższa niż 100 znaków. Nazwa, której nie da się zapisać, blokuje cały zasób.',
        jak: 'Zapisz nazwę lokalną PascalCase\'em bez znaków specjalnych. Jeżeli nazwa niesie '
          + 'przedrostek grupy, przenieś grupę do osobnego pola — u Foundry robią to GRUPY typów.',
        zrodlo: 'Object types → Naming guidelines („An object type\'s API name must: Begin with an '
          + 'uppercase character and consist of only alphanumeric characters… Be written in '
          + 'PascalCase… Be between 1 and 100 characters long”, docs:2067–2070) + Object types → '
          + 'Create („Groups: …a mechanism for organizing your ontology”, docs:1908)',
      });
      /* P60 · słowo zastrzeżone jako nazwa typu albo kontraktu */
      regula(!SLOWA_ZASTRZEZONE.has(s(x.nazwaApi)), {
        id: 'P60', klasa: 'zlamanie', kategoria: 'nazewnictwo',
        co: `nazwa API \`${s(x.nazwaApi)}\` jest słowem zastrzeżonym platformy`,
        gdzie: `${rodzaj}[${x.apiName}].apiName`,
        dlaczego: 'Słowa zastrzeżone są zajęte przez samą platformę — nazwa z tej listy nie '
          + 'zapisze się i nie da się jej obejść cudzysłowem ani przedrostkiem.',
        jak: 'Przemianuj na nazwę mówiącą, CZEGO dotyczy (`propertyPath`, `linkSide`), '
          + 'i zostaw dawne brzmienie w archeologii wpisu.',
        zrodlo: 'Object types → Troubleshooting („there are a number of reserved keywords that '
          + 'cannot be used for API names. They are: `ontology`, `object`, `property`, `link`, '
          + '`relation`, `rid`, `primaryKey`, `typeId`, and `ontologyObject`”, docs:2132)',
      });
    }

    /* P59 · dwie nazwy API typów obiektów, które są tym samym napisem */
    const wgNazwy = new Map();
    for (const ob of obiekty) {
      const n = s(ob.nazwaApi);
      if (!n) continue;
      if (!wgNazwy.has(n)) wgNazwy.set(n, []);
      wgNazwy.get(n).push(ob);
    }
    for (const [n, lista] of [...wgNazwy].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      regula(lista.length < 2, {
        id: 'P59', klasa: 'zlamanie', kategoria: 'nazewnictwo',
        co: `nazwa API \`${n}\` należy do ${lista.length} typów obiektów: ${lista.map((x) => `\`${x.apiName}\``).join(', ')}`,
        gdzie: `objectTypes[${lista.map((x) => x.apiName).join(', ')}].apiName`,
        dlaczego: 'Nazwa API jest w całej ontologii JEDNA — po niej woła się typ w kodzie i w SDK. '
          + 'Dwie grupy mogą nazywać swoje rzeczy tak samo w prozie, ale nie mogą mieć dwóch '
          + 'zasobów o tej samej nazwie API: drugi się nie zapisze.',
        jak: 'Przemianuj jeden z nich na nazwę, która mówi, CZYM się różnią, zamiast liczyć na to, '
          + 'że odróżni je przedrostek grupy.',
        zrodlo: 'Object types → Naming guidelines („An object type\'s API name must: … Be unique '
          + 'across all object types”, docs:2069; to samo w checkliście ID, docs:2123)',
      });
    }

    /* P61 · nazwa API typu obiektu i nazwa API kontraktu to ten sam napis
       ⚠ KLASA `uwaga`, A NIE `zlamanie`, I TO JEST ŚWIADOME: dokumentacja mówi „unique across all
       object types” (docs:2069) i „unique across all properties belonging to the same object type”
       (docs:2076), a o nazwach API INTERFEJSÓW nie mówi ANI SŁOWA — ani że wchodzą do tej samej
       puli, ani że nie. Obie nazwy stoją obok siebie w tym samym SDK („Objects … can be interacted
       with using both their local API names … and the interface API names”, docs:19188), więc
       kolizja jest realnym ryzykiem pomyłki — ale regułą twardą nie jest, bo ŹRÓDŁO O NIEJ MILCZY.
       Gdyby dokumentacja to rozstrzygnęła, klasę podnosi się razem z cytatem. */
    const nazwyTypowLokalne = new Map(obiekty.map((ob) => [s(ob.nazwaApi), ob]).filter(([n]) => n));
    for (const i of interfejsy) {
      const zderzony = nazwyTypowLokalne.get(s(i.nazwaApi));
      regula(!zderzony, {
        id: 'P61', klasa: 'uwaga', kategoria: 'nazewnictwo',
        co: `kontrakt \`${i.apiName}\` i typ \`${zderzony?.apiName ?? ''}\` mają tę samą nazwę API \`${s(i.nazwaApi)}\``,
        gdzie: `interfaces[${i.apiName}].apiName`,
        dlaczego: '⚠ ŹRÓDŁO O TEJ KOLIZJI MILCZY — dokumentacja żąda unikalności nazw API wśród '
          + 'TYPÓW OBIEKTÓW i nie mówi, czy kontrakty wchodzą do tej samej puli. Dlatego to jest '
          + 'sygnał, a nie złamanie. Ryzyko jest jednak realne: obie nazwy stoją obok siebie '
          + 'w tym samym SDK, więc czytelnik kodu nie ma po czym poznać, którą ma przed sobą.',
        jak: 'Rozstrzygnij u dostawcy platformy, czy pula jest wspólna; do czasu odpowiedzi '
          + 'przemianuj jedną z nazw albo wypisz powód, dla którego kolizja zostaje.',
        zrodlo: 'Object types → Naming guidelines (docs:2069 — unikalność WŚRÓD TYPÓW OBIEKTÓW) '
          + 'oraz Interfaces → overview („Objects of the implementing object type can be interacted '
          + 'with using both their local API names … and the interface API names”, docs:19188). '
          + 'Reguły „nazwa kontraktu nie może zderzyć się z nazwą typu” w źródle NIE MA',
      });
    }

    /* P62 · nazwa API właściwości nie spełnia reguły zapisu albo powtarza się w typie */
    for (const ob of obiekty) {
      const widziane = new Set();
      const zle = [];
      const powtorki = [];
      for (const p of t(ob.properties)) {
        const n = s(p.apiName);
        if (!NAZWA_POLA_OK.test(n)) zle.push(n || '—');
        else if (SLOWA_ZASTRZEZONE.has(n)) zle.push(n);
        if (widziane.has(n)) powtorki.push(n);
        widziane.add(n);
      }
      regula(zle.length === 0 && powtorki.length === 0, {
        id: 'P62', klasa: 'zlamanie', kategoria: 'nazewnictwo',
        co: `\`${ob.apiName}\`: ${zle.length + powtorki.length} nazw właściwości nie da się zapisać `
          + `(${[...zle.map((n) => `\`${n}\``), ...powtorki.map((n) => `\`${n}\` dwa razy`)].slice(0, 5).join(', ')})`,
        gdzie: `objectTypes[${ob.apiName}].properties`,
        dlaczego: 'Nazwa właściwości musi zaczynać się małą literą, składać się wyłącznie ze znaków '
          + 'alfanumerycznych, mieścić się w 100 znakach, być unikalna w obrębie typu i nie być '
          + 'słowem zastrzeżonym. To są warunki ZAPISU, nie zalecenia.',
        jak: 'Przemianuj pole na camelCase mówiący, czego dotyczy (`property` → `propertyPath`), '
          + 'i zostaw dawne brzmienie w archeologii.',
        zrodlo: 'Object types → Naming guidelines („A property\'s API name must: Begin with '
          + 'a lowercase character and consist of only alphanumeric characters… Be written in '
          + 'camelCase… Be unique across all properties belonging to the same object type… Be '
          + 'between 1 and 100 characters long”, docs:2074–2077) + zastrzeżone słowa (docs:2132)',
      });
    }

    /* P63 · nazwa API pola STRUKTURY-WŁAŚCIWOŚCI jest słowem zastrzeżonym
       ⚠ POLE STRUKTURY TEŻ MA NAZWĘ API — funkcja edytująca strukturę dopasowuje swoje pola
       „with field names matching the API names of the Ontology struct property fields”
       (docs:12733), więc zakaz słów zastrzeżonych obejmuje je tak samo jak właściwości. */
    for (const typ of [...wspolne, ...t(o.functionTypes)]) {
      const zle = t(typ.fields).map((f) => s(f.apiName)).filter((n) => SLOWA_ZASTRZEZONE.has(n));
      regula(!typ.isStruct || zle.length === 0, {
        id: 'P63', klasa: 'zlamanie', kategoria: 'nazewnictwo',
        co: `struktura \`${s(typ.apiName)}\` ma pole o nazwie zastrzeżonej: ${zle.map((n) => `\`${n}\``).join(', ')}`,
        gdzie: `sharedPropertyTypes[${s(typ.apiName)}].fields`,
        dlaczego: 'Pole struktury ma własną nazwę API — po niej dopasowuje się je w kodzie funkcji '
          + 'edytującej. Słowo zastrzeżone nie przejdzie tu z tego samego powodu, co przy właściwości.',
        jak: 'Przemianuj pole i popraw wszystkie miejsca, które adresują je po nazwie.',
        zrodlo: 'Object types → Troubleshooting (lista słów zastrzeżonych, docs:2132) + Functions → '
          + 'struct edits („with field names matching the API names of the Ontology struct property '
          + 'fields”, docs:12733)',
      });
    }
  }

  /* P65 · dwie krawędzie widziane z JEDNEGO typu obiektu pod tą samą nazwą
     ⚠ NAZWA STRONY JEST WOŁANA Z DRUGIEJ STRONY — „if the API name on the `Aircraft` side of the
     link type is `assignedAircraft`, then calling `Flight.assignedAircraft.get()` will return the
     `Aircraft` objects” (docs:3962). Nazwą, po której typ `O` przechodzi krawędź, jest więc nazwa
     strony PRZECIWNEJ: `apiName` przy krawędzi wychodzącej z `O`, `reverseName` przy wchodzącej. */
  {
    const przejscia = new Map();
    const dodaj = (typ, nazwa, l) => {
      const n = s(nazwa);
      if (!s(typ) || !n) return;
      /* ⚠ PARA W KLUCZU BEZ SEPARATORA-ZNAKU: bajt specjalny w źródle robi z pliku BINARNY
         dla gita i dla `grep` — to jest dokładnie znalezisko poboczne K4 i K5b. */
      const k = JSON.stringify([s(typ), n]);
      if (!przejscia.has(k)) przejscia.set(k, { typ: s(typ), nazwa: n, linki: [] });
      przejscia.get(k).linki.push(l);
    };
    for (const l of linki) { dodaj(l.from, l.apiName, l); dodaj(l.to, l.reverseName, l); }
    for (const { typ, nazwa, linki: lista } of [...przejscia.values()]
      .sort((a, b) => (`${a.typ}.${a.nazwa}` < `${b.typ}.${b.nazwa}` ? -1 : 1))) {
      regula(lista.length < 2, {
        id: 'P65', klasa: 'zlamanie', kategoria: 'nazewnictwo',
        co: `z typu \`${typ}\` wychodzą ${lista.length} przejścia o tej samej nazwie \`${nazwa}\``
          + ` (${lista.map((l) => `\`${l.apiName}\``).join(', ')})`,
        gdzie: `linkTypes[${lista.map((l) => l.apiName).join(', ')}]`,
        dlaczego: 'Nazwa API strony linku musi być unikalna wśród linków JEDNEGO typu obiektu — '
          + 'po niej woła się przejście w kodzie. Dwie krawędzie o jednej nazwie znaczą, że jedno '
          + 'z przejść jest z tego typu nieosiągalne.',
        jak: 'Przemianuj jedną ze stron tak, żeby mówiła, KTÓRE przejście opisuje.',
        zrodlo: 'Link types → Define link type names („Link type API names must adhere to the '
          + 'following: … Be unique across all link types associated with the same object type”, '
          + 'docs:3965; wołanie po nazwie strony przeciwnej — docs:3962)',
      });
    }
  }

  /* P64 · nazwa API strony linku nie spełnia reguły zapisu
     ⚠ OBIE STRONY, bo u Foundry nazwę API ma KAŻDA strona linku osobno („The API name on a side
     of a link type can be used to return objects of that type", docs:3962/4163).
     ⚠⚠ KRAWĘDŹ WYGENEROWANA PRZEZ ROZBICIE WIĄZKI NIE JEST TU PYTANA O SWOJĄ NAZWĘ, tylko
     o nazwę WIĄZKI — bo nazwę konkretnej krawędzi tworzy kanon i z definicji tworzy ją poprawną.
     Pytanie brzmi „czy nazwa Z PLIKU DLA LUDZI da się zapisać”, a nie „czy nasz generator umie
     skleić napis”; bez tego rozróżnienia rozbicie mnożyłoby JEDNO znalezisko przez liczbę
     implementatorów i zarazem zamiatało je pod nazwę, której nikt nie napisał. */
  {
    const doSprawdzenia = [
      ...linki.filter((l) => !s(l.generatedFrom)),
      ...t(o.linkBundles),
    ];
    for (const l of doSprawdzenia) {
      const strony = [
        { n: s(l.apiName), gdzie: 'apiName' },
        ...(s(l.reverseName) ? [{ n: s(l.reverseName), gdzie: 'reverseName' }] : []),
      ];
      const zle = strony.filter(({ n }) => !NAZWA_POLA_OK.test(n) || SLOWA_ZASTRZEZONE.has(n));
      regula(zle.length === 0, {
        id: 'P64', klasa: 'zlamanie', kategoria: 'nazewnictwo',
        co: `link \`${l.apiName}\`: ${zle.length} strona(-y) o nazwie, której nie da się zapisać `
          + `(${zle.map(({ n, gdzie }) => `\`${n}\` (${gdzie})`).join(', ')})`,
        gdzie: `linkTypes[${l.apiName}].apiName`,
        dlaczego: 'Nazwa API strony linku musi zaczynać się małą literą i składać się WYŁĄCZNIE ze '
          + 'znaków alfanumerycznych — myślnik i podkreślenie odpadają. Nazwa z myślnikiem nie jest '
          + 'stylem do przedyskutowania, tylko napisem, którego platforma nie przyjmie.',
        jak: 'Zapisz obie strony camelCase\'em (`parentOrder` → `parentOrder`) i przenieś dawne '
          + 'brzmienie do archeologii krawędzi.',
        zrodlo: 'Link types → Define link type names („Link type API names must adhere to the '
          + 'following: Begin with a lowercase character and consist of only alphanumeric '
          + 'characters… Be between 1 and 100 characters long… Not be a reserved keyword”, '
          + 'docs:3964–3968)',
      });
    }
  }

  /* ════════════════════════════════════════════════════════════════════════════════════════
     P75 · KRAWĘDŹ, KTÓREJ CELEM JEST KONTRAKT — u Foundry taki byt konkretny NIE ISTNIEJE

     Są DWIE różne rzeczy: WIĘZ linku interfejsu („An interface link type constraint defines an
     object-to-object relationship common across all object types implementing an interface…
     concrete link types on the object type are used to fulfill interface link type constraints”,
     `docs:19372`) oraz KONKRETNY link po stronie implementatora („you must select a link type on
     the object type that satisfies each required link type constraint”, `docs:19222`). Link
     zadeklarowany wprost do interfejsu nie jest ani jednym, ani drugim.
     ⚠ MILCZY O KRAWĘDZI WYGENEROWANEJ PRZEZ ROZBICIE — tam cel jest już implementatorem.
     ════════════════════════════════════════════════════════════════════════════════════════ */
  {
    const nazwyKontraktow = new Set(interfejsy.map((i) => s(i.apiName)));
    for (const l of linki) {
      if (s(l.generatedFrom)) continue;
      const doKontraktu = [s(l.from), s(l.to)].filter((x) => nazwyKontraktow.has(x));
      regula(doKontraktu.length === 0, {
        id: 'P75', klasa: 'zlamanie', kategoria: 'relacje',
        co: `krawędź \`${l.apiName}\` celuje w KONTRAKT \`${doKontraktu.join(', ')}\`, a nie w typ obiektu`,
        gdzie: `linkTypes[${l.apiName}]`,
        dlaczego: 'Link, którego końcem jest interfejs, nie jest bytem, który da się założyć: '
          + 'platforma zna WIĘZ linku interfejsu (deklarację „każdy implementator ma mieć taką '
          + 'krawędź”) i KONKRETNE linki, które ten więz spełniają. Model deklarujący jedno '
          + 'zamiast dwóch nie mówi, ile krawędzi trzeba naprawdę wyklikać ani w której kolumnie '
          + 'siedzi klucz obcy dla którego implementatora.',
        jak: 'Rozbij na WIĘZ przy interfejsie plus po jednej konkretnej krawędzi na implementatora '
          + 'celu, każda z własnym kluczem obcym po stronie „wiele”. ⚠ Dołóż regułę „dokładnie '
          + 'jeden z tych kluczy jest niepusty” — łuku wyłącznego platforma nie pilnuje.',
        zrodlo: 'Interface link types („An interface link type constraint defines an object-to-'
          + 'object relationship common across all object types implementing an interface… '
          + 'concrete link types on the object type are used to fulfill interface link type '
          + 'constraints”, docs:19372; parametry więzu — docs:19380–19385) + Interfaces → implement '
          + '(„you must select a link type on the object type that satisfies each required link '
          + 'type constraint”, docs:19222)',
      });
    }
  }

  /* P76 · gest, który zakłada albo zdejmuje krawędź WIĄZKI, a nie jest oparty o funkcję */
  {
    const wgNazwy = new Map(t(o.linkBundles).filter((b) => b?.apiName).map((b) => [s(b.apiName), b]));
    for (const a of akcje) {
      const funkcyjna = t(a.rules).some((r) => s(r.op) === 'runFunction');
      /* ⚠ DWIE DROGI DO TEGO SAMEGO MIEJSCA I OBIE TRZEBA ZOBACZYĆ. Krawędź `N:M` przestawia się
         regułą `Create link` / `Delete link` (`docs:4917`), a krawędź z końcem „jeden” — regułą
         `Modify object` na KLUCZU OBCYM (`docs:4919`). Przy wiązce obie są tak samo nierozstrzygnięte:
         pierwsza nie wie, KTÓRĄ z N krawędzi założyć, druga — KTÓRĄ z N kolumn ustawić. Reguła
         patrząca wyłącznie na `createLink` przepuściłaby dziś WSZYSTKIE nasze przypadki, bo kanon
         zamienia je na `modify` (K4). */
      const nawiazkach = edycjeAkcji(a)
        .map((r) => (['createLink', 'deleteLink', 'link', 'unlink'].includes(s(r.op))
          ? wgNazwy.get(s(r.target))
          : (s(r.op) === 'modify' ? wgNazwy.get(s(r.targetField?.foreignKeyOf)) : undefined)))
        .filter((b) => b && t(b.concrete).length > 1);
      regula(funkcyjna || nawiazkach.length === 0, {
        id: 'P76', klasa: 'ryzyko', kategoria: 'akcje',
        co: `\`${a.apiName}\` stawia albo zdejmuje krawędź wiązki `
          + `${[...new Set(nawiazkach.map((b) => `\`${b.apiName}\` (${t(b.concrete).length} implementacji)`))].join(', ')}`
          + ' regułą deklaratywną',
        gdzie: `actionTypes[${a.apiName}].rules`,
        dlaczego: 'Reguła „Create interface link” PADA, gdy typ obiektu ma więcej niż jedną '
          + 'konkretną implementację tej krawędzi, a „Delete interface link” próbuje wtedy '
          + 'skasować WSZYSTKIE. Zgłoszenie nie mówi, KTÓRA z N krawędzi ma powstać — bo z samego '
          + 'kontraktu tego nie widać. To samo pytanie wraca przy krawędzi z końcem „jeden”, '
          + 'którą przestawia się `Modify object` na kluczu obcym: kluczy jest wtedy N, po jednym '
          + 'na implementatora, i deklaratywna reguła nie ma po czym wybrać tego właściwego.',
        jak: 'Albo oprzyj akcję o funkcję (jedna reguła `Run function`, kod wybiera implementatora '
          + 'po typie przekazanej referencji), albo daj akcji reguły PER TYP KONKRETNY i wybieraj '
          + 'między nimi kryterium zgłoszenia.',
        zrodlo: 'Actions on interfaces → „Create link” („If there are multiple concrete link '
          + 'implementations on the object type for the link constraint, the action will fail”, '
          + 'docs:5742) + „Delete link” („the action will attempt to delete all the concrete link '
          + 'implementations”, docs:5755) + Actions → Rules („For a one-to-one or one-to-many link '
          + 'type, the relationship is stored in a foreign key property on the object. Use a Modify '
          + 'object rule to set or clear that property instead of a link rule”, docs:4919)',
      });
    }
  }

  /* P17 · nazwa linku, która nie opisuje relacji */
  for (const l of linki) {
    regula(!NAZWY_OGOLNE_LINKU.has(dolne(l.apiName)), {
      id: 'P17', klasa: 'podpowiedz', kategoria: 'nazewnictwo',
      co: `link \`${l.apiName}\` nie mówi, CO go łączy`,
      gdzie: `linkTypes[${l.apiName}]`,
      dlaczego: 'Link `related` albo `items` nie odpowiada na żadne pytanie domenowe. '
        + 'Nawigacja po modelu robi się wtedy zgadywaniem.',
      jak: 'Nazwij relację z perspektywy każdej ze stron: `department` / `employees`, '
        + '`supervisor` / `reports`.',
      zrodlo: 'Anti-patterns → The Misnomer („Link types use generic labels like »related to« '
        + 'without specifying the nature of the relationship”)',
    });
    /* P80 · strona linku bez nazwy wyświetlanej
       ⚠ NAZWĘ MA KAŻDA STRONA OSOBNO: „Display name: The name shown to anyone accessing a link of
       this type in user applications. Each side of a link type has a display name. A side of
       a link type represents the link _to_ that object type” (`docs:4161`), a po stronie „wiele”
       dochodzi liczba mnoga (`docs:4162` — i tam wprost: po stronie „jeden” liczby mnogiej NIE MA,
       „as there can only be one company per employee”). Dlatego reguła pyta o DWIE nazwy, a nie
       o cztery: liczba idzie za krotnością, a nie za osobnym polem. */
    {
      const braki = [
        ...(s(l.displayName) ? [] : ['strona do `to`']),
        ...(s(l.reverseDisplayName) ? [] : ['strona do `from`']),
      ];
      regula(braki.length === 0, {
        id: 'P80', klasa: 'zlamanie', kategoria: 'dokumentacja',
        co: `link \`${l.apiName}\` nie ma nazwy wyświetlanej: ${braki.join(', ')}`,
        gdzie: `linkTypes[${l.apiName}].displayName`,
        dlaczego: 'Nazwa API strony linku jest dla kodu; użytkownik widzi NAZWĘ WYŚWIETLANĄ i bez '
          + 'niej nawigacja po modelu pokazuje mu napis techniczny. Brak nazwy po jednej ze stron '
          + 'jest przy tym gorszy niż po obu: jedna strona relacji nazwana, druga nie, wygląda '
          + 'jak relacja jednokierunkowa — a nie jest.',
        jak: 'Nazwij obie strony z perspektywy typu, DO którego prowadzą, i dobierz liczbę do '
          + 'krotności: strona, po której stoi wiele obiektów, ma nazwę w liczbie mnogiej.',
        zrodlo: 'Link types → Metadata („Display name: The name shown to anyone accessing a link of '
          + 'this type in user applications. Each side of a link type has a display name”, '
          + 'docs:4161; liczba mnoga po stronie „wiele” — docs:4162)',
      });
    }

    /* P18 · brak nazwy powrotnej */
    regula(s(l.reverseName).length > 0, {
      id: 'P18', klasa: 'ryzyko', kategoria: 'relacje',
      co: `link \`${l.apiName}\` nazywa tylko jedną stronę`,
      gdzie: `linkTypes[${l.apiName}].reverseName`,
      dlaczego: 'Relację czyta się z obu kierunków i oba kierunki potrzebują nazwy. '
        + 'Bez nazwy powrotnej druga strona relacji jest w modelu niewidoczna.',
      jak: 'Dopisz nazwę powrotną, czytaną od strony celu.',
      zrodlo: 'Structural guidance → Links („Name links for clarity: link names should describe '
        + 'the relationship from each direction”)',
    });
  }

  /* ────────────────────────────────────────────────────────────────────────────────────────
     AKCJE — Action Sprawl, Golden Hammer
     ──────────────────────────────────────────────────────────────────────────────────────── */

  {
    /* P19 · Action Sprawl po liczbie akcji na typ */
    const naTyp = new Map();
    for (const a of akcje) {
      const cele = new Set(edycjeAkcji(a).map((r) => typZCelu(r.target)).filter(Boolean));
      for (const c of cele) naTyp.set(c, (naTyp.get(c) ?? 0) + 1);
    }
    for (const [typ, ile] of naTyp) {
      regula(ile <= PROG.akcjeNaTyp, {
        id: 'P19', klasa: 'ryzyko', kategoria: 'akcje',
        co: `${ile} akcji dotyka \`${typ}\``,
        gdzie: `actionTypes[* → ${typ}]`,
        prog: `> ${PROG.akcjeNaTyp} (wprost z dokumentacji)`,
        dlaczego: 'Długa lista akcji na jednym typie znaczy zwykle, że akcje odwzorowują KOLUMNY, '
          + 'a nie operacje biznesowe. Użytkownik przestaje trafiać w tę właściwą, a historia zmian '
          + 'rozpada się na drobiazgi, z których nie da się odtworzyć, co się stało.',
        jak: 'Połącz te, które zawsze idą razem, w jedną operację. Jeśli każda jest osobnym, '
          + 'świadomym gestem — zapisz to uzasadnienie, żeby nie wyglądało na przeoczenie.',
        zrodlo: 'Anti-patterns → Action Sprawl („More than 10 action types for a single object type”)',
      });
    }
  }

  for (const a of akcje) {
    const nazwa = krotka(a.apiName);
    const edycje = edycjeAkcji(a);
    const polaEdytowane = edycje.filter((r) => s(r.target).includes('.') && r.op === 'modify');

    /* ══════════════════════════════════════════════════════════════════════════════════════
       P20 · AKCJA JEDNOPOLOWA — DOSTROJONA W ZESTAWIE 1.4
       ──────────────────────────────────────────────────────────────────────────────────────
       ⚠ CO SIĘ ZMIENIŁO. Do 1.3 reguła zapalała na KAŻDEJ akcji `set…`/`update…` z jedną
       edycją — także wtedy, gdy edytowaną właściwością była STRUKTURA. Dokumentacja nazywa
       anty-wzorzec inaczej: „Creating many single-property actions INSTEAD OF cohesive business
       operations” (`docs:20222`), a w rozwinięciu: „many narrowly-scoped action types that each
       modify a single property, rather than designing cohesive actions that represent meaningful
       business operations” (`docs:20553`). Rozwiązaniem jest „Create actions that bundle related
       changes into meaningful workflows” (`docs:20592`), a kolumna „✓ Prefer” pokazuje JEDNĄ
       akcję zmieniającą CZTERY pola naraz.
       ⚠ AKCJA PODMIENIAJĄCA JEDNĄ STRUKTURĘ ROBI DOKŁADNIE TO, O CO PROSI KOLUMNA „Prefer”:
       zmienia GRUPĘ POWIĄZANYCH PÓL w jednym zgłoszeniu, z jednym wpisem w dzienniku i jednym
       cofnięciem. Liczba edycji jest wtedy jeden, ale liczba zmienianych FAKTÓW — tyle, ile pól
       struktury. Zgłaszanie tego jako „zapisu do jednej właściwości” karałoby model za to, że
       ZGRUPOWAŁ pola zamiast je spłaszczyć — czyli za wykonanie sąsiedniej reguły (`P27`,
       „use a struct rather than flattening”, `docs:19928`).
       ⚠ CO REGUŁA DALEJ ŁAPIE: akcję zmieniającą jedno pole SKALARNE (`setOrderNote`,
       `setSpeedOverride`). Tam nie ma czego grupować i pytanie „czy to naprawdę osobny gest”
       jest na miejscu.
       ⚠ TYP BIERZEMY Z KANONU, NIE Z NAZWY: reguła szuka właściwości po `objectTypes`, więc
       działa na dowolnym modelu i nie zna ani jednej nazwy z naszego pliku.
       ══════════════════════════════════════════════════════════════════════════════════════ */
    const nazwaUstawiajaca = /^(set|update|change|edit|ustaw|zmien)[A-Z_]/.test(nazwa);
    const typPolaEdycji = (r) => {
      const cel = r?.targetField?.kind === 'objectProperty' ? r.targetField : null;
      const czesci = s(r?.target).split('.');
      const pole = cel?.property ?? czesci.pop();
      const typObiektu = cel?.objectType ?? czesci.join('.');
      const ob = obiekty.find((x) => x.apiName === typObiektu);
      return s(t(ob?.properties).find((p) => s(p.apiName) === s(pole))?.type);
    };
    const jednaStruktura = polaEdytowane.length === 1 && typPolaEdycji(polaEdytowane[0]) === 'struct';
    /* ⚠ DRUGI WARUNEK DOSTROJENIA (zestaw 1.5): ROZDROBNIENIE WYMAGA MNOGOŚCI.
       Anty-wzorzec brzmi „Creating MANY single-property actions INSTEAD OF cohesive business
       operations" (`docs:20222`) i „many narrowly-scoped action types that EACH modify a single
       property" (`docs:20553`), a wskaźnikiem jest „More than 10 action types for a single object
       type" (`docs:20565`). JEDNA taka akcja na typie nie jest „many" — i, co ważniejsze, NIE MA
       SIĘ Z CZYM ZEPNĄĆ: rozwiązanie z dokumentacji („bundle related changes into meaningful
       workflows", `docs:20592`) wymaga DRUGIEJ edycji, którą dałoby się dołożyć do tej samej
       operacji. Wiersz o jednej edytowalnej liczbie jest CAŁĄ operacją biznesową, a nie jej
       kawałkiem. ⚠ REGUŁA LICZY AKCJE NA TYPIE i nie zna ani jednej nazwy z naszego pliku;
       „INNA właściwość" jest tu istotna, bo dwie akcje na TYM SAMYM polu to nie rozdrobnienie,
       tylko dwa gesty o jednej wartości. ⚠ SKALI NIE GUBIMY: przypadek „dużo akcji na jednym
       typie" dalej łapie `P19`, która liczy je wprost i ma próg z dokumentacji. */
    const celEdycji = (r) => {
      const cel = r?.targetField?.kind === 'objectProperty' ? r.targetField : null;
      const czesci = s(r?.target).split('.');
      const pole = cel?.property ?? czesci.pop();
      return { typ: cel?.objectType ?? czesci.join('.'), pole: s(pole) };
    };
    const jednopolowa = (x) => {
      const e = t(x.rules);
      const pola = e.filter((r) => s(r.target).includes('.') && r.op === 'modify');
      return pola.length === 1 && e.length === 1 ? celEdycji(pola[0]) : null;
    };
    const moj = polaEdytowane.length === 1 ? celEdycji(polaEdytowane[0]) : null;
    const rodzenstwo = !moj ? false : akcje.some((x) => {
      if (x === a) return false;
      const c = jednopolowa(x);
      return !!c && c.typ === moj.typ && c.pole !== moj.pole;
    });
    regula(!(nazwaUstawiajaca && polaEdytowane.length === 1 && edycje.length === 1
      && !jednaStruktura && rodzenstwo), {
      id: 'P20', klasa: 'uwaga', kategoria: 'akcje',
      co: `\`${a.apiName}\` to zapis do jednej właściwości SKALARNEJ (\`${polaEdytowane[0]?.target ?? ''}\`)`,
      gdzie: `actionTypes[${a.apiName}]`,
      dlaczego: 'Akcja nazwana `set[Właściwość]`, która zmienia dokładnie tę jedną właściwość '
        + 'skalarną, jest operacją na bazie przebraną za operację biznesową — ale TYLKO wtedy, gdy '
        + 'na tym samym typie stoi DRUGA taka akcja, na INNEJ właściwości. Dopiero wtedy jest co '
        + 'z czym zepnąć i dopiero wtedy jest to „many single-property actions”. '
        + '⚠ Reguła NIE zapala w dwóch przypadkach: (1) edytowaną właściwością jest STRUKTURA — '
        + 'akcja zmienia wtedy grupę powiązanych pól w jednym zgłoszeniu, czyli robi to, o co prosi '
        + 'kolumna „Prefer”; (2) jest JEDYNĄ taką akcją na swoim typie — wiersz o jednej edytowalnej '
        + 'wartości jest CAŁĄ operacją biznesową, a nie jej kawałkiem. '
        + '⚠ Skali to nie gubi: „dużo akcji na jednym typie” liczy wprost `P19`.',
      jak: 'Zepnij powiązane zapisy w jedną operację opisującą, co się naprawdę wydarzyło '
        + '(`updateContactInformation` zamiast czterech `set…`) — albo zgrupuj pola w strukturę '
        + 'i podmieniaj ją w całości. Jeśli gest jest naprawdę osobny, napisz dlaczego.',
      zrodlo: 'Anti-patterns → Action Sprawl („Creating MANY single-property actions instead of '
        + 'cohesive business operations”, docs:20222; „many narrowly-scoped action types that EACH '
        + 'modify a single property, rather than designing cohesive actions…”, docs:20553; '
        + 'Indicators: „More than 10 action types for a single object type”, docs:20565; '
        + 'Solution: „Create actions that bundle related changes into meaningful workflows”, docs:20592)',
    });

    /* ══════════════════════════════════════════════════════════════════════════════════════
       P73 · REGUŁA FUNKCYJNA NIE ŁĄCZY SIĘ Z INNYMI — i to jest zdanie „must” postawione dwa razy
       ⚠ Do zestawu 1.5 ŻADNA reguła nie pytała o `rules[].op`, więc akcja oparta o funkcję mogła
       jechać przez kanon jako sześć albo sto reguł deklaratywnych i nic tego nie widziało.
       ══════════════════════════════════════════════════════════════════════════════════════ */
    {
      const funkcyjne = t(a.rules).filter((r) => s(r.op) === 'runFunction');
      regula(funkcyjne.length === 0 || t(a.rules).length === 1, {
        id: 'P73', klasa: 'zlamanie', kategoria: 'akcje',
        co: `\`${a.apiName}\` łączy regułę \`runFunction\` z ${t(a.rules).length - funkcyjne.length} innymi regułami`
          + (funkcyjne.length > 1 ? ` (i ma ich ${funkcyjne.length})` : ''),
        gdzie: `actionTypes[${a.apiName}].rules`,
        dlaczego: 'Reguła „Run function” jest w Foundry WYJĄTKIEM: nie łączy się z żadną inną, '
          + 'bo kod funkcji potrafi wyrazić wszystko, co potrafią reguły deklaratywne. Akcja '
          + 'z regułą funkcyjną ORAZ z regułami edycji opisuje kształt, którego Ontology Manager '
          + 'nie pozwoli zbudować — i nie dowiesz się tego przed próbą zapisu.',
        jak: 'Zostaw JEDNĄ regułę `Run function` i przenieś resztę edycji do kodu funkcji. '
          + 'Deklaracja, CO akcja zmienia, zostaje osobno — jako opis, a nie jako druga reguła.',
        zrodlo: 'Actions → Rules („A single action type can combine several rules. The function '
          + 'rule is the exception: it cannot be combined with the other Ontology rules”, '
          + 'docs:4878) + „Add a single Run function rule… A Run function rule cannot be combined '
          + 'with the other Ontology rules, because function code alone can express everything '
          + 'they can” (docs:4927)',
      });

      /* P74 · wejścia funkcji akcji MUSZĄ być parametrami tej akcji */
      if (funkcyjne.length === 1) {
        const f = funkcje.find((x) => s(x.apiName) === s(funkcyjne[0].functionApiName));
        const parametry = new Set(t(a.parameters).map((p) => s(p.apiName)));
        const wejscia = t(f?.inputs).map((i) => s(i.apiName));
        const braki = wejscia.filter((n) => !parametry.has(n));
        const nadmiar = [...parametry].filter((n) => !wejscia.includes(n));
        regula(!!f && braki.length === 0 && nadmiar.length === 0, {
          id: 'P74', klasa: 'zlamanie', kategoria: 'akcje',
          co: !f
            ? `\`${a.apiName}\` uruchamia funkcję \`${s(funkcyjne[0].functionApiName)}\`, której w modelu NIE MA`
            : `\`${a.apiName}\`: wejścia funkcji i parametry akcji to nie ta sama lista`
              + (braki.length ? ` — wejście bez parametru: ${braki.map((n) => `\`${n}\``).join(', ')}` : '')
              + (nadmiar.length ? ` — parametr, którego funkcja nie bierze: ${nadmiar.map((n) => `\`${n}\``).join(', ')}` : ''),
          gdzie: `actionTypes[${a.apiName}].parameters`,
          dlaczego: 'Parametry akcji opartej o funkcję NIE SĄ osobną listą do ułożenia — powstają '
            + 'z wejść funkcji, jeden do jednego. Rozjazd znaczy, że jedna z dwóch stron opisuje '
            + 'coś innego: albo funkcja dostanie wejście, którego nikt nie poda, albo akcja pyta '
            + 'o wartość, której nikt nie przeczyta.',
          jak: 'Wyrównaj listy. ⚠ Jeżeli funkcja LICZĄCA ma inną sygnaturę niż gest (bo liczy coś '
            + 'dla całego toru, a gest dotyczy jednego bloku), to znaczy, że są to DWIE różne '
            + 'funkcje: funkcja edycji akcji bierze parametry gestu i sama woła tamtą.',
          zrodlo: 'Actions → Run custom logic with a function („Every input of the function is '
            + 'created as a parameter on the action type, which you can then constrain like any '
            + 'other parameter”, docs:4927) + Ontology edits („Ontology edit functions must be '
            + 'configured as a function-backed Action”, docs:12539, docs:14220)',
        });
      }
    }

    /* ══════════════════════════════════════════════════════════════════════════════════════
       P77 · KRYTERIUM, KTÓREGO PLATFORMA NIE ZBUDUJE, W AKCJI BEZ FUNKCJI

       Warunek kryterium zgłoszenia jest u Foundry PORÓWNANIEM dwóch wartości z trzema szablonami
       lewej strony — użytkownik, parametr, kontekst wykonania (`docs:5557`, `docs:5585–5597`) —
       i zamkniętą listą operatorów (`docs:5618–5636`). Przejście po linku, pytanie „czy coś
       istnieje” ani odczyt konfiguracji zakładu nie są warunkiem: są WALIDACJĄ W FUNKCJI.
       ⚠ TO NIE ZNACZY, ŻE MODEL JEST ZŁY — znaczy, że akcja musi mieć czym ten warunek sprawdzić.
       Wzorzec Foundry'ego dla planowania mówi to wprost: reguła walidacji JEST funkcją, a jej
       twardość (`HARD`/`SOFT`) wybiera się w konfiguracji użycia (`docs:33314–33340`).
       ⚠ `"unverified"` NIE ZAPALA TEJ REGUŁY. Tam dokumentacja milczy albo przeczy sobie, więc
       orzekanie byłoby naszą opinią — takie liście idą do raportu jako pytania, nie jako usterki.
       ══════════════════════════════════════════════════════════════════════════════════════ */
    {
      const funkcyjnaAkcja = t(a.rules).some((r) => s(r.op) === 'runFunction');
      const nienatywne = [];
      const zejdz = (c, adres) => {
        if (t(c?.conditions).length) { t(c.conditions).forEach((d, i) => zejdz(d, `${adres}.${i}`)); return; }
        if (c?.native === false) nienatywne.push(adres);
      };
      for (const c of t(a.submissionCriteria)) zejdz(c, s(c.id) || '?');
      regula(funkcyjnaAkcja || nienatywne.length === 0, {
        id: 'P77', klasa: 'ryzyko', kategoria: 'akcje',
        co: `\`${a.apiName}\`: ${nienatywne.length} ${nienatywne.length === 1 ? 'warunek' : 'warunków'} `
          + `kryteriów zgłoszenia nie jest warunkiem platformy (${nienatywne.slice(0, 4).map((x) => `\`${x}\``).join(', ')}`
          + `${nienatywne.length > 4 ? '…' : ''}), a akcja nie ma funkcji, która by je sprawdziła`,
        gdzie: `actionTypes[${a.apiName}].submissionCriteria`,
        dlaczego: 'Tego warunku Ontology Manager nie zbuduje jako submission criterion — warunek '
          + 'jest porównaniem dwóch wartości, a nie przejściem po krawędzi, pytaniem o istnienie '
          + 'ani odczytem ustawienia. Kryterium, które tylko STOI w modelu, wygląda na odmowę, '
          + 'a nie odmawia: zgłoszenie przejdzie, a warunek nikt nie sprawdzi.',
        jak: 'Trzy drogi i wszystkie są dobre, byle wybrana świadomie: (1) dołóż WŁAŚCIWOŚĆ, '
          + 'o którą kryterium pyta (pochodna `count` po krawędzi zamiast „czy istnieje”, pochodna '
          + 'bez agregacji zamiast przejścia po linku) — wtedy warunek staje się natywny; '
          + '(2) oprzyj akcję o funkcję, która ten warunek sprawdzi; (3) zostaw go jako regułę '
          + 'walidacji z twardością wybieraną w konfiguracji użycia. ⚠ Czego NIE robić: zostawiać '
          + 'kryterium w modelu bez żadnego z tych trzech.',
        zrodlo: 'Actions → Submission criteria („A condition is a single comparison check between '
          + 'two values… configured using one of three condition templates: »Current user«, '
          + '»Parameter«, or »Execution context«”, docs:5557; operatory — docs:5618–5636) '
          + '+ Dynamic scheduling → Validation rules („Each validation rule is backed by '
          + 'a TypeScript function that evaluates whether the current state of a schedule object '
          + 'meets a certain condition”, docs:33316; twardość w konfiguracji — docs:33340)',
      });
    }

    /* ══════════════════════════════════════════════════════════════════════════════════════
       P78 · PARAMETR Z TYPE CLASS MUSI ODPOWIADAĆ WŁAŚCIWOŚCI O TEJ SAMEJ NAZWIE

       Type class jest u Foundry JEDYNYM sposobem powiedzenia, że ta chwila jest startem
       harmonogramu („Marks a timestamp property as the start time for schedule objects in dynamic
       scheduling widgets… The action parameter ID in your save handler action must match the
       property ID”, `docs:4456`; te same klasy po stronie parametru — `docs:4459–4460`), a przy
       akcji zapisu wymóg jest postawiony dwoma zdaniami naraz: „The parameter IDs in your action
       must exactly match the property IDs used in your schedule object type” (`docs:32720`)
       i „The start time and end time action parameters must have the same type classes… as the
       corresponding properties on your schedule object type” (`docs:32721`).
       ⚠ TO JEST DARMOWY TEST NAZW: parametr zapisujący start MUSI nazywać się tak jak właściwość,
       a nie `pinnedStart`, `startAt` ani `startMin`.
       ══════════════════════════════════════════════════════════════════════════════════════ */
    {
      const wlasciwoscZKlasa = new Map();
      for (const { ob, p } of wszystkieWlasciwosci) {
        for (const k of t(p.typeClasses)) {
          const klucz = `${s(p.apiName)}→${s(k)}`;
          if (!wlasciwoscZKlasa.has(klucz)) wlasciwoscZKlasa.set(klucz, []);
          wlasciwoscZKlasa.get(klucz).push(`${ob.apiName}.${p.apiName}`);
        }
      }
      const bezPary = [];
      for (const p of t(a.parameters)) {
        for (const k of t(p.typeClasses)) {
          if (!wlasciwoscZKlasa.has(`${s(p.apiName)}→${s(k)}`)) bezPary.push(`\`${s(p.apiName)}\` (\`${s(k)}\`)`);
        }
      }
      regula(bezPary.length === 0, {
        id: 'P78', klasa: 'zlamanie', kategoria: 'akcje',
        co: `\`${a.apiName}\`: ${bezPary.length} ${bezPary.length === 1 ? 'parametr niesie' : 'parametrów niesie'} `
          + `type class bez właściwości o tej samej nazwie i klasie: ${bezPary.slice(0, 4).join(', ')}`,
        gdzie: `actionTypes[${a.apiName}].parameters`,
        dlaczego: 'Type class wiąże parametr akcji zapisu z właściwością, którą ta akcja zapisuje, '
          + 'i wiąże je PO NAZWIE. Parametr z klasą, która nie ma pary, znaczy jedno z dwojga: '
          + 'albo właściwość nie dostała tej klasy i widget jej nie zobaczy, albo parametr nazywa '
          + 'się inaczej niż pole — a wtedy zapis nie trafi tam, gdzie miał.',
        jak: 'Nazwij parametr dokładnie jak właściwość i postaw tę samą klasę po obu stronach. '
          + '⚠ Gdy gest zapisuje COŚ INNEGO niż samą chwilę (np. „przybij tę chwilę”), to są DWIE '
          + 'różne rzeczy: chwila idzie parametrem o nazwie pola, a decyzja o przybiciu — osobnym '
          + 'parametrem logicznym.',
        zrodlo: 'Type classes → schedules („Marks a timestamp property as the start time for '
          + 'schedule objects… The action parameter ID in your save handler action must match the '
          + 'property ID”, docs:4456–4460) + Dynamic scheduling → setup („The parameter IDs in your '
          + 'action must exactly match the property IDs used in your schedule object type”, '
          + 'docs:32720; „The start time and end time action parameters must have the same type '
          + 'classes… as the corresponding properties”, docs:32721)',
      });
    }

    /* P21 · akcja bez parametrów — Golden Hammer */
    regula(t(a.parameters).length > 0, {
      id: 'P21', klasa: 'ryzyko', kategoria: 'akcje',
      co: `\`${a.apiName}\` nie ma ani jednego parametru`,
      gdzie: `actionTypes[${a.apiName}].parameters`,
      dlaczego: 'Akcja bez wejścia nie wymaga decyzji człowieka — czyli prawie na pewno jest '
        + 'przeliczeniem, które powinno mieszkać w rurze danych albo w automacie. '
        + 'To jest anty-wzorzec Golden Hammer: akcja użyta do roboty, której nie robi.',
      jak: 'Zapytaj: czy to wymaga ludzkiego osądu albo wejścia od użytkownika? '
        + 'Nie → rura (wyliczenie wsadowe) albo automat (reakcja na zdarzenie).',
      zrodlo: 'Anti-patterns → The Golden Hammer („Before creating an action type, ask: does this '
        + 'require human judgment or user input? If not, it likely belongs in a pipeline or automation”)',
    });

    /* P22 · akcja bez kryteriów zgłoszenia i bez wytłumaczenia */
    regula(t(a.submissionCriteria).length > 0 || s(a.submissionCriteriaNote).length > 0, {
      id: 'P22', klasa: 'uwaga', kategoria: 'akcje',
      co: `\`${a.apiName}\` nie deklaruje kryteriów zgłoszenia`,
      gdzie: `actionTypes[${a.apiName}].submissionCriteria`,
      dlaczego: 'Kryteria zgłoszenia są miejscem, w którym reguła biznesowa staje się częścią '
        + 'modelu, a nie kodu aplikacji. Ich brak znaczy albo że akcji nic nie ogranicza, '
        + 'albo — częściej — że ogranicza ją coś rozsypanego po froncie.',
      jak: 'Wypisz warunki, których akcja odmawia. Pusta lista jest odpowiedzią dopuszczalną, '
        + 'ale wtedy napisz przy niej, dlaczego jest pusta.',
      zrodlo: 'Action types → Submission criteria („Submission criteria support encoding business '
        + 'logic into data editing permissions, ensuring Ontology data quality and editing governance”)',
    });

    /* ════════════════════════════════════════════════════════════════════════════════════
       P48 · JEDNA AKCJA, KILKA OPERACJI — God Object przeniesiony na akcję
       ────────────────────────────────────────────────────────────────────────────────────
       Palantir opisuje ten anty-wzorzec na OBIEKCIE, ale jego wskaźniki są wskaźnikami
       PRZECIĄŻENIA, nie obiektu: „wiele pól, które zwykle są puste”, „znaczenie pola zmienia
       się zależnie od wartości innego pola (np. `type`)”, „reguły wymagają rozgałęzionej
       logiki po »rodzaju«”. Akcja, która robi dwie różne operacje wybierane parametrem, ma
       DOKŁADNIE te trzy cechy: połowa parametrów martwa, znaczenie reszty zależne od
       przełącznika, kryteria rozgałęzione.

       ⚠ ŁAPIEMY WYŁĄCZNIE NAZWĘ, I TO JEST DECYZJA PO POMIARZE. Kuszące sygnały
       „z kształtu” sprawdziłem na prawdziwym modelu i oba dawały SAME fałszywe trafienia:
         • parametr-dyskryminator + większość parametrów opcjonalnych → trafiał w `solveSchedule`
           (`mode: fill|improve|rebuild` to STRATEGIA jednej operacji, nie druga operacja)
           i w `saveExport` (`kind` jest WŁAŚCIWOŚCIĄ zapisywanej definicji);
         • `create` i `delete` tego samego typu w jednej akcji → trafiał w SZEŚĆ akcji, z czego
           wszystkie były zwykłą podmianą dzieci (widok ↔ klauzule, eksport ↔ kolumny) albo
           akcją kompensującą.
       Rozstrzygnięcie „czy te parametry znaczą co innego zależnie od przełącznika” nie jest
       funkcją KSZTAŁTU — i dlatego zadaje je warstwa modelu językowego (`AI-A1`), a nie licznik.
       ════════════════════════════════════════════════════════════════════════════════════ */
    {
      const nazwaAkcji = s(a.apiName);
      /* `addOrRemove`, `createOrUpdate`, `saveAndSend`, `upsert…` — nazwa wymienia DWIE
         operacje. ⚠ `setOrderNote` NIE trafia: „Or” musi zaczynać człon (po nim wielka
         litera), a nie stać w środku słowa. */
      const dwieOperacje = /^[a-z][a-zA-Z]*?(Or|And)[A-Z]/.test(nazwaAkcji)
        || /^upsert([A-Z]|$)/.test(nazwaAkcji);
      regula(!dwieOperacje, {
        id: 'P48', klasa: 'podpowiedz', kategoria: 'akcje',
        co: `\`${nazwaAkcji}\` ma w nazwie DWIE operacje`,
        gdzie: `actionTypes[${nazwaAkcji}]`,
        dlaczego: 'Nazwa wymieniająca dwie czynności zwykle opisuje akcję, która robi jedną '
          + 'ALBO drugą rzecz zależnie od parametru. Wtedy połowa parametrów jest przy każdym '
          + 'zgłoszeniu pusta, znaczenie reszty zależy od przełącznika, a kryteria i uprawnienia '
          + 'muszą się rozgałęzić — czyli dokładnie to, przed czym ostrzega God Object, tyle że '
          + 'na akcji. Cofnięcie i wpis w dzienniku też przestają mówić, CO się stało.',
        jak: 'Rozbij na osobne akcje — po jednej na operację biznesową. Jeżeli aplikacja ma mieć '
          + 'jeden przycisk, spina je KONTRAKT AKCJI na interfejsie, a nie wspólna akcja '
          + 'z przełącznikiem: abstrakcja mieszka w interfejsie, konkret zostaje w akcji. '
          + '⚠ To NIE jest zachęta do akcji per pole — `set[Właściwość]` to błąd w drugą stronę (P20).',
        zrodlo: 'Anti-patterns → The God Object („Property meanings change based on another '
          + "property's value (such as type or category)”; „Business rules and validations require "
          + 'extensive conditional logic based on object »type«”); Anti-patterns → Action Sprawl '
          + '(„Design actions around business operations that bundle related changes into '
          + 'meaningful workflows”)',
      });
    }

    /* P23 · mega-akcja: dotyka zbyt wielu typów naraz */
    const celeTypy = new Set(edycje.map((r) => typZCelu(r.target)).filter(Boolean));
    regula(celeTypy.size <= PROG.celeMegaAkcji, {
      id: 'P23', klasa: 'podpowiedz', kategoria: 'akcje',
      co: `\`${a.apiName}\` zmienia ${celeTypy.size} różnych typów w jednym zgłoszeniu`,
      gdzie: `actionTypes[${a.apiName}].rules`,
      prog: `> ${PROG.celeMegaAkcji} typów`,
      dlaczego: 'Akcja o tak szerokim zasięgu jest nieprzeglądalna dla recenzenta i kosztowna '
        + 'w uprawnieniach: wykonawca musi mieć prawo zapisu do KAŻDEGO z tych typów. '
        + 'W modelu uprawnień Foundry to jest najszersza furtka, jaką da się otworzyć jednym grantem.',
      jak: 'Sprawdź, czy to naprawdę jedna decyzja. Jeśli tak (akcja kompensująca, cofnięcie) — '
        + 'zapisz to uzasadnienie i ogranicz zasięg wyliczalnie, a nie deklaratywnie.',
      zrodlo: 'Action types → Permissions („users need the appropriate permissions for… any other '
        + 'object types that the action type might create or modify”)',
    });
  }

  /* ────────────────────────────────────────────────────────────────────────────────────────
     WŁAŚCIWOŚCI — normalizacja, wartości pochodne, struktury
     ──────────────────────────────────────────────────────────────────────────────────────── */

  /* ────────────────────────────────────────────────────────────────────────────────────────
     TYPY BAZOWE I STRUKTURY — zamknięte listy, które platforma stawia WPROST (zestaw 1.5)

     ⚠ TRZY RÓŻNE LISTY I POMYLENIE ICH JEST NAJDROŻSZYM BŁĘDEM TEGO ROZDZIAŁU:
       (1) TYPY BAZOWE WŁAŚCIWOŚCI — tabela `docs:2427–2440`. Nie ma w niej ani „duration”,
           ani „enum”: jedno jest liczbą z jednostką, drugie napisem z ograniczeniem typu
           wartości („Enum (one of)”, `docs:4348–4349`).
       (2) POLA STRUKTURY-WŁAŚCIWOŚCI — węższa lista, bez zagnieżdżeń i bez tablic
           (`docs:3391–3396`).
       (3) POLA PARAMETRU STRUCT — JESZCZE WĘŻSZA, bez `DECIMAL`, `BYTE`, `FLOAT` i `SHORT`
           (`docs:5799`), a typ pola parametru MUSI równać się typowi pola właściwości
           (`docs:5811`).
     ⚠ CZWARTA LISTA JEST OSOBNA I NIE PODLEGA ŻADNEJ Z TYCH TRZECH: typy z REPOZYTORIUM KODU
     funkcji (`functionTypes`) mają własną tabelę (`docs:7290–7326`), zagnieżdżają się do woli
     i znają rzeczy, których ontologia nie zna — `Decimal` tylko w Pythonie (`docs:7298`),
     interfejsy tylko w TypeScripcie v2 (`docs:7169`, `docs:8396`). Reguły niżej pytają więc
     o `sharedPropertyTypes`, a nie o `functionTypes`. Tę samą granicę trzyma `P52`.
     ──────────────────────────────────────────────────────────────────────────────────────── */

  /**
   * ⚠ TYP BAZOWY CZYTANY TOLERANCYJNIE — `baseType`, a gdy go nie ma, NAZWA Z TABELI FOUNDRY'EGO.
   *
   * Kanon niesie `baseType` od zestawu 1.5, ale słownictwem kanonu są nazwy Foundry'ego, więc
   * plik, który pisze `type: string` i nie rozbija typów, mówi to samo co `baseType: String`.
   * Silnik ma to rozumieć: reguła, która żąda JEDNEGO ze swoich pól, zamilkłaby na każdym
   * kanonie zbudowanym inaczej niż naszym normalizatorem — a to jest dokładnie ta zależność od
   * jednego formatu, której to narzędzie nie ma prawa mieć. ⚠ Rozpoznajemy WYŁĄCZNIE nazwy
   * z tabeli typów bazowych (`docs:2427–2440`); zapis własny (`duration`, `enum(…)`, `json`)
   * typu bazowego NIE DOSTAJE i to jest wejście dla `P66`, a nie brak do uzupełnienia.
   */
  const NAZWY_BAZOWE = new Map([['string', 'String'], ['integer', 'Integer'], ['int', 'Integer'],
    ['short', 'Short'], ['long', 'Long'], ['byte', 'Byte'], ['boolean', 'Boolean'], ['bool', 'Boolean'],
    ['float', 'Float'], ['double', 'Double'], ['decimal', 'Decimal'], ['date', 'Date'],
    ['timestamp', 'Timestamp'], ['geopoint', 'Geopoint'], ['geoshape', 'Geoshape'], ['struct', 'Struct'],
    ['array', 'Array'], ['vector', 'Vector'], ['marking', 'Marking'], ['cipher', 'Cipher'],
    ['attachment', 'Attachment'], ['mediareference', 'Media Reference'], ['timeseries', 'Time Series'],
    ['geotemporalseries', 'Geotemporal Series']]);
  const bazowy = (x) => s(x?.baseType) || (NAZWY_BAZOWE.get(dolne(x?.type)) ?? '');

  /** Typy bazowe DOZWOLONE w polu struktury-właściwości (`docs:3396`). */
  const POLE_STRUKTURY_OK = new Set(['Boolean', 'Byte', 'Date', 'Decimal', 'Double', 'Float',
    'Geopoint', 'Integer', 'Long', 'Short', 'String', 'Timestamp']);
  /** Typy bazowe dozwolone w polu PARAMETRU struct (`docs:5799`) — bez `Decimal`. */
  const POLE_PARAMETRU_OK = new Set(['Boolean', 'Date', 'Double', 'Geopoint', 'Integer',
    'Long', 'String', 'Timestamp']);
  /** Typy, których tabela nie dopuszcza jako klucza głównego ani klucza tytułu (`docs:2434–2436`). */
  const NIE_NA_KLUCZ = new Set(['Array', 'Struct', 'Vector', 'Geoshape', 'Marking',
    'Media Reference', 'Time Series', 'Geotemporal Series', 'Attachment']);
  const NIE_NA_TYTUL = new Set(['Struct', 'Vector', 'Geoshape', 'Marking',
    'Media Reference', 'Time Series', 'Geotemporal Series', 'Attachment']);

  {
    /* Nazwy zadeklarowanych typów zapisu — po nich poznajemy, że `type` nie jest typem bazowym,
       tylko wskazaniem struktury albo rekordu kodu, i wtedy reguła o typie bazowym milczy. */
    const nazwyZapisow = new Set([...wspolne, ...t(o.functionTypes)].map((x) => s(x.apiName)).filter(Boolean));

    /* P66 · typ, którego nie ma w tabeli typów bazowych */
    /** ⚠ „REFERENCJA” NIE JEST TYPEM BAZOWYM I NIE MA BYĆ NIM NAZYWANA — jest RODZAJEM PARAMETRU
     *  („object reference” / „interface reference”, `docs:5674`, `docs:5717`). Model, który
     *  zapisuje go słowem zamiast wskazaniem celu, mówi mniej, niż mógłby — ale mówi PRAWDĘ,
     *  więc reguła o tabeli typów bazowych ma o nim milczeć. */
    const SLOWO_REFERENCJI = /^(object|interface)?[\s_-]*reference$/i;
    const bezTypu = [];
    const sprawdz = (gdzie, x) => {
      if (bazowy(x)) return;
      if (x.reference) return;                        // referencja ma własny rodzaj (docs:5674)
      if (SLOWO_REFERENCJI.test(s(x.typeRaw ?? x.type))) return;
      if (nazwyZapisow.has(s(x.typeRaw ?? x.type))) return;   // wskazanie struktury albo typu kodu
      if (!s(x.typeRaw ?? x.type)) return;            // brak typu zgłasza inna reguła
      bezTypu.push(`${gdzie} → \`${s(x.typeRaw ?? x.type)}\``);
    };
    for (const { ob, p } of wszystkieWlasciwosci) sprawdz(`${ob.apiName}.${p.apiName}`, p);
    for (const a of akcje) for (const p of t(a.parameters)) sprawdz(`${a.apiName}(${p.apiName})`, p);
    regula(bezTypu.length === 0, {
      id: 'P66', klasa: 'zlamanie', kategoria: 'wlasciwosci',
      co: `${bezTypu.length} zapisów typu nie mieści się w tabeli typów bazowych `
        + `(${bezTypu.slice(0, 5).join(', ')}${bezTypu.length > 5 ? '…' : ''})`,
      gdzie: 'objectTypes[*].properties · actionTypes[*].parameters',
      dlaczego: 'Tabela typów bazowych jest ZAMKNIĘTA: model, który nazywa typ po swojemu '
        + '(„duration”, „money”, „json”), nie mówi platformie, jaką kolumnę założyć — a to nie '
        + 'jest różnica słownictwa, tylko brak decyzji. Pojęcie zapisuje się TYPEM BAZOWYM plus '
        + 'TYPEM WARTOŚCI, który niesie ograniczenie i znaczenie.',
      jak: 'Rozbij zapis na typ bazowy z tabeli i ograniczenie typu wartości: lista dozwolonych '
        + 'wartości to `String` + „Enum (one of)”, czas trwania to liczba + jednostka, pieniądz '
        + 'to `Decimal` + waluta.',
      zrodlo: 'Properties → Supported property types (tabela typów bazowych, docs:2427–2440) '
        + '+ Value types → constraints („Enum (one of): A constraint representing a static set '
        + 'of allowed values”, docs:4348–4349)',
    });

    /* P67 · pole struktury-właściwości o typie spoza listy albo będące tablicą */
    const uzywaneWOntologii = new Set(wszystkieWlasciwosci
      .map(({ p }) => s(p.structTypeApiName)).filter(Boolean));
    for (const typ of wspolne) {
      if (!typ.isStruct || !uzywaneWOntologii.has(s(typ.apiName))) continue;
      const zle = t(typ.fields)
        .filter((f) => bazowy(f) === 'Array' || (bazowy(f) && !POLE_STRUKTURY_OK.has(bazowy(f))))
        .map((f) => `\`${s(f.apiName)}\`: ${bazowy(f)}`);
      regula(zle.length === 0, {
        id: 'P67', klasa: 'zlamanie', kategoria: 'wlasciwosci',
        co: `struktura \`${s(typ.apiName)}\` ma pola o typie, którego struct property nie uniesie: ${zle.join(', ')}`,
        gdzie: `sharedPropertyTypes[${s(typ.apiName)}].fields`,
        dlaczego: 'Pole struktury-właściwości musi być SKALAREM z zamkniętej listy i nie może być '
          + 'tablicą. Rekord z tablicą w środku da się narysować w JSON-ie i przewieźć drutem, '
          + 'ale nie da się go założyć jako typu właściwości — a to znaczy, że model opisuje coś, '
          + 'czego nie ma jak zbudować.',
        jak: 'Tablicę w środku struktury zamień na osobny typ obiektu z linkiem (wiersz zamiast '
          + 'listy w polu), a typ spoza listy — na najbliższy skalar z tabeli.',
        zrodlo: 'Structs → Configuration constraints („Cannot contain nested structs · Fields '
          + 'cannot be arrays · Minimum of one field required · Supported field types include: '
          + 'BOOLEAN, BYTE, DATE, DECIMAL, DOUBLE, FLOAT, GEOPOINT, INTEGER, LONG, SHORT, STRING, '
          + 'TIMESTAMP”, docs:3391–3396)',
      });
    }

    /* P68 · parametr struct — węższa lista pól i obowiązek zgodności z polem właściwości
       ⚠ TA REGUŁA PYTA O PARAMETR, A NIE O WŁAŚCIWOŚĆ: `Decimal` jest w strukturze-właściwości
       DOZWOLONY (`docs:3396`) i zabroniony w parametrze, którym się ją edytuje (`docs:5799`).
       Różnicę widać wyłącznie wtedy, gdy patrzy się na obie listy naraz. */
    const strukturaPo = new Map(wspolne.filter((x) => x.isStruct).map((x) => [s(x.apiName), x]));
    for (const a of akcje) {
      const zle = [];
      for (const p of t(a.parameters)) {
        const typ = strukturaPo.get(s(p.structTypeApiName));
        if (!typ) continue;
        for (const f of t(typ.fields)) {
          const b = bazowy(f);
          if (b && !POLE_PARAMETRU_OK.has(b)) zle.push(`\`${p.apiName}.${s(f.apiName)}\`: ${b}`);
        }
      }
      regula(zle.length === 0, {
        id: 'P68', klasa: 'zlamanie', kategoria: 'akcje',
        co: `\`${a.apiName}\`: parametr struct niesie pola o typie, którego parametr struct nie ma: ${zle.slice(0, 6).join(', ')}`,
        gdzie: `actionTypes[${a.apiName}].parameters`,
        dlaczego: 'Lista typów pola PARAMETRU struct jest węższa od listy typów pola WŁAŚCIWOŚCI '
          + 'struct — nie ma w niej `Decimal`, `Byte`, `Float` ani `Short`. Skoro typ pola '
          + 'parametru musi równać się typowi pola właściwości, struktura z takim polem jest '
          + 'NIEEDYTOWALNA AKCJĄ, choć da się ją założyć.',
        jak: 'W strukturze EDYTOWANEJ AKCJĄ postaw `Double` zamiast `Decimal` i zapisz przy polu, '
          + 'że to jest cena edytowalności, a nie przeoczenie. Tam, gdzie precyzja dziesiętna jest '
          + 'nieodzowna, rozdziel: właściwość `Decimal` liczona rurą i osobne pole edycyjne.',
        zrodlo: 'Actions on structs → Struct parameters („The supported base types for struct '
          + 'parameter fields are BOOLEAN, DATE, DOUBLE, GEOPOINT, INTEGER, LONG, STRING, and '
          + 'TIMESTAMP”, docs:5799) + „The base type of the struct parameter field must match the '
          + 'base type of a mapped struct property field” (docs:5811)',
      });
    }

    /* P71 · kanon obniżył precyzję pola struktury, bo edytuje ją akcja
       ⚠ TO NIE JEST USTERKA, TYLKO DECYZJA, KTÓRA MA BYĆ WIDOCZNA. Rozbicie `Decimal` → `Double`
       jest wymuszone dwiema listami Foundry'ego naraz (`docs:5799` + `docs:5811`) i bez niego
       modelu nie da się zbudować. Gdyby jednak precyzja dziesiętna była tu ŚWIADOMYM wyborem,
       zamiana ma zostać zauważona, a nie przemilczana — dlatego `uwaga`, a nie cisza. */
    for (const typ of wspolne) {
      const obnizone = t(typ.fields).filter((f) => s(f.baseTypeRaw)).map((f) => `\`${s(f.apiName)}\`: ${s(f.baseTypeRaw)} → ${s(f.baseType)}`);
      regula(obnizone.length === 0, {
        id: 'P71', klasa: 'uwaga', kategoria: 'wlasciwosci',
        co: `struktura \`${s(typ.apiName)}\` jest edytowana akcją, więc ${obnizone.length} jej pól `
          + `schodzi na szerszy typ liczbowy: ${obnizone.slice(0, 6).join(', ')}`,
        gdzie: `sharedPropertyTypes[${s(typ.apiName)}].fields`,
        dlaczego: 'Pole PARAMETRU struct nie zna `Decimal`, `Byte`, `Float` ani `Short`, a typ pola '
          + 'parametru musi równać się typowi pola właściwości — więc struktura edytowalna akcją '
          + 'nie ma prawa do tych typów po ŻADNEJ ze stron. Zamiana jest wymuszona, ale nie jest '
          + 'neutralna: tam, gdzie precyzja dziesiętna była decyzją, właśnie się ją traci.',
        jak: 'Jeżeli to waga, próg albo współczynnik — `Double` jest właściwy i nie ma tu nic do '
          + 'zrobienia. Jeżeli to pieniądz albo ilość rozliczana co do grosza — rozdziel: '
          + 'właściwość `Decimal` zasilana rurą i osobne pole edycyjne, a nie jedna struktura, '
          + 'która ma być i dokładna, i edytowalna gestem.',
        zrodlo: 'Actions on structs → Struct parameters (lista typów pola parametru bez `DECIMAL`, '
          + 'docs:5799) + „The base type of the struct parameter field must match the base type '
          + 'of a mapped struct property field” (docs:5811) + Structs → Configuration constraints '
          + '(szersza lista pól WŁAŚCIWOŚCI, docs:3396)',
      });
    }

    /* P69 · jeden parametr struct na jedną właściwość struct — i nic poza tym
       Foundry mówi to trzema zdaniami naraz (`docs:5843–5845`): wartości struktury wchodzą
       WYŁĄCZNIE parametrem struct, jedna właściwość struct przez JEDEN parametr, a parametr
       struct nie zasila niczego poza właściwością struct. */
    for (const a of akcje) {
      const structParametry = t(a.parameters).filter((p) => bazowy(p) === 'Struct');
      const wgTypu = new Map();
      for (const p of structParametry) {
        const k = s(p.structTypeApiName);
        if (!wgTypu.has(k)) wgTypu.set(k, []);
        wgTypu.get(k).push(s(p.apiName));
      }
      const podwojne = [...wgTypu].filter(([, lista]) => lista.length > 1);
      regula(podwojne.length === 0, {
        id: 'P69', klasa: 'zlamanie', kategoria: 'akcje',
        co: `\`${a.apiName}\`: ${podwojne.map(([k, l]) => `strukturę \`${k}\` zasila ${l.length} parametrów (${l.join(', ')})`).join('; ')}`,
        gdzie: `actionTypes[${a.apiName}].parameters`,
        dlaczego: 'Właściwość struct tworzy się i zmienia przez DOKŁADNIE JEDEN parametr struct. '
          + 'Dwa parametry o tym samym typie struktury znaczą, że mapowanie pól trzeba by rozdzielić '
          + 'między nie — a tego platforma nie przyjmie.',
        jak: 'Zostaw jeden parametr struct na jedną właściwość struct; jeżeli akcja zmienia dwie '
          + 'różne struktury, dostają one dwa RÓŻNE typy, a nie dwa parametry tego samego typu.',
        zrodlo: 'Actions on structs → Limitations („A struct property can only be created or '
          + 'modified through a single struct parameter” · „A struct parameter can only be used '
          + 'to create or modify struct properties”, docs:5844–5845)',
      });
    }
  }

  /* P24 · właściwość liczona jest zarazem celem edycji akcji */
  {
    const celeEdycji = new Set(akcje.flatMap((a) => edycjeAkcji(a).filter((r) => r.op === 'modify').map((r) => s(r.target))));
    for (const { ob, p } of wszystkieWlasciwosci) {
      if (!p.derived) continue;
      const pelna = `${ob.apiName}.${p.apiName}`;
      regula(!celeEdycji.has(pelna), {
        id: 'P24', klasa: 'zlamanie', kategoria: 'wlasciwosci',
        co: `\`${pelna}\` jest LICZONA, a mimo to edytuje ją akcja`,
        gdzie: `objectTypes[${ob.apiName}].${p.apiName}`,
        dlaczego: 'Właściwość pochodna w Foundry jest tylko do odczytu — nie może jej zmienić ani '
          + 'funkcja, ani akcja. Model, który deklaruje oba naraz, opisuje coś, czego nie da się '
          + 'zbudować: przy zapisie akcji platforma odmówi.',
        jak: 'Rozstrzygnij, czym to pole JEST. Ktoś je stawia gestem → właściwość zapisywalna, '
          + 'a funkcja liczy podpowiedź albo pilnuje spójności. Wynika z innych danych → zostaje '
          + 'pochodna, a akcja przestaje w nie pisać.',
        zrodlo: 'Configure Derived Properties („Derived properties are read-only and cannot be '
          + 'edited by functions or actions”)',
      });
      /* P25 · pochodna zadeklarowana jako wymagana */
      regula(p.required !== true, {
        id: 'P25', klasa: 'ryzyko', kategoria: 'wlasciwosci',
        co: `\`${pelna}\` jest LICZONA i zarazem wymagana`,
        gdzie: `objectTypes[${ob.apiName}].${p.apiName}`,
        dlaczego: 'Foundry nie pozwala oznaczyć właściwości pochodnej jako wymaganej — '
          + 'wymagalność sprawdza się przy indeksowaniu danych, a pochodna nie ma danych do sprawdzenia.',
        jak: 'Zdejmij wymagalność albo przestań traktować to pole jako pochodne.',
        zrodlo: 'Configure Derived Properties → Known Limitations („Derived properties cannot be '
          + 'marked as required (non-nullable)”)',
      });
    }
  }

  /* ════════════════════════════════════════════════════════════════════════════════════════
     P53 · POLE WYPEŁNIANE RĘKĄ, KTÓREGO NIE MA CZYM WYPEŁNIĆ
     ────────────────────────────────────────────────────────────────────────────────────────
     Właściwość w Foundry bierze wartość z JEDNEGO z dwóch miejsc: z rury (datasource) albo
     z EDYCJI. Edycja nie dzieje się sama — każdy zapis do Ontology jest zgłoszeniem akcji.
     Więc pole zadeklarowane jako wypełniane ręcznie, do którego nie pisze ŻADNA akcja, jest
     polem, którego nikt nigdy nie wypełni: kolumna w modelu, pusta na zawsze w danych.

     ⚠ TO JEST NAJŁATWIEJSZA REGUŁA DO ŹLE POSTAWIONEJ — i dlatego ma DWA wyjścia awaryjne.
     Model, który UCZCIWIE mówi „tego jeszcze nie mamy”, nie kłamie i nie ma być karany:
       • pole z własną dojrzałością (`planned`, `experimental`, `to-confirm`…) I NOTĄ, czyli
         powodem przy sobie — to jest miejsce, w które ktoś wróci, a nie obietnica;
       • pole na typie, który sam jest niegotowy — cały byt nie udaje, że działa, więc żadne
         z jego pól nie może udawać osobno.
     Krzyczy dokładnie wtedy, gdy pole UDAJE, ŻE DZIAŁA: stoi na żywym typie, bez żadnego
     znacznika niedojrzałości, i nie ma kto go wypełnić.

     ⚠ JEDNO ZNALEZISKO NA MODEL, nie na pole. Brak warstwy zapisu jest JEDNYM przeoczeniem
     widzianym z siedemdziesięciu stron — siedemdziesiąt identycznych wierszy nie niesie ani
     jednej informacji więcej niż jeden wiersz z listą adresów.
     ════════════════════════════════════════════════════════════════════════════════════════ */

  /** Dojrzałości, przy których wpis JAWNIE mówi „jeszcze nie działam”. */
  /* ⚠ PRZEPUSZCZONE PRZEZ `dolne`, bo `dolne` ŚCIERA myślniki: `to-confirm` → `toconfirm`.
     Bez tego wpis z myślnikiem nie trafiłby NIGDY, a reguła krzyczałaby na polu, które uczciwie
     mówi „do potwierdzenia”. */
  const NIEGOTOWE = new Set(['planned', 'experimental', 'prototype', 'example', 'deprecated', 'to-confirm', 'draft'].map(dolne));

  {
    /* ⚠ ZAPIS TO NIE TYLKO `modify` NA POLU. Akcja, która TWORZY obiekt, stawia przy okazji jego
       pola, a akcja deklarująca cel na poziomie TYPU (`core.Order`, nie `core.Order.dueDate`)
       pisze do niego tak samo — model po prostu nie rozbił celu na kolumny. Pytanie brzmi
       „czy istnieje droga zapisu”, a nie „czy ktoś wymienił to pole z nazwiska”. */
    const zapisyPol = new Set();
    const zapisyTypow = new Set();
    for (const a of akcje) {
      for (const r of edycjeAkcji(a)) {
        if (r.op !== 'modify' && r.op !== 'create') continue;
        zapisyPol.add(s(r.target));
        zapisyTypow.add(typZCelu(r.target));
      }
    }
    const osierocone = [];
    for (const { ob, p } of wszystkieWlasciwosci) {
      if (!p.editOnly) continue;
      const pelna = `${ob.apiName}.${p.apiName}`;
      if (zapisyPol.has(pelna) || zapisyTypow.has(s(ob.apiName))) continue;
      if (NIEGOTOWE.has(dolne(p.status)) && maOpis(p)) continue;
      if (NIEGOTOWE.has(dolne(ob.status))) continue;
      osierocone.push(pelna);
    }
    regula(osierocone.length === 0, {
      id: 'P53', klasa: 'ryzyko', kategoria: 'wlasciwosci',
      co: `${osierocone.length === 1 ? 'pole wypełniane RĘKĄ nie jest celem żadnej akcji' : `${osierocone.length} pól wypełnianych RĘKĄ nie jest celem żadnej akcji`}`
        + `: ${osierocone.slice(0, 5).map((x) => `\`${x}\``).join(', ')}${osierocone.length > 5 ? '…' : ''}`,
      gdzie: 'objectTypes[*].properties[*]',
      dlaczego: 'Wartość właściwości bierze się w Foundry albo z rury, albo z EDYCJI — a każda '
        + 'edycja Ontology jest zgłoszeniem akcji. Pole oznaczone jako wypełniane ręcznie, '
        + 'do którego nie pisze żadna akcja, nie ma jak dostać wartości: zostaje w modelu jako '
        + 'kolumna, która w danych będzie pusta zawsze. Czytelnik modelu widzi pole i zakłada, '
        + 'że ktoś je uzupełnia.',
      jak: 'Rozstrzygnij, skąd ta wartość ma przyjść. Stawia ją człowiek → dopisz akcję, która '
        + 'ją zapisuje (i rolę, która to zgłasza). Przywozi ją system → to jest pole z rury, '
        + 'nie ręczne. Nikt jeszcze nie wie → oznacz je jako niegotowe (`planned`) i napisz przy '
        + 'nim, na co czeka — wtedy ta reguła milknie, bo model przestaje obiecywać. '
        + '⚠ Jeśli wypełnia je akcja generowana przez platformę, a nie zadeklarowana u was — '
        + 'zapisz to przy polu; inaczej nikt poza wami tego nie odróżni od przeoczenia.',
      zrodlo: 'Object types → Property types (właściwość bierze wartość z datasource ALBO z edycji) '
        + '+ Action types (zmiana obiektu w Ontology jest zgłoszeniem akcji; „Edits are permanently '
        + 'attached to the primary key value you made them for”)',
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════════════════════
     P54 · DZIENNIK EDYCJI BEZ WARTOŚCI SPRZED ZMIANY — COFANIE NIE MA CZEGO PRZECZYTAĆ
     ─────────────────────────────────────────────────────────────────────────────────────
     Magazyn obiektów ma DWIE warstwy: pierwsza to kopia danych z systemu źródłowego, druga to
     KARTECZKI — edycje przyklejone do klucza głównego, każda z autorem, chwilą i wartością
     SPRZED zmiany. Na tej drugiej warstwie jadą CZTERY zdolności naraz i albo są wszystkie, albo
     nie ma żadnej: pole wypełniane ręką, wymagalność sprawdzana przy edycji, klasyfikacja
     egzekwowana na zmienionej wartości i COFNIĘCIE. Magazyn, który zamiast karteczki nadpisuje
     wiersz, nie unosi żadnej z nich. To jest JEDNA decyzja projektowa, nie cztery.

     ⚠ CZEGO TA REGUŁA ŚWIADOMIE NIE ROBI: nie żąda, żeby model zakładał typ „Edycja”. Na Foundry
     warstwę karteczek daje PLATFORMA — poprawna ontologia Foundry o żadnym `Edit` nie wspomina
     i karanie jej za to byłoby uczeniem nieprawdy. Reguła odzywa się dopiero wtedy, gdy ktoś
     TEN DZIENNIK ZAMODELOWAŁ SAM (bo stoi na własnym magazynie) i zbudował go W POŁOWIE:
     wpis mówi, że coś się zmieniło, ale nie mówi NA CO ANI Z CZEGO. Taki dziennik OPOWIADA
     historię i nie daje jej odtworzyć — a akcja obok deklaruje się jako odwracalna.

     ⚠ WYKRYCIE JEST PO NAZWIE (i dziennika, i pary pól), więc kosztuje ZERO punktów i rozstrzyga
     je model albo człowiek. Miejsce na edycje nazywa się `Edit`, `Event`, `AuditLog` albo `Zmiana`,
     a wartość sprzed zmiany — `before`, `previousValue` albo `oldValue`; my zgadujemy ze słownika.
     Karanie kogoś za NASZE zgadywanie złamałoby kryterium kosztu.
     ═══════════════════════════════════════════════════════════════════════════════════════ */
  {
    const SLOWA_DZIENNIKA = /(edit|audit|revision|changelog|journal|dziennik|edycj)/i;
    /* ⚠ PARY SZUKAMY PO WYRAZACH, NIE PO PODCIĄGU. `prior` jako podciąg łapie `priority`,
       a `po` łapie połowę polskiego słownika — i reguła milczałaby na dzienniku, który ma
       samo `priorityBefore`, uznając, że wartość PO też tam stoi. `wyrazy()` rozbija też
       camelCase, więc `previousValue` → `previous` + `value`. */
    const PRZED = new Set(['before', 'previous', 'prev', 'old', 'prior', 'przed', 'poprzednia', 'poprzedni', 'stara', 'stary']);
    const PO = new Set(['after', 'new', 'current', 'nowa', 'nowy', 'nowe']);
    /* Obietnica, która bez tej warstwy nie ma jak zadziałać. Bez niej dziennik dopisywany
       (append-only „co się stało”) jest w pełni poprawny i nie ma o co pytać. */
    const polaReczne = wszystkieWlasciwosci.filter(({ p }) => p.editOnly);
    const odwracalne = akcje.filter((a) => a.revertible === true);
    const obiecuje = polaReczne.length > 0 || odwracalne.length > 0;
    const dzienniki = obiekty.filter((ob) => SLOWA_DZIENNIKA.test(krotka(ob.apiName)));
    const polowiczne = dzienniki.filter((ob) => {
      const slowa = t(ob.properties).flatMap((x) => wyrazy(x.apiName));
      return !(slowa.some((w) => PRZED.has(w)) && slowa.some((w) => PO.has(w)));
    });
    const powody = [
      odwracalne.length > 0 ? `${odwracalne.length} akcji zadeklarowanych jako odwracalne` : '',
      polaReczne.length > 0 ? `${polaReczne.length} pól wypełnianych ręką` : '',
    ].filter(Boolean).join(' i ');
    regula(!obiecuje || polowiczne.length === 0, {
      id: 'P54', klasa: 'podpowiedz', kategoria: 'akcje',
      co: `model ma ${powody}, a ${polowiczne.length === 1 ? 'dziennik' : 'dzienniki'} `
        + `${polowiczne.map((ob) => `\`${ob.apiName}\``).join(', ')} nie niesie wartości SPRZED zmiany`,
      gdzie: `objectTypes[${polowiczne.map((ob) => ob.apiName).join(', ')}]`,
      dlaczego: 'Edycja jest osobną warstwą nad kopią danych źródłowych — karteczką przyklejoną '
        + 'do klucza głównego, z autorem, chwilą, wartością PRZED i PO. Na tej warstwie jadą cztery '
        + 'rzeczy naraz: pole wypełniane ręką, wymagalność sprawdzana przy edycji, klasyfikacja '
        + 'egzekwowana na zmienionej wartości i cofnięcie — albo są wszystkie, albo nie ma żadnej. '
        + 'Dziennik, który notuje sam FAKT zmiany, opowiada historię i nie daje jej odtworzyć: '
        + '„cofnij” nie ma skąd wziąć wartości, do której miałoby wrócić. Odtworzenie z samego '
        + 'następstwa zdarzeń też nie zadziała, jeśli choć część wartości wchodzi rurą, a nie gestem.',
      jak: 'Dopisz wpisowi dziennika wartość SPRZED i PO zmianie (do tego autora i chwilę) — to '
        + 'jest komplet, z którego cofnięcie da się złożyć. Jeśli tego zapisać nie możecie, zdejmijcie '
        + 'deklarację odwracalności, zamiast zostawiać ją jako coś, co „dorobimy w aplikacji”. '
        + '⚠ Wdrażacie się na Foundry i ten typ jest u was tylko opisem tego, co robi platforma — '
        + 'odrzuć tę podpowiedź: warstwę karteczek trzyma wtedy magazyn obiektów, nie wasz model.',
      zrodlo: 'Ontology → Edits / Object Storage V2 (edycja jest WARSTWĄ nad kopią źródła, nie '
        + 'nadpisaniem wiersza) + Create an object type („Edits are permanently attached to the '
        + 'primary key value you made them for”)',
    });
  }

  /* ════════════════════════════════════════════════════════════════════════════════════════
     P49 · POLE NAZWANE „LICZONYM”, KTÓREGO FOUNDRY NIE POLICZY
     ────────────────────────────────────────────────────────────────────────────────────────
     Derived property w Foundry ma JEDEN kształt: przejście po linkach do obiektów powiązanych
     plus (opcjonalnie) agregacja. Nie jest to „pole liczone wzorem” ani „pole liczone funkcją”
     — to drugie w Foundry po prostu nie jest właściwością.

     ⚠ JEDNO ZNALEZISKO NA MODEL, nie na pole: gdy `derived` znaczy u kogoś co innego, znaczy
     to co innego przy KAŻDYM polu naraz. Czternaście identycznych wierszy nie niesie ani jednej
     informacji więcej niż jeden wiersz z listą.
     ════════════════════════════════════════════════════════════════════════════════════════ */
  {
    /* Agregacje, które Foundry wymienia: Count · Average · Sum · Approximate/Exact cardinality
       · Collect list · Collect set. Plus wybór wartości z JEDNEGO powiązanego obiektu. */
    const AGREGATY = /\b(count|sum|avg|average|mean|min|max|collect|cardinality|distinct|first|last|latest|select)\b/i;
    const podejrzane = [];
    for (const { ob, p } of wszystkieWlasciwosci) {
      if (!p.derived) continue;
      /* ⚠ KSZTAŁT KANONICZNY MÓWI TO WPROST: `via` (łańcuch linków) + `aggregation`. Reguła
         patrzyła najpierw wyłącznie na `by` (formę, w której opisuje to NASZ manifest)
         i zgłaszała wzorcowy wpis szablonu jako usterkę. Złapał to szablon, który z definicji
         ma punktować 100/100 — i to jest cała racja bytu tamtej asercji. */
      const via = t(p.derived.via).map(s).filter(Boolean);
      const agregacja = s(p.derived.aggregation);
      const przez = [s(p.derived.by), via.join(','), agregacja].filter(Boolean).join(' ');
      /* Nazwy linków, po których TEN typ może przejść — w obie strony. */
      const nazwyLinkow = linki
        .filter((l) => l.from === ob.apiName || l.to === ob.apiName)
        .flatMap((l) => [s(l.apiName), s(l.reverseName)])
        .filter(Boolean);
      const idziePoLinku = via.length > 0 || nazwyLinkow.some((n) => przez.includes(n));
      if (!przez || (!idziePoLinku && !AGREGATY.test(przez))) {
        podejrzane.push(`${ob.apiName}.${p.apiName}`);
      }
    }
    regula(podejrzane.length === 0, {
      id: 'P49', klasa: 'ryzyko', kategoria: 'wlasciwosci',
      co: `${podejrzane.length === 1 ? 'pole oznaczone jako liczone nie liczy się' : `${podejrzane.length} pól oznaczonych jako liczone nie liczy się`} z LINKÓW`
        + `: ${podejrzane.slice(0, 5).map((x) => `\`${x}\``).join(', ')}`
        + (podejrzane.length > 5 ? '…' : ''),
      gdzie: 'objectTypes[*].properties[*].derived',
      dlaczego: 'Właściwość pochodna w Foundry ma jeden kształt: przejście po linkach do obiektów '
        + 'powiązanych, opcjonalnie z agregacją (count, sum, average, collect…). Pole liczone '
        + 'wzorem albo funkcją w kodzie NIE JEST derived property — platforma nie ma z czego go '
        + 'policzyć, a model obiecuje wartość, której nikt nie wyliczy poza waszą aplikacją.',
      jak: 'Rozstrzygnij, czym to jest. Da się policzyć z linków → zapisz przejście i agregację. '
        + 'Liczy to funkcja → to jest FUNKCJA (i wołający ją widok albo akcja), nie właściwość. '
        + 'Wartość wchodzi rurą i tylko bywa odświeżana → to zwykła właściwość ze źródłem.',
      zrodlo: 'Derived properties („Derived properties are properties that are calculated at runtime '
        + 'based on values from linked objects… a derived property pulls information from objects '
        + 'connected through link types, optionally applying aggregations”)',
    });
  }

  /* ────────────────────────────────────────────────────────────────────────────────────────
     P72 · SKĄD WŁAŚCIWOŚĆ BIERZE WARTOŚĆ — i czemu „liczy to funkcja" nie jest odpowiedzią

     ⚠ CO JEST CYTATEM, A CO WNIOSKIEM — ROZDZIELONE, BO TO NIE JEST TA SAMA SIŁA:
       • CYTAT: właściwość konfiguruje się w zakładce „Source”, a rodzaj źródła wybiera się
         w sekcji „Source type” (`docs:3301–3305`); dokumentacja opisuje KOLUMNĘ zbioru
         źródłowego, właściwość TYLKO-EDYCYJNĄ („not directly mapped to a column in the backing
         dataset”, `docs:2739`, `docs:2750`) i OBIEKTY POWIĄZANE („calculated at runtime based
         on values from linked objects”, `docs:3281`).
       • CYTAT: „function-backed column” jest bytem WIDGETU TABELI w Workshopie i dokumentacja
         odróżnia go od właściwości pochodnej wprost: „Function-backed columns are distinct from
         derived properties, which are configured directly in Workshop without writing code”
         (`docs:10092`; zakładanie ich — `docs:13642–13650`).
       • WNIOSEK (nasz, nie cytat): skoro kolumna liczona funkcją mieszka w APLIKACJI, to
         właściwość, która deklaruje takie źródło, opisuje coś, czego w Ontology Managerze nie
         ma gdzie wyklikać. ⚠ Dokumentacja NIE WYLICZA jednak rodzajów źródła zamkniętą listą,
         więc to jest `ryzyko`, a nie `zlamanie` — regułę twardą stawia się na zdaniu „must”,
         a nie na naszym wnioskowaniu z trzech akapitów.
     ──────────────────────────────────────────────────────────────────────────────────────── */

  {
    const FOUNDRY_ZNA = new Set(['datasourceColumn', 'editOnly', 'linkedObjects']);
    for (const { ob, p } of wszystkieWlasciwosci) {
      const zrodlo = s(p.valueSource);
      regula(!zrodlo || FOUNDRY_ZNA.has(zrodlo), {
        id: 'P72', klasa: 'ryzyko', kategoria: 'wlasciwosci',
        co: `\`${ob.apiName}.${p.apiName}\` bierze wartość ze źródła, którego ontologia nie ma: \`${zrodlo}\``,
        gdzie: `objectTypes[${ob.apiName}].${p.apiName}`,
        dlaczego: 'Wartość właściwości pochodzi z kolumny zbioru źródłowego, z edycji albo '
          + 'z obiektów powiązanych. „Liczy to funkcja” nie jest czwartym rodzajem źródła — jest '
          + 'KOLUMNĄ APLIKACJI, czyli bytem widgetu tabeli. Właściwość, która tak deklaruje '
          + 'swoje źródło, obiecuje wartość, której poza waszą aplikacją nikt nie zobaczy: '
          + 'w kroku „wybierz właściwość do wyprowadzenia” się nie pokaże, a kryterium zgłoszenia '
          + 'nie ma jak o nią zapytać.',
        jak: 'Rozstrzygnij, czym to naprawdę jest. Wynik decyzji, który ma zostać → ZAPISUJ go '
          + '(akcja oparta o funkcję pisze właściwość zwykłą, a jeden pisarz i wyzwalacze mówią, '
          + 'kiedy). Odpowiedź liczona na żądanie → to jest FUNKCJA ODCZYTU i woła ją widok albo '
          + 'agent, a nie właściwość. Wartość z łańcucha linków → właściwość pochodna.',
        zrodlo: 'Derived properties → Configure („select the Source tab to configure where the '
          + 'property gets its values… In the Source type section, choose the Linked objects '
          + 'option”, docs:3301–3305) + Edit-only properties („not directly mapped to a column in '
          + 'the backing dataset”, docs:2739) + Functions → best practices („Function-backed '
          + 'columns are distinct from derived properties, which are configured directly in '
          + 'Workshop without writing code”, docs:10092; zakładanie kolumny — docs:13642–13650)',
      });
    }
  }

  /* P26 · ręcznie utrzymywany licznik/suma zamiast wartości pochodnej */
  for (const { ob, p } of wszystkieWlasciwosci) {
    const agregat = AGREGATY.test(s(p.apiName)) && ['int', 'integer', 'long', 'decimal', 'double'].includes(dolne(p.type));
    regula(!(agregat && !p.derived), {
      id: 'P26', klasa: 'podpowiedz', kategoria: 'wlasciwosci',
      co: `\`${ob.apiName}.${p.apiName}\` wygląda na licznik utrzymywany ręcznie`,
      gdzie: `objectTypes[${ob.apiName}].${p.apiName}`,
      dlaczego: 'Liczba policzalna z linków, trzymana jako zwykła właściwość, rozjeżdża się '
        + 'przy pierwszej akcji, która zapomni ją zaktualizować — i zostaje błędna do czasu, '
        + 'aż ktoś zauważy.',
      jak: 'Zrób z tego właściwość pochodną (łańcuch linków + agregacja `count`/`sum`). '
        + 'Jeśli to niemożliwe przy waszej skali, zapisz decyzję o denormalizacji razem ze '
        + 'źródłem prawdy i strategią odświeżania.',
      zrodlo: 'Structural guidance → Normalization and derived properties („Integer or count '
        + 'properties are manually maintained rather than computed from links”)',
    });
  }

  /* P27 · rodzina pól o wspólnym prefiksie prosi się o strukturę
     ⚠ OD ZESTAWU 2.0 BEZ KOLUMN KLUCZY OBCYCH: np. `toolKindCode` i `colorCode` na jednym typie
     to nie rodzina atrybutów jednego pojęcia, tylko kilka krawędzi do różnych katalogów —
     wspólny wyraz `Code` pochodzi z nazw kluczy głównych celów (`docs:3915`), a struktura niczego
     by tu nie zebrała: każda kolumna wskazuje inny typ. */
  const kolumnyObce = new Set(linki.flatMap((l) => [s(l.foreignKeyProperty), s(l.foreignKeyTypeProperty)]
    .filter((x) => x && x !== '?').map((x) => `${s(l.foreignKeyObjectType)}.${x}`)));
  for (const ob of obiekty) {
    const props = t(ob.properties).filter((p) => !kolumnyObce.has(`${ob.apiName}.${s(p.apiName)}`));
    const rodziny = new Map();
    for (let i = 0; i < props.length; i += 1) {
      for (let j = i + 1; j < props.length; j += 1) {
        const pref = prefiksWyrazowy(props[i].apiName, props[j].apiName);
        if (pref.length === 0) continue;
        /* ⚠ Klucz musi nieść RODZAJ sygnału. Bez prefiksu `p:` jednowyrazowa rodzina
           `speed` trafiała do tego samego kubełka, co rodzina „po rzeczowniku” — i dostawała
           wyższy próg, przez co znalezisko z pierwotnego `P27` po cichu znikało. */
        const k = `p:${pref.join('.')}`;
        if (!rodziny.has(k)) rodziny.set(k, new Set());
        rodziny.get(k).add(props[i].apiName).add(props[j].apiName);
      }
    }
    /* ⚠ DRUGA DETEKCJA: wspólny RZECZOWNIK gdziekolwiek w nazwie. Zmierzone na naszym
       manifeście: sam prefiks widział 17 z 59 pól `production.PlanningPolicy` — rodzina
       „zmiana” (`minShiftLength`, `maxShiftLength`, `shiftGridStep`, `maxShiftsPerDay`)
       była dla niego niewidzialna, bo wspólnego POCZĄTKU nie ma tam ani razu.
       Próg jest wyższy niż przy prefiksie: wspólny wyraz w środku nazwy to sygnał słabszy. */
    for (let i = 0; i < props.length; i += 1) {
      for (let j = i + 1; j < props.length; j += 1) {
        for (const w of rzeczowniki(props[i].apiName)) {
          if (!rzeczowniki(props[j].apiName).has(w)) continue;
          if (!rodziny.has(`r:${w}`)) rodziny.set(`r:${w}`, new Set());
          rodziny.get(`r:${w}`).add(props[i].apiName).add(props[j].apiName);
        }
      }
    }

    /* ⚠ JEDNA RODZINA — JEDNO ZNALEZISKO. Ta sama garść pól wpada tu dwa razy: raz jako
       rodzina po PREFIKSIE, raz po RZECZOWNIKU (`speedManual`… pasuje do obu). Bez tego
       filtra raport mówił dwa razy to samo, co czyta się jak dwa problemy. Zostaje sygnał
       mocniejszy (prefiks), a rodzina zawarta w większej wypada w całości. */
    const podpis = (zbior) => [...zbior].sort().join('|');
    const widziane = new Set();
    const wybrane = [...rodziny.entries()]
      .sort(([a], [b]) => (a.startsWith('p:') ? -1 : 1) - (b.startsWith('p:') ? -1 : 1))
      .filter(([, zbior]) => {
        if (widziane.has(podpis(zbior))) return false;
        const zawartaWWiekszej = [...rodziny.values()].some((inny) => inny !== zbior
          && inny.size > zbior.size && [...zbior].every((n) => inny.has(n)));
        if (zawartaWWiekszej) return false;
        widziane.add(podpis(zbior));
        return true;
      });

    for (const [pref, zbior] of wybrane) {
      const poPrefiksie = pref.startsWith('p:');
      const prog = poPrefiksie ? PROG.prefiksStruktury : PROG.wspolnyRzeczownik;
      if (zbior.size < prog) continue;
      regula(false, {
        id: 'P27', klasa: 'podpowiedz', kategoria: 'wlasciwosci',
        co: `\`${ob.apiName}\`: ${zbior.size} pól opisuje jedno pojęcie \`${pref.slice(2).replace(/\./g, ' ')}\``
          + ` (${[...zbior].slice(0, 4).join(', ')}${zbior.size > 4 ? '…' : ''})`,
        gdzie: `objectTypes[${ob.apiName}].properties`,
        /* ⚠ PEŁNA lista pól i stabilny klucz — po nich warstwa modelu POTWIERDZA albo ODRZUCA
           tego kandydata. Bez nich kod tylko krzyczy w próżnię, a rozstrzygnięcia nie ma. */
        elementy: [...zbior],
        prog: `≥ ${prog} pól o wspólnym ${poPrefiksie ? 'prefiksie' : 'rzeczowniku'}`,
        dlaczego: 'Pola, których spoiwem jest wspólny wyraz, CZĘSTO opisują jedno pojęcie '
          + 'rozsypane na kilka kolumn — a struktura trzyma je razem, pozwala dołożyć metadane '
          + '(źródło, pewność, czas) i wskazać pole główne. ⚠ CZĘSTO, NIE ZAWSZE: wspólny wyraz '
          + 'bywa przypadkiem (`medianCost` i `medianDelay` nie są jednym pojęciem), dlatego to '
          + 'znalezisko NIE KOSZTUJE PUNKTÓW i jest pytaniem, a nie zarzutem.',
        jak: 'Zamień rodzinę na jedną właściwość typu struct z polami w środku '
          + '(`address` z `street`/`city`/`postalCode` zamiast `addressStreet`, `addressCity`…).',
        zrodlo: 'Structural guidance → Structs („Ten unrelated properties with a naming convention '
          + 'as the only link between them” → „One semantic concept with main fields”)',
      });
    }
  }

  /* ────────────────────────────────────────────────────────────────────────────────────────
     RELACJE
     ──────────────────────────────────────────────────────────────────────────────────────── */

  /* P28 · obiekt bez ani jednego linku */
  {
    const wLinkach = new Set(linki.flatMap((l) => [l.from, l.to]));
    for (const ob of obiekty) {
      regula(wLinkach.has(ob.apiName) || obiekty.length <= 1, {
        id: 'P28', klasa: 'podpowiedz', kategoria: 'relacje',
        co: `\`${ob.apiName}\` nie ma ani jednego linku`,
        gdzie: `objectTypes[${ob.apiName}]`,
        dlaczego: 'Typ bez relacji jest wyspą: nie da się do niego dojść nawigacją ani zapytać '
          + 'o nic w kontekście. Ontologia bierze wartość z KRAWĘDZI, nie z samych tabel.',
        jak: 'Sprawdź, z czym ten byt się naprawdę wiąże. Jeśli z niczym — zapytaj, czy powinien '
          + 'być osobnym typem, czy właściwością czegoś innego.',
        zrodlo: 'Core concepts → Ontology („just as datasets can be joined together in various ways, '
          + 'objects can have links between them”)',
      });
    }
  }

  /* P29 · duplikat krawędzi: dwa linki między tą samą parą, w tę samą stronę */
  {
    const pary = new Map();
    for (const l of linki) {
      const k = `${l.from}→${l.to}`;
      if (!pary.has(k)) pary.set(k, []);
      pary.get(k).push(l);
    }
    for (const [k, lista] of pary) {
      if (lista.length < 2) continue;
      regula(false, {
        id: 'P29', klasa: 'uwaga', kategoria: 'relacje',
        co: `${lista.length} linków łączy tę samą parę w tę samą stronę (${k}): ${lista.map((l) => `\`${l.apiName}\``).join(', ')}`,
        gdzie: `linkTypes[${lista.map((l) => l.apiName).join(', ')}]`,
        dlaczego: 'Kilka krawędzi między tymi samymi typami to albo dwie prawdy o jednej relacji '
          + '(mogą się rozjechać), albo relacja, która niesie ATRYBUT i prosi się o obiekt pośredni.',
        jak: 'Jeśli to jedna relacja w kilku odcieniach → jeden link plus obiekt pośredni z atrybutem. '
          + 'Jeśli naprawdę różne → nazwy muszą mówić, czym się różnią.',
        zrodlo: 'Structural guidance → Links and object-backed link types („If it does (dates, roles, '
          + 'status), use an object-backed link type to capture that metadata”)',
      });
    }
  }

  /* ════════════════════════════════════════════════════════════════════════════════════════
     OBIEKT POŚREDNI — JEDEN PREDYKAT DLA `P30` I `P50`, bo te reguły są swoim dopełnieniem
     ────────────────────────────────────────────────────────────────────────────────────────
     Obiektem pośrednim relacji A↔B jest typ, który (1) NIE JEST żadnym z końców, (2) ma wyjścia
     do OBU końców i (3) nie ma wyjść DO NICZEGO WIĘCEJ. Trzeci warunek jest tu najważniejszy
     i wynika z pomiaru: bez niego każdy porządny rzeczownik dziedziny (u nas `production.Operation`
     z czterema linkami) udaje tabelę pośredniczącą dla dowolnej pary, której przypadkiem dotyka.
     ⚠ RELACJA ZWROTNA (A↔A) NIE MA POŚREDNIKA — przy `from === to` warunek „ma wyjście do obu
     końców” spełnia KAŻDY typ z jednym linkiem do A, co dawało siedem fałszywych trafień na osiem.
     ════════════════════════════════════════════════════════════════════════════════════════ */
  const posrednicyRelacji = (l) => {
    if (l.from === l.to) return [];
    return obiekty.filter((ob) => {
      if (ob.apiName === l.from || ob.apiName === l.to) return false;
      const wyjscia = linki.filter((x) => x.from === ob.apiName).map((x) => x.to);
      if (wyjscia.length === 0) return false;
      return wyjscia.includes(l.from) && wyjscia.includes(l.to)
        && wyjscia.every((cel) => cel === l.from || cel === l.to);
    }).map((ob) => ob.apiName);
  };

  /* ════════════════════════════════════════════════════════════════════════════════════════
     P50 · DWIE PRAWDY O JEDNEJ RELACJI — link N:M I obiekt pośredni naraz
     ────────────────────────────────────────────────────────────────────────────────────────
     ⚠ To jest DOKŁADNE DOPEŁNIENIE `P30`: tam relacja N:M nie ma obiektu, tu ma go i MIMO TO
     zostaje osobny link. Wtedy ta sama relacja stoi w modelu dwa razy, dwa razy się ją pisze,
     dwa razy może się rozjechać — a pytanie „kto obsługuje tę maszynę” ma dwie odpowiedzi.
     Foundry ma na to object-backed link type: JEDEN link, obiekt w tle.
     ⚠ Wąsko świadomie: wyłącznie krotność N:M. Zwykły link 1:N obok obiektu, który dotyka obu
     końców z innego powodu (faktura wskazuje zamówienie I klienta), to normalny model, a nie
     duplikat — i taka reguła sypałaby fałszywymi trafieniami u każdego.
     ════════════════════════════════════════════════════════════════════════════════════════ */
  /* ══════════════════════════════════════════════════════════════════════════════════════
     ⚠ CZYSTY OBIEKT ŁĄCZĄCY — DOSTROJENIE `P50` W ZESTAWIE 1.6

     Do 1.5 `P50` orzekała o duplikacie na podstawie samej TOPOLOGII: jeśli jakiś typ ma wyjścia
     do obu końców krawędzi `N:M` i do niczego więcej, uznawała go za drugą reprezentację tej
     samej relacji. To jest za szeroko i źródło mówi dlaczego: „Not every linking object needs to
     be visible in every context. Some workflows care about the join metadata, others just want the
     direct connection. **Object-backed links let you expose either view depending on the
     workflow**” (`docs:20062`). Czyli link OBOK obiektu nie jest sam z siebie dubletem — bywa
     drugim WIDOKIEM tej samej rzeczy, i to widokiem, który dokumentacja zaleca.

     ⚠ CO ODRÓŻNIA DUBLET OD ENCJI: TREŚĆ, a nie kształt grafu. Obiekt, który poza kluczem głównym
     i dwoma kluczami obcymi nie niesie NICZEGO, jest tabelą pośredniczacą przebraną za typ — i wtedy
     dwa byty naprawdę mówią to samo. Obiekt z własnymi właściwościami (ilość, chwile, rola, status)
     jest ENCJĄ, która tylko DZIELI parę końców — tak jak `Employee → VentureStaffing → Venture`
     z `role`, `startDate` i `allocation` (`docs:20060`, `docs:20071–20083`).

     ⚠ I TRZECI PRZYPADEK: gdy model JAWNIE deklaruje, który obiekt podpiera tę krawędź
     (`backingObjectType`), pytanie jest już rozstrzygnięte — u Foundry tak się właśnie buduje
     object-backed link type: „The object in the middle serves as the intermediary and provides
     additional metadata about the connection between the two entities, and **backs the link**”
     (`docs:3953`). Wtedy reguła milczy, bo nie ma dwóch prawd — jest jedna, opisana dwoma polami.
     ══════════════════════════════════════════════════════════════════════════════════════ */
  const czystyObiektLaczacy = (nazwaObiektu) => {
    const ob = obiekty.find((x) => x.apiName === nazwaObiektu);
    if (!ob) return false;
    const klucz = new Set(
      (Array.isArray(ob.primaryKey) ? ob.primaryKey : [ob.primaryKey]).map(s).filter(Boolean),
    );
    /* Kolumny kluczy obcych TEGO typu — z krawędzi, które na nim stoją. */
    const obce = new Set(linki
      .filter((x) => s(x.foreignKeyObjectType) === s(nazwaObiektu))
      .map((x) => s(x.foreignKeyProperty)).filter((n) => n && n !== '?'));
    const wlasne = t(ob.properties).map((x) => s(x.apiName))
      .filter((n) => n && !klucz.has(n) && !obce.has(n));
    return wlasne.length === 0;
  };

  for (const l of linki) {
    if (l.cardinality !== 'MANY_TO_MANY') continue;
    /* ⚠ MODEL JUŻ POWIEDZIAŁ, ŻE TO JEST OBJECT-BACKED LINK — nie ma dwóch prawd (docs:3953). */
    const posrednicy = s(l.backingObjectType) ? [] : posrednicyRelacji(l).filter(czystyObiektLaczacy);
    regula(posrednicy.length === 0, {
      id: 'P50', klasa: 'ryzyko', kategoria: 'relacje',
      co: `relacja \`${l.apiName}\` (${l.from} ↔ ${l.to}) stoi w modelu DWA RAZY — `
        + `jako link N:M i jako CZYSTY OBIEKT ŁĄCZĄCY \`${posrednicy[0]}\` (poza kluczem głównym `
        + 'i kluczami obcymi nie niesie ani jednej własnej właściwości)',
      gdzie: `linkTypes[${l.apiName}]`,
      dlaczego: 'Ta sama relacja opisana dwoma bytami ma dwie prawdy: pytanie „kto z kim” dostaje '
        + 'dwie odpowiedzi, każda akcja musi pamiętać o obu, a przy pierwszym rozjeździe nie widać, '
        + 'która jest ważniejsza. Foundry mówi to wprost o powtarzaniu tej samej relacji i wprost '
        + 'o duplikatach: jeden byt ma mieć jedną kanoniczną reprezentację.',
      jak: 'Zostaw JEDNĄ. Relacja niesie własne fakty (od kiedy, na jakim poziomie, kto potwierdził) '
        + '→ zostaje obiekt, a link N:M znika (albo staje się object-backed link type, czyli jednym '
        + 'linkiem z obiektem w tle). Relacja nie niesie nic → zostaje link, obiekt znika.',
      zrodlo: 'Object & link types („there is no need to separately define a link type from `Aircraft` '
        + 'to `Flight` and another from `Flight` to `Aircraft` to represent the same relationship”); '
        + 'Best practices → DRY („The goal is a single canonical representation for each concept”); '
        + 'Structural guidance → Links („Not every linking object needs to be visible in every '
        + 'context… Object-backed links let you expose either view depending on the workflow”, '
        + 'docs:20062 — stąd zawężenie do CZYSTEGO obiektu łączącego) + Create a link type → Backing '
        + 'object relationship type („The object in the middle… backs the link”, docs:3953)',
    });
  }

  /* P30 · N:M bez obiektu pośredniego — kandydat na object-backed link */
  for (const l of linki) {
    if (l.cardinality !== 'MANY_TO_MANY') continue;
    const maPosrednika = posrednicyRelacji(l).length > 0;
    regula(maPosrednika, {
      id: 'P30', klasa: 'podpowiedz', kategoria: 'relacje',
      co: `\`${l.apiName}\` (${l.from} ↔ ${l.to}) jest N:M bez obiektu pośredniego`,
      gdzie: `linkTypes[${l.apiName}]`,
      dlaczego: 'Link w Foundry jest GOŁĄ krawędzią — nie unosi właściwości. Relacja wiele-do-wielu '
        + 'prawie zawsze ma jednak własną treść (od kiedy, w jakiej roli, w jakim wymiarze), '
        + 'a ta treść nie ma się gdzie zapisać.',
      jak: 'Jeśli relacja niesie atrybut, zrób z niej OBIEKT między dwoma typami. '
        + 'Jeśli nie niesie — zostaw i zapisz, że sprawdzone.',
      zrodlo: 'Structural guidance → Links („Direct link: the relationship is meaningful but carries '
        + 'no metadata of its own. Object-backed link: the relationship carries its own metadata”)',
    });
  }

  /* ────────────────────────────────────────────────────────────────────────────────────────
     CYKL ŻYCIA — status i widoczność
     ──────────────────────────────────────────────────────────────────────────────────────── */

  const STATUSY = ['active', 'experimental', 'deprecated', 'example', 'promoted'];
  const RANGA = { example: 0, experimental: 1, deprecated: 1, active: 2, promoted: 3 };
  const zasoby = [
    ...obiekty.map((x) => ({ x, rodzaj: 'objectTypes' })),
    ...linki.map((x) => ({ x, rodzaj: 'linkTypes' })),
    ...akcje.map((x) => ({ x, rodzaj: 'actionTypes' })),
    ...interfejsy.map((x) => ({ x, rodzaj: 'interfaces' })),
  ];
  /* P31 · brak statusu. ⚠ JEDNO ZNALEZISKO NA RODZAJ ZASOBU, nie na zasób: brak statusu jest
     z reguły systemowy (cała grupa go nie ma), a 80 identycznych wierszy w raporcie nie niesie
     ani jednej informacji więcej niż jeden wiersz z liczbą. */
  for (const rodzaj of ['objectTypes', 'linkTypes', 'actionTypes', 'interfaces']) {
    const grupa = zasoby.filter((z) => z.rodzaj === rodzaj);
    if (grupa.length === 0) continue;
    const bez = grupa.filter(({ x }) => !STATUSY.includes(dolne(x.status)));
    regula(bez.length === 0, {
      id: 'P31', klasa: 'ryzyko', kategoria: 'cykl-zycia',
      co: `${bez.length} z ${grupa.length} zasobów \`${rodzaj}\` nie deklaruje statusu`,
      gdzie: `${rodzaj}[*].status`,
      dlaczego: 'W Foundry status ma KAŻDY zasób ontologii — typ, właściwość, link, akcja, interfejs '
        + '— i platforma wymusza spójność między nimi. Bez statusu konsument nie wie, na czym wolno '
        + 'budować, a platforma nie ma czego chronić: zasób `active` nie może zmienić nazwy API '
        + 'ani zostać skasowany, a `experimental` może zniknąć bez ostrzeżenia.',
      jak: `Dopisz jeden z: ${STATUSY.join(' · ')}. Domyślny dla nowego zasobu to \`experimental\`. `
        + 'Zacznij od akcji — to one zmieniają stan, więc obietnica ich stabilności kosztuje najwięcej.',
      zrodlo: 'Statuses („Every object type, property, link type, action, or interface in the Ontology '
        + 'has a status that indicates developmental state”)',
    });
  }

  /* ════════════════════════════════════════════════════════════════════════════════════════
     P81 · KLUCZ OBCY WYGASZONY, A KRAWĘDŹ NA NIM STOJĄCA — NIE

     Platforma orzeka o tym osobnym błędem i mówi to jednym zdaniem: „If you receive the error
     `OntologyMetadata:ConflictBetweenLinkTypeStatusAndPropertyTypeStatus`, there is a conflict
     between the status on a link type and the status on a property. For example, **if a foreign
     key is deprecated, link types that reference that foreign key should also be deprecated**”
     (`docs:4597`). Sąsiednia reguła `P32` pyta o KOŃCE krawędzi (`docs:4601`); ta pyta o KOLUMNĘ,
     w której krawędź naprawdę siedzi — a to jest inne pytanie i inny błąd platformy.
     ⚠ WYGASZENIE CZYTAMY DWOJAKO: po statusie `deprecated` i po zadeklarowanym `sunset`. Model,
     który mówi „to pole schodzi” drugim z tych sposobów, mówi dokładnie to samo.
     ════════════════════════════════════════════════════════════════════════════════════════ */
  {
    const wlasciwoscPo = new Map(wszystkieWlasciwosci
      .map(({ ob, p }) => [`${ob.apiName}.${s(p.apiName)}`, p]));
    const wygaszona = (p) => dolne(p?.status) === 'deprecated' || Boolean(p?.sunset);
    for (const l of linki) {
      const kolumna = s(l.foreignKeyProperty);
      const typ = s(l.foreignKeyObjectType);
      if (!kolumna || kolumna === '?' || !typ) continue;
      const p = wlasciwoscPo.get(`${typ}.${kolumna}`);
      regula(!p || !wygaszona(p) || dolne(l.status) === 'deprecated', {
        id: 'P81', klasa: 'zlamanie', kategoria: 'cykl-zycia',
        co: `krawędź \`${l.apiName}\` stoi na wygaszanym kluczu obcym \`${typ}.${kolumna}\`, a sama jest \`${dolne(l.status) || 'bez statusu'}\``,
        gdzie: `linkTypes[${l.apiName}].status`,
        dlaczego: 'Krawędź z końcem „jeden” NIE MA własnego bytu — jest kolumną. Wygaszenie tej '
          + 'kolumny przy żywej krawędzi znaczy, że model obiecuje przejście, które w dniu '
          + 'zdjęcia pola przestanie istnieć, i nikt tego nie zauważy do tamtego dnia.',
        jak: 'Wygaś krawędź razem z kolumną i wskaż następcę po obu stronach — albo przenieś '
          + 'krawędź na kolumnę, która zostaje.',
        zrodlo: 'Statuses → Troubleshooting → Conflicts between property status and link type '
          + 'status („if a foreign key is deprecated, link types that reference that foreign key '
          + 'should also be deprecated”, docs:4597)',
      });
    }
  }

  /* ════════════════════════════════════════════════════════════════════════════════════════
     P82 · KLUCZ OBCY KRAWĘDZI NIE JEST WŁAŚCIWOŚCIĄ ALBO MA INNY TYP NIŻ KLUCZ GŁÓWNY CELU
     P83 · NAZWA KLUCZA OBCEGO = NAZWA STRONY LINKU NA TYM SAMYM TYPIE

     „A **foreign key** is a property on one object type that stores the value of another object
     type's primary key… In a one-to-one or many-to-one cardinality link type, you will define the
     foreign key property and primary key properties for the link” (`docs:3915`) — klucz obcy JEST
     właściwością, a nie metadaną linku. Kreator wiąże go z kluczem głównym tylko wtedy, gdy „the
     property types of both objects match” (`docs:3923`). Strona linku jest członkiem obiektu
     (`Flight.assignedAircraft.get()`, `docs:3962`), więc właściwość o tej samej nazwie daje
     dwuznaczny członek.
     ⚠ KRAWĘDŹ `N:M` JEST POZA REGUŁĄ — tam relację niesie tabela łącząca (`docs:4917`). Krawędź
     `1:1` bez wyliczalnej strony (`foreignKeyObjectType` puste) też — strony nie da się zgadnąć, a
     reguła nie orzeka o tym, czego kanon nie powiedział.
     ⚠ PRZY CELU-KONTRAKCIE kanon ma krawędź już rozbitą na konkretne (wiązka), więc drugi koniec
     jest typem obiektu, a kolumna typu (`foreignKeyTypeProperty`) musi być właściwością tak samo.
     ════════════════════════════════════════════════════════════════════════════════════════ */
  {
    const obiektPo = new Map(obiekty.map((ob) => [ob.apiName, ob]));
    const wlasciwosc = (typ, nazwa) => t(obiektPo.get(typ)?.properties).find((p) => s(p.apiName) === nazwa);
    const typKlucza = (typ) => {
      const ob = obiektPo.get(typ);
      const k = Array.isArray(ob?.primaryKey) ? (ob.primaryKey.length === 1 ? ob.primaryKey[0] : undefined) : ob?.primaryKey;
      return k ? s(wlasciwosc(typ, s(k))?.type) : undefined;
    };
    const strony = new Map();
    for (const l of linki) {
      for (const n of [s(l.apiName), s(l.bundleApiName)].filter(Boolean)) strony.set(`${s(l.from)}.${n}`, s(l.apiName));
      if (s(l.reverseName)) strony.set(`${s(l.to)}.${s(l.reverseName)}`, s(l.apiName));
    }
    const widziane = new Set();
    for (const l of linki) {
      if (!['MANY_TO_ONE', 'ONE_TO_MANY', 'ONE_TO_ONE'].includes(l.cardinality)) continue;
      const typ = s(l.foreignKeyObjectType);
      if (!typ) continue;
      const cel = typ === s(l.from) ? s(l.to) : s(l.from);
      const kolumna = s(l.foreignKeyProperty);
      const p = kolumna && kolumna !== '?' ? wlasciwosc(typ, kolumna) : undefined;
      const oczek = typKlucza(cel);
      const typKol = s(l.foreignKeyTypeProperty);
      const pTyp = typKol ? wlasciwosc(typ, typKol) : undefined;
      regula(Boolean(p) && (!oczek || s(p.type) === oczek) && (!typKol || Boolean(pTyp)), {
        id: 'P82', klasa: 'zlamanie', kategoria: 'relacje',
        co: !kolumna || kolumna === '?'
          ? `krawędź \`${l.apiName}\` (${l.cardinality}) nie ma klucza obcego — nie wskazuje właściwości na \`${typ}\``
          : (!p ? `klucz obcy \`${typ}.${kolumna}\` krawędzi \`${l.apiName}\` nie jest właściwością tego typu`
            : (typKol && !pTyp ? `kolumna typu \`${typ}.${typKol}\` krawędzi \`${l.apiName}\` nie jest właściwością tego typu`
              : `klucz obcy \`${typ}.${kolumna}\` ma typ \`${s(p.type)}\`, a klucz główny \`${cel}\` — \`${oczek}\``)),
        gdzie: `linkTypes[${l.apiName}].foreignKeyProperty`,
        dlaczego: 'Krawędź z końcem „jeden” NIE MA u Foundry własnego bytu — jest WŁAŚCIWOŚCIĄ po stronie '
          + '„wiele”, przechowującą klucz główny drugiego typu. Bez tej właściwości (albo z innym typem niż '
          + 'klucz główny) Ontology Manager nie zbuduje link type, a akcja nie ma czego przestawić regułą '
          + 'Modify object (docs:4919).',
        jak: 'Dodaj właściwość klucza obcego do typu po stronie „wiele” — z typem klucza głównego celu — '
          + 'i wskaż ją w krawędzi; przy celu-kontrakcie także kolumnę typu implementatora.',
        zrodlo: 'Link types → Foreign key relationship („A foreign key is a property on one object type that '
          + 'stores the value of another object type\'s primary key”, docs:3915; „the property types of both '
          + 'objects match”, docs:3923)',
      });
      for (const kol of [kolumna, typKol].filter((x) => x && x !== '?')) {
        const klucz = `${typ}.${kol}`;
        if (widziane.has(klucz)) continue;
        widziane.add(klucz);
        regula(!strony.has(klucz), {
          id: 'P83', klasa: 'zlamanie', kategoria: 'nazewnictwo',
          co: `klucz obcy \`${klucz}\` nazywa się tak samo jak strona linku \`${strony.get(klucz)}\` na tym typie`,
          gdzie: `objectTypes[${typ}].properties[${kol}]`,
          dlaczego: 'Strona linku jest członkiem obiektu (`Flight.assignedAircraft.get()`) — właściwość o '
            + 'tej samej nazwie daje dwa członki pod jedną nazwą: raz wartość klucza, raz obiekt po drugiej '
            + 'stronie. Czytający kod nie wie, które dostanie.',
          jak: 'Przemianuj właściwość klucza obcego: rola + cel + sufiks klucza głównego (`assignedMachineId`, '
            + '`viewId`), a nazwę strony zostaw linkowi.',
          zrodlo: 'Link types → Search Around w OSDK („Flight.assignedAircraft.get()”, docs:3962)',
        });
      }
    }
  }

  /* P32 · link dojrzalszy niż jego końce */
  {
    const statusObiektu = new Map(obiekty.map((ob) => [ob.apiName, dolne(ob.status)]));
    for (const l of linki) {
      const r = RANGA[dolne(l.status)];
      if (r === undefined) continue;
      const konce = [statusObiektu.get(l.from), statusObiektu.get(l.to)].filter((v) => RANGA[v] !== undefined);
      if (konce.length === 0) continue;
      const najsłabszy = Math.min(...konce.map((v) => RANGA[v]));
      regula(r <= najsłabszy, {
        id: 'P32', klasa: 'zlamanie', kategoria: 'cykl-zycia',
        co: `link \`${l.apiName}\` jest \`${dolne(l.status)}\`, a jego koniec jest mniej dojrzały`,
        gdzie: `linkTypes[${l.apiName}].status`,
        dlaczego: 'Platforma wymusza tu spójność: jeśli choć jeden koniec linku zejdzie do '
          + '`experimental`, link schodzi razem z nim. Link dojrzalszy niż typ, który łączy, '
          + 'obiecuje stabilność, której nikt nie może dotrzymać.',
        jak: 'Zrównaj status linku ze słabszym z jego końców — albo podnieś status końca.',
        zrodlo: 'Statuses → Link type status rules („If at least one object type in a link type is '
          + 'changed to experimental, the link type will automatically be changed to experimental”)',
      });
    }
  }

  /* P33 · brak widoczności na typach nie-domenowych */
  {
    const bezWidocznosci = obiekty.filter((ob) => !['prominent', 'normal', 'hidden'].includes(dolne(ob.visibility)));
    regula(bezWidocznosci.length === 0, {
      id: 'P33', klasa: 'uwaga', kategoria: 'cykl-zycia',
      co: `${bezWidocznosci.length} z ${obiekty.length} typów nie deklaruje widoczności`,
      gdzie: 'objectTypes[*].visibility',
      dlaczego: 'Widoczność jest wskazówką dla aplikacji, jak eksponować typ. Bez niej wszystko '
        + 'jest równie ważne — a typy techniczne (dziennik, definicja widoku, log) stoją obok '
        + 'rzeczowników z hali i zaśmiecają domyślny widok modelu.',
      jak: 'Typom nie-domenowym nadaj `hidden`, rdzeniowym `prominent`, reszcie `normal`. '
        + '⚠ `hidden` to wskazówka dla UI, NIE uprawnienie — bezpieczeństwo robi się osobno.',
      zrodlo: 'Best practices → Domain-driven design („Mark non-semantic types as hidden… to keep '
        + 'default views of the Ontology clean”)',
    });
  }

  /* P34 · deprecated bez następcy */
  for (const { x, rodzaj } of zasoby) {
    if (dolne(x.status) !== 'deprecated') continue;
    regula(s(x.replacedBy).length > 0 || s(x.deprecationNote).length > 0, {
      id: 'P34', klasa: 'ryzyko', kategoria: 'cykl-zycia',
      co: `\`${x.apiName}\` jest \`deprecated\` i nie mówi, co go zastępuje`,
      gdzie: `${rodzaj}[${x.apiName}]`,
      dlaczego: 'Wycofanie bez następcy i bez terminu jest ostrzeżeniem, na które nie da się '
        + 'zareagować. Foundry żąda przy tym statusie opisu, terminu i zasobu zastępującego.',
      jak: 'Dopisz powód, termin zniknięcia i wskaż zasób, na który przechodzi się konsument.',
      zrodlo: 'Statuses → Deprecated („includes metadata with a description for why it is being '
        + 'deprecated, a deadline… and the resource meant to replace it”)',
    });
  }

  /* ────────────────────────────────────────────────────────────────────────────────────────
     TOŻSAMOŚĆ — klucz główny
     ──────────────────────────────────────────────────────────────────────────────────────── */

  for (const ob of obiekty) {
    const klucz = ob.primaryKey;
    const nazwyPol = new Set(t(ob.properties).map((p) => s(p.apiName)));

    /* P70 · klucz główny albo klucz tytułu stoi na typie, którego tabela do tego nie dopuszcza
       ⚠ TO SĄ DWIE RÓŻNE KOLUMNY TEJ SAMEJ TABELI i różnią się treścią: `Array` wolno postawić
       jako klucz TYTUŁU (gdy typ elementu też wolno), ale nie jako klucz GŁÓWNY; `Struct` nie
       wolno ani tu, ani tu (`docs:2434–2435`). Reguła pyta o typ BAZOWY, więc działa niezależnie
       od tego, jak model nazywa swoje typy. */
    {
      const poNazwie = new Map(t(ob.properties).map((p) => [s(p.apiName), p]));
      const czlonyKlucza = Array.isArray(klucz) ? klucz.map(s) : (s(klucz) ? [s(klucz)] : []);
      const zleKlucz = czlonyKlucza
        .map((n) => poNazwie.get(n)).filter(Boolean)
        .filter((p) => NIE_NA_KLUCZ.has(bazowy(p)))
        .map((p) => `klucz główny \`${s(p.apiName)}\`: ${bazowy(p)}`);
      const tytul = poNazwie.get(s(ob.titleProperty));
      const zleTytul = tytul && NIE_NA_TYTUL.has(bazowy(tytul))
        ? [`klucz tytułu \`${s(tytul.apiName)}\`: ${bazowy(tytul)}`] : [];
      const zle = [...zleKlucz, ...zleTytul];
      regula(zle.length === 0, {
        id: 'P70', klasa: 'zlamanie', kategoria: 'tozsamosc',
        co: `\`${ob.apiName}\`: ${zle.join(', ')}`,
        gdzie: `objectTypes[${ob.apiName}].primaryKey`,
        dlaczego: 'Tabela typów bazowych mówi przy każdym typie, czy wolno go postawić jako klucz '
          + 'tytułu i jako klucz główny. Tablica i struktura nie nadają się na klucz główny, bo '
          + 'tożsamość musi być pojedynczą, porównywalną wartością; struktura nie nadaje się także '
          + 'na tytuł, bo nie ma jednej wartości do pokazania.',
        jak: 'Postaw klucz na skalarze — najlepiej `String` — a strukturę albo tablicę zostaw '
          + 'jako zwykłą właściwość.',
        zrodlo: 'Properties → Supported property types („Array | Yes | No | … If the inner type of '
          + 'the Array is not a valid title property, the Array property also cannot be used as '
          + 'the title property” · „Struct | No | No | Struct properties do not support nesting”, '
          + 'docs:2434–2435)',
      });
    }

    /* P35 · brak klucza głównego */
    regula(klucz !== undefined && klucz !== null && String(klucz).length > 0, {
      id: 'P35', klasa: 'zlamanie', kategoria: 'tozsamosc',
      co: `\`${ob.apiName}\` nie wskazuje klucza głównego`,
      gdzie: `objectTypes[${ob.apiName}].primaryKey`,
      dlaczego: 'Bez klucza nie ma tożsamości: nie da się przypiąć edycji, zbudować linku ani '
        + 'zaindeksować typu. To jest jedyne pole, bez którego typ obiektu w Foundry nie zapisze się wcale.',
      jak: 'Wskaż JEDNĄ właściwość, której wartość jest unikalna dla każdego egzemplarza.',
      zrodlo: 'Create an object type → „Primary key: the property that acts as a unique identifier '
        + 'for each instance of an object type”',
    });

    /* P36 · klucz złożony — w Foundry klucz główny to JEDNA właściwość */
    regula(!Array.isArray(klucz) || klucz.length <= 1, {
      id: 'P36', klasa: 'podpowiedz', kategoria: 'tozsamosc',
      co: `\`${ob.apiName}\` ma klucz złożony z ${Array.isArray(klucz) ? klucz.length : 0} pól`,
      gdzie: `objectTypes[${ob.apiName}].primaryKey`,
      dlaczego: 'Klucz główny w Foundry jest JEDNĄ właściwością. Złożenie z kilku kolumn robi się '
        + 'w rurze (deterministycznie), a ontologia widzi gotowe pole — inaczej każda zmiana '
        + 'któregokolwiek członu jest zmianą tożsamości.',
      jak: 'Policz klucz w rurze i wskaż tu jedno wynikowe pole. '
        + 'Zapisz, z czego się składa, żeby dało się je odtworzyć.',
      zrodlo: 'Create an object type („the primary key is the function of either a single column '
        + 'or multiple columns”, ale ontologia wskazuje JEDNĄ property)',
    });

    /* P37 · klucz złożony z pola przeznaczonego do wycofania */
    const czlony = Array.isArray(klucz) ? klucz : [klucz].filter(Boolean);
    const wycofywane = t(ob.properties).filter((p) => p.sunset && czlony.includes(p.apiName));
    regula(wycofywane.length === 0, {
      id: 'P37', klasa: 'zlamanie', kategoria: 'tozsamosc',
      co: `klucz \`${ob.apiName}\` zawiera pole przeznaczone do wycofania: ${wycofywane.map((p) => `\`${p.apiName}\``).join(', ')}`,
      gdzie: `objectTypes[${ob.apiName}].primaryKey`,
      dlaczego: 'Zdjęcie członu klucza NIE JEST usunięciem kolumny — jest zmianą tożsamości '
        + 'każdego istniejącego egzemplarza. Edycje są trwale przypięte do wartości klucza, '
        + 'więc zmiana klucza kasuje historię edycji i potrafi zerwać linki.',
      jak: 'Zaplanuj to jako migrację tożsamości, nie jako usunięcie pola: '
        + 'nowy klucz, przepisanie wszystkiego, co na niego wskazuje, i moment, w którym to się dzieje.',
      zrodlo: 'Create an object type („Edits are permanently attached to the primary key value you '
        + 'made them for. Any time you change the primary key… you will be prompted to delete all '
        + 'existing edits”)',
    });

    /* P38 · klucz niedeterministyczny */
    const podejrzany = czlony.some((c) => /^(row|rownum|rowid|index|idx|seq|sequence|uuid|guid|rand)/i.test(s(c)));
    regula(!podejrzany, {
      id: 'P38', klasa: 'podpowiedz', kategoria: 'tozsamosc',
      co: `klucz \`${ob.apiName}\` wygląda na niedeterministyczny (${czlony.join(', ')})`,
      gdzie: `objectTypes[${ob.apiName}].primaryKey`,
      dlaczego: 'Klucz, który zmienia się przy przebudowie danych, gubi edycje i zrywa linki — '
        + 'a dzieje się to po cichu, bo nic nie jest formalnie niepoprawne.',
      jak: 'Zbuduj klucz z wartości biznesowych, które nie zmieniają się między przebiegami.',
      zrodlo: 'Create an object type („Primary keys should be deterministic… Avoid using numbered '
        + 'row or random key generation, since these can cause primary keys to change between build runs”)',
    });

    /* P39 · klucz wskazuje pole, którego nie ma */
    for (const c of czlony) {
      if (nazwyPol.size === 0) break;
      regula(nazwyPol.has(s(c)), {
        id: 'P39', klasa: 'zlamanie', kategoria: 'tozsamosc',
        co: `klucz \`${ob.apiName}\` wskazuje pole \`${c}\`, którego typ nie ma`,
        gdzie: `objectTypes[${ob.apiName}].primaryKey`,
        dlaczego: 'Klucz główny JEST właściwością — wskazanie, które nie trafia w żadne pole, '
          + 'znaczy, że typ nie ma tożsamości.',
        jak: 'Dopisz tę właściwość albo wskaż istniejącą.',
        zrodlo: 'Core concepts → Property / Create an object type (klucz jest wskazaniem property)',
      });
    }
  }

  /* ────────────────────────────────────────────────────────────────────────────────────────
     BEZPIECZEŃSTWO
     ──────────────────────────────────────────────────────────────────────────────────────── */

  {
    const wrazliwe = wszystkieWlasciwosci.filter(({ p }) => SLOWA_WRAZLIWE.test(s(p.apiName)));
    const bezKlasy = wrazliwe.filter(({ p }) => !s(p.classification));
    /* P40 · pole o wrażliwej nazwie bez klasyfikacji */
    regula(bezKlasy.length === 0, {
      id: 'P40', klasa: 'podpowiedz', kategoria: 'bezpieczenstwo',
      co: `${bezKlasy.length} pól o wrażliwej nazwie nie ma klasyfikacji: ${bezKlasy.slice(0, 4).map(({ ob, p }) => `\`${ob.apiName}.${p.apiName}\``).join(', ')}`,
      gdzie: 'objectTypes[*].properties[*].classification',
      dlaczego: 'Cena, koszt, marża, adres, e-mail czy dane medyczne to pola, o które ktoś prędzej '
        + 'czy później zapyta „kto to widzi”. Jeśli odpowiedź jest w kodzie aplikacji, a nie '
        + 'w modelu, to jest krucha i nieaudytowalna.',
      jak: 'Nadaj klasyfikację na poziomie właściwości (kolumny). Domyślna otwartość jest '
        + 'w porządku, o ile jest ŚWIADOMA i zapisana.',
      zrodlo: 'Structural guidance → Security design („Column-level: the properties a user can view '
        + 'on visible objects”; „Ad-hoc filtering instead of policy… is fragile and difficult to audit”)',
    });

    /* P41 · brak osi wierszowej */
    const maOsWierszowa = obiekty.some((ob) => ob.rowPolicy || ob.rowLevelSecurity);
    regula(maOsWierszowa || wrazliwe.length === 0, {
      id: 'P41', klasa: 'uwaga', kategoria: 'bezpieczenstwo',
      co: 'model nie deklaruje ani jednej granicy wierszowej',
      gdzie: 'objectTypes[*]',
      dlaczego: 'Bezpieczeństwo w Foundry ma dwie osie: wiersz (które obiekty widzę) i kolumnę '
        + '(które pola). Sama kolumna nie wyrazi zdania „kierownik widzi swoją zmianę” — '
        + 'a to jest najczęstsza granica w zakładzie.',
      jak: 'Opisz granicę wierszową RELACJĄ modelu (np. „przez link do zmiany”), nie filtrem '
        + 'w aplikacji. ⚠ Nie zgaduj tej granicy — zgadnięta wygląda w modelu jak ustalona.',
      zrodlo: 'Structural guidance → Security design („Combine row-level and column-level security '
        + 'for fine-grained cell-level access control”)',
    });
  }

  /* ────────────────────────────────────────────────────────────────────────────────────────
     DOKUMENTACJA
     ──────────────────────────────────────────────────────────────────────────────────────── */

  {
    const doOpisania = [
      ...obiekty.map((x) => ({ x, rodzaj: 'objectTypes' })),
      ...linki.map((x) => ({ x, rodzaj: 'linkTypes' })),
      ...akcje.map((x) => ({ x, rodzaj: 'actionTypes' })),
      ...interfejsy.map((x) => ({ x, rodzaj: 'interfaces' })),
    ];
    const bezOpisu = doOpisania.filter(({ x }) => !maOpis(x));
    /* P42 · zasoby bez opisu */
    regula(bezOpisu.length === 0, {
      id: 'P42', klasa: 'uwaga', kategoria: 'dokumentacja',
      co: `${bezOpisu.length} z ${doOpisania.length} zasobów nie ma opisu`,
      gdzie: bezOpisu.slice(0, 5).map(({ x, rodzaj }) => `${rodzaj}[${x.apiName}]`).join(', ') || 'ontologia',
      dlaczego: 'Opis jest tym, co odróżnia model od listy tabel — i jedyną rzeczą, z której '
        + 'człowiek albo agent dowie się, co ten byt znaczy w TEJ organizacji.',
      jak: 'Jedno zdanie przy każdym zasobie: czym jest i kto go używa.',
      zrodlo: 'Best practices → Design guidelines („Document your decisions: document object types, '
        + 'properties, and links in Ontology Manager”)',
    });

    /* P43 · właściwości bez opisu */
    const polaBezOpisu = wszystkieWlasciwosci.filter(({ p }) => !maOpis(p));
    regula(polaBezOpisu.length <= Math.floor(wszystkieWlasciwosci.length * 0.25), {
      id: 'P43', klasa: 'uwaga', kategoria: 'dokumentacja',
      co: `${polaBezOpisu.length} z ${wszystkieWlasciwosci.length} właściwości nie ma opisu`,
      gdzie: 'objectTypes[*].properties',
      prog: '> 25% właściwości bez opisu',
      dlaczego: 'Właściwość bez opisu zmusza czytelnika do wnioskowania z nazwy — a to jest '
        + 'dokładnie ten moment, w którym dwa zespoły zaczynają rozumieć ją inaczej.',
      jak: 'Opisz przynajmniej te, których nazwa nie jest samotłumacząca.',
      zrodlo: 'Anti-patterns → The Misnomer („Add descriptions to all Ontology elements explaining '
        + 'their meaning and valid values”)',
    });
  }

  /* ────────────────────────────────────────────────────────────────────────────────────────
     TYP ONTOLOGII kontra TYP Z REPOZYTORIUM FUNKCJI (P44 · P45)
     ────────────────────────────────────────────────────────────────────────────────────────

     ⚠ TO SĄ DWIE RÓŻNE RZECZY I FOUNDRY MÓWI TO WPROST:

       „Custom types used in function signatures are DIFFERENT from the generated classes
        used for Ontology struct properties.”  (Functions → Types reference → Struct/custom type)

     • TYP ONTOLOGII (shared / struct property type) — zakłada się go w Ontology Managerze
       i jest TYPEM POLA obiektu albo parametru akcji. Ma RID, metadane, kolumnę „Usage”.
     • TYP Z REPOZYTORIUM FUNKCJI (custom type) — mieszka w KODZIE funkcji jako `interface`
       (TypeScript) albo klasa (Python). Ontologia zna SYGNATURĘ funkcji; definicja rekordu
       leży obok, w repo. W Ontology Managerze nie ma go wcale.

     Dlaczego to nie jest formalność: typ, który nigdzie nie jest właściwością, założony jako
     shared property type, stoi w rejestrze z PUSTĄ kolumną „Usage”. Pięćdziesiąt takich wpisów
     to Kitchen Sink zastosowany do rejestru typów — model robi się nieprzeglądalny, a osoba
     wdrażająca klika pięćdziesiąt razy coś, czego nikt nie użyje.

     ⚠ TYP UŻYWANY PRZEZ OBOJE ZOSTAJE W ONTOLOGII i to NIE jest wyjątek od reguły, tylko jej
     część: funkcje w Foundry normalnie biorą typy ontologiczne. Reguła pyta „czy to jest
     WYŁĄCZNIE typ kodu”, a nie „czy funkcja tego dotyka”.

     ⚠ ZAGNIEŻDŻENIE DZIEDZICZY PRZYNALEŻNOŚĆ. `core.SolverInput` niesie `core.SolverTask`;
     jeżeli pierwszy jest typem kodu, drugi też nim jest, choćby nie stał w żadnej sygnaturze
     wprost. Bez tego kroku reguła oskarżałaby o złe miejsce typy, które po prostu siedzą
     w środku innych — czyli produkowałaby szum tam, gdzie model jest poprawny. */
  {
    const wszystkieTypy = [
      ...wspolne.map((x) => ({ ...x, grupa: 'sharedPropertyTypes' })),
      ...t(o.functionTypes).map((x) => ({ ...x, grupa: 'functionTypes' })),
    ];
    const poId = new Map(wszystkieTypy.map((x) => [s(x.apiName), x]));

    /** Czy napis typu wymienia ten identyfikator. Łapie `X`, `struct(X)`, `list(struct(X))`, `array<X>`. */
    const wymienia = (napisTypu, id) => {
      const n = s(napisTypu);
      if (!n || !id) return false;
      return n === id || new RegExp(`(^|[^A-Za-z0-9_.])${id.replace(/\./g, '\\.')}([^A-Za-z0-9_.]|$)`).test(n);
    };
    /* ⚠ `valueType` LICZY SIĘ JAKO UŻYCIE — poprawka zestawu 1.4. Do 1.3 reguła widziała wyłącznie
       napis typu i `sharedPropertyType`, więc typ wskazany polem `valueType` był dla niej
       NIEWIDZIALNY: wypadał jako sierota (`P46`), choć ontologia bierze go wprost. To nie jest
       zginanie miary pod jeden manifest — to jest domknięcie reguły do zasobu, który Foundry ma
       osobno: *value type* przypisuje się do właściwości, do shared property i do parametru akcji,
       więc każde z tych miejsc JEST jego konsumentem. */
    const uzytyW = (miejsca, id) => miejsca.some((m) =>
      wymienia(m?.typeRaw, id) || wymienia(m?.type, id)
      || s(m?.sharedPropertyType) === id || s(m?.valueType) === id);

    const polaObiektow = obiekty.flatMap((ob) => t(ob.properties));
    const polaInterfejsow = interfejsy.flatMap((i) => t(i.properties));
    /* ═══════════════════════════════════════════════════════════════════════════════════════
       ⚠⚠ PARAMETR AKCJI OPARTEJ O FUNKCJĘ NIE JEST POWIERZCHNIĄ ONTOLOGII — JEST SYGNATURĄ
       (zestaw 1.8, 3.1 · K12b). Do 1.7 stało tu jedno zdanie: „parametr akcji = powierzchnia
       ontologii”, bez pytania, SKĄD ten parametr się wziął. Dla akcji deklaratywnej to prawda:
       parametr zakłada się w Ontology Managerze i trzeba mu WYBRAĆ typ z rejestru, więc typ
       z repozytorium funkcji nie ma tam czego wybrać (`P45`). Przy akcji z regułą `Run function`
       strzałka leci ODWROTNIE i Foundry mówi to jednym zdaniem: „Every input of the function is
       created as a parameter on the action type” (`docs:4927`) — parametr jest SKUTKIEM sygnatury,
       a nie jej warunkiem. Typ takiego wejścia wolno więc wziąć z repozytorium kodu: `docs:8315`
       pokazuje wprost `interface TicketInfo` z polami będącymi REFERENCJAMI DO OBIEKTÓW, użyty
       jako `ticketInfo: TicketInfo[]` w funkcji edycji („creating multiple instances of an object
       type derived from other object types”), a `docs:5946` wymaga od wsadowej akcji funkcyjnej
       parametru, który „must contain a list of structs”. Obu tych kształtów nie da się zapisać
       parametrem `STRUCT` z Ontology Managera, bo tamten bierze wyłącznie skalary i wolno mu
       tylko wypełnić struct property (`docs:5799`).

       ⚠ CO TO ZNACZY DLA REGUŁ: `P45` przestaje oskarżać typ kodu o to, że stoi przy takim
       parametrze, a `P52` przestaje wymagać od niego płaskich pól — bo w repozytorium funkcji
       zagnieżdżenie jest zwykłym `interface`em w `interface`ie. Dla akcji deklaratywnej NIC się
       nie zmienia i obie reguły trzymają tam pełną ostrość: to jest zawężenie do jednego,
       nazwanego przypadku, a nie furtka.

       ⚠ DLACZEGO NIE „ZGIĘCIE MIARY POD MANIFEST”: rozjemcą jest dokumentacja, nie silnik.
       Kanon już dziś zna tę stronę — przy regule `runFunction` dokłada SYNTETYCZNĄ funkcję edycji,
       której `inputs` to parametry akcji, i pisze przy niej ten sam `docs:4927`. Reguła po prostu
       czytała tylko jedną z dwóch stron tego samego faktu. Parametry dokładamy do `sygnatury`
       JAWNIE, żeby rachunek nie wisiał na tym, czy kanon akurat ten wpis wyprodukował. */
    const opartaOFunkcje = (a) => t(a.rules).some((r) => s(r.op) === 'runFunction');
    const parametryDeklaratywne = akcje.filter((a) => !opartaOFunkcje(a)).flatMap((a) => t(a.parameters));
    const parametryFunkcyjne = akcje.filter(opartaOFunkcje).flatMap((a) => t(a.parameters));
    const powierzchniaOntologii = [...polaObiektow, ...polaInterfejsow, ...parametryDeklaratywne];
    /* ⚠ POWIERZCHNIA KODU to nie tylko sygnatury funkcji. Rekord, który akcja ODDAJE, i koperta,
       którą PRZYJMUJE, też są typami kodu: w Ontology Managerze akcji nie deklaruje się własnego
       zwrotu — platforma oddaje swój `ActionResults`. Bez tych dwóch pól reguła przeoczyłaby
       rekordy wyniku akcji, choć są dokładnie tym samym rodzajem bytu co custom type funkcji.

       ⚠ KONTRAKT AKCJI LICZY SIĘ TAK SAMO JAK `returns`, I TO JEST CAŁA POPRAWKA 1.1. Model może
       powiedzieć „ten rekord obowiązuje KAŻDĄ akcję” JEDNYM wpisem (`actionContract`) zamiast
       powtarzać go przy trzydziestu — i to jest zapis LEPSZY, bo jedna prawda nie ma się jak
       rozjechać. Reguła, która czytała wyłącznie pola per akcja, orzekała o takim modelu
       nieprawdę: typ z kontraktu wypadał jako SIEROTA (`P46`), a razem z nim wszystko, co siedzi
       w jego środku, bo domknięcie nie miało od czego zacząć. Kontrakt nie jest wyjątkiem od
       reguły — jest drugim sposobem zapisania tego samego użycia. */
    const kontrakt = o.actionContract ?? {};
    const sygnatury = [
      ...funkcje.flatMap((f) => [...t(f.inputs), f.output]),
      ...akcje.flatMap((a) => [a.returns, a.envelope]),
      kontrakt.envelope, kontrakt.outcome,
      ...parametryFunkcyjne,
    ].filter(Boolean);

    /** Domknięcie: zbiór ziaren + wszystko, co z nich osiągalne przez pola struktur. */
    const domkniecie = (ziarna) => {
      const widziane = new Set(ziarna);
      const kolejka = [...ziarna];
      while (kolejka.length) {
        const biezacy = poId.get(kolejka.pop());
        for (const f of t(biezacy?.fields)) {
          for (const kandydat of poId.keys()) {
            if (widziane.has(kandydat)) continue;
            /* ⚠⚠ DOMKNIĘCIE IDZIE TAKŻE PO `valueType` (zestaw 1.8, 3.1 · K12b) — i jest to ta
               sama poprawka, którą `uzytyW` dostało w 1.4, tyle że po drugiej stronie. Tamta
               nauczyła regułę, że typ wskazany polem `valueType` JEST używany; ta uczy ją, że
               przez takie pole trzeba też PRZEJŚĆ. Bez tego typ wartości brany WYŁĄCZNIE przez
               pola struktury wypadał jako sierota, choć struktura siedzi na właściwości obiektu
               — pierwszy taki przypadek (`production.CheckReaction`, jedenaście rodzajów
               kontroli w `production.HealthPolicy`) zapalił to natychmiast. `docs:3814`. */
            if (wymienia(f.typeRaw, kandydat) || wymienia(f.type, kandydat)
              || s(f.valueType) === kandydat) {
              widziane.add(kandydat);
              kolejka.push(kandydat);
            }
          }
        }
      }
      return widziane;
    };

    const wOntologii = domkniecie(wszystkieTypy
      .map((x) => s(x.apiName)).filter((id) => uzytyW(powierzchniaOntologii, id)));
    const wFunkcjach = domkniecie(wszystkieTypy
      .map((x) => s(x.apiName)).filter((id) => uzytyW(sygnatury, id)));

    /* P44 · typ kodu stojący w grupie ontologii.
       ⚠ TYP WARTOŚCI (NIE-STRUKTURA) JEST Z TEJ REGUŁY WYŁĄCZONY — poprawka zestawu 1.4, z tego
       samego powodu, dla którego ta reguła w ogóle istnieje. Zdanie, na którym stoi P44, mówi
       o CUSTOM TYPES: „Custom types used in function signatures are different from the generated
       classes used for Ontology struct properties” — czyli o REKORDACH. *Value type* nie jest
       ani jednym, ani drugim: to osobny zasób Foundry'ego (własny manager, własne uprawnienia,
       własne wersjonowanie), którego wolno użyć i przy właściwości, i w sygnaturze, i którego
       dokumentacja wprost dopuszcza BEZ konsumenta („If your value type has no consumers, you can
       freely change these constraints”). Skalar używany tylko przez sygnatury nie jest więc
       „typem kodu w złej grupie” — jest typem wartości użytym zgodnie z przeznaczeniem. */
    const zleWOntologii = wspolne.filter((x) => {
      const id = s(x.apiName);
      if (x.isStruct === false) return false;
      return wFunkcjach.has(id) && !wOntologii.has(id);
    });
    regula(zleWOntologii.length === 0, {
      id: 'P44', klasa: 'ryzyko', kategoria: 'abstrakcja',
      co: `${zleWOntologii.length} z ${wspolne.length} typów współdzielonych nie jest właściwością NICZEGO `
        + `— używają ich wyłącznie sygnatury funkcji (${zleWOntologii.slice(0, 4).map((x) => `\`${x.apiName}\``).join(', ')}${zleWOntologii.length > 4 ? '…' : ''})`,
      gdzie: 'sharedPropertyTypes[*]',
      dlaczego: 'Typ współdzielony w Ontology Managerze jest TYPEM POLA — obiektu albo parametru '
        + 'akcji — i ma kolumnę „Usage”, która mówi, gdzie go użyto. Rekord, który jest tylko '
        + 'wejściem albo wyjściem funkcji, jest w Foundry CZYM INNYM: „custom type” z repozytorium '
        + 'kodu funkcji, zdefiniowany jako `interface` (TypeScript) albo klasa (Python). Ontologia '
        + 'zna sygnaturę funkcji; definicja rekordu leży obok, w repo. Postawiony w rejestrze typów '
        + 'ontologii zostaje tam z pustym „Usage” i zaśmieca model osobie, która go przegląda.',
      jak: 'Przenieś te wpisy do osobnej grupy typów kodu funkcji (`functionTypes`). '
        + 'Sygnatury wskazują je dalej tym samym identyfikatorem, więc nazwa się nie zmienia '
        + 'i nikt nie przepisuje kodu. ⚠ Typ używany JEDNOCZEŚNIE przez pole obiektu i przez '
        + 'funkcję zostaje w ontologii — funkcje normalnie biorą typy ontologiczne.',
      zrodlo: 'Functions → Types reference → Struct/custom type („Custom types used in function '
        + 'signatures are different from the generated classes used for Ontology struct properties”; '
        + '„In TypeScript functions, custom types are user-defined TypeScript interfaces”)',
    });

    /* P46 · typ zadeklarowany, do którego nic nie sięga.
       ⚠ TRZECI KUBEŁEK, KTÓRY WYSZEDŁ DOPIERO PRZY LICZENIU DWÓCH PIERWSZYCH: typ nieużywany
       ani przez ontologię, ani przez kod nie należy do żadnej z grup, więc P44 i P45 milczą
       o nim z definicji. Bez tej reguły przepadałby po cichu — a martwy wpis w rejestrze
       typów jest dokładnie tym samym śmieciem, przed którym broni P44. */
    const osierocone = wszystkieTypy.filter((x) => {
      const id = s(x.apiName);
      return !wOntologii.has(id) && !wFunkcjach.has(id);
    });
    regula(osierocone.length === 0, {
      id: 'P46', klasa: 'uwaga', kategoria: 'abstrakcja',
      co: `${osierocone.length} zadeklarowanych typów nie jest użytych NIGDZIE `
        + `(${osierocone.slice(0, 4).map((x) => `\`${x.apiName}\``).join(', ')}${osierocone.length > 4 ? '…' : ''})`,
      gdzie: 'sharedPropertyTypes[*] · functionTypes[*]',
      dlaczego: 'Typ, do którego nie sięga ani żadna właściwość, ani żaden parametr, ani żadna '
        + 'sygnatura, ani zwrot czy koperta akcji, ani kontrakt obowiązujący wszystkie akcje, '
        + 'ani pole innego typu, nie opisuje niczego, co w tym modelu istnieje. '
        + 'Bywa pozostałością po rzeczy, która zniknęła — i wtedy wprowadza w błąd czytelnika, '
        + 'który zakłada, że skoro stoi w rejestrze, to coś nim jeździ.',
      jak: 'Skasuj albo napisz przy nim, na co czeka. ⚠ Zanim skasujesz, sprawdź, czy nie zniknął '
        + 'mu konsument przy ostatniej zmianie — wtedy pytanie brzmi, czy to typ jest zbędny, '
        + 'czy konsument zginął przez pomyłkę. ⚠ Sprawdź też, czy używa go coś, co model mówi RAZ '
        + 'dla wszystkich akcji: rekord obowiązujący każde zgłoszenie deklaruje się jednym wpisem '
        + '(`actionContract`), a nie kopią przy każdej akcji — i wpisany tam LICZY SIĘ jako użycie.',
      zrodlo: 'Shared property → Metadata reference („Usage: the object types on which a shared '
        + 'property is used”) + Anti-patterns → The Kitchen Sink („Would someone ever need to see, '
        + 'search, or filter by this?”) + Actions → Apply an action (koperta żądania i rekord '
        + 'wyniku zgłoszenia są kształtem PLATFORMY, jednym dla wszystkich akcji — model, który '
        + 'je nazywa, robi to jednym wpisem, więc jeden wpis musi liczyć się za wszystkie)',
    });

    /* P45 · odwrotnie: typ kodu użyty jako typ właściwości albo parametru */
    const zleWFunkcjach = t(o.functionTypes).filter((x) => wOntologii.has(s(x.apiName)));
    regula(zleWFunkcjach.length === 0, {
      id: 'P45', klasa: 'zlamanie', kategoria: 'abstrakcja',
      co: `${zleWFunkcjach.length} typów zadeklarowanych jako typy KODU jest użytych jako typ `
        + `właściwości albo parametru (${zleWFunkcjach.slice(0, 4).map((x) => `\`${x.apiName}\``).join(', ')})`,
      gdzie: 'functionTypes[*]',
      dlaczego: 'Właściwość obiektu i parametr akcji mogą mieć wyłącznie typ ZAREJESTROWANY '
        + 'w ontologii — typ z repozytorium funkcji nie ma RID-u i Ontology Manager nie ma go '
        + 'z czego wybrać. To nie jest kwestia porządku, tylko coś, czego nie da się zapisać.',
      jak: 'Przenieś ten typ do grupy typów ontologii (`sharedPropertyTypes`) i załóż go jako '
        + 'struct property type. Funkcje mogą go wtedy brać dalej — to jest dozwolone.',
      zrodlo: 'Structs and shared properties → „Struct properties can be used by local and shared '
        + 'property types” + Functions → Types reference (custom type żyje w repozytorium kodu, '
        + 'nie w Ontology Managerze)',
    });

    /* ═══════════════════════════════════════════════════════════════════════════════════════
       P52 · STRUKTURA W STRUKTURZE — ale TYLKO na powierzchni ontologii
       ─────────────────────────────────────────────────────────────────────────────────────
       Struct property type ma pola PŁASKIE: pole struktury jest skalarem, a nie drugą strukturą.
       Rekord w rekordzie można narysować w JSON-ie i można nim jeździć po drucie — ale nie da się go
       założyć w Ontology Managerze jako typu właściwości.

       ⚠ TA REGUŁA MILCZY O TYPACH KODU FUNKCJI — i to nie jest źLE DOMKNIĘTY WYJĄTEK, tylko ta
       sama granica, którą stawiają `P44` i `P45`. Custom type w repozytorium funkcji jest zwykłym
       `interface`em TypeScriptu albo klasą Pythona i zagnieżdża się do woli. Reguła pyta więc nie
       „czy rekord ma rekord w środku”, tylko „czy TEN rekord stoi kiedykolwiek jako typ WŁAŚCIWOŚCI
       albo PARAMETRU” — bo dopiero tam Foundry musi go założyć.

       ⚠ ZAGNIEŻDŻENIE DZIEDZICZY PRZYNALEŻNOŚĆ, więc łańcuch zgłasza się CAŁY, a nie pierwszym
       ogniwem: `wOntologii` jest domknięciem po polach struktur, więc `A → B → C` użyte jako typ
       właściwości daje DWA wiersze (`A.pole → B` i `B.pole → C`). Każdy z nich jest osobną rzeczą
       do rozstrzygnięcia przy wdrożeniu: spłaszczyć albo zrobić z wnętrza osobny typ obiektu.
       ═══════════════════════════════════════════════════════════════════════════════════════ */
    const struktury = new Map(wszystkieTypy.filter((x) => x.isStruct).map((x) => [s(x.apiName), x]));
    const zagniezdzone = [];
    for (const [id, x] of struktury) {
      /* Typ, którego żadna właściwość ani żaden parametr nie bierze — nie jest problemem Foundry. */
      if (!wOntologii.has(id)) continue;
      for (const f of t(x.fields)) {
        for (const kandydat of struktury.keys()) {
          if (!wymienia(f.typeRaw, kandydat) && !wymienia(f.type, kandydat)) continue;
          zagniezdzone.push(`\`${id}.${s(f.apiName) || '?'}\` → \`${kandydat}\``);
        }
      }
    }
    regula(zagniezdzone.length === 0, {
      id: 'P52', klasa: 'zlamanie', kategoria: 'abstrakcja',
      co: `${zagniezdzone.length === 1 ? 'pole struktury niesie DRUGĄ strukturę' : `${zagniezdzone.length} pól struktury niesie DRUGĄ strukturę`}`
        + `: ${zagniezdzone.slice(0, 4).join(', ')}${zagniezdzone.length > 4 ? '…' : ''}`,
      gdzie: 'sharedPropertyTypes[*].fields[*]',
      dlaczego: 'Pola struct property type są PŁASKIE — struktura nie jest dozwolonym typem pola '
        + 'struktury. Rekord w rekordzie da się zapisać w JSON-ie i da się nim jeździć po drucie, '
        + 'ale nie da się go założyć jako typu właściwości: Ontology Manager nie ma czym wybrać '
        + 'struktury na pole struktury. Model, który to deklaruje, opisuje kształt, który przy '
        + 'zakładaniu typu zostanie odrzucony — i wychodzi to dopiero przy wdrożeniu.',
      jak: 'Rozstrzygnij, czym jest wnętrze. Zbiór pól bez własnej tożsamości → SPŁASZCZ go do '
        + 'jednego poziomu (prefiks w nazwie pola zamiast zagnieżdżenia). Byt z własną tożsamością, '
        + 'o który ktoś będzie pytał osobno → osobny TYP OBIEKTU i link. '
        + '⚠ Trzecia droga, jeśli ten rekord jest wyłącznie wejściem albo wyjściem funkcji i nigdy '
        + 'nie stoi przy żadnym polu: przenieś go do typów KODU (`functionTypes`) — tam zagnieżdżenie '
        + 'jest dozwolone, bo to zwykły `interface` w repozytorium funkcji.',
      zrodlo: 'Object types → Property types → Struct property type (pola struktury są płaskie; '
        + 'struktura nie jest dozwolonym typem pola struktury) + Functions → Types reference → '
        + 'Struct/custom type (custom type w KODZIE funkcji tego ograniczenia nie ma)',
    });
  }

  /* ══════════════════════════════════════════════════════════════════════════════════════════
     P84–P89 · SZEŚĆ REGUŁ NIEZALEŻNYCH OD KLUCZA OBCEGO (zestaw 1.9)

     ⚠ SKĄD TEN NUMER. Audyt zgodności z Foundry pokazał, że silnik dawał 100/100 na kilku
     wzorcach, których Ontology Manager nie zbuduje, WYŁĄCZNIE dlatego, że NIE MIAŁ o nich
     reguł — cisza narzędzia, nie zgodność modelu. Rekomendacja audytu: 8 reguł. SZEŚĆ z nich
     nie potrzebuje klucza obcego i stoją tu; DWIE pozostałe (FK jako właściwość krawędzi,
     nazwa FK kolidująca ze stroną linku na tym samym typie) dostaną `P82`/`P83`, zarezerwowane
     i celowo NIE użyte w tym pliku.

     ⚠ WYNIK MODELU, KTÓRY WPADA W TE WZORCE, SPADA PO TEJ ZMIANIE — I TAK MA BYĆ. Zestaw reguł,
     który wcześniej milczał, teraz mówi. Naprawia się MODEL (albo przyjmuje ryzyko z powodem),
     a nie ten plik ma udawać, że problemu nie ma.
     ══════════════════════════════════════════════════════════════════════════════════════════ */

  /** Akcja oparta o `Run function` — to samo rozpoznanie co przy P73/P74/P76/P77, powtórzone
   *  tu jawnie, bo tamto jest zamknięte w innym bloku i wypada ze scope'u. */
  const opartaOFunkcjeP8x = (a) => t(a.rules).some((r) => s(r.op) === 'runFunction');

  /* ────────────────────────────────────────────────────────────────────────────────────────
     P84 · GŁĘBOKOŚĆ `derived.via` > 3 — Foundry unosi TRZY poziomy, nie więcej

     „Derived properties support traversing up to **3 levels** of linked objects” (`docs:3344`)
     jest granicą PLATFORMY, nie zaleceniem wydajnościowym — Ontology Manager nie skonfiguruje
     czwartego skoku wprost. Ścieżka DOKŁADNIE 3-poziomowa mieści się i reguła jej nie rusza.
     ──────────────────────────────────────────────────────────────────────────────────────── */
  for (const { ob, p } of wszystkieWlasciwosci) {
    if (!p.derived) continue;
    const via = t(p.derived.via).map(s).filter(Boolean);
    regula(via.length <= 3, {
      id: 'P84', klasa: 'zlamanie', kategoria: 'wlasciwosci',
      co: `\`${ob.apiName}.${s(p.apiName)}\` przechodzi przez ${via.length} linków `
        + `(\`${via.join(' → ')}\`) — Foundry unosi najwyżej 3`,
      gdzie: `objectTypes[${ob.apiName}].properties[${s(p.apiName)}].derived.via`,
      dlaczego: 'Właściwość pochodna trawersuje krawędzie w CZASIE ZAPYTANIA — każdy dodatkowy '
        + 'poziom jest kolejnym złączeniem, a platforma dokumentuje TWARDY sufit tej trawersacji, '
        + 'nie zalecenie wydajnościowe. Ścieżka dłuższa niż 3 poziomy jest kształtem, którego '
        + 'Ontology Manager nie skonfiguruje.',
      jak: 'Skróć ścieżkę: policz pośredni krok osobną właściwością pochodną na typie bliżej '
        + 'źródła i zbuduj na niej kolejną — albo policz wartość w rurze/funkcji, jeśli czwarty '
        + 'poziom jest naprawdę potrzebny.',
      zrodlo: 'Configure Derived Properties → Multi-hop Derived Properties ("Derived properties '
        + 'support traversing up to **3 levels** of linked objects", docs:3344)',
    });
  }

  /* ────────────────────────────────────────────────────────────────────────────────────────
     P85 · TYP WSPÓŁDZIELONY UŻYTY NA ≤1 TYPIE OBIEKTU — PODPOWIEDŹ, NIE ZŁAMANIE

     ⚠ „Shared property” istnieje po to, żeby scentralizować metadane WSPÓLNE kilku typom
     (`docs:3680`). Platforma trzyma nawet osobną kolumnę „Usage" tylko po to, żeby dało się
     zadać to pytanie: „Usage: The object types on which a shared property is used… by the
     `Employee`, `Contractor`, and other object types" (`docs:3814`) — kanon niesie ją wprost
     jako `usedBy` — pole, które kanon niesie z definicji przy każdym typie współdzielonym.
     ⚠ KLASA `podpowiedz`, NIE `zlamanie`: audyt (A5) mówi to wprost — „większość to enumy
     i struktury polityki, które Foundry i tak wyraziłby inaczej" — czyli bywa uzasadnione
     (typ scentralizowany na zapas dla przyszłego drugiego konsumenta, konfiguracja jednego
     obiektu rozbita na kilka pól dla czytelności). Reguła WSKAZUJE kandydata, nie orzeka.
     ⚠ LICZYMY TYPY OBIEKTÓW, NIE WSZYSTKIE WPISY `usedBy`: ścieżka akcji (`jakasAkcja.kolumny`)
     albo funkcji (`jakasFunkcja.polityka`) nie jest „obiektem, na którym property jest w użyciu" —
     dokładnie to mówi cytat wyżej. Typ użyty WYŁĄCZNIE wewnątrz innego typu współdzielonego
     (zagnieżdżenie struktury w strukturze) liczy się więc jako 0 typów obiektów, nie 1 —
     dziedziczenie przynależności robi już `P44`/`P46`, ta reguła pyta o coś innego.
     ⚠⚠ DWA ŹRÓDŁA PRAWDY O UŻYCIU, SUMOWANE BEZ DUPLIKATÓW. `usedBy` jest opisem DLA CZŁOWIEKA (ten sam status co `note` — kanon go
     niesie, bo niektóre formaty go piszą, ale nic go nie wymusza), a REFERENCJĄ, którą Foundry
     naprawdę rozwiązuje, jest `property.sharedPropertyType` na każdym typie obiektu — to jest
     odpowiednik kolumny „Usage" w kanonie kształtu FOUNDRY wprost, bez pośrednictwa żadnego
     opisowego pola. Wejście, które nie pisze `usedBy` w ogóle (np. każdy model zapisany po
     Foundry'emu), dawało PRZED TĄ POPRAWKĄ fałszywe „0 typów" dla typu, którego
     UŻYWAJĄ dwie właściwości — silnik pytał o opis, a miał pytać o referencję. Liczymy więc
     SUMĘ mnogościową obu źródeł: `usedBy` DOKŁADA typy, których referencja `sharedPropertyType`
     z jakiegoś powodu nie niesie (np. użycie w kontrakcie akcji poza zwykłą właściwością obiektu,
     które ta reguła i tak odrzuca niżej), a bezpośrednie `sharedPropertyType` NIE ZNIKA, gdy
     `usedBy` milczy albo się z nim rozjeżdża.
     ──────────────────────────────────────────────────────────────────────────────────────── */
  {
    const nazwyObiektow = new Set(obiekty.map((ob) => s(ob.apiName)));
    for (const w of wspolne) {
      const zUsedBy = t(w.usedBy).map((sciezka) => {
        const i = s(sciezka).lastIndexOf('.');
        return i > 0 ? s(sciezka).slice(0, i) : '';
      }).filter((prefiks) => nazwyObiektow.has(prefiks));
      const zWlasciwosci = wszystkieWlasciwosci
        .filter(({ p }) => s(p.sharedPropertyType) === s(w.apiName))
        .map(({ ob }) => s(ob.apiName));
      const typyObiektow = new Set([...zUsedBy, ...zWlasciwosci]);
      regula(typyObiektow.size >= 2, {
        id: 'P85', klasa: 'podpowiedz', kategoria: 'abstrakcja',
        co: typyObiektow.size === 0
          ? `\`${w.apiName}\` nie jest w użyciu na ŻADNYM typie obiektu (ani jedna właściwość `
            + 'nie wskazuje go przez `sharedPropertyType`, a `usedBy` niesie co najwyżej ścieżki '
            + 'akcji/funkcji albo inne typy współdzielone)'
          : `\`${w.apiName}\` jest w użyciu na JEDNYM typie obiektu (\`${[...typyObiektow][0]}\`)`,
        gdzie: `sharedPropertyTypes[${w.apiName}].usedBy · objectTypes[*].properties[*].sharedPropertyType`,
        dlaczego: 'Typ współdzielony istnieje po to, żeby scentralizować metadane WSPÓLNE kilku '
          + 'typom obiektów — platforma pokazuje przy nim kolumnę „Usage" z listą tych typów. '
          + 'Typ użyty na jednym typie (albo na żadnym) nie centralizuje niczego: jest zwykłą '
          + 'właściwością udającą zasób współdzielony, kosztem osobnego wpisu w rejestrze typów.',
        jak: 'Jeśli drugi konsument jest planowany — zostaw i zapisz to w opisie typu. Jeśli nie '
          + '— przenieś z powrotem na zwykłą właściwość obiektu, którego dotyczy.',
        zrodlo: 'Shared Properties → Overview ("A shared property is a property that can be used '
          + 'on multiple object types in your ontology", docs:3680) + Metadata reference '
          + '("Usage: The object types on which a shared property is used… by the `Employee`, '
          + '`Contractor`, and other object types", docs:3814)',
      });
    }
  }

  /* ────────────────────────────────────────────────────────────────────────────────────────
     P86 · N:M EDYTOWANY AKCJĄ BEZ TABELI ŁĄCZĄCEJ

     ⚠ Edycja N:M wymaga backing datasource — to nie jest nasza opinia, to warunek platformy:
     „A many-to-many cardinality, which requires a backing datasource, is required to enable
     users to edit or write back to the link type" (`docs:3938`). Kanon niesie tę tabelę jako
     `backingObjectType` — to samo pole, którego `P50` już używa, żeby odróżnić GOŁY link N:M
     od takiego, co ma za sobą obiekt.
     ⚠ LICZY SIĘ KAŻDA AKCJA, TAKŻE OPARTA O FUNKCJĘ: wymóg backing datasource jest wymogiem
     PLATFORMY na SAMYM LINKU, nie na kształcie reguły, która go rusza — funkcja edycji piszącą
     na link N:M bez tabeli łączącej rozbija się o to samo ograniczenie, co reguła deklaratywna.
     ⚠ TABELA ŁĄCZĄCA = `joinTable` ALBO `backingObjectType` (od zestawu 2.0). Do 1.9 reguła
     pytała WYŁĄCZNIE o `backingObjectType`. `joinTable` w kanonie (`"generate"` albo
     `{dataset, fromColumn, toColumn}`) to dokładnie „Join table dataset relationship type”
     z opcją „Generate join table” (`docs:3934–3944`). `backingObjectType` to CO INNEGO: link
     oparty o TYP OBIEKTU (obiekt pośredni, `P50`), też niosący własne zaplecze. Reguła
     przepuszcza oba — pyta, czy N:M edytowany akcją MA backing datasource, a nie, którym
     z dwóch kształtów go zadeklarowano.
     ⚠ KRAWĘDŹ ROZBITA Z INTERFEJSU NIESIE `bundleApiName` — I EDYCJA CELUJE W NIEGO, NIE
     W KONKRETNĄ: gdy link N:M celował pierwotnie w interfejs (`resources` → kontrakt
     `Allocatable`), konwerter do kanonu rozbija go na PO JEDNEJ krawędzi na implementatora
     (`resourcesMachine`, `resourcesTool`, `resourcesPerson`), ale akcja, która go edytuje,
     dalej nazywa cel WIĄZKĄ (`target: 'resources'`) — bo tak nazwał go gest, zanim
     ktokolwiek wiedział, KTÓRY implementator dziś stoi przy zadaniu.
     Dopasowanie WYŁĄCZNIE po `apiName` przeoczyłoby to jako „nikt nie edytuje” i dałoby
     fałszywe zero. `bundleApiName === l.apiName` łapie oryginalną krawędź; gołe `l.apiName`
     zostaje jako druga gałąź na wypadek linku, który nigdy nie stał w interfejsie.
     ──────────────────────────────────────────────────────────────────────────────────────── */
  for (const l of linki) {
    if (l.cardinality !== 'MANY_TO_MANY' || s(l.backingObjectType) || l.joinTable) continue;
    const celeEdycji = new Set([s(l.apiName), s(l.bundleApiName)].filter(Boolean));
    const edytujace = akcje.filter((a) => edycjeAkcji(a).some((e) =>
      ['createLink', 'deleteLink', 'link', 'unlink'].includes(s(e.op)) && celeEdycji.has(s(e.target))));
    regula(edytujace.length === 0, {
      id: 'P86', klasa: 'zlamanie', kategoria: 'relacje',
      co: `\`${l.apiName}\` (${l.from} ↔ ${l.to}) jest N:M BEZ tabeli łączącej, a edytuje go `
        + `${edytujace.length} akcj${edytujace.length === 1 ? 'a' : 'e'}: `
        + `${edytujace.map((a) => `\`${a.apiName}\``).join(', ')}`,
      gdzie: `linkTypes[${l.apiName}].backingObjectType`,
      dlaczego: 'Platforma czyta i zapisuje N:M WYŁĄCZNIE przez tabelę łączącą — bez niej link '
        + 'jest tylko do odczytu z rury. Akcja, która deklaruje edycję takiego linku, opisuje '
        + 'gest, którego Ontology Manager nie da się skonfigurować.',
      jak: 'Dodaj tabelę łączącą `joinTable` (wygenerowaną albo wskazany dataset) — albo, jeśli '
        + 'relacja niesie własne fakty, zamień link na obiekt pośredni (patrz `P30`/`P50`).',
      zrodlo: 'Create a link type → Define link resources → Join table dataset relationship type '
        + '("A many-to-many cardinality, which requires a backing datasource, is required to '
        + 'enable users to edit or write back to the link type", docs:3938)',
    });
  }

  /* ────────────────────────────────────────────────────────────────────────────────────────
     P87 · DELETE DEKLARATYWNY BEZ REFERENCJI DO OBIEKTU ALBO Z KASKADĄ

     ⚠ Reguła `Delete object(s)` bierze tożsamość z PARAMETRU REFERENCJI, nie z dowolnego pola:
     „Delete object(s): Can be used to delete an existing object whose primary key is derived
     from object reference parameters" (`docs:5233`, punkt 4). Akcja deklaratywna, która kasuje
     typ T bez PARAMETRU `ref(T)`, opisuje regułę, której Ontology Manager nie zbuduje — string
     albo enum nie jest referencją obiektu, choćby niósł tę samą wartość co klucz główny.
     ⚠ DRUGA POŁOWA TEJ SAMEJ WADY: kasowanie OBIEKTÓW POWIĄZANYCH (inny typ niż ten
     z parametru) jest KASKADĄ, a Foundry stawia to wprost po drugiej stronie tej samej reguły:
     „Consider backing the action with an Ontology edit function when you want to modify every
     object linked to the one the user selected" (`docs:4925`). Oba zjawiska dają ten sam
     warunek silnika: kasowany typ bez WŁASNEGO `ref(T)` w parametrach akcji.
     ⚠ WYJĄTEK NAZWANY, ŻEBY NIE LICZYĆ PODWÓJNIE: gdy akcja ZASTĘPUJE całą kolekcję typu T
     listą ze struct-parametru (usuwa starą, tworzy nową z `list(struct(...))`), wada jest
     `P88`, nie ta — przyczyna jest inna (brak deklaratywnej pętli „jeden obiekt na wiersz
     listy", nie brak referencji), więc ta reguła milczy na TYM konkretnym celu.
     ──────────────────────────────────────────────────────────────────────────────────────── */
  for (const a of akcje) {
    if (opartaOFunkcjeP8x(a)) continue;
    const edycje = edycjeAkcji(a);
    const usuniecia = edycje.filter((e) => s(e.op) === 'delete');
    if (usuniecia.length === 0) continue;
    const celeUsuniete = [...new Set(usuniecia.map((e) => typZCelu(e.target)))];
    const celeTworzone = new Set(edycje.filter((e) => s(e.op) === 'create').map((e) => typZCelu(e.target)));
    const maParametrListyStruct = t(a.parameters).some((p) => p.baseType === 'Array' && s(p.elementStructTypeApiName));
    const referencjeObiektow = new Set(t(a.parameters)
      .filter((p) => p.reference?.kind === 'objectReference' && !p.reference.multiple)
      .map((p) => s(p.reference.objectTypeApiName)));
    const zle = celeUsuniete.filter((cel) => !referencjeObiektow.has(cel)
      && !(maParametrListyStruct && celeTworzone.has(cel)));
    regula(zle.length === 0, {
      id: 'P87', klasa: 'zlamanie', kategoria: 'akcje',
      co: `\`${a.apiName}\` kasuje deklaratywnie ${zle.map((c) => `\`${c}\``).join(', ')} bez `
        + 'parametru `ref(…)` wskazującego TEN typ',
      gdzie: `actionTypes[${a.apiName}].parameters`,
      dlaczego: 'Reguła `Delete object(s)` bierze tożsamość kasowanego obiektu z PARAMETRU '
        + 'REFERENCJI — string, enum albo liczba nie są referencją, choćby niosły wartość klucza '
        + 'głównego. Gdy kasowany typ jest INNY niż ten, który akcja dostała parametrem, '
        + 'kasowanie jest kaskadą na obiektach powiązanych, a to platforma prosi robić funkcją.',
      jak: 'Dodaj parametr `ref(T)` dla każdego kasowanego typu — albo, jeśli kasowanie jest '
        + 'skutkiem ubocznym kasowania innego obiektu (kaskada), przepisz akcję na `Run function`.',
      zrodlo: 'Rules → Ontology rules ("Delete object(s): Can be used to delete an existing '
        + 'object whose primary key is derived from object reference parameters", docs:5233) '
        + '+ Explore other action types → Run custom logic with a function ("Consider backing '
        + 'the action with an Ontology edit function when you want to modify every object linked '
        + 'to the one the user selected", docs:4925)',
    });
  }

  /* ────────────────────────────────────────────────────────────────────────────────────────
     P88 · WIELE OBIEKTÓW JEDNEGO TYPU Z LISTY W AKCJI DEKLARATYWNEJ

     ⚠ Struct-parametr zasila JEDNĄ właściwość struct, nie pętlę obiektów: „A struct property
     can only be created or modified through a single struct parameter" (`docs:5845`) —
     deklaratywne reguły nie mają kształtu „jeden obiekt na wiersz listy". Akcja, która bierze
     `list(struct(...))` i ma choć jedną edycję `create`, opisuje pętlę tworzenia, której
     Ontology Manager nie skonfiguruje: reguły kompilują się do JEDNEJ edycji na obiekt
     (`docs:5264`), a lista nie jest obiektem referencyjnym, więc nie ma na czym oprzeć
     „drugi, trzeci, n-ty" `Create object`.
     ──────────────────────────────────────────────────────────────────────────────────────── */
  for (const a of akcje) {
    if (opartaOFunkcjeP8x(a)) continue;
    const parametryListyStruct = t(a.parameters).filter((p) => p.baseType === 'Array' && s(p.elementStructTypeApiName));
    if (parametryListyStruct.length === 0) continue;
    const tworzenia = edycjeAkcji(a).filter((e) => s(e.op) === 'create');
    regula(tworzenia.length === 0, {
      id: 'P88', klasa: 'zlamanie', kategoria: 'akcje',
      co: `\`${a.apiName}\` tworzy obiekty (${tworzenia.map((e) => `\`${typZCelu(e.target)}\``).join(', ')}) `
        + `z parametru listy struktur ${parametryListyStruct.map((p) => `\`${p.apiName}\``).join(', ')} `
        + '— deklaratywnie, bez funkcji',
      gdzie: `actionTypes[${a.apiName}].parameters`,
      dlaczego: 'Reguła deklaratywna `Create object` tworzy JEDEN obiekt na regułę; struct-parametr '
        + 'zasila jedną właściwość struct, a nie pętlę tworzenia. Model, który liczy „jeden wiersz '
        + 'listy = jeden nowy obiekt", opisuje zachowanie, którego Ontology Manager nie zbuduje.',
      jak: 'Przepisz akcję na `Run function` — funkcja edycji dostaje listę jako zwykły parametr '
        + 'i sama pętluje tworzenie, dokładnie tak, jak dziś robi to kod.',
      zrodlo: 'Rules → Ontology rules → Invalid combinations ("the actions backend compiles rules '
        + 'to generate a single edit per object", docs:5264) + Actions on Structs → Limitations '
        + '("A struct property can only be created or modified through a single struct parameter", '
        + 'docs:5845)',
    });
  }

  /* ────────────────────────────────────────────────────────────────────────────────────────
     P89 · AKCJA NA INTERFEJSIE ZMIENIA WŁAŚCIWOŚĆ SPOZA KONTRAKTU INTERFEJSU

     ⚠ Reguła interfejsu rusza WYŁĄCZNIE wspólne właściwości albo kasuje — bez furtki: „you can
     use interface action rules only to modify the interface shared properties or to delete
     objects" (`docs:5688`). Akcja, która bierze parametr PRZEZ INTERFEJS (referencja do
     DOWOLNEGO implementatora) i edytuje pole na konkretnym typie, którego NIE MA w kontrakcie
     interfejsu, opisuje regułę spoza tego, co Ontology Manager unosi dla akcji na interfejsie.
     ⚠ „NA INTERFEJSIE" ROZPOZNAJEMY PO PARAMETRZE, NIE PO OSOBNEJ DEKLARACJI: kanon nie niesie
     dziś pola „ta akcja jest skonfigurowana jako akcja na interfejsie" wprost, ale referencja
     interfejsowa w parametrze (`ref(Interfejs)`) I edycja pola na typie, który ten interfejs
     IMPLEMENTUJE, jest dokładnie tym kształtem — inaczej parametr nie miałby czym rozstrzygnąć,
     NA KTÓRYM z implementatorów pole stoi.
     ⚠ AKCJA OPARTA O FUNKCJĘ JEST WYŁĄCZONA — I TO NIE JEST TA SAMA WYJĄTKOWOŚĆ CO PRZY `P86`.
     Tu ograniczenie z `docs:5688` opisuje jeden KONKRETNY typ reguły Ontology Managera
     („interface action rules” — `Create/Modify/Delete object(s) of interface”, `docs:5233`
     punkty 8–10): platforma stosuje TĘ REGUŁĘ identycznie do każdego implementatora, więc rusza
     wyłącznie kontrakt. Akcja `Run function` NIE JEST TĄ REGUŁĄ — jest kodem, któremu wolno
     przyjąć referencję interfejsową jako zwykły parametr i w środku rozstrzygnąć property po
     property. Bez tego wyjątku reguła fałszywie oskarżałaby każdą akcję funkcyjną, która bierze
     obiekt przez kontrakt i pisze pola konkretnego typu (np. pozycję w kolejce, godzinę startu)
     spoza kontraktu — a funkcja i tak nie jest „regułą interfejsu”.
     ──────────────────────────────────────────────────────────────────────────────────────── */
  for (const a of akcje) {
    if (opartaOFunkcjeP8x(a)) continue;
    const interfejsyParametrow = [...new Set(t(a.parameters)
      .map((p) => p.reference).filter((r) => r?.kind === 'interfaceReference')
      .map((r) => s(r.interfaceApiName)))];
    if (interfejsyParametrow.length === 0) continue;
    const kontraktPo = new Map(interfejsyParametrow.map((nazwa) => [nazwa,
      new Set(t(interfejsy.find((i) => i.apiName === nazwa)?.properties).map((p) => s(p.apiName)))]));
    const implementuje = (typObiektu, nazwaInterfejsu) => obiekty
      .some((ob) => s(ob.apiName) === s(typObiektu) && t(ob.implements).map(s).includes(nazwaInterfejsu));
    const zle = [];
    for (const e of edycjeAkcji(a)) {
      if (s(e.op) !== 'modify') continue;
      const pole = e.targetField;
      if (!pole || pole.kind !== 'objectProperty') continue;
      for (const nazwaIfc of interfejsyParametrow) {
        if (!implementuje(pole.objectType, nazwaIfc)) continue;
        if (!kontraktPo.get(nazwaIfc).has(s(pole.property))) {
          zle.push(`${pole.objectType}.${pole.property} (spoza kontraktu ${nazwaIfc})`);
        }
      }
    }
    regula(zle.length === 0, {
      id: 'P89', klasa: 'zlamanie', kategoria: 'akcje',
      co: `\`${a.apiName}\` bierze parametr przez interfejs i edytuje: ${zle.join(', ')}`,
      gdzie: `actionTypes[${a.apiName}].declaredEdits`,
      dlaczego: 'Akcja skonfigurowana na interfejsie rusza WYŁĄCZNIE właściwości z jego kontraktu '
        + '— to jest cały sens jednej reguły dla wielu typów naraz: platforma stosuje ją IDENTYCZNIE '
        + 'do każdego implementatora, więc nie ma jak dopuścić pola, które jeden implementator ma, '
        + 'a inny nie. Pole spoza kontraktu jest dokładnie takim polem — specyficznym dla typu.',
      jak: 'Dodaj pole do kontraktu interfejsu, jeśli naprawdę ma je KAŻDY implementator — albo '
        + 'rozbij akcję na osobne akcje per typ konkretny, jeśli pole jest specyficzne.',
      zrodlo: 'Actions on interfaces → Using action on interface rules ("you can use interface '
        + 'action rules only to modify the interface shared properties or to delete objects", '
        + 'docs:5688)',
    });
  }

  /* ══════════════════════════════════════════════════════════════════════════════════════════
     ZNALEZISKA PRZYJĘTE Z POWODEM (od zestawu 1.2)
     ══════════════════════════════════════════════════════════════════════════════════════════

     ⚠ PO CO TO JEST. Reguły tego pliku orzekają o KSZTAŁCIE modelu, a kształt bywa decyzją.
     Model ma prawo powiedzieć „wiemy, że tu zapala, i zostawiamy to świadomie — oto dlaczego”;
     bez takiego miejsca to samo znalezisko wraca w każdym raporcie, kosztuje punkty i uczy
     czytelnika, że wynik zawiera stałe tło, którego nikt nie czyta. Przyjęte znalezisko NIE
     ZNIKA — schodzi na osobną listę `przyjete`, ze swoim powodem, i nie liczy się do `wynik`.

     ⚠ TO NIE JEST WYCISZENIE i różnica jest cała w tym, że powód jest WYPISANY i ma właściciela.
     Stąd trzy odmowy, każda z własnym znaleziskiem:
       • klasy `zlamanie` NIE DA SIĘ PRZYJĄĆ — to jest zasada stawiana wprost, więc „wiemy i
         zostawiamy” znaczyłoby tu „wiemy, że model jest zły”. Takie się naprawia, nie przyjmuje;
       • przyjęcie RYZYKA wymaga adresata i daty — uwaga i podpowiedź bywają redakcją, ryzyko
         jest wzorcem, przed którym praktyka ostrzega, a po pół roku nikt nie wie, czy powód
         jeszcze obowiązuje, jeśli nie widać kto i kiedy;
       • PRZYJĘCIE OSIEROCONE (cel, którego w modelu nie ma) wygląda na działającą decyzję,
         a nie robi nic — i ukrywa fakt, że reguła przestała mieć przedmiot.
     ⚠ Przyjęcie wolno wpisać tylko przy CELU, który istnieje — dopasowanie idzie po parze
     reguła + cel wymieniony w adresie albo w treści znaleziska. */

  const przyjete = [];
  {
    const przyjecia = t(o.acceptedFindings);
    if (przyjecia.length > 0) {
      const opisReguly = new Map(REGULY.map((r) => [r.id, r]));
      /* Wszystko, co w tym modelu ma nazwę i może być celem znaleziska. */
      const cele = new Set();
      for (const grupa of [obiekty, linki, akcje, funkcje, interfejsy, wspolne, t(o.functionTypes)]) {
        for (const w of grupa) if (w?.apiName) cele.add(w.apiName);
      }
      /* ⚠ NAZWA WIĄZKI TEŻ JEST NAZWĄ W MODELU (zestaw 1.5). Krawędź celowana w kontrakt wychodzi
         z kanonu jako N krawędzi o nazwach GENEROWANYCH, ale przyjęcie znaleziska wskazuje nazwę
         z pliku dla ludzi — i ma prawo ją wskazywać. Bez tego wiersza wszystkie przyjęcia
         o takich krawędziach osierociałyby w dniu rozbicia, a `P57` orzekłoby o nich nieprawdę. */
      for (const b of t(o.linkBundles)) if (b?.apiName) cele.add(b.apiName);
      for (const { ob, p } of wszystkieWlasciwosci) if (ob?.apiName && p?.apiName) cele.add(`${ob.apiName}.${p.apiName}`);
      /* ⚠ JEDEN CEL, KTÓRY NIE JEST NAZWĄ W MODELU — I TO JEST LUKA MECHANIZMU ZAŁATANA, A NIE
         FURTKA (zestaw 1.3). Część reguł orzeka o CAŁYM modelu, a nie o pojedynczym wpisie:
         „model nie deklaruje ani jednej granicy wierszowej”, „daty nazywane na dwa sposoby
         naraz”. Takie znalezisko nie ma nazwy, którą dałoby się przepisać do przyjęcia — więc do
         1.2 nie dawało się przyjąć w ogóle, choć bywa decyzją tak samo jak każde inne.
         `*` znaczy „ten model jako całość” i dopasowuje się WYŁĄCZNIE do znaleziska, które samo
         deklaruje ten zasięg adresem kończącym się na `[*]`. Dzięki temu gwiazdka nie jest
         wyciszaczem: nie tknie ani jednego znaleziska wskazującego konkretny wpis. */
      cele.add(CALY_MODEL);

      /* ⚠ PRZYJĘCIE WSKAZUJE NAZWĘ Z PLIKU DLA LUDZI, A ZNALEZISKO — NAZWĘ Z KANONU (zestaw 1.5).
         Przy krawędzi celowanej w kontrakt to są dwie różne nazwy: przyjęcie mówi
         `secondaryResources`, a reguła orzeka o `secondaryResourcesMachine`. Bez rozwinięcia
         nazwy wiązki na jej konkretne krawędzie przyjęcie przestałoby cokolwiek przyjmować
         i nikt by tego nie zauważył — bo znalezisko wróciłoby jako „nowe”. */
      const wgWiazki = new Map(t(o.linkBundles).filter((b) => b?.apiName).map((b) => [s(b.apiName), t(b.concrete).map(s)]));
      const aliasyCelu = (cel) => [s(cel), ...(wgWiazki.get(s(cel)) ?? [])].filter(Boolean);

      for (const [i, w] of przyjecia.entries()) {
        const gdzie = `acceptedFindings[${i}]`;
        const r = opisReguly.get(w?.rule);
        /* ⚠ ZNALEZISKO O PRZYJĘCIU LĄDUJE W KATEGORII PRZYJĘTEJ REGUŁY, a nie w osobnym worku:
           tam właśnie czytelnik szuka rzeczy o tej regule. Gdy reguły nie znamy, nie wiemy nawet
           tego — wtedy `dokumentacja`, bo problem jest wtedy z SAMYM WPISEM. */
        const kategoria = r?.kategoria ?? 'dokumentacja';
        if (!regula(!!r && !!w.target && cele.has(w.target), {
          id: 'P57', klasa: 'zlamanie', kategoria,
          co: r
            ? `PRZYJĘCIE OSIEROCONE — celu \`${String(w.target)}\` nie ma w tym modelu`
            : `przyjęcie wskazuje regułę \`${String(w?.rule)}\`, której to narzędzie nie zna`,
          gdzie,
          dlaczego: 'przyjęcie bez przedmiotu wygląda na działającą decyzję, a nie robi NIC — i przy okazji ukrywa, że reguła albo cel zniknęły. To jest gorsze niż brak przyjęcia: brak widać, martwe przyjęcie wygląda na przemyślane',
          jak: r
            ? 'popraw cel albo zdejmij przyjęcie — reguła przestała mieć przedmiot'
            : 'popraw id reguły albo zdejmij wpis; numer zestawu reguł jedzie w każdym raporcie, więc po zmianie zestawu warto przejrzeć przyjęcia',
          zrodlo: 'mechanizm przyjęć: przyjmuje się KONKRETNE znalezisko, czyli parę reguła + cel',
        })) continue;
        if (!regula(r.klasa !== 'zlamanie', {
          id: 'P55', klasa: 'zlamanie', kategoria,
          co: `przyjęto regułę \`${w.rule}\` klasy \`zlamanie\` (\`${w.target}\`)`,
          gdzie,
          dlaczego: 'złamana zasada nie jest kwestią gustu — „wiemy i zostawiamy" znaczy tu „wiemy, że model jest zły". Takie znalezisko się NAPRAWIA, a nie przyjmuje; inaczej mechanizm przyjęć staje się wyciszaczem',
          jak: 'napraw model albo — jeżeli to fałszywy alarm — popraw REGUŁĘ w narzędziu i podbij numer zestawu',
          zrodlo: 'klasy znalezisk tego narzędzia: `zlamanie` = zasada stawiana wprost',
        })) continue;
        regula(r.klasa !== 'ryzyko' || (!!w.decidedBy && !!w.date), {
          id: 'P56', klasa: 'zlamanie', kategoria,
          co: `przyjęcie RYZYKA (\`${w.rule}\` przy \`${w.target}\`) bez adresata albo bez daty`,
          gdzie,
          dlaczego: 'uwaga i podpowiedź bywają redakcją, ale ryzyko jest wzorcem, przed którym praktyka ostrzega — po pół roku nikt nie odróżni „przemyślane" od „zostało", jeżeli nie widać, KTO przyjął i KIEDY',
          jak: 'dopisz przy przyjęciu osobę i datę',
          zrodlo: 'mechanizm przyjęć: ryzyko przyjmuje się imiennie i z datą',
        });

        for (let n = znaleziska.length - 1; n >= 0; n -= 1) {
          const z = znaleziska[n];
          if (z.id !== w.rule) continue;
          if (w.target === CALY_MODEL) {
            /* gwiazdka bierze WYŁĄCZNIE znalezisko o zasięgu całego modelu — patrz baner wyżej */
            if (!String(z.gdzie ?? '').endsWith('[*]')) continue;
          } else if (!aliasyCelu(w.target).some((n) => String(z.gdzie ?? '').includes(n) || String(z.co ?? '').includes(n))) continue;
          znaleziska.splice(n, 1);
          przyjete.push({ ...z, przyjeteDlaczego: w.why, przyjetePrzez: w.decidedBy, przyjeteKiedy: w.date });
        }
      }
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════════════════════
     PUNKTACJA — ta sama arytmetyka co w `walidator.mjs`: 100 minus koszty, przycięte budżetem.
     ⚠ Liczona PO przyjęciach: znalezisko przyjęte z powodem nie stoi już w `znaleziska`, więc
     nie ma jak wejść do straty. To jest cała mechanika „przyjęcia” i cała jej cena.
     ══════════════════════════════════════════════════════════════════════════════════════════ */

  const straty = Object.fromEntries(KATEGORIE.map((k) => [k.id, 0]));
  const liczniki = Object.fromEntries(KATEGORIE.map((k) =>
    [k.id, Object.fromEntries(KOLEJNOSC_KLAS.map((c) => [c, 0]))]));
  for (const z of znaleziska) {
    straty[z.kategoria] += KLASY[z.klasa].koszt;
    liczniki[z.kategoria][z.klasa] += 1;
  }
  const kategorie = KATEGORIE.map((k) => {
    const strata = Math.min(k.budzet, zaokr(straty[k.id]));
    return {
      id: k.id, opis: k.opis, budzet: k.budzet, zbadane: zbadane[k.id],
      strata, strataSurowa: zaokr(straty[k.id]), punkty: zaokr(k.budzet - strata),
      obciete: straty[k.id] > k.budzet, znaleziska: liczniki[k.id],
    };
  });
  const wynik = zaokr(kategorie.reduce((a, k) => a + k.punkty, 0));
  const podsumowanie = Object.fromEntries(KOLEJNOSC_KLAS.map((c) =>
    [c, znaleziska.filter((z) => z.klasa === c).length]));

  znaleziska.sort((a, b) =>
    KOLEJNOSC_KLAS.indexOf(a.klasa) - KOLEJNOSC_KLAS.indexOf(b.klasa)
    || KATEGORIE.findIndex((k) => k.id === a.kategoria) - KATEGORIE.findIndex((k) => k.id === b.kategoria)
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    || (a.co < b.co ? -1 : a.co > b.co ? 1 : 0));

  return {
    /* ⚠ Wersja W KAŻDYM raporcie: bez niej nie wiadomo, czy dwie liczby da się porównać. */
    wersjaRegul: WERSJA,
    wynik,
    /* ⚠ ZNALEZISKA PRZYJĘTE Z POWODEM — osobno i NIE w `wynik`. Pusta lista jest normalnym
       stanem; niepusta znaczy, że model powiedział „wiemy i zostawiamy”, a powód stoi przy
       każdym wpisie (`przyjeteDlaczego`, `przyjetePrzez`, `przyjeteKiedy`). */
    przyjete,
    kategorie,
    znaleziska,
    podsumowanie,
    blokujace: podsumowanie.zlamanie > 0,
    statystyki: {
      objectTypes: obiekty.length,
      properties: wszystkieWlasciwosci.length,
      linkTypes: linki.length,
      actionTypes: akcje.length,
      functions: funkcje.length,
      interfaces: interfejsy.length,
      sharedPropertyTypes: wspolne.length,
    },
  };
}

/** Lista reguł do zakładki „Reguły” i do testów — jedno miejsce prawdy o tym, co narzędzie bada. */
export const REGULY = [
  ['P01', 'domena', 'ryzyko', 'God Object — liczba właściwości'],
  ['P02', 'domena', 'podpowiedz', 'typ zaczyna nieść więcej niż jedno pojęcie'],
  ['P03', 'domena', 'ryzyko', 'God Object — dyskryminator rodzaju'],
  ['P04', 'domena', 'ryzyko', 'Kitchen Sink — kolumny techniczne jako właściwości'],
  ['P05', 'domena', 'ryzyko', 'System Silos — typ nazwany od systemu źródłowego'],
  ['P06', 'domena', 'podpowiedz', 'Time Machine — wersja albo rok w nazwie typu'],
  ['P07', 'abstrakcja', 'podpowiedz', 'reguła trzech — wspólny kształt bez interfejsu'],
  ['P08', 'abstrakcja', 'ryzyko', 'interfejs zadeklarowany, nieskonsumowany'],
  ['P09', 'abstrakcja', 'uwaga', 'interfejs bez kontraktów akcji'],
  ['P10', 'abstrakcja', 'podpowiedz', 'typ-kombinacja zamiast kompozycji interfejsów'],
  ['P11', 'abstrakcja', 'podpowiedz', 'powtórzona właściwość bez typu współdzielonego'],
  ['P12', 'nazewnictwo', 'ryzyko', 'Misnomer — ogólna nazwa typu'],
  ['P13', 'nazewnictwo', 'ryzyko', 'brak właściwości tytułowej'],
  ['P14', 'nazewnictwo', 'uwaga', 'Misnomer — niedookreślone nazwy właściwości (agregat na typ)'],
  ['P15', 'nazewnictwo', 'podpowiedz', 'niespójna konwencja dat'],
  ['P16', 'nazewnictwo', 'podpowiedz', 'dwa style nazw w jednym modelu'],
  ['P17', 'nazewnictwo', 'podpowiedz', 'Misnomer — link bez treści relacji'],
  ['P18', 'relacje', 'ryzyko', 'link bez nazwy powrotnej'],
  ['P19', 'akcje', 'ryzyko', 'Action Sprawl — ponad 10 akcji na typ'],
  ['P20', 'akcje', 'uwaga', 'Action Sprawl — akcja `set[Właściwość]`'],
  ['P21', 'akcje', 'ryzyko', 'Golden Hammer — akcja bez parametrów'],
  ['P22', 'akcje', 'uwaga', 'akcja bez kryteriów zgłoszenia'],
  ['P23', 'akcje', 'podpowiedz', 'mega-akcja — zbyt szeroki zasięg edycji'],
  ['P24', 'wlasciwosci', 'zlamanie', 'właściwość pochodna edytowana przez akcję'],
  ['P25', 'wlasciwosci', 'ryzyko', 'właściwość pochodna oznaczona jako wymagana'],
  ['P26', 'wlasciwosci', 'podpowiedz', 'licznik utrzymywany ręcznie zamiast pochodnej'],
  ['P27', 'wlasciwosci', 'podpowiedz', 'rodzina pól o wspólnym wyrazie — kandydat na strukturę'],
  ['P28', 'relacje', 'podpowiedz', 'typ bez ani jednego linku'],
  ['P29', 'relacje', 'uwaga', 'zduplikowana krawędź między tą samą parą typów'],
  ['P30', 'relacje', 'podpowiedz', 'N:M bez obiektu pośredniego'],
  ['P31', 'cykl-zycia', 'ryzyko', 'zasoby bez statusu (agregat na rodzaj)'],
  ['P32', 'cykl-zycia', 'zlamanie', 'link dojrzalszy niż jego końce'],
  ['P33', 'cykl-zycia', 'uwaga', 'brak widoczności na typach'],
  ['P34', 'cykl-zycia', 'ryzyko', '`deprecated` bez następcy'],
  ['P35', 'tozsamosc', 'zlamanie', 'brak klucza głównego'],
  ['P36', 'tozsamosc', 'podpowiedz', 'klucz złożony'],
  ['P37', 'tozsamosc', 'zlamanie', 'klucz zawiera pole do wycofania'],
  ['P38', 'tozsamosc', 'podpowiedz', 'klucz niedeterministyczny'],
  ['P39', 'tozsamosc', 'zlamanie', 'klucz wskazuje nieistniejące pole'],
  ['P40', 'bezpieczenstwo', 'podpowiedz', 'wrażliwe pole bez klasyfikacji'],
  ['P41', 'bezpieczenstwo', 'uwaga', 'brak osi wierszowej bezpieczeństwa'],
  ['P42', 'dokumentacja', 'uwaga', 'zasoby bez opisu'],
  ['P43', 'dokumentacja', 'uwaga', 'właściwości bez opisu'],
  ['P44', 'abstrakcja', 'ryzyko', 'typ kodu funkcji stojący w grupie typów ontologii'],
  ['P45', 'abstrakcja', 'zlamanie', 'typ kodu funkcji użyty jako typ właściwości lub parametru'],
  ['P46', 'abstrakcja', 'uwaga', 'zadeklarowany typ, do którego nic nie sięga'],
  ['P47', 'abstrakcja', 'zlamanie', 'wymagany kontrakt interfejsu niespełniony przez implementatora'],
  ['P48', 'akcje', 'podpowiedz', 'jedna akcja, dwie operacje — God Object na akcji'],
  ['P49', 'wlasciwosci', 'ryzyko', 'pole „liczone”, którego Foundry nie policzy (nie z linków)'],
  ['P50', 'relacje', 'ryzyko', 'ta sama relacja opisana dwa razy — link N:M i obiekt pośredni'],
  ['P51', 'abstrakcja', 'podpowiedz', 'sygnatura bierze typ konkretny, choć umowa ma kilku implementatorów'],
  ['P52', 'abstrakcja', 'zlamanie', 'struktura w strukturze na powierzchni ontologii — pola struct są płaskie'],
  ['P53', 'wlasciwosci', 'ryzyko', 'pole wypełniane ręką, do którego nie pisze żadna akcja'],
  ['P54', 'akcje', 'podpowiedz', 'dziennik edycji bez wartości sprzed zmiany — cofanie nie ma czego przeczytać'],
  ['P55', 'akcje', 'zlamanie', 'przyjęto znalezisko klasy `zlamanie` — złamania się nie przyjmuje, tylko naprawia'],
  ['P56', 'akcje', 'zlamanie', 'przyjęcie RYZYKA bez adresata i daty — nie wiadomo, czyj to powód i czy jeszcze obowiązuje'],
  ['P57', 'akcje', 'zlamanie', 'przyjęcie OSIEROCONE — reguła spoza zestawu albo cel, którego w modelu nie ma'],
  ['P58', 'nazewnictwo', 'zlamanie', 'nazwa API typu albo kontraktu nie jest PascalCase z samych znaków alfanumerycznych'],
  ['P59', 'nazewnictwo', 'zlamanie', 'dwa typy obiektów o tej samej nazwie API'],
  ['P60', 'nazewnictwo', 'zlamanie', 'nazwa API typu albo kontraktu jest słowem zastrzeżonym platformy'],
  ['P61', 'nazewnictwo', 'uwaga', 'kontrakt i typ pod jedną nazwą API — ⚠ źródło o tej kolizji MILCZY'],
  ['P62', 'nazewnictwo', 'zlamanie', 'nazwa API właściwości nie do zapisania albo powtórzona w typie'],
  ['P63', 'nazewnictwo', 'zlamanie', 'pole struktury o nazwie zastrzeżonej'],
  ['P64', 'nazewnictwo', 'zlamanie', 'nazwa API strony linku nie do zapisania (myślnik, podkreślenie, słowo zastrzeżone)'],
  ['P65', 'nazewnictwo', 'zlamanie', 'dwa przejścia z jednego typu pod tą samą nazwą strony'],
  ['P66', 'wlasciwosci', 'zlamanie', 'typ spoza tabeli typów bazowych'],
  ['P67', 'wlasciwosci', 'zlamanie', 'pole struktury-właściwości o typie spoza listy albo będące tablicą'],
  ['P68', 'akcje', 'zlamanie', 'parametr struct z polem o typie, którego parametr struct nie ma'],
  ['P69', 'akcje', 'zlamanie', 'jedną właściwość struct zasila więcej niż jeden parametr struct'],
  ['P70', 'tozsamosc', 'zlamanie', 'klucz główny albo klucz tytułu na typie, którego tabela do tego nie dopuszcza'],
  ['P71', 'wlasciwosci', 'uwaga', 'kanon obniżył precyzję pola struktury, bo edytuje ją akcja'],
  ['P72', 'wlasciwosci', 'ryzyko', 'właściwość bierze wartość ze źródła, którego ontologia nie ma'],
  ['P73', 'akcje', 'zlamanie', 'reguła `runFunction` połączona z innymi regułami'],
  ['P74', 'akcje', 'zlamanie', 'wejścia funkcji akcji to nie są parametry tej akcji'],
  ['P75', 'relacje', 'zlamanie', 'krawędź celuje w kontrakt zamiast w typ obiektu'],
  ['P76', 'akcje', 'ryzyko', 'gest stawia krawędź wiązki regułą deklaratywną, a nie funkcją'],
  ['P77', 'akcje', 'ryzyko', 'kryterium, którego platforma nie zbuduje, w akcji bez funkcji'],
  ['P78', 'akcje', 'zlamanie', 'parametr z type class bez właściwości o tej samej nazwie i klasie'],
  ['P79', 'dokumentacja', 'zlamanie', 'typ bez nazwy wyświetlanej albo bez nazwy w liczbie mnogiej'],
  ['P80', 'dokumentacja', 'zlamanie', 'strona linku bez nazwy wyświetlanej'],
  ['P81', 'cykl-zycia', 'zlamanie', 'krawędź stoi na wygaszanym kluczu obcym, a sama jest żywa'],
  ['P82', 'relacje', 'zlamanie', 'klucz obcy krawędzi nie jest właściwością albo ma typ inny niż klucz główny celu'],
  ['P83', 'nazewnictwo', 'zlamanie', 'nazwa klucza obcego = nazwa strony linku na tym samym typie'],
  ['P84', 'wlasciwosci', 'zlamanie', 'głębokość `derived.via` większa niż 3 — Foundry unosi najwyżej 3 poziomy'],
  ['P85', 'abstrakcja', 'podpowiedz', 'typ współdzielony użyty na ≤1 typie obiektu'],
  ['P86', 'relacje', 'zlamanie', 'N:M edytowany akcją bez tabeli łączącej (backingObjectType)'],
  ['P87', 'akcje', 'zlamanie', 'delete deklaratywny bez referencji do obiektu albo z kaskadą na obiektach powiązanych'],
  ['P88', 'akcje', 'zlamanie', 'wiele obiektów jednego typu tworzonych z listy w akcji deklaratywnej'],
  ['P89', 'akcje', 'zlamanie', 'akcja na interfejsie zmienia właściwość spoza kontraktu interfejsu'],
].map(([id, kategoria, klasa, opis]) => ({ id, kategoria, klasa, opis }));
