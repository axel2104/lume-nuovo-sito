/**
 * Lead form Lume — logica condivisa fra il modal e il form inline.
 *
 * Una sola implementazione, N istanze: `initLeadForm(root, { prefix })` crea
 * uno stato privato in closure e lavora solo su selettori scoped a `root`.
 * Il markup vive in `LeadFormBody.astro`, parametrizzato dallo stesso `prefix`,
 * così due istanze possono coesistere nella stessa pagina senza collisioni di id.
 *
 * Un bug corretto qui è corretto ovunque: è esattamente il motivo per cui questa
 * logica non va duplicata in due <script> gemelli.
 */

const TZ = 'Europe/Rome';

/** Giorni prenotabili in avanti, per tipo di appuntamento. */
const RANGE_GIORNI = { cb: 7, visit: 14 };

/** Minuti minimi di anticipo rispetto a "adesso" nella sede. */
const ANTICIPO_MIN = 120;

/** Passo fra uno slot e il successivo, in minuti. */
const PASSO_MIN = { cb: 20, visit: 30 };

/**
 * Fasce di disponibilità per tipo e per giorno della settimana.
 * 0 = domenica … 6 = sabato. Fascia vuota = giorno non prenotabile.
 */
const FASCE = {
  cb: {
    feriale: [['09:00', '13:00'], ['15:00', '20:00']],
    sabato: [['09:00', '13:00']],
    domenica: [],
  },
  visit: {
    feriale: [['09:30', '12:30'], ['15:30', '20:30']],
    sabato: [['09:30', '12:30']],
    domenica: [],
  },
};

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];
const GIORNI_LUNGHI = [
  'domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato',
];
const GIORNI_CORTI = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RE_TEL = /^[\d\s-]{6,20}$/;
const RE_STATO = /^(iscritto|esiste|nuovo)(?:_(.+))?$/;

// ─── Utilità date ─────────────────────────────────────────────────────────

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Serializza una data di calendario come YYYY-MM-DD nel fuso LOCALE.
 *
 * Non usare mai `toISOString()` per le date che finiscono in un payload:
 * converte in UTC, quindi una mezzanotte italiana diventa il giorno prima
 * alle 22:00Z e chi legge il JSON senza riconvertire vede la data sbagliata.
 * `toISOString()` va bene solo per gli id tecnici interni al DOM.
 */
