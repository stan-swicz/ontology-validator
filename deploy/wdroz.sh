#!/usr/bin/env bash
# Wdrożenie walidatora ontologii na serwer z Dockerem i reverse proxy (u nas: valid.nueve.design).
#
#   deploy/wdroz.sh        → kontener walidator-prod
#
# ⚠ ADRES SERWERA NIE STOI W REPO. Repo jest publiczne, więc użytkownik, host, sieć Dockera
# i ścieżki serwera czyta się z pliku `deploy/deploy.env` (poza gitem, wzór:
# `deploy/deploy.env.example`). Brak pliku albo pustej zmiennej = skrypt odmawia, zanim cokolwiek
# wyśle.
#
# ⚠ TYLKO PROD, BEZ STAGINGU — jedna publiczna instancja. Siatką bezpieczeństwa są testy PRZED
# wysyłką i sprawdzenie /api/zdrowie PO podmianie, a do oglądania zmian przed wdrożeniem —
# lokalnie `npm start`.
#
# Wysyła drzewo z HEAD (`git archive HEAD`), buduje obraz NA SERWERZE i podmienia kontener.
# Vhost reverse proxy: `deploy/caddy-vhost.txt`. Git push NIE dotyka serwera.
#
# ⚠ HISTORIA SPRAWDZEŃ JEST WŁĄCZONA DOMYŚLNIE i ten skrypt ZAWSZE montuje pod nią wolumen
# `~/walidator-dane/prod` → `/app/dane`. Bez wolumenu baza ginęłaby przy każdym redeployu, czyli
# byłaby zapisem, który wygląda na trwały i nie jest. ⚠ NIE KASUJ `~/walidator-dane/` — to
# zbierana historia, nie cache. Wyłącza się jawnie (`HISTORIA=0` w pliku env serwisu).
#
# ⚠ KLUCZ OPENAI NIE JEDZIE Z DEPLOYEM. Leży na serwerze w pliku env serwisu (chmod 600, poza
# gitem, wzór: `deploy/env.example`). Bez niego serwis wstaje normalnie — wynik 0–100 liczy KOD.
set -euo pipefail

KORZEN="$(git rev-parse --show-toplevel)"
cd "$KORZEN"

KONFIG="deploy/deploy.env"
if [ ! -f "$KONFIG" ]; then
  echo "brak $KONFIG — skopiuj deploy/deploy.env.example i uzupełnij (plik jest poza gitem)" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$KONFIG"
: "${SERWER:?ustaw SERWER=użytkownik@host w $KONFIG}"
: "${SIEC:?ustaw SIEC= (sieć Dockera, w której stoi reverse proxy) w $KONFIG}"
PORT_HOST="${PORT_HOST:-8140}"
ENV_PLIK="${ENV_PLIK:-walidator/prod.env}"

if [ "${1:-prod}" != "prod" ]; then
  echo "walidator ma tylko prod (bez stagingu) — uruchom bez argumentu albo z 'prod'" >&2
  exit 1
fi

KATALOG="walidator-prod"
WERSJA="$(git rev-parse --short HEAD)"

# ⚠ Wdrażamy HEAD, nie drzewo robocze — niezacommitowana zmiana NIE pojedzie, choć lokalnie działa.
git diff --quiet HEAD -- engine web Dockerfile \
  || echo "⚠ masz niezacommitowane zmiany w walidatorze — wdrażam HEAD ($WERSJA), bez nich"

echo "== testy przed wysyłką =="
# ⚠ NIE WDRAŻAMY NIEPRZETESTOWANEGO WALIDATORA. To narzędzie orzeka o cudzej pracy —
# jeżeli reguła łapie za szeroko, ktoś na tej podstawie przebuduje sobie model.
npm test

echo "== wysyłka źródeł ($WERSJA → ~/$KATALOG) =="
git -C "$KORZEN" archive HEAD \
  | ssh "$SERWER" "rm -rf ~/$KATALOG && mkdir -p ~/$KATALOG && tar -x -C ~/$KATALOG"

echo "== budowa obrazu na serwerze =="
ssh "$SERWER" "cd ~/$KATALOG \
  && docker build -q -t walidator-ontologii:prod --build-arg WERSJA=$WERSJA ."

echo "== podmiana kontenera =="
# ⚠ Reverse proxy dochodzi do kontenera po NAZWIE w sieci "$SIEC" (walidator-prod:8139), nie przez
# port hosta. Port 127.0.0.1:$PORT_HOST służy wyłącznie do sprawdzenia niżej.
ssh "$SERWER" "
  docker rm -f walidator-prod 2>/dev/null || true
  mkdir -p ~/walidator-dane/prod
  if [ -f ~/$ENV_PLIK ]; then
    docker run -d --name walidator-prod --restart unless-stopped \
      --network $SIEC -p 127.0.0.1:$PORT_HOST:8139 \
      --env-file ~/$ENV_PLIK \
      -v ~/walidator-dane/prod:/app/dane \
      --label walidator.wersja=$WERSJA walidator-ontologii:prod
  else
    echo 'UWAGA: brak ~/$ENV_PLIK — serwis wstaje BEZ AI.'
    echo '       Wynik 0-100 liczy kod, więc narzędzie działa; brakuje tylko osądu modelu.'
    echo '       Wzór pliku: deploy/env.example (chmod 600 po uzupełnieniu).'
    docker run -d --name walidator-prod --restart unless-stopped \
      --network $SIEC -p 127.0.0.1:$PORT_HOST:8139 \
      -v ~/walidator-dane/prod:/app/dane \
      --label walidator.wersja=$WERSJA walidator-ontologii:prod
  fi
"

echo "== sprawdzenie =="
# ⚠ Deploy, który nie sprawdza, czy to, co wstało, odpowiada, jest życzeniem, a nie wdrożeniem.
ssh "$SERWER" "
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS http://127.0.0.1:$PORT_HOST/api/zdrowie >/dev/null 2>&1; then
      echo '   odpowiada (wersja = zestaw regul, budowa = sha commita):'
      curl -s http://127.0.0.1:$PORT_HOST/api/zdrowie; echo; exit 0
    fi
    sleep 1
  done
  echo '   BŁĄD: kontener nie odpowiada po 10 s — logi:'; docker logs --tail 40 walidator-prod; exit 1
"

echo "OK: prod wdrożony ($WERSJA)"
