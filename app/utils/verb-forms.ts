/** Past singular, past plural and the 'done' form of verbs that do not add -te/-de and ge-…-t/-d. */
const STRONG: Record<string, [string, string, string]> = {
  bakken: ['bakte', 'bakten', 'gebakken'], bederven: ['bedierf', 'bedierven', 'bedorven'], beginnen: ['begon', 'begonnen', 'begonnen'],
  begrijpen: ['begreep', 'begrepen', 'begrepen'], besluiten: ['besloot', 'besloten', 'besloten'], bewegen: ['bewoog', 'bewogen', 'bewogen'],
  bieden: ['bood', 'boden', 'geboden'], bijten: ['beet', 'beten', 'gebeten'], binden: ['bond', 'bonden', 'gebonden'],
  blijven: ['bleef', 'bleven', 'gebleven'], breken: ['brak', 'braken', 'gebroken'], brengen: ['bracht', 'brachten', 'gebracht'],
  denken: ['dacht', 'dachten', 'gedacht'], doen: ['deed', 'deden', 'gedaan'], dragen: ['droeg', 'droegen', 'gedragen'],
  drinken: ['dronk', 'dronken', 'gedronken'], ervaren: ['ervoer', 'ervoeren', 'ervaren'], eten: ['at', 'aten', 'gegeten'],
  gaan: ['ging', 'gingen', 'gegaan'], gelden: ['gold', 'golden', 'gegolden'], genezen: ['genas', 'genazen', 'genezen'],
  genieten: ['genoot', 'genoten', 'genoten'], geven: ['gaf', 'gaven', 'gegeven'], grijpen: ['greep', 'grepen', 'gegrepen'],
  hangen: ['hing', 'hingen', 'gehangen'], hebben: ['had', 'hadden', 'gehad'], helpen: ['hielp', 'hielpen', 'geholpen'],
  heten: ['heette', 'heetten', 'geheten'], houden: ['hield', 'hielden', 'gehouden'], kiezen: ['koos', 'kozen', 'gekozen'],
  kijken: ['keek', 'keken', 'gekeken'], klimmen: ['klom', 'klommen', 'geklommen'], klinken: ['klonk', 'klonken', 'geklonken'],
  komen: ['kwam', 'kwamen', 'gekomen'], kopen: ['kocht', 'kochten', 'gekocht'], krijgen: ['kreeg', 'kregen', 'gekregen'],
  kunnen: ['kon', 'konden', 'gekund'], lachen: ['lachte', 'lachten', 'gelachen'], laden: ['laadde', 'laadden', 'geladen'],
  laten: ['liet', 'lieten', 'gelaten'], lezen: ['las', 'lazen', 'gelezen'], liegen: ['loog', 'logen', 'gelogen'],
  liggen: ['lag', 'lagen', 'gelegen'], lijken: ['leek', 'leken', 'geleken'], lopen: ['liep', 'liepen', 'gelopen'],
  meten: ['mat', 'maten', 'gemeten'], moeten: ['moest', 'moesten', 'gemoeten'], mogen: ['mocht', 'mochten', 'gemogen'],
  nemen: ['nam', 'namen', 'genomen'], ontvangen: ['ontving', 'ontvingen', 'ontvangen'], raden: ['raadde', 'raadden', 'geraden'],
  rijden: ['reed', 'reden', 'gereden'], roepen: ['riep', 'riepen', 'geroepen'], ruiken: ['rook', 'roken', 'geroken'],
  scheiden: ['scheidde', 'scheidden', 'gescheiden'], scheren: ['schoor', 'schoren', 'geschoren'], schieten: ['schoot', 'schoten', 'geschoten'],
  schrijven: ['schreef', 'schreven', 'geschreven'], schrikken: ['schrok', 'schrokken', 'geschrokken'], slapen: ['sliep', 'sliepen', 'geslapen'],
  sluiten: ['sloot', 'sloten', 'gesloten'], snuiven: ['snoof', 'snoven', 'gesnoven'], spannen: ['spande', 'spanden', 'gespannen'],
  spreken: ['sprak', 'spraken', 'gesproken'], springen: ['sprong', 'sprongen', 'gesprongen'], staan: ['stond', 'stonden', 'gestaan'],
  steken: ['stak', 'staken', 'gestoken'], stelen: ['stal', 'stalen', 'gestolen'], sterven: ['stierf', 'stierven', 'gestorven'],
  stijgen: ['steeg', 'stegen', 'gestegen'], strijken: ['streek', 'streken', 'gestreken'], trekken: ['trok', 'trokken', 'getrokken'],
  vallen: ['viel', 'vielen', 'gevallen'], vangen: ['ving', 'vingen', 'gevangen'], varen: ['voer', 'voeren', 'gevaren'],
  vechten: ['vocht', 'vochten', 'gevochten'], vergeten: ['vergat', 'vergaten', 'vergeten'], verliezen: ['verloor', 'verloren', 'verloren'],
  verdwijnen: ['verdween', 'verdwenen', 'verdwenen'], vinden: ['vond', 'vonden', 'gevonden'], vliegen: ['vloog', 'vlogen', 'gevlogen'],
  vragen: ['vroeg', 'vroegen', 'gevraagd'], vriezen: ['vroor', 'vroren', 'gevroren'], wassen: ['waste', 'wasten', 'gewassen'],
  werpen: ['wierp', 'wierpen', 'geworpen'], weten: ['wist', 'wisten', 'geweten'], wijzen: ['wees', 'wezen', 'gewezen'],
  willen: ['wilde', 'wilden', 'gewild'], winnen: ['won', 'wonnen', 'gewonnen'], worden: ['werd', 'werden', 'geworden'],
  zeggen: ['zei', 'zeiden', 'gezegd'], zenden: ['zond', 'zonden', 'gezonden'], zien: ['zag', 'zagen', 'gezien'],
  zijn: ['was', 'waren', 'geweest'], zingen: ['zong', 'zongen', 'gezongen'], zitten: ['zat', 'zaten', 'gezeten'],
  zoeken: ['zocht', 'zochten', 'gezocht'], zullen: ['zou', 'zouden', ''], zwemmen: ['zwom', 'zwommen', 'gezwommen'],
  zweven: ['zweefde', 'zweefden', 'gezweefd'],
};
/** Present forms that follow no rule: ik, jij/u, hij, and jij asked (`ben je`). */
const IRREGULAR: Record<string, { ik: string[]; jij: string[]; hij: string[]; u?: string[] }> = {
  zijn: { ik: ['ben'], jij: ['bent'], hij: ['is'], u: ['bent', 'is'] },
  hebben: { ik: ['heb'], jij: ['hebt'], hij: ['heeft'], u: ['hebt', 'heeft'] },
  kunnen: { ik: ['kan', 'kun'], jij: ['kunt', 'kan'], hij: ['kan'], u: ['kunt', 'kan'] },
  willen: { ik: ['wil'], jij: ['wilt', 'wil'], hij: ['wil'] },
  zullen: { ik: ['zal', 'zul'], jij: ['zult', 'zal'], hij: ['zal'] },
  mogen: { ik: ['mag'], jij: ['mag'], hij: ['mag'] },
};
const SHORT = new Set(['gaan', 'staan', 'doen', 'zien', 'slaan', 'zijn']);
const SEPARABLE = ['aan', 'achter', 'af', 'bij', 'binnen', 'dicht', 'door', 'in', 'klaar', 'kwijt', 'langs', 'mee', 'mis', 'na', 'neer', 'om', 'onder', 'op', 'open', 'over', 'rond', 'samen', 'stil', 'stuk', 'terecht', 'terug', 'thuis', 'toe', 'uit', 'vast', 'voor', 'weg', 'er', 'eruit', 'ervoor', 'kennis', 'deel', 'plaats', 'schoon', 'goed', 'les', 'feest'];
const INSEPARABLE = ['be', 'ge', 'her', 'ont', 'ver', 'er', 'onder', 'over', 'mis', 'voor', 'door'];
const PRONOUNS = { ik: ['ik'], jij: ['jij', 'je'], u: ['u'], hij: ['hij', 'zij', 'ze', 'het', 'men'], plural: ['wij', 'we', 'jullie', 'zij', 'ze'] };

