/**
 * Tour virtuale 360° per centro, chiave = slug del centro.
 * Le immagini equirettangolari stanno in public/tour/<slug>/NN.jpg
 * (8192×4096). L'ordine qui è l'ordine del percorso: dall'ingresso in poi.
 */
export const TOUR: Record<string, { titolo: string; scene: { file: string; nome: string }[] }> = {
  urban: {
    titolo: 'Fai un giro dentro Urban',
    scene: [
      { file: '01', nome: 'Ingresso' },
      { file: '02', nome: 'Lounge' },
      { file: '07', nome: 'Corridoio' },
      { file: '03', nome: 'Sala corsi' },
      { file: '04', nome: 'Connettivo' },
      { file: '05', nome: 'Spogliatoio' },
      { file: '08', nome: 'Spogliatoio · zona specchi' },
      { file: '06', nome: 'Servizi' },
      { file: '09', nome: 'Accesso area allenamento' },
      { file: '10', nome: 'Area allenamento 1' },
      { file: '11', nome: 'Area allenamento 2' },
      { file: '12', nome: 'Area allenamento 3' },
    ],
  },
};
