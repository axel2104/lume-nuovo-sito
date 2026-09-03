/**
 * Motore dei form Lume — una implementazione, N flussi.
 *
 * `initForm(root, { flusso, prefix })` non sa cosa sia una "prova" o una
 * "richiesta di iscrizione": legge la definizione da `src/config/forms.ts` e
 * pilota il markup generato da `LeadFormBody.astro`, che dalla stessa
 * definizione ha reso gli step. Aggiungere un form non richiede toccare questo
 * file; un bug corretto qui è corretto in tutti i form.
 *
 * Lo stato è privato nella closure e i selettori sono tutti scoped su `root`,
 * quindi più istanze (modal + inline, o due flussi diversi) convivono nella
 * stessa pagina: gli id sono prefissati.
 *
 * ─── Contratto di rete ────────────────────────────────────────────────────
 * Due webhook, entrambi opzionali (vuoti = il flusso funziona comunque, utile in
 * sviluppo):
 *   PUBLIC_WEBHOOK_CHECK → { stato: "nuovo" | "esiste[_gruppo]" | "iscritto[_gruppo]" }
 *   PUBLIC_WEBHOOK_LEAD  → riceve il payload completo, risposta ignorata
 * Il payload esatto è documentato in `docs/FORM.md`.
 *
 * ─── Appuntamenti ─────────────────────────────────────────────────────────
 * La scelta di giorno e ora NON avviene qui: la fa Cal.com, nell'embed montato
 * sulla schermata di conferma. Il lead parte prima, così chi apre il calendario
 * e non conferma resta comunque un contatto acquisito.
 */

import { FLUSSI, INTERESSI_JUNIOR } from '../config/forms';
import { montaPrenotazione, smontaPrenotazione } from './calcom.client.js';

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RE_TEL = /^[\d\s-]{6,20}$/;

/**
 * Tipi validati anche all'uscita dal campo. Fuori restano chip e consensi: un
 * gruppo di radio non ha un "vuoto sbagliato" da segnalare mentre lo si compila.
 */
const AL_BLUR = { email: true, testo: true, textarea: true, tel: true };
const RE_STATO = /^(iscritto|esiste|nuovo)(?:_(.+))?$/;

/**
 * Sotto questa soglia fra apertura e invio non blocchiamo — segnaliamo.
 * Un bot compila in 200ms, ma esiste anche l'utente che incolla tutto e corre:
 * marcare è recuperabile, bloccare no.
 */
const MS_SOSPETTO = 1500;

// ─── Accesso al contesto globale ──────────────────────────────────────────

function cfg() {
  return (typeof window !== 'undefined' && window.LUME_CFG) || {};
}

function utmCorrenti() {
  try {
    return typeof window.lumeGetUtm === 'function' ? window.lumeGetUtm() : {};
  } catch (e) {
    return {};
  }
}

function vidCorrente() {
  try {
    return typeof window.lumeGetVid === 'function' ? window.lumeGetVid() : null;
  } catch (e) {
    return null;
  }
}

function traccia(nome, dati) {
  try {
    if (typeof window.lumeTrack === 'function') window.lumeTrack(nome, dati);
  } catch (e) {}
}

/** Timestamp con offset locale (+02:00), non UTC: Airtable lo legge come l'ora vera. */
function adessoIso() {
  const d = new Date();
  const off = -d.getTimezoneOffset();
  const seg = off >= 0 ? '+' : '-';
  const p = (n) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  return (
    d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
    'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) +
    seg + p(off / 60) + ':' + p(off % 60)
  );
}

/**
 * POST JSON con un solo tentativo di recupero.
 *
 * Un retry, non tre: se il primo fallisce per rete instabile il secondo salva la
 * conversione; se fallisce perché il webhook è rotto, insistere allunga solo
 * l'attesa davanti a un utente che guarda uno spinner.
 */
