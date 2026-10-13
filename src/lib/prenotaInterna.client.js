/**
 * Calendario di prenotazione interno (al posto dell'embed Cal.com).
 *
 * Gli orari li decide il CRM: /api/slot li legge dal database, /api/prenota prenota con
 * un lock per centro, quindi due persone non possono prendere lo stesso orario.
 * Stessa firma di `montaPrenotazione` di calcom.client.js, così i chiamanti scelgono solo quale usare.
 *
 * Si attiva con PUBLIC_PRENOTA_INTERNA=1 oppure, per provarlo in produzione, con `?interna=1` nell'indirizzo.
 */
import '../styles/prenotaInterna.css';

const TIPO = { visita: 'in_sede', richiamata: 'chiamata' };
const FUSO = 'Europe/Rome';

export function prenotazioneInternaAttiva() {
  try {
    const cfg = (typeof window !== 'undefined' && window.LUME_CFG) || {};
    return cfg.prenotaInterna === '1' || new URLSearchParams(location.search).get('interna') === '1';
  } catch {
    return false;
  }
}

const el = (tag, cls, testo) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (testo != null) e.textContent = testo;
  return e;
};
const giornoDi = (iso) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: FUSO }); // YYYY-MM-DD in ora di Roma
const etichettaGiorno = (iso) => new Date(iso).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: FUSO });
const oraDi = (iso) => new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: FUSO });
const quando = (iso) => new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: FUSO }) + ' alle ' + oraDi(iso);

async function leggiSlot(tipo, sede) {
  const r = await fetch(`/api/slot?tipo=${encodeURIComponent(tipo)}&sede=${encodeURIComponent(sede)}`);
  if (!r.ok) throw new Error('slot ' + r.status);
  return (await r.json()).slot || [];
}

/**
 * @param {HTMLElement} elemento contenitore
 * @param {object} o { agenda: 'visita'|'richiamata', sede: 'MACERATA'|'MONTECASSIANO', prefill, meta, onPrenotato }
 * @returns {Promise<boolean>} false se la sede non ha orari (il chiamante passa al ripiego)
 */
