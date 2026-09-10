import { config, collection, fields, singleton } from '@keystatic/core';

/**
 * Configurazione Keystatic — l'editor dei contenuti del sito.
 *
 * Sta nel repo ed è codice come tutto il resto: rispecchia uno a uno gli schemi
 * Zod di `src/content.config.ts`. Se aggiungi un campo lì, aggiungilo anche qui.
 *
 * I contenuti restano file Markdown versionati in git: se un domani Keystatic
 * non ci piace più, si cancella questa configurazione e il sito continua a
 * funzionare senza toccare una riga di contenuto.
 *
 * Due modalità di archiviazione:
 *  - in sviluppo scrive direttamente sui file locali (`npm run dev` → /keystatic)
 *  - in produzione passa da GitHub, quindi ogni salvataggio è un commit e
 *    Netlify ricostruisce da solo. La modifica si vede online dopo la build,
 *    uno o due minuti: è la differenza principale rispetto a WordPress.
 */

/**
 * Giorni come stringhe e non come numeri: una tendina di Keystatic può salvare
 * solo stringhe. Lo schema in `src/content.config.ts` usa `z.coerce.number()`
 * proprio per questo.
 */
const GIORNI_SETTIMANA = [
  { label: 'Lunedì', value: '1' },
  { label: 'Martedì', value: '2' },
  { label: 'Mercoledì', value: '3' },
  { label: 'Giovedì', value: '4' },
  { label: 'Venerdì', value: '5' },
  { label: 'Sabato', value: '6' },
  { label: 'Domenica', value: '7' },
] as const;

/**
 * Le opzioni del campo "Attività di interesse" della tabella RICHIESTE su
 * Airtable. Sono copiate da `src/config/forms.ts` e devono restare identiche:
 * un valore diverso qui fa creare ad Airtable un'opzione nuova a ogni contatto,
 * e la segmentazione dei lead si sbriciola senza che nessuno se ne accorga.
 */
const INTERESSI_AIRTABLE = [
  'Sala Pesi',
  'Corsi Fitness',
  'Pilates Reformer',
  'CrossFit/Hyrox',
  'Personal Training',
  'Scuola Nuoto Adulti',
  'Acqua Fitness',
  'Nuoto Libero',
  'Scuola Nuoto Bambini',
  'Acqua Nido',
  'Acqua Mamma',
].map((v) => ({ label: v, value: v }));

const CATEGORIE_DISCIPLINE = [
  { label: 'Funzionale & atletico', value: 'Funzionale & atletico' },
  { label: 'Forza & tono', value: 'Forza & tono' },
  { label: 'Cardio & resistenza', value: 'Cardio & resistenza' },
  { label: 'Combat', value: 'Combat' },
  { label: 'Mente & corpo', value: 'Mente & corpo' },
  { label: 'Reformer & postura', value: 'Reformer & postura' },
  { label: 'Danza', value: 'Danza' },
  { label: 'Acqua', value: 'Acqua' },
] as const;

/** Slider 1–5 facoltativo: se lo lasci vuoto, sul sito l'indicatore non compare. */
function livello(label: string, description: string) {
  return fields.integer({
    label,
    description,
    validation: { isRequired: false, min: 1, max: 5 },
  });
}

/** Corpo dell'articolo. `extension: 'md'` tiene i file in .md, non in .mdoc. */
function corpo(label = 'Testo') {
  return fields.markdoc({
    label,
    extension: 'md',
    options: {
      image: {
        directory: 'src/assets/contenuti',
        publicPath: '../../assets/contenuti/',
      },
    },
  });
}

const SU_GITHUB = {
  kind: 'github',
  repo: { owner: 'axel2104', name: 'lume-nuovo-sito' },
} as const;

/**
 * In sviluppo l'editor scrive direttamente sui file locali: non serve
 * configurare niente.
 *
 * Fa eccezione la procedura guidata che crea la GitHub App: gira solo in
 * modalità github e, alla fine, SCRIVE un file `.env` sul disco. Sulla
 * serverless function di Netlify il filesystem è in sola lettura, quindi
 * lanciarla sul sito pubblicato risponde 500. Va fatta in locale.
 *
 * Per farla: crea un `.env` con `PUBLIC_KEYSTATIC_STORAGE=github`, riavvia
 * `npm run dev` e apri /keystatic. Finita la procedura le credenziali sono
 * nel `.env` e vanno copiate su Netlify.
 */
/**
 * `import.meta.env` lo definisce Vite: fuori da una build — per esempio quando
 * il test di round-trip importa questo file con Node — non esiste affatto, e
 * leggerlo senza `?.` fa fallire l'import prima di arrivare allo schema. Il
 * fallback su `process.env` fa sì che lo stesso file si comporti allo stesso
 * modo nei due contesti invece di funzionare solo in uno.
 */
const ambiente: Record<string, string | undefined> =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env ??
  (typeof process !== 'undefined' ? process.env : {});

const forzaGithub = ambiente.PUBLIC_KEYSTATIC_STORAGE === 'github';

/**
 * Titolo e descrizione per Google, uguali su ogni pagina.
 *
 * Stanno nel CMS e non nel codice perché sono la prima cosa che si legge nei
 * risultati di ricerca e l'ultima che qualcuno pensa a cambiare: se per
 * modificarli serve un deploy, non si modificano mai.
 */
const seo = () =>
  fields.object(
    {
      titolo: fields.text({
        label: 'Titolo nella scheda del browser e su Google',
        description: 'Sotto i 60 caratteri, altrimenti Google lo taglia.',
        validation: { isRequired: true },
      }),
      descrizione: fields.text({
        label: 'Descrizione su Google',
        description: 'Una o due frasi, fra 120 e 160 caratteri.',
        multiline: true,
        validation: { isRequired: true },
      }),
    },
    { label: 'Google e social' },
  );

