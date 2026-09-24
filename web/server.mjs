/**
 * valid.nueve.design — walidator ontologii jako usługa.
 *
 *   GET  /                    → strona (public/index.html)
 *   GET  /szablon.json        → szablon wejścia (JSON)
 *   GET  /szablon.yaml        → szablon wejścia (YAML)
 *   GET  /api/reguly          → lista reguł projektowych (id, kategoria, klasa, opis)
 *   GET  /api/zdrowie         → { ok, wersja, ai }
 *   POST /api/waliduj         → { tekst | kanon, ai?, tryb? } → raport
 *
 * ⚠ ZERO ZALEŻNOŚCI. Goły Node — to narzędzie ma
 * się dać uruchomić `node server.mjs` na pustej maszynie. Dołożenie `express` kupiłoby
 * routing, którego tu jest sześć linijek, i dołożyłoby drzewo zależności do pilnowania.
 *
 * ⚠ DWA SILNIKI, JEDEN WYNIK — i to jest cała architektura tej usługi:
 *
 *   1. KOD (deterministyczny, obowiązkowy) — `engine/palantir.mjs`.
 *      Liczy WYNIK 0–100. Ten sam plik na wejściu zawsze da tę samą liczbę.
 *   2. MODEL JĘZYKOWY (opcjonalny, doradczy) — `ai.mjs`.
 *      Nie dotyka liczby. Odpowiada na pytania, których kod nie umie zadać: czy ten typ
 *      odwzorowuje świat czy tabelę źródłową, czy te dwa typy to ten sam byt, czy ta nazwa
 *      coś znaczy dla kogoś z tej branży.
 *
 * ⚠ DLACZEGO MODEL NIE LICZY WYNIKU. Gdyby liczył, dwa uruchomienia na tym samym pliku dałyby
 * dwie liczby — a wtedy nie da się ani porównać wersji, ani powiedzieć „poprawiliśmy się
 * o 6 punktów”, ani wrzucić raportu do CI. Liczba musi być powtarzalna; osąd nie musi.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ocen, REGULY, KATEGORIE, KLASY, WERSJA } from '../engine/palantir.mjs';
import { normalizuj, rozpoznajFormat, wczytajTekst } from '../engine/normalizuj.mjs';
import { skanuj, klasyfikuj, dostepne as aiDostepne, TRYBY, TRYB_DOMYSLNY } from './ai.mjs';
import * as historia from './historia.mjs';

const KATALOG = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8139);
/* ⚠ DWIE RÓŻNE LICZBY I NIE WOLNO ICH MYLIĆ:
   • `WERSJA` (z `palantir.mjs`) to wersja ZESTAWU REGUŁ — mówi, czy dwa wyniki da się porównać.
   • `BUDOWA` to krótki sha commita — mówi, co dokładnie stoi na serwerze.
   Użytkownik potrzebuje pierwszej, my przy diagnozie drugiej. */
const BUDOWA = process.env.WERSJA ?? 'dev';

/* ══════════════════════════════════════════════════════════════════════════════════════════
   OSĄD MODELU: WŁĄCZONY, ALE Z TERMINEM
   ──────────────────────────────────────────────────────────────────────────────────────────
   ⚠ PRZEŁĄCZNIKA NIE MA — model jedzie przy każdym sprawdzeniu (decyzja z 16.09.2026),
   bo to z jego wniosków wyławiamy przeoczenia reguł. Za to ma DATĘ, po której gaśnie sam.
   ⚠ DATA JEST STAŁA, NIE „dwa tygodnie od startu". Liczona od uruchomienia odnawiałaby się
   przy każdym restarcie kontenera i termin nigdy by nie nadszedł — czyli wyłącznik, który
   wygląda na wyłącznik i nim nie jest. Przedłużenie to `AI_DO=RRRR-MM-DD` w pliku env,
   świadomy ruch człowieka, a nie skutek uboczny redeployu. */
const AI_DO = new Date(process.env.AI_DO ?? '2026-09-30T00:00:00Z');
const poTerminie = () => Number.isFinite(AI_DO.getTime()) && Date.now() >= AI_DO.getTime();
const aiCzynne = () => aiDostepne() && !poTerminie();

/* ⚠ LIMIT CIAŁA. Kanon dużej ontologii produkcyjnej (60 typów obiektów, ~400 właściwości, z prozą
   opisów) ma ~1,7 MB, więc 4 MB to nie jest ciasno — a bez limitu
   jeden `curl` z pliku 2 GB kładzie proces. Liczymy BAJTY, nie znaki: `Content-Length` bywa
   kłamstwem, więc przycinamy też w trakcie odbierania. */
