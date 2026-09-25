/**
 * NORMALIZATOR WEJŚCIA — sprowadza ontologię do JEDNEGO kształtu (KANONU), na którym liczy
 * `palantir.mjs`.
 *
 * Przyjmuje DWA kształty wejścia i oddaje jeden:
 *   • `foundry` — model zapisany po Foundry'emu (`objectTypes`, `linkTypes`, `actionTypes`…),
 *     czyli kształt publicznego szablonu (`web/public/szablon.yaml`);
 *   • `kanon`   — kształt kanoniczny WPROST, oddany przez czyjś własny konwerter. Rozpoznaje się
 *     go po polu `formatWejscia`, które ustawia każdy konwerter do kanonu. Taki plik NIE jest
 *     przepisywany: silnik dostaje go bajt w bajt.
 *
 * ⚠ PO CO TRYB `kanon`. Repozytorium, które trzyma ontologię we WŁASNYM formacie, zamienia ją
 * na kanon u siebie i wysyła kanon. Dzięki temu to narzędzie nie zna żadnego cudzego formatu,
 * a zmiana takiego formatu nie wymaga zmiany tutaj — kontraktem między nimi jest KANON, czyli
 * słownictwo Foundry'ego.
 *
 * Kształt kanoniczny jest CELOWO nazwany po Foundry'emu (`objectTypes`, `apiName`,
 * `MANY_TO_ONE`): to jest słownictwo, które czytelnik rozpozna z dokumentacji Palantira.
 *
 * ⚠ CZEGO TEN PLIK NIE ROBI: nie ocenia, nie punktuje, nie zgaduje. Pole, którego nie ma,
 * zostaje `undefined` — a reguła po drugiej stronie sama rozstrzygnie, czy brak jest brakiem,
 * czy po prostu nie dotyczy. Wypełnianie dziur wartościami domyślnymi zamieniłoby brak
 * w fałszywą zgodność, czyli w dokładnie tę nieprawdę, którą to narzędzie ma łapać.
 *
 * ⚠ Cytaty `docs:NNNN` w komentarzach to numery linii w zrzucie dokumentacji Foundry, na którym
 * powstawały reguły. Zrzutu tu nie ma (to cudza dokumentacja) — przy każdym cytacie stoi też
 * nazwa sekcji albo zdanie, po którym znajdziesz go w dokumentacji publicznej.
 */

/* ── Krotności: przyjmujemy oba zapisy, oddajemy jeden. ────────────────────────────────── */
const KROTNOSCI = {
  'N:1': 'MANY_TO_ONE', '1:N': 'ONE_TO_MANY', 'N:M': 'MANY_TO_MANY',
  '1:1': 'ONE_TO_ONE', '1:0..1': 'ONE_TO_ONE', '0..1:1': 'ONE_TO_ONE',
  MANY_TO_ONE: 'MANY_TO_ONE', ONE_TO_MANY: 'ONE_TO_MANY',
  MANY_TO_MANY: 'MANY_TO_MANY', ONE_TO_ONE: 'ONE_TO_ONE',
  'many-to-one': 'MANY_TO_ONE', 'one-to-many': 'ONE_TO_MANY',
  'many-to-many': 'MANY_TO_MANY', 'one-to-one': 'ONE_TO_ONE',
};
export const krotnosc = (x) => KROTNOSCI[String(x ?? '').trim()] ?? null;

/* ── Operacje edycji: nasze `op` i Foundry'owe nazwy reguł akcji. ──────────────────────── */
const OPERACJE = {
  create: 'create', update: 'modify', modify: 'modify', delete: 'delete',
  link: 'createLink', unlink: 'deleteLink',
  createObject: 'create', modifyObject: 'modify', deleteObject: 'delete',
  createLink: 'createLink', deleteLink: 'deleteLink',
  /* ⚠ SCALENIE SCENARIUSZA JEST REGUŁĄ AKCJI, A NIE EDYCJĄ POLA — u Foundry „Apply scenario:
     Commit the edits staged in a scenario”. Kanon nazywa ją po Foundry'emu (`applyScenario`),
     bo czytelnik narzędzia rozpozna ją z tamtej dokumentacji, a nie z naszego repo. */
  'apply-scenario': 'applyScenario', applyScenario: 'applyScenario', mergeScenario: 'applyScenario',
};

const tablica = (x) => (Array.isArray(x) ? x : []);
const napis = (x) => (typeof x === 'string' && x.trim() ? x.trim() : undefined);
/** Pierwsze niepuste zdanie z kilku kandydatów — różne formaty trzymają opis pod różną nazwą. */
const opis = (...k) => k.map(napis).find(Boolean);
/** Alias `napis` na użytek miejsc, w których `s` jest już nazwą parametru. */
const s2 = napis;

/**
 * Rozpoznanie formatu. ⚠ Po GRUPACH, nigdy po nazwie pliku ani po polu `version`: manifest w formacie własnym
 * i cudzy mogą mieć obie te rzeczy identyczne.
 */
export function rozpoznajFormat(dane) {
  if (!dane || typeof dane !== 'object') return null;
  /* ⚠ KANON PRZED FOUNDRY: kanon też ma `objectTypes`, a przepuszczony przez czytnik Foundry'ego
     gubi to, czego szablon nie zna (przyjęte znaleziska, kontrakt akcji, wiązki linków) —
     zmierzone: ten sam model 100 / 1 znalezisko wprost i 66,9 / 217 po ponownym czytaniu. */
  if (typeof dane.formatWejscia === 'string' && Array.isArray(dane.objectTypes)) return 'kanon';
  /* Manifest w formacie `nueve` rozpoznajemy tylko po to, żeby odmówić z instrukcją: jego
     konwerter do kanonu mieszka w repozytorium, które ten format trzyma. */
  if (Array.isArray(dane.objects) || Array.isArray(dane['shared-properties'])) return 'nueve';
  if (Array.isArray(dane.objectTypes) || Array.isArray(dane.object_types)) return 'foundry';
  return null;
}

/**
 * ⚠⚠ TYP BAZOWY — ROZBICIE NASZEJ GRAMATYKI NA TABELĘ FOUNDRY'EGO (3.0 · K10-2).
 *
 * Foundry ma ZAMKNIĘTĄ listę typów bazowych właściwości (`docs:2427–2440`) i NIE MA w niej ani
 * „duration”, ani „enum”. Nasz manifest ma oba, bo dla człowieka to są nazwy pojęć, a nie typów
 * kolumn — więc kanon musi je ROZBIĆ, a nie przepuścić („DWA JĘZYKI”):
 *   • `enum(a|b)`  → `String` + ograniczenie TYPU WARTOŚCI „Enum (one of): A constraint
 *     representing a static set of allowed values… Valid base types: String, Boolean, Decimal,
 *     Double, Float, Integer, or Short” (`docs:4348–4349`);
 *   • `duration`   → `Double` + JEDNOSTKA jako typ wartości; Foundry nie zna typu „duration”,
 *     a liczba bez jednostki nie mówi, w czym jest (`docs:2427–2440` — tabela typów bazowych);
 *   • `list(X)`    → `Array` z typem elementu (`docs:2434`);
 *   • `struct(X)`  → `Struct` ze wskazaniem typu struktury (`docs:2435`);
 *   • `ref(X)`     → BRAK typu bazowego: referencja nie jest typem właściwości, tylko linkiem
 *     (`property-rule.references-are-links`) albo RODZAJEM PARAMETRU (`docs:5674`, `docs:5717`),
 *     a o tym mówi w kanonie osobne pole `reference`.
 *
 * ⚠ `typeRaw` ZOSTAJE CO DO ZNAKU. Rozbicie dokłada pola, a nie podmienia zapisu — inaczej
 * czytelnik kanonu nie miałby jak sprawdzić, z czego ono powstało.
 */
