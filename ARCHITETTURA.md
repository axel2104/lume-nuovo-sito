# LUMe Fitness Club — Architettura del nuovo sito

> Documento di lavoro condiviso. Stato: **brainstorm / da approvare**. Nessuna implementazione avviata.
> Ultimo aggiornamento: 22 luglio 2026

---

## 1. Obiettivo

Riscrivere l'intero sito **lumefitness.it** (oggi WordPress + Elementor) in uno stack moderno, veloce e performante, facilmente deployabile e con il massimo controllo su modifiche e nuovi inserimenti.

Il sito deve raccontare cos'è Lume a livello generale, poi declinarsi nello specifico per i **4 centri**, ospitare una **wiki** (in un secondo momento) e una **landing abbonamenti** collegata a PerfectGym.

---

## 2. Punto di partenza (cosa esiste oggi)

### 2.1 Sito attuale — backup WordPress
- **CMS:** WordPress 6.9.5 + tema `hello-elementor`, tutto costruito con **Elementor / Elementor Pro**.
- **Plugin principali:** Elementor Pro, BasePress (wiki/knowledge base), Yoast SEO, Redirection, Google Site Kit, Iubenda (cookie/privacy), QuillForms (moduli lead).
- **Database:** dump MariaDB/MySQL, 48 tabelle (prefisso `eJ3N0_`), ~1.068 file media.
- **Contenuti rilevati:** sedi Macerata e Montecassiano, corsi (CrossFit, Reformer Pilates, Spinning, Les Mills, Acqua Fitness, IntensitYou, Yoga), Scuola Nuoto bambini, corso estivo intensivo, blog.
- **Criticità dello stack attuale:** pesante, dipendente da decine di plugin, difficile da versionare e controllare, performance limitate dal page builder.

### 2.2 Progetto Astro già avviato
Nella cartella `lume-fitness/` esiste già una base **Astro 4 + Tailwind + React islands** con:
- Componenti riutilizzabili: `Header`, `Footer`, `Layout`, `ClubSelector`, `ClubsMap` (maplibre-gl), `VideoPlayer` (hls.js), form vari (`PrevenditaForm`, `SedeForm`, `BookingForm`, `MemberCheck`).
- Pagine: home, `sedi/macerata`, `sedi/montecassiano`, `prevendita`, `promo`, `abbonamenti`, `corsi`, `blog`, form per sede.
- Dati centralizzati in `src/lib/data.ts` (sedi, corsi, piani, blog).
- Integrazioni: Supabase (lead form), Stripe (checkout), maplibre (mappe).

**Problema da risolvere:** il config è `output: 'static'` su GitHub Pages, ma coesistono API routes (`/api/*`) e un Cloudflare Worker separato — incoerente. Un sito statico su GitHub Pages non esegue quelle API.

### 2.3 Landing prevendita attiva
`promo.lumefitness.it` — landing/form di prevendita attualmente online. Da consolidare nel nuovo sito come sezione `/prevendita`.

---

## 3. Stack tecnologico scelto

| Area | Scelta | Perché |
|------|--------|--------|
| **Framework** | Astro (ibrido/SSR) | Zero JS di default, isole interattive solo dove servono. Massima performance su siti a forte contenuto. Già avviato. |
| **Styling** | Tailwind CSS + design system brand | Design coordinato definito una volta (token colori/font/spaziature) e riusato ovunque. |
| **Interattività** | React islands | Solo per form, mappa, video, selettore centri. Il resto è HTML statico. |
| **Hosting / Deploy** | **Netlify** (adapter `@astrojs/netlify`) | Deploy automatico a ogni push, anteprime per branch/PR, form e API come Netlify Functions native. |
| **Contenuti** | **Content Collections** (Markdown/MDX, type-safe con Zod) | Gestiti da sviluppatori via git. Massimo controllo, tutto versionato, nessun CMS/servizio esterno. |
| **Form / Lead** | Supabase (già integrato) via Netlify Functions | Raccolta lead e prenotazioni. |
| **Abbonamenti** | **Deep-link a PerfectGym** | Pagina con piani + CTA che rimandano al flusso iscrizione+pagamento di PerfectGym. Semplice e sicuro. |
| **Wiki** | Starlight (da valutare più avanti) | Framework docs di Astro, stessa codebase, ricerca integrata. Slot `/wiki` pronto. |

### 3.1 Perché questo stack risponde ai requisiti
- **Velocità/performance:** Astro statico-first = pagine leggerissime, ottime su Core Web Vitals e SEO.
- **Facilmente deployabile:** Netlify → `git push` = online, con anteprima di ogni modifica prima della pubblicazione.
- **Controllo massimo:** tutto è codice + contenuti versionati in git; niente database o plugin da amministrare; ogni cambiamento è tracciato e reversibile.
- **Nuovi inserimenti facili:** aggiungere un centro, un corso o un articolo = aggiungere un file Markdown; il template fa il resto.

---

## 4. Identità di brand (estratta dal backup)

- **Nome:** LUMe Fitness Club
- **Tagline attuale:** "Benessere a 360°"
- **Logo:** marchio monocromatico minimale — emblema circolare con linea ECG/battito che forma una "M", wordmark `LUMe | FITNESS CLUB`. File sorgente presenti nel backup (`logonero.png`, `LUMELOGO_ribbon.png`, favicon).
- **Palette attuale (Elementor kit):**
  - Nero `#000000` (primario)
  - Rosso/cremisi `#D7272A` (secondario/accento) — nel progetto Astro è usato `#C40042`
  - Bianco `#FFFFFF`
  - Giallo accento `#F8F812` (usato saltuariamente)
