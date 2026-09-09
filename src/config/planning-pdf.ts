/**
 * Il disegno del PDF del planning, condiviso da tutte le route che lo
 * emettono: il planning intero (`/planning/<centro>.pdf`) e le singole
 * sezioni (`/planning/<centro>/<sezione>.pdf`).
 *
 * Perche' un file e non la stampa del browser: questo PDF deve poter essere
 * mandato su WhatsApp e attaccato in bacheca. La stampa del browser produce
 * un risultato diverso su ogni dispositivo — margini, intestazioni con
 * l'URL, la data del sistema — e su iPhone richiede quattro passaggi che
 * molti non completano. Un file esiste una volta e chi lo riceve lo apre.
 *
 * Perche' disegnato a mano e non da un browser headless: stampare una
 * pagina richiede Chromium nella build, due minuti e trecento megabyte su
 * Netlify, per un foglio. `pdf-lib` disegna rettangoli e testo in un
 * secondo, senza browser. In cambio il layout e' codice invece di CSS —
 * accettabile per una griglia, che e' la forma piu' semplice che esista.
 *
 * Resta allineato da se': legge le stesse lezioni della pagina e la stessa
 * palette di `src/data/categorie.ts`. Quando il planning cambia dal CMS, il
 * deploy successivo rigenera tutti i PDF: non esiste il caso del PDF vecchio
 * accanto alla griglia nuova.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { getCollection } from 'astro:content';
import { lezioniValide, perSlot, slotDi, giorniDi, type Lezione } from './planning';
import { CATEGORIE, SENZA_CATEGORIA, categoriaDiNome } from '../data/categorie';

/** Mappa disciplina → categoria, costruita dalla route sulla collection. */
export type MappaCategorie = Map<string, (typeof CATEGORIE)[number] | typeof SENZA_CATEGORIA>;

/** La categoria di ogni disciplina, per il colore delle tessere. */
export async function categorieDiscipline(): Promise<MappaCategorie> {
  const discipline = await getCollection('discipline');
  const catDi: MappaCategorie = new Map();
  for (const d of discipline) {
    catDi.set(d.id, categoriaDiNome(d.data.categoria) ?? SENZA_CATEGORIA);
  }
  return catDi;
}

