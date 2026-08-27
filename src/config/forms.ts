/**
 * Definizione dei form del sito.
 *
 * Un flusso = un oggetto qui dentro. Il motore (`src/lib/leadForm.client.js`)
 * e il markup (`src/components/forms/LeadFormBody.astro`) non sanno cosa sia una
 * "prova" o una "richiesta di iscrizione": leggono questa configurazione.
 * Aggiungere un form significa aggiungere una voce a `FLUSSI`, non scrivere un
 * altro componente. Un bug corretto nel motore è corretto in tutti i form.
 *
 * ─── Perché i valori sono questi ──────────────────────────────────────────
 * I lead finiscono nella tabella `RICHIESTE` della base Airtable LUME FITNESS
 * (via webhook n8n). I campi `Tipo Richiesta`, `SEDE`, `Nuovo?` e
 * `ATTIVITA' INTERESSE NRE` sono select con opzioni FISSE: se il form manda una
 * stringa che non esiste, Airtable la rifiuta o — peggio — n8n crea un'opzione
 * nuova e i filtri salvati dei consulenti smettono di tornare.
 *
 * Le stringhe qui sotto quindi non sono copy: sono un contratto con Airtable.
 * Cambiarle richiede di cambiare prima l'opzione su Airtable.
 * Il contratto completo del payload è in `docs/FORM.md`.
 */

// ─── Tassonomie vincolate da Airtable ─────────────────────────────────────

/**
 * Opzioni del campo `ATTIVITA' INTERESSE NRE` (multipleSelects).
 *
 * NON sono le categorie delle discipline (`Mente & corpo`, `Acqua`, …): quelle
 * servono a navigare il catalogo, queste a qualificare un lead. Prima il form
 * mandava le categorie editoriali e non combaciavano con nessuna opzione.
 */
export const INTERESSI = [
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
] as const;

export type Interesse = (typeof INTERESSI)[number];

/**
 * Interessi che riguardano bambini: se l'utente ne seleziona almeno uno la
 * richiesta diventa `INFO JUNIOR` invece di `INFO ADULTI`, perché la gestiscono
 * persone diverse. Meglio dedurlo qui che chiedere "è per un bambino?".
 */
export const INTERESSI_JUNIOR: readonly Interesse[] = [
  'Scuola Nuoto Bambini',
  'Acqua Nido',
  'Acqua Mamma',
];

/**
 * Mappa slug del centro → opzione del campo `SEDE`.
 *
 * Le chiavi sono gli id della collection `centri`. Solo i due centri aperti: il
 * campo Airtable non ha altre opzioni, e Piediripa/Urban hanno un funnel di
 * prevendita separato (tabella `Prevendita Urban`). Un centro elencato qui che
 * su Airtable non esiste produce lead che si perdono in silenzio.
 */
export const SEDI: Record<string, string> = {
  macerata: 'MACERATA',
  montecassiano: 'MONTECASSIANO',
};

/** Slug dei centri selezionabili nei form. */
export const SLUG_SEDI = Object.keys(SEDI);

/**
 * Dalla categoria editoriale di una disciplina all'attività di interesse.
 *
 * Serve a preselezionare l'attività quando il form si apre da una scheda
 * disciplina: chi clicca "Prova il Reformer" non deve rispondere a "cosa ti
 * interessa". È un ripiego per categoria, non una verità: le categorie sono otto
 * e le attività undici, quindi la corrispondenza è per forza approssimativa.
 *
 * ⚠️ Da rivedere con lo staff commerciale. Dove la categoria non basta, la
 * singola disciplina può dichiarare il proprio `interesse` nel front matter e
 * quello vince su questa mappa.
 */
export const INTERESSE_PER_CATEGORIA: Record<string, Interesse> = {
  Acqua: 'Acqua Fitness',
  'Reformer & postura': 'Pilates Reformer',
  'Forza & tono': 'Sala Pesi',
  'Funzionale & atletico': 'CrossFit/Hyrox',
  'Cardio & resistenza': 'Corsi Fitness',
  'Mente & corpo': 'Corsi Fitness',
  Danza: 'Corsi Fitness',
  Combat: 'Corsi Fitness',
};

