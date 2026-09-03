/**
 * Interattività del planning: filtri, scheda del corso, aggiornamento dal
 * webhook n8n.
 *
 * Tutto è progressive enhancement. La pagina renderizzata dal server è già un
 * planning completo e utilizzabile: se questo file non gira si perdono i filtri
 * e il popup della scheda, e la griglia resta quella che è — leggibile, con i
 * suoi colori, e le tessere che portano alla pagina della disciplina.
 *
 * ─── Il filtro ridisegna, non nasconde ────────────────────────────────────
 * Nascondere le tessere lascerebbe le superstiti strette come quando dividevano
 * la colonna con le altre: filtrando "Sala Reformer" si vedrebbero tre lezioni
 * appiccicate a sinistra e due terzi di colonna vuoti. Quindi il filtro rilancia
 * lo stesso renderer sul sottoinsieme, e le corsie si ricalcolano da sole.
 *
 * ─── Perché il fetch non è la sorgente unica ──────────────────────────────
 * Il webhook dà l'orario aggiornato al minuto, ma se n8n è giù o lento la pagina
 * deve restare utile. Il server rende l'ultimo orario noto, il client prova a
 * migliorarlo: un errore di rete non produce una pagina vuota, produce la pagina
 * di ieri.
 */

import { colonneAttive, renderPlanning } from './planningVista';
import { firma } from '../config/planning';

/** Quanto teniamo valida la risposta del webhook in sessione. */
const TTL = 10 * 60 * 1000;

function cfg() {
  return (typeof window !== 'undefined' && window.LUME_CFG) || {};
}

function daCache(centro) {
  try {
    const o = JSON.parse(sessionStorage.getItem('lume_planning_' + centro) || 'null');
    return o && Date.now() - o.t < TTL ? o.d : null;
  } catch (e) {
    return null;
  }
}

function inCache(centro, dati) {
  try {
    sessionStorage.setItem('lume_planning_' + centro, JSON.stringify({ t: Date.now(), d: dati }));
  } catch (e) {}
}

// ─── Factory ──────────────────────────────────────────────────────────────