const TYPY_BAZOWE = new Map([
  ['string', 'String'], ['integer', 'Integer'], ['int', 'Integer'], ['short', 'Short'],
  ['long', 'Long'], ['byte', 'Byte'], ['boolean', 'Boolean'], ['bool', 'Boolean'],
  ['float', 'Float'], ['double', 'Double'], ['decimal', 'Decimal'], ['date', 'Date'],
  ['timestamp', 'Timestamp'], ['geopoint', 'Geopoint'], ['geoshape', 'Geoshape'],
  ['struct', 'Struct'], ['array', 'Array'], ['vector', 'Vector'], ['marking', 'Marking'],
  ['cipher', 'Cipher'], ['attachment', 'Attachment'], ['mediareference', 'Media Reference'],
  ['timeseries', 'Time Series'], ['geotemporalseries', 'Geotemporal Series'],
]);

export function rozbijTyp(zapis, jednostka) {
  const s = napis(zapis);
  if (!s) return {};
  const m = /^(list|struct|ref|enum)\((.*)\)$/.exec(s);
  if (m && m[1] === 'list') {
    const w = rozbijTyp(m[2]);
    return { baseType: 'Array', elementBaseType: w.baseType, elementStructTypeApiName: w.structTypeApiName };
  }
  if (m && m[1] === 'enum') {
    return {
      baseType: 'String',
      valueType: { constraint: 'oneOf', values: m[2].split('|').map((x) => x.trim()).filter(Boolean) },
    };
  }
  if (m && m[1] === 'struct') return { baseType: 'Struct', structTypeApiName: napis(m[2]) };
  if (m) return {};                                   // `ref(…)` — patrz `referencje`
  /* ⚠ JEDNOSTKA JEDZIE NAWET WTEDY, GDY JEJ NIE MA (`unit: undefined`) — i to jest celowe:
     „liczba bez jednostki” ma być w kanonie WIDOCZNA, a nie domyślona. */
  if (s.toLowerCase() === 'duration') {
    return { baseType: 'Double', valueType: { constraint: 'unit', unit: napis(jednostka) }, unit: napis(jednostka) };
  }
  const b = TYPY_BAZOWE.get(s.toLowerCase().replace(/[\s_-]/g, ''));
  return b ? { baseType: b, unit: napis(jednostka) } : {};
}

/**
 * ⚠⚠ NAZWA API JEST LOKALNA, NAMESPACE JEST GRUPĄ, A PEŁNE ID ZOSTAJE KLUCZEM ODWOŁAŃ
 * (3.0 · K10-1, reguła A3 przeglądu).
 *
 * U Foundry nazwa API typu obiektu „must begin with an uppercase character and consist of only
 * alphanumeric characters… be written in PascalCase… be unique across all object types”
 * (`docs:2067–2070`) — czyli `core.Order` nie jest poprawną nazwą API, bo niesie kropkę.
 * Namespace naszego id nie jest jednak ozdobnikiem: u Foundry tę samą robotę robią GRUPY typów
 * („Groups: Choose whether this object type will be part of any groups. This is a mechanism for
 * organizing your ontology”, `docs:1908`).
 *
 * Kanon rozbija więc id na TRZY pola i każde ma inne zadanie:
 *   • `apiName`       — nazwa LOKALNA (człon po ostatniej kropce); tego pilnują reguły nazw;
 *   • `namespace`     — grupa typu (człon przed kropką); `undefined`, gdy id nie ma kropki;
 *   • `qualifiedName` — pełne id, czyli KLUCZ, po którym łączy się wszystko wewnątrz kanonu
 *     (`linkTypes[].from`/`to`, `implements`, `rules[].target`, `acceptedFindings[].target`).
 *
 * ⚠ DLA FORMATU `foundry` `qualifiedName` RÓWNA SIĘ `apiName` i to nie jest uproszczenie:
 * tam nazwa API JEST kluczem odwołań, bo model zapisany po Foundry'emu nie ma drugiej nazwy.
 * Dzięki temu reguła po drugiej stronie nigdy nie musi pytać, z którego formatu przyszedł plik.
 */
export function nazwaApi(id) {
  const s = napis(id);
  if (!s) return { apiName: undefined, namespace: undefined, qualifiedName: undefined };
  const kropka = s.lastIndexOf('.');
  if (kropka <= 0 || kropka === s.length - 1) return { apiName: s, namespace: undefined, qualifiedName: s };
  return { apiName: s.slice(kropka + 1), namespace: s.slice(0, kropka), qualifiedName: s };
}

/* ══════════════════════════════════════════════════════════════════════════════════════════
   KSZTAŁT FOUNDRY'OWY (nasz szablon publiczny) → KSZTAŁT KANONICZNY
   ══════════════════════════════════════════════════════════════════════════════════════════ */

const poleSnake = (o, ...nazwy) => nazwy.map((n) => o?.[n]).find((v) => v !== undefined);

