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
  istruttore?: string | null;
  /** Falso per le lezioni ad accesso libero, senza prenotazione. */
  prenotabile?: boolean;
}

/** Lezione con la posizione calcolata nella griglia. */
export interface LezionePosizionata extends Lezione {
  /** Minuti dalla mezzanotte. */
  da: number;
  a: number;
  /** Corsia occupata fra quelle sovrapposte, e quante ce ne sono in totale. */
  corsia: number;
  corsie: number;
}

// ─── Orari ────────────────────────────────────────────────────────────────

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
 * Assegna a ogni lezione una corsia, così le sovrapposizioni stanno affiancate
 * invece di sovrapporsi.
 *
 * Serve perché un planning vero ha più sale: alle 18:30 può esserci BodyPump in
 * Sala A e Reformer in sala Pilates. Una griglia che ignora il problema mostra le
 * due lezioni una sopra l'altra e ne rende una invisibile — e nessuno se ne
 * accorge finché un iscritto non si presenta al corso sbagliato.
 *
 * Algoritmo classico: ordinate per inizio, ogni lezione prende la prima corsia
 * libera. Le corsie totali sono calcolate per gruppo di sovrapposizione, non per
 * giornata intera, altrimenti un solo incrocio alle 18:30 stringerebbe anche le
 * lezioni del mattino che non si sovrappongono a nulla.
 */
export function disponi(lezioni: Lezione[]): LezionePosizionata[] {
  const ordinate = lezioniValide(lezioni)
    .map((l) => ({ ...l, da: minuti(l.inizio), a: minuti(l.fine), corsia: 0, corsie: 1 }))
    .sort((x, y) => x.da - y.da || x.a - y.a || x.corso.localeCompare(y.corso, 'it'));

  const out: LezionePosizionata[] = [];

  for (const giorno of GIORNI) {
    const delGiorno = ordinate.filter((l) => l.giorno === giorno.n);
    if (!delGiorno.length) continue;

    /** Fine dell'ultima lezione in ciascuna corsia. */
    const fineCorsia: number[] = [];
    /** Lezioni del gruppo di sovrapposizione corrente. */
    let gruppo: LezionePosizionata[] = [];
    let fineGruppo = -1;

    const chiudiGruppo = () => {
      if (!gruppo.length) return;
      const corsie = Math.max(...gruppo.map((l) => l.corsia)) + 1;
      gruppo.forEach((l) => {
        l.corsie = corsie;
      });
      out.push(...gruppo);
      gruppo = [];
      fineCorsia.length = 0;
    };

    for (const l of delGiorno) {
      // Nessuna lezione aperta oltre questo inizio: il gruppo precedente è chiuso.
      if (l.da >= fineGruppo) chiudiGruppo();

      let corsia = fineCorsia.findIndex((fine) => fine <= l.da);
      if (corsia === -1) corsia = fineCorsia.length;
      fineCorsia[corsia] = l.a;

      l.corsia = corsia;
      gruppo.push(l);
      fineGruppo = Math.max(fineGruppo, l.a);
    }
    chiudiGruppo();
  }

  return out;
}

/** Estremi della giornata, arrotondati all'ora piena, per l'asse della griglia. */
export function estremi(lezioni: Lezione[]): { da: number; a: number } {
  const valide = lezioniValide(lezioni);
  if (!valide.length) return { da: 8 * 60, a: 22 * 60 };
  const da = Math.min(...valide.map((l) => minuti(l.inizio)));
  const a = Math.max(...valide.map((l) => minuti(l.fine)));
  return { da: Math.floor(da / 60) * 60, a: Math.ceil(a / 60) * 60 };
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
 * Altezza in pixel di un minuto nella griglia desktop.
 *
 * 1,15 px/min = una lezione da 50 minuti alta 57px, che è il minimo per
 * contenere un titolo su due righe più la riga di orario e sala senza tagliarla.
 * A 0,9 px/min (45px) l'ultima riga finiva mozzata, e una riga di testo tagliata
 * a metà si legge come un difetto anche quando il dato è giusto.
 */
export const PX_PER_MIN = 1.15;

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
