/**
 * Strona walidatora (`web/public/index.html`) — wszystko, czego pilnuje SAM HTML.
 *
 * ⚠ CZEMU TO JEST OSOBNY PLIK. `palantir-silnik.test.mjs` odpowiada na pytanie „czy reguła
 * liczy dobrze"; tutaj stoją asercje o STRONIE, która jest statyczna i nie ma innego strażnika.
 *
 * ⚠ CO TE TESTY NAPRAWDĘ ŁAPIĄ: nie wygląd — wygląd sprawdza się oczami — tylko RZECZY, KTÓRE
 * JUŻ ZNIKNĘŁY albo WRÓCIŁY bez niczyjej decyzji. Każdy test niżej ma za sobą taki przypadek
 * i jest opisany przy asercji, bo bez tego następna osoba skasuje go jako „testowanie HTML-a".
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KORZEN = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(KORZEN, 'web/public/index.html'), 'utf8');

/* Widok narzędzia — wszystko między `<main>` a `</main>`. Poza nim żyje dokumentacja. */
const narzedzie = html.slice(html.indexOf('<main id="narzedzie">'), html.indexOf('</main>'));

describe('strona walidatora — instrukcja dla nowej osoby', () => {
  it('są cztery kroki, a krok 1 ma podpięty przycisk pobrania szablonu YAML', () => {
    expect((html.match(/<li class="krok">/g) ?? []).length).toBe(4);
    expect(html).toContain('id="krokPobierz"');
    expect(html).toMatch(/\$\('#krokPobierz'\)\.onclick\s*=/);
  });

  it('⚠ KROKI STOJĄ W WIDOKU NARZĘDZIA, nie w dokumentacji i nie poza nią', () => {
    /* Zniknęły raz i NIE przez decyzję: gałąź z przebudową układu odbiła się PRZED commitem,
       który je dołożył, więc jej scalenie cofnęłoby kroki bez ani jednej linijki w diffie
       mówiącej „usuń kroki". Tego nie widać w przeglądzie zmian — widać dopiero na stronie,
       i tak to właśnie wyszło. Dlatego MIEJSCE kroków jest asercją, a nie umową. */
    expect(narzedzie, 'lista kroków wypadła z widoku narzędzia').toMatch(/class="kroki"/);
    expect((narzedzie.match(/<li class="krok">/g) ?? []).length).toBe(4);
    expect(narzedzie).toMatch(/id="krokPobierz"/);
  });

  it('pod lidem NIE ma akapitu o numeracji wersji — wystarcza odznaka w rogu', () => {
    /* ⚠ Asercja jest o NIEOBECNOŚCI i szuka TREŚCI, nie konkretnego znacznika: akapit wrócił
       już raz (ta sama stara gałąź, co przy krokach) i właściciel musiał prosić o jego zdjęcie
       drugi raz. Sprawdzanie samego `<strong>Wersja …</strong>` przepuściłoby przepisany wariant.
       Zasada „numer rośnie co 0,1" zostaje w zakładce „Jak liczymy wynik" i w CLAUDE.md —
       na pierwszym ekranie nie ma jej czym obronić: czytelnik przyszedł sprawdzić SWÓJ model,
       a nie przeczytać konwencję wersjonowania NASZEGO narzędzia. */
    const glowna = html.slice(0, html.indexOf('<div id="dokumentacja"'));
    expect(glowna).not.toMatch(/<strong>Wersja \d+\.\d+\.<\/strong> Numer dotyczy/);
    expect(glowna, 'akapit o numeracji wrócił nad pole wklejania').not.toMatch(/rośnie co 0,1/);
    expect(glowna).not.toMatch(/akapitWersji/);
    expect(html).toMatch(/id="znaczekWersji"/);
  });
});

