import { test } from 'node:test';
import assert from 'node:assert/strict';

const { deviceDi, sorgenteDi, etichettaClick } = await import('../src/lib/interazioni.js');

// Un elemento finto, quanto basta a `etichettaClick`: closest, getAttribute, textContent, tagName.
const el = (tagName, attrs = {}, testo = '', dentro = null) => {
  const e = {
    tagName,
    textContent: testo,
    getAttribute: (k) => attrs[k] ?? null,
    closest(sel) {
      if (sel.includes('#chat-panel') && dentro === 'chat') return e;
      if (sel.includes('#chat-panel')) return null;
      return e;
    },
  };
  return e;
};

test('dispositivo dalla larghezza', () => {
  assert.equal(deviceDi(390), 'mobile');
  assert.equal(deviceDi(1280), 'desktop');
});

test('sorgente: utm, altro sito, diretto', () => {
  assert.equal(sorgenteDi('', '?utm_source=Totem', 'lumefitness.it'), 'totem');
  assert.equal(sorgenteDi('https://www.google.com/search?q=x', '', 'lumefitness.it'), 'google.com');
  assert.equal(sorgenteDi('https://lumefitness.it/abbonamenti/', '', 'lumefitness.it'), 'diretto');
  assert.equal(sorgenteDi('', '', 'lumefitness.it'), 'diretto');
});

test('click: pulsanti e link con testo pulito, mai contenuti dei campi', () => {
  assert.equal(etichettaClick(el('BUTTON', {}, '  Pass   prova \n')), 'btn: Pass prova');
  assert.equal(etichettaClick(el('A', { href: '/abbonamenti/' }, 'Abbonamenti')), 'link: Abbonamenti → /abbonamenti/');
  assert.equal(etichettaClick(el('A', { href: 'https://lumefitness.perfectgym.com/x?id=1' }, 'Iscriviti')), 'link: Iscriviti → lumefitness.perfectgym.com');
  assert.equal(etichettaClick(el('A', { 'data-track': 'Hero · CTA', href: '/prova' }, 'Prova')), 'link: Hero · CTA → /prova');
  assert.equal(etichettaClick(el('BUTTON', { 'aria-label': 'Chiudi' }, '×')), 'btn: Chiudi');
});

test('click: la chat e ciò che non è cliccabile non si registrano', () => {
  assert.equal(etichettaClick(el('BUTTON', {}, 'Invia', 'chat')), null);
  assert.equal(etichettaClick({ closest: () => null }), null);
  assert.equal(etichettaClick(null), null);
});
