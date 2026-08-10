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

  /** Iubenda Cookie Solution. Entrambi necessari perché il banner venga caricato. */
  iubendaSiteId: env.PUBLIC_IUBENDA_SITE_ID ?? '',
  iubendaCookiePolicyId: env.PUBLIC_IUBENDA_COOKIE_POLICY_ID ?? '',

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

  /** Beacon di visita (opzionale). Vuoto = nessun beacon inviato. */
  webhookVisit: env.PUBLIC_WEBHOOK_VISIT ?? '',

  /** Fuso orario delle sedi: usato per filtrare gli slot già passati. */
  timezone: 'Europe/Rome',
} as const;

/** Il banner cookie è realmente configurato? Se no, il tracciamento parte senza gate (solo dev). */
export const consensoGestito = Boolean(
  siteConfig.iubendaSiteId && siteConfig.iubendaCookiePolicyId,
);
