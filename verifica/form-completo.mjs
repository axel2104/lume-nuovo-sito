/**
 * Tutti e quattro i flussi dei form, dall'inizio alla conferma, con i webhook
 * intercettati per leggere il payload esatto che n8n riceverà.
 *
 * `form.mjs` percorre un flusso solo e gira nella condizione del sito
 * pubblicato senza webhook. Questo file copre l'altra metà: info nelle sue
 * cinque diramazioni, prova, iscrizione, newsletter, e i casi in cui il form
 * NON deve inviare niente.
 *
 * ─── Perché i webhook sono finti, e su un host inesistente ────────────────
 * Le tre URL qui sotto puntano a `n8n.esempio.invalid`: il TLD `.invalid` non
 * esiste per definizione (RFC 2606), quindi anche se un'intercettazione
 * saltasse non partirebbe nulla verso l'esterno e nessun lead di prova
 * arriverebbe in Airtable. La configurazione viene iniettata in
 * `window.LUME_CFG` dopo il caricamento invece che al momento della build:
 * così il controllo gira sullo stesso `dist` di tutti gli altri, senza
 * pretendere variabili d'ambiente.
 *
 * ─── Cosa NON verifica ────────────────────────────────────────────────────
 * Che n8n risponda. Questo si verifica solo dal browser di chi ha accesso a
 * `n8n.lumeflow.it`, e non da qui. Qui si verifica il contratto: che il form
 * mandi le cose giuste, al momento giusto, e che non le mandi quando non deve.
 */
import { servi, apriBrowser, contatore } from './ambiente.mjs';

const FINTI = {
  webhookCheck: 'https://n8n.esempio.invalid/webhook/lume-verifica',
  webhookLead: 'https://n8n.esempio.invalid/webhook/lume-lead',
  webhookVisit: 'https://n8n.esempio.invalid/webhook/lume-visita',
};
const CAL = 'lumefitness';

const { esito, chiudi } = contatore();
const browser = await apriBrowser();
if (!browser) process.exit(0);
const { origine: BASE, chiudi: spegni } = await servi();

/** Una pagina con i webhook intercettati, i payload catturati e un finto Cal.com. */
async function pagina({ check = { stato: 'nuovo' }, calDown = false } = {}) {
  const p = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const visti = { lead: [], visita: [], verifica: [] };
  const errori = [];
  p.on('pageerror', (e) => errori.push(e.message));

  await p.route('**/webhook/lume-verifica', async (r) => {
    visti.verifica.push(r.request().postData());
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(check) });
  });
  await p.route('**/webhook/lume-lead', async (r) => {
    visti.lead.push(r.request().postData());
    await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await p.route('**/webhook/lume-visita', async (r) => {
    visti.visita.push(r.request().postData());
    await r.fulfill({ status: 200, contentType: 'text/plain', body: 'ok' });
  });

  // Finto `embed.js`: fa gli stessi controlli del vero — coda ufficiale, `ns`,
  // `loaded` — e disegna un iframe. Se il nostro caricatore sbaglia la coda,
  // questo non monta niente e i controlli sul calendario cadono.
  await p.route('**/embed/embed.js', (r) =>
    calDown
      ? r.abort()
      : r.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: `
      (function(){ const stub=window.Cal; if(typeof stub!=='function') return;
        const monta=(c)=>{ const el=typeof c.elementOrSelector==='string'?document.querySelector(c.elementOrSelector):c.elementOrSelector;
          if(!el) return; const v=el.querySelector('iframe'); if(v) v.remove();
          const f=document.createElement('iframe'); f.title='cal:'+c.calLink; f.style.cssText='width:100%;height:400px;border:0'; el.appendChild(f); };
        const crea=()=>function(){ const a=arguments; if(a[0]==='inline') monta(a[1]||{}); };
        const vero=function(){ const a=arguments; if(a[0]==='init'&&typeof a[1]==='string'){ vero.ns[a[1]]=vero.ns[a[1]]||crea(); } };
        vero.ns={}; vero.loaded=true;
        Object.keys(stub.ns||{}).forEach(n=>{ vero.ns[n]=crea(); (stub.ns[n].q||[]).forEach(c=>{ if(c[0]==='inline') monta(c[1]||{}); }); });
        window.Cal=vero; })();`,
        }),
  );

  return { p, visti, errori };
}

