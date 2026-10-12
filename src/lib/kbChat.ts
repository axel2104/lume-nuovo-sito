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
