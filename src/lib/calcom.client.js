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
 * Lo script viene caricato solo dove il calendario è il servizio richiesto:
 * nella schermata di conferma di chi ha appena chiesto un appuntamento, e
 * sulla pagina /prenota, che esiste per prenotare. È strettamente necessario
 * a fornire quel servizio, non tracciamento.
 * Attenzione: l'autoblocking di Iubenda blocca gli script di terze parti che
 * riconosce. Il tag viene marcato `_iub_cs_skip` per non farsi bloccare —
 * senza questo, in produzione il calendario resta vuoto e senza errori evidenti.
 */

function origine() {
  const cfg = (typeof window !== 'undefined' && window.LUME_CFG) || {};
  return cfg.calcomOrigin || 'https://cal.com';
}

/**
 * Origine da cui si carica l'embed, e da cui l'iframe carica il booker.
 *
 * Sul cloud il booker vive su `app.cal.com`: `cal.com/<handle>/<slug>` è la
 * pagina pubblica e reindirizza, ma l'embed vuole l'origine applicativa.
 * Su un'istanza self-hosted il dominio è uno solo e questa funzione non fa
 * niente. I link di ripiego continuano a usare `origine()`, che è l'indirizzo
 * da mostrare a una persona.
 */
function origineEmbed() {
  const o = origine().replace(/\/$/, '');
  return /^https:\/\/(www\.)?cal\.com$/.test(o) ? 'https://app.cal.com' : o;
}

/**
 * Crea la coda ufficiale di Cal.com e restituisce `window.Cal`.
 *
 * **Qui c'era il guasto, e valeva la pena capirlo:** la coda scritta prima
 * accodava soltanto in `Cal.q`, senza `Cal.ns`, senza la gestione di `init` e
 * senza marcare `Cal.loaded`. `embed.js` si aspetta la coda ufficiale: caricato
 * sopra una coda finta muore con «Cal is not defined. This shouldn't happen»,
 * `Cal.ns` resta `undefined` e il chiamante non riceve alcun errore — il
 * contenitore resta su «Carico il calendario…» per sempre, senza che nessuno
 * sappia perché. Quello che segue è lo snippet documentato da Cal.com, con la
 * sola aggiunta della classe `_iub_cs_skip` sul tag (vedi la nota sul consenso
 * in testa al file).
 */
function coda() {
  if (typeof window.Cal === 'function') return window.Cal;

  const d = document;
  const src = origineEmbed() + '/embed/embed.js';
  const accoda = (a, ar) => a.q.push(ar);

  window.Cal = function () {
    const cal = window.Cal;
    const ar = arguments;

    if (!cal.loaded) {
      cal.ns = {};
      cal.q = cal.q || [];
      const s = d.createElement('script');
      s.src = src;
      s.async = true;
      s.className = '_iub_cs_skip';
      s.setAttribute('data-lume-calcom', '');
      d.head.appendChild(s);
      cal.loaded = true;
    }

    if (ar[0] === 'init') {
      const api = function () {
        accoda(api, arguments);
      };
      const nome = ar[1];
      api.q = api.q || [];
      if (typeof nome === 'string') {
        cal.ns[nome] = cal.ns[nome] || api;
        accoda(cal.ns[nome], ar);
        accoda(cal, ['initNamespace', nome]);
      } else {
        accoda(cal, ar);
      }
      return;
    }

    accoda(cal, ar);
  };

  return window.Cal;
}

/**
 * Aspetta che l'iframe compaia nel contenitore.
 *
 * L'embed non ha un modo di dire «non ce l'ho fatto»: se il dominio è
 * bloccato, se l'event type non esiste o se lo script non arriva, non chiama
 * nessuna callback. L'unico segnale osservabile è l'iframe che non compare, e
 * senza questo controllo il ripiego non scatta mai.
 */
function attendiIframe(elemento, entro) {
  return new Promise((risolvi) => {
    if (elemento.querySelector('iframe')) return risolvi(true);

    let osservatore = null;
    const scaduto = setTimeout(() => {
      if (osservatore) osservatore.disconnect();
      risolvi(!!elemento.querySelector('iframe'));
    }, entro);

    osservatore = new MutationObserver(() => {
      if (elemento.querySelector('iframe')) {
        clearTimeout(scaduto);
        if (osservatore) osservatore.disconnect();
        risolvi(true);
      }
    });
    osservatore.observe(elemento, { childList: true, subtree: true });
  });
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

  const Cal = coda();

  const namespace = 'lume-' + calLink.replace(/[^a-z0-9]+/gi, '-');

  Cal('init', namespace, { origin: origineEmbed() });

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

  // Nove secondi: piu' di quanto serve a una rete lenta, meno di quanto serve
  // a far pensare che la pagina sia rotta.
  if (!(await attendiIframe(elemento, 9000))) {
    smontaPrenotazione(elemento);
    return false;
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
