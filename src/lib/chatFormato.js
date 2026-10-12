/**
 * Dalla risposta del modello a ciò che il widget disegna. Funzioni pure, nessun DOM: si testano con `node --test`.
 *
 * Il modello scrive testo con **grassetti**, elenchi "- " e due marcatori:
 *   [[Etichetta|https://…]]  → un pulsante
 *   ((Macerata))             → una risposta rapida (la persona la tocca e viene inviata)
 * Un URL scritto nudo nel testo diventa comunque un pulsante, con un'etichetta ricavata dall'indirizzo.
 * Si accettano solo indirizzi del sito e del portale: un link inventato dal modello non deve mai essere cliccabile.
 */

const HOST_OK = new Set(['lumefitness.it', 'www.lumefitness.it', 'lumefitness.perfectgym.com']);

const ETICHETTE = [
  [/\/prova/, 'Settimana di prova'],
  [/\/contatti/, 'Contatta il centro'],
  [/\/regolamento/, 'Leggi il regolamento'],
  [/\/planning/, 'Vedi gli orari'],
  [/\/abbonamenti/, 'Vedi gli abbonamenti'],
  [/\/iscriviti|Registration/, 'Iscriviti'],
  [/\/centri/, 'Scopri il centro'],
];

/** URL valido e del sito, altrimenti null. */
export function urlSicuro(u) {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' && HOST_OK.has(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}

const etichettaDi = (u) => ETICHETTE.find(([re]) => re.test(u))?.[1] ?? 'Apri la pagina';

/** Righe di testo con grassetti: [{ t, b }] per ogni riga. */
export function segmenti(riga) {
  return riga
    .split(/\*\*(.+?)\*\*/g)
    .map((t, i) => ({ t, b: i % 2 === 1 }))
    .filter((s) => s.t);
}

/**
 * @returns {{ blocchi: ({ tipo: 'p', riga: string } | { tipo: 'ul', righe: string[] })[],
 *             bottoni: { etichetta: string, url: string }[], risposte: string[] }}
 */
export function analizza(testo) {
  const bottoni = [];
  const risposte = [];
  const aggiungi = (etichetta, u) => {
    const url = urlSicuro(u);
    if (url && !bottoni.some((b) => b.url === url)) bottoni.push({ etichetta: etichetta.trim().slice(0, 40), url });
  };

  let t = testo
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_, e, u) => (aggiungi(e, u.trim()), ''))
    .replace(/\(\(([^)]{1,40})\)\)/g, (_, r) => (risposte.push(r.trim()), ''));
  // URL rimasti nel testo: diventano pulsanti e spariscono dal discorso (anche se fra parentesi).
  t = t.replace(/\(?(https?:\/\/[^\s)\]]+)\)?/g, (_, u) => (aggiungi(etichettaDi(u), u), ''));

  const blocchi = [];
  for (const riga of t.split('\n').map((r) => r.trimEnd())) {
    const voce = riga.match(/^\s*[-•*]\s+(.*)$/);
    if (voce) {
      const ultimo = blocchi[blocchi.length - 1];
      if (ultimo?.tipo === 'ul') ultimo.righe.push(voce[1]);
      else blocchi.push({ tipo: 'ul', righe: [voce[1]] });
    } else if (riga.trim()) {
      blocchi.push({ tipo: 'p', riga: riga.trim().replace(/\s{2,}/g, ' ') });
    }
  }
  return { blocchi, bottoni: bottoni.slice(0, 3), risposte: risposte.slice(0, 5) };
}
