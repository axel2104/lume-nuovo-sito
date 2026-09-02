/**
 * Il video del centro sopra la foto del titolo.
 *
 * Il markup arriva **senza `src`**: è questo file a deciderlo. Un video da
 * tre megabyte e mezzo in autoplay è una scelta che va fatta guardando chi c'è
 * davanti, non scritta nell'HTML una volta per tutti.
 *
 * Tre casi in cui non si carica affatto:
 *  - `prefers-reduced-motion: reduce` — c'è chi il movimento lo evita per
 *    disturbi vestibolari, e un video che parte da solo gli rovina la pagina;
 *  - `saveData` — il risparmio dati è una richiesta esplicita dell'utente, e
 *    tre megabyte e mezzo la contraddicono;
 *  - connessione `2g` o `slow-2g`, dove il video arriverebbe a pagina finita.
 *
 * In tutti e tre resta la foto, che è già in pagina e già ottimizzata: non si
 * perde niente di essenziale, si perde il movimento.
 *
 * Negli altri casi il video parte quando il riquadro entra nella finestra —
 * che in cima a una pagina è quasi subito, ma non è la stessa cosa: chi
 * arriva da un link con l'ancora a metà pagina non scarica niente.
 */

/** Il pulsante c'è solo se il video parte davvero: comandare un video che non
 *  esiste è peggio che non avere il comando. */
function mostraComando(video, bottone) {
  if (!bottone) return;
  bottone.hidden = false;

  const aggiorna = () => {
    const inPausa = video.paused;
    bottone.classList.toggle('is-in-pausa', inPausa);
    bottone.setAttribute('aria-label', inPausa ? 'Riproduci il video' : 'Metti in pausa il video');
  };

  bottone.addEventListener('click', () => {
    if (video.paused) void video.play();
    else video.pause();
  });
  video.addEventListener('play', aggiorna);
  video.addEventListener('pause', aggiorna);
  aggiorna();
}

export function initVideoCentro(video) {
  const src = video.dataset.src;
  if (!src) return;

  const hero = video.closest('.page-hero');
  const bottone = hero?.querySelector('[data-centro-toggle]');

  let ridotto = false;
  let risparmio = false;
  try {
    ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rete = navigator.connection;
    risparmio =
      !!rete && (rete.saveData === true || rete.effectiveType === '2g' || rete.effectiveType === 'slow-2g');
  } catch (e) {}

  if (ridotto || risparmio) return;

  /**
   * Il video si mostra solo quando sta davvero suonando, non quando gli
   * abbiamo dato un indirizzo.
   *
   * La differenza non è teorica: un browser senza il codec H.264 — succede su
   * alcune build Linux di Chromium e Firefox — accetta l'`src`, non riproduce
   * niente e lascia un elemento vuoto. Mostrarlo comunque significa coprire
   * la foto con un rettangolo nero, e regalare all'utente un pulsante di
   * pausa che non mette in pausa nulla.
   */
  const carica = () => {
    video.addEventListener(
      'playing',
      () => {
        video.classList.add('pronto');
        mostraComando(video, bottone);
      },
      { once: true },
    );

    video.addEventListener(
      'error',
      () => {
        // Si torna esattamente allo stato di prima: la foto, sola.
        video.classList.remove('pronto');
        video.removeAttribute('src');
        if (bottone) bottone.hidden = true;
      },
      { once: true },
    );

    video.src = src;
    // `play()` può essere rifiutato — una scheda in background, una politica
    // di autoplay più severa del previsto. Non è un errore da mostrare.
    const avvio = video.play();
    if (avvio && typeof avvio.catch === 'function') avvio.catch(() => {});
  };

  if (typeof IntersectionObserver !== 'function') return carica();

  const osservatore = new IntersectionObserver(
    (voci) => {
      if (!voci.some((v) => v.isIntersecting)) return;
      osservatore.disconnect();
      carica();
    },
    { rootMargin: '200px' },
  );
  osservatore.observe(hero || video);
}