describe('strona walidatora — jeden ekran, dokumentacja osobno', () => {
  it('⚠ `hidden` MUSI wygrywać z `display:flex` — i to regułą GLOBALNĄ, nie po selektorze', () => {
    /* Znalezione renderowaniem strony w przeglądarce, nie przeglądem kodu: `display:none`
       atrybutu `hidden` siedzi w arkuszu PRZEGLĄDARKI i przegrywa z KAŻDĄ naszą regułą.
       Złapane DWA RAZY — najpierw `.przelacznik` (przełącznik AI stał na ekranie bez klucza,
       jechało tak od pierwszego wdrożenia 0.2), potem `#narzedzie` (nie chowało się pod
       dokumentacją). Dlatego reguła jest dziś jedna i dla całej strony: łatanie selektor
       po selektorze znaczy, że trzeci przypadek znów wyjdzie dopiero na ekranie. */
    expect(html).toMatch(/\[hidden\]\{display:none!important\}/);
  });

  it('⚠ DOKUMENTACJA JEST OSOBNYM WIDOKIEM, a nie dalszą częścią strony do przescrollowania', () => {
    expect(html, 'brak kontenera dokumentacji').toMatch(/<div id="dokumentacja" hidden>/);
    /* Kolejność w źródle jest tu twierdzeniem: narzędzie kończy się PRZED dokumentacją,
       więc zakładki nie mogą przypadkiem wylądować w jednym przewijanym ciągu z wejściem. */
    expect(html.indexOf('</main>')).toBeLessThan(html.indexOf('<div id="dokumentacja"'));
    for (const p of ['szablon', 'reguly', 'punktacja', 'api']) {
      expect(html.indexOf(`id="panel-${p}"`), `panel „${p}” stoi poza kontenerem dokumentacji`)
        .toBeGreaterThan(html.indexOf('<div id="dokumentacja"'));
    }
    /* Jedna opcja u góry, obok znaczków — nie czwarty przycisk w rzędzie akcji. */
    const top = html.slice(html.indexOf('<div class="top">'), html.indexOf('<main id="narzedzie">'));
    expect(top, 'przycisk dokumentacji ma stać w pasku górnym').toMatch(/id="przelaczDokumentacje"/);
  });

  it('⚠ DOKUMENTACJA I HISTORIA MAJĄ ADRES — inaczej nie da się ich podesłać ani cofnąć', () => {
    expect(html, 'klik ustawia hash…').toMatch(/window\.location\.hash = nazwa/);
    expect(html, '…a widok przestawia zdarzenie, więc adres i ekran nie rozjadą się')
      .toMatch(/addEventListener\('hashchange'/);
    expect(html, '„wstecz” po zamknięciu wraca do narzędzia, a nie wychodzi ze strony')
      .toMatch(/addEventListener\('popstate'/);
    expect(html, 'wejście prosto pod adres ma od razu pokazać ten widok').toMatch(/widok\(zHasha\(\)\);/);
    /* ⚠ TRZY WIDOKI, JEDNA FUNKCJA. Gdyby każdy przełącznik chował „swoje", dałoby się dojść
       do ekranu, na którym stoją dwa naraz — a przy trzech to już nie jest teoria. */
    expect(html).toMatch(/\$\('#narzedzie'\)\.hidden = Boolean\(nazwa\);/);
    expect(html).toMatch(/for \(const \[k, sel\] of Object\.entries\(WIDOKI\)\) \$\(sel\)\.hidden = nazwa !== k;/);
    expect(Object.keys({ dokumentacja: 1, historia: 1 }).every((k) => html.includes(`${k}: '#${k}'`)),
      'obie pozycje w mapie widoków').toBe(true);
  });

  it('⚠ JEDEN GEST NA EKRANIE WEJŚCIA — i wygaszony, dopóki nie ma czego sprawdzać', () => {
    /* „Wczytaj szablon", „Przykład (zły)" i „Wyczyść" stały obok jedynego przycisku, który ma
       tu znaczenie, i rozpraszały go na cztery równorzędne (decyzja z 16.09.2026). Szablon
       pobiera się dziś z kroku 1 i z dokumentacji — czyli stamtąd, gdzie się o nim czyta. */
    expect(narzedzie).toMatch(/<button class="glowny pelny" id="sprawdz" disabled>/);
    for (const zdjety of ['wczytajSzablon', 'wczytajZly', 'wyczysc']) {
      expect(html, `${zdjety} miał zejść ze strony`).not.toMatch(new RegExp(`id="${zdjety}"`));
    }
    expect(html, 'przycisk sam pilnuje, czy jest co sprawdzać')
      .toMatch(/\$\('#sprawdz'\)\.disabled = !cos;/);
    /* Pobranie szablonu ZOSTAJE — w kroku 1 i w dokumentacji. */
    expect(html).toMatch(/id="krokPobierz"/);
    expect(html).toMatch(/id="pobierzYaml"/);
  });

  it('⚠ TYLKO CIEMNY MOTYW — paleta jasna i przełącznik schodzą RAZEM', () => {
    /* Zostawiona paleta bez przełącznika wygląda jak wsparcie, którego nikt nie sprawdza. */
    expect(html, 'przełącznik zdjęty').not.toMatch(/id="motyw"/);
    expect(html, 'i martwa paleta też').not.toMatch(/data-motyw="jasny"/);
    expect(html, 'przeglądarka ma wiedzieć, że to ciemny').toMatch(/color-scheme:dark/);
    expect(html, 'na jego miejscu stoi zegarek historii').toMatch(/id="przelaczHistorie"/);
  });

  it('⚠ STOPKA ZESZŁA, ALE OBIETNICA ZAPISU ZOSTAŁA — i dalej czyta stan z serwera', () => {
    /* Stopka zniknęła ze strony głównej (decyzja z 16.09.2026), więc dokumentacja jest TERAZ
       JEDYNYM miejscem, gdzie człowiek dowie się, że jego plik zostaje na serwerze. Tym
       bardziej nie wolno wpisać tego zdania na sztywno: pierwsza zmiana ustawień zamieniłaby
       je w kłamstwo i nikt by tego nie zobaczył. */
    expect(html, 'stopki nie ma').not.toMatch(/class="stopka"/);
    const dokumentacja = html.slice(html.indexOf('<div id="dokumentacja"'));
    expect(dokumentacja, 'obietnica stoi w dokumentacji').toMatch(/id="obietnicaZapisu"/);
    expect(html, 'i dalej przepisuje się z `/api/zdrowie`').toMatch(/z\.historiaTresc/);
  });

  it('⚠ HISTORIA JEST WIDOKIEM ZA KLUCZEM — wynik po lewej, data po prawej', () => {
    /* Zamówiony kształt: lista uruchomień, klik otwiera wynik i POD NIM wrzucony plik.
       Nieudane sprawdzenie ma wykrzyknik zamiast liczby — to ono uczy najwięcej. */
    expect(html).toMatch(/<div id="historia" hidden>/);
    expect(html, 'wiersz: wynik, opis, data').toMatch(/wiersz\.append\(wynik, srodek, el\('span', 'hData'/);
    expect(html, 'błąd zamiast wyniku to wykrzyknik').toMatch(/bl \? '!' :/);
    expect(html, 'i schema na dole').toMatch(/Wrzucony plik/);
    expect(html, 'klucz leci nagłówkiem, nie w adresie przy każdym żądaniu')
      .toMatch(/authorization: `Bearer \$\{kluczHistorii\}`/);
    expect(html, 'a z paska adresu znika po zapamiętaniu').toMatch(/history\.replaceState\('', '', window\.location\.pathname/);
  });

  it('⚠ EKRAN WEJŚCIA MIEŚCI SIĘ W OKNIE, a RAPORT tego ograniczenia nie dziedziczy', () => {
    /* `100dvh`, nie `100vh`: na telefonie pasek adresu zjada różnicę i strona zaczyna skakać. */
    expect(html, 'wysokość okna liczona dynamicznie').toMatch(/min-height:100dvh/);
    expect(html, 'pole tekstowe bierze resztę wysokości, zamiast mieć ją wpisaną')
      .toMatch(/#narzedzie \.pole\{flex:1 1 auto/);
    /* ⚠ Wynik ma prawo być długi. Gdyby jednoekranowość obowiązywała też raport, narzędzie
       chowałoby własną odpowiedź — dlatego klasa na `body`, zdejmowana przy czyszczeniu. */
    expect(html).toMatch(/body\.zraportem \.wrap\{min-height:0\}/);
    expect(html, 'raport włącza tryb rozciągnięty').toMatch(/classList\.add\('zraportem'\)/);
    expect(html, 'a „Wyczyść” wraca do jednego ekranu').toMatch(/classList\.remove\('zraportem'\)/);
  });

  it('⚠ REGUŁY WĄSKIEGO OKNA STOJĄ NA KOŃCU ARKUSZA — inaczej są MARTWE', () => {
    /* Przy równej szczegółowości wygrywa reguła PÓŹNIEJSZA. Blok `@media` stał nad regułami
       komponentów, więc `.krok`, `.rzad` i `.stopka` z niego nie robiły NIC — pomiar telefonu
       nie drgnął ani o piksel po ich dopisaniu i wyglądało to na „telefon się nie mieści",
       a nie na „reguła nie działa". Ten test pilnuje KOLEJNOŚCI, bo to ona jest tu logiką. */
    const media = html.lastIndexOf('@media (max-width:640px)');
    expect(media, 'nie znalazłem bloku wąskiego okna').toBeGreaterThan(0);
    for (const selektor of ['\n.krok{', '\n.rzad{', '\n.stopka{', '\n.pole{', '\n.kroki{']) {
      expect(html.indexOf(selektor), `${selektor.trim()} stoi PO bloku @media — nadpisze go`)
        .toBeLessThan(media);
    }
    /* I tylko JEDEN taki blok — dwa znaczą, że ktoś znów dopisał reguły „bliżej komponentu". */
    expect((html.match(/@media \(max-width:640px\)/g) ?? []).length,
      'bloków wąskiego okna ma być dokładnie jeden').toBe(1);
  });

  it('⚠ NA TELEFONIE KROKI JADĄ W POZIOMIE — cztery karty w słupku to dłużej niż ekran', () => {
    /* Zmierzone: 1469 px treści przy ekranie 844 px, czyli sam wstęp dłuższy niż okno.
       Przewijanie w POZIOMIE jest tu dozwolone (to samo robimy z tabelami): strona w pionie
       zostaje jednym ekranem, a instrukcja zostaje w CAŁOŚCI, zamiast zostać skrócona.
       ⚠ `grid-template-columns:none` jest OBOWIĄZKOWE — bez niego elementy wchodzą najpierw
       w kolumny jawne i `grid-auto-flow:column` nie robi nic (sprawdzone: karta 1 szła wtedy
       na całą szerokość, a reszta obok). */
    const waskie = html.slice(html.lastIndexOf('@media (max-width:640px)'));
    expect(waskie).toMatch(/\.kroki\{grid-template-columns:none;grid-auto-flow:column/);
    expect(waskie, 'karta ma się zatrzymywać na krawędzi, a nie w pół').toMatch(/scroll-snap-align:start/);
  });
});

describe('strona walidatora — siatka kropek w tle', () => {
  it('⚠ SIATKA JEST TŁEM — nie przechwytuje kliknięć, nie mówi nic czytnikowi ekranu', () => {
    expect(html).toMatch(/<canvas id="siatka" aria-hidden="true">/);
    const styl = html.match(/#siatka\{[^}]+\}/)?.[0] ?? '';
    expect(styl, 'kanwa na całą stronę przykryłaby przyciski').toMatch(/pointer-events:none/);
    expect(styl, 'i ma leżeć POD treścią').toMatch(/z-index:0/);
    expect(html, 'a treść nad nią').toMatch(/\.wrap\{[^}]*z-index:1/);
  });

  it('⚠ OZDOBA USTĘPUJE — bez kursora i przy prośbie o spokój zostaje sama statyczna siatka', () => {
    expect(html, 'prośba o brak ruchu jest wiążąca').toMatch(/prefers-reduced-motion: reduce/);
    expect(html, 'na dotyku nie ma kursora, więc nie ma czego śledzić').toMatch(/pointer: coarse/);
    expect(html, 'i wtedy nie wieszamy nawet nasłuchu — nie tylko go ignorujemy')
      .toMatch(/if \(!bezRuchu && !bezKursora\) \{/);
  });

  it('kropki rosną LINIOWO od krawędzi zasięgu do kursora', () => {
    /* To jest zamówiony kształt efektu („linearne powiększenie, ala kula"), a nie szczegół
       implementacji: krzywa wykładnicza dałaby ostry punkt zamiast kuli. */
    expect(html).toMatch(/const t = 1 - d \/ R;/);
    expect(html).toMatch(/const r = MALA \+ \(DUZA - MALA\) \* t;/);
  });

  it('⚠ KROPKA TŁA MA CO NAJMNIEJ PIKSEL — poniżej po prostu jej nie widać', () => {
    /* Pierwsza wersja rysowała tło kwadratem 0,7 px. Na ekranie bez retiny (dpr 1)
       antyaliasing rozmazuje taki kwadrat na dwa piksele po ~⅓ krycia, a kolor idzie
       z `--border-strong`, czyli bieli na 18 % — efekt netto: PUSTA STRONA. Kanwa miała
       wtedy ~8900 pikseli z tuszem, więc „nie ma kropek" i „nie widać kropek" wyglądały
       na zrzucie identycznie. */
    const m = html.match(/const MALA = ([\d.]+);/);
    expect(m, 'nie znalazłem stałej MALA').toBeTruthy();
    expect(Number(m[1]), `MALA = ${m?.[1]} — kropka tła zniknie na zwykłym ekranie`)
      .toBeGreaterThanOrEqual(1);
  });

  it('⚠ POLE WKLEJANIA PRZEPUSZCZA SIATKĘ — inaczej kula nie istnieje tam, gdzie jest kursor', () => {
    /* W układzie jednoekranowym pole zajmuje większość okna. Przy tle krytym efekt działałby
       wyłącznie na marginesach, czyli nigdzie, bo kursor jest nad polem. */
    const styl = html.match(/^\.pole\{[^}]+\}/m)?.[0] ?? '';
    expect(styl, 'tło pola musi być półprzezroczyste')
      .toMatch(/color-mix\(in srgb,var\(--track\) \d+%,transparent\)/);
    const krycie = Number(styl.match(/var\(--track\) (\d+)%/)?.[1]);
    expect(krycie, 'zbyt kryte — siatki nie widać').toBeLessThanOrEqual(80);
    expect(krycie, 'zbyt przezroczyste — pole przestaje być polem').toBeGreaterThanOrEqual(45);
  });
});
