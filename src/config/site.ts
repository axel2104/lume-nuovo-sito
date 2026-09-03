/**
 * Configurazione runtime del sito.
 *
 * Tutti i valori arrivano da variabili d'ambiente con prefisso `PUBLIC_`
 * (quindi esposte al browser: NON metterci mai segreti — i webhook devono
 * essere endpoint pubblici che validano lato server).
 *
 * In locale: copia `.env.example` in `.env` e compila.
 * Su Netlify: Site settings → Environment variables.
 */

const env = import.meta.env as Record<string, string | undefined>;

export const siteConfig = {
  /** Container Google Tag Manager, es. "GTM-XXXXXXX". Vuoto = GTM non caricato. */
  gtmId: env.PUBLIC_GTM_ID ?? '',

  /**
   * Iubenda Cookie Solution. Entrambi necessari perché il banner venga caricato.
   *
   * I default non sono segnaposto: sono gli ID reali dell'account Lume,
   * recuperati dalla configurazione del vecchio sito. Stanno qui e non solo
   * fra le variabili Netlify per una ragione precisa — sono **identificativi
   * pubblici**, presenti in chiaro nell'HTML di qualunque sito che usi
   * Iubenda, quindi non c'è niente da proteggere; e se li lasciassimo vuoti in
   * attesa di configurare l'ambiente, una build fatta prima di quel passaggio
   * andrebbe online senza banner. Un default sbagliato si vede subito, un
   * banner assente no.
   *
   * Le variabili d'ambiente restano e hanno la precedenza: servono per gli
   * ambienti di prova, dove va usato un altro account.
   */
  iubendaSiteId: env.PUBLIC_IUBENDA_SITE_ID ?? '3771007',
  iubendaCookiePolicyId: env.PUBLIC_IUBENDA_COOKIE_POLICY_ID ?? '91706111',

  /**
   * Webhook "verifica iscritto": riceve { email, centro, attivita, pagina, cta, utm, vid },
   * risponde { stato: "nuovo" | "esiste[_gruppo]" | "iscritto[_gruppo]" }.
   * Vuoto = il form fa sempre fallback a stato "nuovo" (utile in sviluppo).
   */
  webhookCheck: env.PUBLIC_WEBHOOK_CHECK ?? '',

  /**
   * Webhook "form compilato": riceve l'intero payload del lead.
   * Vuoto = il payload viene solo loggato in console.
   */
  webhookLead: env.PUBLIC_WEBHOOK_LEAD ?? '',

  /**
   * Landing della prevendita dei nuovi centri.
   *
   * Vive fuori da questo sito: ha un funnel suo, con contratto e pagamento, e
   * i suoi lead finiscono in una tabella diversa da RICHIESTE — il campo SEDE
   * non conosce nemmeno Piediripa e Urban. Quindi i pulsanti "prevendita"
   * portano là e non aprono i form del sito.
   */
  prevenditaUrl: 'https://promo.lumefitness.it',

  /** Beacon di visita (opzionale). Vuoto = nessun beacon inviato. */
  webhookVisit: env.PUBLIC_WEBHOOK_VISIT ?? '',

  /**
   * Webhook che restituisce il planning aggiornato di un centro.
   *
   * Interrogato dal browser con `?centro=<slug>`, deve rispondere
   * `{ aggiornatoIl, lezioni: [...] }`. Vuoto = la pagina mostra solo lo
   * snapshot presente nei contenuti, senza tentare aggiornamenti.
   */
  webhookPlanning: env.PUBLIC_WEBHOOK_PLANNING ?? '',

  /**
   * Origine dell'istanza Cal.com da cui caricare l'embed.
   *
   * `https://cal.com` per il cloud, `https://cal.lumefitness.it` (o simile) per
   * l'istanza self-hosted. È una variabile e non una costante proprio per
   * rendere la migrazione a self-hosted un cambio di configurazione invece di
   * una modifica al codice.
   */
  calcomOrigin: env.PUBLIC_CALCOM_ORIGIN ?? 'https://cal.com',

  /** Fuso orario delle sedi: usato per filtrare gli slot già passati. */
  timezone: 'Europe/Rome',
} as const;

/** Il banner cookie è realmente configurato? Se no, il tracciamento parte senza gate (solo dev). */
export const consensoGestito = Boolean(
  siteConfig.iubendaSiteId && siteConfig.iubendaCookiePolicyId,
);