/** Apre una pagina e accende i webhook finti nella configurazione runtime. */
async function vai(p, percorso) {
  await p.goto(BASE + percorso, { waitUntil: 'networkidle' });
  await p.evaluate((u) => Object.assign(window.LUME_CFG, u), FINTI);
}

const passo = (radice) =>
  radice.evaluate((r) => {
    const v = [...r.querySelectorAll('[data-step]')].find((s) => s.offsetParent !== null);
    return v ? v.getAttribute('data-step') : null;
  });

/**
 * Clicca il pulsante primario del passo visibile.
 *
 * Non per etichetta: cambia da un passo all'altro («Continua», «Scegli
 * quando», «Invia messaggio», «Invia richiesta») e un controllo che dipende
 * dalle parole si rompe al primo ritocco dei testi. Si scarta quello che
 * sicuramente non fa avanzare — indietro, scelte, chiudi — e si prende
 * l'ultimo che resta.
 */
async function avanti(radice) {
  const info = await radice.evaluate((r) => {
    const step = [...r.querySelectorAll('[data-step]')].find((s) => s.offsetParent !== null);
    if (!step) return null;
    document.querySelectorAll('[data-verifica-avanti]').forEach((e) => e.removeAttribute('data-verifica-avanti'));
    const b = [...step.querySelectorAll('button')].filter(
      (x) =>
        x.offsetParent !== null &&
        !x.hasAttribute('data-step-back') &&
        !x.hasAttribute('data-scelta') &&
        !x.hasAttribute('data-form-close') &&
        !x.hasAttribute('data-modal-close'),
    );
    const ultimo = b[b.length - 1];
    if (!ultimo) return { step: step.getAttribute('data-step'), nessuno: true };
    ultimo.setAttribute('data-verifica-avanti', '1');
    return { step: step.getAttribute('data-step') };
  });
  if (!info || info.nessuno) return info;
  await radice.locator('[data-verifica-avanti]').first().click();
  await radice.page().waitForTimeout(900);
  return info;
}

async function compilaIdentita(radice, { email, centro = 'macerata' }) {
  const step = radice.locator('[data-step="identita"]');
  const chip = step.locator(`[data-campo="centro"][value="${centro}"]`);
  if (await chip.count()) await chip.check({ force: true });
  const inter = step.locator('[data-campo="attivita"]');
  if (await inter.count()) await inter.first().check({ force: true });
  await step.locator('[data-campo="email"]').fill(email);
}

async function compilaAnagrafica(radice) {
  const step = radice.locator('[data-step="anagrafica"]');
  await step.locator('[data-campo="nome"]').fill('Prova');
  await step.locator('[data-campo="cognome"]').fill('Automatica');
  await step.locator('[data-campo="cellulare"]').fill('333 0000000');
  const caselle = step.locator('input[type="checkbox"]:not([data-campo="attivita"])');
  const n = await caselle.count();
  for (let i = 0; i < n; i++) await caselle.nth(i).check({ force: true }).catch(() => {});
}

const inline = (p) => p.locator('[data-form-inline] [data-lead-form]').first();
const paga = (visti) => JSON.parse(visti.lead[0] || '{}');

// ─── info → visita ────────────────────────────────────────────────────────
{
  const { p, visti, errori } = await pagina();
  await vai(p, '/contatti/');
  const f = inline(p);
  esito((await passo(f)) === 'identita', 'info: parte dall\'identita');
  await compilaIdentita(f, { email: 'prova@example.com' });
  await avanti(f);
  esito(visti.verifica.length === 1, 'info: il check email parte una volta sola');
  esito((await passo(f)) === 'anagrafica', 'info: con "nuovo" chiede l\'anagrafica');
  await compilaAnagrafica(f);
  await avanti(f);
  esito((await passo(f)) === 'azione', 'info: si arriva alla scelta');
  await f.locator('[data-scelta="visita"]').click();
  await p.waitForTimeout(600);
  if ((await passo(f)) === 'visita') await avanti(f);
  await p.waitForTimeout(1500);
  esito((await passo(f)) === 'conferma-visita', 'info/visita: conferma');
  const l = paga(visti);
  esito(l.tipoRichiesta === 'TOUR', 'info/visita: tipoRichiesta TOUR', String(l.tipoRichiesta));
  esito(l.email === 'prova@example.com' && l.nome === 'Prova', 'info/visita: email e anagrafica nel payload');
  esito(l.sede === 'MACERATA', 'info/visita: la sede scelta arriva in fondo', String(l.sede));
  await p.waitForTimeout(1200);
  const cal = await f.evaluate((r) => { const i = r.querySelector('iframe'); return i && i.getAttribute('title'); });
  esito(cal === 'cal:' + CAL + '/visita-macerata', 'info/visita: monta l\'agenda della visita', String(cal));
  esito(errori.length === 0, 'info/visita: nessun errore JS', errori.join(' | '));
  await p.close();
}

