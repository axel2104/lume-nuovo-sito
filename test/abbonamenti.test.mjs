/**
 * Controllo sull'HTML già costruito: `node --test` della stdlib, nessuna
 * dipendenza aggiunta. Gira dopo `npm run build`.
 *
 * Serve a una cosa che la build non può accorgersi di rompere: il selettore
 * delle formule non ha JavaScript, lo fa `:has()` in global.css agganciandosi
 * a `.listino`. Se qualcuno sposta le radio fuori da quel contenitore il CSS
 * smette di agganciare e la pagina mostra tutte e tre le formule insieme —
 * cioè tre prezzi diversi per lo stesso piano, uno sotto l'altro, senza che
 * niente segnali un errore.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../dist/abbonamenti/index.html', import.meta.url), 'utf8');
const FORMULE = ['annuale', 'rate', 'mensile'];

/**
 * Il listino in cima alla pagina, dal suo contenitore alla tabella di
 * confronto.
 *
 * Da quando /abbonamenti stampa anche i listini degli altri centri, contare
 * su tutta la pagina non misura piu' niente: `class="plan "` trova le schede
 * di quattro listini diversi, e un test che dice "tre piani" passerebbe o
 * fallirebbe per l'apertura di una sede.
 */
const blocco = html.slice(html.indexOf('id="listini"'), html.indexOf('id="confronto"'));

/**
 * La scheda Macerata: dal suo pannello a quello del centro successivo.
 *
 * Contare su tutta la pagina, o anche sul solo blocco, non misura piu'
 * niente: i listini stanno tutti nel DOM e `class="plan "` ne trova le
 * schede di tre. Un test che dice "tre piani" passerebbe o fallirebbe per
 * l'apertura di una sede.
 */
const inCima = blocco.slice(
  blocco.indexOf('<div data-listino="macerata"'),
  blocco.indexOf('<div data-listino="montecassiano"'),
);
const quante = (s) => inCima.split(s).length - 1;
const piani = quante('class="plan ');

test('il selettore di formula sta dentro .listino', () => {
  const listino = blocco;
  for (const f of FORMULE) {
    assert.ok(
      listino.includes(`id="f-${f}"`),
      `il radio ${f} è fuori da .listino: :has() non aggancia più`,
    );
    assert.ok(
      listino.includes(`data-formula="${f}"`),
      `i blocchi della formula ${f} sono fuori dallo scope del selettore`,
    );
  }
});

test('una sola formula è preselezionata, ed è l\'annuale', () => {
  // Se `:has()` non è supportato resta visibile la formula predefinita. Deve
  // essere l'annuale: è quella che conviene, ed è il prezzo pieno del piano.
  // Una per listino: la pagina ne ha piu' d'uno, e ognuno si apre sulla sua
  // annuale.
  // Il prefisso, non la classe intera: lo switch dei listini è `pf sw`, e ha
  // anche lui una radio preselezionata.
  const gruppi = html.split('<fieldset class="pf').slice(1);
  assert.equal(
    html.split(' checked').length - 1,
    gruppi.length,
    'le radio preselezionate non sono una per selettore',
  );
  for (const gruppo of gruppi) {
    const primaRadio = gruppo.indexOf('id="');
    assert.ok(
      gruppo.slice(primaRadio, primaRadio + 200).includes('checked'),
      'in un selettore la radio preselezionata non è la prima',
    );
  }
});

test('ogni piano ha almeno una formula, e nessuna in più del previsto', () => {
  assert.ok(piani >= 1, 'nessun piano pubblicato');
  for (const f of FORMULE) {
    const n = quante(`data-formula="${f}"`);
    // Prezzo + pulsante per ogni piano che ha la formula, oppure il rimando
    // per quelli che non ce l'hanno: mai zero, mai più di due per piano.
    assert.ok(n >= 1, `nessun blocco per la formula ${f}`);
    assert.ok(n <= piani * 2, `troppi blocchi per la formula ${f}: ${n}`);
  }
});

test('il piano senza mensile rimanda altrove invece di lasciare un vuoto', () => {
  // Il Sala Pesi esiste solo a dodici mesi. Un prezzo mancante senza
  // spiegazione si legge come un guasto della pagina, non come un'offerta
  // che non c'è: al suo posto deve comparire dove andare.
  const rimandi = quante('class="plan-altrove"');
  if (rimandi === 0) return; // tutti i piani hanno tutte le formule
  assert.ok(
    html.includes('Non c\'è mensile') || html.includes('Non c&#39;è mensile'),
    'il rimando non dice quale formula manca',
  );
  assert.ok(
    /Senza vincolo il piano è[^<]*<b>/.test(html),
    'il rimando non nomina il piano alternativo',
  );
});

