/**
 * Controlli sul sito costruito: link morti, risposte 4xx, scorrimento
 * orizzontale, bersagli troppo piccoli, gate dei consensi.
 *
 * Gira su `dist/`, quindi va lanciato dopo `npm run build`.
 *
 * **Cosa non può dire.** `dist/` servito in locale non è Netlify: le immagini
 * passano dalla Image CDN (`/.netlify/images?url=…`), che qui non esiste, e le
 * foto rispondono 404. Per questo il conteggio delle risposte 4xx le esclude
 * esplicitamente: se un giorno quel filtro dovesse nascondere un 404 vero, il
 * posto in cui guardare è qui.
 */
import { servi, apriBrowser, contatore } from './ambiente.mjs';

const { esito, chiudi } = contatore();
const browser = await apriBrowser();
if (!browser) process.exit(0);

const { origine, chiudi: spegni } = await servi();

/** Le pagine che un visitatore può raggiungere. Aggiungerne una qui è gratis. */
const PAGINE = [
  '/',
  '/centri/macerata/',
  '/centri/montecassiano/',
  '/centri/piediripa/',
  '/centri/urban/',
  '/discipline/',
  '/planning/macerata/',
  '/planning/montecassiano/',
  '/abbonamenti/',
  '/scuola-nuoto/',
  '/lume-life/',
  '/contatti/',
  '/prova/',
  '/invita/',
  '/iscriviti/',
  '/privacy/',
  '/cookie-policy/',
];

/** Larghezze: telefono piccolo, telefono grande, tablet, desktop. */
const LARGHEZZE = [360, 414, 768, 1280];

/** Un 404 sulle immagini ottimizzate è atteso fuori da Netlify. */
const attesa = (url) => url.includes('/.netlify/images') || /\/_astro\/.*\.(jpg|jpeg|png|webp|avif)$/.test(url);

const erroriJs = [];
const risposteKo = new Map();

// ─── Un giro su ogni pagina: risposte, errori, link morti ─────────────────
const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
p.on('pageerror', (e) => erroriJs.push(e.message));
p.on('response', (r) => {
  if (r.status() < 400 || attesa(r.url())) return;
  risposteKo.set(r.url(), r.status());
});

const interni = new Set();

for (const via of PAGINE) {
  const r = await p.goto(origine + via, { waitUntil: 'domcontentloaded' });
  esito(r.status() === 200, `${via} risponde 200`, String(r.status()));

  const trovati = await p.evaluate(() => {
    const morti = [];
    const interni = [];
    for (const a of document.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href');
      const visibile = a.getClientRects().length > 0;
      // Le ancore a "#" dentro i modal sono segnaposto riempiti da JavaScript
      // e stanno in contenitori nascosti: non sono link morti perché non sono
      // raggiungibili. Conta solo ciò che si può cliccare.
      if (href === '#' && visibile && !a.className.includes('iubenda')) {
        morti.push((a.textContent || '').trim().slice(0, 40) || '(senza testo)');
      }
      if (href.startsWith('/') && !href.startsWith('//')) interni.push(href.split('#')[0]);
    }
    return { morti, interni };
  });

  esito(trovati.morti.length === 0, `${via} nessun link morto visibile`, trovati.morti.join(' | '));
  trovati.interni.forEach((h) => interni.add(h));
}

esito(risposteKo.size === 0, 'nessuna risorsa manca',
  [...risposteKo].map(([u, s]) => `${s} ${u.replace(origine, '')}`).slice(0, 5).join(' | '));

// ─── Ogni link interno del sito porta da qualche parte ────────────────────
const rotti = [];
for (const via of interni) {
  const r = await p.request.get(origine + via).catch(() => null);
  if (!r || r.status() >= 400) rotti.push(`${r ? r.status() : 'ERR'} ${via}`);
}
esito(rotti.length === 0, `i ${interni.size} link interni portano a una pagina`, rotti.slice(0, 6).join(' | '));

// ─── Il gate dei consensi parte chiuso ────────────────────────────────────
await p.goto(origine + '/', { waitUntil: 'domcontentloaded' });
const consenso = await p.evaluate(() => {
  const primo = (window.dataLayer || []).find((v) => v && v[0] === 'consent' && v[1] === 'default');
  return primo ? primo[2] : null;
});
esito(
  consenso && consenso.analytics_storage === 'denied' && consenso.ad_storage === 'denied',
  'Consent Mode parte negato',
  consenso ? '' : 'nessun consent default trovato',
);
esito(
  await p.evaluate(() => !!document.querySelector('a[href="/privacy"]')),
  'l\'informativa privacy è linkata',
);

// ─── Niente scorrimento orizzontale, a nessuna larghezza ──────────────────
for (const larghezza of LARGHEZZE) {
  const q = await browser.newPage({ viewport: { width: larghezza, height: 900 } });
  const sborda = [];
  for (const via of PAGINE) {
    await q.goto(origine + via, { waitUntil: 'domcontentloaded' });
    const over = await q.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (over > 0) sborda.push(`${via} +${over}px`);
  }
  esito(sborda.length === 0, `a ${larghezza}px nessuna pagina scorre in orizzontale`, sborda.join(' | '));
  await q.close();
}

