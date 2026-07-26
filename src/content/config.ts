import { defineCollection, z } from 'astro:content';

// ─── Centri ──────────────────────────────────────────────────────────────
const centri = defineCollection({
  type: 'content',
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
  type: 'content',
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

export const collections = { centri, discipline };
