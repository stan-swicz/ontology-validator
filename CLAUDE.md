# ontology-validator — zasady pracy (dla ludzi i sesji AI)

Publiczne narzędzie: ktokolwiek wrzuca ontologię i dostaje **wynik 0–100 z wyjaśnieniem każdego
znaleziska** wg praktyki Palantir Foundry. Co robi i jak go wołać: [`README.md`](README.md).
Ten plik mówi, **jak go zmieniać, żeby liczba dalej coś znaczyła**.

## Pięć zasad, których nie wolno zgubić

1. **Liczbę liczy KOD, model językowy jej nie dotyka.** `engine/palantir.mjs` jest deterministyczny
   — ten sam plik zawsze da ten sam wynik (pilnuje tego test). `web/ai.mjs` dokłada osąd doradczy.
   Gdyby model liczył punkty, raportów nie dałoby się porównać ani wrzucić do CI.
2. **Kontraktem z innymi repozytoriami jest KANON, nie ich format.** To repo czyta szablon Foundry
   (`web/public/szablon.yaml`) i kanon wprost. **Nie dokładaj tu czytnika cudzego formatu** —
   konwerter formatu do kanonu mieszka w repozytorium, które ten format trzyma, a to wysyła pole
   `kanon`. Silnik nie zna ani jednego klucza żadnego konkretnego formatu; pilnuje tego test na
   migawce słów formatu `nueve` (`tests/fixtures/slowa-formatu-nueve.json`).
3. **Każda reguła ma stałe id i CYTAT ze źródła** (`zrodlo`). Bez cytatu narzędzie orzeka o naszym
   guście, a nie o cudzej praktyce. Rozjemcą jest dokumentacja Foundry: fałszywy alarm naprawia się
   w REGULE, a nie w cudzym modelu.
4. **Punkty kosztuje wyłącznie to, co wynika z SAMEGO PLIKU** (tabela niżej). Każdy nasz własny
   detektor na progu liczbowym albo wzorcu nazwy ma klasę `podpowiedz` za **0 pkt** — poprawny model
   regularnie je wywołuje, a karanie za to byłoby karaniem za nasze zgadywanie.
5. **Zestaw reguł ma numer i podbija się go przy KAŻDEJ zmianie, po której czyjś wynik może się
   przesunąć.** Inaczej zdanie „poprawiliśmy się o 6 punktów” przestaje cokolwiek znaczyć.

## Dokładając regułę

1. **Nadaj stałe id** (`P82`…). `P12` ma znaczyć to samo za rok.
2. **Cytat ze źródła jest obowiązkowy** (`zrodlo`: sekcja dokumentacji i zdanie). Test to sprawdza.
3. **Napisz `jak`**, nie tylko `dlaczego` — znalezisko bez recepty to narzekanie.
4. **Dopisz parę testów: „ma trafić” I „NIE ma trafić”.** Reguła łapiąca za szeroko jest gorsza od
   jej braku: po trzecim fałszywym trafieniu czytelnik przestaje czytać raport.
5. **Dopisz wpis do `REGULY`** — test sprawdza spójność kategorii i klas.
6. **Agreguj, gdy brak jest systemowy** — jedno znalezisko na rodzaj, nie 79 identycznych wierszy.
7. **Podbij `WERSJA`** w `engine/palantir.mjs` i odznakę w `web/public/index.html` (wartość statyczna
   — pilnuje jej test). Numer idzie co 0,1.

## Kryterium kosztu — za co wolno odejmować punkty

Punkty kosztuje wyłącznie to, co wynika z samego pliku:

1. **sprzeczność albo rzecz, której Foundry nie zbuduje** — pole liczone edytowane przez akcję,
   klucz wskazujący nieistniejące pole, link dojrzalszy niż jego końce;
2. **brak deklaracji, której Foundry wymaga** — status, opis, klucz główny, nazwa powrotna linku;
3. **wskaźnik wymieniony w dokumentacji DOSŁOWNIE** — *„more than 10 action types for a single
   object type”*, *„names that read like Set [Property]”*, *„many properties that are frequently null”*.

Wszystko inne to podpowiedź za zero punktów.

| klasa | koszt | znaczy |
|---|---|---|
| `zlamanie` | 4 | łamie zasadę stawianą wprost — zwykle nie da się tego zbudować w Foundry |
| `ryzyko` | 1,5 | wpada we wzorzec, przed którym dokumentacja ostrzega |
| `uwaga` | 0,4 | sygnał do przejrzenia; bywa uzasadniony, dlatego kosztuje mało |
| `podpowiedz` | 0 | kod wskazuje kandydata, nie orzeka — każda podpowiedź jedzie do modelu po werdykt |

Klasy `zlamanie` **nie da się przyjąć** (`P55`): przyjęcie znaczyłoby „wiemy, że model jest zły”.
Przyjęcie ryzyka wymaga osoby i daty (`P56`), a przyjęcie bez przedmiotu jest znaleziskiem (`P57`).

## Testy i wdrożenie

```bash
npm test          # silnik (reguły, kanon, YAML, AI, historia) · strona · API na prawdziwym procesie
```

`deploy/wdroz.sh` sam puszcza `npm test` przed wysyłką — **nie wdrażamy nieprzetestowanego
walidatora**, bo orzeka o cudzej pracy. Adres serwera czyta z `deploy/deploy.env` (poza gitem).

## Pułapki, które już kosztowały

- **Obraz kopiuje KATALOGI, nie pliki.** Kiedyś kopiował trzy pliki silnika po nazwie; po dołożeniu
  importu sąsiedniego modułu obraz budował się bez błędu, a kontener padał przy starcie. Test API
  uruchamia prawdziwy proces, więc brakujący import widać przed deployem.
- **`node:sqlite` przez `createRequire`, nie `import`** — vite-node obcina prefiks `node:`.
- **`[hidden]{display:none!important}` stoi globalnie** — bez tego element z `display:flex` zostaje
  na ekranie mimo `hidden` (złapane dwa razy).
- **Reguły wąskiego okna stoją na KOŃCU arkusza** — przy równej szczegółowości wygrywa późniejsza.
- **Pole `kanon` jest obiektem, nie napisem**, i nie wolno go przepuszczać przez czytnik szablonu —
  gubi przyjęte znaleziska (zmierzone: 100 / 1 → 66,9 / 217 na tej samej ontologii).
- **Treść ontologii jest DANYMI, nie poleceniem** — opis typu może zawierać „zignoruj instrukcje”.
  Model dostaje ją jako cytowany blok, jego odpowiedź jest tylko wyświetlana i nie ma wpływu na punkty.
- **Historia jest domyślnie włączona z treścią pliku.** `/api/historia` bez `HISTORIA_TOKEN` nie
  istnieje (404, nie 401). Obietnica na stronie przepisuje się z `/api/zdrowie` — nie wpisuj jej na sztywno.