function zFoundry(m) {
  /* ⚠ RODZAJ REFERENCJI PO TEJ STRONIE ROZSTRZYGA SIĘ TAK SAMO — po tym, CZYM jest cel (3.0 · K4).
     Model zapisany po Foundry'emu pisze w `type` albo nazwę typu, albo nazwę kontraktu (tak stoi
     `Billable` w naszym szablonie publicznym), albo wprost rodzaj parametru; przyjmujemy wszystkie
     trzy zapisy, a cel spoza modelu NIE DOSTAJE RODZAJU — jak po stronie `nueve`. */
  const idTypow = new Set(tablica(poleSnake(m, 'objectTypes', 'object_types'))
    .map((o) => napis(poleSnake(o, 'apiName', 'api_name', 'id', 'name'))).filter(Boolean));
  const idKontraktow = new Set(tablica(m.interfaces)
    .map((i) => napis(poleSnake(i, 'apiName', 'api_name', 'name', 'id'))).filter(Boolean));
  const refFoundry = (o) => {
    const jawny = napis(poleSnake(o, 'interfaceApiName', 'interface_api_name', 'interface'));
    if (jawny) return { kind: 'interfaceReference', interfaceApiName: jawny };
    const jawnyTyp = napis(poleSnake(o, 'objectTypeApiName', 'object_type_api_name', 'objectType'));
    if (jawnyTyp) return { kind: 'objectReference', objectTypeApiName: jawnyTyp };
    const cel = napis(poleSnake(o, 'type', 'baseType', 'base_type'));
    if (!cel) return undefined;
    if (idKontraktow.has(cel)) return { kind: 'interfaceReference', interfaceApiName: cel };
    if (idTypow.has(cel)) return { kind: 'objectReference', objectTypeApiName: cel };
    return undefined;
  };
  const wl = (o) => ({
    reference: refFoundry(o),
    apiName: poleSnake(o, 'apiName', 'api_name', 'name', 'id'),
    type: napis(poleSnake(o, 'type', 'baseType', 'base_type')),
    typeRaw: napis(poleSnake(o, 'type', 'baseType', 'base_type')),
    /* ⚠ PO TEJ STRONIE TYP JEST JUŻ NAZWANY PO FOUNDRY'EMU, więc rozbicie sprowadza się do
       ujednolicenia pisowni (`integer` → `Integer`). Zapis, którego w tabeli nie ma, NIE DOSTAJE
       typu bazowego — i to jest wejście dla reguły, a nie miejsce na domyślną wartość. */
    ...rozbijTyp(poleSnake(o, 'type', 'baseType', 'base_type'), o?.unit),
    required: typeof poleSnake(o, 'required', 'nullable') === 'boolean'
      ? (o.required ?? (o.nullable === false)) : undefined,
    /* Patrz komentarz po stronie `nueve`: dojrzałość POJEDYNCZEGO pola czyta P53. */
    status: napis(poleSnake(o, 'status', 'state', 'lifecycle')),
    typeClasses: Array.isArray(poleSnake(o, 'typeClasses', 'type_classes', 'type-classes'))
      ? poleSnake(o, 'typeClasses', 'type_classes', 'type-classes').map(napis).filter(Boolean)
      : undefined,
    description: opis(o?.description, o?.note),
    sharedPropertyType: napis(poleSnake(o, 'sharedPropertyType', 'shared_property_type', 'shared')),
    valueType: napis(poleSnake(o, 'valueType', 'value_type')),
    derived: o?.derived ?? undefined,
    editOnly: poleSnake(o, 'editOnly', 'edit_only') === true ? true : undefined,
    /* ⚠ PO TEJ STRONIE ŹRÓDŁO CZYTAMY WYŁĄCZNIE Z TEGO, CO PLIK MÓWI. Brak wszystkich znaków
       zostaje `undefined` — „nie powiedziano” nie jest tym samym, co „kolumna zbioru”, a kanon
       nie ma prawa dopisywać modelowi decyzji, której nie podjął (patrz baner pliku). */
    valueSource: napis(poleSnake(o, 'valueSource', 'value_source', 'sourceType', 'source_type'))
      ?? (o?.derived ? 'linkedObjects' : undefined)
      ?? (poleSnake(o, 'editOnly', 'edit_only') === true ? 'editOnly' : undefined),
    classification: napis(o?.classification),
    unit: napis(o?.unit),
  });

  /* ⚠ PO TEJ STRONIE NAZWA API JEST JUŻ KLUCZEM ODWOŁAŃ, więc `qualifiedName` równa się `apiName`
     (patrz `nazwaApi`). `namespace` bierzemy WYŁĄCZNIE z jawnego pola — kropki w nazwie po tej
     stronie nie rozbijamy, bo nazwa API Foundry'ego kropki nie ma, a gdyby ją miała, byłaby to
     niezgodność do zgłoszenia przez regułę, a nie do naprawienia po cichu przez normalizator. */
  const grupa = (o) => napis(poleSnake(o, 'namespace', 'group', 'groups'))
    ?? (Array.isArray(o?.groups) ? napis(o.groups[0]) : undefined);
  const objectTypes = tablica(poleSnake(m, 'objectTypes', 'object_types')).map((o) => ({
    apiName: poleSnake(o, 'apiName', 'api_name', 'id', 'name'),
    namespace: grupa(o),
    qualifiedName: napis(poleSnake(o, 'apiName', 'api_name', 'id', 'name')),
    displayName: napis(poleSnake(o, 'displayName', 'display_name')),
    pluralDisplayName: napis(poleSnake(o, 'pluralDisplayName', 'plural_display_name', 'pluralName')),
    description: opis(o.description, o.note),
    primaryKey: poleSnake(o, 'primaryKey', 'primary_key', 'key'),
    titleProperty: napis(poleSnake(o, 'titleProperty', 'title_property', 'titleKey', 'title_key')),
    status: napis(o.status ?? o.lifecycle),
    visibility: napis(o.visibility),
    implements: tablica(o.implements).map((x) => (typeof x === 'string' ? x : x?.interface)).filter(Boolean),
    implementsDetails: tablica(o.implements).filter((x) => x && typeof x === 'object').map((x) => ({
      interface: x.interface,
      mapping: poleSnake(x, 'mapping', 'propertyMapping', 'property_mapping', 'property-mapping') ?? {},
      linkMapping: poleSnake(x, 'linkMapping', 'link_mapping', 'link-mapping') ?? {},
      actionMapping: poleSnake(x, 'actionMapping', 'action_mapping', 'action-mapping') ?? {},
    })),
    discriminatorValues: tablica(poleSnake(o, 'kinds', 'discriminatorValues')),
    properties: tablica(o.properties).map(wl),
  }));

  const linkTypes = tablica(poleSnake(m, 'linkTypes', 'link_types')).map((l) => ({
    apiName: poleSnake(l, 'apiName', 'api_name', 'name', 'id'),
    from: poleSnake(l, 'from', 'source', 'objectTypeA'),
    to: poleSnake(l, 'to', 'target', 'objectTypeB'),
    cardinality: krotnosc(l.cardinality),
    reverseName: napis(poleSnake(l, 'reverseName', 'reverse_name', 'reverseApiName')),
    displayName: napis(poleSnake(l, 'displayName', 'display_name')),
    reverseDisplayName: napis(poleSnake(l, 'reverseDisplayName', 'reverse_display_name')),
    /* ⚠ Model zapisany po Foundry'emu ma gdzie to powiedzieć — i wtedy mówi (docs:3953). */
    backingObjectType: napis(poleSnake(l, 'backingObjectType', 'backing_object_type',
      'objectBackedBy', 'object_backed_by', 'intermediaryObjectType')),
    /* ⚠ TABELA ŁĄCZĄCA N:M (od zestawu 2.0) — „Join table dataset relationship type” z opcją
       „Generate join table” (`docs:3934–3944`): `"generate"` albo `{dataset, fromColumn, toColumn}`.
       Kanon oddaje ją bez rozbioru — inaczej niż `backingObjectType`, które jest NAZWĄ TYPU,
       a nie tabelą. Czyta ją `P86`. */
    joinTable: poleSnake(l, 'joinTable', 'join_table') ?? undefined,
    description: opis(l.description, l.note),
    status: napis(l.status ?? l.lifecycle),
  }));

  const actionTypes = tablica(poleSnake(m, 'actionTypes', 'action_types')).map((a) => ({
    apiName: poleSnake(a, 'apiName', 'api_name', 'name', 'id'),
    displayName: napis(poleSnake(a, 'displayName', 'display_name')),
    description: opis(a.description, a.note),
    status: napis(a.status ?? a.lifecycle),
    parameters: tablica(a.parameters).map(wl),
    rules: tablica(a.rules ?? a.modifies).map((r) => ({
      op: OPERACJE[r.op ?? r.type] ?? (r.op ?? r.type),
      target: r.target ?? r.objectType,
      description: opis(r.description, r.note),
    })),
    submissionCriteria: tablica(poleSnake(a, 'submissionCriteria', 'submission_criteria', 'preconditions')),
    sideEffects: tablica(poleSnake(a, 'sideEffects', 'side_effects')),
    revertible: typeof poleSnake(a, 'revertible', 'reversible') === 'boolean'
      ? poleSnake(a, 'revertible', 'reversible') : undefined,
    /* Patrz komentarz po stronie `nueve`: zwrot akcji to typ KODU, nie typ ontologii. */
    returns: a.returns ? { type: napis(a.returns.type ?? a.returns), typeRaw: napis(a.returns.type ?? a.returns) } : undefined,
    envelope: a.envelope ? { type: napis(a.envelope.type ?? a.envelope), typeRaw: napis(a.envelope.type ?? a.envelope) } : undefined,
  }));

  const functions = tablica(m.functions).map((f) => ({
    apiName: poleSnake(f, 'apiName', 'api_name', 'name', 'id'),
    description: opis(f.description, f.note),
    status: napis(f.status ?? f.lifecycle),
    inputs: tablica(f.inputs ?? f.input).map(wl),
    output: f.output ? { type: napis(f.output.type ?? f.output), typeRaw: napis(f.output.type ?? f.output) } : undefined,
    constraint: napis(f.constraint),
  }));

  const interfaces = tablica(m.interfaces).map((i) => ({
    apiName: poleSnake(i, 'apiName', 'api_name', 'name', 'id'),
    namespace: grupa(i),
    qualifiedName: napis(poleSnake(i, 'apiName', 'api_name', 'name', 'id')),
    description: opis(i.description, i.note, i.what),
    status: napis(i.status ?? i.lifecycle),
    properties: tablica(i.properties).map(wl),
    linkConstraints: tablica(poleSnake(i, 'linkConstraints', 'link_constraints', 'links')).map((l) => ({
      apiName: poleSnake(l, 'apiName', 'api_name', 'name'), to: poleSnake(l, 'to', 'target'),
      cardinality: krotnosc(l.cardinality), required: l.required,
    })),
    actionConstraints: tablica(poleSnake(i, 'actionConstraints', 'action_constraints', 'actions')).map((a) => ({
      apiName: poleSnake(a, 'apiName', 'api_name', 'name'), required: a.required,
      satisfiedBy: poleSnake(a, 'satisfiedBy', 'satisfied_by', 'satisfied-by'),
    })),
    implementedBy: tablica(poleSnake(i, 'implementedBy', 'implemented_by')),
  }));

  const typZapisu = (s) => ({
    apiName: poleSnake(s, 'apiName', 'api_name', 'name', 'id'),
    type: napis(s.type ?? s.baseType),
    description: opis(s.description, s.note),
    isStruct: (s.type ?? s.baseType) === 'struct',
    usedBy: tablica(poleSnake(s, 'usedBy', 'used_by')),
    fields: tablica(s.fields).map(wl),
  });
  const sharedPropertyTypes = tablica(poleSnake(m, 'sharedPropertyTypes', 'shared_property_types')).map(typZapisu);
  /* ⚠ `functionTypes` to typy z REPOZYTORIUM KODU funkcji („custom types” Foundry), nie zasoby
     ontologii. Grupy może nie być i to nie jest brak — patrz komentarz po stronie `nueve`. */
  const functionTypes = tablica(poleSnake(m, 'functionTypes', 'function_types')).map(typZapisu);

  return {
    ontology: napis(m.ontology ?? m.name) ?? 'ontologia',
    version: napis(m.version),
    formatWejscia: 'foundry',
    objectTypes, linkTypes, actionTypes, functions, interfaces,
    sharedPropertyTypes, functionTypes,
    /* ⚠ KONTRAKT AKCJI ZOSTAJE PUSTY I TO NIE JEST PRZEOCZENIE. U Palantira koperta żądania
       i rekord wyniku zgłoszenia nie są zasobami ontologii, tylko kształtem PLATFORMY
       (`ActionResults`, walidacja zgłoszenia) — model zapisany po Foundry'emu nie ma ich gdzie
       zadeklarować i nie powinien. Klucz niosą wyłącznie te formaty, które nazywają je u siebie;
       reguła po drugiej stronie czyta brak jako „nie dotyczy”, a nie jako brak. */
    actionContract: undefined,
    /* ⚠ PUSTA LISTA, A NIE `undefined` — i to jest różnica wobec kontraktu akcji wyżej. Tam brak
       znaczy „ten format nie ma gdzie tego zadeklarować”; tutaj znaczy „nikt nic nie przyjął”,
       czyli STAN, a nie brak pojęcia. Szablon publiczny nie ma dziś klucza na przyjęcia; gdy
       dostanie, czyta się go tu i lista przestaje być pusta. */
    acceptedFindings: [],
  };
}

