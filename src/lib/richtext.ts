/**
 * Mini-renderer per i campi stringa multi-paragrafo (es. `dettaglio` dei servizi).
 *
 * Non serve una libreria Markdown completa: qui il contratto è volutamente
 * minimo — paragrafi separati da riga vuota, grassetto con **doppi asterischi**.
 * L'input viene sempre escapato prima di essere trasformato, così il campo resta
 * sicuro anche se un domani a compilarlo sarà un CMS.
 */

function escapeHtml(testo: string): string {
  return testo
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function paragrafi(testo: string | undefined | null): string[] {
  if (!testo) return [];
  return testo
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Converte un paragrafo in HTML: escape + **grassetto** + a capo singoli. */
export function inline(testo: string): string {
  return escapeHtml(testo)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />');
}

/** Testo completo → HTML pronto per `set:html`. */
export function richtext(testo: string | undefined | null): string {
  return paragrafi(testo)
    .map((p) => `<p>${inline(p)}</p>`)
    .join('');
}

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
