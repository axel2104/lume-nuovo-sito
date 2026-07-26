import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Hosting: Netlify.
// Output statico. Quando aggiungeremo i form server-side (prevendita/waitlist,
// check-member) passeremo a output: 'server' con l'adapter @astrojs/netlify.
export default defineConfig({
  site: 'https://www.lumefitness.it',
  vite: {
    plugins: [tailwindcss()],
  },
});
