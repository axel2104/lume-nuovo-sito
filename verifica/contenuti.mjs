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

chiudi('contenuti');