// ─── I bersagli tattili arrivano a 44px ───────────────────────────────────
// Il minimo per il pollice: sotto, si sbaglia e si riprova, e chi ha meno
// precisione nel movimento semplicemente non ci arriva.
//
// Esclusi i link *in linea* dentro un testo — un "leggi tutto" in mezzo a un
// paragrafo, il nome di una pagina citato in una frase. La WCAG 2.2 li esenta
// (2.5.8, eccezione "inline") perché la loro altezza la decide l'interlinea
// del testo intorno, e gonfiarli spezzerebbe il paragrafo. Se li segnalassimo
// il controllo darebbe quattro allarmi ogni volta, e un controllo che grida
// sempre è un controllo che non viene più letto.
const q = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
for (const via of ['/', '/scuola-nuoto/', '/abbonamenti/', '/centri/macerata/', '/prova/']) {
  await q.goto(origine + via, { waitUntil: 'domcontentloaded' });
  const piccoli = await q.evaluate(() =>
    [...document.querySelectorAll('a, button')]
      .filter((el) => el.getClientRects().length > 0)
      .filter((el) => getComputedStyle(el).display !== 'inline')
      .map((el) => ({ h: el.getBoundingClientRect().height, t: (el.textContent || '').trim().slice(0, 30) }))
      .filter((x) => x.h > 0 && x.h < 44)
      .map((x) => `${x.t || '(senza testo)'} ${Math.round(x.h)}px`));
  esito(piccoli.length === 0, `${via} bersagli tattili almeno 44px`, piccoli.slice(0, 4).join(' | '));
}
await q.close();

// ─── Il planning: settimana intera, colorata, e il PDF ────────────────────
// Tre cose che la richiesta del cliente nomina esplicitamente, quindi tre
// cose che vanno sorvegliate: la settimana visibile senza cambiare giorno, i
// colori attaccati alle tessere, e il PDF scaricabile.
for (const [slug, giorniAttesi] of [['macerata', 6], ['montecassiano', 6]]) {
  const g = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await g.goto(`${origine}/planning/${slug}/`, { waitUntil: 'domcontentloaded' });

  const pl = await g.evaluate(() => {
    const tess = [...document.querySelectorAll('.pl-lez')];
    const colore = (el) => getComputedStyle(el).borderLeftColor;
    return {
      giorni: document.querySelectorAll('.pl-giorno-testa').length,
      tessere: tess.length,
      // Il grigio di ripiego: una tessera così è una lezione senza disciplina
      // collegata, quindi senza categoria e senza colore.
      grigie: tess.filter((el) => colore(el) === 'rgb(74, 74, 74)').length,
      tinte: new Set(tess.map(colore)).size,
      // I pulsanti dei giorni non devono esistere più: erano loro a impedire
      // di vedere la settimana.
      pulsantiGiorno: document.querySelectorAll('[data-giorno-btn]').length,
      legenda: document.querySelectorAll('.pl-legenda li').length,
      pdf: document.querySelector('.pl-pdf')?.getAttribute('href') ?? '',
    };
  });

  esito(pl.giorni === giorniAttesi, `${slug}: la griglia mostra ${giorniAttesi} giorni`, String(pl.giorni));
  esito(pl.pulsantiGiorno === 0, `${slug}: nessun selettore di giorno`, String(pl.pulsantiGiorno));
  esito(pl.grigie === 0, `${slug}: ogni lezione ha una categoria`, `${pl.grigie} senza`);
  esito(pl.tinte >= 4, `${slug}: le tessere sono colorate`, `${pl.tinte} tinte su ${pl.tessere} lezioni`);
  esito(pl.legenda > 0 && pl.legenda === pl.tinte, `${slug}: la legenda copre le tinte usate`,
    `legenda ${pl.legenda}, tinte ${pl.tinte}`);

  // Il PDF esiste, è un PDF, e non è un file vuoto.
  const r = await g.request.get(origine + pl.pdf).catch(() => null);
  const tipo = r?.headers()['content-type'] ?? '';
  const peso = Number(r?.headers()['content-length'] ?? 0) || (await r?.body())?.length || 0;
  esito(r?.status() === 200 && tipo.includes('pdf') && peso > 2000,
    `${slug}: il PDF si scarica`, `${r?.status()} ${tipo} ${peso}B`);

  await g.close();
}

// ─── L'invito si vede solo a chi ha l'invito ──────────────────────────────
//
// `test/referral.test.mjs` controlla che la fascia parta nascosta nell'HTML;
// qui si controlla l'altra metà, che quella statica non può vedere: che con
// `?ref=` si accenda davvero, e senza resti spenta. Le due cose insieme sono
// il guardrail del prezzo ridotto — se si accendesse per tutti, la pagina
// offrirebbe lo sconto dell'invito a chiunque, senza che nulla si rompa.
{
  const v = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const fasciaVisibile = async (via) => {
    await v.goto(origine + via, { waitUntil: 'load' });
    return v.evaluate(() => {
      const el = document.querySelector('[data-prova-ref]');
      return el ? !el.hidden : null;
    });
  };
  esito((await fasciaVisibile('/prova/')) === false, "/prova: senza invito la fascia resta spenta");
  esito((await fasciaVisibile('/prova/?ref=VERIFICA')) === true, "/prova?ref: l'invito si vede");
  await v.close();
}

esito(erroriJs.length === 0, 'nessun errore JavaScript', erroriJs.slice(0, 3).join(' | '));

await p.close();
await browser.close();
await spegni();
chiudi('pagine');