/* ══════════════════════════════════════════════════════════════════════════════════════════
   WEJŚCIE PUBLICZNE
   ══════════════════════════════════════════════════════════════════════════════════════════ */

/** Odmowa dla formatu, którego to narzędzie świadomie nie czyta — z tym, co zrobić zamiast. */
export const ODMOWA_NUEVE = 'to jest manifest w formacie nueve — zamień go najpierw na kanon '
  + '(konwerter mieszka w repozytorium, które trzyma ten format) i wyślij wynik w polu `kanon`';

/**
 * @param {object} dane   ontologia w kształcie `foundry` albo `kanon`
 * @returns {object|null} kanon; `null`, gdy kształtu nie rozpoznano
 * @throws  gdy wejście jest manifestem `nueve` (patrz `ODMOWA_NUEVE`)
 */
export function normalizuj(dane) {
  const format = rozpoznajFormat(dane);
  if (format === 'kanon') return dane;
  if (format === 'foundry') return zFoundry(dane);
  if (format === 'nueve') throw new Error(ODMOWA_NUEVE);
  return null;
}

/* ══════════════════════════════════════════════════════════════════════════════════════════
   BLOKI `|` I `>` — opis dłuższy niż linia
   ──────────────────────────────────────────────────────────────────────────────────────────
   ⚠ TO NIE JEST EGZOTYKA SKŁADNI, TYLKO SPOSÓB, W JAKI LUDZIE PISZĄ OPISY. Zdanie dłuższe
   niż linia zapisuje się w YAML-u blokiem i tak robi każdy — człowiek i model, którego ktoś
   poprosił o przepisanie swojego schematu na nasz szablon (a dokładnie o to prosi krok 2 na
   stronie). Do 15.09.2026 parser takie pliki ODRZUCAŁ, a komunikat wskazywał PIERWSZĄ LINIĘ
   TREŚCI zamiast nagłówka bloku — czyli mylił o jedną linię i o całą przyczynę:
       description: >-
         Lustro konta z serwisu identity…      ← „nie rozumiem linii”
   Zgłoszone z realnego pliku (34 typy, wszystkie opisy blokami `>-`): trzy podejścia, trzy
   razy ten sam komunikat, zero wskazówki, co jest nie tak.

   Obsługujemy komplet, bo połowa byłaby gorsza od niczego: `|` (znaki końca linii ZOSTAJĄ),
   `>` (zwijane w spacje), wskaźnik ucinania `-` / `+` oraz jawne wcięcie (`|2`), w obu
   kolejnościach (`|2-` i `|-2`).
   ══════════════════════════════════════════════════════════════════════════════════════════ */

