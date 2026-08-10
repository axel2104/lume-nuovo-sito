import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  categorieEventi,
  categorieHelpdesk,
  categorieNews,
  iconeServizi,
  idDi,
} from './data/tassonomie';

// ─── Centri ──────────────────────────────────────────────────────────────
const centri = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/centri' }),
  schema: z.object({
    nome: z.string(),
    citta: z.string(),
    stato: z.enum(['aperto', 'prevendita', 'prossima-apertura']),
    ordine: z.number().default(99),
    indirizzo: z.string().optional(),
    telefono: z.string().optional(),
    email: z.string().optional(),
    coordinate: z.object({ lat: z.number(), lng: z.number() }).optional(),
    orari: z
      .object({ feriali: z.string(), sabato: z.string(), domenica: z.string() })
      .optional(),
    discipline: z.array(z.string()).default([]),
    servizi: z.array(z.string()).default([]),
    immagine: z.string().optional(),
    perfectgymUrl: z.string().default('#'),
    // Planning virtuale per sede (lo costruiamo insieme in seguito)
    planning: z
      .array(
        z.object({
          giorno: z.string(),
          slot: z.array(
            z.object({ ora: z.string(), corso: z.string(), sala: z.string().optional() }),
          ),
        }),
      )
      .default([]),
  }),
});

// ─── Discipline / attività ───────────────────────────────────────────────
const discipline = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/discipline' }),
  schema: z.object({
    nome: z.string(),
    categoria: z.string(),
    difficolta: z.number().min(1).max(5), // slider difficoltà
    intensita: z.number().min(1).max(5).optional(), // slider intensità
    durata: z.number().optional(), // minuti
    breve: z.string(), // descrizione breve
    immagine: z.string().optional(),
    video: z.string().optional(), // video loop (AWS S3/CloudFront)
    centri: z.array(z.string()).default([]),
    ordine: z.number().default(99),
  }),
});

// ─── News ────────────────────────────────────────────────────────────────
// Il corpo Markdown del file è il testo dell'articolo.
const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    titolo: z.string(),
    data: z.coerce.date(),
    categoria: z.enum(idDi(categorieNews)),
    sintesi: z.string(), // anteprima nella card
    immagine: z.string(),
    immagineAlt: z.string(),
    autore: z.string().optional(),
    /** Slug dei centri a cui la news si riferisce. Vuoto = riguarda tutti. */
    centri: z.array(z.string()).default([]),
    inEvidenza: z.boolean().default(false),
    pubblicato: z.boolean().default(true),
    // Il bottone in fondo all'articolo appare solo se ci sono entrambi.
    ctaLabel: z.string().optional(),
    ctaHref: z.string().optional(),
  }),
});

// ─── Eventi ──────────────────────────────────────────────────────────────
const eventi = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/eventi' }),
  schema: z.object({
    titolo: z.string(),
    data: z.coerce.date(),
    ora: z.string().optional(), // es. "18:30"
    categoria: z.enum(idDi(categorieEventi)),
    descrizione: z.string(),
    luogo: z.string().optional(),
    /** Slug del centro che ospita l'evento. */
    centro: z.string().optional(),
    immagine: z.string().optional(),
    iscrizioniHref: z.string().optional(),
    postiLimitati: z.boolean().default(false),
    pubblicato: z.boolean().default(true),
  }),
});

// ─── Help desk ───────────────────────────────────────────────────────────
const helpdesk = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/helpdesk' }),
  schema: z.object({
    titolo: z.string(),
    categoria: z.enum(idDi(categorieHelpdesk)),
    sintesi: z.string(),
    tags: z.array(z.string()).default([]),
    aggiornato: z.coerce.date(),
    ordine: z.number().default(99),
    pubblicato: z.boolean().default(true),
  }),
});

// ─── Servizi e partner ───────────────────────────────────────────────────
const servizi = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/servizi' }),
  schema: z.object({
    titolo: z.string(),
    ordine: z.number().default(99), // posizione nella griglia
    icona: z.enum(idDi(iconeServizi)),
    breve: z.string(), // riga sotto il titolo nella card
    dettaglio: z.string(), // testo del pannello, grassetto con **doppi asterischi**
    href: z.string().optional(),
    centri: z.array(z.string()).default([]),
    pubblicato: z.boolean().default(true),
  }),
});

export const collections = { centri, discipline, news, eventi, helpdesk, servizi };
