import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  categorieEventi,
  categorieHelpdesk,
  categorieNews,
  iconeServizi,
  idDi,
} from './data/tassonomie';

/**
 * Una scheda prezzo del listino di una sede.
 *
 * Sta fuori dalla collection perche' la usano due elenchi: i piani della
 * palestra e quelli del Box CrossFit, che hanno le stesse tre formule e le
 * stesse condizioni. Scriverla due volte vorrebbe dire che fra un anno una
 * delle due ha un campo che l'altra non ha.
 */
const pianoListino = z.object({
  nome: z.string(),
  /** Cosa comprende, in una riga. */
  per: z.string().nullish(),
  /**
   * Cosa puoi fare, una voce per riga — le stesse etichette della
   * collection `abbonamenti` ("Sala pesi e cardio", "Acqua
   * fitness"): scriverle uguali tiene coerenti le schede dei
   * centri e quelle di /abbonamenti, scriverle diverse crea due
   * vocabolari per le stesse cose.
   *
   * Vuoto: la scheda mostra prezzo e condizioni senza l'elenco.
   * Meglio di un elenco inventato su una pagina che vende.
   */
  attivita: z.array(z.string()).default([]),
  /** Prezzo in soluzione unica, dodici mesi. */
  annuale: z.number(),
  /** Totale pagato in 12 rate con Pagodil/Pagolight. */
  rate: z.number(),
  /** Mensile con rinnovo automatico. */
  mensile: z.number(),
  /** Il piano da mettere in evidenza. Uno solo, o nessuno. */
  evidenza: z.boolean().default(false),
  /**
   * I link diretti al checkout PerfectGym, uno per formula.
   *
   * URL interi e non i soli `PaymentPlanId`: club e piano stanno
   * insieme nella stessa riga dell'export del portale, e comporre
   * l'indirizzo a pezzi vuol dire indovinare il `clubID` — con
   * l'id sbagliato il pulsante funziona e manda a comprare
   * l'abbonamento di un'altra sede.
   *
   * Ogni formula puo' non averlo: sul portale i piani mensili
   * esistono solo per il GOLD. Dove manca resta il form, che e'
   * meglio di un pulsante che promette un checkout inesistente.
   */
  pgm: z
    .object({
      annuale: z.string().startsWith('https://', 'Serve l’URL intero copiato dal portale, non il numero del piano').nullish(),
      rate: z.string().startsWith('https://', 'Serve l’URL intero copiato dal portale, non il numero del piano').nullish(),
      mensile: z.string().startsWith('https://', 'Serve l’URL intero copiato dal portale, non il numero del piano').nullish(),
    })
    .nullish(),
});

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
    /**
     * Fasce di accesso libero senza lezione (nuoto libero, open box…): non
     * sono corsi, quindi non stanno nel `planning`. La sala pesi NON va qui:
     * i suoi orari sono quelli del centro (`orari`) e la pagina planning li
     * mostra da sé — duplicarli qui vorrebbe dire mantenerli in due posti.
     */
    aperture: z
      .array(
        z.object({
          titolo: z.string(),
          /** "Lun, Mer e Ven" — testo libero, com'è scritto è come si legge. */
          giorni: z.string(),
          /** "07:30 – 21:30". */
          orario: z.string(),
          nota: z.string().nullish(),
        }),
      )
      .default([]),
    // Le discipline di un centro NON si elencano qui: ogni disciplina dichiara
    // in quali centri si tiene (campo `centri`), ed è quella l'unica fonte.
    // Una seconda lista qui divergerebbe al primo corso aggiunto.
    servizi: z.array(z.string()).default([]),
    /**
     * Le sale del centro, con metratura e dotazione.
     *
     * Separate da `servizi`, che è un elenco di etichette brevi per le card:
     * "Sala olistica · 120 m² · tappetini, mattoncini yoga e tessuti per la
     * sospensione" non è un'etichetta, è una scheda. Sono il dato che chi
     * valuta una palestra guarda per primo, e sul vecchio sito c'erano per
     * ogni sala mentre qui erano andate perse.
     */
    sale: z
      .array(
        z.object({
          nome: z.string(),
          /** Metratura. Nullish: meglio nessun numero che uno inventato. */
          mq: z.number().nullish(),
          dotazione: z.string().nullish(),
          /** Foto vera della sala. Finché manca, la pagina usa un repertorio. */
          foto: image().nullish(),
        }),
      )
      .default([]),
    /**
     * Superficie totale del centro, quando non coincide con la somma delle sale.
     *
     * La somma delle sale conta solo gli ambienti elencati: restano fuori
     * scale, corridoi e vani tecnici, che i metri quadri di progetto invece
     * comprendono. Vuoto = il totale resta la somma, che è il caso normale.
     */
    superficie: z.number().nullish(),
    /**
     * Il listino di QUESTO centro.
     *
     * Sta sulla sede e non nella collection `abbonamenti` per una ragione
     * semplice: dal listino 2026/27 i prezzi non sono piu' uguali dappertutto.
     * La stessa Sala costa 660 € a Macerata e 465 € a Montecassiano, e Urban
     * non ha ne' Sala ne' Gold ma due fasce d'eta'. Un listino unico con una
     * colonna per centro sarebbe una tabella che nessuno riesce a correggere
     * senza sbagliare riga.
     *
     * Nullish: un centro senza listino non mostra il blocco, punto. E' il caso
     * di Piediripa finche' non si decide come si chiama.
     */
    listino: z
      .object({
        /**
         * La frase sopra le schede. Serve a dire cosa NON si capisce dai
         * numeri: a Macerata l'abbonamento apre tutti i centri, a
         * Montecassiano il Gold vale solo li'. Due cifre vicine che valgono
         * cose diverse, senza quella riga, sembrano solo due cifre.
         */
        nota: z.string().nullish(),
        /** Quota di attivazione, una volta sola, uguale per tutti i piani. */
        attivazione: z.number().default(50),
        piani: z.array(pianoListino).default([]),
        /**
         * La riga Over 65, quando c'e'.
         *
         * Non e' una quarta scheda: e' lo stesso All Inclusive a un prezzo
         * diverso, e mostrarlo come piano a se' raddoppierebbe una colonna per
         * cambiare solo la cifra. I numeri sono scritti e non calcolati dal
         * piano Sala perche' sul listino sono dichiarati a parte: se un anno
         * l'offerta cambia, cambia qui e basta.
         */
        over65: z
          .object({
            titolo: z.string().default('Over 65'),
            per: z.string().nullish(),
            annuale: z.number().nullish(),
            rate: z.number().nullish(),
            mensile: z.number().nullish(),
          })
          .nullish(),
        /**
         * Il Box CrossFit, quando la sede ce l'ha.
         *
         * Non e' una quarta scheda accanto a Sala, All Inclusive e Gold: quei
         * tre sono la palestra, e chi cerca il Box cerca un'altra cosa. La
         * griglia `.plans` e' poi tarata su tre schede col consigliato al
         * centro — la quarta la sfonda.
         *
         * Vive dentro `listino` e non a fianco perche' deve stare dentro
         * `.listino-sede`: e' quel contenitore che il `:has()` guarda per
         * sapere quale formula e' spuntata. Fuori di li' il selettore
         * mensile/annuale non lo raggiungerebbe, e si vedrebbero tutti e tre
         * i prezzi insieme.
         */
        box: z
          .object({
            titolo: z.string().default('Box CrossFit'),
            /**
             * La data in cui il Box smette di allenarsi in QUESTA sede.
             *
             * E' un promemoria, non un interruttore: il sito e' statico, e
             * senza un deploy dopo quella data il blocco resterebbe a video
             * comunque. Quel giorno il blocco si sposta a mano sulla sede che
             * eredita il Box, cambiando `clubID` negli URL del portale.
             */
            fino: z.string().nullish(),
            /** La frase sopra le schede: dove va il Box, e da quando. */
            nota: z.string().nullish(),
            attivazione: z.number().default(50),
            piani: z.array(pianoListino).default([]),
            /**
             * Gli accessi a pacchetto (2 o 4 al mese).
             *
             * Riga sola e non schede, come l'Over 65: sono due cifre mensili
             * e basta, senza annuale ne' dilazionato, e due colonne per due
             * numeri farebbero sembrare un piano intero quello che e' un
             * ripiego per chi viene ogni tanto.
             */
            pacchetti: z
              .object({
                nota: z.string().nullish(),
                voci: z
                  .array(
                    z.object({
                      nome: z.string(),
                      per: z.string().nullish(),
                      mensile: z.number(),
                      pgm: z
                        .string()
                        .startsWith('https://', 'Serve l’URL intero copiato dal portale, non il numero del piano')
                        .nullish(),
                    }),
                  )
                  .default([]),
              })
              .nullish(),
          })
          .nullish(),
      })
      .nullish(),
    immagine: image().nullish(),
    /**
     * Render del progetto, per i centri che non esistono ancora.
     *
     * Separati da `sale` perché non sono lo stesso dato: una sala è una
     * metratura con una dotazione, un render è un'inquadratura. Un centro in
     * prevendita ha cinque sale e venti inquadrature, e infilare le seconde
     * nelle prime falserebbe il contatore "sale e ambienti" in testa pagina.
     *
     * La pagina li etichetta come render e non come foto: chi si iscrive in
     * prevendita deve sapere che sta guardando un progetto, non un posto che
     * può andare a vedere oggi.
     */
    render: z
      .array(z.object({ foto: image(), didascalia: z.string() }))
      .default([]),
    /**
     * Video del centro, in loop muto sopra la foto del titolo.
     *
     * È un URL e non un `image()`: i video non passano dall'ottimizzazione di
     * Astro, e questi vivranno su un CDN quando la fototeca crescerà. Per ora
     * puntano a `public/media/`, quindi il valore è `/media/nome.mp4`.
     *
     * Vuoto = resta la foto, che è anche quello che si vede prima che il video
     * arrivi e per chi ha chiesto meno movimento.
     */
    video: z.string().nullish(),
    /** Fermo immagine del video, mostrato finché non parte. Nullish = foto del centro. */
    videoPoster: image().nullish(),
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
     * Pagina Calendly della segreteria: il ponte finché Cal.com non è pronto.
     *
     * Non sostituisce `calcom` e non gli fa concorrenza. L'embed Cal.com, se
     * configurato, resta la strada buona: sta dentro il form, arriva già
     * compilato e rimanda la prenotazione al webhook che la ricuce al lead.
     * Questo è solo il ripiego, e serve a cambiare la natura di quel ripiego:
     * senza, chi chiede un appuntamento legge "ti contattiamo noi" e aspetta;
     * con, sceglie l'orario da sé mentre ha ancora la pagina aperta.
     *
     * Resta un link e non un secondo embed: nessuno script terzo in più, e
     * quindi nessun'altra voce da dichiarare nella cookie policy.
     */
    calendlyUrl: z.string().nullish(),

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
          /**
           * Sezione separata in cui mostrare la lezione (es. "CrossFit"): il
           * testo diventa il titolo della sezione in fondo alla pagina.
           * Vuoto = planning principale. Va scritto sempre uguale: "Crossfit"
           * e "CrossFit" sono due sezioni diverse.
           */
          sezione: z.string().nullish(),
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

    /**
     * Cosa puoi fare con questo piano, una voce per riga.
     *
     * Sta sul **piano** e non sulla formula di pagamento, ed è una scelta
     * deliberata: le attività non dipendono da come paghi. Sul portale
     * PerfectGym lo stesso elenco è ripetuto in ogni formula, e quelle copie
     * sono già divergite fra loro — un piano superiore aveva perso una voce
     * che il piano inferiore teneva. Qui non c'è un secondo posto dove
     * scriverla, quindi non può succedere.
     *
     * Testo libero e non una tassonomia chiusa: le voci sono quelle del
     * listino reale ("LUME AI TOWER - SHAPE", "Box Crossfit Senza Limiti") e
     * cambiano quando cambia l'offerta, non quando cambia il codice. La
     * tabella comparativa si costruisce dall'unione di questi elenchi, quindi
     * scrivere la stessa voce in due piani in modo diverso crea due righe:
     * copiarla identica è importante.
     */
    attivita: z.array(z.string()).default([]),

    /**
     * Le formule di pagamento dello stesso piano.
     *
     * Un piano può averne anche solo una: il Sala Pesi non ha un mensile, e la
     * pagina in quel caso rimanda al piano più economico che ce l'ha invece di
     * mostrare un buco.
     */
    formule: z
      .array(
        z.object({
          id: z.enum(['annuale', 'rate', 'mensile']),
          prezzo: z.number(),
          /** Cosa copre il prezzo: `12 mesi` per l'annuale, `mese` per le altre. */
          periodo: z.enum(['12 mesi', 'mese']),
          /** Come si paga, per esteso: è la riga sotto il prezzo. */
          pagamento: z.string(),
          /** Durata minima del contratto, come la si dice: "12 mesi", "un mese". */
          durataMinima: z.string(),
          /**
           * Condizioni che valgono solo per questa formula — le sospensioni,
           * il finanziamento. Le attività NON vanno qui: vedi `attivita`.
           */
          condizioni: z.array(z.string()).default([]),
          /**
           * Link diretto al checkout PerfectGym di QUESTA formula.
           *
           * URL intero e non il solo `PaymentPlanId`: il club e il piano
           * stanno insieme nella stessa riga dell'export del portale, e
           * comporre l'indirizzo a pezzi vuol dire indovinare il `clubID` —
           * con l'id sbagliato il pulsante funziona e manda a comprare
           * l'abbonamento di un'altra sede.
           *
           * Vuoto: nessun link, resta solo il form. Un piano senza id sul
           * portale non deve avere un pulsante che promette un checkout che
           * non esiste.
           */
          pgmUrl: z.string().startsWith('https://', 'Serve l’URL intero copiato dal portale, non il numero del piano').nullish(),
          /** Etichetta sopra la scheda quando la formula è selezionata. */
          badge: z.string().nullish(),
        }),
      )
      .min(1),

    /** Una tantum all'attivazione, uguale per tutte le formule. 0 = nessuna. */
    attivazione: z.number().default(0),
    /** Preavviso per disdire il rinnovo, come si dice: "10 giorni". */
    preavviso: z.string().default('10 giorni'),

    consigliato: z.boolean().default(false),
    ordine: z.number().default(99),
    pubblicato: z.boolean().default(true),
  }),
});

