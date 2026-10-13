// Totem del centro: schermata d'attesa, quattro sezioni (cinque a Montecassiano, con la scuola nuoto), QR verso il telefono, statistiche anonime.
import qrcode from 'qrcode-generator';
import { parametri, urlQr, oraRoma, griglia, GIORNI_BREVI } from './totemDati.js';
import { PREDEFINITI } from './totemTesti.js';

const INATTIVITA_MS = 60_000; // senza tocchi per un minuto: si torna all'attesa
const RICARICA_MS = 6 * 3600_000; // contenuti aggiornati: il totem si ricarica da solo, ma solo in attesa

const el = (tag, cls, testo) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (testo != null) e.textContent = testo;
  return e;
};

function qr(url) {
  const q = qrcode(0, 'M');
  q.addData(url);
  q.make();
  const box = el('div', 'tt-qr');
  box.innerHTML = q.createSvgTag({ cellSize: 8, margin: 2, scalable: true }); // SVG generato dalla libreria da un URL nostro
  return box;
}

export function avviaTotem() {
  const centri = JSON.parse(document.body.dataset.centri);
  const T = JSON.parse(document.body.dataset.testi); // testi e menu da Keystatic (con i valori di serie dove manca qualcosa)
  const titoloDi = (chiave) => T.tessere.find((t) => t.chiave === chiave)?.titolo;
  const { totem, centro: slug } = parametri(location.search);
  const app = document.getElementById('app');
  const centro = centri.find((c) => c.slug === slug);

  // Indirizzo senza totem valido: elenco per chi configura lo schermo.
  if (!totem || !centro) {
    app.append(el('h1', 'tt-titolo', 'Configura il totem'));
    app.append(el('p', 'tt-testo', 'Apri questo indirizzo con il nome del totem, per esempio:'));
    for (const c of centri) app.append(el('p', 'tt-codice', `/totem?t=${c.slug}-ingresso`));
    return;
  }

  // ─── Video di sfondo: parte da solo e non si ferma mai ───
  const video = document.querySelector('.tt-video');
  if (centro.poster) document.body.style.setProperty('--tt-poster', `url(${centro.poster})`);
  if (centro.video) {
    video.poster = centro.poster || '';
    video.src = centro.video;
    const riparti = () => video.play().catch(() => {});
    video.addEventListener('pause', riparti);
    video.addEventListener('stalled', riparti);
    riparti();
  }

  // ─── Statistiche: un evento per gesto, in coda al thread (sendBeacon) ───
  const invia = (evento, extra = {}) => {
    const corpo = JSON.stringify({ totem, centro: slug, evento, ...extra });
    try {
      if (!navigator.sendBeacon('/api/totem', new Blob([corpo], { type: 'application/json' }))) throw new Error();
    } catch {
      fetch('/api/totem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo, keepalive: true }).catch(() => {});
    }
  };

  let sezione = null; // { nome, da } mentre una sezione è aperta
  let sessioneDa = 0; // inizio della sessione di tocchi, 0 = in attesa
  const secondi = (da) => Math.round((Date.now() - da) / 1000);
  const chiudiSezione = () => {
    if (sezione) invia('sezione', { sezione: sezione.nome, durata: secondi(sezione.da) });
    sezione = null;
  };

  let timer;
  const riarma = () => {
    clearTimeout(timer);
    if (sessioneDa) timer = setTimeout(attesa, INATTIVITA_MS);
  };
  document.addEventListener('pointerdown', riarma, true);
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  const piazza = (...nodi) => app.replaceChildren(...nodi);
  const intestazione = (indietro) => {
    const h = el('header', 'tt-testa');
    h.append(el('span', 'tt-marchio', 'LUME'), el('span', 'tt-centro', centro.nome));
    if (indietro) {
      const b = el('button', 'tt-indietro', '← Menu');
      b.type = 'button';
      b.onclick = home;
      h.append(b);
    }
    return h;
  };

  // ─── Schermate ───
  function attesa() {
    chiudiSezione();
    if (sessioneDa) invia('attesa', { durata: secondi(sessioneDa) });
    sessioneDa = 0;
    clearTimeout(timer);
    const s = el('section', 'tt-attesa');
    s.append(el('p', 'tt-sopra', T.attesaSopra), el('h1', 'tt-grande', centro.nome), el('p', 'tt-tocca', T.attesaTocca));
    s.onclick = home;
    piazza(s);
  }

  function home() {
    chiudiSezione();
    if (!sessioneDa) sessioneDa = Date.now();
    riarma();
    const griglia = el('div', 'tt-griglia');
    const viste = { centro: vistaCentro, abbonamenti: vistaAbbonamenti, corsi: vistaCorsi, prova: vistaProva, scuolanuoto: vistaScuolaNuoto };
    // La scuola nuoto c'è solo dove il centro la ha; la sua foto di serie è quella della piscina del centro.
    const voci = T.tessere
      .filter((t) => t.chiave !== 'scuolanuoto' || centro.scuolaNuoto)
      .map((t) => [t.titolo, t.sotto, viste[t.chiave], t.foto || centro.scuolaNuoto?.foto || '', t.chiave]);
    for (const [titolo, sotto, vista, foto, chiave] of voci) {
      const b = el('button', 'tt-tessera');
      b.type = 'button';
      b.style.backgroundImage = `linear-gradient(to top, rgba(10,10,10,.94) 8%, rgba(10,10,10,.2) 70%), url(${foto})`;
      b.append(el('span', 'tt-tessera-t', titolo), el('span', 'tt-tessera-s', sotto));
      b.onclick = () => {
        // Nelle statistiche la sezione ha sempre il nome di serie: rinominare la tessera non spezza i conteggi.
        sezione = { nome: PREDEFINITI.tessere.find((x) => x.chiave === chiave).titolo, da: Date.now() };
        vista();
      };
      griglia.append(b);
    }
    piazza(intestazione(false), el('h1', 'tt-titolo', T.menuTitolo), griglia);
  }

  function vistaCentro() {
    const lista = el('ul', 'tt-pillole');
    for (const s of centro.servizi) lista.append(el('li', null, s));
    const blocco = el('div', 'tt-box');
    if (centro.orari) {
      blocco.append(el('h2', 'tt-sottotitolo', T.centroOrari));
      const o = centro.orari;
      for (const [k, v] of [['Lun – Ven', o.feriali], ['Sabato', o.sabato], ['Domenica', o.domenica]]) if (v) blocco.append(el('p', 'tt-riga', `${k}: ${v}`));
    }
    if (centro.indirizzo) blocco.append(el('p', 'tt-riga', centro.indirizzo));
    if (centro.telefono) blocco.append(el('p', 'tt-riga', `Tel. ${centro.telefono}`));
    piazza(intestazione(true), el('h1', 'tt-titolo', titoloDi('centro') || 'Il centro'), lista, blocco);
  }

  // ─── ClientPortal sopra il totem: il consulente attiva l'abbonamento senza uscire dalla pagina ───
  const PORTALE_MS = 10 * 60_000; // dentro il portale i tocchi non arrivano qui: dopo 10 minuti si torna all'attesa
  let portaleEl = null;
  let timerPortale;
  function chiudiPortale(daInattivita) {
    clearTimeout(timerPortale);
    portaleEl?.remove();
    portaleEl = null;
    if (daInattivita) attesa();
    else riarma();
  }
  function apriPortale(url, titolo) {
    clearTimeout(timer);
    chiudiPortale(false);
    clearTimeout(timer);
    portaleEl = el('div', 'tt-portale');
    const barra = el('div', 'tt-portale-barra');
    const indietro = el('button', 'tt-indietro', '← Torna al totem');
    indietro.type = 'button';
    indietro.onclick = () => chiudiPortale(false);
    barra.append(indietro, el('span', 'tt-portale-titolo', titolo));
    const frame = el('iframe', 'tt-portale-frame');
    frame.src = url;
    frame.title = titolo;
    portaleEl.append(barra, frame);
    document.body.append(portaleEl);
    timerPortale = setTimeout(() => chiudiPortale(true), PORTALE_MS);
  }

  function vistaAbbonamenti() {
    const elenco = el('div', 'tt-piani');
    for (const p of centro.piani) {
      const c = el('div', `tt-piano${p.evidenza ? ' tt-evidenza' : ''}`);
      const testa = el('div', 'tt-piano-testa');
      testa.append(el('span', 'tt-piano-nome', p.nome), el('span', 'tt-piano-per', p.per));
      const formule = el('div', 'tt-formule');
      const voci = [
        ['Soluzione unica', `${p.annuale} €`, 'in un anno', p.pgm.annuale],
        ['12 rate', `${Math.round(p.rate / 12)} €`, `al mese · ${p.rate} € totali`, p.pgm.rate],
        ...(p.mensile ? [['Mensile', `${p.mensile} €`, 'al mese', p.pgm.mensile]] : []),
      ];
      for (const [nome, prezzo, nota, url] of voci) {
        const b = el('button', `tt-formula${url ? '' : ' tt-formula-off'}`);
        b.type = 'button';
        b.append(el('span', 'tt-formula-nome', nome), el('span', 'tt-formula-prezzo', prezzo), el('span', 'tt-formula-nota', url ? nota : `${nota} · in reception`));
        if (url) {
          b.onclick = () => {
            invia('voce', { sezione: 'Abbonamenti', voce: `${p.nome} · ${nome}` });
            apriPortale(url, `Attivazione online · ${p.nome} · ${nome}`);
          };
        } else b.disabled = true;
        formule.append(b);
      }
      c.append(testa, formule);
      elenco.append(c);
    }
    const extra = centro.attivazione ? el('p', 'tt-nota', `Quota di attivazione una tantum: ${centro.attivazione} €. ${T.abbonamentiNota}`) : el('span');
    piazza(intestazione(true), el('h1', 'tt-titolo', titoloDi('abbonamenti') || 'Abbonamenti'), elenco, extra);
  }

  // Prezzi della scuola nuoto: arrivano dai piani PerfectGym (sincronizzati nel database). Se la rete manca, la vista resta senza prezzi.
  let prezziScuola;
  const aggiornaPrezzi = async (box) => {
    try {
      prezziScuola ??= await (await fetch('/api/sp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
    } catch {
      return;
    }
    for (const [chiave, nome, sotto] of [['monosettimanale', 'Monosettimanale', '1 volta a settimana'], ['bisettimanale', 'Bisettimanale', '2 volte a settimana']]) {
      const p = prezziScuola?.[chiave];
      if (!p) continue;
      const c = el('div', 'tt-prezzo');
      c.append(el('span', 'tt-formula-nome', nome), el('span', 'tt-formula-prezzo', `${p.prezzo} €`), el('span', 'tt-formula-nota', `${sotto} · tutta la stagione (${p.mesi} mesi)`));
      box.append(c);
    }
  };

  // Scuola nuoto bambini e ragazzi: una riga per fascia d'età, che apre i turni disponibili sul ClientPortal.
  function vistaScuolaNuoto() {
    const sn = centro.scuolaNuoto;
    const prezzi = el('div', 'tt-prezzi');
    const elenco = el('div', 'tt-piani');
    for (const f of sn.fasce) {
      const b = el('button', `tt-formula tt-fascia${f.href ? '' : ' tt-formula-off'}`);
      b.type = 'button';
      b.append(el('span', 'tt-formula-prezzo', f.eta), el('span', 'tt-formula-nota', f.livelli), el('span', 'tt-formula-nome', f.href ? 'Orari e iscrizione →' : 'In reception'));
      if (f.href) {
        b.onclick = () => {
          invia('voce', { sezione: 'Scuola nuoto', voce: f.eta });
          apriPortale(f.href, `Scuola nuoto · ${f.eta}`);
        };
      } else b.disabled = true;
      elenco.append(b);
    }
    piazza(
      intestazione(true),
      el('h1', 'tt-titolo', titoloDi('scuolanuoto') || 'Scuola nuoto'),
      el('p', 'tt-testo', `Lume-H2O · scuola nuoto federale FIN${sn.stagione ? ` · stagione ${sn.stagione}` : ''}. ${T.scuolaNuotoTesto}`),
      prezzi,
      elenco,
    );
    aggiornaPrezzi(prezzi);
  }

  function vistaCorsi() {
    const { giorno } = oraRoma();
    const g = griglia(centro.lezioni);
    const tab = el('div', 'tt-planning');
    tab.append(el('span', 'tt-pl-testa'));
    GIORNI_BREVI.forEach((n, i) => tab.append(el('span', `tt-pl-testa${i + 1 === giorno ? ' tt-pl-oggi' : ''}`, n)));
    for (const ora of g.orari) {
      tab.append(el('span', 'tt-pl-ora', ora));
      for (let d = 1; d <= 7; d++) {
        const cella = el('div', `tt-pl-cella${d === giorno ? ' tt-pl-oggi' : ''}`);
        for (const l of g.in(d, ora)) {
          const c = el('button', 'tt-pl-corso', l.corso);
          c.type = 'button';
          c.onclick = () => invia('voce', { sezione: 'Corsi', voce: l.corso });
          cella.append(c);
        }
        tab.append(cella);
      }
    }
    if (!g.orari.length) tab.append(el('p', 'tt-vuoto', T.corsiVuoto));
    piazza(intestazione(true), el('h1', 'tt-titolo', titoloDi('corsi') || 'Corsi della settimana'), tab, el('p', 'tt-nota', T.corsiNota));
  }

  function vistaProva() {
    const box = el('div', 'tt-cta tt-cta-grande');
    box.append(qr(urlQr('/prova', slug, totem)), el('p', 'tt-cta-t', T.provaTitolo), el('p', 'tt-cta-s', T.provaSotto));
    invia('qr', { sezione: 'Pass prova' });
    piazza(intestazione(true), el('h1', 'tt-titolo', titoloDi('prova') || 'Pass prova'), el('p', 'tt-testo', T.provaTesto), box);
  }

  // `?vista=menu|centro|abbonamenti|scuolanuoto|corsi|prova|portale` apre subito quella schermata: per controllare i contenuti senza toccare lo schermo.
  const diretta = { menu: home, centro: () => (sezione = { nome: 'Il centro', da: Date.now() }, home(), vistaCentro()), abbonamenti: vistaAbbonamenti, scuolanuoto: () => centro.scuolaNuoto && vistaScuolaNuoto(), corsi: vistaCorsi, prova: vistaProva, portale: () => (vistaAbbonamenti(), apriPortale(centro.piani[0].pgm.annuale, `Attivazione online · ${centro.piani[0].nome}`)) }[new URLSearchParams(location.search).get('vista')];
  if (diretta) {
    sessioneDa = Date.now();
    diretta();
  } else attesa();
  setInterval(() => {
    if (!sessioneDa && performance.now() > RICARICA_MS) location.reload();
  }, 600_000);
}
