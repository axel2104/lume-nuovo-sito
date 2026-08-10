/**
 * Piccoli helper di formattazione condivisi dalle pagine editoriali.
 *
 * Qui c'era anche un mini-renderer Markdown per il campo `dettaglio` dei
 * servizi. Non serve più: quel testo è diventato il corpo Markdown del file,
 * quindi lo rende Astro con il parser vero. Restano le date.
 */

/** Data in italiano esteso, es. "12 settembre 2026". */
export function dataEstesa(d: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Rome',
  }).format(d);
}

/** Data compatta per le card, es. "12 set". */
export function dataBreve(d: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Rome',
  }).format(d);
}
