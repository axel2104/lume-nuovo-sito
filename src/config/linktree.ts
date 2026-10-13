/**
 * Bottoni della pagina /link (ex Linktree). L'unico posto da modificare per
 * aggiungere, togliere o riordinare un link. `slug` identifica il bottone nei
 * click registrati: non cambiarlo dopo la pubblicazione o lo storico si spezza.
 * `vid: true` = aggiunge ?vid=<id visitatore> alla destinazione (solo se il
 * visitatore ha dato il consenso), per i form esterni che lo sanno leggere.
 */
export interface LinkBottone {
  slug: string;
  label: string;
  href: string;
  evidenza?: boolean;
  vid?: boolean;
}

export const LINK_BOTTONI: LinkBottone[] = [
  { slug: 'prevendita', label: 'Prevendita — Lume Fitness Club', href: 'https://promo.lumefitness.it', evidenza: true },
  { slug: 'info', label: 'Richiedi informazioni', href: 'https://n8n.lumeflow.it/form/iscrizioni?source=Instagram&medium=LinkInBio', vid: true },
  { slug: 'planning', label: 'Il nostro planning', href: 'https://www.lumefitness.it/planning/' },
  { slug: 'lume-macerata', label: 'Lume Macerata — scopri qui', href: 'https://www.lumefitness.it/centri/macerata' },
  { slug: 'lume-montecassiano', label: 'Lume Montecassiano — scopri qui', href: 'https://www.lumefitness.it/centri/montecassiano' },
  { slug: 'sito', label: 'Lume Fitness Club – Benessere a 360', href: 'https://www.lumefitness.it/' },
  { slug: 'regole-automazione', label: 'Regole per automatizzazione', href: 'https://www.lumefitness.it/lp-istruzioni-automazione/' },
  { slug: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/lumefitnessclub' },
];
