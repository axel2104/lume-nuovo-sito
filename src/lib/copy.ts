/**
 * Utilità per i testi che arrivano dal CMS.
 *
 * I contenuti delle pagine vivono in `src/content/pagine/*` come JSON scritti
 * da Keystatic. Sono testo semplice, non HTML: un campo di testo dove si può
 * scrivere markup è un campo dove prima o poi qualcuno incolla un `<div>` e
 * rompe la pagina, e nel frattempo Astro deve rinunciare all'escaping.
 *
 * Quindi due sole convenzioni, entrambe innocue:
 *  - **andare a capo** con un vero ritorno a capo → `righe()`
 *  - **inserire un numero calcolato** con `{discipline}` → `conValori()`
 *
 * E una terza cosa, che non è una convenzione ma una difesa: `campo()`, per
 * leggere quello che Keystatic può non aver scritto.
 */

/**
 * Spezza un testo sui ritorni a capo.
 *
 * Serve per i titoli, dove l'andata a capo è una scelta grafica: "Illumina / la
 * tua forza" su una riga sola perde il ritmo. In pagina si rende così:
 *
 * ```astro
 * {righe(t.titolo).map((r, i) => <>{i > 0 && <br />}{r}</>)}
 * ```
 */
export function righe(testo?: string | null): string[] {
  return String(testo ?? '')
    .split('\n')
    .map((r) => r.trim())
    .filter(Boolean);
}

/**
 * Sostituisce i segnaposto `{nome}` con i valori passati.
 *
 * Esiste perché alcune frasi contengono un numero che non deve invecchiare —
 * "trenta attività fra corsi di gruppo…" diventa una bugia appena si aggiunge
 * un corso. Con `{discipline}` il numero lo conta il sito.
 *
 * Un segnaposto sconosciuto resta visibile così com'è: meglio vedere
 * `{disciplinee}` in pagina e correggerlo, che vedere `undefined`.
 */
export function conValori(testo?: string | null, valori: Record<string, string | number> = {}): string {
  return String(testo ?? '').replace(/\{(\w+)\}/g, (intero, nome) =>
    nome in valori ? String(valori[nome]) : intero,
  );
}

/**
 * Legge un campo che nel JSON può non esserci.
 *
 * **Keystatic non salva i campi vuoti.** Se in editor un campo opzionale resta
 * vuoto, dal JSON scompare del tutto. Le pagine importano quei JSON
 * direttamente (`import t from '../content/pagine/scuola-nuoto.json'`), quindi
 * il tipo non viene da uno schema ma dedotto da TypeScript dal file: un campo
 * scomparso non diventa `undefined`, diventa `Property 'inizio' does not
 * exist` — e `astro check` ferma la build di Netlify.
 *
 * È accaduto il 4 settembre 2026: un salvataggio della pagina scuola nuoto ha
 * fatto sparire `stagione.inizio`, `stagione.fine` e `listino.testo`, che
 * erano vuoti di proposito, e il deploy si è fermato. La pagina sapeva già
 * gestire il vuoto; quello che non sapeva gestire era l'assenza.
 *
 * Va usata per ogni campo che l'editor può lasciare vuoto. Per i campi sempre
 * presenti l'accesso diretto va benissimo: è più leggibile, e se sparisce un
 * campo obbligatorio è giusto che la build si fermi.
 */
export function campo<T = string>(oggetto: unknown, chiave: string): T | undefined {
  if (!oggetto || typeof oggetto !== 'object') return undefined;
  const valore = (oggetto as Record<string, unknown>)[chiave];
  return (valore === '' || valore == null ? undefined : (valore as T));
}
