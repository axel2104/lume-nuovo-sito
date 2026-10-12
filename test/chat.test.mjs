import { test } from 'node:test';
import assert from 'node:assert/strict';

const { scegliPunti, planningCompatto, pulisciMessaggi } = await import('../src/lib/kbChat.ts');

const punti = [
  { id: '6.10', titolo: 'Disdetta dell’abbonamento', url: 'u1', testo: 'Il preavviso per la disdetta è di dieci giorni.' },
  { id: '3.1', titolo: 'Accesso ai centri', url: 'u2', testo: 'Il braccialetto è personale.' },
];

test('il punto pertinente viene scelto, anche con accenti diversi', () => {
  assert.equal(scegliPunti(punti, 'Quanto preavviso per la disdetta?')[0].id, '6.10');
  assert.equal(scegliPunti(punti, 'è personale il braccialetto?')[0].id, '3.1');
  assert.deepEqual(scegliPunti(punti, 'ok'), []);
});

test('planning compatto: giorni in ordine, lezioni per orario', () => {
  const s = planningCompatto([
    { giorno: '2', inizio: '09:00', corso: 'Yoga' },
    { giorno: '1', inizio: '18:00', corso: 'BodyPump' },
    { giorno: '1', inizio: '07:00', corso: 'CrossFit' },
  ]);
  assert.equal(s, 'Lun 07:00 CrossFit, 18:00 BodyPump\nMar 09:00 Yoga');
});

test('messaggi: ruoli validi, ultimo dell’utente, testo troncato', () => {
  assert.deepEqual(pulisciMessaggi('x'), []);
  assert.deepEqual(pulisciMessaggi([{ role: 'system', content: 'x' }]), []);
  assert.deepEqual(pulisciMessaggi([{ role: 'assistant', content: 'a' }, { role: 'user', content: 'ciao' }]), [
    { role: 'user', content: 'ciao' },
  ]);
  assert.equal(pulisciMessaggi([{ role: 'user', content: 'a'.repeat(900) }])[0].content.length, 600);
  assert.deepEqual(pulisciMessaggi([{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }]), []);
});
