import { test } from 'node:test';
import assert from 'node:assert/strict';

const { parametri, urlQr, oraRoma, lezioniRestanti, prezzoPiano } = await import('../src/lib/totemDati.js');

test('parametri: il centro viene dal totem, ripulito', () => {
  assert.deepEqual(parametri('?t=Macerata-Ingresso'), { totem: 'macerata-ingresso', centro: 'macerata' });
  assert.deepEqual(parametri('?t=urban-1&centro=macerata'), { totem: 'urban-1', centro: 'macerata' });
  assert.deepEqual(parametri('?t=<script>x'), { totem: 'scriptx', centro: 'scriptx' });
  assert.deepEqual(parametri(''), { totem: '', centro: '' });
});

test('QR: UTM con totem e centro', () => {
  const u = new URL(urlQr('/prova', 'macerata', 'macerata-ingresso'));
  assert.equal(u.pathname, '/prova');
  assert.equal(u.searchParams.get('utm_source'), 'totem');
  assert.equal(u.searchParams.get('utm_campaign'), 'macerata');
  assert.equal(u.searchParams.get('utm_content'), 'macerata-ingresso');
});

test('ora italiana, non quella del dispositivo', () => {
  // lunedì 12 ottobre 2026, 22:30 UTC = martedì 13 ottobre 00:30 a Roma (CEST)
  assert.deepEqual(oraRoma(new Date('2026-10-12T22:30:00Z')), { giorno: 2, minuti: 30 });
  assert.deepEqual(oraRoma(new Date('2026-10-12T07:05:00Z')), { giorno: 1, minuti: 9 * 60 + 5 });
});

test('lezioni: oggi quelle non finite, a fine giornata domani', () => {
  const lez = [
    { giorno: 1, inizio: '07:00', fine: '08:00', corso: 'CrossFit' },
    { giorno: 1, inizio: '18:00', fine: '19:00', corso: 'BodyPump' },
    { giorno: 2, inizio: '09:00', fine: '10:00', corso: 'Yoga' },
  ];
  const a = lezioniRestanti(lez, 1, 8 * 60 + 30);
  assert.equal(a.quando, 'oggi');
  assert.deepEqual(a.lezioni.map((l) => l.corso), ['BodyPump']);
  const b = lezioniRestanti(lez, 1, 20 * 60);
  assert.equal(b.quando, 'domani');
  assert.deepEqual(b.lezioni.map((l) => l.corso), ['Yoga']);
  assert.equal(lezioniRestanti(lez, 7, 600).giorno, 1); // domenica → lunedì
});

test('prezzo del piano', () => {
  assert.deepEqual(prezzoPiano({ mensile: 105, annuale: 900 }), { grande: '105 €', unita: 'al mese', nota: 'oppure 900 € in un anno' });
  assert.equal(prezzoPiano({ mensile: null, annuale: 420 }).unita, 'in un anno');
});
