# ontology-validator

Walidator ontologii w kształcie **Palantir Foundry**. Deterministyczny silnik reguł projektowych
daje wynik **0–100** i wyjaśnia każde znalezisko: co jest nie tak, dlaczego to problem według
dokumentacji Foundry, jak to naprawić i skąd pochodzi zasada. Do tego czytnik formatu Foundry
(YAML/JSON) i usługa HTTP.

Instancja publiczna: **https://valid.nueve.design** — strona do wklejenia pliku i API.

## Jedno wywołanie

Plik w kształcie szablonu ([`web/public/szablon.yaml`](web/public/szablon.yaml)):

```bash
curl -s https://valid.nueve.design/api/waliduj \
  -H 'content-type: application/json' \
  -d "$(jq -Rs '{tekst: ., ai: false}' < moja-ontologia.yaml)" | jq '.projekt.wynik'
```

Ontologia we **własnym formacie**, zamieniona na kanon u siebie (patrz „Wejście `kanon`”):

```bash
jq -c '{kanon: ., ai: false}' kanon.json \
  | curl -s https://valid.nueve.design/api/waliduj -H 'content-type: application/json' --data-binary @- \
  | jq '{wynik: .projekt.wynik, znalezisk: (.projekt.znaleziska | length), reguly: .wersja}'
```

## Wejście — `POST /api/waliduj`

| pole | co | uwagi |
|---|---|---|
| `tekst` | napis: plik JSON albo YAML | kształt szablonu (`objectTypes`, `linkTypes`, `actionTypes`…) albo kanon zapisany jako tekst |
| `kanon` | obiekt: kształt kanoniczny wprost | musi mieć `formatWejscia` i `objectTypes`; **nie jest przepisywany** |
| `ai` | `false` wyłącza osąd modelu językowego | domyślnie włączony, jeśli serwer ma klucz i nie minęła data `AI_DO` |
| `tryb` | `skan` (domyślny) albo `klasyfikacja` (tani) | dotyczy wyłącznie osądu modelu |

Wysyła się **dokładnie jedno** z `tekst` / `kanon`. Obowiązkowa jest tylko lista `objectTypes` —
grupa, której nie ma, nie jest karana; karane jest to, co zadeklarowane i niespójne.

### Wejście `kanon` — kontrakt dla repozytoriów z własnym formatem

Kanon to słownictwo Foundry'ego (`objectTypes`, `apiName`, `MANY_TO_ONE`…), na którym liczy silnik.
Repozytorium, które trzyma ontologię we własnym formacie, **zamienia ją na kanon u siebie**
i wysyła wynik w polu `kanon`. Dzięki temu:

- to narzędzie nie zna żadnego cudzego formatu, a zmiana takiego formatu nie wymaga zmiany tutaj;
- wynik przez API jest taki sam jak u nadawcy przy tym samym zestawie reguł (kanon trafia do
  silnika bez zmian — razem z przyjętymi znaleziskami, kontraktem akcji i wiązkami linków);
- kanon jest mniejszy od pliku źródłowego (proza historii zostaje u nadawcy) i niesie już nazwy
  wyświetlane ze słownika klienta.

⚠ Kanonu **nie wysyła się jako szablonu Foundry**: czytnik szablonu nie zna pól, których szablon
nie ma, i gubi je. Zmierzone na ontologii produkcyjnej: **100 / 1 znalezisko** wprost i **66,9 /
217** po ponownym czytaniu jako szablon.

Manifest w formacie `nueve` dostaje **422** z instrukcją — jego konwerter do kanonu mieszka
w repozytorium, które ten format trzyma.

## Wyjście

| pole | co |
|---|---|
| `wersja` | zestaw reguł — wyniki porównuj wyłącznie w obrębie jednego zestawu |
| `budowa` | krótki sha commita, z którego zbudowano usługę |
| `wejscie` | `skladnia` (`json`/`yaml`), `format` (`foundry`/`kanon`), statystyki modelu |
| `projekt.wynik` | liczba 0–100, deterministyczna |
| `projekt.znaleziska[]` | `id`, `klasa`, `kategoria`, `co`, `gdzie`, `dlaczego`, `jak`, `zrodlo` |
| `projekt.przyjete[]` | znaleziska przyjęte z powodem (nie liczą się do wyniku) |
| `projekt.kategorie`, `projekt.blokujace`, `projekt.podsumowanie` | rozbicie wyniku |
| `ai` | osąd modelu językowego albo `null` — **nie dotyka liczby** |

Pozostałe trasy: `GET /api/zdrowie` (wersja reguł, sha, stan AI i historii), `GET /api/reguly`
(lista reguł z kategorią i klasą), `GET /szablon.yaml`, `GET /szablon.json`, `GET /` (strona).

## Klasy znalezisk i koszty

