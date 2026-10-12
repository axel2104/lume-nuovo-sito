// Widget dell'assistente: cronologia in sessionStorage, risposte da /api/chat.
const CHIAVE = 'lume-chat';
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

/** Testo semplice con i link cliccabili, costruito da nodi: mai innerHTML con testo del modello. */
function scrivi(el, testo) {
  for (const parte of testo.split(/(https?:\/\/[^\s)]+)/g)) {
    if (/^https?:\/\//.test(parte)) {
      const a = document.createElement('a');
      a.href = parte;
      a.textContent = parte.replace(/^https?:\/\/(www\.)?/, '');
      a.target = '_blank';
      a.rel = 'noopener';
      el.append(a);
    } else {
      el.append(parte);
    }
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
    scrivi(d, testo);
    log.append(d);
    log.scrollTop = log.scrollHeight;
    return d;
  };

  const apri = (aperto) => {
    pannello.hidden = !aperto;
    fab.setAttribute('aria-expanded', String(aperto));
    fab.hidden = aperto;
    if (aperto) {
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

  const chips = pannello.querySelector('.chat-chips');
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
        body: JSON.stringify({ messaggi }),
      });
      risposta = (await r.json()).risposta || risposta;
    } catch {
      /* resta il messaggio di ripiego */
    }
    attesa.replaceChildren();
    scrivi(attesa, risposta);
    log.scrollTop = log.scrollHeight;
    messaggi.push({ role: 'assistant', content: risposta });
    salva(messaggi);
    inAttesa = false;
  });
}
