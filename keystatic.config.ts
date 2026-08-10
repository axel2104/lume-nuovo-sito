import { config, collection, fields } from '@keystatic/core';

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
const forzaGithub = import.meta.env.PUBLIC_KEYSTATIC_STORAGE === 'github';

export default config({
  storage: import.meta.env.DEV && !forzaGithub ? { kind: 'local' } : SU_GITHUB,

  ui: {
    brand: { name: 'LUMe Fitness Club' },
    navigation: {
      'Corsi e centri': ['discipline', 'centri'],
      'Lume Life': ['news', 'eventi', 'servizi', 'helpdesk'],
    },
  },

  collections: {
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
        servizi: fields.array(fields.text({ label: 'Servizio' }), {
          label: 'Servizi del centro',
          itemLabel: (props) => props.value || 'Servizio',
        }),
        immagine: fields.image({
          label: 'Foto del centro',
          directory: 'src/assets/centri',
          publicPath: '../../assets/centri/',
          validation: { isRequired: false },
        }),
        perfectgymUrl: fields.text({
          label: 'Link iscrizione PerfectGym',
          defaultValue: '#',
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
});