/** Da `#RRGGBB` al colore di pdf-lib. */
function colore(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/**
 * Accorcia un testo perché stia in `larghezza`, con i puntini se serve.
 *
 * Misurato col font vero e non a caratteri: "IntensitYOU" e "lllllllllll"
 * hanno lo stesso numero di lettere e larghezze molto diverse, e un taglio a
 * conteggio fisso lascia metà delle tessere con lo spazio sbagliato.
 */
function accorcia(testo: string, font: PDFFont, corpo: number, larghezza: number): string {
  if (font.widthOfTextAtSize(testo, corpo) <= larghezza) return testo;
  let t = testo;
  while (t.length > 1 && font.widthOfTextAtSize(t + '…', corpo) > larghezza) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

/**
 * Disegna il planning e restituisce i byte del PDF. `titolo` e' la riga
 * principale dell'intestazione ("Planning Lume Macerata", con "— In acqua"
 * per le sezioni): le route la compongono, qui non si indovina.
 */
export async function generaPlanningPdf(opts: {
  titolo: string;
  planningAggiornatoIl?: string | null;
  planningNota?: string | null;
  lezioni: Lezione[];
  catDi: MappaCategorie;
}): Promise<Uint8Array> {
  const lezioni = lezioniValide(opts.lezioni);
  const slot = slotDi(lezioni);
  const mappa = perSlot(lezioni);
  const giorni = giorniDi(lezioni);
  const { catDi } = opts;

  const pdf = await PDFDocument.create();
  pdf.setTitle(opts.titolo);
  pdf.setSubject('Orario settimanale dei corsi');
  pdf.setCreator('lumefitness.it');

  const grassetto = await pdf.embedFont(StandardFonts.HelveticaBold);
  const normale = await pdf.embedFont(StandardFonts.Helvetica);

  // ─── Geometria ──────────────────────────────────────────────────────────
  // A4 orizzontale. L'altezza della pagina la decide il palinsesto: Macerata
  // ha 26 fasce e non entra in un foglio, quindi il documento cresce in
  // pagine invece di rimpicciolire il testo fino a renderlo inutile.
  const L = 842;
  const H = 595;
  const MARGINE = 28;
  const ORA_W = 42;
  const CORPO = 6.5;
  const RIGA_MIN = 15;

  const gridX = MARGINE + ORA_W;
  const gridW = L - MARGINE - gridX;
  const colW = gridW / giorni.length;

  /** Altezza di una riga: la decide la casella più piena della fascia. */
  const altezzaRiga = (inizio: string) => {
    let max = 1;
    for (const g of giorni) max = Math.max(max, (mappa.get(g.n + '|' + inizio) || []).length);
    return Math.max(RIGA_MIN, max * 13 + (max - 1) * 2 + 4);
  };

  const NERO = rgb(0.09, 0.09, 0.09);
  const GRIGIO = rgb(0.45, 0.45, 0.45);
  const LINEA = rgb(0.86, 0.86, 0.86);
  const ROSSO = colore('#C40042');

  /**
   * Solo le categorie che questo orario usa.
   *
   * Una legenda con otto voci di cui tre non compaiono nella griglia fa
   * cercare un colore che non c'e'. Montecassiano non ha il Combat: sulla sua
   * legenda il Combat non deve esistere.
   */
  const usate = CATEGORIE.filter((c) =>
    lezioni.some((l) => l.disciplina && catDi.get(l.disciplina)?.id === c.id),
  );

  /** Altezza riservata in fondo a ogni pagina per la legenda. */
  const PIE = usate.length ? 30 : 6;

  /**
   * La legenda va in fondo a **ogni** pagina, non solo all'ultima.
   *
   * Il primo taglio la metteva una volta sola, alla fine: chi stampa o manda
   * su WhatsApp la sola pagina dei corsi del mattino si ritrova sei colori
   * senza sapere cosa significano. Ripeterla costa trenta punti di altezza per
   * pagina e rende ogni foglio autosufficiente, che e' il punto di un PDF.
   */
  const disegnaLegenda = (pg: PDFPage) => {
    if (!usate.length) return;
    let lx = MARGINE;
    const ly = MARGINE + 6;
    pg.drawText('I COLORI', { x: lx, y: ly + 13, size: 6.5, font: grassetto, color: GRIGIO });
    for (const c of usate) {
      const w = normale.widthOfTextAtSize(c.nome, 7) + 22;
      if (lx + w > L - MARGINE) break; // Non si va a capo: sta su una riga o si taglia.
      pg.drawRectangle({ x: lx, y: ly - 1, width: 8, height: 8, color: colore(c.stampa) });
      pg.drawText(c.nome, { x: lx + 12, y: ly, size: 7, font: normale, color: NERO });
      lx += w;
    }
  };

  let pagina: PDFPage = pdf.addPage([L, H]);
  let y = 0;

  /** Intestazione della pagina: titolo alla prima, colonne su tutte. */
  const apriPagina = (prima: boolean) => {
    y = H - MARGINE;

    if (prima) {
      pagina.drawText('Lume', { x: MARGINE, y: y - 14, size: 17, font: grassetto, color: NERO });
      pagina.drawText('.', {
        x: MARGINE + grassetto.widthOfTextAtSize('Lume', 17),
        y: y - 14,
        size: 17,
        font: grassetto,
        color: ROSSO,
      });
      pagina.drawText(opts.titolo, {
        x: MARGINE + 62,
        y: y - 13,
        size: 13,
        font: grassetto,
        color: NERO,
      });

      const sotto = [
        opts.planningAggiornatoIl
          ? `Aggiornato il ${new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' }).format(new Date(opts.planningAggiornatoIl))}`
          : '',
        'lumefitness.it',
      ]
        .filter(Boolean)
        .join('   ·   ');
      pagina.drawText(sotto, { x: MARGINE, y: y - 28, size: 7.5, font: normale, color: GRIGIO });

      if (opts.planningNota) {
        pagina.drawText(accorcia(opts.planningNota, normale, 7.5, gridW), {
          x: MARGINE,
          y: y - 41,
          size: 7.5,
          font: normale,
          color: ROSSO,
        });
        y -= 13;
      }
      y -= 50;
    } else {
      pagina.drawText(`${opts.titolo} — continua`, {
        x: MARGINE,
        y: y - 10,
        size: 9,
        font: grassetto,
        color: NERO,
      });
      y -= 24;
    }

    // Intestazione dei giorni
    for (let i = 0; i < giorni.length; i++) {
      pagina.drawText(giorni[i].nome.toUpperCase(), {
        x: gridX + i * colW + 3,
        y: y - 8,
        size: 7.5,
        font: grassetto,
        color: NERO,
      });
    }
    y -= 14;
    pagina.drawLine({
      start: { x: MARGINE, y },
      end: { x: L - MARGINE, y },
      thickness: 0.8,
      color: NERO,
    });
    y -= 2;

    disegnaLegenda(pagina);
  };

  apriPagina(true);

  // ─── Le righe ───────────────────────────────────────────────────────────

  for (const s of slot) {
    const h = altezzaRiga(s.inizio);
    if (y - h < MARGINE + PIE) {
      pagina = pdf.addPage([L, H]);
      apriPagina(false);
    }

    if (s.stacco) {
      y -= 5;
      pagina.drawLine({
        start: { x: MARGINE, y: y + 2 },
        end: { x: L - MARGINE, y: y + 2 },
        thickness: 0.5,
        color: LINEA,
      });
    }

    pagina.drawText(s.inizio, {
      x: MARGINE,
      y: y - 10,
      size: 7.5,
      font: grassetto,
      color: NERO,
    });

    for (let i = 0; i < giorni.length; i++) {
      const voci = mappa.get(giorni[i].n + '|' + s.inizio) || [];
      let ty = y - 2;
      for (const l of voci) {
        const cat = (l.disciplina && catDi.get(l.disciplina)) || SENZA_CATEGORIA;
        const x = gridX + i * colW + 1;
        const w = colW - 3;

        pagina.drawRectangle({
          x,
          y: ty - 12,
          width: w,
          height: 12,
          color: colore(cat.stampa),
        });

        const nome = accorcia(l.corso, grassetto, CORPO, w - 24);
        pagina.drawText(nome, {
          x: x + 3,
          y: ty - 8.5,
          size: CORPO,
          font: grassetto,
          color: rgb(1, 1, 1),
        });
        // L'orario di fine a destra dentro la tessera: la fascia dice quando
        // comincia, non quanto dura, e mezz'ora o un'ora cambiano la giornata.
        const fine = l.fine;
        pagina.drawText(fine, {
          x: x + w - normale.widthOfTextAtSize(fine, 5.5) - 3,
          y: ty - 8.5,
          size: 5.5,
          font: normale,
          color: rgb(1, 1, 1),
        });
        ty -= 14;
      }
    }

    y -= h;
    pagina.drawLine({
      start: { x: MARGINE, y: y + 1 },
      end: { x: L - MARGINE, y: y + 1 },
      thickness: 0.4,
      color: LINEA,
    });
  }

  return pdf.save();
}

/**
 * Dai byte di pdf-lib a una Response.
 *
 * `save()` restituisce una `Uint8Array` il cui `buffer` TypeScript tipizza
 * come `ArrayBufferLike`, che comprende `SharedArrayBuffer` e quindi non e'
 * un corpo di risposta valido. Si copia in un `ArrayBuffer` dichiarato: due
 * righe, e il tipo non ha piu' nulla da obiettare.
 */
export function rispostaPdf(bytes: Uint8Array, filename: string): Response {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Response(new Blob([buffer], { type: 'application/pdf' }), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  });
}
