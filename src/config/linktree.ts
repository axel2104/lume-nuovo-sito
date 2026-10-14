/**
 * Bottoni della pagina /link (ex Linktree). L'unico posto da modificare per
 * aggiungere, togliere o riordinare un link. `slug` identifica il bottone nei
 * click registrati: non cambiarlo dopo la pubblicazione o lo storico si spezza.
 * `vid: true` = aggiunge ?vid=<id visitatore> alla destinazione (solo se il
 * visitatore ha dato il consenso), per i form esterni che lo sanno leggere.
 *
 * `formato`: 'hero' = card grande a tutta larghezza, 'meta' = card mezza larghezza
 * con foto, 'pill' = riga compatta senza foto (default).
 * `img`: foto di sfondo della card (cartella /public). `sfondo`: video di sfondo
 * della pagina che parte quando la card viene toccata o messa a fuoco.
 */
export interface LinkBottone {
  slug: string;
  label: string;
  href: string;
  sotto?: string;
  formato?: 'hero' | 'meta' | 'pill';
  img?: string;
  sfondo?: 'macerata' | 'montecassiano';
  evidenza?: boolean;
  vid?: boolean;
}

// Video di sfondo (3,6 MB l'uno). Il video di Urban pesa 113 MB: non va usato qui.
export const SFONDI = {
  macerata: 'https://pub-90d4a80741cd4aadb6d995599fefc986.r2.dev/site/macerata-drone.mp4',
  montecassiano: 'https://pub-90d4a80741cd4aadb6d995599fefc986.r2.dev/site/montecassiano-drone.mp4',
} as const;

export const LINK_BOTTONI: LinkBottone[] = [
  { slug: 'prevendita', label: 'Prevendita', sotto: 'Entra prima degli altri a Lume Fitness Club', href: 'https://promo.lumefitness.it', formato: 'hero', img: '/media/gym1.jpg', evidenza: true },
  { slug: 'info', label: 'Richiedi informazioni', sotto: 'Ti rispondiamo noi, senza impegno', href: 'https://n8n.lumeflow.it/form/iscrizioni?source=Instagram&medium=LinkInBio', formato: 'hero', img: '/media/pt.jpg', vid: true },
  { slug: 'lume-macerata', label: 'Macerata', sotto: 'Scopri il centro', href: 'https://www.lumefitness.it/centri/macerata', formato: 'meta', img: '/media/weights.jpg', sfondo: 'macerata' },
  { slug: 'lume-montecassiano', label: 'Montecassiano', sotto: 'Scopri il centro', href: 'https://www.lumefitness.it/centri/montecassiano', formato: 'meta', img: '/media/cardio.jpg', sfondo: 'montecassiano' },
  { slug: 'lume-urban', label: 'Urban', sotto: 'Il centro nel cuore di Macerata', href: 'https://www.lumefitness.it/centri/urban', formato: 'hero', img: '/media/urban.jpg' },
  { slug: 'planning', label: 'Il nostro planning', sotto: 'Corsi e orari della settimana', href: 'https://www.lumefitness.it/planning/', formato: 'hero', img: '/media/crossfit.jpg' },
  { slug: 'sito', label: 'Lume Fitness Club – Benessere a 360', href: 'https://www.lumefitness.it/' },
  { slug: 'regole-automazione', label: 'Regole per automatizzazione', href: 'https://www.lumefitness.it/lp-istruzioni-automazione/' },
  { slug: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/lumefitnessclub' },
];