| klasa | koszt | znaczy |
|---|---|---|
| `zlamanie` | 4 pkt | łamie zasadę stawianą wprost — zwykle **nie da się tego zbudować** w Foundry |
| `ryzyko` | 1,5 pkt | wpada we wzorzec, przed którym dokumentacja ostrzega |
| `uwaga` | 0,4 pkt | sygnał do przejrzenia; bywa uzasadniony |
| `podpowiedz` | 0 pkt | kod wskazuje kandydata, nie orzeka — rozstrzyga model albo człowiek |

`wynik = 100 − suma kosztów`, przycięta budżetem kategorii (budżety sumują się do 100), więc jeden
zepsuty obszar nie zjada całego wyniku, a widać, gdzie model przestał trzymać.

**Przyjęte znaleziska.** Kanon może nieść `acceptedFindings: [{ rule, target, why, decidedBy, date }]`.
Przyjęte znalezisko przechodzi na listę `przyjete` i nie liczy się do wyniku. Znaleziska klasy
`zlamanie` przyjąć się nie da (`P55`) — takie się naprawia. `target` to nazwa z modelu (typ, link,
akcja, `Typ.pole`) albo `*` dla znaleziska o zasięgu całego modelu.

## Zestaw reguł

Numer stoi w jednym miejscu: `WERSJA` w [`engine/palantir.mjs`](engine/palantir.mjs) (dziś **2.0**,
89 reguł). Idzie co 0,1 i podbija się **zawsze, gdy czyjś wynik może się przesunąć**: nowa albo
skasowana reguła, zmieniony koszt, budżet albo próg. Literówki w uzasadnieniu numeru nie ruszają.

Każda reguła ma stałe id (`P01`…) i **obowiązkowy cytat** z dokumentacji Palantir Foundry
(sekcja i zdanie). Cytaty `docs:NNNN` w komentarzach to numery linii zrzutu dokumentacji, na którym
reguły powstawały — zrzutu tu nie ma, bo to cudza dokumentacja; przy każdym stoi też nazwa sekcji.

## Uruchomienie lokalne

```bash
npm install          # tylko vitest — serwis nie ma zależności uruchomieniowych
npm test             # silnik, strona i API na prawdziwym procesie
npm start            # http://localhost:8139   (HISTORIA=0 wyłącza zapis sprawdzeń)
```

Wymaga Node ≥ 22.13 (historia sprawdzeń używa wbudowanego `node:sqlite`).

## Wdrożenie

```bash
cp deploy/deploy.env.example deploy/deploy.env   # adres serwera, sieć Dockera — plik poza gitem
deploy/wdroz.sh                                    # testy → git archive HEAD → build → podmiana → /api/zdrowie
```

Vhost dla Caddy: [`deploy/caddy-vhost.txt`](deploy/caddy-vhost.txt). Ustawienia serwisu (klucz
modelu, `AI_DO`, historia, token): [`deploy/env.example`](deploy/env.example). Jedna instancja,
bez stagingu — zmiany ogląda się lokalnie.

## Prywatność

- **Historia sprawdzeń jest domyślnie włączona — razem z treścią wrzuconego pliku** (SQLite na
  serwerze, wolumen `~/walidator-dane/prod`). Po to, żeby z danych wiedzieć, czego reguły nie łapią.
  Strona mówi o tym sama (czyta stan z `/api/zdrowie`). Wyłącza się `HISTORIA=0`, samą treść —
  `HISTORIA_TRESC=0`. `/api/historia` istnieje wyłącznie z `HISTORIA_TOKEN` (bez niego: 404).
- Osąd modelu wysyła do OpenAI same nazwy typów i pól (klasyfikacja) albo szkielet (pełny skan) —
  nigdy prozy z opisów. `ai: false` w żądaniu wyłącza go całkiem.
- Limity: 4 MB na żądanie, 30 żądań na minutę z jednego IP (12 z AI, 3 z pełnym skanem).

## Struktura

```
engine/    palantir.mjs (reguły, WERSJA) · normalizuj.mjs (szablon Foundry, kanon, YAML)
web/       server.mjs (HTTP, zero zależności) · ai.mjs (osąd modelu) · historia.mjs · public/
deploy/    wdroz.sh · deploy.env.example · env.example · caddy-vhost.txt
tests/     silnik · strona · api (prawdziwy proces) · fixtures/
Dockerfile obraz usługi (kontekst budowy = korzeń repo)
```

Narzędzie orzeka o **kształcie modelu**, nie o danych ani o kodzie. Ontologia może dostać tu
100/100 i dalej nie pasować do rzeczywistości zakładu — to sprawdza się rozmową z ludźmi, którzy
tam pracują.

Nie jesteśmy związani z Palantir Technologies; nazwy produktów należą do ich właścicieli.
Wydzielone 24.09.2026 z prywatnego repozytorium projektu (tam zostaje historia do tej daty).
