# Graph Report - lume-nuovo-sito  (2026-09-11)

## Corpus Check
- Large corpus: 210 files · ~742,252 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 540 nodes · 995 edges · 29 communities (23 shown, 6 thin omitted)
- Extraction: 95% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Font e asset tipografici
- Motore del planning settimanale
- Listini e formule abbonamento
- Form di raccolta lead
- Documentazione di progetto
- Controlli automatici con Playwright
- Sezioni editoriali (eventi, help desk, news)
- Concetti del club (centri, servizi, regole)
- Dipendenze di sviluppo
- Catalogo delle discipline
- Form contatti e newsletter
- Dipendenze runtime Astro/Keystatic
- Test del planning
- Tracciamento Meta e consensi
- Configurazione del CMS Keystatic
- Pannelli espandibili (UI)
- Programma invita-un-amico
- Anteprime video nelle card
- Configurazione TypeScript
- Generatore mappa dei centri
- Test degli abbonamenti
- Video hero dei centri
- Test hero home
- Test pixel di tracciamento
- Tipi ambiente Astro
- Script di utilita
- CI GitHub Actions

## God Nodes (most connected - your core abstractions)
1. `lezioniValide()` - 19 edges
2. `initForm()` - 19 edges
3. `STATO.md — stato del lavoro` - 18 edges
4. `scripts` - 16 edges
5. `N8N.md — specifica dei quattro webhook` - 14 edges
6. `invia()` - 12 edges
7. `renderPlanning()` - 12 edges
8. `AGENTS.md — istruzioni del repo` - 12 edges
9. `README.md — Sito Lume Fitness Club` - 12 edges
10. `FORM.md — contratto dei form con n8n e Airtable` - 12 edges

## Surprising Connections (you probably didn't know these)
- `STATO.md — stato del lavoro` --references--> `src/config/tassonomie.ts — tassonomie (contiene interessiLead, codice morto)`  [EXTRACTED]
  docs/STATO.md → src/config/tassonomie.ts
- `monta()` --indirect_call--> `attesa()`  [INFERRED]
  src/pages/prenota.astro → verifica/pagine.mjs
- `SUPABASE.md — anagrafica e richieste, fase 1` --references--> `Migrazione Supabase 20260827_anagrafica_e_richieste`  [EXTRACTED]
  docs/SUPABASE.md → supabase/migrations/20260827_anagrafica_e_richieste.sql
- `Migrazione Supabase 20260827_anagrafica_e_richieste` --implements--> `Tabella Supabase utenti`  [EXTRACTED]
  supabase/migrations/20260827_anagrafica_e_richieste.sql → docs/SUPABASE.md
- `Migrazione Supabase 20260827_anagrafica_e_richieste` --implements--> `Tabella Supabase richieste`  [EXTRACTED]
  supabase/migrations/20260827_anagrafica_e_richieste.sql → docs/SUPABASE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **I tre piani di abbonamento Lume (contenimento: Sala Pesi ⊂ All Lume ⊂ GOLD)** — src_content_abbonamenti_sala_pesi, src_content_abbonamenti_all_lume, src_content_abbonamenti_gold [INFERRED 0.95]
