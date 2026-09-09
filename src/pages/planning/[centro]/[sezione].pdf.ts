/**
 * Il PDF di una singola sezione del planning:
 * `/planning/<centro>/<sezione>.pdf` (es. `/planning/macerata/crossfit.pdf`).
 *
 * Nasce per chi vuole appendere in bacheca solo il proprio box o solo la
 * vasca: il PDF intero di Montecassiano sono due pagine, la sezione "In
 * acqua" ne è metà. Le sezioni si scoprono dai contenuti (campo `sezione`
 * delle lezioni): una sezione nuova nel CMS genera il suo PDF al deploy
 * successivo, senza toccare questa route.
 *
 * Lo slug dell'URL lo decide `slugSezione` in `src/config/planning.ts`, la
 * stessa funzione che la pagina usa per linkare questi PDF.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { lezioniValide, slugSezione, type Lezione } from '../../../config/planning';
import { generaPlanningPdf, rispostaPdf, categorieDiscipline } from '../../../config/planning-pdf';

export const getStaticPaths: GetStaticPaths = async () => {
  const centri = await getCollection('centri');
  const paths = [];
  for (const c of centri) {
    const lezioni = lezioniValide(c.data.planning ?? []);
    // Le sezioni si raccolgono per titolo, così com'è scritto nei contenuti.
    const sezioni = new Map<string, Lezione[]>();
    for (const l of lezioni) {
      const s = (l.sezione ?? '').trim();
      if (!s) continue;
      const gruppo = sezioni.get(s) ?? [];
      gruppo.push(l);
      sezioni.set(s, gruppo);
    }
    for (const [titolo, ll] of sezioni) {
      paths.push({
        params: { centro: c.id, sezione: slugSezione(titolo) },
        props: { centro: c, titoloSezione: titolo, lezioni: ll },
      });
    }
  }
  return paths;
};

export const GET: APIRoute = async ({ props }) => {
  const { centro, titoloSezione, lezioni } = props as {
    centro: { id: string; data: Record<string, unknown> };
    titoloSezione: string;
    lezioni: Lezione[];
  };
  const dati = centro.data as {
    nome: string;
    planningAggiornatoIl?: string | null;
    planningNota?: string | null;
  };

  const bytes = await generaPlanningPdf({
    titolo: `Planning ${dati.nome} — ${titoloSezione}`,
    planningAggiornatoIl: dati.planningAggiornatoIl,
    planningNota: dati.planningNota,
    lezioni,
    catDi: await categorieDiscipline(),
  });

  return rispostaPdf(bytes, `planning-${centro.id}-${slugSezione(titoloSezione)}.pdf`);
};