const LIMIT_BAJTOW = 4 * 1024 * 1024;

/* ⚠ PRYMITYWNY LICZNIK ŻĄDAŃ NA IP. Nie jest zabezpieczeniem przed kimś, kto chce nam zaszkodzić
   (adres da się zmienić), tylko ochroną przed pętlą w cudzym skrypcie i przed rachunkiem za AI.
   Mapa czyszczona leniwie przy każdym żądaniu — bez `setInterval`, żeby proces dał się ubić. */
const OKNO_MS = 60_000;
const LIMIT_OKNA = 30;
/* ⚠ DWA LIMITY NA AI, PO KOSZCIE PYTANIA, NIE PO NAZWIE. Klasyfikacja to ~500 tokenów wejścia
   i lista nazw na wyjściu; pełny skan — ponad dwadzieścia razy tyle. Jeden wspólny limit
   albo dusiłby tanie pytanie, albo wpuszczał drogie. */
const LIMIT_OKNA_AI = 12;
const LIMIT_OKNA_RECENZJA = 3;
const ruch = new Map();

function przepustka(ip, zAi, tryb = TRYB_DOMYSLNY) {
  const teraz = Date.now();
  for (const [k, v] of ruch) if (teraz - v.od > OKNO_MS) ruch.delete(k);
  const w = ruch.get(ip) ?? { od: teraz, ile: 0, ai: 0, recenzja: 0 };
  if (teraz - w.od > OKNO_MS) { w.od = teraz; w.ile = 0; w.ai = 0; w.recenzja = 0; }
  w.ile += 1;
  if (zAi) w.ai += 1;
  if (zAi && tryb === 'skan') w.recenzja += 1;
  ruch.set(ip, w);
  if (w.ile > LIMIT_OKNA) return 'za dużo żądań — spróbuj za minutę';
  if (zAi && tryb === 'skan' && w.recenzja > LIMIT_OKNA_RECENZJA) {
    return 'za dużo pełnych skanów — spróbuj za minutę albo przełącz na tańszą klasyfikację';
  }
  if (zAi && w.ai > LIMIT_OKNA_AI) return 'za dużo żądań z osądem AI — spróbuj za minutę';
  return null;
}

const TYPY = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const json = (res, kod, dane) => {
  const ciało = JSON.stringify(dane);
  res.writeHead(kod, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(ciało),
    'cache-control': 'no-store',
  });
  res.end(ciało);
};

function ciało(req) {
  return new Promise((resolve, reject) => {
    const kawałki = [];
    let bajtów = 0;
    req.on('data', (c) => {
      bajtów += c.length;
      if (bajtów > LIMIT_BAJTOW) {
        reject(new Error(`wejście przekracza ${Math.round(LIMIT_BAJTOW / 1024 / 1024)} MB`));
        req.destroy();
        return;
      }
      kawałki.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(kawałki).toString('utf8')));
    req.on('error', reject);
  });
}

/* ══════════════════════════════════════════════════════════════════════════════════════════
   WALIDACJA — jedno przejście, dwa (czasem trzy) bloki raportu
   ══════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * @param {{ tekst?: string, kanon?: object }} wejscie  ⚠ DOKŁADNIE jedno z dwóch:
 *   • `tekst` — plik JSON albo YAML w kształcie szablonu (`objectTypes`…) albo kanonu;
 *   • `kanon` — kanon WPROST, jako obiekt: repozytorium z WŁASNYM formatem ontologii zamienia ją
 *     na kanon u siebie i wysyła wynik. Kanonu nie przepisujemy — silnik dostaje go takim, jaki
 *     przyszedł, więc wynik jest taki sam jak u nadawcy przy tym samym zestawie reguł.
 */
