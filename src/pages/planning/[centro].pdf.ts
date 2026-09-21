/**
 * Il PDF del planning di un centro: `/planning/<centro>.pdf`.
 *
 * Il disegno sta in `src/config/planning-pdf.ts`, condiviso con la route
 * delle singole sezioni (`/planning/<centro>/<sezione>.pdf`): due disegni
 * divergerebbero al primo ritocco di layout.
 *
 * Senza parametri esce il planning completo, con TUTTE le lezioni, anche
 * quelle delle sezioni separate: chi scarica il planning intero vuole il
 * palinsesto intero, non la sola griglia principale.
 *
 * Con `?corso=` e/o `?sala=` esce la **vista filtrata**: è il file che la
 * pagina offre quando l'utente ha un filtro attivo, e deve contenere esatto
 * le lezioni che quell'utente sta vedendo — stessa uguaglianza stretta del
 * client (`planning.client.js`), altrimenti il PDF e lo schermo raccontano
 * due orari diversi.
 *
 * La route è dinamica (`prerender = false`) proprio per i parametri: le
 * combinazioni corso×sala non sono enumerabili al build. Il PDF pieno resta
 * identico a prima: lo genera lo stesso codice, dagli stessi contenuti.
 */
import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { lezioniValide, slugSezione, type Lezione } from '../../config/planning';
import { generaPlanningPdf, rispostaPdf, categorieDiscipline } from '../../config/planning-pdf';

export const prerender = false;

export const GET: APIRoute = async ({ params, url }) => {
  const centro = await getEntry('centri', params.centro ?? '');
  if (!centro) return new Response('Centro sconosciuto', { status: 404 });

  const dati = centro.data as {
    nome: string;
    planning?: Lezione[];
    planningAggiornatoIl?: string | null;
    planningNota?: string | null;
  };

  const corso = (url.searchParams.get('corso') ?? '').trim();
  const sala = (url.searchParams.get('sala') ?? '').trim();

  let lezioni = lezioniValide(dati.planning ?? []);
  if (corso) lezioni = lezioni.filter((l) => l.corso === corso);
  if (sala) lezioni = lezioni.filter((l) => (l.sala ?? '') === sala);

  // Un filtro a vuoto non deve produrre un PDF vuoto che sembra valido.
  if (!lezioni.length) return new Response('Nessuna lezione per questo filtro', { status: 404 });

  const filtro = [corso, sala].filter(Boolean).join(' · ');
  const titolo = filtro ? `Planning ${dati.nome} — ${filtro}` : `Planning ${dati.nome}`;
  const suffisso = filtro ? '-' + slugSezione(filtro) : '';

  const bytes = await generaPlanningPdf({
    titolo,
    planningAggiornatoIl: dati.planningAggiornatoIl,
    planningNota: dati.planningNota,
    lezioni,
    catDi: await categorieDiscipline(),
  });

  return rispostaPdf(bytes, `planning-${centro.id}${suffisso}.pdf`);
};
