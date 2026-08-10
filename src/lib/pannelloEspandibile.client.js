/**
 * Pannello espandibile in linea — componente generico.
 *
 * Una griglia di celle cliccabili. Al clic, invece di cambiare pagina, si apre
 * un pannello a tutta larghezza subito sotto la cella, con il contenuto preso
 * dalla pagina di destinazione.
 *
 * È scritto senza sapere nulla di discipline: serve alla griglia dei corsi
 * oggi e al planning orario domani. Chi lo usa fornisce solo come trovare le
 * celle, quale URL aprire e quale pezzo di quella pagina mostrare.
 *
 * Miglioramento progressivo: le celle restano <a href> veri. Senza JavaScript,
 * o se il fetch fallisce, il clic porta alla pagina come sempre. Le pagine
 * singole continuano quindi a esistere per Google e per i link condivisi.
 */

const CACHE = new Map();

export function initPannelli(griglia, opzioni) {
  if (!griglia) return null;

  const {
    selettoreCella = 'a[href]',
    /** Dove pescare, nella pagina scaricata, il contenuto da mostrare. */
    selettoreContenuto = '[data-pannello]',
    /** Aggiorna la barra degli indirizzi mentre il pannello è aperto. */
    sincronizzaUrl = true,
    etichettaChiudi = 'Chiudi',
    /** Chiamata dopo aver iniettato il contenuto: serve a far ripartire
        quello che vive solo nel markup, come i video. */
    onAperto = null,
  } = opzioni || {};

  let pannello = null;
  let cellaAperta = null;
  let urlIniziale = typeof location !== 'undefined' ? location.href : '';

  function creaPannello() {
    const el = document.createElement('div');
    el.className = 'pannello';
    el.setAttribute('role', 'region');
    el.tabIndex = -1;
    el.innerHTML =
      `<button type="button" class="pannello-chiudi" aria-label="${etichettaChiudi}">×</button>` +
      '<div class="pannello-in"></div>';
    el.querySelector('.pannello-chiudi').addEventListener('click', () => chiudi());
    return el;
  }

  async function scarica(url) {
    if (CACHE.has(url)) return CACHE.get(url);
    const res = await fetch(url, { headers: { 'X-Requested-With': 'pannello' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const frammento = doc.querySelector(selettoreContenuto);
    if (!frammento) throw new Error('contenuto non trovato nella pagina');
    const dati = { html: frammento.innerHTML, titolo: doc.title };
    CACHE.set(url, dati);
    return dati;
  }

  async function apri(cella) {
    const url = cella.getAttribute('href');
    if (!url) return false;

    // Secondo clic sulla stessa cella: si richiude.
    if (cellaAperta === cella) {
      chiudi();
      return true;
    }

    if (!pannello) pannello = creaPannello();
    const dentro = pannello.querySelector('.pannello-in');

    // Il pannello vive nella griglia, subito dopo la cella, e occupa tutta
    // la riga: così il contenuto appare dove l'occhio sta già guardando.
    cella.after(pannello);
    pannello.classList.add('is-caricando');
    dentro.innerHTML = '<div class="pannello-attesa" aria-hidden="true"></div>';

    if (cellaAperta) cellaAperta.classList.remove('is-aperta');
    cellaAperta = cella;
    cella.classList.add('is-aperta');
    cella.setAttribute('aria-expanded', 'true');

    let dati;
    try {
      dati = await scarica(url);
    } catch (e) {
      // Nessun contenuto, nessun pannello: si va alla pagina, come da link.
      chiudi();
      location.href = url;
      return true;
    }

    // Nel frattempo l'utente potrebbe aver chiuso o aperto un'altra cella.
    if (cellaAperta !== cella) return true;

    dentro.innerHTML = dati.html;
    pannello.classList.remove('is-caricando');
    if (typeof onAperto === 'function') {
      try {
        onAperto(pannello, cella);
      } catch (e) {}
    }
    pannello.setAttribute('aria-label', cella.dataset.titolo || 'Dettaglio');

    if (sincronizzaUrl) {
      try {
        history.pushState({ pannello: url }, '', url);
        document.title = dati.titolo || document.title;
      } catch (e) {}
    }

    // Porta in vista la cella, non il pannello: resta chiaro cosa si è aperto.
    const y = cella.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: y, behavior: prefereRidotto() ? 'auto' : 'smooth' });
    pannello.focus({ preventScroll: true });
    return true;
  }

  function chiudi(ripristinaUrl = true) {
    if (cellaAperta) {
      cellaAperta.classList.remove('is-aperta');
      cellaAperta.setAttribute('aria-expanded', 'false');
      cellaAperta = null;
    }
    if (pannello && pannello.parentNode) pannello.remove();
    if (ripristinaUrl && sincronizzaUrl && location.href !== urlIniziale) {
      try {
        history.pushState({}, '', urlIniziale);
      } catch (e) {}
    }
  }

  function prefereRidotto() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      return false;
    }
  }

  griglia.addEventListener('click', (ev) => {
    // Ctrl/cmd-clic, rotellina, tasto destro: comportamento normale del link.
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button !== 0) return;
    const cella = ev.target.closest ? ev.target.closest(selettoreCella) : null;
    if (!cella || !griglia.contains(cella)) return;
    ev.preventDefault();
    apri(cella);
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && cellaAperta) chiudi();
  });

  // Indietro del browser: chiude senza ricaricare.
  window.addEventListener('popstate', () => {
    urlIniziale = location.href;
    chiudi(false);
  });

  return { apri, chiudi };
}