// ─── Legale ──────────────────────────────────────────────────────────────
//
// Le condizioni generali di contratto. Una sola voce, ma è una collection e
// non una pagina scritta a mano per due motivi: questo testo è l'unica copia
// che esiste (il docx per il legale e quello per la firma si generano da qui,
// non viceversa), e /regolamento.json lo serve spezzato per punto a un
// eventuale assistente — che ha bisogno del testo, non dell'HTML della pagina.
//
// L'URL è /regolamento e non /termini-e-condizioni perché è quello già scritto
// in 281 descrizioni di piano sul portale PerfectGym: cambiarlo qui vorrebbe
// dire riscrivere quelle. /termini-e-condizioni ci arriva con un 301.
const legale = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/legale' }),
  schema: z.object({
    titolo: z.string(),
    sottotitolo: z.string(),
    societa: z.string(),
    sede: z.string(),
    piva: z.string(),
    pec: z.string(),
    /** Versione del documento: va citata quando si contesta una clausola. */
    revisione: z.string(),
    /** Stagione sportiva a cui si riferiscono listino e calendari, es. "2026/2027". */
    stagione: z.string(),
    aggiornato: z.coerce.date(),
    /** Quale edizione sostituisce, per datare i contratti già firmati. */
    sostituisce: z.string(),
  }),
});

export const collections = {
  abbonamenti,
  centri,
  discipline,
  news,
  eventi,
  helpdesk,
  legale,
  servizi,
};
