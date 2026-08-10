import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Hosting: Netlify.
// Output statico. Quando aggiungeremo i form server-side (prevendita/waitlist,
// check-member) passeremo a output: 'server' con l'adapter @astrojs/netlify.
//
// `site` guida canonical, og:url e sitemap. Su Netlify usiamo l'URL reale del
// deploy (DEPLOY_PRIME_URL sui preview, URL sul sito principale): altrimenti in
// staging i canonical punterebbero a www.lumefitness.it, cioè al WordPress
// ancora online, e Google seguirebbe quello.
const site =
  process.env.DEPLOY_PRIME_URL || process.env.URL || 'https://www.lumefitness.it';

export default defineConfig({
  site,
  vite: {
    plugins: [tailwindcss()],
  },
});