export async function montaPrenotazioneInterna(elemento, o) {
  const { agenda, sede, prefill = {}, meta = {}, onPrenotato } = o || {};
  const tipo = TIPO[agenda];
  if (!elemento || !tipo || !sede) return false;
  if (elemento.getAttribute('data-cal-montato') === '1') return true;

  let slot;
  try {
    slot = await leggiSlot(tipo, sede);
  } catch {
    return false;
  }
  if (!slot.length) return false;

  elemento.setAttribute('data-cal-montato', '1');
  elemento.innerHTML = '';
  const radice = el('div', 'pi');
  elemento.append(radice);

  const disegna = (elenco, avviso) => {
    radice.replaceChildren();
    if (avviso) radice.append(el('p', 'pi-avviso', avviso));
    const giorni = [...new Set(elenco.map(giornoDi))];
    let scelto = giorni[0];
    const barra = el('div', 'pi-giorni');
    const orari = el('div', 'pi-orari');
    const mostra = () => {
      barra.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.g === scelto)));
      orari.replaceChildren(
        ...elenco.filter((s) => giornoDi(s) === scelto).map((s) => {
          const b = el('button', 'pi-ora', oraDi(s));
          b.type = 'button';
          b.onclick = () => conferma(s, elenco);
          return b;
        }),
      );
    };
    giorni.forEach((g) => {
      const b = el('button', 'pi-giorno', etichettaGiorno(elenco.find((s) => giornoDi(s) === g)));
      b.type = 'button';
      b.dataset.g = g;
      b.onclick = () => { scelto = g; mostra(); };
      barra.append(b);
    });
    radice.append(barra, orari);
    mostra();
  };

  // Scelto l'orario: chi ha già compilato il form conferma con un click, chi arriva da /prenota lascia i dati.
  const conferma = (inizio, elenco) => {
    radice.replaceChildren();
    radice.append(el('p', 'pi-scelta', quando(inizio)));
    const form = el('form', 'pi-form');
    const campo = (nome, etichetta, tipoInput, valore, richiesto) => {
      const l = el('label', 'pi-campo');
      l.append(el('span', null, etichetta));
      const i = el('input');
      i.name = nome; i.type = tipoInput; i.value = valore || ''; i.required = !!richiesto;
      i.autocomplete = { nome: 'given-name', cognome: 'family-name', email: 'email', cellulare: 'tel' }[nome] || 'off';
      l.append(i);
      return l;
    };
    const dati = !(prefill.email && prefill.nome);
    if (dati) form.append(campo('nome', 'Nome', 'text', prefill.nome, true), campo('cognome', 'Cognome', 'text', prefill.cognome), campo('email', 'Email', 'email', prefill.email, true), campo('cellulare', 'Telefono', 'tel', prefill.telefono, true));
    let privacy = null;
    if (dati) {
      const l = el('label', 'pi-privacy');
      privacy = el('input'); privacy.type = 'checkbox'; privacy.required = true;
      l.append(privacy, el('span', null, ' Ho letto l’informativa privacy e acconsento al trattamento dei dati per ricevere questo appuntamento.'));
      form.append(l);
    }
    const errore = el('p', 'pi-errore'); errore.hidden = true;
    const invia = el('button', 'pi-invia', 'Conferma appuntamento'); invia.type = 'submit';
    const indietro = el('button', 'pi-indietro', '← Cambia orario'); indietro.type = 'button';
    indietro.onclick = () => disegna(elenco);
    form.append(errore, invia, indietro);

    form.onsubmit = async (ev) => {
      ev.preventDefault();
      invia.disabled = true; errore.hidden = true;
      const f = Object.fromEntries(new FormData(form));
      const corpo = {
        tipo, sede, inizio,
        email: f.email || prefill.email, nome: f.nome || prefill.nome, cognome: f.cognome || prefill.cognome,
        cellulare: f.cellulare || prefill.telefono, messaggio: prefill.note || '',
        flusso: meta.flusso || 'prenota', utm: undefined,
      };
      try {
        const r = await fetch('/api/prenota', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
        const d = await r.json().catch(() => ({}));
        if (d.ok) {
          radice.replaceChildren(el('p', 'pi-ok', 'Appuntamento confermato'), el('p', 'pi-scelta', quando(d.inizio)), el('p', 'pi-nota', tipo === 'chiamata' ? 'Ti chiameremo a quest’ora.' : 'Ti aspettiamo in sede.'));
          if (typeof onPrenotato === 'function') { try { onPrenotato({ uid: d.token }); } catch (e) {} }
          return;
        }
        if (d.errore === 'slot_occupato') {
          // Normale: qualcuno ha preso l'orario mentre si compilava. Si ricaricano gli orari, non si "riprova".
          const nuovi = await leggiSlot(tipo, sede).catch(() => []);
          if (nuovi.length) return disegna(nuovi, 'Questo orario è stato appena preso da qualcun altro: scegline un altro.');
          return radice.replaceChildren(el('p', 'pi-avviso', 'Non ci sono più orari liberi: chiama la sede e fissiamo insieme.'));
        }
        errore.textContent = d.errore === 'troppe_prenotazioni' ? 'Hai già tre appuntamenti in programma: chiama la sede per modificarli.' : 'Controlla i dati inseriti e riprova.';
      } catch {
        errore.textContent = 'Connessione assente: riprova tra poco.';
      }
      errore.hidden = false; invia.disabled = false;
    };
    radice.append(form);
  };

  disegna(slot);
  return true;
}

export function smontaPrenotazioneInterna(elemento) {
  if (!elemento) return;
  elemento.removeAttribute('data-cal-montato');
  elemento.innerHTML = '';
}