/** Attività da preselezionare per una disciplina. Stringa vuota = nessuna. */
export function interesseDisciplina(d: { categoria: string; interesse?: string | null }): string {
  return d.interesse || INTERESSE_PER_CATEGORIA[d.categoria] || '';
}

/** Opzioni del campo `Tipo Richiesta` usate dal sito. */
export const TIPO_RICHIESTA = {
  infoAdulti: 'INFO ADULTI',
  infoJunior: 'INFO JUNIOR',
  prova: 'RICHIESTA PROVA',
  tour: 'TOUR',
  abbonamenti: 'ABBONAMENTI',
  assistenza: 'ASSISTENZA',
  newsletter: 'NEWSLETTER',
} as const;

/** Prefissi telefonici offerti, in ordine di probabilità reale. */
export const PREFISSI = ['+39', '+41', '+44', '+33', '+49', '+34', '+1'];

/**
 * Tipi di appuntamento prenotabili su Cal.com.
 *
 * Ogni centro ha i propri event type (campo `calcom` nella collection `centri`);
 * questi sono i due tipi previsti dai flussi. La durata e la disponibilità le
 * decide la reception su Cal.com, non il codice: è tutto il punto di averlo
 * integrato al posto del calendario scritto a mano.
 */
export const AGENDE = {
  visita: { label: 'Visita in sede', chiave: 'visita' },
  richiamata: { label: 'Richiamata telefonica', chiave: 'richiamata' },
} as const;

export type Agenda = keyof typeof AGENDE;

// ─── Tipi della configurazione ────────────────────────────────────────────

export type TipoCampo =
  | 'email'
  | 'testo'
  | 'tel'
  | 'textarea'
  | 'chipsRadio'
  | 'chipsCheck'
  | 'consensi'
  | 'scelte';

export interface Opzione {
  valore: string;
  label: string;
  /** Riga di spiegazione sotto la label (solo per `scelte`). */
  nota?: string;
}

export interface Campo {
  tipo: TipoCampo;
  /** Chiave nello stato del form e nel payload. */
  nome: string;
  label?: string;
  placeholder?: string;
  obbligatorio?: boolean;
  /** Testo grigio accanto alla label, es. "(opzionale)". */
  nota?: string;
  /** Per chipsRadio/chipsCheck/scelte. `'interessi'` e `'centri'` sono risolti a build time. */
  opzioni?: Opzione[] | 'interessi' | 'centri';
  /** Messaggio mostrato quando `obbligatorio` non è soddisfatto. */
  errore?: string;
  /** Righe della textarea. */
  righe?: number;
  /** Lunghezza minima accettata (testo e textarea). */
  minLunghezza?: number;
}

export interface Step {
  id: string;
  titolo: string;
  sub?: string;
  /** Riquadro informativo sopra i campi (es. il recap dell'offerta prova). */
  riquadro?: { titolo: string; voci: string[]; nota?: string };
  campi?: Campo[];
  /**
   * Forza il `Tipo Richiesta` per gli invii che partono da questo step,
   * ignorando quello del flusso e gli override condizionali.
   *
   * Serve agli step che cambiano la natura della richiesta indipendentemente da
   * come ci si è arrivati: chi finisce su "sei già dei nostri" sta scrivendo alla
   * segreteria, sia che il check l'abbia riconosciuto come `iscritto` sia come
   * `esiste`. Senza questo, un contatto già in anagrafica che chiede aiuto
   * arriverebbe ai commerciali etichettato come richiesta di prova.
   */
  tipoRichiesta?: string;
  /** Etichetta del bottone principale. Assente = lo step avanza da solo (card di scelta). */
  avanti?: string;
  /**
   * Cosa fa il bottone principale:
   *  - `next`  → passa a `prossimo`
   *  - `check` → interroga il webhook di verifica e instrada con `dopoCheck`
   *  - `invia` → manda il lead a n8n e mostra `conferma`
   */
  azione?: 'next' | 'check' | 'invia';
  /** Step successivo per `azione: 'next'`. */
  prossimo?: string;
  /** Instradamento dopo il check, per stato restituito dal webhook. */
  dopoCheck?: { nuovo: string; esiste: string; iscritto: string };
  /** Step mostrato dopo un invio riuscito. */
  conferma?: string;
  /** Id dello step a cui torna il bottone "Indietro". Assente = nessun indietro. */
  indietro?: string;
  /** Schermata finale: nessun campo, solo riepilogo e chiusura. */
  finale?: boolean;
  /** Testo del bottone di chiusura sulle schermate finali. */
  chiudi?: string;
  /**
   * Monta l'embed Cal.com in questa schermata (solo su step `finale`).
   *
   * Sta nella CONFERMA e non in uno step intermedio di proposito: il lead è già
   * stato inviato, quindi chi apre il calendario e non conferma lo slot resta
   * comunque un contatto acquisito. Al contrario si perderebbe la maggioranza.
   */
  prenotazione?: Agenda;
  /** Conta nell'indicatore di avanzamento. Conferme e vicoli ciechi no. */
  passo?: number;
}

