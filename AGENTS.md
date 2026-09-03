# Lume Fitness Club — istruzioni per chi lavora su questo repo

Sito di Lume Fitness Club, quattro centri nelle Marche. Astro statico con
adapter Netlify, contenuti in Markdown/JSON editati da Keystatic, form
collegati a webhook n8n. In italiano: codice, commenti, contenuti, messaggi di
commit. Se scrivi in inglese, stoni.

**Lo stato del lavoro — cosa è fatto, cosa manca, cosa aspetta il cliente — è
in [`docs/STATO.md`](docs/STATO.md). Leggilo prima di decidere cosa fare.**

Attenzione a [`ARCHITETTURA.md`](ARCHITETTURA.md): è il documento di progetto
del 22 luglio, scritto *prima* di implementare, e diverse sue scelte sono
state poi cambiate — Tailwind, Supabase per i form, Stripe, la mappa, la
tipografia. Ha un'intestazione che elenca le differenze una per una. È utile
per capire perché il progetto esiste, dannoso se preso per la descrizione di
com'è fatto oggi.

## Comandi

```bash
npm run dev              # sviluppo su :4321, CMS su /keystatic (scrive sui file locali)
npm run build            # astro check + astro build. Fallisce se ci sono errori di tipo
npm run verifica         # controlli senza browser: contenuti + test unitari. Sempre veloci
npm run verifica:tutto   # build + tutto, browser compreso. Prima di un commit che si vede
```

I controlli col browser hanno bisogno di Playwright, che **non** è una
dipendenza del progetto: scaricare un browser per cambiare un testo è un
prezzo che non deve pagare chi cambia un testo. Per abilitarli:

```bash
npm i -D playwright && npx playwright install chromium
```

Se non lo trovano si dichiarano *saltati* e uscono con successo. Se hai già un
Chromium sulla macchina, indicalo con `PLAYWRIGHT_CHROMIUM=/percorso/al/binario`
invece di scaricarne un altro.

## Come si verifica, e perché in questo ordine

| Comando | Cosa prende |
|---|---|
| `npm run build` | errori di tipo. `astro check` è dentro `build` di proposito |
| `verifica:contenuti` | **divergenze fra i due schemi** (sotto), invarianti sui centri |
| `npm test` | logica pura del planning e degli abbonamenti, 25 test |
| `verifica:pagine` | link morti, 4xx, scorrimento orizzontale, bersagli tattili, gate consensi |
| `verifica:form` | i tre passi di un form fino alla conferma e alla prenotazione |
| `verifica:video` | il video dei centri: caricamento, ripiego, reduced-motion |

### I due schemi: l'errore più facile da fare qui dentro

Ogni contenuto è validato **due volte, da due schemi diversi**:

- `src/content.config.ts` (Zod) decide cosa accetta il **sito**;
- `keystatic.config.ts` decide cosa accetta l'**editor**.

Zod ignora le chiavi che non conosce. Keystatic **rifiuta il file intero**.
Quindi se aggiungi un campo solo al primo, il sito si costruisce benissimo e
la pagina non si apre più nel CMS — un guasto che non vedi tu, vede il
cliente. `npm run verifica:contenuti` esiste per questo: **rilancialo ogni
volta che tocchi un campo.**

Tre bug veri che ha già trovato, come idea di cosa cercare:

- `giorno: 1` invece di `giorno: '1'` — le select di Keystatic sono stringhe;
- una data non quotata, che YAML interpreta come oggetto invece che come testo;
- il percorso di un singleton è `home.json`, non `home/index.json`.

E una trappola nel test stesso, già disinnescata ma da non reintrodurre: non
far leggere a quel controllo una copia compilata a mano della configurazione.
Resta indietro, e il test passa validando i contenuti nuovi contro lo schema
di ieri — cioè tace proprio nel caso in cui deve parlare.

### Attenzione a `astro check`

Verificare la sintassi con `@astrojs/compiler` **non** equivale a `astro
check`: il primo controlla che il file si compili, il secondo i tipi. Una
volta 33 errori sono passati per questa differenza. La causa era la stessa per
tutti: il restringimento di tipo di `instanceof` non sopravvive dentro una
**dichiarazione di funzione hoisted** — `async function invia()` va scritta
come funzione freccia perché il narrowing regga.

## Dove sta cosa

