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
const quante = (s) => html.split(s).length - 1;
const piani = quante('class="plan ');

test('il selettore di formula sta dentro .listino', () => {
  const listino = html.slice(html.indexOf('class="listino"'), html.indexOf('</main>'));
  for (const f of FORMULE) {
    assert.ok(
      listino.includes(`id="f-${f}"`),
      `il radio ${f} è fuori da .listino: :has() non aggancia più`,
    );
    assert.ok(
      listino.includes(`data-formula="${f}"`),
      `i blocchi della formula ${f} sono fuori da .listino`,
    );
  }
});

test('una sola formula è preselezionata, ed è l\'annuale', () => {
  // Se `:has()` non è supportato resta visibile la formula predefinita. Deve
  // essere l'annuale: è quella che conviene, ed è il prezzo pieno del piano.
  assert.equal(quante(' checked'), 1, 'più di una radio preselezionata');
  const primaRadio = html.indexOf('id="f-');
  assert.ok(
    html.slice(primaRadio - 120, primaRadio + 40).includes('checked'),
    'la radio preselezionata non è la prima (annuale)',
  );
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
  assert.equal(quante('<h1'), 1);
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
  const box = sede.indexOf('class="listino-box"');
  assert.ok(box > 0, 'il blocco Box è uscito da .listino-sede');
  assert.ok(sede.indexOf('id="f-annuale"') < box, 'le radio non precedono più il Box');
});

test('solo la sede che ha il Box mostra il Box', () => {
  assert.ok(macerata.includes('Box CrossFit'), 'Macerata ha perso il Box');
  assert.ok(
    !montecassiano.includes('class="listino-box"'),
    'il Box compare su una sede che non ce l\'ha',
  );
});

test('i checkout del Box puntano al club giusto', () => {
  // Gli id dei piani CrossFit (52-60, 129-130) sono gli stessi su tutti i
  // club: cambia solo `clubID`. Con il numero sbagliato il pulsante funziona
  // e vende l'abbonamento di un'altra sede.
  const box = macerata.slice(macerata.indexOf('class="listino-box"'));
  const link = [...box.matchAll(/Registration\/Start\?clubID=(\d+)&(?:amp;)?PaymentPlanId=(\d+)/g)];
  assert.ok(link.length >= 7, `troppi pochi checkout nel Box: ${link.length}`);
  for (const [, club, piano] of link) {
    assert.equal(club, '1', `il piano ${piano} manda al club ${club}, non a Macerata`);
  }
});

test('la data di scadenza del Box è scritta, non sottintesa', () => {
  // Il sito è statico: il blocco non sparisce da solo il 1° novembre. Finché
  // c'è, deve dire fino a quando vale — chi firma un annuale lo legge prima.
  const box = macerata.slice(macerata.indexOf('class="listino-box"'));
  assert.match(box.slice(0, 1200), /fino al 31 ottobre 2026/);
  assert.match(box.slice(0, 1200), /Val di Chienti/);
});

test('il Box ha il suo selettore di formula, separato da quello della palestra', () => {
  // Due gruppi di radio con gli stessi `id` non sono due selettori: sono un
  // selettore rotto, perche' e' l'`id` che `:has()` cerca in global.css.
  const box = macerata.slice(macerata.indexOf('class="listino-box"'));
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
