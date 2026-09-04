/**
 * Round-trip Keystatic: rilegge ogni contenuto con lo stesso lettore che usa
 * il CMS.
 *
 * **Perché serve, dato che c'è già Zod.** Sono due validatori diversi con due
 * schemi diversi: `src/content.config.ts` decide cosa accetta il *sito*,
 * `keystatic.config.ts` cosa accetta l'*editor*. Zod ignora le chiavi che non
 * conosce, Keystatic rifiuta il file intero. Il risultato di una divergenza è
 * un sito che si costruisce benissimo e un CMS in cui quella pagina non si
 * apre più — un guasto che non si vede finché non è Alex a incontrarlo.
 *
 * Questo controllo non ha bisogno di un browser e non ha dipendenze oltre a
 * quelle del progetto: gira sempre, ed è il primo da guardare quando si
 * aggiunge un campo.
 *
 * Tre bug veri che ha trovato, come promemoria di cosa cercare:
 *  - `giorno: 1` invece di `giorno: '1'` — le select di Keystatic sono stringhe;
 *  - una data non quotata, che YAML interpreta come oggetto e non come testo;
 *  - il percorso di un singleton: `home.json`, non `home/index.json`.
 */
import { createReader } from '@keystatic/core/reader';
import config from '../keystatic.config.ts';
import { contatore } from './ambiente.mjs';

const { esito, chiudi } = contatore();
const reader = createReader(process.cwd(), config.default ?? config);

for (const nome of Object.keys(reader.singletons)) {
  try {
    const s = await reader.singletons[nome].read();
    esito(!!s, `singleton ${nome}`, s ? `${Object.keys(s).length} sezioni` : 'non letto');
  } catch (e) {
    esito(false, `singleton ${nome}`, e.message.split('\n').slice(0, 2).join(' '));
  }
}

for (const nome of Object.keys(reader.collections)) {
  try {
    const voci = await reader.collections[nome].all();
    const rotte = voci.filter((v) => !v.entry).map((v) => v.slug);
    esito(rotte.length === 0, `collection ${nome}`, `${voci.length} voci${rotte.length ? ' · rotte: ' + rotte.join(', ') : ''}`);
  } catch (e) {
    esito(false, `collection ${nome}`, e.message.split('\n').slice(0, 2).join(' '));
  }
}

// Qualche invariante di contenuto che vale la pena affermare, non solo leggere.
try {
  const centri = await reader.collections.centri.all();
  const aperti = centri.filter((c) => c.entry.stato === 'aperto');
  esito(aperti.length >= 2, 'almeno due centri aperti', aperti.map((c) => c.slug).join(', '));

  for (const c of aperti) {
    esito(
      c.entry.planning.length > 0,
      `${c.slug}: il planning non è vuoto`,
      `${c.entry.planning.length} lezioni`,
    );
    esito(
      Boolean(c.entry.telefono && !/000000/.test(c.entry.telefono)),
      `${c.slug}: telefono non segnaposto`,
      c.entry.telefono ?? '(vuoto)',
    );
  }

  // Un URL a "#" su un centro aperto è un pulsante che non porta da nessuna
  // parte: il codice lo nasconde, ma se è a "#" per dimenticanza va detto.
  for (const c of aperti) {
    esito(
      c.entry.perfectgymUrl !== '#',
      `${c.slug}: il portale PerfectGym ha un indirizzo`,
      c.entry.perfectgymUrl,
    );
  }
} catch (e) {
  esito(false, 'invarianti sui centri', e.message.split('\n')[0]);
}