```
src/
  pages/            una pagina per file; [slug].astro per centri e discipline
  components/       Header, Footer, forms/, planning/
  content/          i contenuti veri, editati da Keystatic
    centri/*.md     sede, orari, sale, planning, link ai portali
    discipline/     35 schede
    abbonamenti/    3 piani
    pagine/*.json   i testi delle pagine singole (singleton Keystatic)
  config/
    site.ts         variabili d'ambiente e configurazione runtime
    forms.ts        i flussi dei form, passo per passo
    planning.ts     logica pura degli orari: slot, giorni, raggruppamenti
  lib/              *.client.js — il JavaScript che gira nel browser
  styles/           global, leadform, editoriale, bento, planning
docs/               STATO, FORM, N8N, PLANNING, SUPABASE
verifica/           i controlli col browser
test/               i test unitari (node:test, importano i .ts direttamente)
supabase/           migrazioni e test, inerti finché nessuno le applica
```

## Convenzioni

**I commenti dicono perché, non cosa.** Il codice già dice cosa fa. Il
commento serve a chi domanda "perché così e non nel modo ovvio", e la
risposta è quasi sempre un guasto già incontrato. Se togli un commento del
genere, ricontrolla di non stare per rifare quell'errore.

**I contenuti non si scrivono nel codice.** Prezzi, orari, testi, link ai
portali stanno in `src/content/` e si editano dal CMS. Se ti serve un dato
nuovo in pagina, il campo va aggiunto **in entrambi** gli schemi.

**Niente `!important` su selettori che non controlli.** Vale per il documento
Iubenda incorporato: gli si dà una superficie dichiarata (`.leg-doc`) e non si
combatte il suo CSS.

**I bersagli tattili arrivano a 44px.** Eccezione: i link *in linea* dentro un
testo, che la WCAG 2.2 esenta (2.5.8) perché la loro altezza la decide
l'interlinea. `verifica:pagine` applica già questa distinzione.

**Ogni ripiego deve essere una via d'uscita, non un vicolo cieco.** Il
calendario non c'è → si mostra l'agenda della segreteria. Il codec non c'è →
resta la foto e il comando di pausa **non** compare. Il webhook è giù → il
lead passa comunque. Un guasto silenzioso che sembra funzionare è peggio di
un errore visibile.

## Vincoli non negoziabili

**Le variabili `PUBLIC_*` finiscono nel bundle del browser.** Non ci vanno
segreti, mai. I webhook devono essere endpoint pubblici che validano lato
server. La risposta del webhook di verifica è pubblica: non deve contenere
dati personali (c'è una raccomandazione esplicita in `docs/N8N.md`, e la
correzione è ancora aperta).

**Non pubblicare dati personali di terzi.** Dal vecchio sito sono state
scartate tre recensioni Google firmate con nome e cognome e i nomi di due
istruttori: non c'è una base giuridica per ripubblicarli. Se ne trovi altri,
scartali e dillo.

**Non inventare prezzi, date o orari.** Se un dato manca, la pagina deve dirlo
e chiedere un contatto — c'è già il modello in `/scuola-nuoto`, dove il
listino vuoto mostra un invito invece di una tabella. Un prezzo sbagliato su
un sito è una promessa che qualcuno viene a incassare in reception.

**Non pubblicare contenuti scaduti.** Gli orari piscina 2024/25 sono
trascritti in `docs/PLANNING-PISCINA.md` e deliberatamente **non** pubblicati.

## Se lavori attraverso il ponte verso il computer del cliente

Il repo vive su una macchina Windows e si raggiunge da una VM Linux montata su
`$HOME/mnt/lume-nuovo-sito`. Tre cose che non funzionano come ti aspetti:

- **`unlink` è vietato.** Quindi `git checkout`, `tar -x` e ogni sovrascrittura
  che passa da una cancellazione falliscono. Per sovrascrivere: `cat sorgente > destinazione`.
- **I `.git/*.lock` non si possono rimuovere**, e git ne lascia uno dopo ogni
  comando. Vanno *spostati* (`mv .git/index.lock .git/_lock/…`) prima di ogni
  invocazione di git, non dopo.
- **`git push` non funziona**: il remote è HTTPS e le credenziali stanno nel
  Credential Manager di Windows, invisibile da lì. Il push lo fa il cliente.
  Non chiedergli un token e non accettarlo se lo offre.

Il lavoro pesante (build, test, npm) va fatto nel container, non sulla VM
montata: sono due filesystem separati e un file scritto da uno non è visibile
all'altro.
