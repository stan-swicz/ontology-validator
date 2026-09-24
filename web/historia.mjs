/**
 * HISTORIA EGZEKUCJI — amunicja do pisania kolejnych reguł.
 *
 * Każde uruchomienie walidatora zostawia wpis: co wrzucono, ile dostało punktów, co zgłosił
 * KOD i co zgłosił MODEL. Po to, żeby pytanie „czego nasze reguły nie łapią” miało odpowiedź
 * Z DANYCH, a nie z pamięci — wnioski modelu są dziś jedynym miejscem, w którym widać
 * przeoczenia silnika, i bez zapisu znikają razem z zamknięciem karty.
 *
 * ⚠ WŁĄCZONA DOMYŚLNIE — decyzja właściciela: „zapisujemy wszystko by default”. Wyłącza się
 * jawnie (`HISTORIA=0`), a strona MÓWI O TYM SAMA: stopka czyta stan z `/api/zdrowie`, więc
 * nie ma jak zostać nieprawdą po cichu.
 * ⚠ NUMER ZESTAWU REGUŁ TEGO NIE DOTYCZY. Wersję podbija się, gdy czyjś WYNIK może się
 * przesunąć; historia nie liczy ani jednego punktu, więc raporty sprzed i po zostają
 * porównywalne. To jest ta sama granica, co przy warstwie AI.
 *
 * ⚠ BAZA BEZ ANI JEDNEJ ZALEŻNOŚCI: `node:sqlite` jest w Node od 22 (w 24, na którym stoi
 * obraz, już stabilny). To była jedyna droga, żeby dołożyć bazę do usługi, której całą
 * wartością jest to, że nie ma `node_modules` i wstaje bez `npm install`. JSONL by wystarczył
 * do dopisywania, ale nie do PYTANIA — a całe to przedsięwzięcie służy pytaniom w rodzaju
 * „które klasy przeoczeń wracają najczęściej”.
 *
 * ⚠ ZAPIS NIGDY NIE PSUJE ODPOWIEDZI. Błąd idzie do logu, raport wraca normalnie — historia
 * jest narzędziem dla NAS, a nie usługą dla tego, kto właśnie wrzucił plik. Gdy bazy nie da
 * się otworzyć (dysk tylko do odczytu, brak wolumenu), moduł wyłącza się sam i mówi to RAZ,
 * zamiast krzyczeć przy każdym żądaniu.
 */

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
/* ⚠ `node:sqlite` PRZEZ `require`, NIE `import`: vite-node (vitest 2) obcina prefiks
   `node:` i szuka pakietu `sqlite` — testy silnika padały przy samym ładowaniu, a z nimi
   całe CI. `createRequire` idzie prosto do Node'a, więc obraz (Node 24) i testy widzą to samo. */
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const WYLACZONA = process.env.HISTORIA === '0';
const KATALOG = process.env.HISTORIA_KATALOG ?? 'dane';
const PLIK = process.env.HISTORIA_BAZA ?? join(KATALOG, 'historia.db');
/* ⚠ Treść wrzuconej ontologii ma osobny przełącznik, choć domyślnie jest ZAPISYWANA: metryki
   i znaleziska to jedno, cudzy model biznesu to drugie, i ktoś stawiający tę usługę u siebie
   ma móc rozstrzygnąć to jednym słowem, a nie czytaniem kodu. */
const BEZ_TRESCI = process.env.HISTORIA_TRESC === '0';
const MAX_TRESC_BAJTOW = Number(process.env.HISTORIA_MAX_BAJTOW ?? 4 * 1024 * 1024);

let baza = null;
let padla = false;

export const wlaczona = () => !WYLACZONA && !padla;
export const zTrescia = () => wlaczona() && !BEZ_TRESCI;

/** Skrót wejścia — po nim widać, że ten sam plik wrócił, bez porównywania treści. */
export const skrot = (tekst) => createHash('sha256').update(String(tekst)).digest('hex').slice(0, 16);

