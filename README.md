# Sito Lume Fitness Club

Astro statico con adapter Netlify, contenuti editabili da Keystatic, form
collegati a webhook n8n. Quattro centri: Macerata e Montecassiano aperti,
Piediripa e Urban in apertura.

```bash
npm install
npm run dev              # sito su :4321, editor dei contenuti su /keystatic
npm run build            # controllo dei tipi + build
npm run verifica         # controlli veloci, senza browser
npm run verifica:tutto   # tutto, browser compreso
```

## Da leggere prima di mettere le mani

- **[`AGENTS.md`](AGENTS.md)** — come si lavora qui: comandi, come si verifica,
  convenzioni, vincoli. Vale per le persone quanto per gli agenti.
- **[`docs/STATO.md`](docs/STATO.md)** — cosa è fatto, cosa manca, cosa aspetta
  il cliente, e quali scelte sono state prese e perché.

## Gli altri documenti

| | |
|---|---|
| [`docs/FORM.md`](docs/FORM.md) | i flussi dei form e la mappatura su Airtable |
| [`docs/N8N.md`](docs/N8N.md) | specifica dei quattro webhook, con test `curl` |
| [`docs/PLANNING.md`](docs/PLANNING.md) | come funziona il planning e il suo aggiornamento |
| [`docs/PLANNING-PISCINA.md`](docs/PLANNING-PISCINA.md) | orari piscina 2024/25, trascritti e non pubblicati |
| [`docs/SUPABASE.md`](docs/SUPABASE.md) | anagrafica e richieste, fase 1, inerte |
| [`ARCHITETTURA.md`](ARCHITETTURA.md) | il piano di luglio, **in parte superato**: leggilo per il perché del progetto, non per com'è fatto |

## Contenuti

Prezzi, orari, testi e link ai portali **non stanno nel codice**: sono in
`src/content/` e si editano dal CMS su `/keystatic`. In sviluppo l'editor
scrive sui file locali; online salva facendo commit su GitHub, e per quello
servono le variabili descritte in [`.env.example`](.env.example).