/**
 * ─── Le chiavi che le pagine leggono devono esistere nei JSON ──────────────
 *
 * Keystatic non salva i campi vuoti: se in editor un campo opzionale resta
 * vuoto, dal file sparisce. Da quando le pagine leggono attraverso
 * `src/data/testi.ts` questo non rompe piu' la build — ma un testo che
 * scompare resta una cosa da sapere, e prima si sapeva solo guardando la
 * pagina online e accorgendosi che mancava un pezzo.
 *
 * Il controllo legge le coppie export/file da `src/data/testi.ts`, trova nelle
 * pagine gli accessi della forma `variabile.sezione.campo`, e li confronta con
 * quello che nel JSON c'e' davvero. Prende anche i refusi: `hero.evidenzza`
 * finisce nello stesso elenco.
 *
 * I campi letti con `campo()` di `src/lib/copy.ts` non compaiono qui, ed e'
 * giusto: quella funzione si usa proprio per i campi dichiarati opzionali, che
 * possono legittimamente non esserci. L'accesso diretto dice "questo campo mi
 * serve"; ed e' quello che questo controllo verifica.
 */
{
  const { readFile, readdir } = await import('node:fs/promises');
  const { join } = await import('node:path');

  // Coppie: nome esportato da src/data/testi.ts -> file JSON che rappresenta.
  const ts = await readFile('src/data/testi.ts', 'utf-8');
  const daVariabile = new Map(
    [...ts.matchAll(/import\s+(\w+)\s+from\s+'[^']*content\/pagine\/([\w-]+)\.json'/g)].map((m) => [m[1], m[2]]),
  );
  const daExport = new Map(
    [...ts.matchAll(/export const (\w+)[^=]*=\s*(\w+);/g)]
      .filter((m) => daVariabile.has(m[2]))
      .map((m) => [m[1], daVariabile.get(m[2])]),
  );

  const pagine = [];
  const raccogli = async (dir) => {
    for (const v of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, v.name);
      if (v.isDirectory()) await raccogli(p);
      else if (v.name.endsWith('.astro')) pagine.push(p);
    }
  };
  await raccogli('src/pages');

  const cache = new Map();
  const json = async (nome) => {
    if (!cache.has(nome)) cache.set(nome, JSON.parse(await readFile(`src/content/pagine/${nome}.json`, 'utf-8')));
    return cache.get(nome);
  };

  let controllate = 0;

  for (const file of pagine) {
    const src = await readFile(file, 'utf-8');

    // `import { testiHome as testi }` oppure `import { testiHome }`, e anche
    // l'import diretto del JSON, che non deve tornare di moda senza che
    // qualcuno se ne accorga.
    const usi = [];
    for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*'[^']*data\/testi'/g)) {
      for (const pezzo of m[1].split(',')) {
        const [nome, , alias] = pezzo.trim().split(/\s+/);
        if (daExport.has(nome)) usi.push({ variabile: alias || nome, file: daExport.get(nome) });
      }
    }
    for (const m of src.matchAll(/import\s+(\w+)\s+from\s+'[^']*content\/pagine\/([\w-]+)\.json'/g)) {
      usi.push({ variabile: m[1], file: m[2] });
    }
    if (!usi.length) continue;

    for (const uso of usi) {
      const dati = await json(uso.file);
      const letti = new Set(
        [...src.matchAll(new RegExp('\\b' + uso.variabile + '\\.([A-Za-z0-9_]+)(?:\\.([A-Za-z0-9_]+))?', 'g'))].map(
          (m) => m[1] + (m[2] ? '.' + m[2] : ''),
        ),
      );
      const mancanti = [...letti].filter((strada) => {
        const [a, b] = strada.split('.');
        if (!(a in dati)) return true;
        if (b === undefined) return false;
        const sezione = dati[a];
        return sezione && typeof sezione === 'object' && !Array.isArray(sezione) ? !(b in sezione) : false;
      });
      controllate++;
      esito(
        mancanti.length === 0,
        `${file.replace(/\\/g, '/')} legge solo campi che esistono in ${uso.file}.json`,
        mancanti.length ? `mancano: ${mancanti.join(', ')}` : `${letti.size} campi`,
      );
    }
  }

  esito(controllate > 0, 'le pagine che leggono i testi del CMS sono state controllate', `${controllate}`);
}

chiudi('contenuti');