const SCHEMAT = `
CREATE TABLE IF NOT EXISTS sprawdzenia (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kiedy TEXT NOT NULL, skrot TEXT NOT NULL, bajty INTEGER,
  wersja_regul TEXT, budowa TEXT, format TEXT, skladnia TEXT, ontology TEXT,
  typow INTEGER, wlasciwosci INTEGER, linkow INTEGER, akcji INTEGER, interfejsow INTEGER,
  wynik REAL, zlaman INTEGER, ryzyk INTEGER, uwag INTEGER,
  ai_tryb TEXT, ai_model TEXT, ai_we INTEGER, ai_wy INTEGER, ai_blad TEXT, ai_czytelnosc TEXT,
  tresc TEXT, blad TEXT
);
CREATE TABLE IF NOT EXISTS znaleziska (
  sprawdzenie INTEGER NOT NULL, zrodlo TEXT NOT NULL,
  regula TEXT, klasa TEXT, element TEXT, co TEXT, poza_kodem INTEGER
);
/* ⚠ WŁAŚCIWY PLON PEŁNEGO SKANU. Pojedyncze znalezisko naprawia jeden model; NAZWANA KLASA
   problemu, której reguły nie obejmują, daje się zamienić w regułę. Osobna tabela, bo to
   po niej będziemy pytać najczęściej: co wraca i jak często. */
CREATE TABLE IF NOT EXISTS przeoczenia (
  sprawdzenie INTEGER NOT NULL, kiedy TEXT NOT NULL, klasa TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sprawdzenia_kiedy ON sprawdzenia(kiedy);
CREATE INDEX IF NOT EXISTS sprawdzenia_skrot ON sprawdzenia(skrot);
CREATE INDEX IF NOT EXISTS znaleziska_regula ON znaleziska(regula);
`;

function polacz() {
  if (baza || padla || WYLACZONA) return baza;
  try {
    mkdirSync(KATALOG, { recursive: true });
    baza = new DatabaseSync(PLIK);
    /* WAL — zapis nie blokuje odczytu, więc `sqlite3 historia.db` z drugiej sesji działa
       w trakcie pracy usługi. Przy jednym procesie to i tak głównie wygoda. */
    baza.exec('PRAGMA journal_mode = WAL');
    baza.exec(SCHEMAT);
    /* ⚠ `CREATE TABLE IF NOT EXISTS` NIE DOKŁADA KOLUMNY do tabeli, która już stoi — a na
       prodzie stoi, z zebraną historią, której nie wolno skasować. Dlatego migracja: dopisz
       to, czego nie ma. Bez tego kolumna `blad` istniałaby wyłącznie na świeżej bazie
       i zapis nieudanego sprawdzenia padałby na serwerze, a działał lokalnie. */
    const kolumny = new Set(baza.prepare('PRAGMA table_info(sprawdzenia)').all().map((k) => k.name));
    for (const [nazwa, typ] of [['blad', 'TEXT']]) {
      if (!kolumny.has(nazwa)) baza.exec(`ALTER TABLE sprawdzenia ADD COLUMN ${nazwa} ${typ}`);
    }
    return baza;
  } catch (e) {
    padla = true;
    console.error('historia: baza niedostępna, zapis WYŁĄCZONY —', e.message);
    return null;
  }
}

/** Kształt wpisu — czysta funkcja, testowalna bez dysku. */
export function wpis({ raport, tekst, ip, blad = null }) {
  const p = raport?.projekt ?? {};
  const licz = (klasa) => (p.znaleziska ?? []).filter((z) => z.klasa === klasa).length;
  return {
    kiedy: new Date().toISOString(),
    skrot: skrot(tekst),
    bajty: Buffer.byteLength(String(tekst ?? ''), 'utf8'),
    wersjaRegul: raport?.wersja ?? null,
    budowa: raport?.budowa ?? null,
    format: raport?.wejscie?.format ?? null,
    skladnia: raport?.wejscie?.skladnia ?? null,
    ontology: raport?.wejscie?.ontology ?? null,
    /* ⚠ Nazwy pól statystyk są PO ANGIELSKU, bo takie wystawia silnik (`objectTypes`,
       `linkTypes`…). Pierwsza wersja czytała polskie i zapisywała same `null` — a kolumna
       pełna nullów wygląda w bazie tak samo, jak kolumna, której nikt nie wypełnił. */
    statystyki: {
      typow: raport?.wejscie?.objectTypes ?? null,
      wlasciwosci: raport?.wejscie?.properties ?? null,
      linkow: raport?.wejscie?.linkTypes ?? null,
      akcji: raport?.wejscie?.actionTypes ?? null,
      interfejsow: raport?.wejscie?.interfaces ?? null,
    },
    wynik: p.wynik ?? null,
    zlaman: licz('zlamanie'),
    ryzyk: licz('ryzyko'),
    uwag: licz('uwaga'),
    kod: (p.znaleziska ?? []).map((z) => ({ id: z.id, klasa: z.klasa, co: z.co })),
    ai: raport?.ai
      ? {
        tryb: raport.ai.tryb ?? null,
        model: raport.ai.model ?? null,
        zuzycie: raport.ai.zuzycie ?? null,
        blad: raport.ai.blad ?? null,
        czytelnosc: raport.ai.czytelnosc ?? null,
        znaleziska: raport.ai.znaleziska ?? [],
        klasyPrzeoczen: raport.ai.klasyPrzeoczen ?? [],
      }
      : null,
    /* ⚠ NIEUDANE SPRAWDZENIE TEŻ JEST SPRAWDZENIEM — i to ono jest najcenniejsze. Plik,
       którego nie umieliśmy przeczytać, mówi o narzędziu więcej niż dziesięć plików, które
       przeszły; trzy odmowy z rzędu, od których zaczęły się ostatnie poprawki parsera,
       nie zostawiły w bazie ani jednego śladu. Wpis bez wyniku, za to z powodem. */
    blad: blad ? String(blad).slice(0, 2000) : null,
    /* Sam fakt, że żądanie skądś przyszło — bez adresu. Do liczenia, nie do identyfikacji. */
    zIp: Boolean(ip),
  };
}

