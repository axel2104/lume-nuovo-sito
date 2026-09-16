import type { APIRoute } from 'astro';
import { getEntry, render } from 'astro:content';

/**
 * Le condizioni generali servite a pezzi, un oggetto per punto numerato.
 *
 * Serve a un assistente che deve rispondere "quanto preavviso per disdire?"
 * citando il punto giusto: l'HTML della pagina non va bene, perché andrebbe
 * ripulito a ogni richiesta e perderebbe gli ancoraggi. Qui ogni chunk ha già
 * il suo `url`, quindi la risposta può linkare il punto esatto invece della
 * pagina intera.
 *
 * Il taglio è per `###` (il punto: 6.10, 2.3) e non per `##` (la sezione):
 * una sezione intera è troppo grande per stare in un contesto insieme ad
 * altre, un punto è l'unità che una persona effettivamente cita.
 */

const SITO = 'https://www.lumefitness.it';

export const GET: APIRoute = async () => {
  const entry = await getEntry('legale', 'regolamento');
  if (!entry) return new Response('regolamento non trovato', { status: 500 });

  // Gli slug vengono da Astro, gli stessi che finiscono negli id della pagina:
  // ricalcolarli qui vorrebbe dire tenere allineate due slugificazioni.
  //
  // La chiave passa per `normale()` perche' il markdown renderizzato applica
  // smartypants: nel sorgente il titolo e' "2.1 ... dell'inadempimento" con
  // l'apostrofo dritto, in `headings` e' gia' diventato "dell’inadempimento".
  // Senza normalizzare, i cinque punti con apostrofo restavano senza ancora.
  const normale = (s: string) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').trim();
  const { headings } = await render(entry);
  const slugDi = new Map(headings.map((h) => [`${h.depth}:${normale(h.text)}`, h.slug]));

  const righe = entry.body?.split('\n') ?? [];
  const chunks: {
    id: string;
    sezione: string;
    titolo: string;
    url: string;
    testo: string;
  }[] = [];

  let sezione = '';
  let corrente: (typeof chunks)[number] | null = null;
  const buffer: string[] = [];

  const chiudi = () => {
    if (!corrente) return;
    corrente.testo = buffer.join('\n').trim();
    if (corrente.testo) chunks.push(corrente);
    buffer.length = 0;
  };

  for (const riga of righe) {
    const h2 = riga.match(/^##\s+(.*)$/);
    const h3 = riga.match(/^###\s+(.*)$/);

    if (h2) {
      chiudi();
      corrente = null;
      sezione = h2[1].trim();
      continue;
    }
    if (h3) {
      chiudi();
      const titolo = h3[1].trim();
      const slug = slugDi.get(`3:${normale(titolo)}`) ?? '';
      corrente = {
        // "6.10" dal titolo del punto: è la chiave con cui lo si cita a voce.
        id: titolo.match(/^[\d.]+/)?.[0]?.replace(/\.$/, '') ?? slug,
        sezione,
        titolo,
        url: `${SITO}/regolamento#${slug}`,
        testo: '',
      };
      continue;
    }
    if (corrente) buffer.push(riga);
  }
  chiudi();

  // Una sezione senza punti numerati (la 13, l'elenco delle clausole approvate)
  // andrebbe persa dal ciclo sopra: la si recupera come chunk unico.
  for (const h of headings.filter((h) => h.depth === 2)) {
    const titolo = normale(h.text);
    if (chunks.some((c) => normale(c.sezione) === titolo)) continue;
    const da = righe.findIndex((r) => normale(r.trim()) === `## ${titolo}`);
    if (da < 0) continue;
    const a = righe.findIndex((r, i) => i > da && /^##\s/.test(r));
    const testo = righe
      .slice(da + 1, a < 0 ? undefined : a)
      .join('\n')
      .trim();
    if (testo) {
      chunks.push({
        id: titolo.match(/^\d+/)?.[0] ?? h.slug,
        sezione: titolo,
        titolo,
        url: `${SITO}/regolamento#${h.slug}`,
        testo,
      });
    }
  }

  const d = entry.data;
  const body = {
    documento: d.titolo,
    societa: d.societa,
    sede: d.sede,
    piva: d.piva,
    revisione: d.revisione,
    stagione: d.stagione,
    aggiornato: d.aggiornato.toISOString().slice(0, 10),
    sostituisce: d.sostituisce,
    url: `${SITO}/regolamento`,
    punti: chunks.length,
    contenuto: chunks,
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Il documento cambia di rado, ma quando cambia è per motivi legali:
      // un'ora di cache è il compromesso fra costo e ritardo di propagazione.
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
