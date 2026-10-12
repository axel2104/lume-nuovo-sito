import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import keystatic from '@keystatic/astro';
import sitemap from '@astrojs/sitemap';

// Hosting: Netlify.
//
// Il sito resta pre-renderizzato pagina per pagina: l'adapter serve solo perché
// Keystatic ha bisogno di due rotte eseguite sul server (l'editor e il suo
// endpoint OAuth). Tutto il resto continua a essere HTML statico servito dalla
// CDN, quindi le performance non cambiano.
//
// `site` guida canonical, og:url e sitemap, e va scelto in base al contesto:
//  - produzione  -> URL, l'indirizzo pulito del sito
//  - preview/branch deploy -> DEPLOY_PRIME_URL, l'indirizzo di quel deploy
// Usare DEPLOY_PRIME_URL anche in produzione darebbe canonical su
// `main--sito.netlify.app` invece che su `sito.netlify.app`.
const contesto = process.env.CONTEXT;
const site =
  (contesto === 'production'
    ? process.env.URL
    : process.env.DEPLOY_PRIME_URL || process.env.URL) || 'https://www.lumefitness.it';

export default defineConfig({
  site,
  // Le pagine si precaricano quando l'utente sfiora un link: la navigazione
  // diventa quasi istantanea senza cambiare una riga di markup.
  prefetch: true,
  // Le foto si ottimizzano in build con sharp (`imageCDN: false`): diventano file statici
  // sotto /_astro/ con l'hash nel nome, quindi cache di un anno e nessuna trasformazione
  // a ogni accesso. Misurato il 13/10/2026: 421 file, build di 12 secondi. Con il CDN delle
  // immagini di Netlify ogni variante si trasformava al volo e la cache si svuotava a
  // ogni deploy. Per vedere le foto in locale va bene anche il contenuto di dist.
  adapter: netlify({ imageCDN: false }),
  integrations: [
    react(),
    keystatic(),
    // Sitemap XML generata in build (sitemap-index.xml + sitemap-0.xml) dagli
    // URL statici; il valore di `site` sopra decide l'host dei canonical.
    // /keystatic resta fuori perché è una rotta server, non una pagina.
    sitemap(),
  ],
});