- **I quattro centri Lume Fitness Club** — src_content_centri_macerata, src_content_centri_montecassiano, src_content_centri_piediripa, src_content_centri_urban [EXTRACTED 1.00]
- **Pipeline dei lead: sito → n8n → Supabase/Airtable → Cal.com** — docs_form, docs_n8n, docs_supabase [INFERRED 0.85]
- **Discipline con variante Les Mills VIRTUAL (versione video in sala)** — src_content_discipline_lesmills_bodyattack, src_content_discipline_lesmills_bodybalance, src_content_discipline_lesmills_bodycombat, src_content_discipline_lesmills_bodypump, src_content_discipline_lesmills_core, src_content_discipline_lesmills_rpm [INFERRED 0.95]
- **Programmi esclusivi Lume nati in collaborazione con Technogym** — src_content_discipline_boxing_hero, src_content_discipline_intensityou, src_content_discipline_gym_floor, technogym [INFERRED 0.95]
- **Discipline di acqua fitness al centro Montecassiano** — src_content_discipline_acquagym, src_content_discipline_acquawalking, src_content_discipline_lesmills_aqua, src_content_discipline_nuoto_libero [INFERRED 0.95]
- **Accesso al club tramite braccialetto NFC** — src_content_helpdesk_accesso_senza_braccialetto, src_content_helpdesk_allenarsi_senza_personale, src_content_helpdesk_certificato_medico_scuola_nuoto, braccialetto_nfc [INFERRED 0.85]
- **Offerta Reformer di Montecassiano** — src_content_news_nuova_sala_reformer_montecassiano, src_content_eventi_masterclass_reformer_ottobre, reformer_pilates, centro_montecassiano [INFERRED 0.85]
- **Gestione abbonamento e area personale** — src_content_helpdesk_sospendere_abbonamento, src_content_helpdesk_scaricare_fattura, src_content_news_come_scegliere_abbonamento, app_lume, abbonamento_lume [INFERRED 0.75]

## Communities (29 total, 6 thin omitted)

### Community 0 - "Font e asset tipografici"
Cohesion: 0.06
Nodes (32): SEDI, consensoGestito, env, siteConfig, canonical, clientConfig, jsonldGlobale, ogImage (+24 more)

### Community 1 - "Motore del planning settimanale"
Cohesion: 0.12
Nodes (39): corsiDi(), firma(), GIORNI, giorniDi(), Lezione, lezioniValide(), minuti(), orario() (+31 more)

### Community 2 - "Listini e formule abbonamento"
Cohesion: 0.07
Nodes (37): eUnaCatena(), euro(), Formula, formulaDi(), FORMULE, IdFormula, include(), PASS (+29 more)

### Community 3 - "Form di raccolta lead"
Cohesion: 0.07
Nodes (31): Agenda, AGENDE, campiAnagrafica, Campo, confermaAssistenza, FLUSSI, Flusso, Interesse (+23 more)

### Community 4 - "Documentazione di progetto"
Cohesion: 0.14
Nodes (38): AGENTS.md — istruzioni del repo, Doppia validazione Zod + Keystatic, Ogni ripiego deve essere una via d'uscita, ARCHITETTURA.md — piano di progetto del 22 luglio, CLAUDE.md — rimando ad AGENTS.md, FORM.md — contratto dei form con n8n e Airtable, Embed Cal.com nella conferma del form, N8N.md — specifica dei quattro webhook (+30 more)

### Community 5 - "Controlli automatici con Playwright"
Cohesion: 0.07
Nodes (22): RFC-2606, apriBrowser(), contatore(), servi(), TIPI, { esito, chiudi }, reader, { esito, chiudi } (+14 more)

### Community 6 - "Sezioni editoriali (eventi, help desk, news)"
Cohesion: 0.09
Nodes (25): articoli, campo, categorie, usate, vuoto, etichetta(), abbonamenti, centri (+17 more)

### Community 7 - "Concetti del club (centri, servizi, regole)"
Cohesion: 0.11
Nodes (30): Abbonamento Lume, App Lume / area personale, Braccialetto NFC, Centro Lume Macerata, Centro Lume Montecassiano, Certificato medico di idoneità, Reformer Pilates, Scuola Nuoto (+22 more)

### Community 8 - "Dipendenze di sviluppo"
Cohesion: 0.07
Nodes (28): @astrojs/check, devDependencies, @astrojs/check, @types/react, @types/react-dom, typescript, name, scripts (+20 more)

### Community 9 - "Catalogo delle discipline"
Cohesion: 0.11
Nodes (26): Joseph Hubertus Pilates, Les Mills (brand di programmi fitness), Metodo Pilates, AcquaGYM, AcquaWALKING, Boxing Hero, Calisthenics, Corpo Libero (+18 more)

