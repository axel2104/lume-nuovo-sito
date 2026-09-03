/**
 * Il video del centro: quando si carica, quando no, e cosa resta se non parte.
 *
 * **Questo controllo non può verificare la riproduzione** su un Chromium
 * senza H.264 — succede sulle build Linux senza codec proprietari, e succede
 * su quella preinstallata negli ambienti di sviluppo. Invece di fingere, il
 * controllo guarda `canPlayType` e cambia contratto: dove il codec c'è
 * verifica il play e la pausa, dove non c'è verifica il ripiego, che è la cosa
 * più importante da non rompere.
 *
 * Il ripiego esiste per un guasto vero incontrato scrivendo questa parte: un
 * browser senza codec accetta l'`src`, non riproduce niente e lascia un
 * elemento vuoto. Mostrarlo comunque significa un rettangolo nero sopra la
 * foto e un pulsante di pausa che non mette in pausa nulla. Per questo il
 * video compare solo all'evento `playing` e su `error` si torna alla foto.
 */
import { servi, apriBrowser, contatore } from './ambiente.mjs';

const { esito, chiudi } = contatore();
const browser = await apriBrowser();
if (!browser) process.exit(0);

const { origine, chiudi: spegni } = await servi();
const erroriJs = [];

// ─── 1. Comportamento normale ─────────────────────────────────────────────
const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
p.on('pageerror', (e) => erroriJs.push(e.message));
const scaricati = [];
p.on('request', (r) => {
  if (r.url().endsWith('.mp4')) scaricati.push(r.url().split('/').pop());
});

await p.goto(origine + '/centri/macerata/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500);

const h264 = await p.evaluate(() =>
  document.createElement('video').canPlayType('video/mp4; codecs="avc1.640028"'));
console.log(`   (supporto H.264 in questo browser: ${h264 ? JSON.stringify(h264) : 'assente'})`);

const stato = await p.evaluate(() => {
  const v = document.querySelector('[data-centro-video]');
  const b = document.querySelector('[data-centro-toggle]');
  return {
    presente: !!v,
    attrSrc: v?.hasAttribute('src') ?? false,
    pronto: v?.classList.contains('pronto') ?? false,
    muto: v?.muted ?? false,
    loop: v?.loop ?? false,
    opacita: v ? getComputedStyle(v).opacity : '',
    pulsante: !!b && !b.hidden,
    foto: !!document.querySelector('.page-hero img'),
  };
});

esito(stato.presente, 'macerata: il video è in pagina');
esito(stato.muto && stato.loop, 'il video è muto e in loop');
esito(scaricati.length === 1, 'si scarica un solo mp4', scaricati.join(', '));
esito(stato.foto, 'la foto resta sotto come fermo immagine');

if (h264) {
  esito(stato.pronto, 'con il codec, il video si mostra');
  esito(stato.pulsante, 'con il codec, compare il comando di pausa');
  await p.click('[data-centro-toggle]');
  await p.waitForTimeout(300);
  const dopo = await p.evaluate(() => {
    const v = document.querySelector('[data-centro-video]');
    const b = document.querySelector('[data-centro-toggle]');
    return { inPausa: v.paused, etichetta: b.getAttribute('aria-label') };
  });
  esito(dopo.inPausa, 'il pulsante mette davvero in pausa');
  esito(/riproduci/i.test(dopo.etichetta), 'l\'etichetta segue lo stato', dopo.etichetta);
} else {
  // Senza codec il contratto è: nessun rettangolo nero, nessun comando morto.
  esito(!stato.pronto, 'senza codec, il video non si mostra');
  esito(stato.opacita === '0', 'senza codec, non copre la foto', `opacity ${stato.opacita}`);
  esito(!stato.pulsante, 'senza codec, nessun pulsante di pausa');
  esito(!stato.attrSrc, 'senza codec, l\'src viene rimosso dal gestore di errore');
}
await p.close();

// ─── 2. Chi ha chiesto meno movimento non scarica niente ──────────────────
const r = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await r.emulateMedia({ reducedMotion: 'reduce' });
const scaricati2 = [];
r.on('request', (q) => {
  if (q.url().endsWith('.mp4')) scaricati2.push(q.url());
});
await r.goto(origine + '/centri/macerata/', { waitUntil: 'domcontentloaded' });
await r.waitForTimeout(1500);
esito(scaricati2.length === 0, 'reduced-motion: nessun mp4 scaricato', `${scaricati2.length} file`);
esito(
  await r.evaluate(() => {
    const b = document.querySelector('[data-centro-toggle]');
    return !b || b.hidden;
  }),
  'reduced-motion: nessun comando di pausa',
);
await r.close();

// ─── 3. I centri non ancora aperti non hanno video ────────────────────────
for (const slug of ['piediripa', 'urban']) {
  const u = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const scaricati3 = [];
  u.on('request', (q) => {
    if (q.url().endsWith('.mp4')) scaricati3.push(q.url());
  });
  await u.goto(`${origine}/centri/${slug}/`, { waitUntil: 'domcontentloaded' });
  await u.waitForTimeout(700);
  const vuoto = await u.evaluate(() => ({
    video: !!document.querySelector('[data-centro-video]'),
    pulsante: !!document.querySelector('[data-centro-toggle]'),
  }));
  esito(
    !vuoto.video && !vuoto.pulsante && scaricati3.length === 0,
    `${slug}: nessun video, nessun comando, nessun download`,
  );
  await u.close();
}

esito(erroriJs.length === 0, 'nessun errore JavaScript', erroriJs.slice(0, 2).join(' | '));

await browser.close();
await spegni();
chiudi('video');
