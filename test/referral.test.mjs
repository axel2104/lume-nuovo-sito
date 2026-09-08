/**
 * Controlli sul referral, sull'HTML già costruito. `node --test` della stdlib,
 * come gli altri: gira dopo `npm run build`.
 *
 * Sorvegliano una cosa sola, ma è quella che non fa rumore quando si rompe: il
 * prezzo dell'invito è più basso di quello di listino, e nessuno se ne accorge
 * se comincia a vedersi anche a chi arriva senza invito. Non è un errore che
 * la build possa intercettare — la pagina resta valida, funzionante e bella, e
 * intanto il pass pieno non lo compra più nessuno.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const prova = leggi('../dist/prova/index.html');
const invita = leggi('../dist/invita/index.html');
const tracking = leggi('../src/scripts/tracking.js');
// I due prezzi si leggono dal sorgente invece di importarlo: `node --test` non
// mangia TypeScript, e per due numeri non vale un transpile.
const prezzi = leggi('../src/data/abbonamenti.ts');
const PASS = Object.fromEntries(
  [...prezzi.matchAll(/(pieno|referral):\s*(\d+)/g)].map((m) => [m[1], Number(m[2])]),
);
const PREMIO = Number(/PREMIO_INVITO = (\d+)/.exec(prezzi)[1]);

test('la fascia dell’invito parte nascosta su /prova', () => {
  const i = prova.indexOf('data-prova-ref');
  assert.ok(i > 0, 'la fascia dell’invito non c’è più: `?ref=` non dice più niente');

  // `hidden` sta nello stesso tag, non da qualche parte nella pagina.
  const tag = prova.slice(prova.lastIndexOf('<', i), prova.indexOf('>', i) + 1);
  assert.match(tag, /\shidden\b/, 'la fascia è visibile a tutti: il prezzo ridotto è in vetrina');
});

test('il prezzo pieno resta quello che si vede su /prova', () => {
  // Il prezzo grande della pagina: se qui finisse la cifra del referral, la
  // pagina offrirebbe a tutti lo sconto dell'invito.
  // `lp-prezzo` è la classe della landing (`/prova` è stata riscritta come
  // pagina di conversione); `prova-prezzo` era quella della pagina precedente.
  // Il controllo accetta entrambe: quello che conta è che il prezzo grande
  // esista e sia quello di listino, non come si chiama il div.
  const i = ['lp-prezzo', 'prova-prezzo']
    .map((cls) => prova.indexOf(`class="${cls}"`))
    .find((j) => j > 0) ?? -1;
  assert.ok(i > 0, 'il blocco del prezzo non c’è più');
  const blocco = prova.slice(i, prova.indexOf('</div>', i));
  assert.ok(blocco.includes(`${PASS.pieno} €`), `il prezzo in evidenza non è più ${PASS.pieno} €`);
  // Con la cifra intera, non `includes`: "5 €" sta dentro "15 €".
  assert.doesNotMatch(
    blocco,
    new RegExp(`(^|\D)${PASS.referral} €`),
    `il prezzo dell’invito (${PASS.referral} €) è finito nel prezzo in evidenza`,
  );
});

test('/invita monta il form referral', () => {
  assert.ok(
    invita.includes('data-flusso="referral"'),
    'la pagina invito non ha il form referral: la richiesta del link non parte',
  );
});

test('`ref` è fra i parametri che il tracciamento cattura', () => {
  // Senza questo il codice di invito non arriva nel payload, e n8n non ha modo
  // di sapere che quel lead va scontato: l'invito diventa decorativo.
  assert.match(tracking, /^\s*'ref',$/m, "'ref' non è più fra le KEYS di tracking.js");
});

test('il premio per chi invita è scritto su /invita', () => {
  // L'unico numero del referral che va detto ad alta voce: se sparisce dalla
  // pagina resta un form che chiede un'email senza dire perché compilarlo.
  assert.ok(
    invita.includes(`${PREMIO} €`),
    `/invita non dice più quanto vale un invito (${PREMIO} €)`,
  );
});

test('/invita non mette in vetrina il prezzo ridotto del pass', () => {
  // Il riquadro del form lo contiene — è nel markup di tutti gli step — ma la
  // colonna editoriale no: lì accanto ci sarebbe il confronto col prezzo pieno.
  const colonna = invita.slice(0, invita.indexOf('data-flusso="referral"'));
  assert.doesNotMatch(
    colonna,
    new RegExp(`(^|\D)${PASS.referral} €`),
    `il prezzo dell’invito (${PASS.referral} €) è finito nella parte pubblica di /invita`,
  );
});
