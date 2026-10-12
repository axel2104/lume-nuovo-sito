/**
 * Statistiche anonime di ogni pagina: quanto tempo ci si interagisce davvero e cosa si clicca.
 *
 * Nessun cookie, nessun identificativo, niente localStorage: a fine visita parte UN solo messaggio, scritto direttamente nel database, con
 * pagina, tipo di dispositivo, provenienza, secondi di attività, scroll massimo e click raggruppati.
 * Non si sa chi sia la persona, quindi non serve il consenso; chi ha Do Not Track attivo non si conta.
 *
 * «Secondi di attività» = scheda visibile E un gesto (mouse, tocco, tastiera, scroll) negli ultimi 15 secondi:
 * una scheda lasciata aperta non gonfia i numeri.
 *
 * Limite noto: se la scheda va in secondo piano e poi torna, la visita si chiude alla prima uscita.
 */

// Stessi valori pubblici di src/lib/supabaseRpc.ts (progetto lume-perfectgym, chiave publishable).
const SB_URL = 'https://rnhzuecojiewmrskgufe.supabase.co';
const SB_KEY = 'sb_publishable_B8oR_WcbrzufxxeaJKD8Sg_uXj1R6Sh';
const BOT = /bot|crawl|spider|headless|lighthouse|prerender|pagespeed/i;
const ATTIVO_ENTRO_MS = 15_000;

export const deviceDi = (larghezza) => (larghezza <= 820 ? 'mobile' : 'desktop');

/** utm_source se c'è, altrimenti il sito da cui si arriva, altrimenti «diretto». */
export function sorgenteDi(referrer, search, hostProprio) {
  const utm = new URLSearchParams(search).get('utm_source');
  if (utm) return utm.toLowerCase().slice(0, 40);
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    if (host && host !== String(hostProprio).replace(/^www\./, '')) return host.slice(0, 40);
  } catch {
    /* nessun referrer valido */
  }
  return 'diretto';
}

const pulisci = (t) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);

/**
 * «btn: Pass prova» / «link: Abbonamenti → /abbonamenti» / null se il click non è su nulla di cliccabile.
 * Solo l'elemento e il suo testo: niente contenuto di campi, niente dati della persona.
 */
export function etichettaClick(el) {
  const bersaglio = el?.closest?.('a, button, summary, [data-track], [role="button"]');
  if (!bersaglio || bersaglio.closest('#chat-panel, [data-no-track]')) return null;
  const testo = pulisci(bersaglio.getAttribute('data-track') || bersaglio.getAttribute('aria-label') || bersaglio.textContent);
  if (bersaglio.tagName === 'A') {
    let dove = '';
    try {
      const u = new URL(bersaglio.getAttribute('href') || '', 'https://x.invalid');
      dove = u.hostname === 'x.invalid' ? u.pathname : u.hostname;
    } catch {
      /* href non valido */
    }
    return `link: ${testo || '(senza testo)'}${dove ? ` → ${dove}` : ''}`.slice(0, 80);
  }
  return `btn: ${testo || '(senza testo)'}`.slice(0, 80);
}

export function avviaInterazioni() {
  if (navigator.doNotTrack === '1' || navigator.webdriver || BOT.test(navigator.userAgent)) return;

  let attivi = 0;
  let ultimo = Date.now();
  let scroll = 0;
  let inviato = false;
  const clicks = new Map();

  const attivita = () => {
    ultimo = Date.now();
  };
  for (const e of ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel', 'scroll']) {
    window.addEventListener(e, attivita, { passive: true, capture: true });
  }
  setInterval(() => {
    if (!document.hidden && Date.now() - ultimo < ATTIVO_ENTRO_MS) attivi++;
  }, 1000);

  const misuraScroll = () => {
    const alto = document.documentElement.scrollHeight;
    if (alto > 0) scroll = Math.max(scroll, Math.min(100, Math.round(((window.scrollY + window.innerHeight) / alto) * 100)));
  };
  window.addEventListener('scroll', misuraScroll, { passive: true });
  misuraScroll();

  document.addEventListener(
    'click',
    (e) => {
      const voce = etichettaClick(e.target);
      if (voce) clicks.set(voce, (clicks.get(voce) || 0) + 1);
    },
    true,
  );

  const invia = () => {
    if (inviato) return;
    inviato = true;
    const corpo = JSON.stringify({
      pagina: location.pathname.replace(/(.)\/$/, '$1'),
      device: deviceDi(window.innerWidth),
      sorgente: sorgenteDi(document.referrer, location.search, location.hostname),
      secondi: attivi,
      scroll,
      clicks: [...clicks].slice(0, 20).map(([v, n]) => ({ v, n })),
    });
    // Direttamente al database, senza passare da una funzione del sito: ogni visita costerebbe un'esecuzione
    // in più. La chiave è pubblica e può solo chiamare `site_visita`, che scrive una riga anonima.
    // sendBeacon non può impostare intestazioni, quindi la chiave viaggia nell'indirizzo (lo accetta il gateway).
    const url = `${SB_URL}/rest/v1/rpc/site_visita?apikey=${SB_KEY}`;
    const dati = JSON.stringify({ p: JSON.parse(corpo) });
    try {
      if (navigator.sendBeacon(url, new Blob([dati], { type: 'application/json' }))) return;
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: dati, keepalive: true }).catch(() => {});
    } catch {
      /* statistiche: se falliscono, la pagina non deve accorgersene */
    }
  };
  window.addEventListener('pagehide', invia);
  document.addEventListener('visibilitychange', () => document.hidden && invia());
}