/**
 * L'intestazione di una sezione: sopratitolo, titolo, riga di spiegazione.
 *
 * È lo stesso blocco che si ripete in tutta la home e in cima alle pagine
 * d'elenco, quindi qui è una funzione: un ritocco alle descrizioni d'aiuto si
 * propaga a tutte invece di andare corretto in dodici posti.
 */
const intestazione = (label: string, opzioni?: { testo?: boolean }) =>
  fields.object(
    {
      label: fields.text({
        label: 'Sopratitolo',
        description: 'La righetta rossa in maiuscolo sopra al titolo.',
      }),
      titolo: fields.text({
        label: 'Titolo',
        description: 'Vai a capo con Invio dove vuoi che la riga si spezzi.',
        multiline: true,
        validation: { isRequired: true },
      }),
      ...(opzioni?.testo === false
        ? {}
        : {
            testo: fields.text({
              label: 'Testo',
              multiline: true,
            }),
          }),
    },
    { label },
  );

export default config({
  storage: ambiente.DEV && !forzaGithub ? { kind: 'local' } : SU_GITHUB,

  ui: {
    brand: { name: 'LUMe Fitness Club' },
    navigation: {
      'Testi delle pagine': ['home', 'scuolaNuoto'],
      'Corsi e centri': ['discipline', 'centri'],
      Listino: ['abbonamenti'],
      'Lume Life': ['news', 'eventi', 'servizi', 'helpdesk'],
    },
  },

  collections: {
    // ─── Abbonamenti ─────────────────────────────────────────────────────
    abbonamenti: collection({
      label: 'Abbonamenti',
      slugField: 'nome',
      path: 'src/content/abbonamenti/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      columns: ['nome', 'per'],
      schema: {
        nome: fields.slug({
          name: { label: 'Nome del piano' },
          slug: { label: 'Indirizzo' },
        }),
        per: fields.text({
          label: 'A chi si rivolge',
          description: 'Una riga sotto il nome, es. “Solo sala pesi e cardio, per chi si allena da solo”.',
          validation: { isRequired: true },
        }),
        attivita: fields.array(
          fields.text({ label: 'Attività', validation: { isRequired: true } }),
          {
            label: 'Cosa puoi fare con questo piano',
            description:
              'Una voce per riga, come sul listino: “Sala pesi e cardio”, “Box CrossFit senza limiti”, “Accesso corsi fitness — Macerata”. Vale per TUTTE le formule di pagamento: non dipende da come paghi, quindi si scrive una volta sola. La tabella comparativa si costruisce da qui, perciò una voce presente in più piani va scritta identica — se cambia una parola diventano due righe diverse.',
            itemLabel: (props) => props.value || 'Attività',
          },
        ),
        formule: fields.array(
          fields.object({
            id: fields.select({
              label: 'Formula',
              options: [
                { label: 'Annuale, in soluzione unica', value: 'annuale' },
                { label: 'Annuale, in 12 rate', value: 'rate' },
                { label: 'Mensile, senza vincolo', value: 'mensile' },
              ],
              defaultValue: 'annuale',
            }),
            prezzo: fields.number({ label: 'Prezzo (€)', validation: { isRequired: true } }),
            periodo: fields.select({
              label: 'Il prezzo si riferisce a',
              options: [
                { label: 'Dodici mesi', value: '12 mesi' },
                { label: 'Un mese', value: 'mese' },
              ],
              defaultValue: 'mese',
            }),
            pagamento: fields.text({
              label: 'Come si paga',
              description:
                'La riga sotto il prezzo, per esteso: “Pagamento in soluzione unica”, “Pagamento in 12 rate con Pagodil® o Pagolight®”.',
              validation: { isRequired: true },
            }),
            durataMinima: fields.text({
              label: 'Durata minima del contratto',
              description: 'Come si dice a voce: “12 mesi”, “un mese”.',
              defaultValue: '12 mesi',
            }),
            condizioni: fields.array(
              fields.text({ label: 'Condizione', validation: { isRequired: true } }),
              {
                label: 'Condizioni di questa formula',
                description:
                  'Solo quello che dipende da COME si paga: le sospensioni, il finanziamento. Le attività NON vanno qui — stanno nel campo sopra, una volta per piano.',
                itemLabel: (props) => props.value || 'Condizione',
              },
            ),
            badge: fields.text({
              label: 'Etichetta sulla scheda',
              description: 'Es. “Best choice”, “Disdici quando vuoi”. Vuoto = nessuna etichetta.',
              validation: { isRequired: false },
            }),
          }),
          {
            label: 'Formule di pagamento',
            description:
              'Almeno una. Se un piano non ha il mensile, non aggiungerlo: la pagina rimanda da sé al piano più economico che ce l’ha, invece di mostrare un buco.',
            itemLabel: (props) =>
              `${props.fields.id.value} · ${props.fields.prezzo.value ?? '?'} €`,
          },
        ),
        attivazione: fields.number({
          label: 'Quota di attivazione (€)',
          description: 'Una volta sola, uguale per tutte le formule. 0 = nessuna quota.',
          defaultValue: 50,
        }),
        preavviso: fields.text({
          label: 'Preavviso per disdire il rinnovo',
          description: 'Come si dice a voce: “10 giorni”.',
          defaultValue: '10 giorni',
        }),
        consigliato: fields.checkbox({
          label: 'Il più scelto',
          description: 'Mette in evidenza il piano in home e su /abbonamenti. Spuntane uno solo.',
          defaultValue: false,
        }),
        ordine: fields.integer({
          label: 'Ordine',
          description: 'Dal più economico al più completo: la pagina calcola le differenze in quest’ordine.',
          defaultValue: 99,
        }),
        pubblicato: fields.checkbox({ label: 'Pubblicato', defaultValue: true }),
        content: corpo('Note sul piano'),
      },
    }),

    // ─── Discipline ──────────────────────────────────────────────────────
    discipline: collection({
      label: 'Discipline e corsi',
      slugField: 'nome',
      path: 'src/content/discipline/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      columns: ['nome', 'categoria'],
      schema: {
        nome: fields.slug({
          name: { label: 'Nome del corso' },
          slug: {
            label: 'Indirizzo della pagina',
            description: 'Compare nell’URL. Cambiarlo rompe i link già condivisi.',
          },
        }),
        categoria: fields.select({
          label: 'Categoria',
          description: 'Guida i filtri della pagina Discipline e i chip del form contatti.',
          options: [...CATEGORIE_DISCIPLINE],
          defaultValue: 'Funzionale & atletico',
        }),
        interesse: fields.select({
          label: 'Attività preselezionata nel form',
          description:
            'Quando il form si apre da questa scheda, spunta già questa attività. Lascia “usa la categoria” quasi sempre: serve solo dove la categoria porta fuori strada — il TRX Pilates sta in “Mente & corpo” ma commercialmente è Pilates Reformer.',
          options: [{ label: '— usa la categoria —', value: '' }, ...INTERESSI_AIRTABLE],
          defaultValue: '',
        }),
        breve: fields.text({
          label: 'Descrizione breve',
          description: 'Una riga: compare sotto il titolo e nei risultati di ricerca.',
          multiline: true,
          validation: { isRequired: true, length: { min: 20, max: 200 } },
        }),
        centri: fields.multiRelationship({
          label: 'Dove si tiene',
          collection: 'centri',
        }),
        immagine: fields.image({
          label: 'Foto del corso',
          directory: 'src/assets/discipline',
          publicPath: '../../assets/discipline/',
          validation: { isRequired: false },
        }),
        video: fields.text({
          label: 'Video anteprima (URL CloudFront)',
          description:
            'Facoltativo. Un loop breve e muto: 4–6 secondi, MP4 H.264, larghezza 1280, sotto il mega. Parte al passaggio del mouse sulla tessera e in testa alla scheda. Serve comunque la foto, che fa da fermo immagine.',
          validation: { isRequired: false },
        }),
        difficolta: livello('Difficoltà', 'Da 1 a 5. Lascia vuoto se non lo sai.'),
        intensita: livello('Intensità', 'Da 1 a 5. Lascia vuoto se non lo sai.'),
        durata: fields.integer({
          label: 'Durata in minuti',
          validation: { isRequired: false, min: 10, max: 180 },
        }),
        varianti: fields.array(
          fields.object({
            nome: fields.text({ label: 'Nome', validation: { isRequired: true } }),
            nota: fields.text({ label: 'Nota', multiline: true }),
          }),
          {
            label: 'Livelli e varianti',
            description:
              'Versioni dello stesso corso: livelli Base/Intermedio, versioni VIRTUAL, format gemelli. Restano dentro questa scheda invece di diventare pagine a sé.',
            itemLabel: (props) => props.fields.nome.value || 'Variante',
          },
        ),
        daRivedere: fields.checkbox({
          label: 'Testo da validare',
          description: 'Segna le schede scritte in bozza. Non compare sul sito.',
          defaultValue: false,
        }),
        rilievo: fields.select({
          label: 'Peso nella griglia',
          description:
            'Quanto spazio occupa la tessera nella pagina Discipline. Usa "grande" con parsimonia: se sono grandi tutte, non lo è nessuna.',
          options: [
            { label: 'Normale — un riquadro', value: 'normale' },
            { label: 'Alto — due righe', value: 'alto' },
            { label: 'Largo — due colonne', value: 'largo' },
            { label: 'Panoramico — tre colonne', value: 'panoramico' },
            { label: 'Grande — due colonne per due righe', value: 'grande' },
          ],
          defaultValue: 'normale',
        }),
        ordine: fields.integer({
          label: 'Ordine',
          description: 'Più basso = più in alto negli elenchi.',
          defaultValue: 99,
        }),
        content: corpo('Descrizione completa'),
      },
    }),

    // ─── Centri ──────────────────────────────────────────────────────────
    centri: collection({
      label: 'Centri',
      slugField: 'nome',
      path: 'src/content/centri/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      columns: ['nome', 'citta'],
      schema: {
        nome: fields.slug({ name: { label: 'Nome' }, slug: { label: 'Indirizzo della pagina' } }),
        citta: fields.text({ label: 'Città', validation: { isRequired: true } }),
        stato: fields.select({
          label: 'Stato',
          options: [
            { label: 'Aperto', value: 'aperto' },
            { label: 'In prevendita', value: 'prevendita' },
            { label: 'Prossima apertura', value: 'prossima-apertura' },
          ],
          defaultValue: 'aperto',
        }),
        ordine: fields.integer({ label: 'Ordine', defaultValue: 99 }),
        indirizzo: fields.text({ label: 'Indirizzo', validation: { isRequired: false } }),
        // Pin della mappa nel footer. Per i centri senza indirizzo ancora
        // comunicabile (prevendita) il pin segna la zona, non un civico.
        coordinate: fields.object(
          {
            lat: fields.number({ label: 'Latitudine' }),
            lng: fields.number({ label: 'Longitudine' }),
          },
          { label: 'Coordinate (mappa nel footer)' },
        ),
        telefono: fields.text({ label: 'Telefono', validation: { isRequired: false } }),
        email: fields.text({ label: 'Email', validation: { isRequired: false } }),
        orari: fields.object(
          {
            feriali: fields.text({ label: 'Lunedì – Venerdì' }),
            sabato: fields.text({ label: 'Sabato' }),
            domenica: fields.text({ label: 'Domenica' }),
          },
          { label: 'Orari' },
        ),
        aperture: fields.array(
          fields.object({
            titolo: fields.text({ label: 'Attività', validation: { isRequired: true } }),
            giorni: fields.text({
              label: 'Giorni',
              description: 'Es. “Lun, Mer e Ven”. Com’è scritto è come si legge in pagina.',
              validation: { isRequired: true },
            }),
            orario: fields.text({
              label: 'Orario',
              description: 'Es. “07:30 – 21:30”.',
              validation: { isRequired: true },
            }),
            nota: fields.text({ label: 'Nota', validation: { isRequired: false } }),
          }),
          {
            label: 'Accesso libero',
            description:
              'Fasce senza lezione mostrate nella pagina planning: nuoto libero, open box… La sala pesi NON va qui: i suoi orari sono quelli del centro (campo “Orari”) e la pagina li mostra da sé.',
            itemLabel: (props) =>
              [props.fields.titolo.value, props.fields.giorni.value].filter(Boolean).join(' · ') ||
              'Fascia',
          },
        ),
        servizi: fields.array(fields.text({ label: 'Servizio' }), {
          label: 'Servizi del centro',
          description: 'Etichette brevi per le card. Le sale con metratura e dotazione si compilano nel campo sotto.',
          itemLabel: (props) => props.value || 'Servizio',
        }),
        sale: fields.array(
          fields.object({
            nome: fields.text({ label: 'Nome della sala', validation: { isRequired: true } }),
            mq: fields.integer({
              label: 'Metri quadri',
              description: 'Lascia vuoto se non lo sai: meglio nessun numero che uno sbagliato su una pagina pubblica.',
              validation: { isRequired: false },
            }),
            dotazione: fields.text({
              label: 'Cosa c’è dentro',
              description: 'Attrezzature e marchi, in una frase. Es. “6 Reformer Peak Pilates e 5 panche Wellback System”.',
              multiline: true,
            }),
            foto: fields.image({
              label: 'Foto della sala',
              description: 'Foto vera scattata nella sala. Vuota = la pagina mostra un’immagine di repertorio.',
              directory: 'src/assets/centri',
              publicPath: '../../assets/centri/',
              validation: { isRequired: false },
            }),
          }),
          {
            label: 'Le sale',
            description:
              'Metratura e dotazione, sala per sala. È il primo dato che guarda chi sta valutando una palestra.',
            itemLabel: (props) =>
              [props.fields.nome.value, props.fields.mq.value && props.fields.mq.value + ' m²']
                .filter(Boolean)
                .join(' · ') || 'Sala',
          },
        ),
        superficie: fields.integer({
          label: 'Superficie totale (m²)',
          description:
            'Solo se il totale del centro non coincide con la somma delle sale qui sopra: la somma lascia fuori scale, corridoi e vani tecnici. Vuoto = il totale lo calcola la pagina.',
          validation: { isRequired: false },
        }),
        render: fields.array(
          fields.object({
            foto: fields.image({
              label: 'Render',
              directory: 'src/assets/centri/urban',
              publicPath: '../../assets/centri/urban/',
              validation: { isRequired: true },
            }),
            didascalia: fields.text({
              label: 'Didascalia',
              description: 'Cosa si vede, in poche parole. Es. “Area pesi liberi — piano −1”.',
              validation: { isRequired: true },
            }),
          }),
          {
            label: 'Render del progetto',
            description:
              'Per i centri non ancora aperti. La pagina li mostra dichiarandoli render, non foto: chi si iscrive in prevendita sta guardando un progetto.',
            itemLabel: (props) => props.fields.didascalia.value || 'Render',
          },
        ),
        immagine: fields.image({
          label: 'Foto del centro',
          directory: 'src/assets/centri',
          publicPath: '../../assets/centri/',
          validation: { isRequired: false },
        }),
        video: fields.text({
          label: 'Video del centro',
          description:
            'Loop muto mostrato sopra la foto del titolo. Percorso dentro public/, es. /media/macerata-drone.mp4, oppure un URL. Un loop breve, 15-20 secondi, MP4 H.264 largo 1280 e sotto i 4 MB: l’H.265 non lo riproduce Chrome. Vuoto = resta la foto.',
          validation: { isRequired: false },
        }),
        perfectgymUrl: fields.text({
          label: 'Link iscrizione PerfectGym',
          description:
            'Il portale dove si completa l’iscrizione. Finché resta “#” il rimando al portale non compare in fondo ai form: un pulsante che non porta da nessuna parte fa più danno di un pulsante assente.',
          defaultValue: '#',
        }),
        perfectgymCorsiUrl: fields.text({
          label: 'Link elenco corsi PerfectGym',
          description:
            'Alimenta il pulsante “Prenota sul portale” del planning. Il numero in “Classes/N/List” è l’id del club: 1 è Macerata, 2 Montecassiano. Attenzione a non copiarlo da un centro all’altro — il link funziona comunque, ma mostra i corsi della sede sbagliata.',
          validation: { isRequired: false },
        }),
        calendlyUrl: fields.text({
          label: 'Pagina Calendly della segreteria',
          description:
            'Usata solo se gli event type Cal.com qui sotto sono vuoti: al posto di “ti contattiamo noi”, chi ha appena compilato il form si sceglie l’orario da sé. Quando Cal.com è configurato questo campo viene ignorato.',
          validation: { isRequired: false },
        }),
        videoPoster: fields.image({
          label: 'Fermo immagine del video',
          description: 'La foto mostrata nel lettore finché il video non parte. Vuota = la foto del centro.',
          directory: 'src/assets/centri',
          publicPath: '../../assets/centri/',
          validation: { isRequired: false },
        }),
        calcom: fields.object(
          {
            visita: fields.text({
              label: 'Visita guidata',
              description: 'Es. lume-macerata/visita — senza https e senza cal.com.',
              validation: { isRequired: false },
            }),
            richiamata: fields.text({
              label: 'Richiamata telefonica',
              description: 'Es. lume-macerata/richiamata.',
              validation: { isRequired: false },
            }),
          },
          {
            label: 'Agende Cal.com',
            description:
              'Due agende separate perché durata e disponibilità sono diverse: una visita non è una telefonata. Se le lasci vuote i form registrano comunque il contatto e dicono “ti chiamiamo noi” — un contatto senza appuntamento vale, un calendario rotto no.',
          },
        ),

        // ─── Planning ────────────────────────────────────────────────────
        planning: fields.array(
          fields.object({
            giorno: fields.select({
              label: 'Giorno',
              options: [...GIORNI_SETTIMANA],
              defaultValue: '1',
            }),
            inizio: fields.text({
              label: 'Inizio',
              description: 'Formato 24 ore, es. 07:00.',
              validation: { isRequired: true },
            }),
            fine: fields.text({
              label: 'Fine',
              description: 'Deve essere più tardi dell’inizio, altrimenti la lezione viene scartata.',
              validation: { isRequired: true },
            }),
            corso: fields.text({ label: 'Corso', validation: { isRequired: true } }),
            disciplina: fields.relationship({
              label: 'Scheda della disciplina',
              description: 'Facoltativo: se la colleghi, la lezione diventa cliccabile.',
              collection: 'discipline',
            }),
            sala: fields.text({
              label: 'Sala',
              description:
                'Alimenta il filtro e la disposizione a colonne parallele: due lezioni alla stessa ora in sale diverse si affiancano invece di sovrapporsi.',
              validation: { isRequired: false },
            }),
            sezione: fields.text({
              label: 'Sezione separata',
              description:
                'Es. “CrossFit”: la lezione esce dal planning principale e finisce in una sezione a parte con quel titolo, in fondo alla pagina. Vuoto = planning principale. Scrivilo sempre uguale, o nascono due sezioni.',
              validation: { isRequired: false },
            }),
            istruttore: fields.text({
              label: 'Istruttore',
              description:
                'Solo il nome di battesimo: questa pagina è pubblica. Compare nella vista mobile e nel tooltip.',
              validation: { isRequired: false },
            }),
            prenotabile: fields.checkbox({ label: 'Prenotabile', defaultValue: true }),
          }),
          {
            label: 'Planning dei corsi',
            description:
              'La settimana tipo, non un calendario di date. È quello che la pagina /planning mostra subito; se in futuro colleghiamo PerfectGym, questo resta come rete di sicurezza per quando il collegamento non risponde.',
            itemLabel: (props) =>
              [
                GIORNI_SETTIMANA.find((g) => g.value === props.fields.giorno.value)?.label,
                props.fields.inizio.value,
                props.fields.corso.value,
                props.fields.sala.value,
              ]
                .filter(Boolean)
                .join(' · ') || 'Lezione',
          },
        ),
        planningNota: fields.text({
          label: 'Avviso sopra il planning',
          description:
            'Compare in cima all’orario, es. “Orario della stagione 26/27 ancora provvisorio”. Lascia vuoto per non mostrarlo.',
          multiline: true,
          validation: { isRequired: false },
        }),
        planningAggiornatoIl: fields.date({
          label: 'Planning aggiornato il',
          description: 'Mostrato sopra la griglia. Aggiornalo quando cambi l’orario.',
          validation: { isRequired: false },
        }),

        content: corpo('Presentazione del centro'),
      },
    }),

    // ─── News ────────────────────────────────────────────────────────────
    news: collection({
      label: 'News',
      slugField: 'titolo',
      path: 'src/content/news/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      columns: ['titolo', 'data'],
      schema: {
        titolo: fields.slug({ name: { label: 'Titolo' }, slug: { label: 'Indirizzo della pagina' } }),
        data: fields.date({ label: 'Data', validation: { isRequired: true } }),
        categoria: fields.select({
          label: 'Categoria',
          options: [
            { label: 'Novità', value: 'novita' },
            { label: 'Dai centri', value: 'centri' },
            { label: 'Allenamento', value: 'allenamento' },
            { label: 'Benessere', value: 'benessere' },
            { label: 'Community', value: 'community' },
          ],
          defaultValue: 'novita',
        }),
        sintesi: fields.text({
          label: 'Sintesi',
          description: 'Anteprima nella card e descrizione per Google.',
          multiline: true,
          validation: { isRequired: true },
        }),
        immagine: fields.image({
          label: 'Immagine di copertina',
          directory: 'src/assets/news',
          publicPath: '../../assets/news/',
          validation: { isRequired: true },
        }),
        immagineAlt: fields.text({
          label: 'Testo alternativo dell’immagine',
          description: 'Cosa si vede nella foto. Serve a chi usa screen reader e a Google.',
          validation: { isRequired: true },
        }),
        autore: fields.text({ label: 'Autore', validation: { isRequired: false } }),
        centri: fields.multiRelationship({ label: 'Centri interessati', collection: 'centri' }),
        inEvidenza: fields.checkbox({ label: 'In evidenza', defaultValue: false }),
        pubblicato: fields.checkbox({ label: 'Pubblicato', defaultValue: true }),
        ctaLabel: fields.text({ label: 'Pulsante — testo', validation: { isRequired: false } }),
        ctaHref: fields.text({
          label: 'Pulsante — link',
          description: 'Il pulsante appare solo se compili sia il testo sia il link.',
          validation: { isRequired: false },
        }),
        content: corpo('Testo dell’articolo'),
      },
    }),

    // ─── Eventi ──────────────────────────────────────────────────────────
    eventi: collection({
      label: 'Eventi',
      slugField: 'titolo',
      path: 'src/content/eventi/*',
      format: { contentField: 'content' },
      columns: ['titolo', 'data'],
      schema: {
        titolo: fields.slug({ name: { label: 'Titolo' }, slug: { label: 'Indirizzo' } }),
        data: fields.date({ label: 'Data', validation: { isRequired: true } }),
        ora: fields.text({ label: 'Ora', description: 'Es. 18:30', validation: { isRequired: false } }),
        categoria: fields.select({
          label: 'Tipo',
          options: [
            { label: 'Open day', value: 'open-day' },
            { label: 'Masterclass', value: 'masterclass' },
            { label: 'Gara', value: 'gara' },
            { label: 'Challenge', value: 'challenge' },
            { label: 'Evento', value: 'evento' },
          ],
          defaultValue: 'evento',
        }),
        descrizione: fields.text({
          label: 'Descrizione',
          multiline: true,
          validation: { isRequired: true },
        }),
        luogo: fields.text({ label: 'Luogo', validation: { isRequired: false } }),
        centro: fields.relationship({ label: 'Centro che ospita', collection: 'centri' }),
        immagine: fields.image({
          label: 'Immagine',
          directory: 'src/assets/eventi',
          publicPath: '../../assets/eventi/',
          validation: { isRequired: false },
        }),
        iscrizioniHref: fields.text({
          label: 'Link iscrizioni',
          description: 'Se vuoto, il pulsante apre il form contatti.',
          validation: { isRequired: false },
        }),
        postiLimitati: fields.checkbox({ label: 'Posti limitati', defaultValue: false }),
        pubblicato: fields.checkbox({ label: 'Pubblicato', defaultValue: true }),
        content: corpo('Dettagli (facoltativo)'),
      },
    }),

    // ─── Help desk ───────────────────────────────────────────────────────
    helpdesk: collection({
      label: 'Help desk',
      slugField: 'titolo',
      path: 'src/content/helpdesk/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      columns: ['titolo', 'categoria'],
      schema: {
        titolo: fields.slug({ name: { label: 'Domanda' }, slug: { label: 'Indirizzo' } }),
        categoria: fields.select({
          label: 'Categoria',
          options: [
            { label: 'Abbonamenti e iscrizioni', value: 'abbonamenti' },
            { label: 'Prenotazioni corsi', value: 'prenotazioni' },
            { label: 'App e area personale', value: 'app' },
            { label: 'Pagamenti e fatture', value: 'pagamenti' },
            { label: 'Accesso al centro', value: 'accesso' },
            { label: 'Regolamento', value: 'regolamento' },
          ],
          defaultValue: 'abbonamenti',
        }),
        sintesi: fields.text({
          label: 'Risposta breve',
          description: 'Una o due righe: è quello che si legge nella card.',
          multiline: true,
          validation: { isRequired: true },
        }),
        tags: fields.array(fields.text({ label: 'Tag' }), {
          label: 'Parole chiave',
          description: 'Usate dalla ricerca interna.',
          itemLabel: (props) => props.value || 'Tag',
        }),
        aggiornato: fields.date({ label: 'Ultimo aggiornamento', validation: { isRequired: true } }),
        ordine: fields.integer({ label: 'Ordine', defaultValue: 99 }),
        pubblicato: fields.checkbox({ label: 'Pubblicato', defaultValue: true }),
        content: corpo('Risposta completa'),
      },
    }),

    // ─── Servizi ─────────────────────────────────────────────────────────
    servizi: collection({
      label: 'Servizi',
      slugField: 'titolo',
      path: 'src/content/servizi/*',
      format: { contentField: 'content' },
      columns: ['titolo', 'ordine'],
      schema: {
        titolo: fields.slug({ name: { label: 'Titolo' }, slug: { label: 'Indirizzo' } }),
        ordine: fields.integer({ label: 'Ordine nella griglia', defaultValue: 99 }),
        icona: fields.select({
          label: 'Icona',
          options: [
            { label: 'Allenatore (persona)', value: 'coach' },
            { label: 'Nutrizione (mela)', value: 'nutrizione' },
            { label: 'Fisioterapia (mano)', value: 'fisio' },
            { label: 'Spogliatoi (armadietto)', value: 'armadietto' },
            { label: 'Shop (borsa)', value: 'shop' },
            { label: 'Visite mediche (croce)', value: 'medical' },
            { label: 'Bambini (aquilone)', value: 'bimbi' },
            { label: 'Convenzioni (cartellino)', value: 'convenzioni' },
          ],
          defaultValue: 'coach',
        }),
        breve: fields.text({ label: 'Riga sotto il titolo', validation: { isRequired: true } }),
        href: fields.text({ label: 'Link "scopri di più"', validation: { isRequired: false } }),
        centri: fields.multiRelationship({ label: 'Centri', collection: 'centri' }),
        pubblicato: fields.checkbox({ label: 'Pubblicato', defaultValue: true }),
        content: corpo('Testo del pannello'),
      },
    }),
  },

  // ─── Testi delle pagine ────────────────────────────────────────────────
  // Non sono contenuti che si aggiungono e si togliono come le news: sono i
  // testi fissi di una pagina che esiste una volta sola. Da qui si cambia una
  // frase della home senza toccare il codice; il layout resta in codice, che è
  // il confine giusto — un CMS che sposta anche i blocchi diventa un page
  // builder, e con un page builder si fanno pagine sgangherate.
  singletons: {
    home: singleton({
      label: 'Home',
      path: 'src/content/pagine/home',
      format: { data: 'json' },
      schema: {
        seo: seo(),
        hero: fields.object(
          {
            label: fields.text({ label: 'Sopratitolo' }),
            titolo: fields.text({
              label: 'Titolo grande',
              description: 'Vai a capo con Invio. L’ultima parola in corsivo si scrive nel campo sotto.',
              multiline: true,
              validation: { isRequired: true },
            }),
            evidenza: fields.text({
              label: 'Parola in evidenza',
              description: 'Aggiunta in coda al titolo, in corsivo.',
            }),
            testo: fields.text({ label: 'Testo', multiline: true }),
            ctaProva: fields.text({
              label: 'Pulsante rosso',
              description: 'Apre il form del pass prova. È la chiamata principale della home: a chi arriva per la prima volta si chiede di provare, non di abbonarsi.',
            }),
            ctaCentri: fields.text({ label: 'Pulsante secondario' }),
          },
          { label: 'Apertura' },
        ),
        stats: fields.array(
          fields.object({
            numero: fields.text({
              label: 'Numero',
              description: 'Scrivi {discipline} o {centri} per farlo contare al sito invece di aggiornarlo a mano.',
              validation: { isRequired: true },
            }),
            suffisso: fields.text({ label: 'Dopo il numero', description: 'Es. + — lascia vuoto se non serve.' }),
            etichetta: fields.text({ label: 'Etichetta', validation: { isRequired: true } }),
          }),
          {
            label: 'Numeri sotto l’apertura',
            itemLabel: (props) =>
              [props.fields.numero.value, props.fields.etichetta.value].filter(Boolean).join(' · ') || 'Numero',
          },
        ),
        chiSiamo: fields.object(
          {
            label: fields.text({ label: 'Sopratitolo' }),
            titolo: fields.text({ label: 'Titolo', multiline: true, validation: { isRequired: true } }),
            paragrafi: fields.array(fields.text({ label: 'Paragrafo', multiline: true }), {
              label: 'Paragrafi',
              itemLabel: (props) => (props.value || 'Paragrafo').slice(0, 60),
            }),
            cta: fields.text({ label: 'Pulsante' }),
          },
          { label: 'Chi siamo' },
        ),
        centri: intestazione('Sezione centri'),
        discipline: fields.object(
          {
            label: fields.text({ label: 'Sopratitolo' }),
            titolo: fields.text({ label: 'Titolo', multiline: true, validation: { isRequired: true } }),
            testo: fields.text({
              label: 'Testo',
              description: 'Scrivi {discipline} per il numero di attività, così non invecchia.',
              multiline: true,
            }),
            cta: fields.text({ label: 'Pulsante', description: 'Anche qui vale {discipline}.' }),
          },
          { label: 'Sezione discipline' },
        ),
        bandaProva: fields.object(
          {
            label: fields.text({ label: 'Sopratitolo' }),
            titolo: fields.text({ label: 'Titolo', multiline: true, validation: { isRequired: true } }),
            testo: fields.text({ label: 'Testo', multiline: true }),
            ctaForm: fields.text({ label: 'Pulsante rosso', description: 'Apre il form.' }),
            ctaPagina: fields.text({ label: 'Pulsante secondario', description: 'Porta a /prova.' }),
          },
          { label: 'Fascia pass prova' },
        ),
        abbonamenti: fields.object(
          {
            label: fields.text({ label: 'Sopratitolo' }),
            titolo: fields.text({ label: 'Titolo', multiline: true, validation: { isRequired: true } }),
            testo: fields.text({ label: 'Testo', multiline: true }),
            nota: fields.text({
              label: 'Riga sotto i piani',
              description: 'I prezzi non si scrivono qui: stanno negli Abbonamenti, e home e /abbonamenti leggono gli stessi.',
              multiline: true,
            }),
            notaLink: fields.text({ label: 'Testo del link nella riga' }),
          },
          { label: 'Sezione abbonamenti' },
        ),
        prevendita: fields.object(
          {
            label: fields.text({ label: 'Sopratitolo' }),
            titolo: fields.text({ label: 'Titolo', multiline: true, validation: { isRequired: true } }),
            testo: fields.text({ label: 'Testo', multiline: true }),
            cta: fields.text({ label: 'Pulsante' }),
          },
          { label: 'Fascia prevendita' },
        ),
        wiki: fields.object(
          {
            label: fields.text({ label: 'Sopratitolo' }),
            titolo: fields.text({ label: 'Titolo', multiline: true, validation: { isRequired: true } }),
            testo: fields.text({ label: 'Testo', multiline: true }),
            cta: fields.text({ label: 'Pulsante' }),
          },
          { label: 'Sezione wiki' },
        ),
      },
    }),

    // ─── Scuola nuoto ──────────────────────────────────────────────────
    // Ricostruita dal vecchio sito, dove tre stagioni erano impilate sulla
    // stessa pagina Elementor come sezioni nascoste, con prezzi e calendari
    // che si contraddicevano. Qui quello che non scade sta in pagina e quello
    // che cambia ogni anno — date e quote — si compila da qui.
    scuolaNuoto: singleton({
      label: 'Scuola nuoto',
      path: 'src/content/pagine/scuola-nuoto',
      format: { data: 'json' },
      schema: {
        seo: seo(),
        intro: fields.object(
          {
            label: fields.text({ label: 'Sopratitolo' }),
            titolo: fields.text({ label: 'Titolo', multiline: true, validation: { isRequired: true } }),
            testo: fields.text({ label: 'Testo', multiline: true }),
            federale: fields.text({
              label: 'Riquadro Federazione',
              description: 'L’adesione al progetto Scuola Nuoto Federale della FIN. Compare nel riquadro con la barra rossa.',
              multiline: true,
            }),
          },
          { label: 'Apertura' },
        ),
        stagione: fields.object(
          {
            titolo: fields.text({ label: 'Titolo del riquadro' }),
            inizio: fields.text({
              label: 'Inizio',
              description: 'Es. “Lunedì 7 settembre 2026”. Se lasci vuoto uno dei due, la riga della data non compare affatto.',
            }),
            fine: fields.text({ label: 'Fine', description: 'Es. “Sabato 5 giugno 2027”.' }),
            nota: fields.text({ label: 'Nota su frequenza e programma', multiline: true }),
          },
          { label: 'La stagione' },
        ),
        fasce: fields.object(
          {
            label: fields.text({ label: 'Sopratitolo' }),
            titolo: fields.text({ label: 'Titolo', validation: { isRequired: true } }),
            testo: fields.text({ label: 'Testo', multiline: true }),
            voci: fields.array(
              fields.object({
                eta: fields.text({ label: 'Fascia d’età', validation: { isRequired: true } }),
                livelli: fields.text({ label: 'Livelli in questa fascia' }),
                href: fields.url({
                  label: 'Link al portale per questa fascia',
                  description:
                    'Il link PerfectGym con gli orari di questa età. Nel vecchio sito era il “CLICCA QUI”: cambia solo il numero di ageLimitId, uno per fascia in ordine. Vuoto = la riga non è cliccabile.',
                  validation: { isRequired: false },
                }),
              }),
              {
                label: 'Le fasce',
                itemLabel: (props) => props.fields.eta.value || 'Fascia',
              },
            ),
            etichettaLink: fields.text({
              label: 'Testo del link',
              description: 'Uguale per tutte le fasce, es. “Orari e iscrizione”.',
            }),
            notaLink: fields.text({ label: 'Nota sotto le fasce', multiline: true }),
          },
          { label: 'Fasce d’età' },
        ),
        livelli: fields.object(
          {
            label: fields.text({ label: 'Sopratitolo' }),
            titolo: fields.text({ label: 'Titolo', validation: { isRequired: true } }),
            testo: fields.text({ label: 'Testo', multiline: true }),
            voci: fields.array(
              fields.object({
                nome: fields.text({ label: 'Livello', validation: { isRequired: true } }),
                descrizione: fields.text({ label: 'Cosa sa fare a questo livello', multiline: true }),
              }),
              {
                label: 'I livelli, in ordine',
                itemLabel: (props) => props.fields.nome.value || 'Livello',
              },
            ),
          },
          { label: 'Livelli didattici' },
        ),
        listino: fields.object(
          {
            label: fields.text({ label: 'Sopratitolo' }),
            titolo: fields.text({ label: 'Titolo', validation: { isRequired: true } }),
            testo: fields.text({ label: 'Testo sopra le quote', multiline: true }),
            voci: fields.array(
              fields.object({
                nome: fields.text({ label: 'Nome della quota', validation: { isRequired: true } }),
                prezzo: fields.text({
                  label: 'Prezzo',
                  description: 'Scritto come va mostrato, es. “590 €” o “89 €/mese”.',
                  validation: { isRequired: true },
                }),
                nota: fields.text({ label: 'Nota', multiline: true }),
              }),
              {
                label: 'Le quote',
                description:
                  'Finché è vuoto, al posto della tabella la pagina invita a chiedere il listino. È voluto: meglio nessun prezzo che il prezzo dell’anno scorso.',
                itemLabel: (props) =>
                  [props.fields.nome.value, props.fields.prezzo.value].filter(Boolean).join(' — ') || 'Quota',
              },
            ),
            vuoto: fields.text({
              label: 'Testo quando le quote non ci sono',
              multiline: true,
            }),
          },
          { label: 'Quote' },
        ),
        brevetti: fields.object(
          {
            label: fields.text({ label: 'Sopratitolo' }),
            titolo: fields.text({ label: 'Titolo', validation: { isRequired: true } }),
            testo: fields.text({ label: 'Testo', multiline: true }),
            voci: fields.array(fields.text({ label: 'Voce' }), {
              label: 'Sessioni di brevetto',
              itemLabel: (props) => props.value || 'Sessione',
            }),
          },
          { label: 'Brevetti e app' },
        ),
        iscrizione: fields.object(
          {
            label: fields.text({ label: 'Sopratitolo' }),
            titolo: fields.text({ label: 'Titolo', validation: { isRequired: true } }),
            passi: fields.array(fields.text({ label: 'Passo', multiline: true }), {
              label: 'I passi, in ordine',
              itemLabel: (props) => (props.value || 'Passo').slice(0, 50),
            }),
            nota: fields.text({ label: 'Nota finale', multiline: true }),
          },
          { label: 'Come si iscrive' },
        ),
        norme: fields.object(
          {
            label: fields.text({ label: 'Sopratitolo' }),
            titolo: fields.text({ label: 'Titolo', validation: { isRequired: true } }),
            voci: fields.array(
              fields.object({
                titolo: fields.text({ label: 'Titolo della norma', validation: { isRequired: true } }),
                testo: fields.text({ label: 'Testo', multiline: true }),
              }),
              {
                label: 'Le norme',
                itemLabel: (props) => props.fields.titolo.value || 'Norma',
              },
            ),
          },
          { label: 'Norme e regolamento' },
        ),
        recuperi: fields.object(
          {
            label: fields.text({ label: 'Sopratitolo' }),
            titolo: fields.text({ label: 'Titolo', validation: { isRequired: true } }),
            testo: fields.text({ label: 'Come si recupera una lezione', multiline: true }),
            titoloNonRecuperabili: fields.text({ label: 'Titolo del riquadro delle chiusure' }),
            nonRecuperabili: fields.array(fields.text({ label: 'Giorno' }), {
              label: 'Giorni non recuperabili',
              description:
                'Cambiano ogni stagione — Pasqua si sposta — quindi vanno riscritti a inizio anno. Vuoti = compare la nota qui sotto.',
              itemLabel: (props) => props.value || 'Giorno',
            }),
            notaChiusure: fields.text({
              label: 'Nota sotto l’elenco delle chiusure',
              description:
                'Es. il periodo dei Giochi di Natale con lezioni accorpate: non è un giorno di chiusura, quindi non sta nell’elenco. Vuota = non compare.',
              multiline: true,
            }),
            vuotoNonRecuperabili: fields.text({
              label: 'Testo quando le chiusure non ci sono',
              multiline: true,
            }),
          },
          { label: 'Assenze e recuperi' },
        ),
        cta: fields.object(
          {
            titolo: fields.text({ label: 'Titolo', validation: { isRequired: true } }),
            testo: fields.text({ label: 'Testo', multiline: true }),
            pulsante: fields.text({ label: 'Pulsante' }),
          },
          { label: 'Fascia finale' },
        ),
      },
    }),
  },
});
