import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import homeJson from '../content/pagine/home.json';

/**
 * I dati commerciali del sito, serviti come JSON per gli assistenti.
 *
 * Nasce per la mail automatica che risponde ai lead del sito (workflow n8n
 * `lume-lead`): il modello che la scrive deve parlare SOLO di prezzi e
 * attivita' che esistono davvero, e l'unica fonte aggiornata e' questo sito.
 * Se il dato lo si copiasse nel prompt, alla prima variazione di listino la
 * mail direbbe una bugia.
 *
 * Stesso contratto di `regolamento.json.ts`: HTML no, JSON stabile si'.
 * I prezzi sono numeri; le formule di pagamento sono spiegate una volta in
 * `formule` invece che ripetute su ogni piano.
 */

const SITO = 'https://www.lumefitness.it';

export const GET: APIRoute = async () => {
  const centri = (await getCollection('centri')).sort((a, b) => a.data.ordine - b.data.ordine);
  const discipline = (await getCollection('discipline'))
    .filter((d) => !d.data.daRivedere)
    .sort((a, b) => a.data.nome.localeCompare(b.data.nome));

  const body = {
    aggiornato: new Date().toISOString().slice(0, 10),
    url: `${SITO}/listini.json`,
    formule: {
      annuale: 'Soluzione unica per 12 mesi; si puo\' pagare anche in 3 rate.',
      rate: 'Totale pagato in 12 rate con Pagodil o Pagolight.',
      mensile: 'Addebito mese per mese su carta o conto corrente.',
    },
    prova: {
      // Il pass prova e' la porta d'ingresso: il testo viene dalla home,
      // non riscritto qui, per la stessa ragione dei prezzi.
      titolo: homeJson.bandaProva.titolo,
      descrizione: homeJson.bandaProva.testo,
      url: `${SITO}/prova`,
    },
    centri: centri.map((c) => {
      const d = c.data;
      return {
        id: c.id,
        nome: d.nome,
        stato: d.stato,
        citta: d.citta,
        indirizzo: d.indirizzo,
        telefono: d.telefono ?? null,
        email: d.email ?? null,
        servizi: d.servizi,
        url: `${SITO}/centri/${c.id}`,
        planning: `${SITO}/planning/${c.id}`,
        listino: d.listino
          ? {
              nota: d.listino.nota ?? null,
              attivazione: d.listino.attivazione,
              piani: d.listino.piani.map((p) => ({
                nome: p.nome,
                per: p.per ?? null,
                attivita: p.attivita,
                annuale: p.annuale,
                rate: p.rate,
                mensile: p.mensile ?? null,
              })),
              over65: d.listino.over65 ?? null,
            }
          : null,
      };
    }),
    discipline: discipline.map((d) => ({
      nome: d.data.nome,
      categoria: d.data.categoria,
      url: `${SITO}/discipline/${d.id}`,
    })),
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // I listini cambiano a colpi di stagione: un'ora di cache basta, come
      // per il regolamento.
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
