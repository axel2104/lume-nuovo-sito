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
  // Interruttore del CRM: se l'assistente è spento il pulsante e il pannello spariscono. Se la richiesta fallisce resta acceso.
  fetch('/api/ca', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    .then((r) => r.json())
    .then((d) => {
      if (d?.attiva === false) (pannello.remove(), fab.remove());
    })
    .catch(() => {});
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

  // Risposta della segreteria: bolla con l'etichetta, mai passata per il disegno dell'assistente.
  const bollaOp = (testo) => {
    const d = document.createElement('div');
    d.className = 'chat-msg chat-operatore';
    const b = document.createElement('b');
    b.textContent = 'Segreteria Lume';
    d.append(b, testo);
    log.append(d);
    log.scrollTop = log.scrollHeight;
  };
  const nota = (testo) => {
    const d = document.createElement('div');
    d.className = 'chat-nota';
    d.textContent = testo;
    log.append(d);
    log.scrollTop = log.scrollHeight;
  };
  let avvisato = false;

  // Con la chat aperta e una conversazione avviata, ogni 5 secondi si chiede se la segreteria ha risposto.
  // Una richiesta minuscola verso lo stesso dominio (rewrite Netlify, nessuna funzione).
  let ultimoOp = messaggi.reduce((m, x) => Math.max(m, x.op || 0), 0);
  const controlla = async () => {
    if (pannello.hidden || document.hidden || !messaggi.length) return;
    try {
      const r = await fetch('/api/cs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_sessione: sessione(), p_dopo: ultimoOp }),
      });
      const { messaggi: nuovi = [] } = await r.json();
      for (const n of nuovi) {
        ultimoOp = Math.max(ultimoOp, n.id);
        messaggi.push({ role: 'assistant', content: n.testo, op: n.id });
        bollaOp(n.testo);
      }
      if (nuovi.length) salva(messaggi);
    } catch {
      /* rete assente: riprova al giro dopo */
    }
  };
  setInterval(controlla, 5000);

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
        for (const m of messaggi) (m.op ? bollaOp(m.content) : bolla(m.role, m.content));
      }
      controlla();
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
      const j = await r.json();
      if (j.operatore) {
        // La segreteria segue la conversazione: il bot non risponde, la risposta arriva con il controllo periodico.
        attesa.remove();
        if (!avvisato) nota('La segreteria di Lume sta seguendo la conversazione e ti risponde qui appena possibile.');
        avvisato = true;
        contatto.hidden = contatto.classList.contains('chat-contatto-ok');
        inAttesa = false;
        return;
      }
      risposta = j.risposta || risposta;
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
