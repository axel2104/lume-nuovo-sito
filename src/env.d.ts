/// <reference path="../.astro/types.d.ts" />

/**
 * Funzioni esposte da `src/scripts/tracking.js` sul `window`.
 *
 * Lo script e' JavaScript e non passa dal controllo dei tipi, ma i componenti
 * che lo chiamano sono TypeScript: senza queste dichiarazioni `astro check`
 * fallisce su ogni chiamata. Tutte opzionali: se il consenso ai cookie non
 * c'e', lo script non si carica e le funzioni non esistono.
 */
interface Window {
  LUME_CFG?: Record<string, string | undefined>;
  lumeTrack?: (evento: string, dati?: Record<string, unknown>) => void;
  lumeGetUtm?: () => Record<string, string | undefined>;
  lumeGetVid?: () => string | null;
}

