/**
 * Il PDF di una singola sezione del planning:
 * `/planning/<centro>/<sezione>.pdf` (es. `/planning/montecassiano/in-acqua.pdf`).
 *
 * Nasce per chi vuole appendere in bacheca solo il proprio box o solo la
 * vasca: il PDF intero di Montecassiano sono due pagine, la sezione "In
 * acqua" ne è metà. Le sezioni si scoprono dai contenuti (campo `sezione`
 * delle lezioni): una sezione nuova nel CMS genera il suo PDF al primo
 * accesso dopo il deploy, senza toccare questa route.
 *
 * Lo slug dell'URL lo decide `slugSezione` in `src/config/planning.ts`, la
 * stessa funzione che la pagina usa per linkare questi PDF.
 *
 * Come la route del planning intero, accetta `?corso=` e/o `?sala=` per la
 * vista filtrata: il filtro agisce dentro la sezione, mai sul planning
 * completo — chi ha filtrato "In acqua" per un corso non vuole trovarci il
 * CrossFit.
 */
import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { lezioniValide, slugSezione, type Lezione } from '../../../config/planning';
import { generaPlanningPdf, rispostaPdf, categorieDiscipline } from '../../../config/planning-pdf';

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

  // La sezione si risolve dallo slug dell'URL al titolo così com'è scritto
  // nei contenuti: è quel titolo che finisce nell'intestazione del PDF.
  const tutte = lezioniValide(dati.planning ?? []);
  const titoloSezione = [...new Set(tutte.map((l) => (l.sezione ?? '').trim()))]
    .filter(Boolean)
    .find((s) => slugSezione(s) === params.sezione);
  if (!titoloSezione) return new Response('Sezione sconosciuta', { status: 404 });

  const corso = (url.searchParams.get('corso') ?? '').trim();
  const sala = (url.searchParams.get('sala') ?? '').trim();

  let lezioni = tutte.filter((l) => (l.sezione ?? '').trim() === titoloSezione);
  if (corso) lezioni = lezioni.filter((l) => l.corso === corso);
  if (sala) lezioni = lezioni.filter((l) => (l.sala ?? '') === sala);

  // Un filtro a vuoto non deve produrre un PDF vuoto che sembra valido.
  if (!lezioni.length) return new Response('Nessuna lezione per questo filtro', { status: 404 });

  const filtro = [corso, sala].filter(Boolean).join(' · ');
  const titolo = filtro
    ? `Planning ${dati.nome} — ${titoloSezione} — ${filtro}`
    : `Planning ${dati.nome} — ${titoloSezione}`;
  const suffisso = filtro ? '-' + slugSezione(filtro) : '';

  const bytes = await generaPlanningPdf({
    titolo,
    planningAggiornatoIl: dati.planningAggiornatoIl,
    planningNota: dati.planningNota,
    lezioni,
    catDi: await categorieDiscipline(),
  });

  return rispostaPdf(bytes, `planning-${centro.id}-${slugSezione(titoloSezione)}${suffisso}.pdf`);
};
