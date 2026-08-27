/* eslint-disable */
/**
 * Tracciamento globale Lume — UTM, visitor id, ponte Consent Mode v2 ↔ Iubenda.
 *
 * Caricato inline in <head> da Layout.astro, PRIMA di GTM, senza dipendenze e
 * in ES5 puro (deve girare anche su browser vecchi senza passare da un bundle).
 *
 * Espone tre globali:
 *   window.lumeGetUtm()  → oggetto attribuzione (mai un mix fra storage e URL)
 *   window.lumeGetVid()  → id visitatore persistente, o null se non ancora generato
 *   window.lumeTrack(nome, dati) → push su dataLayer, sempre sicuro da chiamare
 *
 * Regole invariabili:
 *  - la CATTURA (scrittura su storage) avviene solo dopo consenso analytics;
 *  - la PROPAGAZIONE degli UTM sui link interni gira sempre: riscrive solo href,
 *    non tocca lo storage, quindi è innocua anche senza consenso;
 *  - il vid si genera una volta sola per browser e non cambia mai, qualunque
 *    email l'utente inserisca nei form.
 */
(function () {
  var CFG = window.LUME_CFG || {};

  var KEY_VID = 'lume_vid'; // localStorage — id visitatore persistente
  var KEY_UTM = 'lume_utm'; // sessionStorage — attribuzione, JSON stringato
  var WEBHOOK_VISIT = CFG.webhookVisit || '';
  var attivato = false;

  var KEYS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'fbclid',
    'msclkid',
    // `source` e `medium` senza prefisso utm_: è la convenzione che il vecchio
    // sito usava nei link ai form (`?source=SitoWebMC&medium=BtnProva`) e che i
    // campi Source/Medium della tabella RICHIESTE si aspettano. Vanno catturati
    // qui, altrimenti tutti i link storici ancora in circolazione — campagne,
    // QR in sede, vecchie email — arrivano senza attribuzione.
    'source',
    'medium',
    'centro',
    'email',
    'userId',
    'userNumber',
  ];

  // ─── Coda eventi GTM ────────────────────────────────────────────────────
  // Safe pre-consenso: solo un array in memoria, nessuna scrittura su device.
  // Finché i tag GTM sono bloccati dal Consent Mode, gli eventi restano fermi qui.
  window.dataLayer = window.dataLayer || [];
  window.lumeTrack = function (nome, dati) {
    try {
      var ev = { event: nome };
      if (dati) {
        for (var k in dati) {
          if (dati[k] != null && dati[k] !== '') ev[k] = dati[k];
        }
      }
      window.dataLayer.push(ev);
    } catch (e) {}
  };

  // ─── Attribuzione ───────────────────────────────────────────────────────
  function utmDaUrl() {
    var out = {};
    try {
      var params = new URLSearchParams(location.search);
      KEYS.forEach(function (k) {
        if (params.has(k)) out[k] = params.get(k);
      });
    } catch (e) {}
    return out;
  }

  function utmSalvati() {
    try {
      return JSON.parse(sessionStorage.getItem(KEY_UTM) || '{}');
    } catch (e) {
      return {};
    }
  }

  // O tutto dal primo touch salvato, o tutto dalla query string live: mai un mix.
  window.lumeGetUtm = function () {
    var salvati = utmSalvati();
    return Object.keys(salvati).length ? salvati : utmDaUrl();
  };

  // ─── Propagazione UTM sui link interni ──────────────────────────────────
  function propagaUtm() {
    var utm = window.lumeGetUtm();
    var chiavi = Object.keys(utm);
    if (!chiavi.length) return;

    try {
      var qui = new URL(location.href);
      var mancano = chiavi.some(function (k) {
        return qui.searchParams.get(k) !== utm[k];
      });
      if (mancano) {
        chiavi.forEach(function (k) {
          qui.searchParams.set(k, utm[k]);
        });
        history.replaceState(history.state, '', qui.toString());
      }
    } catch (e) {}

    document.addEventListener(
      'click',
      function (ev) {
        var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
        if (!a) return;
        var href = a.getAttribute('href') || '';
        if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return;
        try {
          var dest = new URL(a.href, location.href);
          if (dest.origin !== location.origin) return;
          var cambia = false;
          chiavi.forEach(function (k) {
            if (dest.searchParams.get(k) !== utm[k]) {
              dest.searchParams.set(k, utm[k]);
              cambia = true;
            }
          });
          if (cambia) a.href = dest.toString();
        } catch (e) {}
      },
      true,
    );
  }

  // ─── Cattura primo touch (dietro consenso) ──────────────────────────────
  function catturaUtm() {
    try {
      if (sessionStorage.getItem(KEY_UTM)) return;
      var found = utmDaUrl();
      if (Object.keys(found).length) sessionStorage.setItem(KEY_UTM, JSON.stringify(found));
    } catch (e) {}
  }

  // ─── Visitor id persistente ─────────────────────────────────────────────
  var vidCorrente = null;
  window.lumeGetVid = function () {
    return vidCorrente;
  };

  function generaVid() {
    var vid;
    try {
      vid = localStorage.getItem(KEY_VID);
    } catch (e) {
      vid = null;
    }
    if (!vid) {
      vid =
        window.crypto && crypto.randomUUID
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
              var r = (Math.random() * 16) | 0,
                v = c === 'x' ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            });
      try {
        localStorage.setItem(KEY_VID, vid);
      } catch (e) {}
    }
    vidCorrente = vid;
  }

  // ─── Ping di pageview (opzionale) ───────────────────────────────────────
  /**
   * Fire-and-forget: un ping per pageview, con il vid che permette di
   * ricucire lato database gli accessi con i lead.
   *
   * Il content-type DEVE essere `text/plain;charset=UTF-8`, mai
   * `application/json`. sendBeacon invia sempre le credenziali: con un
   * content-type non CORS-safelisted il browser fa un preflight che fallisce
   * se il webhook non risponde `Access-Control-Allow-Credentials: true`, e la
   * richiesta vera non parte mai. Nessun errore in console, nessun dato al
   * server. `text/plain` e' safelisted: niente preflight, la richiesta parte
   * sempre come "semplice".
   *
   * Il body resta JSON: e' il webhook che deve fare JSON.parse() sul testo
   * grezzo, perche' non gli arriva con Content-Type application/json.
   */
  var TIPO_BEACON = 'text/plain;charset=UTF-8';

  function inviaBeacon() {
    if (!WEBHOOK_VISIT) return;
    var body = JSON.stringify({
      vid: vidCorrente,
      pagina: location.pathname,
      referrer: document.referrer || null,
      utm: utmSalvati(),
    });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(WEBHOOK_VISIT, new Blob([body], { type: TIPO_BEACON }));
      } else {
        fetch(WEBHOOK_VISIT, {
          method: 'POST',
          headers: { 'Content-Type': TIPO_BEACON },
          body: body,
          keepalive: true,
        }).catch(function () {});
      }
    } catch (e) {}
  }

  function attivaTracciamento() {
    if (attivato) return;
    attivato = true;
    catturaUtm();
    generaVid();
    inviaBeacon();
  }

  // ─── Ponte Consent Mode v2 ──────────────────────────────────────────────
  function aggiornaConsenso(analytics, marketing, personalizzazione) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('consent', 'update', {
      analytics_storage: analytics ? 'granted' : 'denied',
      ad_storage: marketing ? 'granted' : 'denied',
      ad_user_data: marketing ? 'granted' : 'denied',
      ad_personalization: marketing ? 'granted' : 'denied',
      personalization_storage: personalizzazione ? 'granted' : 'denied',
    });
  }

  /**
   * Legge il consenso da Iubenda e lo traduce nei cinque segnali Google.
   *
   * Mappa delle finalità Iubenda (con perPurposeConsent: true):
   *   1 strettamente necessari · 2 interazioni e funzionalità di base
   *   3 miglioramento dell'esperienza · 4 misurazione · 5 targeting e pubblicità
   *
   * Se perPurposeConsent è disattivato l'oggetto non ha `purposes` e il consenso
   * è tutto-o-niente: si ricade su `consent === true`.
   */
  function leggiIubenda(pref) {
    var consenso =
      pref || (window._iub && window._iub.cs && window._iub.cs.consent) || null;
    if (!consenso) return;

    var p = consenso.purposes;
    var analytics, marketing, personalizzazione;

    if (p) {
      analytics = !!p[4];
      marketing = !!p[5];
      personalizzazione = !!p[3] || marketing;
    } else {
      analytics = marketing = personalizzazione = consenso.consent === true;
    }

    aggiornaConsenso(analytics, marketing, personalizzazione);
    if (analytics) attivaTracciamento();
  }

  // Superficie pubblica per i callback Iubenda dichiarati in Layout.astro.
  window.lumeConsent = {
    update: aggiornaConsenso,
    fromIubenda: leggiIubenda,
    attiva: attivaTracciamento,
  };

  // ─── Avvio ──────────────────────────────────────────────────────────────
  propagaUtm();

  if (CFG.consensoGestito) {
    // Se Iubenda ha già caricato una preferenza salvata prima di noi, applicala subito.
    leggiIubenda(null);
  } else if (!CFG.produzione) {
    // Sviluppo senza banner: attiviamo tutto per poter testare il flusso.
    attivaTracciamento();
    aggiornaConsenso(true, true, true);
  } else {
    // Build di produzione senza banner configurato: non si traccia nulla.
    // Meglio perdere dati che raccoglierli senza consenso.
    try {
      console.warn(
        '[lume] Banner cookie non configurato (PUBLIC_IUBENDA_*): tracciamento disattivato.',
      );
    } catch (e) {}
  }
})();
