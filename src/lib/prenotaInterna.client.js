/**
 * Calendario di prenotazione interno (al posto dell'embed Cal.com).
 *
 * Gli orari li decide il CRM: /api/slot li legge dal database, /api/prenota prenota con
 * un lock per centro, quindi due persone non possono prendere lo stesso orario.
 * Stessa firma di `montaPrenotazione` di calcom.client.js, così i chiamanti scelgono solo quale usare.
 * L'interfaccia è un componente React (src/components/prenota/PrenotaInterna.jsx) caricato solo quando serve.
 *
 * Si attiva con PUBLIC_PRENOTA_INTERNA=1 oppure, per provarlo in produzione, con `?interna=1` nell'indirizzo.
 */
// In sviluppo vite aggiunge il Fast Refresh ai .jsx, ma fuori da un'isola Astro manca il suo preambolo: senza queste due funzioni il componente non parte.
if (import.meta.env?.DEV && typeof window !== 'undefined') {
  window.$RefreshReg$ = window.$RefreshReg$ || (() => {});
  window.$RefreshSig$ = window.$RefreshSig$ || (() => (t) => t);
}

const TIPO = { visita: 'in_sede', richiamata: 'chiamata' };

export function prenotazioneInternaAttiva() {
  try {
    const cfg = (typeof window !== 'undefined' && window.LUME_CFG) || {};
    return cfg.prenotaInterna === '1' || new URLSearchParams(location.search).get('interna') === '1';
  } catch {
    return false;
  }
}

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
  const { agenda, sede, prefill = {}, meta = {}, onPrenotato, token = null, tipoDiretto = null } = o || {};
  const tipo = tipoDiretto || TIPO[agenda];
  if (!elemento || !tipo || !sede) return false;
  if (elemento.getAttribute('data-cal-montato') === '1' && elemento.__rootPrenota) return true;
  // un montaggio precedente (cambio sede o tipo) lascia un root React: va chiuso prima di riusare l'elemento
  try { elemento.__rootPrenota?.unmount(); } catch (e) { /* già smontato */ }
  elemento.__rootPrenota = null;

  let slot;
  try {
    slot = await leggiSlot(tipo, sede);
  } catch {
    return false;
  }
  if (!slot.length) return false;

  const [{ createRoot }, { createElement }, { default: PrenotaInterna }] = await Promise.all([
    import('react-dom/client'),
    import('react'),
    import('../components/prenota/PrenotaInterna.jsx'),
  ]);
  elemento.innerHTML = '';
  elemento.setAttribute('data-cal-montato', '1');
  const root = createRoot(elemento);
  elemento.__rootPrenota = root;
  root.render(createElement(PrenotaInterna, { tipo, sede, slotIniziali: slot, prefill, meta, onPrenotato, ricarica: () => leggiSlot(tipo, sede), token }));
  return true;
}

export function smontaPrenotazioneInterna(elemento) {
  if (!elemento) return;
  try { elemento.__rootPrenota?.unmount(); } catch (e) { /* già smontato */ }
  elemento.__rootPrenota = null;
  elemento.removeAttribute('data-cal-montato');
  elemento.innerHTML = '';
}
