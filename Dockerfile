# Walidator ontologii — obraz usługi HTTP (valid.nueve.design)
#
#     docker build -t walidator-ontologii .
#     docker run --rm -p 8139:8139 walidator-ontologii
#
# ⚠ ZERO `npm install`. Serwis nie ma ani jednej zależności uruchomieniowej, więc obraz to goły
# Node plus katalogi `engine/` i `web/`. Nie ma czego audytować i nie ma czego aktualizować.
# (`vitest` z `package.json` służy wyłącznie testom i do obrazu nie trafia.)
#
# ⚠ KOPIUJEMY KATALOGI, NIE POJEDYNCZE PLIKI. Do 09.2026 obraz kopiował trzy pliki silnika po
# nazwie — i gdy silnik dostał import sąsiedniego modułu, obraz budował się bez błędu, a kontener
# padał przy starcie (`ERR_MODULE_NOT_FOUND`). Katalog przenosi każdy nowy moduł sam.

FROM node:24-alpine

WORKDIR /app

COPY engine/ engine/
COPY web/ web/

# Krótki sha commita — ten sam, który `deploy/wdroz.sh` wiesza jako label kontenera i który
# serwis oddaje w `GET /api/zdrowie`. Bez niego nie da się powiedzieć, co stoi na prodzie.
ARG WERSJA=""
ENV WERSJA=$WERSJA

ENV PORT=8139
EXPOSE 8139

# ⚠ Proces chodzi jako `node`, nie `root`. Zapisuje wyłącznie historię sprawdzeń do wolumenu
# montowanego pod `/app/dane` (patrz `web/historia.mjs`) — a wrzucany plik to cudza treść.
USER node

# Kontener bez powłoki w CMD: sygnał `docker stop` ma dojść do Node'a, a nie do `sh`.
CMD ["node", "web/server.mjs"]