export interface Flusso {
  /** Titolo del modal, letto dagli screen reader. */
  titolo: string;
  /** Valore di `Tipo Richiesta` su Airtable. */
  tipoRichiesta: string;
  /**
   * Override di `tipoRichiesta` calcolati a runtime dal motore.
   * `junior`   → fra gli interessi c'è un'attività per bambini
   * `tour`     → l'utente ha scelto di venire in sede
   * `iscritto` → il check dice che è già iscritto: è assistenza, non un lead
   */
  tipoRichiestaSe?: { junior?: string; tour?: string; iscritto?: string };
  /** `medium` di default, quando né la campagna né il CTA ne dichiarano uno. */
  medium: string;
  /** Numero di pallini nell'indicatore di avanzamento. 0 = nessun indicatore. */
  passi: number;
  steps: Step[];
}

// ─── Blocchi riutilizzati fra i flussi ────────────────────────────────────

/** Email + centro: l'apertura di ogni flusso, e ciò che serve al check. */
const campiIdentita = (etichettaCentro = 'Quale centro ti interessa'): Campo[] => [
  {
    tipo: 'email',
    nome: 'email',
    label: 'La tua email',
    placeholder: 'nome@esempio.it',
    obbligatorio: true,
    errore: 'Inserisci un indirizzo email valido.',
  },
  {
    tipo: 'chipsRadio',
    nome: 'centro',
    label: etichettaCentro,
    opzioni: 'centri',
    obbligatorio: true,
    errore: 'Scegli il centro che ti interessa.',
  },
];

/** Nome, cognome, cellulare e consensi: lo step che qualifica un contatto nuovo. */
const campiAnagrafica: Campo[] = [
  { tipo: 'testo', nome: 'nome', label: 'Nome', obbligatorio: true, minLunghezza: 2, errore: 'Inserisci il tuo nome.' },
  { tipo: 'testo', nome: 'cognome', label: 'Cognome', obbligatorio: true, minLunghezza: 2, errore: 'Inserisci il tuo cognome.' },
  {
    tipo: 'tel',
    nome: 'cellulare',
    label: 'Cellulare',
    placeholder: '333 1234567',
    obbligatorio: true,
    errore: 'Inserisci un numero di cellulare valido.',
  },
  { tipo: 'consensi', nome: 'consensi' },
];

/** Le 11 attività di interesse, opzionali: qualificano senza allungare il funnel. */
const campoInteressi = (nota = '(opzionale)'): Campo => ({
  tipo: 'chipsCheck',
  nome: 'attivita',
  label: 'Cosa ti interessa',
  nota,
  opzioni: 'interessi',
});

/** Nota libera che finisce nelle `notes` della prenotazione Cal.com. */
const campoNota = (label: string, placeholder: string): Campo => ({
  tipo: 'textarea',
  nome: 'messaggio',
  label,
  nota: '(opzionale)',
  placeholder,
  righe: 3,
});

/** Vicolo cieco per chi è già iscritto: non è un lead, è assistenza. */
const stepGiaIscritto = (testo: string): Step => ({
  id: 'gia-iscritto',
  titolo: 'Sei già dei nostri',
  sub: testo,
  tipoRichiesta: TIPO_RICHIESTA.assistenza,
  campi: [
    {
      tipo: 'textarea',
      nome: 'messaggio',
      label: 'Come possiamo aiutarti',
      placeholder: 'Scrivi qui la tua richiesta',
      righe: 5,
      obbligatorio: true,
      minLunghezza: 10,
      errore: 'Scrivi almeno due righe, così possiamo risponderti bene.',
    },
  ],
  avanti: 'Invia richiesta',
  azione: 'invia',
  conferma: 'conferma-assistenza',
});

