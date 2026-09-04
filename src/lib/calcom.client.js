/**
 * Integrazione Cal.com — embed inline per visite in sede e richiamate.
 *
 * Sostituisce il calendario scritto a mano. Non è una scelta di comodità: il
 * calendario custom aveva le fasce orarie hardcoded, quindi non conosceva
 * chiusure, festivi e ferie, e soprattutto non impediva il doppio booking —
 * dieci persone potevano prenotare lo stesso slot senza che nessuno lo sapesse.
 * Cal.com legge la disponibilità reale dai calendari della reception.
 *
 * ─── Ordine delle operazioni ──────────────────────────────────────────────
 * Il lead viene inviato a n8n PRIMA che l'embed venga montato, e l'embed vive
 * nella schermata di conferma. Se facessimo il contrario, chi apre il calendario
 * e non conferma lo slot sarebbe un contatto perso — ed è la maggioranza.
 * La prenotazione arricchisce un lead che esiste già; non lo crea.
 *
 * ─── Consenso ─────────────────────────────────────────────────────────────
 * Lo script viene caricato SOLO dopo un'azione esplicita dell'utente (ha appena
 * inviato il form chiedendo un appuntamento), quindi è strettamente necessario
 * a fornire il servizio richiesto, non tracciamento.
 * Attenzione: l'autoblocking di Iubenda blocca gli script di terze parti che
 * riconosce. Il tag viene marcato `_iub_cs_skip` per non farsi bloccare —
 * senza questo, in produzione il calendario resta vuoto e senza errori evidenti.
 */

/** Una sola istanza dello script per pagina, anche con più form montati. */
let caricamento = null;

function origine() {
  const cfg = (typeof window !== 'undefined' && window.LUME_CFG) || {};
  return cfg.calcomOrigin || 'https://cal.com';
}

/**
 * Carica `embed.js` e restituisce la funzione globale `Cal`.
 *
 * Lo snippet ufficiale di Cal.com crea una coda sincrona (`Cal.q`) che accumula
 * le chiamate finché lo script non è pronto: per questo possiamo invocare `Cal`
 * subito, senza aspettare il `load`.
 */
function api() {
  if (caricamento) return caricamento;

  caricamento = new Promise((risolvi, rifiuta) => {
    const origin = origine();
    const src = origin.replace(/\/$/, '') + '/embed/embed.js';

    if (window.Cal && window.Cal.loaded) return risolvi(window.Cal);

    // Coda ufficiale Cal.com: ogni chiamata prima del load finisce in Cal.q
    if (!window.Cal) {
      window.Cal = function () {
        const c = window.Cal;
        c.q = c.q || [];
        c.q.push(arguments);
      };
    }

    const esistente = document.querySelector('script[data-lume-calcom]');
    if (esistente) {
      esistente.addEventListener('load', () => risolvi(window.Cal));
      esistente.addEventListener('error', rifiuta);
      return;
    }

    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.setAttribute('data-lume-calcom', '');
    // Vedi nota sul consenso in testa al file: senza questa classe l'autoblocking
    // di Iubenda impedisce il caricamento e il calendario non compare mai.
    s.className = '_iub_cs_skip';
    s.onload = () => risolvi(window.Cal);
    s.onerror = () => rifiuta(new Error('Cal.com embed non raggiungibile'));
    document.head.appendChild(s);
  });

  return caricamento;
}

/**
 * Monta un calendario inline dentro `elemento`.
 *
 * @param {HTMLElement} elemento   contenitore vuoto, già visibile
 * @param {object} opzioni
 * @param {string} opzioni.calLink  es. "lume-macerata/visita" (senza dominio)
 * @param {object} [opzioni.prefill]  { nome, email, telefono, note }
 * @param {object} [opzioni.meta]     coppie chiave/valore passate come metadata a Cal.com
 * @param {function} [opzioni.onPrenotato]  chiamata a prenotazione confermata
 * @returns {Promise<boolean>} false se l'embed non è disponibile
 */
export async function montaPrenotazione(elemento, opzioni) {
  const { calLink, prefill = {}, meta = {}, onPrenotato } = opzioni || {};
  if (!elemento || !calLink) return false;

  // Un contenitore già montato non va rimontato: Cal.com disegnerebbe due
  // calendari sovrapposti.
  if (elemento.getAttribute('data-cal-montato') === '1') return true;

  let Cal;
  try {
    Cal = await api();
  } catch (e) {
    return false;
  }

  const namespace = 'lume-' + calLink.replace(/[^a-z0-9]+/gi, '-');

  Cal('init', namespace, { origin: origine() });

  // I metadata viaggiano come `metadata[chiave]`: è il formato che Cal.com
  // inoltra al webhook BOOKING_CREATED, dove n8n li ritrova per ricucire la
  // prenotazione al lead già in Airtable.
  const config = {
    name: [prefill.nome, prefill.cognome].filter(Boolean).join(' '),
    email: prefill.email || '',
    notes: prefill.note || '',
    theme: 'dark',
  };
  if (prefill.telefono) config['attendeePhoneNumber'] = prefill.telefono;
  Object.entries(meta).forEach(([k, v]) => {
    if (v != null && v !== '') config['metadata[' + k + ']'] = String(v);
  });

  Cal.ns[namespace]('inline', {
    elementOrSelector: elemento,
    calLink,
    config,
  });

  Cal.ns[namespace]('ui', {
    hideEventTypeDetails: false,
    layout: 'month_view',
    cssVarsPerTheme: {
      dark: { 'cal-brand': '#C40042' },
    },
  });

  if (typeof onPrenotato === 'function') {
    Cal.ns[namespace]('on', {
      action: 'bookingSuccessful',
      callback: (ev) => {
        try {
          onPrenotato(ev?.detail?.data || {});
        } catch (e) {}
      },
    });
  }

  elemento.setAttribute('data-cal-montato', '1');
  return true;
}

/** Permette di rimontare l'embed dopo un reset del form. */
export function smontaPrenotazione(elemento) {
  if (!elemento) return;
  elemento.removeAttribute('data-cal-montato');
  elemento.innerHTML = '';
}
