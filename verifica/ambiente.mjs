/**
 * Impalcatura condivisa dei controlli in `verifica/`.
 *
 * Due scelte che sembrano dettagli e non lo sono.
 *
 * **Playwright non è una dipendenza del progetto.** Scaricare un browser per
 * fare `npm install` è un prezzo che non deve pagare chi vuole solo mandare
 * online una modifica ai testi. I controlli che ne hanno bisogno si dichiarano
 * *salta* quando non lo trovano, e lo dicono a voce alta: un controllo assente
 * che tace è peggio di un controllo che non c'è, perché sembra passato.
 * Per abilitarli: `npm i -D playwright && npx playwright install chromium`.
 *
 * **Il server statico è scritto qui a mano.** Serve `dist/` per pochi secondi,
 * e importare un pacchetto per farlo significherebbe che il controllo si rompe
 * il giorno che quel pacchetto non c'è. Sessanta righe di `node:http` non si
 * rompono.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

const TIPI = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

/**
 * Serve una cartella su una porta libera.
 *
 * Nota su `dist/`: le immagini passano dalla Image CDN di Netlify
 * (`/.netlify/images?url=…`), che qui non esiste. Le foto rispondono 404 ed è
 * normale — i controlli che contano le risposte 4xx devono escluderle, non
 * inseguirle.
 *
 * @returns {Promise<{origine: string, chiudi: () => Promise<void>}>}
 */
export async function servi(cartella = 'dist', porta = 8099) {
  const radice = normalize(cartella);

  const server = createServer(async (req, res) => {
    try {
      const percorso = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      // Nessun percorso può uscire dalla cartella servita.
      const dentro = normalize(join(radice, percorso)).startsWith(radice);
      if (!dentro) {
        res.writeHead(403).end('vietato');
        return;
      }

      let file = join(radice, percorso);
      try {
        if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      } catch {
        // Non esiste così com'è: Astro genera cartelle con index.html.
        file = join(radice, percorso, 'index.html');
      }

      const corpo = await readFile(file);
      res.writeHead(200, { 'content-type': TIPI[extname(file)] ?? 'application/octet-stream' });
      res.end(corpo);
    } catch {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<h1>404</h1>');
    }
  });

  await new Promise((ok, ko) => {
    server.once('error', ko);
    server.listen(porta, '127.0.0.1', ok);
  });

  return {
    origine: `http://127.0.0.1:${porta}`,
    chiudi: () => new Promise((ok) => server.close(ok)),
  };
}

/**
 * Apre un Chromium, o restituisce `null` se non è disponibile.
 *
 * `PLAYWRIGHT_CHROMIUM` permette di indicare un binario già presente sulla
 * macchina: è così che questi controlli girano negli ambienti dove il browser
 * è preinstallato e Playwright non deve scaricarne un altro.
 */
export async function apriBrowser() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.log(
      'SALTATO — Playwright non è installato.\n' +
        '  Per abilitare questi controlli:\n' +
        '    npm i -D playwright && npx playwright install chromium',
    );
    return null;
  }

  const indicato = process.env.PLAYWRIGHT_CHROMIUM;
  const opzioni = indicato && existsSync(indicato) ? { executablePath: indicato } : {};

  try {
    return await chromium.launch(opzioni);
  } catch (e) {
    console.log(
      'SALTATO — Chromium non si avvia: ' + e.message.split('\n')[0] + '\n' +
        '  Prova: npx playwright install chromium',
    );
    return null;
  }
}

/** Contatore di esiti condiviso, così ogni controllo stampa allo stesso modo. */
export function contatore() {
  let ko = 0;
  return {
    esito(ok, testo, extra = '') {
      if (!ok) ko++;
      console.log(`${ok ? 'OK ' : 'KO '} ${testo}${extra ? ' — ' + extra : ''}`);
    },
    /** Stampa il totale e imposta il codice di uscita. Va chiamato per ultimo. */
    chiudi(nome) {
      if (ko) console.log(`\n${nome}: ${ko} controlli falliti`);
      else console.log(`\n${nome}: tutto a posto`);
      process.exitCode = ko ? 1 : 0;
      return ko;
    },
  };
}
