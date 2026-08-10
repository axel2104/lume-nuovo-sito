/**
 * Anteprima video nelle tessere.
 *
 * Il punto delicato non è far partire un video: è NON farne partire trentatré.
 * Con una griglia di questa dimensione l'autoplay diffuso significa decine di
 * megabyte scaricati senza che nessuno li abbia chiesti, ventole che partono e
 * batteria che si svuota — sul telefono, con la connessione dati, è inaccettabile.
 *
 * Quindi: la foto è sempre il fermo immagine, il video si carica solo quando
 * il puntatore entra davvero in una tessera, e ne suona uno alla volta.
 * Su touch non parte mai da solo: lì il video si vede aprendo la scheda.
 */

const UN_SOLO_VIDEO = { corrente: null };

function ambienteAdatto() {
  try {
    // Niente anteprime dove il passaggio del mouse non esiste (touch) o dove
    // l'utente ha chiesto meno animazioni.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    // Rispetta il risparmio dati e le connessioni lente dichiarate dal browser.
    const rete = navigator.connection;
    if (rete) {
      if (rete.saveData) return false;
      if (/(^|-)2g$/.test(rete.effectiveType || '')) return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

export function initAnteprimeVideo(griglia, opzioni) {
  if (!griglia || !ambienteAdatto()) return null;
  const { selettoreCella = '.tessera', attributo = 'video' } = opzioni || {};

  function ferma() {
    const v = UN_SOLO_VIDEO.corrente;
    if (!v) return;
    UN_SOLO_VIDEO.corrente = null;
    v.pause();
    v.closest(selettoreCella)?.classList.remove('con-video');
    // Rimosso e non solo messo in pausa: un <video> in memoria continua a
    // occupare risorse di decodifica anche da fermo.
    v.removeAttribute('src');
    v.load();
    v.remove();
  }

  function avvia(cella) {
    const url = cella.dataset[attributo];
    if (!url || UN_SOLO_VIDEO.corrente?.dataset.per === url) return;
    ferma();

    const v = document.createElement('video');
    v.className = 't-video';
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.dataset.per = url;
    v.setAttribute('aria-hidden', 'true');
    v.tabIndex = -1;
    v.src = url;

    // La classe arriva solo a riproduzione avviata: così non si vede il
    // rettangolo nero del video prima che abbia qualcosa da mostrare.
    v.addEventListener('playing', () => cella.classList.add('con-video'), { once: true });
    v.addEventListener('error', () => {
      // Video mancante o rotto: resta la foto, senza rumore in console.
      if (UN_SOLO_VIDEO.corrente === v) ferma();
    });

    cella.prepend(v);
    UN_SOLO_VIDEO.corrente = v;
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => ferma());
  }

  // `pointerover` / `pointerout` invece di enter / leave: questi ultimi
  // scattano anche passando da un figlio all'altro della stessa cella, e il
  // video si spegneva un istante dopo essere partito. Con over / out basta
  // controllare se il puntatore è finito ancora dentro la stessa cella.
  griglia.addEventListener('pointerover', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    const cella = ev.target.closest ? ev.target.closest(selettoreCella) : null;
    if (!cella || !cella.dataset[attributo]) return;
    if (cella.contains(ev.relatedTarget)) return; // spostamento interno
    avvia(cella);
  });

  griglia.addEventListener('pointerout', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    const cella = ev.target.closest ? ev.target.closest(selettoreCella) : null;
    if (!cella) return;
    if (cella.contains(ev.relatedTarget)) return; // siamo ancora dentro
    ferma();
  });

  // Anche con la tastiera: chi naviga con Tab vede l'anteprima come chi usa il mouse.
  griglia.addEventListener('focusin', (ev) => {
    const cella = ev.target.closest ? ev.target.closest(selettoreCella) : null;
    if (cella && cella.dataset[attributo]) avvia(cella);
  });
  griglia.addEventListener('focusout', (ev) => {
    const cella = ev.target.closest ? ev.target.closest(selettoreCella) : null;
    if (cella) ferma();
  });

  // Cambiando scheda del browser non ha senso continuare a decodificare.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) ferma();
  });

  return { ferma };
}

/**
 * Avvia i video di intestazione dentro `radice`.
 *
 * Non usiamo l'attributo `autoplay`: partirebbe anche a chi ha chiesto meno
 * animazioni o sta navigando in risparmio dati. Il markup porta solo il
 * poster, e il video si accende qui se le condizioni lo consentono.
 * Va richiamata anche sul contenuto iniettato nel pannello, che non passa
 * dal caricamento della pagina.
 */
export function avviaVideoHero(radice) {
  if (!radice || !ambienteAdatto()) return;
  radice.querySelectorAll('video[data-hero-video]').forEach((v) => {
    if (!v.dataset.sorgente || v.src) return;
    // L'attributo `muted` nel markup non basta: senza forzare anche la
    // proprietà, la politica di autoplay del browser può rifiutare il play.
    v.muted = true;
    v.src = v.dataset.sorgente;
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  });
}
