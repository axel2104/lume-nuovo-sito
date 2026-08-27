import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  categorieEventi,
  categorieHelpdesk,
  categorieNews,
  iconeServizi,
  idDi,
  vociAbbonamento,
} from './data/tassonomie';

// ─── Centri ──────────────────────────────────────────────────────────────
const centri = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/centri' }),
  // `image()` risolve il percorso relativo in metadati veri (dimensioni,
  // formato): è ciò che permette ad Astro di generare le varianti e di
  // scrivere width/height, evitando il salto di layout al caricamento.
  schema: ({ image }) => z.object({
    nome: z.string(),
    citta: z.string(),
    stato: z.enum(['aperto', 'prevendita', 'prossima-apertura']),
    ordine: z.number().default(99),
    indirizzo: z.string().nullish(),
    telefono: z.string().nullish(),
    email: z.string().nullish(),
    coordinate: z.object({ lat: z.number(), lng: z.number() }).nullish(),
    orari: z
      .object({ feriali: z.string(), sabato: z.string(), domenica: z.string() })
      .nullish(),
    // Le discipline di un centro NON si elencano qui: ogni disciplina dichiara
    // in quali centri si tiene (campo `centri`), ed è quella l'unica fonte.
    // Una seconda lista qui divergerebbe al primo corso aggiunto.
    servizi: z.array(z.string()).default([]),
    immagine: image().nullish(),
    perfectgymUrl: z.string().default('#'),
    /**
     * Event type Cal.com della sede, senza dominio: `lume-macerata/visita`.
     *
     * Uno per tipo di appuntamento, perché durata e disponibilità sono diverse
     * (una visita guidata non è una telefonata). Sono nullish: se mancano, i
     * form registrano il lead e mostrano "ti contattiamo noi" invece di un
     * calendario rotto — un lead senza appuntamento vale comunque, un embed
     * vuoto no.
     */
    calcom: z
      .object({
        visita: z.string().nullish(),
        richiamata: z.string().nullish(),
      })
      .nullish(),
    /** Portale PerfectGym con l'elenco corsi prenotabili di questa sede. */
    perfectgymCorsiUrl: z.string().nullish(),

    /**
     * Planning: la **settimana tipo** della sede, non un calendario di date.
     *
     * È l'ultimo orario noto e fa da fondo pagina: la pagina lo mostra subito,
     * poi il browser prova ad aggiornarlo dal webhook n8n collegato a
     * PerfectGym. Se il webhook non risponde resta visibile questo — meglio
     * l'orario di ieri che una pagina vuota. Vedi `docs/PLANNING.md`.
     *
     * Lista piatta e non raggruppata per giorno: si edita meglio (anche da
     * Keystatic) ed è la stessa forma che restituisce il webhook, quindi il
     * componente non deve conoscere due strutture.
     */
    planning: z
      .array(
        z.object({
          /**
           * 1 = lunedì … 7 = domenica.
           *
           * `coerce` perché la tendina di Keystatic scrive "1" e non 1: senza
           * questo, un planning compilato dall'editor farebbe fallire la build
           * con un errore di tipo su un campo che a schermo sembrava giusto.
           */
          giorno: z.coerce.number().int().min(1).max(7),
          inizio: z.string(), // "07:00"
          fine: z.string(), // "07:50"
          corso: z.string(),
          /** Slug della collection `discipline`: rende la lezione cliccabile. */
          disciplina: z.string().nullish(),
          sala: z.string().nullish(),
          istruttore: z.string().nullish(),
          prenotabile: z.boolean().default(true),
        }),
      )
      .default([]),
    /**
     * Avviso mostrato sopra il planning, quando serve dire qualcosa sull'orario
     * prima che lo si legga: "stagione 26/27 provvisoria", "chiusura estiva",
     * "dal 15 settembre cambia".
     *
     * Vuoto = nessun avviso. Vive nei contenuti e non nel codice perché è il
     * tipo di frase che va messa e tolta in giornata, e se per toglierla serve
     * un deploy resta su per mesi.
     */
    planningNota: z.string().nullish(),
    /**
     * Ultimo aggiornamento del planning qui sopra, come stringa ISO.
     *
     * Accetta anche un `Date` perché YAML interpreta `2026-08-27` senza apici
     * come una data, ed è esattamente quello che scrive il selettore di
     * Keystatic. Senza questa conversione la build si fermava con un errore di
     * tipo su un campo che nell'editor sembrava compilato bene.
     */
    planningAggiornatoIl: z
      .union([z.string(), z.date()])
      .nullish()
      .transform((v) => (v instanceof Date ? v.toISOString() : v)),
  }),
});

