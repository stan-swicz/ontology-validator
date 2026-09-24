/**
 * API usługi — prawdziwy proces `web/server.mjs` na prawdziwym porcie.
 *
 * ⚠ CZEMU PROCES, A NIE IMPORT. `server.mjs` przy imporcie od razu nasłuchuje, a o kontrakt
 * trasy (kody odpowiedzi, kształt błędu, pole `kanon`) pytają ci, którzy wołają ją `curl`-em
 * albo ze skryptu. Test ma zobaczyć to samo, co oni — łącznie z tym, że serwis w ogóle wstaje
 * z dzisiejszymi importami (tego nie widział żaden test do 09.2026 i obraz padał przy starcie).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ocen, WERSJA } from '../engine/palantir.mjs';
import { normalizuj, wczytajTekst } from '../engine/normalizuj.mjs';

const KORZEN = join(dirname(fileURLToPath(import.meta.url)), '..');
const czytaj = (p) => readFileSync(join(KORZEN, p), 'utf8');
const PORT = 18000 + Math.floor(Math.random() * 1000);
const ADRES = `http://127.0.0.1:${PORT}`;

let proces;
let log = '';

beforeAll(async () => {
  /* ⚠ HISTORIA=0 i pusty klucz modelu: test nie pisze bazy i nie woła zewnętrznego API. */
  proces = spawn(process.execPath, ['web/server.mjs'], {
    cwd: KORZEN,
    env: { ...process.env, PORT: String(PORT), HISTORIA: '0', OPENAI_API_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proces.stdout.on('data', (d) => { log += d; });
  proces.stderr.on('data', (d) => { log += d; });
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`${ADRES}/api/zdrowie`)).ok) return; } catch { /* jeszcze nie wstał */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`serwis nie wstał w 10 s — log:\n${log}`);
}, 15_000);

afterAll(() => { proces?.kill(); });

const waliduj = (cialo) => fetch(`${ADRES}/api/waliduj`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cialo),
});

describe('API — trasy i kontrakt wejścia', () => {
  it('`/api/zdrowie` podaje wersję zestawu reguł tego samego silnika', async () => {
    const z = await (await fetch(`${ADRES}/api/zdrowie`)).json();
    expect(z.ok).toBe(true);
    expect(z.wersja).toBe(WERSJA);
    expect(z.ai, 'bez klucza modelu osądu nie ma').toBe(false);
  });

  it('⚠ `kanon` WPROST daje ten sam wynik, co silnik u nadawcy', async () => {
    const kanon = JSON.parse(JSON.stringify(normalizuj(JSON.parse(czytaj('web/public/przyklad-zly.json')))));
    const u_nadawcy = ocen(kanon);
    const odp = await waliduj({ kanon, ai: false });
    expect(odp.status).toBe(200);
    const r = await odp.json();
    expect(r.wejscie.format).toBe('kanon');
    expect(r.projekt.wynik).toBe(u_nadawcy.wynik);
    expect(r.projekt.znaleziska.length).toBe(u_nadawcy.znaleziska.length);
  });

  it('`tekst` z szablonem YAML dalej działa i daje wynik szablonu', async () => {
    const tekst = czytaj('web/public/szablon.yaml');
    const r = await (await waliduj({ tekst, ai: false })).json();
    expect(r.wejscie.format).toBe('foundry');
    expect(r.projekt.wynik).toBe(ocen(normalizuj(wczytajTekst(tekst).dane)).wynik);
  });

  it('⚠ manifest `nueve` dostaje 422 z instrukcją „zamień na kanon”', async () => {
    const odp = await waliduj({ tekst: JSON.stringify({ objects: [{ id: 'core.Order' }] }), ai: false });
    expect(odp.status).toBe(422);
    expect((await odp.json()).blad).toMatch(/nueve.*kanon/);
  });

  it('`kanon`, który nie jest obiektem, i `kanon` razem z `tekst` — 400', async () => {
    expect((await waliduj({ kanon: 'napis' })).status).toBe(400);
    expect((await waliduj({ kanon: [] })).status).toBe(400);
    expect((await waliduj({ kanon: { formatWejscia: 'x', objectTypes: [] }, tekst: 'a' })).status).toBe(400);
  });

  it('`kanon` bez `objectTypes` nie jest kanonem — 422, a nie cichy wynik 100', async () => {
    const odp = await waliduj({ kanon: { formatWejscia: 'x' }, ai: false });
    expect(odp.status).toBe(422);
  });
});