test('ogni formula mostra le sue condizioni contrattuali', () => {
  // Durata minima e preavviso sono i vincoli del contratto: vanno in pagina,
  // non dietro un "dettagli". Se sparissero, la pagina venderebbe un
  // abbonamento annuale senza dire che è annuale.
  assert.ok(quante('class="plan-cond"') >= piani, 'condizioni mancanti su qualche piano');
  assert.ok(html.includes('Durata minima:'), 'la durata minima non compare');
  assert.ok(html.includes('Preavviso di disdetta:'), 'il preavviso non compare');
});

test('la pagina ha un solo h1', () => {
  // Ci era già sfuggito: la pagina nasceva partendo da <h2>, senza h1, su una
  // pagina che deve posizionarsi per "abbonamenti palestra".
  // Sull'intera pagina, non nel solo listino in cima: `quante` misura quel
  // blocco, e l'h1 sta nell'hero, sopra.
  assert.equal(html.split('<h1').length - 1, 1);
});

test('la tabella confronta ogni piano su ogni riga', () => {
  const corpo = html.slice(html.indexOf('<tbody'), html.indexOf('</tbody>'));
  const righe = corpo.split('<tr').length - 1;
  // Una cella per piano su ogni riga: se una voce compare in un piano e non
  // negli altri, o un piano non viene renderizzato, il conto non torna.
  assert.equal(corpo.split('<td').length - 1, righe * piani);
});

test('la tabella chiude con i prezzi di tutte e tre le formule', () => {
  const corpo = html.slice(html.indexOf('<tbody'), html.indexOf('</tbody>'));
  assert.equal(corpo.split('class="tab-prezzi"').length - 1, 3);
});

test('data-abbonamento corrisponde a una chip del form, alla lettera', () => {
  // `data-abbonamento` preseleziona la chip del piano nel form, e la
  // preselezione confronta il valore **esatto** con l'attributo `value` della
  // chip: se non combaciano non viene selezionato niente e non compare nessun
  // errore — il lead arriva senza il piano da cui è partito.
  //
  // Ci sono già inciampato: i pulsanti passavano "All Lume Fitness — Annuale"
  // per portarsi dietro anche la formula, e nessuna chip si chiama così. La
  // formula viaggia in `data-medium`, che è un altro campo di Airtable.
  // Su tutta la pagina: i listini delle sedi hanno piani che il form non
  // conosce ("All Piscina", "Under 30"), e per quelli l'attributo non viene
  // scritto affatto. Se ricomparisse, questo test lo prenderebbe.
  const valori = new Set(
    [...html.matchAll(/data-abbonamento="([^"]+)"/g)].map((m) => m[1]),
  );
  assert.ok(valori.size >= 1, 'nessun pulsante porta data-abbonamento');

  // L'ordine degli attributi nel markup generato non è garantito: si cercano
  // i tag interi e da lì si estrae il `value`, invece di assumere che venga
  // dopo `data-campo` (assunzione che infatti era sbagliata).
  const chips = new Set(
    [...html.matchAll(/<input[^>]*>/g)]
      .map((m) => m[0])
      .filter((tag) => tag.includes('data-campo="abbonamento"'))
      .map((tag) => tag.match(/value="([^"]+)"/)?.[1])
      .filter(Boolean),
  );
  assert.ok(chips.size >= piani, `chip dei piani mancanti nel form: ${[...chips]}`);

  for (const v of valori) {
    assert.ok(chips.has(v), `data-abbonamento="${v}" non corrisponde a nessuna chip: ${[...chips]}`);
  }
  assert.ok(
    html.includes('data-open-form="iscrizione"'),
    'i CTA dei piani non aprono il flusso iscrizione',
  );
});

test('la formula scelta viaggia comunque, in data-medium', () => {
  const medium = [...html.matchAll(/data-medium="(Abbonamenti:[^"]+)"/g)].map((m) => m[1]);
  assert.ok(medium.length >= piani, 'i pulsanti dei piani hanno perso l\'attribuzione');
  assert.ok(
    medium.some((m) => /:(Annuale|In 12 rate|Mensile)$/.test(m)),
    `nessun medium porta la formula: ${medium.slice(0, 3)}`,
  );
});