// ─── Discipline / attività ───────────────────────────────────────────────
const discipline = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/discipline' }),
  schema: ({ image }) => z.object({
    nome: z.string(),
    categoria: z.string(),
    // Difficoltà, intensità e durata non esistono in PerfectGym: sono tutti
    // opzionali e gli slider compaiono solo dove il dato c'è davvero.
    // Meglio una scheda senza indicatori che una con numeri inventati.
    difficolta: z.number().min(1).max(5).nullish(),
    intensita: z.number().min(1).max(5).nullish(),
    durata: z.number().nullish(), // minuti
    breve: z.string(), // descrizione breve
    /**
     * Attività di interesse Airtable da preselezionare nel form quando si apre
     * da questa scheda. Deve essere una delle opzioni di `INTERESSI` in
     * `src/config/forms.ts`, altrimenti il lead arriva senza attività.
     *
     * Vuoto = si usa il ripiego per categoria (`INTERESSE_PER_CATEGORIA`).
     * Va compilato solo dove la categoria porta fuori strada: il TRX Pilates sta
     * in "Mente & corpo" ma commercialmente è Pilates Reformer.
     */
    interesse: z.string().nullish(),
    immagine: image().nullish(),
    video: z.string().nullish(), // video loop (AWS S3/CloudFront)
    centri: z.array(z.string()).default([]),
    /**
     * Livelli e declinazioni dello stesso corso (Base/Intermedio/Avanzato,
     * versioni VIRTUAL, format gemelli a calendario). Stanno dentro la scheda
     * madre invece di essere pagine a sé: eviterebbero solo di moltiplicare
     * pagine quasi identiche.
     */
    varianti: z
      .array(z.object({ nome: z.string(), nota: z.string().nullish() }))
      .default([]),
    /** Testo scritto da noi, non ancora validato dallo staff. Non appare sul sito. */
    daRivedere: z.boolean().default(false),
    /**
     * Peso della tessera nella griglia bento della pagina Discipline.
     * Deciso in redazione e non dal codice: è l'unico modo per dare rilievo
     * ai corsi che contano davvero invece che a quelli capitati per primi.
     */
    rilievo: z
      .enum(['normale', 'alto', 'largo', 'panoramico', 'grande'])
      .default('normale'),
    ordine: z.number().default(99),
  }),
});

// ─── News ────────────────────────────────────────────────────────────────
// Il corpo Markdown del file è il testo dell'articolo.
const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  // `image()` risolve il percorso relativo in metadati veri (dimensioni,
  // formato): è ciò che permette ad Astro di generare le varianti e di
  // scrivere width/height, evitando il salto di layout al caricamento.
  schema: ({ image }) => z.object({
    titolo: z.string(),
    data: z.coerce.date(),
    categoria: z.enum(idDi(categorieNews)),
    sintesi: z.string(), // anteprima nella card
    immagine: image(),
    immagineAlt: z.string(),
    autore: z.string().nullish(),
    /** Slug dei centri a cui la news si riferisce. Vuoto = riguarda tutti. */
    centri: z.array(z.string()).default([]),
    inEvidenza: z.boolean().default(false),
    pubblicato: z.boolean().default(true),
    // Il bottone in fondo all'articolo appare solo se ci sono entrambi.
    ctaLabel: z.string().nullish(),
    ctaHref: z.string().nullish(),
  }),
});

// ─── Eventi ──────────────────────────────────────────────────────────────
const eventi = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/eventi' }),
  // `image()` risolve il percorso relativo in metadati veri (dimensioni,
  // formato): è ciò che permette ad Astro di generare le varianti e di
  // scrivere width/height, evitando il salto di layout al caricamento.
  schema: ({ image }) => z.object({
    titolo: z.string(),
    data: z.coerce.date(),
    ora: z.string().nullish(), // es. "18:30"
    categoria: z.enum(idDi(categorieEventi)),
    descrizione: z.string(),
    luogo: z.string().nullish(),
    /** Slug del centro che ospita l'evento. */
    centro: z.string().nullish(),
    immagine: image().nullish(),
    iscrizioniHref: z.string().nullish(),
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
    // Il testo del pannello è il CORPO Markdown del file, non un campo:
    // così Keystatic tiene l'estensione .md e noi abbiamo il Markdown completo
    // invece del mini-renderer a doppi asterischi.
    href: z.string().nullish(),
    centri: z.array(z.string()).default([]),
    pubblicato: z.boolean().default(true),
  }),
});

// ─── Abbonamenti ─────────────────────────────────────────────────────────
// I piani stavano cablati dentro `index.astro`: cambiarli richiedeva un
// deploy. Qui li modifica lo staff da Keystatic, e home e /abbonamenti
// leggono la stessa fonte invece di tenere due listini che divergono.
const abbonamenti = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/abbonamenti' }),
  schema: z.object({
    nome: z.string(),
    /** Riga sotto il nome: a chi si rivolge il piano. */
    per: z.string(),
    mensile: z.number(),
    // L'annuale NON si calcola dal mensile con un moltiplicatore: lo sconto è
    // una scelta commerciale che può cambiare piano per piano, e nel codice
    // sarebbe invisibile a chi la decide.
    annuale: z.number(),
    /** Una tantum all'attivazione, 0 = nessuna. */
    attivazione: z.number().default(0),
    /**
     * Cosa include il piano, riga per riga della tabella comparativa.
     * `true` = incluso senza limiti; una stringa = incluso con un limite
     * ("2 a settimana"), che finisce nella cella al posto della spunta.
     * Le righe non elencate sono escluse.
     */
    // `.optional()` sul valore: con una chiave enum Zod pretende TUTTE le
    // righe su ogni piano, e un piano deve poterne omettere.
    voci: z
      .record(z.enum(idDi(vociAbbonamento)), z.union([z.boolean(), z.string()]).optional())
      .default({}),
    consigliato: z.boolean().default(false),
    ordine: z.number().default(99),
    pubblicato: z.boolean().default(true),
  }),
});

export const collections = { abbonamenti, centri, discipline, news, eventi, helpdesk, servizi };