export function isoDateLocal(d) {
  if (!d) return null;
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

/**
 * "Adesso" secondo l'orologio da parete della sede, non del browser del
 * visitatore. Restituisce una Date costruita con i componenti dell'ora italiana:
 * confrontabile con gli slot, che sono anch'essi ora locale della sede.
 */
function adessoSede() {
  try {
    const f = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const p = {};
    f.formatToParts(new Date()).forEach((x) => {
      p[x.type] = x.value;
    });
    const ora = Number(p.hour) === 24 ? 0 : Number(p.hour);
    return new Date(Number(p.year), Number(p.month) - 1, Number(p.day), ora, Number(p.minute));
  } catch (e) {
    return new Date();
  }
}

function soloGiorno(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addGiorni(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function stessoGiorno(a, b) {
  return !!a && !!b && isoDateLocal(a) === isoDateLocal(b);
}

function minutiDa(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function dataEstesa(d) {
  if (!d) return '';
  return (
    GIORNI_LUNGHI[d.getDay()] +
    ' ' +
    d.getDate() +
    ' ' +
    MESI[d.getMonth()].toLowerCase() +
    ' ' +
    d.getFullYear()
  );
}

// ─── Slot disponibili ─────────────────────────────────────────────────────

function fasceDelGiorno(tipo, d) {
  const g = d.getDay();
  if (g === 0) return FASCE[tipo].domenica;
  if (g === 6) return FASCE[tipo].sabato;
  return FASCE[tipo].feriale;
}

/** Slot orari disponibili per un giorno, già filtrati su "adesso" se è oggi. */
function slotsPerGiorno(tipo, d) {
  const out = [];
  const passo = PASSO_MIN[tipo];
  const adesso = adessoSede();
  const oggi = stessoGiorno(d, adesso);
  const sogliaMinuti = adesso.getHours() * 60 + adesso.getMinutes() + ANTICIPO_MIN;

  fasceDelGiorno(tipo, d).forEach(([da, a]) => {
    for (let m = minutiDa(da); m <= minutiDa(a) - passo; m += passo) {
      if (oggi && m < sogliaMinuti) continue;
      out.push(pad2(Math.floor(m / 60)) + ':' + pad2(m % 60));
    }
  });
  return out;
}

function fasciaOraria(hhmm) {
  const h = Number(hhmm.split(':')[0]);
  if (h < 13) return 'Mattina';
  if (h < 18) return 'Pomeriggio';
  return 'Sera';
}

// ─── Rete ─────────────────────────────────────────────────────────────────

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

async function postJson(url, payload) {
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
}

// ─── Factory ──────────────────────────────────────────────────────────────

export function initLeadForm(root, options) {
  if (!root) return null;

  const opts = options || {};
  const P = opts.prefix;
  const onReset = typeof opts.onReset === 'function' ? opts.onReset : () => {};

  const q = (sel) => root.querySelector(sel);
  const qa = (sel) => Array.from(root.querySelectorAll(sel));
  const byId = (suffisso) => root.querySelector('#' + P + '-' + suffisso);

  const stato = nuovoStato();

  /** Cursore e selezione del calendario, per tipo. */
  const cal = {
    cb: { cursore: null, scelta: null },
    visit: { cursore: null, scelta: null },
  };

  function nuovoStato() {
    return {
      email: '',
      nome: '',
      cognome: '',
      prefisso: '+39',
      cellulare: '',
      centro: '',
      centroLabel: '',
      attivita: [],
      attivitaLabel: [],
      privacy: false,
      marketing: false,
      isNewUser: true,
      stato: '',
      gruppo: '',
      flow: '',
      pagina: '',
      cta: '',
      callbackDate: null,
      callbackTime: '',
      callbackReason: '',
      visitDate: null,
      visitTime: '',
      visitReason: '',
      messageText: '',
    };
  }

  function reimpostaStato() {
    Object.assign(stato, nuovoStato());
  }

  // ─── Navigazione fra step ───────────────────────────────────────────────

  function mostra(step) {
    qa('[data-step]').forEach((el) => {
      el.hidden = el.getAttribute('data-step') !== String(step);
    });
    const dot = { 1: 1, 2: 2, 3: 3 }[step] || 3;
    qa('[data-step-dot]').forEach((el) => {
      const n = Number(el.getAttribute('data-step-dot'));
      el.classList.toggle('on', n <= dot);
    });
    try {
      root.scrollTop = 0;
    } catch (e) {}
  }

  function errore(suffisso, messaggio) {
    const el = byId(suffisso);
    if (!el) return;
    el.textContent = messaggio || '';
    el.hidden = !messaggio;
  }

  function caricamento(bottone, attivo) {
    if (!bottone) return;
    bottone.disabled = attivo;
    bottone.classList.toggle('is-loading', attivo);
  }

  // ─── Step 1 — email, centro, interessi ──────────────────────────────────

  function leggiStep1() {
    stato.email = (byId('email')?.value || '').trim().toLowerCase();

    const centro = q('input[name="' + P + '-centro"]:checked');
    stato.centro = centro ? centro.value : '';
    stato.centroLabel = centro ? centro.getAttribute('data-label') || centro.value : '';

    const scelte = qa('input[name="' + P + '-attivita"]:checked');
    stato.attivita = scelte.map((c) => c.value);
    stato.attivitaLabel = scelte.map((c) => c.getAttribute('data-label') || c.value);
  }

  async function inviaStep1() {
    leggiStep1();
    errore('step1-err', '');

    if (!RE_EMAIL.test(stato.email)) {
      errore('step1-err', 'Inserisci un indirizzo email valido.');
      byId('email')?.focus();
      return;
    }
    if (!stato.centro) {
      errore('step1-err', 'Scegli il centro che ti interessa.');
      return;
    }

    const bottone = byId('step1-next');
    caricamento(bottone, true);

    let risposta = { stato: 'nuovo' };
    const url = cfg().webhookCheck;
    if (url) {
      try {
        risposta = await postJson(url, {
          email: stato.email,
          centro: stato.centro,
          attivita: stato.attivita,
          pagina: stato.pagina,
          cta: stato.cta,
          utm: utmCorrenti(),
          vid: vidCorrente(),
        });
      } catch (e) {
        // Rete o webhook giù: non blocchiamo l'utente, lo trattiamo come nuovo.
        risposta = { stato: 'nuovo' };
      }
    }

    caricamento(bottone, false);

    const match = RE_STATO.exec(String(risposta?.stato || 'nuovo'));
    stato.stato = match ? match[1] : 'nuovo';
    stato.gruppo = (match && match[2]) || '';
    stato.isNewUser = stato.stato === 'nuovo';

    traccia('lead_step_email', {
      lead_stato: stato.stato,
      lead_centro: stato.centro,
      lead_pagina: stato.pagina,
    });

    if (stato.stato === 'nuovo') return mostra(2);
    if (stato.stato === 'iscritto') return apriMessaggio();
    return mostra(3);
  }

  // ─── Step 2 — anagrafica ────────────────────────────────────────────────

  function inviaStep2() {
    errore('step2-err', '');

    stato.nome = (byId('nome')?.value || '').trim();
    stato.cognome = (byId('cognome')?.value || '').trim();
    stato.prefisso = byId('pfx')?.value || '+39';
    stato.cellulare = (byId('cell')?.value || '').trim();
    stato.privacy = !!byId('privacy')?.checked;
    stato.marketing = !!byId('marketing')?.checked;

    if (stato.nome.length < 2) return errore('step2-err', 'Inserisci il tuo nome.');
    if (stato.cognome.length < 2) return errore('step2-err', 'Inserisci il tuo cognome.');
    if (!RE_TEL.test(stato.cellulare) || stato.cellulare.replace(/\D/g, '').length < 6) {
      return errore('step2-err', 'Inserisci un numero di cellulare valido.');
    }
    if (!stato.privacy) {
      return errore('step2-err', 'Per proseguire devi accettare l’informativa privacy.');
    }

    mostra(3);
  }

  // ─── Step 3 — scelta azione ─────────────────────────────────────────────

  function scegliAzione(azione) {
    stato.flow = azione;
    if (azione === 'message') return apriMessaggio();

    const tipo = azione === 'callback' ? 'cb' : 'visit';
    costruisciCalendario(tipo);
    mostra(azione === 'callback' ? '4-callback' : '4-visit');
  }

  function apriMessaggio() {
    stato.flow = 'message';
    mostra('4-message');
  }

  // ─── Calendario ─────────────────────────────────────────────────────────

  function costruisciCalendario(tipo) {
    const oggi = soloGiorno(adessoSede());
    cal[tipo].cursore = new Date(oggi.getFullYear(), oggi.getMonth(), 1);
    cal[tipo].scelta = null;

    const wrapSlot = byId('slots-wrap-' + tipo);
    if (wrapSlot) wrapSlot.hidden = true;
    const contSlot = byId('cal-slots-' + tipo);
    if (contSlot) contSlot.innerHTML = '';

    disegnaMese(tipo);
  }

  function disegnaMese(tipo) {
    const cont = byId('cal-' + tipo);
    if (!cont) return;

    const oggi = soloGiorno(adessoSede());
    const ultimo = addGiorni(oggi, RANGE_GIORNI[tipo]);
    const cursore = cal[tipo].cursore;
    const anno = cursore.getFullYear();
    const mese = cursore.getMonth();

    const primo = new Date(anno, mese, 1);
    const giorniNelMese = new Date(anno, mese + 1, 0).getDate();
    // getDay(): 0 = domenica. La griglia parte da lunedì.
    const offset = (primo.getDay() + 6) % 7;

    const prevOff = new Date(anno, mese - 1, 1) < new Date(oggi.getFullYear(), oggi.getMonth(), 1);
    const nextOff = new Date(anno, mese + 1, 1) > new Date(ultimo.getFullYear(), ultimo.getMonth(), 1);

    let html =
      '<div class="cal-head">' +
      '<button type="button" class="cal-nav" data-cal-prev aria-label="Mese precedente"' +
      (prevOff ? ' disabled' : '') +
      '>‹</button>' +
      '<span class="cal-mese">' + MESI[mese] + ' ' + anno + '</span>' +
      '<button type="button" class="cal-nav" data-cal-next aria-label="Mese successivo"' +
      (nextOff ? ' disabled' : '') +
      '>›</button>' +
      '</div><div class="cal-grid">';

    GIORNI_CORTI.forEach((g) => {
      html += '<span class="cal-dow">' + g + '</span>';
    });
    for (let i = 0; i < offset; i++) html += '<span></span>';

    for (let giorno = 1; giorno <= giorniNelMese; giorno++) {
      const d = new Date(anno, mese, giorno);
      const nelRange = d >= oggi && d <= ultimo;
      const disponibile = nelRange && slotsPerGiorno(tipo, d).length > 0;
      const classi = ['cal-day'];
      if (!disponibile) classi.push('off');
      if (stessoGiorno(d, oggi)) classi.push('today');
      if (stessoGiorno(d, cal[tipo].scelta)) classi.push('sel');

      html +=
        '<button type="button" class="' + classi.join(' ') + '"' +
        (disponibile ? ' data-cal-d="' + d.toISOString() + '"' : ' disabled') +
        '>' + giorno + '</button>';
    }

    html += '</div>';
    cont.innerHTML = html;
  }

  function disegnaSlot(tipo) {
    const cont = byId('cal-slots-' + tipo);
    const wrap = byId('slots-wrap-' + tipo);
    const scelta = cal[tipo].scelta;
    if (!cont || !scelta) return;

    const slots = slotsPerGiorno(tipo, scelta);
    const gruppi = {};
    slots.forEach((s) => {
      const f = fasciaOraria(s);
      (gruppi[f] = gruppi[f] || []).push(s);
    });

    let html = '';
    ['Mattina', 'Pomeriggio', 'Sera'].forEach((f) => {
      if (!gruppi[f]) return;
      html += '<div class="slot-group"><h5>' + f + '</h5><div class="slot-row">';
      gruppi[f].forEach((s) => {
        html += '<button type="button" class="slot" data-slot="' + s + '">' + s + '</button>';
      });
      html += '</div></div>';
    });

    cont.innerHTML = html || '<p class="form-hint">Nessun orario disponibile in questa giornata.</p>';
    if (wrap) wrap.hidden = false;
  }

  // ─── Invio del lead ─────────────────────────────────────────────────────

  function payloadBase(tipo) {
    return {
      tipo,
      email: stato.email,
      nome: stato.nome,
      cognome: stato.cognome,
      cellulare: stato.cellulare ? stato.prefisso + ' ' + stato.cellulare : '',
      centro: stato.centro,
      centroLabel: stato.centroLabel,
      attivita: stato.attivitaLabel, // etichette leggibili, non gli id interni
      attivitaId: stato.attivita,
      privacy: stato.privacy,
      marketing: stato.marketing,
      stato: stato.stato,
      isNewUser: stato.isNewUser,
      gruppo: stato.gruppo,
      pagina: stato.pagina,
      cta: stato.cta,
      utm: utmCorrenti(),
      vid: vidCorrente(),
    };
  }

  async function inviaLead(payload, bottone, suffissoErrore) {
    caricamento(bottone, true);
    const url = cfg().webhookLead;
    try {
      if (url) {
        await postJson(url, payload);
      } else {
        // Nessun backend collegato: si testa comunque tutto il flusso.
        console.info('[lume] lead (nessun webhook configurato)', payload);
      }
    } catch (e) {
      caricamento(bottone, false);
      errore(suffissoErrore, 'Invio non riuscito. Riprova fra qualche istante.');
      return false;
    }
    caricamento(bottone, false);

    traccia('generate_lead', {
      lead_tipo: payload.tipo,
      lead_pagina: payload.pagina,
      lead_cta: payload.cta,
      lead_centro: payload.centro,
      lead_attivita: (payload.attivita || []).join(', '),
    });
    return true;
  }

  async function confermaAppuntamento(tipo) {
    const isCb = tipo === 'cb';
    const suffErr = isCb ? 'cb-err' : 'visit-err';
    errore(suffErr, '');

    const scelta = cal[tipo].scelta;
    const ora = isCb ? stato.callbackTime : stato.visitTime;
    if (!scelta || !ora) {
      return errore(suffErr, 'Scegli giorno e orario per proseguire.');
    }

    const motivo = (byId(isCb ? 'cb-reason' : 'visit-reason')?.value || '').trim();
    if (isCb) {
      stato.callbackDate = scelta;
      stato.callbackReason = motivo;
    } else {
      stato.visitDate = scelta;
      stato.visitReason = motivo;
    }

    const payload = Object.assign(payloadBase(isCb ? 'richiamami' : 'visita'), {
      data: isoDateLocal(scelta), // mai toISOString(): slitterebbe di un giorno
      ora,
      motivo,
    });

    const ok = await inviaLead(payload, byId(isCb ? 'cb-confirm' : 'visit-confirm'), suffErr);
    if (!ok) return;

    const quando = byId(isCb ? 'cb-when' : 'visit-when');
    if (quando) quando.textContent = dataEstesa(scelta) + ' alle ' + ora;
    const riepilogo = byId(isCb ? 'cb-summary' : 'visit-summary');
    if (riepilogo) riepilogo.textContent = riepilogoTesto();

    mostra(isCb ? 'confirm-callback' : 'confirm-visit');
  }

  async function inviaMessaggio() {
    errore('msg-err', '');
    stato.messageText = (byId('msg-text')?.value || '').trim();
    if (stato.messageText.length < 10) {
      return errore('msg-err', 'Scrivi almeno due righe, così possiamo risponderti bene.');
    }

    const payload = Object.assign(payloadBase('messaggio'), { messaggio: stato.messageText });
    const ok = await inviaLead(payload, byId('msg-send'), 'msg-err');
    if (!ok) return;

    const riepilogo = byId('msg-summary');
    if (riepilogo) riepilogo.textContent = riepilogoTesto();
    mostra('confirm-message');
  }

  function riepilogoTesto() {
    const parti = [stato.centroLabel].filter(Boolean);
    if (stato.attivitaLabel.length) parti.push(stato.attivitaLabel.join(', '));
    parti.push(stato.email);
    return parti.join(' · ');
  }

  // ─── Reset ──────────────────────────────────────────────────────────────

  function reset() {
    reimpostaStato();
    cal.cb = { cursore: null, scelta: null };
    cal.visit = { cursore: null, scelta: null };

    qa('input[type="text"], input[type="email"], input[type="tel"], textarea').forEach((el) => {
      el.value = '';
    });
    qa('input[type="checkbox"], input[type="radio"]').forEach((el) => {
      el.checked = false;
    });
    ['cal-cb', 'cal-visit', 'cal-slots-cb', 'cal-slots-visit'].forEach((s) => {
      const el = byId(s);
      if (el) el.innerHTML = '';
    });
    ['slots-wrap-cb', 'slots-wrap-visit'].forEach((s) => {
      const el = byId(s);
      if (el) el.hidden = true;
    });
    ['step1-err', 'step2-err', 'cb-err', 'visit-err', 'msg-err'].forEach((s) => errore(s, ''));

    mostra(1);
    onReset();
  }

  // ─── Listener (delegati sulla radice: il markup può cambiare) ───────────

  root.addEventListener('click', (ev) => {
    const t = ev.target;
    if (!t || !t.closest) return;

    if (t.closest('#' + P + '-step1-next')) {
      ev.preventDefault();
      return void inviaStep1();
    }
    if (t.closest('#' + P + '-step2-next')) {
      ev.preventDefault();
      return void inviaStep2();
    }

    const indietro = t.closest('[data-step-back]');
    if (indietro) {
      ev.preventDefault();
      return mostra(indietro.getAttribute('data-step-back'));
    }

    const azione = t.closest('[data-action]');
    if (azione) {
      ev.preventDefault();
      return scegliAzione(azione.getAttribute('data-action'));
    }

    if (t.closest('#' + P + '-cb-confirm')) {
      ev.preventDefault();
      return void confermaAppuntamento('cb');
    }
    if (t.closest('#' + P + '-visit-confirm')) {
      ev.preventDefault();
      return void confermaAppuntamento('visit');
    }
    if (t.closest('#' + P + '-msg-send')) {
      ev.preventDefault();
      return void inviaMessaggio();
    }
    if (t.closest('[data-lm-close]')) {
      ev.preventDefault();
      return reset();
    }

    // Calendario: il contenuto è rigenerato via innerHTML, quindi va gestito
    // per delega e non con listener attaccati alle singole celle.
    const cellaCal = t.closest('[data-cal-d]');
    const nav = t.closest('[data-cal-prev], [data-cal-next]');
    const slot = t.closest('[data-slot]');

    if (cellaCal || nav || slot) {
      const contenitore = t.closest('[data-cal-type]');
      const tipo = contenitore ? contenitore.getAttribute('data-cal-type') : null;
      if (!tipo) return;
      ev.preventDefault();

      if (nav) {
        const delta = nav.hasAttribute('data-cal-next') ? 1 : -1;
        const c = cal[tipo].cursore;
        cal[tipo].cursore = new Date(c.getFullYear(), c.getMonth() + delta, 1);
        return disegnaMese(tipo);
      }

      if (cellaCal) {
        cal[tipo].scelta = new Date(cellaCal.getAttribute('data-cal-d'));
        if (tipo === 'cb') stato.callbackTime = '';
        else stato.visitTime = '';
        disegnaMese(tipo);
        return disegnaSlot(tipo);
      }

      if (slot) {
        const ora = slot.getAttribute('data-slot');
        if (tipo === 'cb') stato.callbackTime = ora;
        else stato.visitTime = ora;
        const cont = byId('cal-slots-' + tipo);
        if (cont) {
          cont.querySelectorAll('.slot').forEach((b) => b.classList.remove('on'));
        }
        slot.classList.add('on');
      }
    }
  });

  // Invio con Enter sul campo email dello step 1.
  root.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return;
    const t = ev.target;
    if (t && t.id === P + '-email') {
      ev.preventDefault();
      inviaStep1();
    }
  });

  mostra(1);

  return {
    /** Prepara il form per una nuova compilazione, memorizzando la provenienza. */
    open(pagina, cta) {
      stato.pagina = pagina || (typeof location !== 'undefined' ? location.pathname : '');
      stato.cta = cta || '';
      mostra(1);
    },
    reset,
    /** Esposto per i test manuali in console. */
    _stato: stato,
  };
}
