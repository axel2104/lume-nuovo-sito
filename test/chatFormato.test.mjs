import { test } from 'node:test';
import assert from 'node:assert/strict';

const { analizza, urlSicuro, segmenti } = await import('../src/lib/chatFormato.js');

test('marcatori: pulsanti e risposte rapide escono dal testo', () => {
  const r = analizza('Il **Gold** costa 900 €.\n[[Settimana di prova|https://www.lumefitness.it/prova]]\n((Macerata)) ((Urban))');
  assert.deepEqual(r.bottoni, [{ etichetta: 'Settimana di prova', url: 'https://www.lumefitness.it/prova' }]);
  assert.deepEqual(r.risposte, ['Macerata', 'Urban']);
  assert.deepEqual(r.blocchi, [{ tipo: 'p', riga: 'Il **Gold** costa 900 €.' }]);
});

test('un URL nudo diventa un pulsante con etichetta, anche fra parentesi', () => {
  const r = analizza('Leggi il regolamento (https://www.lumefitness.it/regolamento#6-9) e scrivici: https://www.lumefitness.it/contatti');
  assert.deepEqual(r.bottoni.map((b) => b.etichetta), ['Leggi il regolamento', 'Contatta il centro']);
  assert.ok(!r.blocchi[0].riga.includes('http'));
});

test('indirizzi di altri siti non diventano mai pulsanti', () => {
  assert.equal(urlSicuro('https://evil.example/prova'), null);
  assert.equal(urlSicuro('http://www.lumefitness.it/prova'), null);
  assert.equal(urlSicuro('javascript:alert(1)'), null);
  assert.equal(urlSicuro('https://lumefitness.it.evil.example/'), null);
  assert.deepEqual(analizza('[[Clicca|https://evil.example]]').bottoni, []);
});

test('elenchi e grassetti', () => {
  const r = analizza('Include:\n- sala pesi\n- **acqua**\nFine');
  assert.deepEqual(r.blocchi.map((b) => b.tipo), ['p', 'ul', 'p']);
  assert.deepEqual(r.blocchi[1].righe, ['sala pesi', '**acqua**']);
  assert.deepEqual(segmenti('a **b** c'), [{ t: 'a ', b: false }, { t: 'b', b: true }, { t: ' c', b: false }]);
});