### Community 10 - "Form contatti e newsletter"
Cohesion: 0.16
Nodes (25): corpo(), adessoIso(), cfg(), initForm(), apriPrenotazione(), attribuzione(), caricamento(), errore() (+17 more)

### Community 11 - "Dipendenze runtime Astro/Keystatic"
Cohesion: 0.09
Nodes (23): @astrojs/netlify, @astrojs/react, @astrojs/sitemap, @fontsource/anton, @fontsource/inter, @keystatic/astro, @keystatic/core, dependencies (+15 more)

### Community 12 - "Test del planning"
Cohesion: 0.14
Nodes (10): PLANNING_ESEMPIO, a1, casella, conBuco, corsi, min, parallele, s3 (+2 more)

### Community 13 - "Tracciamento Meta e consensi"
Cohesion: 0.26
Nodes (10): vidCorrente(), aggiornaConsenso(), attivaTracciamento(), caricaPixel(), catturaUtm(), generaVid(), inviaBeacon(), leggiIubenda() (+2 more)

### Community 14 - "Configurazione del CMS Keystatic"
Cohesion: 0.22
Nodes (5): CATEGORIE_DISCIPLINE, GIORNI_SETTIMANA, INTERESSI_AIRTABLE, SU_GITHUB, robots.txt — lumefitness.it

### Community 15 - "Pannelli espandibili (UI)"
Cohesion: 0.43
Nodes (7): CACHE, initPannelli(), apri(), chiudi(), creaPannello(), prefereRidotto(), scarica()

### Community 16 - "Programma invita-un-amico"
Cohesion: 0.25
Nodes (6): invita, PASS, PREMIO, prezzi, prova, tracking

### Community 17 - "Anteprime video nelle card"
Cohesion: 0.43
Nodes (6): ambienteAdatto(), avviaVideoHero(), initAnteprimeVideo(), avvia(), ferma(), UN_SOLO_VIDEO

### Community 18 - "Configurazione TypeScript"
Cohesion: 0.33
Nodes (5): astro/tsconfigs/strict, compilerOptions, baseUrl, paths, extends

### Community 19 - "Generatore mappa dei centri"
Cohesion: 0.60
Nodes (4): leggi_centri(), main(), proietta(), Mercator in pixel globali allo zoom scelto.

### Community 20 - "Test degli abbonamenti"
Cohesion: 0.40
Nodes (3): FORMULE, html, piani

## Ambiguous Edges - Review These
- `AcquaGYM` → `Nuoto Libero`  [AMBIGUOUS]
  src/content/discipline/nuoto-libero.md · relation: conceptually_related_to

## Knowledge Gaps
- **167 isolated node(s):** `GIORNI_SETTIMANA`, `INTERESSI_AIRTABLE`, `CATEGORIE_DISCIPLINE`, `SU_GITHUB`, `name` (+162 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `AcquaGYM` and `Nuoto Libero`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `AGENTS.md — istruzioni del repo` connect `Documentazione di progetto` to `Motore del planning settimanale`, `Form di raccolta lead`, `Configurazione del CMS Keystatic`, `Sezioni editoriali (eventi, help desk, news)`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `STATO.md — stato del lavoro` connect `Documentazione di progetto` to `Form di raccolta lead`, `Motore del planning settimanale`, `Generatore mappa dei centri`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `passo()` connect `Listini e formule abbonamento` to `Controlli automatici con Playwright`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `GIORNI_SETTIMANA`, `INTERESSI_AIRTABLE`, `CATEGORIE_DISCIPLINE` to the rest of the system?**
  _167 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Font e asset tipografici` be split into smaller, more focused modules?**
  _Cohesion score 0.05879692446856626 - nodes in this community are weakly interconnected._
- **Should `Motore del planning settimanale` be split into smaller, more focused modules?**
  _Cohesion score 0.11649659863945579 - nodes in this community are weakly interconnected._