export function initPlanning(root) {
  const centro = root.dataset.centro;
  const vista = root.querySelector('[data-planning-vista]');
  const nodoDati = root.querySelector('[data-planning-dati]');
  if (!centro || !vista || !nodoDati) return null;

  let dati;
  try {
    dati = JSON.parse(nodoDati.textContent || '{}');
  } catch (e) {
    return null;
  }
  if (!Array.isArray(dati.lezioni)) return null;

  /** Filtri correnti e giorno mostrato su mobile. */
  const stato = { corso: '', sala: '' };

  const qa = (sel) => Array.from(root.querySelectorAll(sel));

  // ─── Disegno ────────────────────────────────────────────────────────────

  function lezioniFiltrate() {
    return dati.lezioni.filter(
      (l) =>
        (!stato.corso || l.corso === stato.corso) &&
        (!stato.sala || (l.sala || '') === stato.sala),
    );
  }

  /**
   * Ridisegna la vista.
   *
   * `soloSelezione`: le tendine dei filtri sono generate dal renderer sui dati
   * *filtrati*, quindi dopo un ridisegno perderebbero le opzioni escluse — e
   * l'utente non potrebbe più cambiare scelta. Le opzioni vanno quindi sempre
   * costruite sull'insieme completo, e qui riallineiamo solo il valore scelto.
   */
  function disegna() {
    const filtrate = lezioniFiltrate();

    vista.innerHTML = renderPlanning({
      lezioni: filtrate.length ? filtrate : dati.lezioni,
      aggiornatoIl: dati.aggiornatoIl,
      prenotaUrl: root.dataset.prenota || null,
      esempio: root.dataset.esempio === '1',
      // Le tendine elencano tutti i corsi e tutte le sale, non solo quelli
      // sopravvissuti al filtro corrente.
      opzioniDa: dati.lezioni,
      vuotoPerFiltri: filtrate.length === 0,
      // La mappa dei colori arriva dal payload del server: senza, la griglia
      // ridisegnata dopo un filtro perderebbe le tinte e sembrerebbe un'altra
      // pagina.
      categorie: dati.categorie,
    });

    root.style.setProperty('--pl-colonne', String(colonneAttive(filtrate.length ? filtrate : dati.lezioni)));

    qa('[data-filtro]').forEach((s) => {
      s.value = stato[s.dataset.filtro] || '';
    });
    qa('[data-reset]').forEach((b) => {
      b.hidden = !(stato.corso || stato.sala);
    });

  }

  // ─── Scheda del corso ───────────────────────────────────────────────────

  /**
   * Apre la scheda del corso dentro la pagina invece di portare via.
   *
   * Le schede sono già in pagina, renderizzate dal server: qui si nasconde
   * quella aperta prima e si mostra quella richiesta. Niente da costruire,
   * niente da scaricare, nessun momento in cui il popup è vuoto.
   *
   * Se la scheda non c'è — un corso senza disciplina collegata, o un orario
   * fresco dal webhook che cita una disciplina nuova — non si intercetta
   * niente e il link fa il suo mestiere. È il motivo per cui la tessera resta
   * un `<a>` con un href vero e non un bottone.
   */
  const scheda = root.querySelector('[data-pl-scheda]');

  function apriScheda(slug) {
    if (!scheda || typeof scheda.showModal !== 'function') return false;
    const carta = scheda.querySelector('[data-scheda="' + CSS.escape(slug) + '"]');
    if (!carta) return false;

    qa('[data-scheda]').forEach((c) => {
      c.hidden = c !== carta;
    });
    if (!scheda.open) scheda.showModal();
    scheda.scrollTop = 0;
    return true;
  }

  function chiudiScheda() {
    if (scheda && scheda.open) scheda.close();
  }

  if (scheda) {
    // Il click sul backdrop ha come bersaglio il dialog stesso.
    scheda.addEventListener('click', (ev) => {
      const t = ev.target;
      if (t === scheda) return chiudiScheda();
      if (t && t.closest && t.closest('[data-pl-chiudi]')) return chiudiScheda();
      // I CTA dentro la scheda aprono il modal del form: due dialog aperti uno
      // sopra l'altro confondono, e tornare indietro dal form riporterebbe a
      // una scheda che ormai non serve più.
      if (t && t.closest && t.closest('[data-open-form]')) chiudiScheda();
    });
  }

  // ─── Aggiornamento dal webhook ──────────────────────────────────────────

  async function aggiorna() {
    const url = cfg().webhookPlanning;
    if (!url) return;

    let fresco = daCache(centro);
    if (!fresco) {
      try {
        const sep = url.includes('?') ? '&' : '?';
        const res = await fetch(url + sep + 'centro=' + encodeURIComponent(centro), {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        fresco = await res.json();
        if (!fresco || !Array.isArray(fresco.lezioni)) throw new Error('formato inatteso');
        inCache(centro, fresco);
      } catch (e) {
        // Silenzio deliberato: l'utente ha già un planning davanti, dirgli che
        // un aggiornamento in background è fallito non lo aiuta in nulla.
        return;
      }
    }

    // Orario identico a quello a schermo: niente da ridisegnare. È il caso
    // normale — un planning cambia poche volte l'anno — e ridisegnare
    // produrrebbe uno sfarfallio a ogni visita.
    if (firma(fresco.lezioni) === root.dataset.firma) return;

    dati = { lezioni: fresco.lezioni, aggiornatoIl: fresco.aggiornatoIl || null };
    root.dataset.firma = firma(dati.lezioni);
    // Un corso o una sala che non esistono più nell'orario nuovo lascerebbero
    // un filtro attivo su zero risultati, senza che l'utente capisca perché.
    if (stato.corso && !dati.lezioni.some((l) => l.corso === stato.corso)) stato.corso = '';
    if (stato.sala && !dati.lezioni.some((l) => (l.sala || '') === stato.sala)) stato.sala = '';
    disegna();
  }

  // ─── Listener (delegati: la vista viene sostituita) ──────────────────────

  root.addEventListener('change', (ev) => {
    const s = ev.target;
    if (!s || !s.dataset || !s.dataset.filtro) return;
    stato[s.dataset.filtro] = s.value;
    disegna();
  });

  root.addEventListener('click', (ev) => {
    const t = ev.target;
    if (!t || !t.closest) return;

    if (t.closest('[data-reset]')) {
      ev.preventDefault();
      stato.corso = '';
      stato.sala = '';
      return disegna();
    }

    // Prima dei bottoni: una tessera è un link, e va intercettata solo se la
    // scheda esiste davvero.
    const tessera = t.closest('[data-lezione][data-disciplina]');
    if (tessera && tessera.dataset.disciplina && !ev.metaKey && !ev.ctrlKey && ev.button !== 1) {
      if (apriScheda(tessera.dataset.disciplina)) {
        ev.preventDefault();
        return;
      }
    }
  });

  void aggiorna();

  return { aggiorna, disegna };
}