test('il form non offre piani che non esistono', () => {
  // Base, Plus e Premium erano cablati in forms.ts e sono sopravvissuti al
  // cambio di listino: il form offriva tre piani inesistenti, e il nome
  // finiva nel campo Nome Abbonamento di Airtable.
  const chips = [...html.matchAll(/<input[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => tag.includes('data-campo="abbonamento"'))
    .map((tag) => tag.match(/value="([^"]+)"/)?.[1]);
  for (const fantasma of ['Base', 'Plus', 'Premium']) {
    assert.ok(!chips.includes(fantasma), `il form offre ancora il piano "${fantasma}"`);
  }
});

test('la prevendita apre un contatto, non un piano', () => {
  // Non è un abbonamento in listino: mandarla sul flusso iscrizione la
  // farebbe arrivare in Airtable come un piano che non esiste.
  if (!html.includes('AbbonamentiPrevendita')) return; // nessun centro in prevendita
  assert.ok(
    html.includes('data-medium="AbbonamentiPrevendita"'),
    'il CTA prevendita ha perso la sua attribuzione',
  );
});

/* ─── Il Box CrossFit sulla pagina della sede ───────────────────────────── */

const macerata = readFileSync(
  new URL('../dist/centri/macerata/index.html', import.meta.url),
  'utf8',
);
const montecassiano = readFileSync(
  new URL('../dist/centri/montecassiano/index.html', import.meta.url),
  'utf8',
);

test('il Box sta dentro .listino-sede, dove il selettore lo raggiunge', () => {
  // Stessa trappola del test in cima al file: le schede del Box hanno tre
  // prezzi ciascuna e nessun JavaScript che ne nasconda due. Fuori da
  // `.listino-sede` il `:has()` non le vede e si stampano tutti e tre.
  const sede = macerata.slice(
    macerata.indexOf('class="listino-sede"'),
    macerata.indexOf('</main>'),
  );
  const box = sede.indexOf('class="listino-box pf-scope"');
  assert.ok(box > 0, 'il blocco Box è uscito da .listino-sede');
  assert.ok(sede.indexOf('id="f-annuale"') < box, 'le radio non precedono più il Box');
});

test('solo la sede che ha il Box mostra il Box', () => {
  assert.ok(macerata.includes('Box CrossFit'), 'Macerata ha perso il Box');
  assert.ok(
    !montecassiano.includes('listino-box'),
    'il Box compare su una sede che non ce l\'ha',
  );
});

test('i checkout del Box puntano al club giusto', () => {
  // Gli id dei piani CrossFit (52-60, 129-130) sono gli stessi su tutti i
  // club: cambia solo `clubID`. Con il numero sbagliato il pulsante funziona
  // e vende l'abbonamento di un'altra sede.
  const box = macerata.slice(macerata.indexOf('class="listino-box pf-scope"'));
  const link = [...box.matchAll(/Registration\/Start\?clubID=(\d+)&(?:amp;)?PaymentPlanId=(\d+)/g)];
  assert.ok(link.length >= 7, `troppi pochi checkout nel Box: ${link.length}`);
  for (const [, club, piano] of link) {
    assert.equal(club, '1', `il piano ${piano} manda al club ${club}, non a Macerata`);
  }
});

test('la data di scadenza del Box è scritta, non sottintesa', () => {
  // Il sito è statico: il blocco non sparisce da solo il 1° novembre. Finché
  // c'è, deve dire fino a quando vale — chi firma un annuale lo legge prima.
  const box = macerata.slice(macerata.indexOf('class="listino-box pf-scope"'));
  assert.match(box.slice(0, 1200), /fino al 31 ottobre 2026/);
  assert.match(box.slice(0, 1200), /Val di Chienti/);
});

test('il Box ha il suo selettore di formula, separato da quello della palestra', () => {
  // Due gruppi di radio con gli stessi `id` non sono due selettori: sono un
  // selettore rotto, perche' e' l'`id` che `:has()` cerca in global.css.
  const box = macerata.slice(macerata.indexOf('class="listino-box pf-scope"'));
  for (const f of FORMULE) {
    assert.ok(box.includes(`id="f-box-${f}"`), `il Box non ha la formula ${f}`);
    assert.ok(
      !box.includes(`id="f-${f}"`),
      `il Box ripete l'id del selettore della palestra: f-${f}`,
    );
  }
  assert.equal(
    (macerata.match(/id="f-annuale"/g) || []).length,
    1,
    "l'id f-annuale compare piu' di una volta nella pagina",
  );
});

/* ─── Tutti i listini su /abbonamenti ───────────────────────────────────── */

test('/abbonamenti stampa il listino di ogni centro che ne ha uno', () => {
  // Prima i prezzi degli altri centri esistevano solo sulla pagina della
  // sede: chi confrontava Macerata e Montecassiano doveva tenere due schede
  // aperte.
  const sezione = html.slice(html.indexOf('id="listini"'));
  assert.ok(sezione.length > 0, 'la sezione dei listini per centro è sparita');
  for (const nome of ['Montecassiano', 'Urban']) {
    assert.ok(sezione.includes(nome), `manca il listino di ${nome}`);
  }
  assert.ok(sezione.includes('Box CrossFit'), 'manca il Box di Macerata');
});

test('Macerata ha una scheda sola nello switch', () => {
  // La prima scheda È il listino di Macerata. Una seconda voce con lo stesso
  // centro darebbe gli stessi prezzi con nomi diversi per gli stessi piani.
  // Solo i tag: gli stessi slug compaiono anche nelle regole generate.
  const schede = [...blocco.matchAll(/<input[^>]*data-sw="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(schede, [...new Set(schede)], `schede ripetute: ${schede}`);
  assert.equal(schede[0], 'macerata', 'lo switch non si apre su Macerata');
  assert.ok(!schede.includes('urban'), 'Urban è tornato fra i listini');
});

test('ogni scheda dello switch ha il suo pannello, e viceversa', () => {
  // Una voce senza pannello è un pulsante che svuota la pagina; un pannello
  // senza voce è un listino che nessuno può raggiungere.
  const schede = [...blocco.matchAll(/<input[^>]*data-sw="([^"]+)"/g)].map((m) => m[1]);
  const pannelli = [...blocco.matchAll(/<div data-listino="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(schede, pannelli);
  for (const id of schede) {
    assert.ok(
      blocco.includes(`[data-sw="${id}"]:checked) [data-listino="${id}"]`),
      `manca la regola che accende la scheda ${id}`,
    );
  }
});

test('ogni listino ha il suo gruppo di radio', () => {
  // Radio con lo stesso `name` sono un gruppo solo: spuntare "Mensile" su
  // Montecassiano spegnerebbe la scelta su Urban, e con lo stesso `id` il
  // `:has()` non saprebbe quale scope guardare.
  const nomi = [...html.matchAll(/name="(formula-[^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(nomi).size, nomi.length / FORMULE.length, 'due listini condividono le radio');
  const ids = [...html.matchAll(/<input[^>]+id="(f[^"]*)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, `id di radio ripetuti: ${ids.join(', ')}`);
});

test('le regole del selettore non cercano più un id fisso', () => {
  // Con `#f-rate` nel CSS il primo listino si muoveva e gli altri restavano
  // sulla soluzione unica: prezzi sbagliati senza nessun errore.
  const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.ok(css.includes(".pf-scope:has([data-pf='rate']:checked)"), 'regole .pf-scope assenti');
  assert.ok(!/:has\(#f-\w+:checked\)/.test(css), 'il CSS cerca ancora un id fisso');
});

test('ogni selettore ha le sue schede dentro lo stesso scope', () => {
  // Un selettore fuori dal suo `.pf-scope` non muove niente, e la pagina
  // mostra tutte e tre le formule insieme senza segnalare nulla.
  const scope = [...html.matchAll(/class="[^"]*pf-scope[^"]*"/g)];
  const fieldset = [...html.matchAll(/<fieldset class="pf"/g)];
  assert.equal(scope.length, fieldset.length, 'scope e selettori di formula non si corrispondono');
});

test('la tabella di confronto segue lo switch', () => {
  // Confrontare i piani di Macerata mentre a video ci sono i prezzi di
  // Montecassiano è peggio che non avere la tabella: due listini diversi
  // che sembrano lo stesso.
  const conf = html.slice(html.indexOf('id="confronto"'), html.indexOf('Prima di decidere'));
  const schede = [...blocco.matchAll(/<input[^>]*data-sw="([^"]+)"/g)].map((m) => m[1]);
  const tabelle = [...conf.matchAll(/<div data-listino="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(tabelle, schede, 'una scheda dello switch non ha la sua tabella');
  assert.equal(
    conf.split('class="tab-conf"').length - 1,
    schede.length,
    'tabelle e schede non si corrispondono',
  );
  // Lo scope deve contenere anche questa sezione, o le regole non la vedono.
  assert.ok(/<main[^>]*class="[^"]*sw-scope/.test(html), 'lo scope non copre più la tabella');
});

test('la tabella di ogni listino porta i prezzi di quel listino', () => {
  // La collection tiene la rata (80) e i listini di sede il totale (960):
  // mescolarli farebbe entrare un piano a 80 € accanto a uno da 900 €.
  const conf = html.slice(html.indexOf('id="confronto"'), html.indexOf('Prima di decidere'));
  const tabella = (id) => {
    const i = conf.indexOf(`<div data-listino="${id}"`);
    return conf.slice(i, conf.indexOf('</table>', i));
  };
  assert.match(tabella('macerata'), /900 €/, 'il GOLD di Macerata non è in tabella');
  assert.match(tabella('macerata'), /80 €\/mese/, 'la rata del GOLD non è la rata');
  assert.match(tabella('montecassiano'), /468 €/, 'la Sala di Montecassiano non è in tabella');
  assert.ok(!tabella('montecassiano').includes('900 €'), 'prezzi di Macerata su Montecassiano');
});
