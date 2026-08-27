/**
 * Planning di esempio — NON è l'orario reale di Lume.
 *
 * Serve a due cose e solo a quelle:
 *  1. vedere e approvare il layout in `npm run dev` prima che il collegamento a
 *     PerfectGym esista;
 *  2. avere un caso di prova con sovrapposizioni vere (tre sale che vanno alla
 *     stessa ora), che è dove una griglia scritta male si rompe.
 *
 * La pagina lo usa **solo in sviluppo** e mostra un avviso a schermo. In
 * produzione, se il centro non ha planning nei contenuti, si vede lo stato vuoto.
 * Quando l'orario vero arriva dal webhook questo file può essere cancellato.
 *
 * I nomi dei corsi puntano agli slug reali della collection `discipline`, così
 * si verifica anche che i link alle schede funzionino.
 */
import type { Lezione } from '../config/planning';

const A = 'Sala A';
const B = 'Sala Les Mills';
const R = 'Sala Reformer';
const P = 'Piscina';
const X = 'Box CrossFit';

/** Scorciatoia: giorni multipli con lo stesso orario, come nei planning veri. */
function ripeti(giorni: number[], l: Omit<Lezione, 'giorno'>): Lezione[] {
  return giorni.map((giorno) => ({ ...l, giorno }));
}

