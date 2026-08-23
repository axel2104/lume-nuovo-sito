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

// ─── Abbonamenti ───────────────────────────────────────────────────────────
/**
 * Le righe della tabella comparativa dei piani.
 *
 * I piani non elencano più voci in testo libero: dichiarano quali di queste
 * righe includono. Così «Corsi di gruppo» è la stessa riga per tutti e tre e
 * la tabella si costruisce da sola — con le liste libere ogni piano scriveva
 * «Tutto di Base» e chi legge doveva tenere a mente tre elenchi.
 */
export const vociAbbonamento = [
  { id: 'sala', label: 'Sala pesi e zona cardio' },
  { id: 'spogliatoi', label: 'Spogliatoi, docce e armadietti' },
  { id: 'corsi', label: 'Corsi di gruppo' },
  { id: 'centri', label: 'Accesso a tutti i centri Lume' },
  { id: 'app', label: 'App di prenotazione' },
  { id: 'pt', label: 'Personal training' },
  {
    id: 'acqua',
    label: 'Piscina e attività in acqua',
    descrizione: 'Solo nei centri con piscina',
  },
  { id: 'spa', label: 'SPA e area relax', descrizione: 'Solo nei centri con SPA' },
  { id: 'nutrizione', label: 'Piano nutrizionale' },
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

// ─── Interessi del lead ────────────────────────────────────────────────────
/**
 * Cosa l'utente dichiara di voler fare, nel form contatti.
 *
 * NON è la tassonomia delle discipline. Quella (`discipline.categoria`:
 * "Mente & corpo", "Acqua", "Combat"…) descrive COME ti muovi e serve a
 * navigare il catalogo. Questa descrive COSA compri e PER CHI, e serve a
 * instradare il contatto: acquagym per adulti, scuola nuoto per bambini,
 * acqua nido e agonismo sono quattro conversazioni commerciali diverse, con
 * listini e referenti diversi, che nella categoria "Acqua" collassavano in una.
 *
 * Le voci e le etichette ricalcano il campo "Attività di interesse" dei
 * Typeform `infoMacerata` / `infoMonte`: chi legge i lead in arrivo continua
 * a vedere le stesse categorie di prima.
 *
 * `centri` elenca gli slug delle sedi che offrono l'attività, seguendo la
 * stessa regola dello schema dei centri: è la voce a dichiarare dove si
 * tiene, non il centro a elencare cosa ha. Vuoto = tutte le sedi.
 */
export interface VoceLead extends Voce {
  centri: readonly string[];
  /** Mappatura dedotta dai servizi di sede, non confermata dallo staff. */
  daRivedere?: boolean;
}

export const interessiLead = [
  {
    id: 'fitness',
    label: 'Fitness (sala pesi e corsi)',
    centri: ['macerata', 'montecassiano'],
  },
  {
    id: 'reformer',
    label: 'Reformer / Wellback System',
    centri: ['macerata', 'montecassiano'],
  },
  {
    id: 'crossfit',
    label: 'CrossFit',
    centri: ['macerata', 'montecassiano'],
  },
  {
    id: 'personal-trainer',
    label: 'Personal trainer',
    centri: ['macerata', 'montecassiano'],
  },
  {
    id: 'acqua-adulti',
    label: 'Attività in acqua adulti',
    centri: ['macerata', 'montecassiano'],
  },
  {
    id: 'scuola-nuoto-bambini',
    label: 'Scuola nuoto bambini',
    centri: ['macerata', 'montecassiano'],
  },
  {
    id: 'acqua-nido',
    label: 'Acqua nido',
    centri: ['macerata', 'montecassiano'],
    daRivedere: true,
  },
  {
    id: 'agonismo-nuoto',
    label: 'Agonismo nuoto',
    centri: ['macerata', 'montecassiano'],
    daRivedere: true,
  },
] as const satisfies readonly VoceLead[];

/** Interessi offerti da una sede. Slug sconosciuto o senza mappatura = tutti. */
export function interessiDelCentro(slug?: string): readonly VoceLead[] {
  if (!slug) return interessiLead;
  // `as const` restringe `centri` all'unione dei letterali presenti, quindi
  // il confronto con uno slug arbitrario va allargato a readonly string[].
  const suMisura = interessiLead.filter((v) => (v.centri as readonly string[]).includes(slug));
  return suMisura.length > 0 ? suMisura : interessiLead;
}