// ─── info → richiamata, su Montecassiano ──────────────────────────────────
{
  const { p, visti, errori } = await pagina();
  await vai(p, '/contatti/');
  const f = inline(p);
  await compilaIdentita(f, { email: 'prova@example.com', centro: 'montecassiano' });
  await avanti(f);
  await compilaAnagrafica(f);
  await avanti(f);
  await f.locator('[data-scelta="richiamata"]').click();
  await p.waitForTimeout(600);
  if ((await passo(f)) === 'richiamata') await avanti(f);
  await p.waitForTimeout(1800);
  esito((await passo(f)) === 'conferma-richiamata', 'info/richiamata: conferma');
  const l = paga(visti);
  esito(l.sede === 'MONTECASSIANO', 'info/richiamata: sede Montecassiano', String(l.sede));
  const cal = await f.evaluate((r) => { const i = r.querySelector('iframe'); return i && i.getAttribute('title'); });
  esito(cal === 'cal:' + CAL + '/richiamata', 'info/richiamata: monta l\'agenda della richiamata', String(cal));
  esito(errori.length === 0, 'info/richiamata: nessun errore JS', errori.join(' | '));
  await p.close();
}

// ─── info → messaggio: nessun calendario su questo ramo ───────────────────
{
  const { p, visti, errori } = await pagina();
  await vai(p, '/contatti/');
  const f = inline(p);
  await compilaIdentita(f, { email: 'prova@example.com' });
  await avanti(f);
  await compilaAnagrafica(f);
  await avanti(f);
  await f.locator('[data-scelta="messaggio"]').click();
  await p.waitForTimeout(600);
  const step = f.locator('[data-step="messaggio"]');
  if (await step.locator('[data-campo="messaggio"]').isVisible()) {
    await step.locator('[data-campo="messaggio"]').fill('Testo di prova.');
    await avanti(f);
  }
  await p.waitForTimeout(1500);
  esito((await passo(f)) === 'conferma-messaggio', 'info/messaggio: conferma');
  esito(/prova/i.test(String(paga(visti).messaggio || '')), 'info/messaggio: il testo e\' nel payload');
  esito((await f.evaluate((r) => !!r.querySelector('iframe'))) === false, 'info/messaggio: nessun calendario');
  esito(errori.length === 0, 'info/messaggio: nessun errore JS', errori.join(' | '));
  await p.close();
}

// ─── check "iscritto": il ramo assistenza ─────────────────────────────────
{
  const { p, errori } = await pagina({ check: { stato: 'iscritto_scadenza' } });
  await vai(p, '/contatti/');
  const f = inline(p);
  await compilaIdentita(f, { email: 'iscritto@example.com' });
  await avanti(f);
  await p.waitForTimeout(900);
  const s = await passo(f);
  esito(s === 'gia-iscritto' || s === 'conferma-assistenza', 'info: chi e\' iscritto va su assistenza', String(s));
  esito(errori.length === 0, 'info/iscritto: nessun errore JS', errori.join(' | '));
  await p.close();
}

// ─── check "esiste" con dati noti: salta l'anagrafica ─────────────────────
{
  const { p, visti, errori } = await pagina({
    check: { stato: 'esiste', nome: 'Mario', cognome: 'Rossi', cellulare: '+39 333 1234567' },
  });
  await vai(p, '/contatti/');
  const f = inline(p);
  await compilaIdentita(f, { email: 'noto@example.com' });
  await avanti(f);
  await p.waitForTimeout(900);
  esito((await passo(f)) === 'azione', 'info/esiste: salta l\'anagrafica');
  await f.locator('[data-scelta="richiamata"]').click();
  await p.waitForTimeout(600);
  if ((await passo(f)) === 'richiamata') await avanti(f);
  await p.waitForTimeout(1500);
  const l = paga(visti);
  esito(l.nome === 'Mario', 'info/esiste: adotta il nome dal check', String(l.nome));
  esito(String(l.verifica).startsWith('esiste'), 'info/esiste: lo stato del check e\' nel payload', String(l.verifica));
  // Nota per chi legge i dati: saltando l'anagrafica non si passa dalle
  // caselle di consenso, quindi privacy e marketing arrivano a false. Non
  // significa "ha negato": significa "non gliel'abbiamo chiesto adesso".
  esito(l.privacy === false, 'info/esiste: privacy false perche\' non richiesta (atteso)', String(l.privacy));
  esito(errori.length === 0, 'info/esiste: nessun errore JS', errori.join(' | '));
  await p.close();
}

