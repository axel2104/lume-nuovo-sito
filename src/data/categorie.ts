/**
 * I colori delle categorie di disciplina.
 *
 * Sono l'unica fonte: li usa la griglia in pagina e li usa il PDF. Se stessero
 * scritti due volte, il planning stampato e quello sullo schermo comincerebbero
 * a dire cose diverse dello stesso corso — ed è il tipo di divergenza che
 * nessuno nota finché un cliente non se ne accorge in reception.
 *
 * ─── Come sono scelti ─────────────────────────────────────────────────────
 *
 * Otto tinte tenute distanti in tonalità, non otto varianti di tre colori.
 * Ogni colore ha una versione **piena** per il PDF, che si stampa su carta
 * bianca, e una versione **su fondo scuro** per il sito: lo stesso ciano che
 * legge bene sul bianco, sul nero perde metà del contrasto.
 *
 * Il colore non è mai l'unica informazione. Nella griglia ogni tessera porta
 * anche il nome del corso, e nel PDF c'è la legenda: chi confonde rosso e
 * verde — una persona su dodici fra gli uomini — non deve dipendere dalla
 * tinta per capire cosa sta guardando. Per questo non ho cercato una palette
 * "a prova di daltonismo" a tutti i costi: con otto categorie non esiste, e
 * fingere che esista è peggio che affiancare al colore una parola.
 */

export interface Categoria {
  /** Il valore esatto nel campo `categoria` delle discipline. */
  nome: string;
  /** Slug per l'attributo `data-cat` e per le classi CSS. */
  id: string;
  /** Tinta per il sito, sul fondo scuro. */
  schermo: string;
  /** Tinta piena per il PDF, su carta bianca. */
  stampa: string;
  /** Colore del testo sopra la tinta di stampa. */
  testoStampa: '#fff' | '#111';
}

export const CATEGORIE: readonly Categoria[] = [
  {
    nome: 'Acqua',
    id: 'acqua',
    schermo: '#2E9CC4',
    stampa: '#1B7FA6',
    testoStampa: '#fff',
  },
  {
    nome: 'Mente & corpo',
    id: 'mente-corpo',
    schermo: '#8B7BD8',
    stampa: '#6B5BC4',
    testoStampa: '#fff',
  },
  {
    nome: 'Forza & tono',
    id: 'forza-tono',
    schermo: '#D9843C',
    stampa: '#B8651F',
    testoStampa: '#fff',
  },
  {
    nome: 'Cardio & resistenza',
    id: 'cardio',
    schermo: '#D4B03A',
    stampa: '#A88A1E',
    testoStampa: '#fff',
  },
  {
    nome: 'Funzionale & atletico',
    id: 'funzionale',
    schermo: '#5FA855',
    stampa: '#3D8033',
    testoStampa: '#fff',
  },
  {
    nome: 'Combat',
    id: 'combat',
    schermo: '#CE4B45',
    stampa: '#B02F29',
    testoStampa: '#fff',
  },
  {
    nome: 'Reformer & postura',
    id: 'reformer',
    schermo: '#C86FA0',
    stampa: '#A84B7F',
    testoStampa: '#fff',
  },
  {
    // Blu e non il grigio-azzurro di prima: quello si confondeva col grigio
    // delle lezioni senza categoria, e una tessera colorata che sembra
    // scolorita è peggio di una scolorita.
    nome: 'Danza',
    id: 'danza',
    schermo: '#5573D6',
    stampa: '#3A57B8',
    testoStampa: '#fff',
  },
] as const;

/** Categoria per nome esatto, `undefined` se il nome non è fra quelli noti. */
export function categoriaDiNome(nome?: string | null): Categoria | undefined {
  if (!nome) return undefined;
  return CATEGORIE.find((c) => c.nome === nome);
}

/**
 * Colore di ripiego per una lezione senza categoria riconosciuta.
 *
 * Grigio neutro e non un colore della palette: una tessera senza categoria
 * deve **sembrare** senza categoria, non essere confusa con la Danza. Succede
 * quando una lezione del planning non è collegata a nessuna disciplina, che è
 * il caso dei corsi ancora da schedare.
 */
export const SENZA_CATEGORIA = {
  id: 'nessuna',
  schermo: '#4A4A4A',
  stampa: '#8A8A8A',
  testoStampa: '#fff' as const,
};

/**
 * Le regole CSS della palette, da iniettare una volta nella pagina del planning.
 *
 * Generate da qui e non scritte in `planning.css` perché queste stesse tinte
 * le disegna il PDF: se stessero in un foglio di stile, il giorno che si
 * cambia un colore il planning stampato resterebbe indietro senza che nessuno
 * lo noti. Il foglio di stile sa *come* usare `--cat`; quale sia il valore lo
 * decide questo file.
 */
export function cssCategorie(): string {
  const regole = [...CATEGORIE, SENZA_CATEGORIA].map(
    (c) => `.pl-lez.cat-${c.id}{--cat:${c.schermo}}`,
  );
  return regole.join('');
}
