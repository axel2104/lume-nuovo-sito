import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// Hosting: Netlify.
// Per ora output statico. Quando aggiungeremo i form server-side
// (prevendita/waitlist, check-member) passeremo a output: 'server'
// con l'adapter @astrojs/netlify.
export default defineConfig({
  site: 'https://www.lumefitness.it',
  integrations: [tailwind()],
});