export const PLANNING_ESEMPIO: Record<string, Lezione[]> = {
  macerata: [
    // Mattina presto — chi si allena prima del lavoro
    ...ripeti([1, 3, 5], { inizio: '07:00', fine: '07:50', corso: 'Les Mills BodyPump', disciplina: 'lesmills-bodypump', sala: B, istruttore: 'Giulia' }),
    ...ripeti([2, 4], { inizio: '07:00', fine: '07:50', corso: 'Les Mills RPM', disciplina: 'lesmills-rpm', sala: B, istruttore: 'Marco' }),
    ...ripeti([1, 2, 3, 4, 5], { inizio: '07:15', fine: '08:05', corso: 'Pilates Reformer', disciplina: 'reformer', sala: R, istruttore: 'Sara' }),
    ...ripeti([1, 3, 5], { inizio: '08:00', fine: '08:50', corso: 'CrossFit', disciplina: 'crossfit', sala: X, istruttore: 'Luca' }),

    // Metà mattina
    ...ripeti([1, 2, 3, 4, 5], { inizio: '09:30', fine: '10:20', corso: 'Acquagym', disciplina: 'acquagym', sala: P, istruttore: 'Elena' }),
    ...ripeti([2, 4], { inizio: '09:30', fine: '10:30', corso: 'Pilates Matwork', disciplina: 'pilates', sala: A, istruttore: 'Sara' }),
    ...ripeti([1, 3], { inizio: '10:30', fine: '11:20', corso: 'Mobility', disciplina: 'mobility', sala: A, istruttore: 'Chiara' }),
    ...ripeti([1, 2, 3, 4, 5], { inizio: '10:30', fine: '11:20', corso: 'Acqua Walking', disciplina: 'acquawalking', sala: P, istruttore: 'Elena' }),

    // Pausa pranzo — lezioni corte
    ...ripeti([1, 2, 3, 4, 5], { inizio: '13:00', fine: '13:40', corso: 'Les Mills Core', disciplina: 'lesmills-core', sala: B, istruttore: 'Marco' }),
    ...ripeti([2, 4], { inizio: '13:00', fine: '13:45', corso: 'Reformer Express', disciplina: 'reformer', sala: R, istruttore: 'Sara' }),

    // Pomeriggio e sera — la fascia piena, con tre sale in parallelo
    ...ripeti([1, 3, 5], { inizio: '17:30', fine: '18:20', corso: 'Les Mills BodyCombat', disciplina: 'lesmills-bodycombat', sala: B, istruttore: 'Andrea' }),
    ...ripeti([1, 2, 3, 4, 5], { inizio: '17:30', fine: '18:20', corso: 'Pilates Reformer', disciplina: 'reformer', sala: R, istruttore: 'Sara' }),
    ...ripeti([1, 2, 3, 4, 5], { inizio: '17:45', fine: '18:35', corso: 'Acquabike', disciplina: 'acquabike', sala: P, istruttore: 'Elena' }),
    ...ripeti([1, 3, 5], { inizio: '18:00', fine: '19:00', corso: 'CrossFit', disciplina: 'crossfit', sala: X, istruttore: 'Luca' }),
    ...ripeti([2, 4], { inizio: '18:00', fine: '19:00', corso: 'Spartan System', disciplina: 'spartan-system', sala: X, istruttore: 'Luca' }),

    ...ripeti([1, 3], { inizio: '18:30', fine: '19:20', corso: 'Les Mills BodyPump', disciplina: 'lesmills-bodypump', sala: B, istruttore: 'Giulia' }),
    ...ripeti([2, 4], { inizio: '18:30', fine: '19:20', corso: 'IntensitYou', disciplina: 'intensityou', sala: A, istruttore: 'Chiara' }),
    ...ripeti([5], { inizio: '18:30', fine: '19:30', corso: 'Reggaeton', disciplina: 'reggaeton', sala: A, istruttore: 'Noemi' }),

    ...ripeti([1, 3, 5], { inizio: '19:30', fine: '20:20', corso: 'Les Mills BodyBalance', disciplina: 'lesmills-bodybalance', sala: B, istruttore: 'Chiara' }),
    ...ripeti([2, 4], { inizio: '19:30', fine: '20:30', corso: 'Yoga', disciplina: 'yoga', sala: A, istruttore: 'Chiara' }),
    ...ripeti([1, 2, 3, 4, 5], { inizio: '19:30', fine: '20:20', corso: 'Pilates Reformer', disciplina: 'reformer', sala: R, istruttore: 'Sara' }),
    ...ripeti([2, 4], { inizio: '20:30', fine: '21:20', corso: 'Boxing', disciplina: 'boxing-hero', sala: X, istruttore: 'Andrea' }),

    // Sabato — mattina piena, pomeriggio chiuso ai corsi
    { giorno: 6, inizio: '09:00', fine: '10:00', corso: 'CrossFit', disciplina: 'crossfit', sala: X, istruttore: 'Luca' },
    { giorno: 6, inizio: '09:30', fine: '10:20', corso: 'Les Mills BodyAttack', disciplina: 'lesmills-bodyattack', sala: B, istruttore: 'Giulia' },
    { giorno: 6, inizio: '09:30', fine: '10:20', corso: 'Pilates Reformer', disciplina: 'reformer', sala: R, istruttore: 'Sara' },
    { giorno: 6, inizio: '10:30', fine: '11:30', corso: 'Yoga in Volo', disciplina: 'yoga-in-volo', sala: A, istruttore: 'Noemi' },
    { giorno: 6, inizio: '10:30', fine: '11:20', corso: 'Acqua Fitness', disciplina: 'acquafit', sala: P, istruttore: 'Elena' },
  ],

  montecassiano: [
    ...ripeti([1, 3, 5], { inizio: '08:00', fine: '08:50', corso: 'Pilates Reformer', disciplina: 'reformer', sala: R, istruttore: 'Martina' }),
    ...ripeti([1, 2, 3, 4, 5], { inizio: '09:30', fine: '10:20', corso: 'Acquagym', disciplina: 'acquagym', sala: P, istruttore: 'Davide' }),
    ...ripeti([2, 4], { inizio: '10:00', fine: '10:50', corso: 'Walking', disciplina: 'walking', sala: A, istruttore: 'Martina' }),
    ...ripeti([1, 3], { inizio: '17:30', fine: '18:20', corso: 'Les Mills BodyPump', disciplina: 'lesmills-bodypump', sala: A, istruttore: 'Fabio' }),
    ...ripeti([1, 2, 3, 4, 5], { inizio: '17:30', fine: '18:20', corso: 'Pilates Reformer', disciplina: 'reformer', sala: R, istruttore: 'Martina' }),
    ...ripeti([2, 4], { inizio: '18:00', fine: '18:50', corso: 'Acquabike', disciplina: 'acquabike', sala: P, istruttore: 'Davide' }),
    ...ripeti([1, 3, 5], { inizio: '18:30', fine: '19:20', corso: 'Corpo Libero', disciplina: 'corpo-libero', sala: A, istruttore: 'Fabio' }),
    ...ripeti([2, 4], { inizio: '19:00', fine: '20:00', corso: 'Yoga', disciplina: 'yoga', sala: A, istruttore: 'Martina' }),
    ...ripeti([1, 2, 3, 4, 5], { inizio: '19:30', fine: '20:20', corso: 'Pilates Reformer', disciplina: 'reformer', sala: R, istruttore: 'Martina' }),
    { giorno: 6, inizio: '09:30', fine: '10:20', corso: 'Les Mills BodyBalance', disciplina: 'lesmills-bodybalance', sala: A, istruttore: 'Fabio' },
    { giorno: 6, inizio: '10:30', fine: '11:20', corso: 'Acqua Fitness', disciplina: 'acquafit', sala: P, istruttore: 'Davide' },
  ],
};
