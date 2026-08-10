import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import keystatic from '@keystatic/astro';

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
  adapter: netlify(),
  integrations: [react(), keystatic()],
});