/** Spellings a stem may take: pakken → pak, nemen → neem, wandelen → wandel, leven → leef. */
function stemsOf(infinitive: string): string[] {
  const bare = SHORT.has(infinitive) ? infinitive.replace(/a?n$/, '') : infinitive.replace(/en$/, '');
  const doubled = bare.match(/^(.*[^aeiou]|)([aeou])([^aeiouwj])$/);
  const raw = /([^aeiou])\1$/.test(bare) ? [bare.slice(0, -1)] : [bare, ...(doubled ? [`${doubled[1]}${doubled[2]}${doubled[2]}${doubled[3]}`] : [])];
  // houden: ik hou next to ik houd.
  return raw.flatMap(s => (s.endsWith('oud') ? [s, s.slice(0, -1)] : [s])).map(s => s.replace(/v$/, 'f').replace(/z$/, 's'));
}

interface Core {
  /** Stands apart in a main clause: hij komt aan. */
  particle: string;
  /** Stays on and takes the place of ge-: vergeten, besproken. */
  prefix: string;
  verb: string;
}
/** Readings of a verb: aannemen as aan + nemen, bespreken as be + spreken, each also as one plain word. */
function coresOf(infinitive: string): Core[] {
  const cores: Core[] = [{ particle: '', prefix: '', verb: infinitive }];
  const fits = (p: string) => infinitive.startsWith(p) && infinitive.length > p.length + 3;
  for (const p of SEPARABLE) if (fits(p)) cores.push({ particle: p, prefix: '', verb: infinitive.slice(p.length) });
  for (const p of INSEPARABLE) if (fits(p)) cores.push({ particle: '', prefix: p, verb: infinitive.slice(p.length) });
  return cores;
}

