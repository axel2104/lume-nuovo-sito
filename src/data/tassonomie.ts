/**
 * Tassonomie della sezione editoriale — unica fonte di verità.
 *
 * Gli enum Zod di `src/content.config.ts` sono DERIVATI da questi array, non
 * riscritti a mano: aggiungere una categoria qui la rende automaticamente
 * valida nello schema, disponibile nei filtri UI e tradotta in etichetta.
 * Un posto solo da aggiornare, nessun rischio di disallineamento.
 */

export interface Voce {
  id: string;
  label: string;
  descrizione?: string;
}

/** Restituisce la tupla di id nel formato che `z.enum()` richiede. */
export function idDi<T extends readonly Voce[]>(voci: T): [string, ...string[]] {
  return voci.map((v) => v.id) as [string, ...string[]];
}

export function etichetta(voci: readonly Voce[], id: string): string {
  return voci.find((v) => v.id === id)?.label ?? id;
}

// ─── News ──────────────────────────────────────────────────────────────────
export const categorieNews = [
  { id: 'novita', label: 'Novità' },
  { id: 'centri', label: 'Dai centri' },
  { id: 'allenamento', label: 'Allenamento' },
  { id: 'benessere', label: 'Benessere' },
  { id: 'community', label: 'Community' },
] as const satisfies readonly Voce[];

// ─── Eventi ────────────────────────────────────────────────────────────────
export const categorieEventi = [
  { id: 'open-day', label: 'Open day' },
  { id: 'masterclass', label: 'Masterclass' },
  { id: 'gara', label: 'Gara' },
  { id: 'challenge', label: 'Challenge' },
  { id: 'evento', label: 'Evento' },
] as const satisfies readonly Voce[];

// ─── Help desk ─────────────────────────────────────────────────────────────
export const categorieHelpdesk = [
  { id: 'abbonamenti', label: 'Abbonamenti e iscrizioni' },
  { id: 'prenotazioni', label: 'Prenotazioni corsi' },
  { id: 'app', label: 'App e area personale' },
  { id: 'pagamenti', label: 'Pagamenti e fatture' },
  { id: 'accesso', label: 'Accesso al centro' },
  { id: 'regolamento', label: 'Regolamento' },
] as const satisfies readonly Voce[];

// ─── Icone dei servizi ─────────────────────────────────────────────────────
// Ogni id corrisponde a un SVG in `src/components/editoriale/IconaServizio.astro`.
export const iconeServizi = [
  { id: 'coach', label: 'Allenatore (persona)' },
  { id: 'nutrizione', label: 'Nutrizione (mela)' },
  { id: 'fisio', label: 'Fisioterapia (mano)' },
  { id: 'armadietto', label: 'Spogliatoi (armadietto)' },
  { id: 'shop', label: 'Shop (borsa)' },
  { id: 'medical', label: 'Visite mediche (croce)' },
  { id: 'bimbi', label: 'Bambini (aquilone)' },
  { id: 'convenzioni', label: 'Convenzioni (cartellino)' },
] as const satisfies readonly Voce[];
