import { test } from 'node:test';
import assert from 'node:assert/strict';

const { unisci, PREDEFINITI } = await import('../src/lib/totemTesti.js');

test('senza nulla scritto in Keystatic vale il totem di serie', () => {
  assert.deepEqual(unisci({}), PREDEFINITI);
  assert.deepEqual(unisci(undefined), PREDEFINITI);
});

test('un testo vuoto o mancante ricade sul valore di serie, uno scritto lo sostituisce', () => {
  const t = unisci({ attesaSopra: '  ', menuTitolo: ' Scopri Lume ' });
  assert.equal(t.attesaSopra, PREDEFINITI.attesaSopra);
  assert.equal(t.menuTitolo, 'Scopri Lume');
});

test('le tessere seguono l’ordine scelto, nascondere una la toglie, chiavi sconosciute o doppie si scartano', () => {
  const t = unisci({ tessere: [{ chiave: 'prova', titolo: 'Provaci' }, { chiave: 'x' }, { chiave: 'centro' }, { chiave: 'prova' }] });
  assert.deepEqual(t.tessere.map((x) => x.chiave), ['prova', 'centro']);
  assert.equal(t.tessere[0].titolo, 'Provaci');
  assert.equal(t.tessere[0].sotto, '7 giorni a 15 €');
});

test('la foto scelta passa dal risolutore, se non si risolve resta quella di serie', () => {
  const j = { tessere: [{ chiave: 'centro', foto: '../../assets/totem/a.jpg' }, { chiave: 'corsi', foto: '../../assets/totem/b.jpg' }] };
  const t = unisci(j, (p) => (p.endsWith('a.jpg') ? '/_astro/a.webp' : ''));
  assert.equal(t.tessere[0].foto, '/_astro/a.webp');
  assert.equal(t.tessere[1].foto, '/media/reformer.jpg');
});
