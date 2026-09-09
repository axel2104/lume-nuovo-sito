/**
 * Il PDF del planning intero di un centro: `/planning/<centro>.pdf`.
 *
 * Il disegno sta in `src/config/planning-pdf.ts`, condiviso con la route
 * delle singole sezioni (`/planning/<centro>/<sezione>.pdf`): due disegni
 * divergerebbero al primo ritocco di layout.
 *
 * Include TUTTE le lezioni, anche quelle delle sezioni separate: chi scarica
 * il planning completo vuole il palinsesto intero, non la sola griglia
 * principale.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { lezioniValide, type Lezione } from '../../config/planning';
import { generaPlanningPdf, rispostaPdf, categorieDiscipline } from '../../config/planning-pdf';

export const getStaticPaths: GetStaticPaths = async () => {
  const centri = await getCollection('centri');
  return centri
    .filter((c) => lezioniValide(c.data.planning ?? []).length > 0)
    .map((c) => ({ params: { centro: c.id }, props: { centro: c } }));
};

export const GET: APIRoute = async ({ props }) => {
  const centro = (props as { centro: { id: string; data: Record<string, unknown> } }).centro;
  const dati = centro.data as {
    nome: string;
    planning: Lezione[];
    planningAggiornatoIl?: string | null;
    planningNota?: string | null;
  };

  const bytes = await generaPlanningPdf({
    titolo: `Planning ${dati.nome}`,
    planningAggiornatoIl: dati.planningAggiornatoIl,
    planningNota: dati.planningNota,
    lezioni: dati.planning ?? [],
    catDi: await categorieDiscipline(),
  });

  return rispostaPdf(bytes, `planning-${centro.id}.pdf`);
};