const confermaAssistenza: Step = {
  id: 'conferma-assistenza',
  titolo: 'Richiesta inviata',
  sub: 'La segreteria ti risponde entro un giorno lavorativo.',
  finale: true,
  chiudi: 'Chiudi',
};

// ─── I flussi ─────────────────────────────────────────────────────────────

export const FLUSSI: Record<string, Flusso> = {
  /**
   * INFO — sostituisce i Typeform `infoMacerata` e `infoMonte` con un solo
   * flusso: il centro è una chip, non due form gemelli da tenere allineati.
   */
  info: {
    titolo: 'Contattaci',
    tipoRichiesta: TIPO_RICHIESTA.infoAdulti,
    tipoRichiestaSe: {
      junior: TIPO_RICHIESTA.infoJunior,
      tour: TIPO_RICHIESTA.tour,
      iscritto: TIPO_RICHIESTA.assistenza,
    },
    medium: 'FormContatti',
    passi: 3,
    steps: [
      {
        id: 'identita',
        passo: 1,
        titolo: 'Parliamone',
        sub: 'Dicci dove vuoi allenarti e come possiamo aiutarti. Ci vogliono trenta secondi.',
        campi: [...campiIdentita(), campoInteressi()],
        avanti: 'Continua',
        azione: 'check',
        dopoCheck: { nuovo: 'anagrafica', esiste: 'azione', iscritto: 'gia-iscritto' },
      },
      {
        id: 'anagrafica',
        passo: 2,
        titolo: 'Piacere di conoscerti',
        sub: 'Due informazioni e ti mettiamo in contatto con il centro giusto.',
        campi: campiAnagrafica,
        avanti: 'Continua',
        azione: 'next',
        prossimo: 'azione',
        indietro: 'identita',
      },
      {
        id: 'azione',
        passo: 3,
        titolo: 'Come preferisci?',
        sub: 'Scegli il modo più comodo per te. Rispondiamo sempre.',
        campi: [
          {
            tipo: 'scelte',
            nome: 'modalita',
            opzioni: [
              { valore: 'richiamata', label: 'Fatti richiamare', nota: 'Scegli giorno e ora, ti chiamiamo noi.' },
              { valore: 'visita', label: 'Vieni a trovarci', nota: 'Prenota una visita guidata del centro.' },
              { valore: 'messaggio', label: 'Scrivici', nota: 'Raccontaci cosa ti serve, ti rispondiamo via email.' },
            ],
          },
        ],
        indietro: 'identita',
      },
      {
        id: 'richiamata',
        titolo: 'Ti chiamiamo noi',
        sub: 'Dicci di cosa vuoi parlare, poi scegli tu il momento.',
        campi: [campoNota('Di cosa vuoi parlare', 'Es. vorrei capire quale abbonamento fa per me')],
        avanti: 'Scegli quando',
        azione: 'invia',
        conferma: 'conferma-richiamata',
        indietro: 'azione',
      },
      {
        id: 'visita',
        titolo: 'Vieni a trovarci',
        sub: 'Ti facciamo fare il giro del centro e ti spieghiamo tutto di persona.',
        campi: [campoNota('Qualcosa che dovremmo sapere', "Es. vengo con un'amica, ci interessa il Reformer")],
        avanti: 'Scegli quando',
        azione: 'invia',
        conferma: 'conferma-visita',
        indietro: 'azione',
      },
      {
        id: 'messaggio',
        titolo: 'Raccontaci',
        sub: 'Scrivi qui la tua richiesta: ti rispondiamo via email.',
        campi: [
          {
            tipo: 'textarea',
            nome: 'messaggio',
            placeholder: 'Come possiamo aiutarti?',
            righe: 6,
            obbligatorio: true,
            minLunghezza: 10,
            errore: 'Scrivi almeno due righe, così possiamo risponderti bene.',
          },
        ],
        avanti: 'Invia messaggio',
        azione: 'invia',
        conferma: 'conferma-messaggio',
        indietro: 'azione',
      },
      stepGiaIscritto(
        'La tua email è già registrata, quindi non serve un nuovo contatto commerciale: scrivici e ti risponde direttamente la segreteria.',
      ),
      {
        id: 'conferma-richiamata',
        titolo: 'Scegli il momento',
        sub: 'Ti abbiamo registrato. Ora dicci quando ti fa comodo essere chiamato.',
        finale: true,
        prenotazione: 'richiamata',
        chiudi: 'Ho finito',
      },
      {
        id: 'conferma-visita',
        titolo: 'Scegli quando passare',
        sub: 'Ti abbiamo registrato. Scegli giorno e ora della visita guidata.',
        finale: true,
        prenotazione: 'visita',
        chiudi: 'Ho finito',
      },
      { id: 'conferma-messaggio', titolo: 'Messaggio inviato', sub: 'Ti rispondiamo entro un giorno lavorativo.', finale: true, chiudi: 'Chiudi' },
      confermaAssistenza,
    ],
  },

  /**
   * PROVA — il guest pass 7 giorni a 15 €.
   *
   * Sostituisce sia `n8n.lumeflow.it/form/guest-pass` sia il Typeform
   * `/provagratis`: erano due form per la stessa offerta, con attribuzione
   * incompatibile fra loro (il secondo perdeva source e medium nel redirect).
   *
   * L'offerta vale solo per chi non è mai stato iscritto, quindi il check
   * dell'email non è un dettaglio tecnico: è la regola commerciale. Chi è già
   * iscritto viene fermato prima di compilare, non dopo.
   */
  prova: {
    titolo: 'Richiedi la prova',
    tipoRichiesta: TIPO_RICHIESTA.prova,
    tipoRichiestaSe: { iscritto: TIPO_RICHIESTA.assistenza },
    medium: 'FormProva',
    passi: 3,
    steps: [
      {
        id: 'identita',
        passo: 1,
        titolo: '7 giorni in Lume',
        sub: 'Un pass completo per provare tutto, senza vincoli di rinnovo.',
        riquadro: {
          titolo: 'Cosa comprende — 15 €',
          voci: [
            'Sala pesi e zona cardio',
            'Corsi fitness in licenza Les Mills',
            'Acqua fitness e nuoto libero assistito',
            'CrossFit e Pilates Reformer',
          ],
          nota: 'Riservato a chi non ha mai avuto un abbonamento o un pass Lume. Il codice va attivato entro 30 giorni.',
        },
        campi: campiIdentita('In quale centro vuoi provare'),
        avanti: 'Continua',
        azione: 'check',
        dopoCheck: { nuovo: 'anagrafica', esiste: 'gia-iscritto', iscritto: 'gia-iscritto' },
      },
      {
        id: 'anagrafica',
        passo: 2,
        titolo: 'Piacere di conoscerti',
        sub: 'Ci servono per intestare il pass e avvisarti quando è pronto.',
        campi: [...campiAnagrafica, campoInteressi('(così prepariamo la settimana giusta)')],
        avanti: 'Continua',
        azione: 'next',
        prossimo: 'attivazione',
        indietro: 'identita',
      },
      {
        id: 'attivazione',
        passo: 3,
        titolo: 'Come vuoi iniziare?',
        sub: 'Il primo ingresso lo facciamo insieme: ti mostriamo le sale e come prenotare i corsi.',
        campi: [
          {
            tipo: 'scelte',
            nome: 'modalita',
            opzioni: [
              { valore: 'visita', label: 'Fisso ora il primo ingresso', nota: 'Scegli giorno e ora, ti aspettiamo in reception.' },
              { valore: 'richiamata', label: 'Preferisco essere richiamato', nota: 'Ti chiamiamo noi per organizzare.' },
            ],
          },
        ],
        indietro: 'anagrafica',
      },
      {
        id: 'visita',
        titolo: 'Il tuo primo ingresso',
        sub: 'Porta un documento: attiviamo il pass in reception.',
        campi: [campoNota('Qualcosa che dovremmo sapere', 'Es. vengo con un amico, non mi alleno da un anno')],
        avanti: 'Scegli quando',
        azione: 'invia',
        conferma: 'conferma-visita',
        indietro: 'attivazione',
      },
      {
        id: 'richiamata',
        titolo: 'Ti chiamiamo noi',
        sub: 'Ti spieghiamo come attivare il pass e organizziamo il primo ingresso.',
        campi: [campoNota('Di cosa vuoi parlare', 'Es. vorrei sapere se ci sono corsi la sera')],
        avanti: 'Scegli quando',
        azione: 'invia',
        conferma: 'conferma-richiamata',
        indietro: 'attivazione',
      },
      stepGiaIscritto(
        'Il pass prova è riservato a chi non ha ancora avuto un abbonamento Lume, e la tua email risulta già registrata. Scrivici: troviamo la soluzione giusta per te.',
      ),
      {
        id: 'conferma-visita',
        titolo: 'Pass richiesto',
        sub: 'Scegli quando venire: ti aspettiamo in reception per attivarlo.',
        finale: true,
        prenotazione: 'visita',
        chiudi: 'Ho finito',
      },
      {
        id: 'conferma-richiamata',
        titolo: 'Pass richiesto',
        sub: 'Scegli quando possiamo chiamarti per organizzare il primo ingresso.',
        finale: true,
        prenotazione: 'richiamata',
        chiudi: 'Ho finito',
      },
      confermaAssistenza,
    ],
  },

  /**
   * ISCRIZIONE — sostituisce `n8n.lumeflow.it/form/iscrizioni`.
   *
   * Non è un checkout: raccoglie il lead con il piano di interesse e lo passa ai
   * consulenti via Airtable. Pagamento e contratto restano su PerfectGym.
   */
  iscrizione: {
    titolo: 'Richiesta di iscrizione',
    tipoRichiesta: TIPO_RICHIESTA.abbonamenti,
    tipoRichiestaSe: { iscritto: TIPO_RICHIESTA.assistenza },
    medium: 'FormIscrizione',
    passi: 3,
    steps: [
      {
        id: 'identita',
        passo: 1,
        titolo: 'Inizia da qui',
        sub: 'Ti prepariamo la proposta giusta prima di farti firmare qualcosa.',
        campi: [...campiIdentita('In quale centro vuoi allenarti'), campoInteressi()],
        avanti: 'Continua',
        azione: 'check',
        dopoCheck: { nuovo: 'anagrafica', esiste: 'piano', iscritto: 'gia-iscritto' },
      },
      {
        id: 'anagrafica',
        passo: 2,
        titolo: 'Piacere di conoscerti',
        sub: 'Il consulente del centro ti contatta con la proposta.',
        campi: campiAnagrafica,
        avanti: 'Continua',
        azione: 'next',
        prossimo: 'piano',
        indietro: 'identita',
      },
      {
        id: 'piano',
        passo: 3,
        titolo: 'Che formula cerchi?',
        sub: 'Serve solo a orientarci: il piano definitivo lo scegli col consulente.',
        campi: [
          {
            tipo: 'chipsRadio',
            nome: 'abbonamento',
            label: 'Piano di interesse',
            nota: '(opzionale)',
            opzioni: [
              { valore: 'Base', label: 'Base' },
              { valore: 'Plus', label: 'Plus' },
              { valore: 'Premium', label: 'Premium' },
              { valore: 'Da valutare', label: 'Non lo so ancora' },
            ],
          },
          campoNota('Obiettivi o domande', 'Es. mi alleno tre volte a settimana, mi interessa il nuoto'),
        ],
        avanti: 'Invia richiesta',
        azione: 'invia',
        conferma: 'conferma-iscrizione',
        indietro: 'identita',
      },
      stepGiaIscritto(
        'La tua email risulta già registrata: per rinnovi, cambi di piano o upgrade ti risponde direttamente la segreteria.',
      ),
      {
        id: 'conferma-iscrizione',
        titolo: 'Richiesta inviata',
        sub: 'Un consulente del centro ti contatta entro un giorno lavorativo. Se preferisci, fissa tu un appuntamento.',
        finale: true,
        prenotazione: 'visita',
        chiudi: 'Ho finito',
      },
      confermaAssistenza,
    ],
  },
};

/**
 * NEWSLETTER — non passa dal motore multi-step: due campi e un invio.
 * Vive in `src/components/forms/Newsletter.astro`, ma il tipo richiesta sta qui
 * per non avere stringhe Airtable sparse nei componenti.
 */
export const NEWSLETTER = {
  tipoRichiesta: TIPO_RICHIESTA.newsletter,
  medium: 'Newsletter',
} as const;

export type NomeFlusso = keyof typeof FLUSSI;
