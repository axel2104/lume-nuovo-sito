/**
 * I testi delle pagine, letti attraverso una forma dichiarata qui.
 *
 * ─── Perché non si importa più il JSON direttamente ────────────────────────
 * Le pagine facevano `import t from '../content/pagine/home.json'` e
 * TypeScript ne dedeuceva il tipo dal file. Sembra comodo — i nomi dei campi
 * in autocompletamento — ed è una trappola: quei JSON li riscrive Keystatic, e
 * **Keystatic non salva i campi vuoti**.
 *
 * Il 4 settembre 2026 un salvataggio della pagina scuola nuoto ha fatto
 * sparire `stagione.inizio`, `stagione.fine` e `listino.testo`, che erano
 * vuoti in attesa dei dati della stagione. Tre chiavi in meno nel file,
 * quattro errori «Property 'inizio' does not exist», build di Netlify ferma.
 * Non era un caso raro: su `home` l'editor ha 84 campi e solo 18 obbligatori,
 * su `scuolaNuoto` 49 e 11. Ogni salvataggio può togliere uno degli altri
 * sessanta.
 *
 * Un tipo dedotto da un file che riscrive qualcun altro non è un tipo: è
 * un'istantanea. Quindi qui la forma è dichiarata larga, e il controllo delle
 * chiavi si fa dove i dati si possono guardare davvero — `npm run
 * verifica:contenuti` confronta campo per campo quello che le pagine leggono
 * con quello che nei JSON c'è, e lo dice in due secondi in locale invece che
 * dalla build fallita venti minuti dopo.
 *
 * Il baratto è consapevole: si perde l'autocompletamento sui testi del CMS, si
 * guadagna che un salvataggio dall'editor non possa fermare la pubblicazione
 * del sito. Per i campi che possono essere vuoti c'è `campo()` in
 * `src/lib/copy.ts`, che tratta anche la stringa vuota come assente.
 */
import homeJson from '../content/pagine/home.json';
import scuolaNuotoJson from '../content/pagine/scuola-nuoto.json';

/**
 * Un albero di testi editoriali: sezioni, stringhe, liste di oggetti.
 *
 * Le foglie sono `any` di proposito. Non è pigrizia: è il riconoscimento che
 * la forma di questi file la decide l'editor, non il codice.
 */
export type TestiPagina = { [chiave: string]: any };

export const testiHome: TestiPagina = homeJson;
export const testiScuolaNuoto: TestiPagina = scuolaNuotoJson;