/** Dopisuje wpis. ⚠ Nigdy nie rzuca — patrz nagłówek. Zwraca `true`, gdy zapis się udał. */
export function zapisz({ raport, tekst, ip, blad = null }) {
  const db = polacz();
  if (!db) return false;
  try {
    const w = wpis({ raport, tekst, ip, blad });
    const tresc = zTrescia() && w.bajty <= MAX_TRESC_BAJTOW ? String(tekst) : null;
    const r = db.prepare(`INSERT INTO sprawdzenia
      (kiedy, skrot, bajty, wersja_regul, budowa, format, skladnia, ontology,
       typow, wlasciwosci, linkow, akcji, interfejsow,
       wynik, zlaman, ryzyk, uwag, ai_tryb, ai_model, ai_we, ai_wy, ai_blad, ai_czytelnosc,
       tresc, blad)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      w.kiedy, w.skrot, w.bajty, w.wersjaRegul, w.budowa, w.format, w.skladnia, w.ontology,
      w.statystyki.typow, w.statystyki.wlasciwosci, w.statystyki.linkow, w.statystyki.akcji,
      w.statystyki.interfejsow, w.wynik, w.zlaman, w.ryzyk, w.uwag,
      w.ai?.tryb ?? null, w.ai?.model ?? null,
      w.ai?.zuzycie?.prompt_tokens ?? null, w.ai?.zuzycie?.completion_tokens ?? null,
      w.ai?.blad ?? null, w.ai?.czytelnosc ?? null, tresc, w.blad,
    );
    const id = Number(r.lastInsertRowid);

    const wstawZnalezisko = db.prepare(`INSERT INTO znaleziska
      (sprawdzenie, zrodlo, regula, klasa, element, co, poza_kodem) VALUES (?,?,?,?,?,?,?)`);
    for (const z of w.kod) wstawZnalezisko.run(id, 'kod', z.id, z.klasa, null, z.co, 0);
    for (const z of w.ai?.znaleziska ?? []) {
      wstawZnalezisko.run(id, 'ai', z.id ?? null, z.klasa ?? null, z.element ?? null,
        z.co ?? null, z.pozaKodem ? 1 : 0);
    }
    const wstawPrzeoczenie = db.prepare('INSERT INTO przeoczenia (sprawdzenie, kiedy, klasa) VALUES (?,?,?)');
    for (const kl of w.ai?.klasyPrzeoczen ?? []) wstawPrzeoczenie.run(id, w.kiedy, String(kl));
    return true;
  } catch (e) {
    console.error('historia: nie udało się zapisać wpisu —', e.message);
    return false;
  }
}

/**
 * Ostatnie sprawdzenia, SAME METRYKI. ⚠ Kolumna `tresc` NIE WYCHODZI ŻADNĄ TRASĄ — cudza
 * ontologia zostaje na dysku serwera. Historia jest amunicją dla nas, a nie kolejnym
 * publicznym zasobem.
 */
export function ostatnie(ile = 50) {
  const db = polacz();
  if (!db) return [];
  try {
    return db.prepare(`SELECT id, kiedy, skrot, bajty, wersja_regul, format, skladnia, ontology,
      typow, wlasciwosci, linkow, akcji, interfejsow, wynik, zlaman, ryzyk, uwag,
      ai_tryb, ai_model, ai_we, ai_wy, ai_blad, blad
      FROM sprawdzenia ORDER BY id DESC LIMIT ?`).all(ile);
  } catch (e) {
    console.error('historia: nie udało się odczytać —', e.message);
    return [];
  }
}

/**
 * JEDNO sprawdzenie w całości — z treścią wrzuconego pliku i ze znaleziskami, złożone
 * z powrotem w kształt RAPORTU, żeby strona narysowała je tą samą funkcją co świeży wynik.
 *
 * ⚠ TA FUNKCJA ODDAJE CUDZĄ ONTOLOGIĘ. Jedyna w tym module, która to robi — `ostatnie()`
 * kolumny `tresc` nawet nie wybiera. Trasa, która ją woła, MUSI stać za tokenem; bez tego
 * publiczny adres zamieniłby zbiór do optymalizacji reguł w czyjś wyciek. Wołający odpowiada
 * za bramkę, ale skoro to tutaj treść wychodzi, to tutaj stoi ostrzeżenie.
 */
export function jedno(id) {
  const db = polacz();
  if (!db) return null;
  try {
    const w = db.prepare('SELECT * FROM sprawdzenia WHERE id = ?').get(Number(id));
    if (!w) return null;
    const zn = db.prepare('SELECT zrodlo, regula, klasa, element, co, poza_kodem FROM znaleziska WHERE sprawdzenie = ?').all(Number(id));
    const przeocz = db.prepare('SELECT klasa FROM przeoczenia WHERE sprawdzenie = ?').all(Number(id));
    return {
      id: w.id,
      kiedy: w.kiedy,
      blad: w.blad ?? null,
      tresc: w.tresc ?? null,
      raport: w.blad ? null : {
        wersja: w.wersja_regul,
        budowa: w.budowa,
        wejscie: {
          format: w.format, skladnia: w.skladnia, ontology: w.ontology,
          objectTypes: w.typow, properties: w.wlasciwosci, linkTypes: w.linkow,
          actionTypes: w.akcji, interfaces: w.interfejsow,
        },
        projekt: {
          wynik: w.wynik,
          znaleziska: zn.filter((z) => z.zrodlo === 'kod')
            .map((z) => ({ id: z.regula, klasa: z.klasa, co: z.co })),
        },
        ai: w.ai_model || w.ai_blad ? {
          tryb: w.ai_tryb, model: w.ai_model, blad: w.ai_blad, czytelnosc: w.ai_czytelnosc,
          zuzycie: { prompt_tokens: w.ai_we, completion_tokens: w.ai_wy },
          znaleziska: zn.filter((z) => z.zrodlo === 'ai')
            .map((z) => ({ id: z.regula, klasa: z.klasa, element: z.element, co: z.co, pozaKodem: !!z.poza_kodem })),
          klasyPrzeoczen: przeocz.map((x) => x.klasa),
        } : null,
      },
    };
  } catch (e) {
    console.error('historia: nie udało się odczytać wpisu —', e.message);
    return null;
  }
}

/**
 * ⚠ TO JEST PYTANIE, DLA KTÓREGO POWSTAŁA CAŁA HISTORIA: które klasy przeoczeń wracają
 * i jak często. Klasa, która wróciła piąty raz, jest gotowym zamówieniem na regułę.
 */
export function przeoczenia(ile = 100) {
  const db = polacz();
  if (!db) return [];
  try {
    return db.prepare(`SELECT klasa, COUNT(*) AS ile, MAX(kiedy) AS ostatnio
      FROM przeoczenia GROUP BY klasa ORDER BY ile DESC, ostatnio DESC LIMIT ?`).all(ile);
  } catch (e) {
    console.error('historia: nie udało się policzyć przeoczeń —', e.message);
    return [];
  }
}

/** Ile razy która reguła się odezwała — po tym widać reguły martwe i reguły krzyczące. */
export function regulyWgCzestosci(ile = 100) {
  const db = polacz();
  if (!db) return [];
  try {
    return db.prepare(`SELECT regula, klasa, COUNT(*) AS ile
      FROM znaleziska WHERE zrodlo = 'kod' AND regula IS NOT NULL
      GROUP BY regula, klasa ORDER BY ile DESC LIMIT ?`).all(ile);
  } catch (e) {
    console.error('historia: nie udało się policzyć reguł —', e.message);
    return [];
  }
}
