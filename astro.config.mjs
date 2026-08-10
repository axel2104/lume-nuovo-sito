import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Hosting: Netlify.
// Output statico. Quando aggiungeremo i form server-side (prevendita/waitlist,
// check-member) passeremo a output: 'server' con l'adapter @astrojs/netlify.
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
  vite: {
    plugins: [tailwindcss()],
  },
});
