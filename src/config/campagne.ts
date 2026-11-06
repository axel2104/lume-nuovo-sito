/**
 * Banner per campagna: chi arriva da un link con `utm_campaign` conosciuto
 * (QR su roll-up, folding screen, ecc.) vede il banner di quella campagna.
 * Per aggiungerne una basta una riga qui: nessun altro file da toccare.
 *
 * La chiave è `utm_campaign`; con `medium` si restringe a un supporto preciso
 * (es. lo stesso `valdichienti` su Instagram può avere un testo diverso).
 * `fine` (AAAA-MM-GG) spegne il banner da sola dopo quella data.
 */
export interface Campagna {
  /** Se presente, il banner compare solo con questo utm_medium. */
  medium?: string;
  titolo: string;
  testo: string;
  cta: { label: string; href: string };
  cta2?: { label: string; href: string };
  fine?: string;
}

export const campagne: Record<string, Campagna[]> = {
  // QR del roll-up generale (stampa / rollup)
  generale: [
    {
      medium: 'rollup',
      titolo: 'Conoscersi per stare meglio. Ogni giorno.',
      testo: 'Sala pesi, corsi, piscina e Reformer: prova Lume gratis per una settimana.',
      cta: { label: 'Prova gratis', href: '/prova' },
      cta2: { label: 'Scopri i centri', href: '/centri' },
    },
  ],
  // QR del folding screen (stampa / foldingscreen)
  valdichienti: [
    {
      medium: 'foldingscreen',
      titolo: 'Lume Val di Chienti, a Piediripa',
      testo: 'Scopri il nuovo centro e prova Lume gratis per una settimana.',
      cta: { label: 'Scopri Piediripa', href: '/centri/piediripa' },
      cta2: { label: 'Prova gratis', href: '/prova' },
    },
  ],
};
