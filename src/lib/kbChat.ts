/**
 * Pezzi puri dell'assistente del sito (`/api/chat`): niente Astro, così `node --test` li importa.
 */

const GIORNI = ['', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const senzaAccenti = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const parole = (s: string) => senzaAccenti(s).match(/[a-z0-9]{4,}/g) ?? [];

export type Punto = { id: string; titolo: string; url: string; testo: string };

/** I `n` punti del regolamento che condividono più parole con la domanda (accenti ignorati). */
export function scegliPunti(punti: Punto[], domanda: string, n = 4): Punto[] {
  const cerca = new Set(parole(domanda));
  if (!cerca.size) return [];
  return punti
    .map((p) => {
      const titolo = new Set(parole(p.titolo));
      const testo = new Set(parole(p.testo));
      let s = 0;
      for (const w of cerca) s += (titolo.has(w) ? 3 : 0) + (testo.has(w) ? 1 : 0);
      return { p, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.p);
}

export type Correzione = { testo: string; parole: string[]; sempre: boolean };

const radice = (w: string) => w.slice(0, 6); // «prenotazioni» e «prenotare» condividono «prenot»

/**
 * Le correzioni del team da dire all'agente: quelle «sempre» e quelle che condividono una parola chiave con la
 * domanda (accenti e desinenze ignorati). Poche righe per domanda: la KB di correzioni può crescere senza costare token.
 */
export function scegliCorrezioni(correzioni: Correzione[], domanda: string, n = 5): Correzione[] {
  const cerca = new Set(parole(domanda).map(radice));
  const punteggio = (c: Correzione) => c.parole.reduce((s, p) => s + (cerca.has(radice(senzaAccenti(p))) ? 1 : 0), 0);
  return correzioni
    .map((c) => ({ c, s: c.sempre ? 99 : punteggio(c) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.c);
}

type Lezione = { giorno: string | number; inizio: string; corso: string };

/** "Lun 07:00 CrossFit, 08:30 Pilates": l'orario settimanale in una riga per giorno. */
export function planningCompatto(lezioni: Lezione[]): string {
  const perGiorno = new Map<number, Lezione[]>();
  for (const l of lezioni) {
    const g = Number(l.giorno);
    if (g >= 1 && g <= 7) perGiorno.set(g, [...(perGiorno.get(g) ?? []), l]);
  }
  return [...perGiorno.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(
      ([g, ls]) =>
        `${GIORNI[g]} ${ls
          .sort((a, b) => a.inizio.localeCompare(b.inizio))
          .map((l) => `${l.inizio} ${l.corso}`)
          .join(', ')}`,
    )
    .join('\n');
}

/** Ultimi 8 messaggi, ruoli validi, testo corto: il client non è fidato. */
export function pulisciMessaggi(m: unknown): { role: 'user' | 'assistant'; content: string }[] {
  if (!Array.isArray(m)) return [];
  const out = m
    .filter((x) => x && (x.role === 'user' || x.role === 'assistant') && typeof x.content === 'string' && x.content.trim())
    .slice(-8)
    .map((x) => ({ role: x.role as 'user' | 'assistant', content: x.content.trim().slice(0, 600) }));
  while (out.length && out[0].role !== 'user') out.shift();
  return out[out.length - 1]?.role === 'user' ? out : [];
}