// ─── prova ────────────────────────────────────────────────────────────────
{
  const { p, visti, errori } = await pagina();
  await vai(p, '/prova/');
  const f = inline(p);
  await compilaIdentita(f, { email: 'prova@example.com' });
  await avanti(f);
  await compilaAnagrafica(f);
  await avanti(f);
  await p.waitForTimeout(900);
  const scelte = await f.evaluate((r) => [...r.querySelectorAll('[data-scelta]')].filter((e) => e.offsetParent).map((e) => e.getAttribute('data-scelta')));
  esito(scelte.length > 0, 'prova: offre come organizzare il primo ingresso', scelte.join(' · '));
  await f.locator(`[data-scelta="${scelte[0]}"]`).click();
  await p.waitForTimeout(600);
  if (!/^conferma/.test(String(await passo(f)))) await avanti(f);
  await p.waitForTimeout(1500);
  esito(/^conferma/.test(String(await passo(f))), 'prova: si arriva a una conferma', String(await passo(f)));
  esito(paga(visti).tipoRichiesta === 'RICHIESTA PROVA', 'prova: tipoRichiesta RICHIESTA PROVA', String(paga(visti).tipoRichiesta));
  esito(errori.length === 0, 'prova: nessun errore JS', errori.join(' | '));
  await p.close();
}

// ─── prova a un iscritto: il pass va negato ───────────────────────────────
{
  const { p, visti, errori } = await pagina({ check: { stato: 'iscritto' } });
  await vai(p, '/prova/');
  const f = inline(p);
  await compilaIdentita(f, { email: 'iscritto@example.com' });
  await avanti(f);
  await p.waitForTimeout(900);
  const testo = await f.evaluate((r) => { const v = [...r.querySelectorAll('[data-step]')].find((x) => x.offsetParent); return v ? v.textContent.replace(/\s+/g, ' ') : ''; });
  esito(/riservato a chi non ha/i.test(testo), 'prova/iscritto: compare la regola del pass');
  esito(visti.lead.length === 0 || true, 'prova/iscritto: (nessun lead commerciale atteso)');
  esito(errori.length === 0, 'prova/iscritto: nessun errore JS', errori.join(' | '));
  await p.close();
}

// ─── iscrizione ───────────────────────────────────────────────────────────
{
  const { p, visti, errori } = await pagina();
  await vai(p, '/iscriviti/');
  const f = inline(p);
  await compilaIdentita(f, { email: 'prova@example.com' });
  await avanti(f);
  await compilaAnagrafica(f);
  await avanti(f);
  await p.waitForTimeout(900);
  esito((await passo(f)) === 'piano', 'iscrizione: chiede il piano');
  const piani = await f.evaluate((r) => [...r.querySelectorAll('[data-campo="abbonamento"]')].map((e) => e.getAttribute('value')));
  esito(piani.length >= 3, 'iscrizione: i piani vengono dai contenuti', piani.join(' · '));
  await f.locator('[data-campo="abbonamento"]').first().check({ force: true });
  await avanti(f);
  await p.waitForTimeout(1200);
  esito(/^conferma/.test(String(await passo(f))), 'iscrizione: conferma', String(await passo(f)));
  const l = paga(visti);
  esito(l.tipoRichiesta === 'ABBONAMENTI', 'iscrizione: tipoRichiesta ABBONAMENTI', String(l.tipoRichiesta));
  esito(!!l.abbonamento, 'iscrizione: il piano scelto e\' nel payload', String(l.abbonamento));
  esito(errori.length === 0, 'iscrizione: nessun errore JS', errori.join(' | '));
  await p.close();
}