async function postJson(url, payload, riprova = true) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const testo = await res.text();
    try {
      return testo ? JSON.parse(testo) : {};
    } catch (e) {
      return { raw: testo };
    }
  } catch (e) {
    if (!riprova) throw e;
    await new Promise((r) => setTimeout(r, 700));
    return postJson(url, payload, false);
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────

export function initForm(root, options) {
  const opts = options || {};
  const def = FLUSSI[opts.flusso];
  if (!root || !def) return null;

  const P = opts.prefix;
  const onReset = typeof opts.onReset === 'function' ? opts.onReset : () => {};

  const q = (sel) => root.querySelector(sel);
  const qa = (sel) => Array.from(root.querySelectorAll(sel));
  const byId = (suffisso) => root.querySelector('#' + P + '-' + suffisso);

  /**
   * Id e name sono scoped per step, non solo per istanza del form.
   *
   * Serve perché lo stesso campo può comparire in più step dello stesso flusso:
   * `messaggio` esiste in "richiamata", "visita", "messaggio" e "gia-iscritto".
   * Con id globali sarebbero quattro elementi con lo stesso id e il motore
   * leggerebbe sempre il primo, cioè quasi sempre quello sbagliato.
   */
  const idCampo = (idStep, nome) => P + '-' + idStep + '-' + nome;

  /** Elemento di un campo dello step corrente. */
  const campoEl = (nome) => root.querySelector('#' + idCampo(stepCorrente, nome));

  /** Selettore per gruppi radio/checkbox dello step corrente. */
  const gruppoSel = (nome) => '[name="' + idCampo(stepCorrente, nome) + '"]';

  /** Step per id: la definizione è un array, ma qui si naviga per id. */
  const steps = def.steps.reduce((acc, s) => {
    acc[s.id] = s;
    return acc;
  }, {});

  let stato = nuovoStato();
  let stepCorrente = def.steps[0].id;

  function nuovoStato() {
    return {
      valori: {},
      /** Risposta del check: nuovo | esiste | iscritto. */
      verifica: 'nuovo',
      /** Sottogruppo opzionale restituito dal check (es. "iscritto_scadenza"). */
      gruppo: '',
      pagina: typeof location !== 'undefined' ? location.pathname : '',
      cta: '',
      ctaMedium: '',
      apertoIl: Date.now(),
      /** Impostato dopo un invio riuscito: serve a prefillare Cal.com. */
      inviato: null,
    };
  }

  // ─── Navigazione ────────────────────────────────────────────────────────

  function vaiA(id) {
    if (!steps[id]) return;
    stepCorrente = id;

    qa('[data-step]').forEach((el) => {
      el.hidden = el.getAttribute('data-step') !== id;
    });

    const passo = steps[id].passo || def.passi;
    qa('[data-step-dot]').forEach((el) => {
      el.classList.toggle('on', Number(el.getAttribute('data-step-dot')) <= passo);
    });

    try {
      root.scrollTop = 0;
    } catch (e) {}
  }

  function errore(messaggio) {
    const el = byId(stepCorrente + '-err');
    if (!el) return;
    el.textContent = messaggio || '';
    el.hidden = !messaggio;
  }

  function caricamento(attivo) {
    const b = byId(stepCorrente + '-avanti');
    if (!b) return;
    b.disabled = attivo;
    b.classList.toggle('is-loading', attivo);
  }

  // ─── Campi ──────────────────────────────────────────────────────────────

  /** Legge un campo dal DOM. Restituisce sempre un valore, mai undefined. */
  function leggi(campo) {
    switch (campo.tipo) {
      case 'email':
        return (campoEl(campo.nome)?.value || '').trim().toLowerCase();

      case 'testo':
      case 'textarea':
        return (campoEl(campo.nome)?.value || '').trim();

      case 'tel': {
        const numero = (campoEl(campo.nome)?.value || '').trim();
        return { prefisso: campoEl('pfx')?.value || '+39', numero };
      }

      case 'chipsRadio': {
        const el = q('input' + gruppoSel(campo.nome) + ':checked');
        if (!el) return null;
        return {
          valore: el.value,
          label: el.getAttribute('data-label') || el.value,
          // I data-* seguenti esistono solo sulle chip dei centri.
          sede: el.getAttribute('data-sede') || '',
          calVisita: el.getAttribute('data-cal-visita') || '',
          calRichiamata: el.getAttribute('data-cal-richiamata') || '',
          /** Agenda Calendly della segreteria: ripiego se Cal.com manca. */
          calendly: el.getAttribute('data-calendly') || '',
          // Portale PerfectGym della sede: il passo successivo per chi arriva
          // con un piano già scelto.
          pg: el.getAttribute('data-pg') || '',
        };
      }

      case 'chipsCheck':
        return qa('input' + gruppoSel(campo.nome) + ':checked').map(
          (el) => el.getAttribute('data-label') || el.value,
        );

      case 'consensi':
        return {
          privacy: !!campoEl('privacy')?.checked,
          marketing: !!campoEl('marketing')?.checked,
        };

      default:
        return stato.valori[campo.nome] ?? null;
    }
  }

  /**
   * Marca un campo come non valido.
   *
   * `aria-invalid` dice che c'è un problema, `aria-describedby` dice quale:
   * senza il secondo il messaggio esiste a schermo ma uno screen reader non lo
   * legge insieme al campo, e chi non vede il rosso non sa cosa correggere.
   */
  function segnala(nome, messaggio) {
    const el = campoEl(nome);
    if (el) {
      el.setAttribute('aria-invalid', 'true');
      el.setAttribute('aria-describedby', P + '-' + stepCorrente + '-err');
    }
    errore(messaggio);
    return el;
  }

  function pulisci(nome) {
    const el = campoEl(nome);
    if (!el) return;
    el.removeAttribute('aria-invalid');
    el.removeAttribute('aria-describedby');
  }

  /** L'elemento da segnalare: nei consensi il campo è la checkbox privacy. */
  const nomeElemento = (campo) => (campo.tipo === 'consensi' ? 'privacy' : campo.nome);

  /** `null` se il campo è valido, altrimenti il messaggio da mostrare. */
  function valida(campo, valore) {
    const generico = 'Controlla questo campo per proseguire.';

    if (campo.tipo === 'email') {
      if (!valore && !campo.obbligatorio) return null;
      return RE_EMAIL.test(valore) ? null : campo.errore || generico;
    }

    if (campo.tipo === 'tel') {
      const cifre = (valore.numero || '').replace(/\D/g, '');
      if (!campo.obbligatorio && !cifre) return null;
      return RE_TEL.test(valore.numero) && cifre.length >= 6 ? null : campo.errore || generico;
    }

    if (campo.tipo === 'consensi') {
      // Il consenso marketing resta facoltativo per definizione: obbligarlo
      // sarebbe un consenso non libero, quindi non valido.
      return valore.privacy ? null : 'Per proseguire devi accettare l’informativa privacy.';
    }

    if (!campo.obbligatorio) return null;

    if (campo.tipo === 'testo' || campo.tipo === 'textarea') {
      return valore.length >= (campo.minLunghezza || 1) ? null : campo.errore || generico;
    }

    if (campo.tipo === 'chipsCheck') return valore.length ? null : campo.errore || generico;

    return valore ? null : campo.errore || generico;
  }

  /** Legge e valida tutti i campi dello step: `false` se qualcosa non torna. */
  function raccogli(step) {
    errore('');
    for (const campo of step.campi || []) {
      const valore = leggi(campo);
      const problema = valida(campo, valore);
      if (problema) {
        segnala(nomeElemento(campo), problema)?.focus();
        return false;
      }
      pulisci(nomeElemento(campo));
      stato.valori[campo.nome] = valore;
    }
    return true;
  }

  // ─── Attribuzione ───────────────────────────────────────────────────────

  /**
   * `Source` e `Medium` della tabella RICHIESTE.
   *
   * Precedenza pensata per non perdere l'attribuzione a pagamento: se l'utente
   * arriva da una campagna, quella vince sul bottone che ha cliccato. Il bottone
   * resta comunque nel payload (`cta`, `ctaMedium`), quindi nulla va perso.
   */
  function attribuzione() {
    const utm = utmCorrenti();
    return {
      source: utm.source || utm.utm_source || 'SitoWeb',
      medium: utm.medium || utm.utm_medium || stato.ctaMedium || def.medium,
    };
  }

  /**
   * Valore del campo `Tipo Richiesta`.
   *
   * Ordine di precedenza, dal più forte:
   *  1. già iscritto → è assistenza, non un lead commerciale
   *  2. interesse per bambini → lo gestisce il desk junior
   *  3. ha scelto di venire in sede → è un tour
   * L'audience conta più del canale: una mamma che chiede della scuola nuoto e
   * prenota una visita va al junior, non al banco tour.
   */
  function tipoRichiesta(step) {
    // Uno step può dichiarare il proprio tipo e vince su tutto: vedi il commento
    // su `Step.tipoRichiesta` in config/forms.ts.
    if (step?.tipoRichiesta) return step.tipoRichiesta;

    const se = def.tipoRichiestaSe || {};
    if (stato.verifica === 'iscritto' && se.iscritto) return se.iscritto;

    const attivita = stato.valori.attivita || [];
    if (se.junior && attivita.some((a) => INTERESSI_JUNIOR.includes(a))) return se.junior;

    if (se.tour && stato.valori.modalita === 'visita') return se.tour;

    return def.tipoRichiesta;
  }

  // ─── Invio ──────────────────────────────────────────────────────────────

  function payload(step) {
    const v = stato.valori;
    const centro = v.centro || {};
    const tel = v.cellulare || {};
    const consensi = v.consensi || {};
    const { source, medium } = attribuzione();
    const conferma = steps[step.conferma] || {};

    return {
      // Cosa è
      flusso: opts.flusso,
      tipoRichiesta: tipoRichiesta(step),
      modalita: v.modalita || '',
      /**
       * Che appuntamento l'utente sta per prenotare su Cal.com, se previsto.
       * Data e ora NON sono qui: arrivano dal webhook BOOKING_CREATED di Cal.com,
       * perché fino a questo momento l'utente non le ha ancora scelte.
       */
      agenda: conferma.prenotazione || null,

      // Chi
      email: v.email || '',
      nome: v.nome || '',
      cognome: v.cognome || '',
      // `filter(Boolean)`: il numero che arriva dal check non ha prefisso
      // separato, e concatenarlo comunque produrrebbe uno spazio iniziale.
      cellulare: [tel.prefisso, tel.numero].filter(Boolean).join(' '),
      prefisso: tel.prefisso || '',

      // Dove e cosa gli interessa
      sede: centro.sede || '',
      centro: centro.valore || '',
      centroLabel: centro.label || '',
      attivita: v.attivita || [],
      abbonamento: (v.abbonamento && v.abbonamento.valore) || '',
      messaggio: v.messaggio || '',

      // Consensi: sempre espliciti, mai dedotti
      privacy: !!consensi.privacy,
      marketing: !!consensi.marketing,

      // Stato secondo il check
      nuovo: stato.verifica === 'nuovo' ? 'NUOVO' : 'ESISTE',
      verifica: stato.verifica,
      gruppo: stato.gruppo,

      // Attribuzione
      source,
      medium,
      cta: stato.cta,
      ctaMedium: stato.ctaMedium,
      pagina: stato.pagina,
      utm: utmCorrenti(),
      vid: vidCorrente(),

      inviatoIl: adessoIso(),
      sospetto: Date.now() - stato.apertoIl < MS_SOSPETTO,
    };
  }

  async function invia(step) {
    if (!raccogli(step)) return;

    // Honeypot: campo invisibile che solo un bot compila. Nessun messaggio di
    // errore — un bot non lo legge, e un utente non può esserci finito dentro.
    if ((byId('hp')?.value || '') !== '') {
      vaiA(step.conferma);
      return;
    }

    const corpo = payload(step);
    caricamento(true);

    const url = cfg().webhookLead;
    try {
      if (url) {
        await postJson(url, corpo);
      } else {
        console.info('[lume] lead (nessun webhook configurato)', corpo);
      }
    } catch (e) {
      caricamento(false);
      errore('Invio non riuscito. Riprova fra qualche istante.');
      return;
    }
    caricamento(false);
    stato.inviato = corpo;

    traccia('generate_lead', {
      lead_flusso: corpo.flusso,
      lead_tipo: corpo.tipoRichiesta,
      lead_sede: corpo.sede,
      lead_pagina: corpo.pagina,
      lead_medium: corpo.medium,
      lead_attivita: corpo.attivita.join(', '),
    });

    riepiloga(step.conferma, corpo);
    mostraPortale(step.conferma, corpo);
    vaiA(step.conferma);
    void apriPrenotazione(step.conferma, corpo);
  }

  /** Riempie la schermata di conferma con quello che l'utente ha appena scelto. */
  function riepiloga(idConferma, corpo) {
    const recap = byId(idConferma + '-recap');
    if (!recap) return;
    recap.textContent = [corpo.centroLabel, corpo.attivita.join(', '), corpo.email]
      .filter(Boolean)
      .join(' · ');
  }

  /**
   * Link al portale PerfectGym sulla schermata di conferma.
   *
   * Compare solo a chi è arrivato con un piano già scelto: ha già detto cosa
   * vuole, e il portale è il passo successivo, non una pagina da ritrovare da
   * solo. Resta nascosto se la sede non ha un URL vero — `perfectgymUrl` vale
   * "#" finché non ce lo danno, e un bottone che non porta da nessuna parte
   * fa più danno di un bottone assente.
   */
  function mostraPortale(idConferma, corpo) {
    const blocco = byId(idConferma + '-pg');
    if (!blocco) return;
    const url = (stato.valori.centro || {}).pg || '';
    const attivo = Boolean(corpo.abbonamento && url && url !== '#');
    if (attivo) {
      const a = blocco.querySelector('a');
      if (a) a.href = url;
    }
    blocco.hidden = !attivo;
  }

  // ─── Prenotazione Cal.com ───────────────────────────────────────────────

  /**
   * Monta l'embed sulla schermata di conferma, se il flusso lo prevede.
   *
   * Se Cal.com non è configurato o non risponde mostriamo il messaggio di
   * ripiego: il lead è già stato registrato, quindi il peggio che può capitare è
   * che sia la reception a chiamare invece dell'utente a prenotare. Non è un
   * errore da mostrare come tale.
   */
  async function apriPrenotazione(idConferma, corpo) {
    const conferma = steps[idConferma];
    if (!conferma?.prenotazione) return;

    const contenitore = byId(idConferma + '-cal');
    const ripiego = byId(idConferma + '-cal-ko');
    const alternativa = byId(idConferma + '-cal-alt');
    if (!contenitore) return;

    const centro = stato.valori.centro || {};
    const calLink = conferma.prenotazione === 'visita' ? centro.calVisita : centro.calRichiamata;

    /**
     * Il contenitore riserva 420px per l'iframe: senza embed è spazio morto.
     *
     * Se la sede ha un'agenda Calendly si mostra quella invece del messaggio
     * di attesa. È lo stesso vicolo cieco di prima, con un'uscita.
     */
    const soloRipiego = () => {
      contenitore.hidden = true;
      const link = alternativa && alternativa.querySelector('[data-cal-alt-link]');
      if (centro.calendly && link) {
        link.href = centro.calendly;
        alternativa.hidden = false;
      } else if (ripiego) {
        ripiego.hidden = false;
      }
    };

    if (!calLink) return soloRipiego();

    const ok = await montaPrenotazione(contenitore, {
      calLink,
      prefill: {
        nome: corpo.nome,
        cognome: corpo.cognome,
        email: corpo.email,
        telefono: corpo.cellulare,
        note: corpo.messaggio,
      },
      // Metadata inoltrati da Cal.com al webhook BOOKING_CREATED: è così che n8n
      // ritrova il lead già scritto su Airtable invece di crearne un doppione.
      meta: {
        vid: corpo.vid,
        sede: corpo.sede,
        flusso: corpo.flusso,
        source: corpo.source,
        medium: corpo.medium,
      },
      onPrenotato: (dati) => {
        traccia('appuntamento_prenotato', {
          lead_flusso: corpo.flusso,
          lead_sede: corpo.sede,
          lead_agenda: conferma.prenotazione,
          booking_uid: dati?.uid || '',
        });
      },
    });

    if (!ok) soloRipiego();
  }

  // ─── Check dell'email ───────────────────────────────────────────────────

  async function verifica(step) {
    if (!raccogli(step)) return;
    caricamento(true);

    let risposta = { stato: 'nuovo' };
    const url = cfg().webhookCheck;
    if (url) {
      try {
        const centro = stato.valori.centro || {};
        risposta = await postJson(url, {
          email: stato.valori.email,
          sede: centro.sede || '',
          centro: centro.valore || '',
          attivita: stato.valori.attivita || [],
          flusso: opts.flusso,
          pagina: stato.pagina,
          cta: stato.cta,
          utm: utmCorrenti(),
          vid: vidCorrente(),
        });
      } catch (e) {
        // Webhook giù: non è colpa dell'utente e non è motivo per fermarlo.
        // Lo trattiamo come nuovo; sarà il consulente a riconoscerlo.
        risposta = { stato: 'nuovo' };
      }
    }

    caricamento(false);

    const match = RE_STATO.exec(String(risposta?.stato || 'nuovo'));
    stato.verifica = match ? match[1] : 'nuovo';
    stato.gruppo = (match && match[2]) || '';

    /**
     * Se il check ci restituisce i dati che già conosce, li adottiamo.
     *
     * Per un contatto `esiste` lo step anagrafica viene saltato — i suoi dati
     * sono già nei nostri archivi, richiederli sarebbe assurdo. Ma senza questo
     * blocco il payload partirebbe senza nome, e Cal.com chiederebbe di
     * riscriverlo proprio a chi è già cliente. Sono campi opzionali della
     * risposta: se il workflow non li manda, il flusso funziona comunque.
     */
    if (stato.verifica !== 'nuovo') {
      if (risposta?.nome) stato.valori.nome = String(risposta.nome).trim();
      if (risposta?.cognome) stato.valori.cognome = String(risposta.cognome).trim();
      if (risposta?.cellulare) {
        stato.valori.cellulare = { prefisso: '', numero: String(risposta.cellulare).trim() };
      }
    }

    traccia('lead_step_email', {
      lead_flusso: opts.flusso,
      lead_stato: stato.verifica,
      lead_sede: (stato.valori.centro || {}).sede || '',
      lead_pagina: stato.pagina,
    });

    vaiA(step.dopoCheck[stato.verifica] || step.dopoCheck.nuovo);
  }

  // ─── Reset ──────────────────────────────────────────────────────────────

  function reset() {
    stato = nuovoStato();

    qa('input[type="text"], input[type="email"], input[type="tel"], input[type="hidden"], textarea').forEach((el) => {
      el.value = '';
    });
    qa('input[type="checkbox"], input[type="radio"]').forEach((el) => {
      el.checked = false;
    });
    qa('[data-cal-embed]').forEach((el) => {
      smontaPrenotazione(el);
      el.hidden = false;
    });
    qa('[data-cal-ko], [data-cal-alt]').forEach((el) => {
      el.hidden = true;
    });
    qa('[data-pg-link]').forEach((el) => {
      el.hidden = true;
    });
    qa('[id$="-err"]').forEach((el) => {
      el.textContent = '';
      el.hidden = true;
    });

    vaiA(def.steps[0].id);
    onReset();
  }

  // ─── Listener (delegati sulla radice) ───────────────────────────────────

  /**
   * Validazione all'uscita dal campo, non a ogni tasto: chi sta ancora
   * scrivendo non va corretto a metà parola. Un campo lasciato vuoto non viene
   * segnalato — non è un errore, è un campo non ancora compilato, e quello lo
   * dirà il bottone avanti.
   */
  root.addEventListener('focusout', (ev) => {
    const el = ev.target;
    if (!el || typeof el.getAttribute !== 'function') return;
    const nome = el.getAttribute('data-campo');
    if (!nome) return;

    const campo = (steps[stepCorrente]?.campi || []).find((c) => c.nome === nome);
    if (!campo || !AL_BLUR[campo.tipo]) return;
    if (!String(el.value || '').trim()) return pulisci(nome);

    const problema = valida(campo, leggi(campo));
    if (problema) {
      segnala(nome, problema);
    } else {
      pulisci(nome);
      errore('');
    }
  });

  root.addEventListener('click', (ev) => {
    const t = ev.target;
    if (!t || !t.closest) return;

    // Bottone principale dello step corrente
    if (t.closest('#' + P + '-' + stepCorrente + '-avanti')) {
      ev.preventDefault();
      const step = steps[stepCorrente];
      if (step.azione === 'check') return void verifica(step);
      if (step.azione === 'invia') return void invia(step);
      if (raccogli(step)) vaiA(step.prossimo);
      return;
    }

    const indietro = t.closest('[data-step-back]');
    if (indietro) {
      ev.preventDefault();
      errore('');
      return vaiA(indietro.getAttribute('data-step-back'));
    }

    // Card di scelta: memorizza la modalità e salta allo step omonimo
    const scelta = t.closest('[data-scelta]');
    if (scelta) {
      ev.preventDefault();
      const valore = scelta.getAttribute('data-scelta');
      stato.valori.modalita = valore;
      return vaiA(valore);
    }

    if (t.closest('[data-form-close]')) {
      ev.preventDefault();
      return reset();
    }
  });

  // Enter su un campo a riga singola: chi digita veloce non deve cercare il
  // bottone. Il riconoscimento è su `data-campo`, non sull'id, perché gli id
  // sono scoped per step.
  root.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return;
    const t = ev.target;
    if (!t || t.tagName === 'TEXTAREA' || !t.hasAttribute?.('data-campo')) return;
    ev.preventDefault();
    const step = steps[stepCorrente];
    if (step.azione === 'check') void verifica(step);
    else if (step.azione === 'invia') void invia(step);
    else if (step.azione === 'next' && raccogli(step)) vaiA(step.prossimo);
  });

  vaiA(def.steps[0].id);

  return {
    /**
     * Prepara il form per una nuova compilazione registrando la provenienza.
     * `cta` è il testo del bottone, `medium` il suo `data-medium`.
     */
    apri(pagina, cta, medium) {
      stato.pagina = pagina || stato.pagina;
      stato.cta = cta || '';
      stato.ctaMedium = medium || '';
      stato.apertoIl = Date.now();
      vaiA(def.steps[0].id);
    },
    /**
     * Preseleziona un valore su ogni step che espone quel campo.
     *
     * Serve a non far ripetere all'utente ciò che il contesto già dice: sulla
     * pagina di Macerata il centro è ovvio, sulla scheda del Reformer l'attività
     * è ovvia, e sul bottone del piano Plus il piano è ovvio. Ogni campo in meno
     * da compilare è conversione che non si perde.
     *
     * Funziona su radio e checkbox indifferentemente: entrambi si limitano a
     * `checked = true`, e i chip del form sono l'uno o l'altro.
     */
    preseleziona(campo, valore) {
      if (!campo || !valore) return;
      // In un selettore di attributo con valore fra apici gli unici caratteri da
      // neutralizzare sono l'apice stesso e il backslash: spazi e slash — quindi
      // "Pilates Reformer" e "CrossFit/Hyrox" — passano così come sono.
      const v = String(valore).replace(/["\\]/g, '\\$&');
      qa('input[data-campo="' + campo + '"][value="' + v + '"]').forEach((el) => {
        el.checked = true;
      });
    },
    reset,
    /** Esposto per i test manuali da console. */
    _stato: () => stato,
  };
}
