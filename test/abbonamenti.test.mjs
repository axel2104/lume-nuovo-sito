/**
 * Controllo sull'HTML gia' costruito: `node --test` della stdlib, nessuna
 * dipendenza aggiunta. Gira dopo `npm run build`.
 *
 * Serve a una cosa sola: il cambio mensile/annuale non ha JavaScript, lo fa
 * `:has()` in global.css. Se qualcuno sposta il selettore fuori da `.listino`
 * il CSS smette di agganciare e la pagina mostra i due prezzi insieme, senza
 * che niente si rompa in modo visibile alla build. Questo test se ne accorge.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../dist/abbonamenti/index.html', import.meta.url), 'utf8');

test('il selettore di formula sta dentro .listino', () => {
  const listino = html.slice(html.indexOf('class="listino"'), html.indexOf('</main>'));
  assert.ok(listino.includes('id="f-annuale"'), 'il radio annuale e\' fuori da .listino: :has() non aggancia piu\'');
  assert.ok(listino.includes('pr pr-m'), 'prezzi mensili fuori da .listino');
  assert.ok(listino.includes('pr pr-a'), 'prezzi annuali fuori da .listino');
});

test('ogni piano espone entrambi i prezzi', () => {
  const piani = html.split('class="plan ').length - 1;
  assert.ok(piani >= 1, 'nessun piano pubblicato');
  assert.equal(html.split('pr pr-m').length - 1, piani);
  assert.equal(html.split('pr pr-a').length - 1, piani);
});

test('la pagina ha un solo h1', () => {
  // Ci era gia' sfuggito: la pagina nasceva partendo da <h2>, senza h1, su una
  // pagina che deve posizionarsi per "abbonamenti palestra".
  assert.equal(html.split('<h1').length - 1, 1);
});

test('la tabella confronta ogni piano su ogni riga', () => {
  const piani = html.split('class="plan ').length - 1;
  const corpo = html.slice(html.indexOf('<tbody'), html.indexOf('</tbody>'));
  const righe = corpo.split('<tr').length - 1;
  // Una cella per piano su ogni riga: se una voce sparisce dalla tassonomia
  // o un piano non viene renderizzato, il conto non torna.
  assert.equal(corpo.split('<td').length - 1, righe * piani);
});

test('ogni piano preseleziona se stesso nel form di iscrizione', () => {
  const piani = html.split('class="plan ').length - 1;
  // `data-abbonamento` e' il valore che finisce nel campo Nome Abbonamento di
  // Airtable: se un piano non lo porta, il lead arriva senza sapere da quale
  // listino e' partito, che e' l'unica informazione che questa pagina aggiunge.
  assert.equal(html.split('data-abbonamento=').length - 1, piani);
  assert.ok(
    html.includes('data-open-form="iscrizione"'),
    'i CTA dei piani non aprono il flusso iscrizione'
  );
});

test('la prevendita apre un contatto, non un piano', () => {
  // Non e' un abbonamento in listino: mandarla sul flusso iscrizione la
  // farebbe arrivare in Airtable come un piano che non esiste.
  if (!html.includes('AbbonamentiPrevendita')) return; // nessun centro in prevendita
  assert.ok(
    html.includes('data-medium="AbbonamentiPrevendita"'),
    'il CTA prevendita ha perso la sua attribuzione'
  );
});