- **Tipografia attuale:** **Teko** (display condensato, titoli), **Roboto Condensed** (testo), Bungee Outline (decorativo).

> Nota: lo stile va **modernizzato**. Questi valori servono come base di partenza / continuità, non come vincolo. Proposta di direzione nel punto 8.

---

## 5. Struttura del sito (v1)

```
/                        Homepage generale — cos'è Lume, valori, panoramica centri, prevendita in evidenza
/centri                  Indice dei 4 centri (mappa + card)
/centri/[slug]           Pagina singolo centro (template unico, dati per centro)
/abbonamenti             Piani + CTA deep-link a PerfectGym
/prevendita              Landing prevendita (consolida promo.lumefitness.it)
/corsi                   Panoramica discipline/corsi
/blog                    Blog / news (opzionale in v1)
/wiki                    [slot riservato — fase successiva, Starlight]
```

### 5.1 I 4 centri
Confermati dal progetto/backup: **Macerata** e **Montecassiano**.
Dai form esistenti risultano anche **Piediripa** e **Centro** → totale 4.

> ⚠️ **Da confermare:** nomi ufficiali e indirizzi dei 4 centri (in particolare il 4°, indicato come "Centro").

---

## 6. Modello dei contenuti

Ogni tipo di contenuto è una **collection** in Markdown/MDX con schema validato.

### 6.1 Collection `centri`
Campi previsti per ogni centro:
- `nome`, `slug`, `stato` (aperto / in-prevendita / prossima-apertura)
- `indirizzo`, `coordinate` (per la mappa), `telefono`, `email`
- `orari` (feriali / sabato / domenica)
- `discipline` / `servizi` (lista)
- `gallery` (immagini)
- `perfectgym_url` (link iscrizione specifico del centro)
- `descrizione` / testo libero (corpo Markdown)

La homepage e l'indice `/centri` leggono dalla stessa collection: aggiungere un centro = un nuovo file.

### 6.2 Altre collection
- `corsi` — discipline (nome, descrizione, categoria, durata, livello, centro).
- `blog` — articoli/news.
- (futuro) `wiki` — se non gestita con Starlight.

---

## 7. Integrazione PerfectGym (abbonamenti)

- La pagina `/abbonamenti` presenta i piani e i prezzi come **contenuto** gestito in git.
- Ogni CTA ("Iscriviti", "Attiva") rimanda al **flusso di iscrizione e pagamento di PerfectGym** tramite deep-link (potenzialmente un URL diverso per centro).
- **Vantaggio:** nessun pagamento gestito dal sito → si può rimuovere la complessità di Stripe/`create-checkout` dal core. (Da mantenere solo se la prevendita richiede pagamento gestito internamente — da verificare.)
- **Da raccogliere:** gli URL di iscrizione PerfectGym per ciascun centro / piano.

---

## 8. Direzione di design (proposta, da validare)

Mantenere la riconoscibilità (logo, energia sportiva) modernizzando l'esecuzione:
- **Palette:** nero + bianco come base, un rosso brand più raffinato come accento (partendo da `#C40042` / `#D7272A`); ampio uso di spazio bianco.
- **Tipografia:** conservare un display condensato di carattere (in linea con Teko) per i titoli, abbinato a un sans moderno e leggibile per il corpo.
- **Layout:** griglie ampie, immagini full-bleed dei centri, micro-animazioni leggere, forte gerarchia visiva. Mobile-first.
- **Performance come feature di design:** caricamento istantaneo, transizioni fluide (Astro View Transitions).

---

## 9. Piano di migrazione dei contenuti

1. Estrarre testi, immagini e struttura dal backup WordPress (dump + media).
2. Recuperare gli asset di brand dal backup (logo, favicon, foto centri/corsi).
3. Mappare i contenuti nelle nuove collection (`centri`, `corsi`, `blog`).
4. Migrare/reindirizzare gli URL rilevanti (usare la tabella `redirection` del vecchio sito per non perdere SEO).
5. Wiki: valutare export da BasePress → Starlight in fase successiva.

---

## 10. Roadmap di costruzione (quando si parte)

1. **Setup & design system** — adapter Netlify, pulizia stack (via GitHub Pages base-path e checkout custom), token brand in Tailwind, componenti base.
2. **Template centro + Homepage** — collection `centri`, pagina singolo centro, homepage generale.
3. **Abbonamenti + Prevendita** — pagina piani con deep-link PerfectGym, consolidamento landing prevendita.
4. **Corsi + Blog** — collection e pagine.
5. **Migrazione contenuti** — dal backup alle collection, redirect SEO.
6. **Wiki (fase 2)** — Starlight su `/wiki`.
7. **Go-live** — dominio, redirect, verifica performance/SEO.

---

## 11. Riuso vs. rifacimento

**Da riusare dal progetto Astro esistente:**
`Layout`, `Header`, `Footer`, `ClubSelector`, `ClubsMap`, `VideoPlayer`, componenti form, integrazione Supabase.

**Da rivedere/rimuovere:**
- `output: 'static'` + logica base-path GitHub Pages → adapter Netlify.
- Cloudflare Worker separato → Netlify Functions.
- Stripe / `create-checkout` / flusso abbonamenti custom → deep-link PerfectGym.
- Dati hardcoded in `data.ts` → content collections.

---

## 12. Decisioni aperte

- [ ] Conferma nomi e indirizzi ufficiali dei **4 centri** (in particolare il 4°).
- [ ] URL di iscrizione **PerfectGym** per centro/piano.
- [ ] La **prevendita** richiede pagamento gestito dal sito (Stripe) o è solo raccolta lead?
- [ ] Direzione di **design** definitiva (palette, tipografia, riferimenti visivi).
- [ ] Tempistiche e quando far partire l'implementazione.