const NAGLOWEK_BLOKU = /^\s*(?:-\s+)?(?:(?:!![\w:.-]+\s+)?["']?[A-Za-z_][\w.-]*["']?:\s*)?([|>])([0-9]?)([-+]?)([0-9]?)\s*$/;

/**
 * Zwija ciało bloku `>` wedle reguł YAML-a. Trzy z nich łatwo zgubić, a każda zmienia TEKST:
 * linia pusta daje znak końca linii (a nie spację), linia WCIĘTA GŁĘBIEJ zostaje dosłownie
 * razem ze swoim wcięciem, a złamania wokół niej też się nie zwijają.
 */
function zwinBlok(wiersze) {
  let out = '';
  let poprzedniaZwykla = false;
  for (const w of wiersze) {
    if (w.trim() === '') { out += '\n'; poprzedniaZwykla = false; continue; }
    if (/^\s/.test(w)) {
      if (out && !out.endsWith('\n')) out += '\n';
      out += `${w}\n`;
      poprzedniaZwykla = false;
      continue;
    }
    if (poprzedniaZwykla) out += ' ';
    out += w;
    poprzedniaZwykla = true;
  }
  return out;
}

/**
 * Znajduje wszystkie bloki w tekście. Oddaje mapę „numer linii nagłówka → { wartosc, koniec }”,
 * gdzie `koniec` to OSTATNIA linia ciała. Obliczone RAZ i z góry, bo ciało bloku musi zniknąć
 * z oczu obu przebiegów parsera: linia `- cokolwiek` w środku literału jest tekstem, a nie
 * pozycją listy, i tak samo `klucz:` w środku nie zakłada mapy.
 */
function znajdzBloki(linie) {
  const bloki = new Map();
  let zajete = -1;                                 // ostatnia linia pochłonięta przez blok
  for (let i = 0; i < linie.length; i += 1) {
    if (i <= zajete) continue;                     // `opis: |` w ŚRODKU literału jest tekstem
    const naglowek = NAGLOWEK_BLOKU.exec(linie[i].replace(/\s+#.*$/, ''));
    if (!naglowek) continue;
    const [, rodzaj, cyfraPrzed, ucinanie, cyfraPo] = naglowek;
    const wcNaglowka = linie[i].length - linie[i].trimStart().length;
    const jawneWciecie = Number(cyfraPrzed || cyfraPo || 0);

    /* Wcięcie ciała: jawne (liczone OD NAGŁÓWKA) albo z pierwszej niepustej linii. */
    let wcCiala = jawneWciecie ? wcNaglowka + jawneWciecie : null;
    let koniec = i;
    const wiersze = [];
    for (let j = i + 1; j < linie.length; j += 1) {
      const linia = linie[j];
      const pusta = linia.trim() === '';
      const wc = linia.length - linia.trimStart().length;
      if (!pusta && wcCiala === null) {
        if (wc <= wcNaglowka) break;          // blok bez ciała — pusty napis
        wcCiala = wc;
      }
      if (!pusta && wc < wcCiala) break;
      wiersze.push(pusta ? '' : linia.slice(wcCiala));
      koniec = j;
    }
    if (koniec === i) { bloki.set(i, { wartosc: '', koniec: i }); continue; }

    /* Puste linie na końcu ciała należą do bloku dopiero przy `+`; inaczej są odstępem. */
    let ostatnia = wiersze.length;
    while (ostatnia > 0 && wiersze[ostatnia - 1] === '') ostatnia -= 1;
    const ogon = wiersze.length - ostatnia;
    const tresc = rodzaj === '|'
      ? wiersze.slice(0, ostatnia).join('\n')
      : zwinBlok(wiersze.slice(0, ostatnia));

    let wartosc = tresc;
    if (ucinanie === '+') wartosc = tresc + '\n'.repeat(ogon + (tresc ? 1 : 0));
    else if (ucinanie !== '-' && tresc) wartosc = `${tresc}\n`;      // domyślne: jeden znak
    const koniecBloku = ucinanie === '+' ? koniec : i + ostatnia;
    bloki.set(i, { wartosc, koniec: koniecBloku });
    zajete = koniec;
  }
  return bloki;
}

/* ══════════════════════════════════════════════════════════════════════════════════════════
   CYTATY PRZEZ KILKA LINII — `'…` i `"…` domknięte niżej
   ──────────────────────────────────────────────────────────────────────────────────────────
   ⚠ TAK WYGLĄDA PLIK, KTÓRY PRZESZEDŁ PRZEZ BIBLIOTEKĘ YAML. Nikt tego nie pisze ręcznie —
   to emiter (PyYAML, js-yaml) łamie długą wartość na szerokości ~100 znaków i cytuje ją,
   gdy treść ma dwukropek albo zaczyna się od znaku specjalnego. Czyli: ktoś bierze swój
   schemat, przepuszcza przez skrypt, wrzuca do nas — i dostaje odmowę za formatowanie,
   którego sam nie wybierał.
   Zwijanie jest takie samo jak w `>`: złamanie linii staje się spacją, pusta linia znakiem
   końca linii. W apostrofach `''` znaczy apostrof; w cudzysłowach działają `\n`, `\t`, `\"`,
   `\\`, `\uXXXX` oraz `\` na końcu linii (złamanie BEZ spacji).
   ══════════════════════════════════════════════════════════════════════════════════════════ */

function odkodujCudzyslow(s) {
  return s.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (_, z) => {
    if (z[0] === 'u' || z[0] === 'x') return String.fromCharCode(parseInt(z.slice(1), 16));
    return { n: '\n', t: '\t', r: '\r', 0: '\0', b: '\b', '"': '"', '\\': '\\', '/': '/' }[z] ?? z;
  });
}

/** Szuka domknięcia cytatu od `poz` w linii `nr`. Oddaje `{ wartosc, koniec }` albo `null`. */
function odczytajCytat(linie, nr, poz, wCiele) {
  const znak = linie[nr][poz];
  if (znak !== "'" && znak !== '"') return null;
  const kawalki = [];
  /* ⚠ KAŻDY KAWAŁEK BEZ SPACJI NA KOŃCU. Emiter łamiący linię zostawia czasem spację przed
     złamaniem; zwijanie dokłada swoją i w opisie wychodzi „czego  identity". Podwójnej spacji
     nikt nie zauważy w raporcie, ale to już nie jest cudzy tekst — a my go cytujemy. */
  let biezaca = linie[nr].slice(poz + 1).replace(/\s+$/, '');
  let odjeteZlamanie = false;

  for (let j = nr; j < linie.length; j += 1) {
    if (j > nr) {
      if (wCiele.has(j)) return null;                 // cytat nie wchodzi w ciało bloku
      biezaca = linie[j].trim();
    }
    /* Szukamy domknięcia: apostrof podwojony to apostrof, w cudzysłowie liczy się `\"`. */
    let koniecW = -1;
    for (let i = 0; i < biezaca.length; i += 1) {
      const c = biezaca[i];
      if (znak === '"' && c === '\\') { i += 1; continue; }
      if (c !== znak) continue;
      if (znak === "'" && biezaca[i + 1] === "'") { i += 1; continue; }
      koniecW = i; break;
    }
    if (koniecW === -1) {
      /* ⚠ `\` NA KOŃCU LINII TO ZŁAMANIE, KTÓRE ZNIKA BEZ SPACJI — i dlatego znacznik jedzie
         PRZY KAWAŁKU, a nie w jednej zmiennej na cały cytat. Pierwsza wersja honorowała go
         wyłącznie przy DRUGIM kawałku, więc w opisach łamanych co ~100 znaków wychodziło
         „czego  identity" (dwie spacje), a gdy emiter złamał w środku wyrazu — „rozerwał oby".
         Cudzy tekst przepisany z błędem jest gorszy niż odmowa: nikt tego nie zauważy. */
      const uciete = znak === '"' && biezaca.endsWith('\\');
      kawalki.push({ tekst: uciete ? biezaca.slice(0, -1) : biezaca, bezSpacji: odjeteZlamanie });
      odjeteZlamanie = uciete;
      if (j === linie.length - 1) return null;        // cytat bez domknięcia — nie zgadujemy
      continue;
    }
    kawalki.push({ tekst: biezaca.slice(0, koniecW), bezSpacji: odjeteZlamanie });
    /* Po domknięciu wolno stać tylko komentarzowi — inaczej to nie jest ta składnia. */
    const ogon = biezaca.slice(koniecW + 1).trim();
    if (ogon && !ogon.startsWith('#')) return null;

    /* Zwijanie: pierwszy kawałek zostaje, każdy następny doklejany spacją; pusty daje `\n`. */
    let out = kawalki[0].tekst;
    for (let k = 1; k < kawalki.length; k += 1) {
      if (kawalki[k].tekst === '') { out += '\n'; continue; }
      if (out.endsWith('\n') || kawalki[k].bezSpacji) out += kawalki[k].tekst;
      else out += ` ${kawalki[k].tekst}`;
    }
    const wartosc = znak === "'" ? out.replace(/''/g, "'") : odkodujCudzyslow(out);
    return { wartosc, koniec: j };
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════════════════════════════════
   WARTOŚĆ ZWYKŁA ŁAMANA NA KILKA LINII — i dlaczego to JEDNAK nie jest zgadywanie
   ──────────────────────────────────────────────────────────────────────────────────────────
       description: Klucz konta w identity. Jedyny klucz
         wspólny z resztą rodziny.
   Do 16.09.2026 parser to ODRZUCAŁ z uzasadnieniem „źle wcięty klucz wygląda tak samo, więc
   połknięcie go zjadłoby komuś kawałek modelu". ⚠ To uzasadnienie było BŁĘDNE i dlatego tu
   stoi: źle wcięty klucz NIE wygląda tak samo — kończy się dwukropkiem, więc widać go gołym
   okiem. A rozstrzygnięcie jest regułą YAML-a, nie naszym gustem: pod wartością skalarną nie
   da się zagnieździć mapy, więc linia wcięta GŁĘBIEJ niż klucz, który MA już niepustą wartość,
   może być wyłącznie jej dalszym ciągiem. Zgadywaniem było raczej odrzucanie.
   Zwijanie jak w `>`: złamanie linii staje się spacją, pusta linia znakiem końca linii.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
function znajdzProste(linie, wCiele, bloki) {
  const proste = new Map();
  let zajete = -1;
  for (let i = 0; i < linie.length; i += 1) {
    if (i <= zajete || wCiele.has(i) || bloki.has(i)) continue;
    const linia = linie[i].replace(/\s+#.*$/, '');
    /* ⚠ MIERZYMY WCIĘCIE KLUCZA, NIE MYŚLNIKA. W `  - apiName: X` klucz stoi w kolumnie 4,
       a myślnik w 2 — pierwsza wersja brała 2 i dalszym ciągiem zdania stawały się WSZYSTKIE
       następne pola tej pozycji listy (`type`, `required`, `description`). Struktura zapadała
       się wtedy dziesiątki linii dalej, a komunikat wskazywał miejsce bez związku z przyczyną. */
    const m = /^(\s*(?:-\s+)?)(?:!![\w:.-]+\s+)?["']?[A-Za-z_][\w.-]*["']?:\s+(\S.*)$/.exec(linia);
    if (!m) continue;
    const wartosc0 = m[2].trim();
    /* Cytaty, bloki i kolekcje w nawiasach mają własne reguły łamania — tu ich nie ruszamy. */
    if (/^["'[{|>&*]/.test(wartosc0)) continue;
    const wcKlucza = m[1].length;

    const kawalki = [wartosc0];
    let koniec = i;
    for (let j = i + 1; j < linie.length; j += 1) {
      if (wCiele.has(j)) break;
      const nast = linie[j];
      if (nast.trim() === '') {
        /* Pusta linia należy do wartości tylko wtedy, gdy DALEJ wartość się ciągnie. */
        const dalej = linie.slice(j + 1).find((x) => x.trim() !== '');
        if (!dalej || dalej.length - dalej.trimStart().length <= wcKlucza) break;
        kawalki.push('');
        koniec = j;
        continue;
      }
      if (nast.length - nast.trimStart().length <= wcKlucza) break;
      kawalki.push(nast.trim());
      koniec = j;
    }
    if (koniec === i) continue;

    let out = kawalki[0];
    for (let k = 1; k < kawalki.length; k += 1) {
      if (kawalki[k] === '') { out += '\n'; continue; }
      out += out.endsWith('\n') ? kawalki[k] : ` ${kawalki[k]}`;
    }
    proste.set(i, { wartosc: out, koniec });
    zajete = koniec;
  }
  return proste;
}

/** Wszystkie cytaty domykane NIŻEJ niż zaczęte — jedna mapa, tak samo jak bloki. */
function znajdzCytaty(linie, wCiele) {
  const cytaty = new Map();
  let zajete = -1;
  for (let i = 0; i < linie.length; i += 1) {
    if (i <= zajete || wCiele.has(i)) continue;
    const m = /^\s*(?:-\s+)?(?:(?:!![\w:.-]+\s+)?["']?[A-Za-z_][\w.-]*["']?:\s+)?(['"])/.exec(linie[i]);
    if (!m) continue;
    const poz = linie[i].indexOf(m[1], m.index + m[0].length - 1);
    const c = odczytajCytat(linie, i, poz, wCiele);
    if (!c || c.koniec === i) continue;              // jednolinijkowy czyta `wartosc()`
    cytaty.set(i, c);
    zajete = c.koniec;
  }
  return cytaty;
}

/**
 * Minimalny parser YAML — TYLKO tyle, ile potrzeba, żeby przyjąć szablon z zakładki
 * „Szablon” i pliki, które ludzie naprawdę piszą: mapy, listy, skalary, komentarze, cytaty,
 * wcięcia spacjami i **bloki `|` / `>`**.
 *
 * ⚠ ŚWIADOMIE NIEPEŁNY I TAK MA ZOSTAĆ. Kotwice, wielodokumentowość i typy jawne (`!!str`)
 * NIE są obsłużone — lepiej, żeby parser ODMÓWIŁ, niż zgadł. Zależności zewnętrznej nie ma
 * celowo: to narzędzie ma się dać uruchomić `node server.mjs` bez `npm install`, tak samo
 * jak reszta prototypów w tym repo. ⚠ Granica „niepełny" biegnie jednak po TYM, CO LUDZIE
 * PISZĄ, a nie po tym, co nam wygodnie zaimplementować: bloki stały po tej złej stronie
 * i odrzucały poprawne pliki (patrz komentarz przy `znajdzBloki`).
 *
 * ⚠ DWA PRZEBIEGI, I TO NIE JEST NIEEFEKTYWNOŚĆ. Po `objectTypes:` nie wiadomo jeszcze,
 * czy stoi mapa, czy lista — rozstrzyga dopiero pierwsza linia głębiej. Zamiast zgadywać
 * w locie (i mylić się na pustych kolekcjach), pierwszy przebieg wypisuje klucze, pod
 * którymi stoją myślniki, a drugi parsuje już z tą wiedzą.
 */
/* ⚠ ZNAKI ZEROWEJ SZEROKOŚCI — zdejmowane, a nie zgłaszane. Tekst przeklejony z czatu albo
   z dokumentu potrafi nieść U+200B między blokami; dla `trim()` NIE jest to biała spacja, więc
   taka linia była „treścią", której parser nie rozumiał — a komunikat pokazywał ZNAK, KTÓREGO
   NIE WIDAĆ („nie rozumiem — „​""). Zdjęcie ich niczego nie zgaduje: w ontologii nie znaczą nic.
   ⚠ ZWJ (U+200D) i ZWNJ (U+200C) ZOSTAJĄ — spajają emoji i litery w piśmie perskim i indyjskim,
   więc ich zdjęcie zmieniłoby cudzy TEKST, a nie posprzątało po wklejeniu. */
const bezNiewidocznych = (s) => String(s).replace(/[\u200B\u2060\uFEFF]/g, '');

export function czytajYaml(tekst) {
  const linie = bezNiewidocznych(tekst).split(/\r?\n/);
  const bloki = znajdzBloki(linie);
  /* Linie należące do CIAŁA bloku są tekstem, nie składnią — oba przebiegi mają je omijać. */
  const wCiele = new Set();
  const dopiszCialo = (i, b) => { for (let j = i + 1; j <= b.koniec; j += 1) wCiele.add(j); };
  for (const [i, b] of bloki) dopiszCialo(i, b);
  /* Cytat domknięty niżej wygląda dla parsera tak samo jak blok: „wartość tej linii to X,
     a linie do `koniec` są już przeczytane" — więc jedzie tą samą mapą. */
  for (const [i, c] of znajdzCytaty(linie, wCiele)) { bloki.set(i, c); dopiszCialo(i, c); }
  for (const [i, w] of znajdzProste(linie, wCiele, bloki)) { bloki.set(i, w); dopiszCialo(i, w); }

  /* ⚠ PIERWSZY PRZEBIEG MÓWI, GDZIE STOJĄ DZIECI — nie tylko „czy to lista". Sekwencja wolno
     stoi w YAML-u na TYM SAMYM wcięciu co jej klucz i tak właśnie emitują ją biblioteki:
         objectTypes:
         - apiName: Account
     Do 16.09.2026 pierwszy przebieg żądał wcięcia GŁĘBSZEGO (`wc <= wciecie` → przerwij), więc
     `objectTypes:` stawało się mapą, a pierwszy myślnik padał na „pozycja listy poza listą".
     Trzeci komunikat z rzędu, którym narzędzie odesłało poprawny plik — stąd klucz mapy jest
     dziś NUMEREM LINII, a nie parą „wcięcie:nazwa": ta sama nazwa na tym samym wcięciu wraca
     w pliku po kilkadziesiąt razy i wcale nie musi mieć tego samego kształtu. */
  const kolekcje = new Map();
  for (let i = 0; i < linie.length; i += 1) {
    if (wCiele.has(i) || bloki.has(i)) continue;
    const m = /^(\s*)(?:-\s+)?(?:!![\w:.-]+\s+)?["']?([A-Za-z_][\w.-]*)["']?:\s*$/.exec(linie[i].replace(/\s+#.*$/, ''));
    if (!m) continue;
    const wcKlucza = /^\s*-\s/.test(linie[i]) ? m[0].indexOf(m[2]) : m[1].length;
    for (let j = i + 1; j < linie.length; j += 1) {
      if (wCiele.has(j)) continue;
      const nast = linie[j].replace(/\s+#.*$/, '');
      if (!nast.trim()) continue;
      const wc = nast.length - nast.trimStart().length;
      const myslnik = nast.trim().startsWith('-');
      if (wc < wcKlucza || (wc === wcKlucza && !myslnik)) break;   // nic pod kluczem
      /* ⚠ WARTOŚĆ MOŻE STAĆ LINIĘ NIŻEJ: `a:` a pod spodem samo zdanie (bez myślnika i bez
         własnego dwukropka) to w YAML-u `{a: "zdanie"}`, a nie mapa. Rozstrzyga KSZTAŁT linii,
         nie nasze widzimisię — i tak samo rozstrzyga PyYAML, na którym to sprawdzamy. */
      if (!myslnik && !/^(?:!![\w:.-]+\s+)?["']?[A-Za-z_][\w.-]*["']?:(\s|$)/.test(nast.trim())) {
        const kawalki = [];
        let koniec = j;
        for (let q = j; q < linie.length; q += 1) {
          if (wCiele.has(q)) break;
          const l = linie[q];
          if (l.trim() === '') { kawalki.push(''); continue; }
          if (l.length - l.trimStart().length < wc) break;
          kawalki.push(l.trim());
          koniec = q;
        }
        let out = kawalki[0];
        for (let q = 1; q < kawalki.length && q <= koniec - j; q += 1) {
          if (kawalki[q] === '') { out += '\n'; continue; }
          out += out.endsWith('\n') ? kawalki[q] : ` ${kawalki[q]}`;
        }
        kolekcje.set(i, { skalar: out, koniec });
        for (let q = j; q <= koniec; q += 1) wCiele.add(q);
        break;
      }
      kolekcje.set(i, { lista: myslnik, wciecie: wc });
      break;
    }
  }
  return parsujYamlZListami(linie, kolekcje, bloki, wCiele);
}

function parsujYamlZListami(linie, kolekcje, bloki, wCiele) {
  /* ⚠ KORZEŃ BYWA LISTĄ. Dokument zaczynający się od myślnika jest w YAML-u poprawny;
     ontologii wprawdzie tak się nie zapisuje, ale komunikat „pozycja listy poza listą"
     mówił o składni zamiast o treści — czytelnik ma usłyszeć, że brakuje `objectTypes`,
     a nie że jego plik jest niegramatyczny. */
  const pierwsza = linie.find((l) => l.trim() && !l.trim().startsWith('#'));
  const korzen = pierwsza && /^\s*-(\s|$)/.test(pierwsza) ? [] : {};
  const stos = [{ wciecie: -1, wezel: korzen }];
  const wartosc = (s) => {
    let t = s.trim();
    /* ⚠ JAWNY TAG (`!!str`, `!!bool`) — zdejmowany, a `!!str` dodatkowo BLOKUJE zamianę na
       liczbę. Ręcznie tego nikt nie pisze; przywozi to round-trip przez bibliotekę YAML 1.1,
       w której klucz `on:` jest BOOLEANEM i przy ponownym zapisie wychodzi jako
       `!!bool "true":`. Plik po takiej podróży ma prawo się u nas otworzyć. */
    const tag = /^!!([\w:.-]+)\s+/.exec(t);
    if (tag) {
      t = t.slice(tag[0].length).trim();
      /* Tag mówi o TYPIE, więc cudzysłów przy nim jest tylko cudzysłowem — zdejmujemy go
         przed rozstrzygnięciem, inaczej `!!bool 'true'` czytałoby się jako napis. */
      if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) t = odkodujCudzyslow(t.slice(1, -1));
      else if (t.length >= 2 && t.startsWith("'") && t.endsWith("'")) t = t.slice(1, -1).replace(/''/g, "'");
      if (tag[1] === 'str') return t;
      if (tag[1] === 'bool') return /^(true|yes|on)$/i.test(t);
      if (tag[1] === 'int') return parseInt(t, 10);
      if (tag[1] === 'float') return parseFloat(t);
      if (tag[1] === 'null') return null;
      return t;
    }
    if (t === '' || t === '~' || t === 'null') return null;
    if (t === 'true') return true;
    if (t === 'false') return false;
    if (/^-?\d+$/.test(t)) return Number(t);
    if (/^-?\d*\.\d+$/.test(t)) return Number(t);
    if (/^\[.*\]$/.test(t)) {
      const s2 = t.slice(1, -1).trim();
      return s2 ? s2.split(',').map((x) => wartosc(x)) : [];
    }
    /* ⚠ CUDZYSŁÓW NIESIE ESCAPE'Y. Emiter z `allow_unicode=False` (domyślne w PyYAML!) zapisuje
       „Zamówienie" jako `"Zam\\xF3wienie"` — bez odkodowania czytelnik dostawał w raporcie
       backslashe zamiast polskich liter. W apostrofach escape'ów NIE MA; jedyną sekwencją
       jest `''`, czyli apostrof. */
    if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return odkodujCudzyslow(t.slice(1, -1));
    if (t.length >= 2 && t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1).replace(/''/g, "'");
    return t;
  };
  const bezKomentarza = (s) => {
    let w = null;
    for (let i = 0; i < s.length; i += 1) {
      const c = s[i];
      if (w) { if (c === w) w = null; continue; }
      if (c === '"' || c === "'") { w = c; continue; }
      if (c === '#' && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i);
    }
    return s;
  };

  for (let nr = 0; nr < linie.length; nr += 1) {
    if (wCiele.has(nr)) continue;                 // ciało bloku jest TEKSTEM, nie składnią
    const blok = bloki.get(nr);
    const linia = bezKomentarza(linie[nr]);
    if (!linia.trim()) continue;
    if (/^\t/.test(linia)) throw new Error(`linia ${nr + 1}: YAML z tabulatorem — wcięcia muszą być spacjami`);
    const wciecie = linia.length - linia.trimStart().length;
    const tresc = linia.trim();
    while (stos.length > 1 && wciecie < stos[stos.length - 1].wciecie) stos.pop();
    let szczyt = stos[stos.length - 1];

    if (tresc.startsWith('- ') || tresc === '-') {
      while (!Array.isArray(szczyt.wezel) && stos.length > 1) { stos.pop(); szczyt = stos[stos.length - 1]; }
      if (!Array.isArray(szczyt.wezel)) throw new Error(`linia ${nr + 1}: pozycja listy poza listą — „${tresc.slice(0, 40)}”`);
      const reszta = tresc === '-' ? '' : tresc.slice(2);
      if (!reszta.trim()) { const el = {}; szczyt.wezel.push(el); stos.push({ wciecie: wciecie + 2, wezel: el }); continue; }
      /* ⚠ KLUCZ BYWA CYTOWANY — `- "apiName": "orderNumber"` to zwykłe wyjście emitera
         z `default_style`. Bez `["']?` pierwszy taki plik padał na „pozycja listy poza listą". */
      const para = /^(?:!![\w:.-]+\s+)?(["']?)([A-Za-z_][\w.-]*)\1:\s*(.*)$/.exec(reszta.trim());
      if (!para) { szczyt.wezel.push(blok ? blok.wartosc : wartosc(reszta)); continue; }
      const [, , kluczEl, resztaEl] = para;
      const el = {};
      szczyt.wezel.push(el);
      const wcEl = wciecie + 2;
      stos.push({ wciecie: wcEl, wezel: el });
      if (blok) el[kluczEl] = blok.wartosc;
      else if (resztaEl === '') {
        const k = kolekcje.get(nr);
        if (k && k.skalar !== undefined) el[kluczEl] = wartosc(k.skalar);
        else if (!k) el[kluczEl] = null;
        else {
          const dziecko = k.lista ? [] : {};
          el[kluczEl] = dziecko;
          stos.push({ wciecie: k.wciecie, wezel: dziecko });
        }
      } else el[kluczEl] = wartosc(resztaEl);
      continue;
    }

    while (Array.isArray(szczyt.wezel) && stos.length > 1) { stos.pop(); szczyt = stos[stos.length - 1]; }
    const para = /^(?:!![\w:.-]+\s+)?(["']?)([A-Za-z_][\w.-]*)\1:\s*(.*)$/.exec(tresc);
    /* ⚠ KOMUNIKAT MA POWIEDZIEĆ, GDZIE I CO — inaczej autor pliku widzi zdanie ze środka
       własnego opisu i nie ma jak zgadnąć, że chodzi o linię WYŻEJ.
       ⚠ Stała tu kiedyś PODPOWIEDŹ „zapisz to blokiem `>-`". Zdjęta razem ze swoim powodem:
       wartość łamana na kilka linii jest dziś czytana normalnie, więc jedyne, co zostało po tej
       stronie, to linie NAPRAWDĘ popsute — a tym rada o blokach kazała naprawiać nie to. */
    if (!para) throw new Error(`linia ${nr + 1}: nie rozumiem — „${tresc.slice(0, 60)}”`);
    const [, , klucz, reszta] = para;
    if (blok) {
      szczyt.wezel[klucz] = blok.wartosc;
    } else if (reszta === '') {
      const k = kolekcje.get(nr);
      if (k && k.skalar !== undefined) {
        szczyt.wezel[klucz] = wartosc(k.skalar);
      } else if (!k) {
        /* Klucz, pod którym nie ma NIC, jest pustą wartością — tak mówi YAML i tak czyta go
           każdy parser. Pusta mapa w tym miejscu byłaby naszą zgadywanką. */
        szczyt.wezel[klucz] = null;
      } else {
        const dziecko = k.lista ? [] : {};
        szczyt.wezel[klucz] = dziecko;
        /* ⚠ WCIĘCIE DZIECKA BIERZE SIĘ Z PLIKU, nie z założenia „klucz + 1". Lista na tym samym
           poziomie co klucz stoi dokładnie na `wciecie`, więc `wciecie + 1` zdejmowałoby ją
           ze stosu przy pierwszym myślniku. */
        stos.push({ wciecie: k.wciecie, wezel: dziecko });
      }
    } else {
      szczyt.wezel[klucz] = wartosc(reszta);
    }
  }
  return korzen;
}

/** Wejście z sieci: napis → obiekt. JSON, potem YAML. Błąd niesie POWÓD, nie samo „nie udało się”. */
export function wczytajTekst(tekst) {
  const t = String(tekst ?? '').trim();
  if (!t) throw new Error('puste wejście');
  if (t.startsWith('{') || t.startsWith('[')) {
    try { return { dane: JSON.parse(t), skladnia: 'json' }; }
    catch (e) {
      /* Nawias klamrowy na starcie to zwykle JSON — ale bywa też YAML-em „w nawiasach".
         Kiedyś odmawialiśmy tu od razu, komunikatem o JSON-ie, na pliku, który JSON-em
         nie miał być; teraz YAML dostaje swoją szansę, a wiadomość mówi o OBU próbach. */
      try { return { dane: czytajYaml(t), skladnia: 'yaml' }; }
      catch (e2) { throw new Error(`JSON nie parsuje się: ${e.message}; jako YAML też nie: ${e2.message}`); }
    }
  }
  try { return { dane: czytajYaml(t), skladnia: 'yaml' }; }
  catch (e) {
    try { return { dane: JSON.parse(t), skladnia: 'json' }; }
    catch { throw new Error(`ani JSON, ani YAML: ${e.message}`); }
  }
}