async function zbadaj({ tekst, kanon }, { zAi, tryb = TRYB_DOMYSLNY }) {
  const { dane, skladnia } = kanon !== undefined ? { dane: kanon, skladnia: 'json' } : wczytajTekst(tekst);
  const format = rozpoznajFormat(dane);
  if (!format) {
    throw new Error('nie rozpoznaję kształtu — potrzebna jest lista `objectTypes` (szablon) '
      + 'albo kanon z polem `formatWejscia`. Zobacz zakładkę „Szablon”.');
  }
  if (kanon !== undefined && format !== 'kanon') {
    throw new Error('pole `kanon` niesie coś, co nie jest kanonem (brak `formatWejscia` albo '
      + '`objectTypes`) — plik w kształcie szablonu wyślij w polu `tekst`');
  }

  /* ⚠ `nueve` rzuca tu odmowę z instrukcją (`ODMOWA_NUEVE`): konwerter tego formatu mieszka
     w repozytorium, które go trzyma, a nie w narzędziu publicznym. */
  const o = normalizuj(dane);
  if (!o || o.objectTypes.length === 0) {
    throw new Error('ontologia bez ani jednego typu obiektu — nie ma czego oceniać');
  }

  /* BLOK 1 — zgodność z praktyką projektową Foundry. Zawsze. To on daje liczbę. */
  const projekt = ocen(o);

  /* ⚠ SPÓJNOŚCI KONKRETNEGO FORMATU (czy każda referencja się rozwiązuje, czy id się nie
     powtarzają w JEGO słownictwie) TU NIE MA — sprawdza ją walidator formatu w repozytorium,
     które ten format trzyma. To narzędzie orzeka wyłącznie o kanonie, czyli o kształcie Foundry.

     BLOK 2 — osąd modelu. Doradczy, nie wchodzi do liczby.
     ⚠ DOMYŚLNY TRYB TO `klasyfikacja`, czyli ten TANI (sama tabela nazw, zamknięta etykieta,
     wniosek wyciąga kod). `recenzja` — proza o całym szkielecie — jest o rząd wielkości
     droższa i włącza się ją świadomie. Domyślnie tanio, drogo na życzenie, nigdy odwrotnie. */
  let ai = null;
  if (zAi) {
    /* ⚠ Model nie powtarza tego, co znalazł KOD. W trybie prozy dostaje listę znalezisk
       w treści pytania; w klasyfikacji odsiewamy je po odpowiedzi, bo tam pytanie ma być
       maksymalnie krótkie — dokładanie listy do promptu kosztowałoby tokeny przy KAŻDYM
       żądaniu, a odsianie kosztuje zero. */
    /* ⚠ WYŁĄCZNIE Z REGUŁ, KTÓRE MÓWIĄ TO SAMO CO MODEL (dziś `P48`). Pierwsza wersja brała
       nazwy ze WSZYSTKICH znalezisk i uciszała akcję, o której kod powiedział coś zupełnie
       innego („bez opisu”, „bez kryteriów zgłoszenia”) — zjadła znalezisko, dla którego ten
       tryb powstał. Złapane dopiero na żywym żądaniu, nie w teście. */
    const nazwyZKodu = new Set(projekt.znaleziska
      .filter((z) => z.id === 'P48')
      .flatMap((z) => (String(z.co ?? '').match(/`([^`]+)`/g) ?? []).map((x) => x.slice(1, -1))));
    /* ⚠ KANDYDACI LICZNIKA IDĄ DO MODELU PO WERDYKT. `P27` umie powiedzieć „te nazwy mają
       wspólny wyraz”, ale nie „to jest jeden byt” — więc kod NOMINUJE (za zero punktów),
       a model potwierdza albo odrzuca. Bez tego kroku narzędzie zgadywałoby zamiast pytać. */
    /* ⚠ WSZYSTKIE PODPOWIEDZI, nie tylko rodziny pól. Klasa `podpowiedz` z definicji zbiera
       reguły stojące na PROGU albo NAZWIE — czyli dokładnie te, których poprawny model
       regularnie dotyka. Model dostaje je z twierdzeniem i odrzuca te, które w tym modelu są
       uzasadnione. Limit 40, bo to ma kosztować tyle, co dopisek do pytania, a nie drugie pytanie. */
    const kandydaci = projekt.znaleziska
      .filter((z) => z.klasa === 'podpowiedz' && z.kandydat)
      .slice(0, 40)
      .map((z) => ({ klucz: z.kandydat, co: z.co, pola: z.elementy ?? [] }));
    try {
      ai = tryb === 'skan'
        ? await skanuj(o, projekt, REGULY)
        : await klasyfikuj(o, { juzZgloszone: nazwyZKodu, kandydaci });
    }
    catch (e) { ai = { blad: e.message, tryb }; }
  }

  return {
    wersja: WERSJA,
    budowa: BUDOWA,
    wejscie: {
      skladnia, format, ontology: o.ontology, version: o.version ?? null,
      ...projekt.statystyki,
    },
    projekt,
    ai,
  };
}

/* ══════════════════════════════════════════════════════════════════════════════════════════
   TRASY
   ══════════════════════════════════════════════════════════════════════════════════════════ */

async function plik(res, nazwa) {
  try {
    const sciezka = join(KATALOG, 'public', nazwa);
    /* ⚠ Bez tego sprawdzenia `GET /../../etc/passwd` wychodzi poza katalog. */
    if (!sciezka.startsWith(join(KATALOG, 'public'))) { res.writeHead(403).end('nie'); return; }
    const dane = await readFile(sciezka);
    res.writeHead(200, {
      'content-type': TYPY[extname(nazwa)] ?? 'application/octet-stream',
      'content-length': dane.length,
      'cache-control': nazwa === 'index.html' ? 'no-cache' : 'public, max-age=300',
    });
    res.end(dane);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('nie ma takiej strony');
  }
}

const serwer = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const sciezka = url.pathname;

  /* Nagłówki, które nic nie kosztują, a zamykają trzy klasy cudzych pomysłów na tę stronę. */
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'no-referrer');
  res.setHeader('x-frame-options', 'DENY');

  if (req.method === 'GET' && (sciezka === '/' || sciezka === '/index.html')) return plik(res, 'index.html');
  if (req.method === 'GET' && sciezka === '/szablon.json') return plik(res, 'szablon.json');
  if (req.method === 'GET' && sciezka === '/szablon.yaml') return plik(res, 'szablon.yaml');
  if (req.method === 'GET' && sciezka === '/przyklad-zly.json') return plik(res, 'przyklad-zly.json');

  if (req.method === 'GET' && sciezka === '/api/zdrowie') {
    return json(res, 200, {
      ok: true, wersja: WERSJA, budowa: BUDOWA, ai: aiCzynne(), regul: REGULY.length,
      aiTryby: aiCzynne() ? TRYBY : [], aiTrybDomyslny: TRYB_DOMYSLNY,
      aiDo: Number.isFinite(AI_DO.getTime()) ? AI_DO.toISOString().slice(0, 10) : null,
      aiPoTerminie: poTerminie(),
      historia: historia.wlaczona(), historiaTresc: historia.zTrescia(),
    });
  }
  if (req.method === 'GET' && sciezka === '/api/reguly') {
    return json(res, 200, { reguly: REGULY, kategorie: KATEGORIE, klasy: KLASY });
  }

  if (req.method === 'POST' && sciezka === '/api/waliduj') {
    const ip = (req.headers['x-forwarded-for'] ?? '').split(',')[0].trim()
      || req.socket.remoteAddress || 'nieznane';
    let wejscie;
    try { wejscie = await ciało(req); }
    catch (e) { return json(res, 413, { blad: e.message }); }

    let zadanie;
    try { zadanie = JSON.parse(wejscie); }
    catch { return json(res, 400, { blad: 'ciało żądania nie jest JSON-em' }); }

    /* ⚠ DOMYŚLNIE WŁĄCZONE: brak pola `ai` znaczy „tak", bo strona nie ma już przełącznika.
       Jawne `ai: false` dalej działa — po to, żeby dało się zawołać trasę bez modelu
       ze skryptu albo z testu, nie zmieniając ustawień serwera. */
    const zAi = zadanie.ai !== false && aiCzynne();
    /* Nieznany tryb spada na domyślny (tani) — nigdy na droższy. */
    const tryb = TRYBY.includes(zadanie.tryb) ? zadanie.tryb : TRYB_DOMYSLNY;
    const odmowa = przepustka(ip, zAi, tryb);
    if (odmowa) return json(res, 429, { blad: odmowa });

    /* ⚠ `kanon` jest OBIEKTEM, nie napisem — przychodzi już sparsowany w tym samym JSON-ie.
       Do historii idzie jako tekst, żeby zapis wyglądał tak samo niezależnie od drogi wejścia. */
    const kanon = zadanie.kanon;
    if (kanon !== undefined && (kanon === null || typeof kanon !== 'object' || Array.isArray(kanon))) {
      return json(res, 400, { blad: 'pole `kanon` ma być obiektem (kształt kanoniczny ontologii)' });
    }
    if (kanon !== undefined && zadanie.tekst !== undefined) {
      return json(res, 400, { blad: 'wyślij `tekst` ALBO `kanon`, nie oba naraz' });
    }
    const tekst = kanon !== undefined ? JSON.stringify(kanon) : String(zadanie.tekst ?? '');
    try {
      const raport = await zbadaj(kanon !== undefined ? { kanon } : { tekst }, { zAi, tryb });
      /* ⚠ ZAPIS NIE MA PRAWA ZEPSUĆ ODPOWIEDZI. `zapisz` nigdy nie rzuca (patrz nagłówek
         `historia.mjs`), a błąd bazy idzie do logu — człowiek, który właśnie wrzucił plik,
         nie ma oglądać naszych kłopotów z dyskiem.
         ⚠ JEST SYNCHRONICZNY, bo `node:sqlite` jest synchroniczne: kilka `INSERT`-ów na jedno
         żądanie. Pierwsza wersja wołała go z `.catch()` jak obietnicę — i drugie żądanie
         wracało jako 422, bo `.catch` nie jest funkcją boolean-a. Złapane na trzecim strzale
         pod rząd, nie w teście. */
      historia.zapisz({ raport, tekst, ip });
      return json(res, 200, raport);
    } catch (e) {
      /* ⚠ NIEUDANE SPRAWDZENIE ZAPISUJEMY TAK SAMO — i to ono jest najcenniejsze. Plik,
         którego nie umieliśmy przeczytać, mówi o narzędziu więcej niż dziesięć, które
         przeszły; trzy odmowy z rzędu, od których zaczęły się ostatnie poprawki parsera,
         nie zostawiły w bazie ANI JEDNEGO śladu i wróciły do nas dopiero pocztą pantoflową. */
      historia.zapisz({ raport: null, tekst, ip, blad: e.message });
      /* ⚠ Powód, nie samo „nie udało się”: człowiek ma wiedzieć, CO poprawić w pliku. */
      return json(res, 422, { blad: e.message });
    }
  }

  /* ⚠ HISTORIA NIE JEST PUBLICZNA — i po dołożeniu podglądu na stronie znaczy to WIĘCEJ niż
     wcześniej. Do 16.09 z bazy wychodziły same metryki; od kiedy zegarek w pasku otwiera
     wynik sprzed tygodnia, wychodzi też TREŚĆ wrzuconego pliku, czyli cudzy model biznesu.
     Adres jest publiczny, więc jedyne, co dzieli zbiór do optymalizacji reguł od wycieku,
     to ten token. Bez `HISTORIA_TOKEN` tych tras po prostu NIE MA (404, nie 401:
     nieistniejąca trasa nie zdradza, że coś tu jest do odgadnięcia).
     ⚠ Token wolno podać `?klucz=` — inaczej nie da się go wpisać z przeglądarki; strona
     zapamiętuje go u siebie i dalej wysyła nagłówkiem. `referrer-policy: no-referrer` stoi
     wyżej, więc nie wycieknie linkiem. */
  const historiaOtwarta = () => {
    const token = process.env.HISTORIA_TOKEN ?? '';
    if (!token) return false;
    const naglowek = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    return naglowek === token || url.searchParams.get('klucz') === token;
  };

  /* Jedno sprawdzenie w całości — z treścią. Do przeglądania w zegarku. */
  const jedno = /^\/api\/historia\/(\d+)$/.exec(sciezka);
  if (req.method === 'GET' && jedno) {
    if (!historiaOtwarta()) return json(res, 404, { blad: 'nie ma takiej trasy' });
    const wpis = historia.jedno(Number(jedno[1]));
    if (!wpis) return json(res, 404, { blad: 'nie ma takiego sprawdzenia' });
    return json(res, 200, wpis);
  }

  if (req.method === 'GET' && sciezka === '/api/historia') {
    if (!historiaOtwarta()) return json(res, 404, { blad: 'nie ma takiej trasy' });
    const q = url.searchParams;
    const ile = Math.min(500, Math.max(1, Number(q.get('ile') ?? 50)));
    /* ⚠ `?co=przeoczenia` to pytanie, dla którego powstała cała historia: które klasy
       przeoczeń wracają i jak często. Klasa, która wróciła piąty raz, jest gotowym
       zamówieniem na regułę. `?co=reguly` pokazuje drugą stronę: reguły martwe i krzyczące. */
    if (q.get('co') === 'przeoczenia') return json(res, 200, { przeoczenia: historia.przeoczenia(ile) });
    if (q.get('co') === 'reguly') return json(res, 200, { reguly: historia.regulyWgCzestosci(ile) });
    return json(res, 200, { wpisow: ile, wpisy: historia.ostatnie(ile) });
  }

  if (req.method === 'GET' && /^\/[a-z0-9.-]+\.(css|js|svg)$/.test(sciezka)) {
    return plik(res, sciezka.slice(1));
  }

  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('nie ma takiej trasy');
});

serwer.listen(PORT, () => {
  console.log(`walidator ontologii — http://localhost:${PORT}  (reguły ${WERSJA}, budowa ${BUDOWA}, `
    + `${REGULY.length} reguł, AI: ${aiCzynne() ? `włączone do ${AI_DO.toISOString().slice(0, 10)}`
      : poTerminie() ? 'WYGASŁO (AI_DO)' : 'wyłączone'})`);
});

export { zbadaj, serwer };
