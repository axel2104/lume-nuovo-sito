/**
 * Percorre un form di contatto dall'inizio alla conferma.
 *
 * Verifica quello che nessun controllo sul markup può verificare: che i tre
 * passi si passino lo stato, che il centro scelto arrivi fino in fondo, e che
 * la schermata finale offra un modo di prenotare — l'embed Cal.com se
 * configurato, l'agenda Calendly della segreteria altrimenti.
 *
 * Gira su `dist/`, dove i webhook non sono configurati: è la condizione in cui
 * gira il sito pubblicato oggi, quindi è quella giusta da controllare.
 *
 * **Una trappola che è costata tempo.** Assegnare `.value` a un campo non
 * genera gli eventi `input` e `change`, e il form ascolta quelli: il modulo
 * avanza comunque ma arriva in conferma con lo stato a metà, e il controllo
 * segnala un guasto che non esiste. Gli eventi si generano a mano, qui sotto.
 */
import { servi, apriBrowser, contatore } from './ambiente.mjs';

const { esito, chiudi } = contatore();
const browser = await apriBrowser();
if (!browser) process.exit(0);

const { origine, chiudi: spegni } = await servi();
const p = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const erroriJs = [];
p.on('pageerror', (e) => erroriJs.push(e.message));

const CENTRO = 'montecassiano';

await p.goto(origine + '/', { waitUntil: 'domcontentloaded' });
await p.evaluate(() => document.querySelector('[data-open-form="info"]').click());
await p.waitForTimeout(400);

// Passo 1 — sede, un interesse, email
const passo1 = await p.evaluate((centro) => {
  const sede = document.querySelector(`input[data-campo="centro"][value="${centro}"]`);
  if (!sede) return { ok: false, perche: 'chip del centro non trovata' };
  sede.click();
  document.querySelector('input[data-campo="attivita"]')?.click();
  return { ok: true, calendly: sede.getAttribute('data-calendly') || '' };
}, CENTRO);
esito(passo1.ok, 'passo 1: la sede è selezionabile', passo1.perche ?? '');
esito(
  passo1.calendly.includes('calendly.com'),
  'passo 1: la chip porta l\'agenda della sua sede',
  passo1.calendly || '(vuoto)',
);

await p.fill('input[data-campo="email"]', 'prova@example.com');
await p.evaluate(() => {
  [...document.querySelectorAll('button')]
    .find((x) => /Continua/.test(x.textContent) && x.offsetParent !== null)
    ?.click();
});
await p.waitForTimeout(700);

// Passo 2 — anagrafica e consenso. Gli eventi vanno generati: vedi la nota in testa.
await p.evaluate(() => {
  document.querySelectorAll('[data-step="anagrafica"] input').forEach((el) => {
    const nome = (el.name || el.id || '').toLowerCase();
    if (el.type === 'checkbox') el.checked = true;
    else if (el.type === 'tel') el.value = '3331234567';
    else if (/cognome/.test(nome)) el.value = 'Rossi';
    else if (el.type === 'text') el.value = 'Mario';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  [...document.querySelectorAll('button')]
    .find((x) => /Continua/.test(x.textContent) && x.offsetParent !== null)
    ?.click();
});
await p.waitForTimeout(700);
esito(
  await p.evaluate(() => !!document.querySelector('[data-step="azione"]')?.offsetParent),
  'passo 2: si arriva alla scelta della modalità',
);

// Passo 3 — "Vieni a trovarci", poi invio
await p.evaluate(() => {
  [...document.querySelectorAll('[data-scelta="visita"]')]
    .find((x) => x.offsetParent !== null)
    ?.click();
});
await p.waitForTimeout(500);
await p.evaluate(() => {
  [...document.querySelectorAll('button')]
    .find((x) => /Scegli quando/.test(x.textContent) && x.offsetParent !== null)
    ?.click();
});
await p.waitForTimeout(1600);

const finale = await p.evaluate(() => {
  const visibile = (el) => el && el.offsetParent !== null && !el.hidden;
  const agenda = [...document.querySelectorAll('[data-cal-alt]')].find(visibile);
  const attesa = [...document.querySelectorAll('[data-cal-ko]')].find(visibile);
  const embed = [...document.querySelectorAll('[data-cal-embed]')].find(visibile);
  const link = agenda?.querySelector('[data-cal-alt-link]');
  // I tre modal sono tutti in pagina: il riepilogo va cercato DENTRO il passo
  // visibile, non nel documento — altrimenti si legge quello vuoto di un
  // altro flusso e il controllo accusa il prodotto di un guasto suo.
  const step = [...document.querySelectorAll('[data-step="conferma-visita"]')].find(visibile);
  return {
    conferma: !!step,
    recap: (step?.querySelector('.lf-recap')?.textContent || '').trim(),
    embed: !!embed,
    agenda: !!agenda,
    attesa: !!attesa,
    href: link?.getAttribute('href') || '',
    altezza: link ? Math.round(link.getBoundingClientRect().height) : 0,
  };
});

esito(finale.conferma, 'si arriva alla schermata di conferma');
esito(
  finale.recap.toLowerCase().includes(CENTRO) && finale.recap.includes('prova@example.com'),
  'il riepilogo riporta la sede scelta e l\'email',
  finale.recap,
);

// Uno dei tre modi di prenotare deve esserci. Nessuno dei tre e' un vicolo
// cieco: il terzo ("ti contattiamo noi") lo e' solo se la sede non ha agenda.
esito(
  finale.embed || finale.agenda || finale.attesa,
  'la conferma offre un modo di prenotare',
);
if (finale.agenda) {
  esito(finale.href.includes('calendly.com'), 'il ripiego porta a un\'agenda vera', finale.href);
  esito(finale.altezza >= 44, 'il link dell\'agenda è un bersaglio da 44px', `${finale.altezza}px`);
  esito(!finale.attesa, 'con l\'agenda non si mostra anche il messaggio di attesa');
}

esito(erroriJs.length === 0, 'nessun errore JavaScript', erroriJs.slice(0, 2).join(' | '));

await p.close();
await browser.close();
await spegni();
chiudi('form');
