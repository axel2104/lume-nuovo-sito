/**
 * Planning settimanale — tipi, tassonomie e calcolo del layout.
 *
 * Il planning è una **settimana tipo**, non un calendario di date: è ciò che si
 * appende in bacheca e cambia a inizio stagione. Le date specifiche (una lezione
 * annullata, un festivo) restano su PerfectGym, dove chi prenota le vede.
 * Mettere qui anche quelle vorrebbe dire mantenere due calendari.
 *
 * La sorgente sono i corsi caricati nel gestionale: il sito non è mai la fonte
 * di verità dell'orario, la fonte è PerfectGym. Vedi `docs/PLANNING.md`.
 */

/** Giorni ISO: 1 = lunedì … 7 = domenica. */
export const GIORNI = [
  { n: 1, nome: 'Lunedì', breve: 'Lun', iniziale: 'L' },
  { n: 2, nome: 'Martedì', breve: 'Mar', iniziale: 'M' },
  { n: 3, nome: 'Mercoledì', breve: 'Mer', iniziale: 'M' },
  { n: 4, nome: 'Giovedì', breve: 'Gio', iniziale: 'G' },
  { n: 5, nome: 'Venerdì', breve: 'Ven', iniziale: 'V' },
  { n: 6, nome: 'Sabato', breve: 'Sab', iniziale: 'S' },
  { n: 7, nome: 'Domenica', breve: 'Dom', iniziale: 'D' },
] as const;

export interface Lezione {
  /** 1 = lunedì … 7 = domenica. */
  giorno: number;
  /** "07:00" — ora locale della sede. */
  inizio: string;
  /** "07:50". */
  fine: string;
  corso: string;
  /** Slug della collection `discipline`, per linkare la scheda. */
  disciplina?: string | null;
  sala?: string | null;
  /** Sezione separata della pagina planning (es. "CrossFit"). Vuoto = griglia principale. */
  sezione?: string | null;
  istruttore?: string | null;
  /** Falso per le lezioni ad accesso libero, senza prenotazione. */
  prenotabile?: boolean;
}

/** "07:30" → 450. Restituisce NaN su input malformato, non zero: uno zero
 *  silenzioso piazzerebbe la lezione a mezzanotte senza far sospettare nulla. */
export function minuti(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim());
  if (!m) return NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return NaN;
  return h * 60 + min;
}

/** 450 → "07:30". */
export function orario(min: number): string {
  const h = Math.floor(min / 60);
  return String(h).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
}

/**
 * Dal titolo di una sezione ("In acqua") al suo slug per gli URL
 * ("in-acqua"). Lo usano sia la pagina (per linkare il PDF della sezione) sia
 * la route che quel PDF lo genera: se fossero due funzioni, il giorno che
 * una cambia i link diventano 404 silenziosi.
 */
export function slugSezione(sezione: string): string {
  return sezione
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Scarta le lezioni con orari illeggibili o invertiti, senza far cadere la pagina. */
export function lezioniValide(lezioni: Lezione[]): Lezione[] {
  return (lezioni || []).filter((l) => {
    const da = minuti(l.inizio);
    const a = minuti(l.fine);
    return (
      Number.isFinite(da) && Number.isFinite(a) && a > da &&
      l.giorno >= 1 && l.giorno <= 7 && Boolean(l.corso)
    );
  });
}

// ─── Layout ───────────────────────────────────────────────────────────────

/**
 * Raggruppa l'orario per fascia di inizio.
 *
 * ─── Perché una tabella di fasce e non una griglia a tempo continuo ────────
 * La prima versione disegnava un asse verticale proporzionale ai minuti e
 * affiancava le lezioni sovrapposte in corsie. Sul palinsesto vero non regge:
 * a Macerata il lunedì ci sono fino a **otto lezioni contemporaneamente
 * aperte**, e otto corsie in una colonna di duecento pixel fanno tessere da
 * quaranta pixel con i nomi troncati a "LesMill…". Un orario illeggibile non è
 * un orario.
 *
 * Gli stessi dati, letti per fascia di inizio, hanno **al massimo quattro
 * lezioni per casella** (e nella grande maggioranza dei casi una o due):
 * impilate in verticale prendono tutta la larghezza della colonna e si leggono.
 * È anche la forma in cui il palinsesto è già pensato — il foglio dello staff è
 * una tabella di fasce — e quella in cui lo cerca chi lo consulta: "cosa c'è
 * alle 18:30?", non "cosa è in corso alle 18:37?".
 *
 * Si perde la percezione proporzionale della durata. In cambio si legge.
 */
export function slotDi(lezioni: Lezione[]): { inizio: string; min: number; stacco: boolean }[] {
  const min = [...new Set(lezioniValide(lezioni).map((l) => minuti(l.inizio)))].sort((a, b) => a - b);
  return min.map((m, i) => ({
    inizio: orario(m),
    min: m,
    // Un salto di un'ora e mezza è la pausa fra mattina e pomeriggio: segnarla
    // evita che le 11:05 e le 13:15 sembrino consecutive.
    stacco: i > 0 && m - min[i - 1] >= 90,
  }));
}

/** Lezioni per giorno e fascia, indicizzate con la chiave `giorno|inizio`. */
export function perSlot(lezioni: Lezione[]): Map<string, Lezione[]> {
  const mappa = new Map<string, Lezione[]>();
  for (const l of lezioniValide(lezioni)) {
    const k = l.giorno + '|' + orario(minuti(l.inizio));
    const gia = mappa.get(k);
    if (gia) gia.push(l);
    else mappa.set(k, [l]);
  }
  for (const voci of mappa.values()) {
    voci.sort((a, b) => minuti(a.fine) - minuti(b.fine) || a.corso.localeCompare(b.corso, 'it'));
  }
  return mappa;
}

/** Giorni che hanno almeno una lezione, nell'ordine della settimana. */
export function giorniDi(lezioni: Lezione[]): (typeof GIORNI)[number][] {
  const presenti = new Set(lezioniValide(lezioni).map((l) => l.giorno));
  return GIORNI.filter((g) => presenti.has(g.n));
}

/** Sale presenti, in ordine di prima comparsa: è l'ordine in cui le pensa lo staff. */
export function saleDi(lezioni: Lezione[]): string[] {
  const viste: string[] = [];
  for (const l of lezioniValide(lezioni)) {
    const s = (l.sala || '').trim();
    if (s && !viste.includes(s)) viste.push(s);
  }
  return viste;
}

/** Nomi dei corsi presenti, ordinati alfabeticamente per il filtro. */
export function corsiDi(lezioni: Lezione[]): string[] {
  return [...new Set(lezioniValide(lezioni).map((l) => l.corso))].sort((a, b) =>
    a.localeCompare(b, 'it'),
  );
}

/**
 * Impronta di un orario, per capire se è cambiato.
 *
 * Serve al client per non ridisegnare il planning quando il webhook restituisce
 * ciò che è già a schermo — il caso normale, dato che un orario cambia poche
 * volte l'anno. Senza questo confronto ogni visita produrrebbe uno sfarfallio
 * gratuito.
 *
 * Ordinata prima di concatenare: due risposte con le stesse lezioni in ordine
 * diverso sono lo stesso orario e non devono sembrare diverse.
 */
export function firma(lezioni: Lezione[]): string {
  return lezioniValide(lezioni)
    .map((l) =>
      [l.giorno, l.inizio, l.fine, l.corso, l.sala ?? '', l.istruttore ?? ''].join('|'),
    )
    .sort()
    .join('~');
}