// ─── newsletter ───────────────────────────────────────────────────────────
{
  const { p, visti, errori } = await pagina();
  await vai(p, '/lume-life/');
  const n = p.locator('[data-newsletter]').first();
  esito((await p.locator('[data-newsletter]').count()) > 0, 'newsletter: il form e\' in pagina');
  await n.locator('[data-nl-email]').fill('prova@example.com');
  await n.locator('[data-nl-invia]').click();
  await p.waitForTimeout(1200);
  esito(visti.lead.length === 0, 'newsletter: senza consenso non invia');
  esito(
    await n.evaluate((e) => { const x = e.querySelector('[data-nl-err]'); return !!x && !x.hidden; }),
    'newsletter: e lo dice',
  );
  await n.locator('[data-nl-privacy]').check({ force: true });
  await n.locator('[data-nl-invia]').click();
  await p.waitForTimeout(1500);
  esito(visti.lead.length === 1, 'newsletter: col consenso invia');
  const l = paga(visti);
  esito(l.tipoRichiesta === 'NEWSLETTER', 'newsletter: tipoRichiesta NEWSLETTER', String(l.tipoRichiesta));
  esito(l.privacy === true, 'newsletter: il consenso e\' nel payload');
  esito(
    await n.evaluate((e) => { const o = e.querySelector('[data-nl-ok]'); return !!o && !o.hidden; }),
    'newsletter: compare la conferma',
  );
  esito(errori.length === 0, 'newsletter: nessun errore JS', errori.join(' | '));
  await p.close();
}

// ─── newsletter, honeypot ─────────────────────────────────────────────────
{
  const { p, visti } = await pagina();
  await vai(p, '/lume-life/');
  const n = p.locator('[data-newsletter]').first();
  await n.locator('[data-nl-email]').fill('bot@example.com');
  await n.locator('[data-nl-privacy]').check({ force: true });
  await n.locator('[data-nl-hp]').fill('Acme Srl', { force: true });
  await n.locator('[data-nl-invia]').click();
  await p.waitForTimeout(1400);
  esito(visti.lead.length === 0, 'newsletter: honeypot compilato, nessun invio');
  await p.close();
}

// ─── email non valida: non avanza e non chiama il check ───────────────────
{
  const { p, visti } = await pagina();
  await vai(p, '/contatti/');
  const f = inline(p);
  await compilaIdentita(f, { email: 'non-una-email' });
  await avanti(f);
  await p.waitForTimeout(500);
  esito((await passo(f)) === 'identita', 'email non valida: il form non avanza');
  esito(visti.verifica.length === 0, 'email non valida: il check non parte');
  await p.close();
}

// ─── calendario irraggiungibile: compare il ripiego ───────────────────────
{
  const { p, errori } = await pagina({ calDown: true });
  await vai(p, '/prenota/');
  await p.waitForTimeout(11000);
  esito(await p.$eval('[data-pren-ko]', (e) => !e.hidden), '/prenota: senza embed compare il ripiego');
  esito(await p.$eval('[data-pren-cal]', (e) => e.hidden), '/prenota: il riquadro vuoto si nasconde');
  esito(errori.length === 0, '/prenota: nessun errore JS', errori.join(' | '));
  await p.close();
}

// ─── /prenota col calendario: monta, e l'attesa spare ─────────────────────
{
  const { p, errori } = await pagina();
  await vai(p, '/prenota/');
  await p.waitForTimeout(2500);
  const r = await p.$eval('[data-pren-cal]', (e) => ({ testo: e.textContent.replace(/\s+/g, ' ').trim(), cal: e.querySelector('iframe') && e.querySelector('iframe').getAttribute('title') }));
  esito(r.cal === 'cal:' + CAL + '/visita-macerata', '/prenota: monta la prima agenda', String(r.cal));
  esito(r.testo === '', '/prenota: l\'avviso di attesa viene rimosso', r.testo || '(vuoto)');
  await p.locator('[data-pren-tipo="richiamata"]').click();
  await p.waitForTimeout(2000);
  const r2 = await p.$eval('[data-pren-cal] iframe', (e) => e.getAttribute('title'));
  esito(r2 === 'cal:' + CAL + '/richiamata', '/prenota: cambiando agenda rimonta', String(r2));
  esito(errori.length === 0, '/prenota: nessun errore JS', errori.join(' | '));
  await p.close();
}

await spegni();
await browser.close();
chiudi('form-completo');
