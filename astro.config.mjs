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
  // Le immagini le ridimensiona e converte il CDN di Netlify, su richiesta e
  // in cache. Misurato su 13 foto: con questa opzione la build dura 8 secondi,
  // pre-generando tutto con sharp (`netlify({ imageCDN: false })`) ne dura 25 e
  // produce 49 file di varianti. Con un CMS dove ogni salvataggio fa una build,
  // e con una fototeca destinata a crescere, la differenza conta.
  // Rovescio della medaglia: le varianti esistono solo su Netlify, quindi per
  // vedere le foto in locale si usa `npm run dev`, non il contenuto di dist.
  adapter: netlify(),
  integrations: [
    react(),
    keystatic(),
    // Sitemap XML generata in build (sitemap-index.xml + sitemap-0.xml) dagli
    // URL statici; il valore di `site` sopra decide l'host dei canonical.
    // /keystatic resta fuori perché è una rotta server, non una pagina.
    sitemap(),
  ],
});
