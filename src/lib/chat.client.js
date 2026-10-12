import { analizza, segmenti } from './chatFormato.js';

// Widget dell'assistente: cronologia in sessionStorage, risposte da /api/chat.
const CHIAVE = 'lume-chat';
const SESSIONE = 'lume-chat-id';
const sessione = () => {
  try {
    return sessionStorage.getItem(SESSIONE) || (sessionStorage.setItem(SESSIONE, crypto.randomUUID()), sessionStorage.getItem(SESSIONE));
  } catch {
    return crypto.randomUUID();
  }
};
const SALUTO = 'Ciao! Posso aiutarti con abbonamenti, orari dei corsi, centri e regolamento. Cosa ti serve?';

const leggi = () => {
  try {
    return JSON.parse(sessionStorage.getItem(CHIAVE) || '[]');
  } catch {
    return [];
  }
};
const salva = (m) => {
  try {
    sessionStorage.setItem(CHIAVE, JSON.stringify(m.slice(-12)));
  } catch {
    /* storage non disponibile: la chat funziona lo stesso */
  }
};

/** Risposta dell'assistente: paragrafi, elenchi, grassetti, poi pulsanti e risposte rapide. Solo nodi DOM, mai innerHTML. */
function disegna(el, testo) {
  el.replaceChildren();
  const { blocchi, bottoni, risposte } = analizza(testo);
  const riga = (parent, r) => {
    for (const { t, b } of segmenti(r)) {
      if (b) {
        const strong = document.createElement('strong');
        strong.textContent = t;
        parent.append(strong);
      } else parent.append(t);
    }
  };
  for (const bl of blocchi) {
    if (bl.tipo === 'p') {
      const p = document.createElement('p');
      riga(p, bl.riga);
      el.append(p);
    } else {
      const ul = document.createElement('ul');
      for (const r of bl.righe) riga(ul.appendChild(document.createElement('li')), r);
      el.append(ul);
    }
  }
  if (bottoni.length) {
    const d = document.createElement('div');
    d.className = 'chat-azioni';
    for (const b of bottoni) {
      const a = document.createElement('a');
      a.className = 'chat-btn';
      a.href = b.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = b.etichetta;
      d.append(a);
    }
    el.append(d);
  }
  if (risposte.length) {
    const d = document.createElement('div');
    d.className = 'chat-risposte';
    for (const r of risposte) {
      const bt = document.createElement('button');
      bt.type = 'button';
      bt.className = 'chat-chip chat-risposta';
      bt.textContent = r;
      d.append(bt);
    }
    el.append(d);
  }
}

export function initChat() {
  const pannello = document.getElementById('chat-panel');
  const fab = document.querySelector('.chat-fab');
  if (!pannello || !fab) return;
  const log = pannello.querySelector('.chat-log');
  const form = pannello.querySelector('.chat-form');
  const input = pannello.querySelector('.chat-input');
  let messaggi = leggi();
  let inAttesa = false;

  const bolla = (ruolo, testo) => {
    const d = document.createElement('div');
    d.className = `chat-msg chat-${ruolo}`;
    if (ruolo === 'assistant') disegna(d, testo);
    else d.textContent = testo;
    log.append(d);
    log.scrollTop = log.scrollHeight;
    return d;
  };

  // Su telefono il pannello è a schermo intero e segue l'area visibile: con la tastiera aperta
  // l'altezza si riduce e il campo resta in vista. Su desktop non serve e non si tocca nulla.
  const telefono = window.matchMedia('(max-width: 640px), (max-height: 520px)');
  const vv = window.visualViewport;
  const adatta = () => {
    if (pannello.hidden) return;
    if (telefono.matches && vv) {
      pannello.style.setProperty('--chat-h', `${vv.height}px`);
      pannello.style.setProperty('--chat-top', `${vv.offsetTop}px`);
      log.scrollTop = log.scrollHeight;
    } else {
      pannello.style.removeProperty('--chat-h');
      pannello.style.removeProperty('--chat-top');
    }
  };
  vv?.addEventListener('resize', adatta);
  vv?.addEventListener('scroll', adatta);
  telefono.addEventListener('change', adatta);

  const apri = (aperto) => {
    pannello.hidden = !aperto;
    fab.setAttribute('aria-expanded', String(aperto));
    fab.hidden = aperto;
    document.documentElement.classList.toggle('chat-aperta', aperto);
    if (aperto) {
      adatta();
      chips.hidden = messaggi.length > 0;
      if (!log.childElementCount) {
        bolla('assistant', SALUTO);
        for (const m of messaggi) bolla(m.role, m.content);
      }
      input.focus();
    } else {
      fab.focus();
    }
  };

  document.querySelectorAll('[data-chat-toggle]').forEach((b) => b.addEventListener('click', () => apri(pannello.hidden)));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && !pannello.hidden && apri(false));

  // Risposte rapide del modello (es. il centro): un tocco le invia e le altre spariscono.
  log.addEventListener('click', (e) => {
    const bt = e.target.closest('.chat-risposta');
    if (!bt || inAttesa) return;
    bt.closest('.chat-risposte').remove();
    input.value = bt.textContent;
    form.requestSubmit();
  });

  const chips = pannello.querySelector('.chat-chips');
  const contatto = pannello.querySelector('.chat-contatto');
  contatto.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = contatto.querySelector('input').value.trim();
    if (!email) return;
    let ok = false;
    try {
      const r = await fetch('/api/chat-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessione: sessione(), email }),
      });
      ok = r.ok;
    } catch {
      /* resta il messaggio d'errore */
    }
    contatto.replaceChildren(ok ? 'Grazie! Il team vedrà questa conversazione e potrà ricontattarti.' : 'Email non valida o servizio non raggiungibile: riprova.');
    contatto.classList.toggle('chat-contatto-ok', ok);
  });

  chips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chat-chip');
    if (!chip) return;
    input.value = chip.textContent;
    form.requestSubmit();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const testo = input.value.trim();
    if (!testo || inAttesa) return;
    input.value = '';
    chips.hidden = true; // i suggerimenti servono solo a iniziare
    inAttesa = true;
    messaggi.push({ role: 'user', content: testo });
    bolla('user', testo);
    const attesa = bolla('assistant', '…');
    let risposta = 'Non riesco a rispondere ora. Scrivici su https://www.lumefitness.it/contatti';
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaggi, sessione: sessione(), pagina: location.pathname }),
      });
      risposta = (await r.json()).risposta || risposta;
    } catch {
      /* resta il messaggio di ripiego */
    }
    disegna(attesa, risposta);
    log.scrollTop = log.scrollHeight;
    messaggi.push({ role: 'assistant', content: risposta });
    salva(messaggi);
    contatto.hidden = contatto.classList.contains('chat-contatto-ok');
    inAttesa = false;
  });

  if (location.hash === '#assistente') apri(true);
}