function presentOf(verb: string, person: keyof typeof PRONOUNS | 'asked'): string[] {
  const irregular = IRREGULAR[verb];
  if (person === 'plural') return [verb];
  if (irregular) return person === 'asked' ? irregular.ik : person === 'u' ? (irregular.u ?? irregular.jij) : irregular[person];
  const stems = stemsOf(verb);
  if (person === 'ik' || person === 'asked') return stems;
  return stems.map(s => (s.endsWith('t') ? s : /[^aeiou]a$/.test(s) ? `${s}at` : `${s}t`));
}

function pastOf(verb: string): { singular: string[]; plural: string[]; done: string[] } {
  const strong = STRONG[verb];
  if (strong) return { singular: [strong[0]], plural: [strong[1]], done: strong[2] ? [strong[2]] : [] };
  const stems = stemsOf(verb);
  const singular = stems.flatMap(s => [`${s}te`, `${s}de`, `${verb.replace(/en$/, '')}de`]);
  return { singular, plural: singular.map(s => `${s}n`), done: stems.flatMap(s => (/[td]$/.test(s) ? [`ge${s}`] : [`ge${s}t`, `ge${s}d`])) };
}

/** What a form says: hij neemt, hij nam, hij heeft genomen, neem, genomen. */
export type FormKind = 'present' | 'past' | 'perfect' | 'imperative' | 'done';

/** What zich turns into after each pronoun: ik schrijf me in, stel je voor. */
const REFLEXIVE: Record<string, string> = { ik: 'me', jij: 'je', je: 'je', jullie: 'je', wij: 'ons', we: 'ons' };

const words = (...parts: string[]) => parts.filter(Boolean).join(' ');

/**
 * Every spelling of a verb a card may show: hij neemt, neem, ik nam, ik heb genomen, zij kleden zich aan, hij komt op tijd, kun jij.
 * It writes more than Dutch has (both -te and -de, a long and a short stem), never fewer: a card only ever matches a real one.
 */
export function formsOf(infinitive: string): Map<string, FormKind> {
  const all = infinitive.split(' ');
  const forms = new Map<string, FormKind>();
  const add = (kind: FormKind) => (form: string) => forms.has(form) || forms.set(form, kind);
  all.forEach((word, at) => {
    if (!/(en|n)$/.test(word) || word.length < 3) return;
    const rest = all.filter((_, i) => i !== at);
    for (const { particle, prefix, verb } of coresOf(word)) {
      const restAfter = (pronoun: string) => rest.map(w => (w === 'zich' ? (REFLEXIVE[pronoun] ?? w) : w));
      const tail = (finite: string, pronoun: string) => words(prefix + finite, ...restAfter(pronoun), particle);
      for (const person of ['ik', 'jij', 'u', 'hij', 'plural'] as const)
        for (const finite of presentOf(verb, person))
          for (const pronoun of PRONOUNS[person]) {
            add('present')(words(pronoun, tail(finite, pronoun)));
            // In a subordinate clause the particle joins the verb: dat hij uitgaat.
            if (particle) add('present')(words(pronoun, ...restAfter(pronoun), particle + prefix + finite));
          }
      for (const finite of presentOf(verb, 'asked')) for (const pronoun of PRONOUNS.jij) add('present')(words(prefix + finite, pronoun, ...restAfter(pronoun), particle));
      for (const finite of presentOf(verb, 'ik')) add('imperative')(tail(finite, 'jij'));
      const past = pastOf(verb);
      for (const pronoun of [...PRONOUNS.ik, ...PRONOUNS.jij, ...PRONOUNS.u, ...PRONOUNS.hij]) for (const finite of past.singular) add('past')(words(pronoun, tail(finite, pronoun)));
      for (const pronoun of PRONOUNS.plural) for (const finite of past.plural) add('past')(words(pronoun, tail(finite, pronoun)));
      const done = past.done.map(d => particle + (prefix ? prefix + d.replace(/^ge/, '') : d));
      for (const participle of done) {
        add('done')(participle);
        for (const aux of ['hebben', 'zijn'])
          for (const person of ['ik', 'jij', 'u', 'hij', 'plural'] as const)
            for (const finite of presentOf(aux, person)) for (const pronoun of PRONOUNS[person]) add('perfect')(words(pronoun, finite, ...restAfter(pronoun), participle));
      }
    }
  });
  forms.delete(infinitive);
  return forms;
}
