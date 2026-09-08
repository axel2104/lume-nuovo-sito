/**
 * Il Meta Pixel: `node --test` della stdlib, nessuna dipendenza aggiunta.
 *
 * Qui non si controlla l'HTML costruito ma il comportamento di
 * `src/scripts/tracking.js`, eseguito in un contesto `node:vm` con un finto
 * `window`. Il motivo è che l'invariante da difendere non si vede nel markup:
 * lo script è inline in <head> su ogni pagina, quindi la stringa
 * "connect.facebook.net" c'è sempre — quello che conta è **quando** viene
 * usata.
 *
 * Le tre cose che non devono rompersi:
 *  1. senza consenso marketing il pixel non parte, e non parte nemmeno con
 *     un evento in corso: prima del sì di Iubenda non deve uscire una
 *     richiesta a Meta né comparire il cookie _fbp;
 *  2. con il consenso parte una volta sola, e gli eventi mappati diventano
 *     eventi standard Meta;
 *  3. alla revoca gli eventi smettono, anche senza ricaricare la pagina —
 *     fbevents.js resta in memoria, il consenso no.
 *
 * Se qualcuno sposta `caricaPixel()` fuori dal ponte del consenso, o
 * aggiunge un evento alla mappa, questi test lo dicono.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const sorgente = readFileSync(new URL('../src/scripts/tracking.js', import.meta.url), 'utf8');
const PIXEL = '123456789012345';

/** Il minimo di browser che tracking.js tocca, più il registro di cosa ha fatto. */
function avvia(cfg = {}) {
  const registro = { script: [], fbq: [] };
  const memoria = () => {
    const m = new Map();
    return {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
    };
  };
  const doc = {
    referrer: '',
    createElement: () => ({ set src(v) { registro.script.push(v); }, get src() { return ''; } }),
    head: { appendChild() {} },
    addEventListener() {},
    querySelectorAll: () => [],
  };
  const win = {
    LUME_CFG: { metaPixelId: PIXEL, consensoGestito: true, produzione: true, ...cfg },
    document: doc,
    location: { href: 'https://www.lumefitness.it/', search: '', pathname: '/', origin: 'https://www.lumefitness.it' },
    navigator: {},
    localStorage: memoria(),
    sessionStorage: memoria(),
    matchMedia: () => ({ matches: false }),
    fetch: () => Promise.resolve(),
    URL,
    URLSearchParams,
    Blob: class {},
    JSON,
    Object,
    Math,
    Date,
    String,
    console: { warn() {} },
  };
  win.window = win;
  const ctx = vm.createContext(win);
  vm.runInContext(sorgente, ctx);

  // Il pixel vero sostituito da un registratore: la firma è quella di fbq.
  const finto = (...args) => registro.fbq.push(args);
  return { win, registro, finto };
}

test('senza consenso marketing il pixel non parte', () => {
  const { win, registro } = avvia();
  win.lumeTrack('generate_lead', { centro: 'macerata' });
  assert.equal(registro.script.length, 0, 'fbevents.js richiesto senza consenso');
  assert.equal(typeof win.fbq, 'undefined', 'fbq definito senza consenso');
});

test('col consenso marketing parte una volta sola, e manda PageView', () => {
  const { win, registro, finto } = avvia();
  win.lumeConsent.update(false, true, false);
  assert.deepEqual(registro.script, ['https://connect.facebook.net/en_US/fbevents.js']);

  // Le chiamate reali vanno nella coda di fbq; da qui in poi registriamo noi.
  win.fbq = finto;
  win.lumeConsent.update(false, true, false);
  assert.equal(registro.script.length, 1, 'fbevents.js caricato due volte');
  assert.equal(registro.fbq.length, 0, 'un secondo init/PageView su un consenso ripetuto');
});

test('gli eventi mappati diventano eventi standard Meta', () => {
  const { win, registro, finto } = avvia();
  win.lumeConsent.update(false, true, false);
  win.fbq = finto;

  win.lumeTrack('generate_lead', { centro: 'Lume Macerata', lead_medium: 'HeroHome' });
  win.lumeTrack('appuntamento_prenotato', { centro: 'Lume Montecassiano' });
  win.lumeTrack('newsletter_iscrizione', {});
  // Fuori mappa: nel dataLayer sì, a Meta no.
  win.lumeTrack('lead_step_email', { centro: 'Lume Macerata' });

  assert.deepEqual(
    registro.fbq.map((c) => c[1]),
    ['Lead', 'Schedule', 'CompleteRegistration'],
    'la mappa evento → evento standard non è quella dichiarata',
  );
  // Spread: l'oggetto nasce dentro il contesto vm, quindi ha un altro
  // prototipo e il confronto stretto non lo riconoscerebbe.
  assert.deepEqual({ ...registro.fbq[0][2] }, {
    content_name: 'Lume Macerata',
    content_category: 'HeroHome',
  });
  assert.ok(
    win.dataLayer.some((e) => e.event === 'lead_step_email'),
    'un evento fuori mappa deve restare nel dataLayer per GTM',
  );
});

test('nessun dato personale nei parametri del pixel', () => {
  const { win, registro, finto } = avvia();
  win.lumeConsent.update(false, true, false);
  win.fbq = finto;

  win.lumeTrack('generate_lead', {
    centro: 'Lume Macerata',
    email: 'mario@example.com',
    vid: 'v-123',
    telefono: '3331234567',
  });

  const parametri = JSON.stringify(registro.fbq[0][2]);
  for (const dato of ['mario@example.com', 'v-123', '3331234567']) {
    assert.ok(!parametri.includes(dato), `${dato} spedito a Meta dal browser`);
  }
});

test('alla revoca gli eventi smettono senza ricaricare', () => {
  const { win, registro, finto } = avvia();
  win.lumeConsent.update(false, true, false);
  win.fbq = finto;

  win.lumeTrack('generate_lead', { centro: 'Lume Macerata' });
  assert.equal(registro.fbq.length, 1);

  win.lumeConsent.update(false, false, false);
  win.lumeTrack('generate_lead', { centro: 'Lume Macerata' });
  assert.equal(registro.fbq.length, 1, 'evento mandato a Meta dopo la revoca del consenso');
});

test('senza ID configurato il codice resta inerte', () => {
  const { win, registro } = avvia({ metaPixelId: '' });
  win.lumeConsent.update(false, true, false);
  win.lumeTrack('generate_lead', { centro: 'Lume Macerata' });
  assert.equal(registro.script.length, 0, 'pixel caricato senza dataset ID');
});
