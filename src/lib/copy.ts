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
