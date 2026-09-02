# Specifica dei webhook n8n

Documento autosufficiente: chi lo implementa non ha bisogno di leggere il
codice del sito. Ogni payload qui sotto è copiato da quello che il browser
manda davvero.

**Stato attuale: nessun webhook esiste.** Le variabili d'ambiente sono vuote,
quindi oggi il sito si comporta così — di proposito, non per errore:

| Cosa | Cosa fa adesso |
|---|---|
| Invio di un form | Il payload viene scritto in `console.info` e la schermata di conferma compare comunque |
| Verifica dell'email | Risponde sempre `nuovo`: nessuno viene bloccato |
| Beacon di pageview | Non parte |
| Planning | Mostra solo l'orario nei contenuti, che è quello vero |

Quindi il sito è pubblicabile così com'è, ma **non raccoglie un contatto**.

---

## 0. Le quattro cose da sapere prima di aprire n8n

**1. Sono chiamate dal browser, quindi serve CORS.** Ogni webhook deve
rispondere con `Access-Control-Allow-Origin` sul dominio del sito e gestire il
preflight `OPTIONS`. Senza quell'header la richiesta muore dentro il browser:
niente errore nei log di n8n, niente errore lato server, il form mostra
"Invio non riuscito" e nessuno capisce perché. È il guasto più facile da non
accorgersi di tutto l'impianto.

**2. Un nodo in bozza non scrive niente.** Su n8n un workflow salvato ma non
attivato riceve le chiamate solo dall'editor aperto. Il primo test in
produzione va fatto con il workflow **attivo**, altrimenti sembra funzionare
e non scrive una riga.

**3. Le stringhe delle select di Airtable sono un contratto.** `tipoRichiesta`,
`sede`, `nuovo` e i valori di `attivita` corrispondono a opzioni che su
Airtable **esistono già**. Nel nodo Airtable la creazione automatica delle
opzioni mancanti va **disattivata**: con quella attiva un typo nel sito
genera in silenzio un'opzione nuova, e i filtri salvati dei consulenti
smettono di restituire quei record. Un errore visibile è meglio di un lead
che sparisce da una vista.

**4. Il sito riprova una volta sola.** Su risposta non-2xx o errore di rete,
`postJson` attende 700 ms e riprova; se fallisce di nuovo mostra l'errore.
Quindi un workflow lento oltre i pochi secondi produce un errore visibile
all'utente anche se poi il dato arriva.

---

## 1. `PUBLIC_WEBHOOK_CHECK` — verifica dell'email

Chiamato quando l'utente conferma l'email, **prima** di chiedergli i dati.
Decide che strada prende il form.

### Riceve — `POST`, `Content-Type: application/json`

```json
{
  "email": "mario@esempio.it",
  "sede": "MACERATA",
  "centro": "macerata",
  "attivita": ["Sala Pesi", "Pilates Reformer"],
  "flusso": "prova",
  "pagina": "/prova",
  "cta": "Prova Lume",
  "utm": { "utm_source": "GAds", "utm_medium": "cpc" },
  "vid": "9f2c1a44-1111-4222-8333-444455556666"
}
```

`sede` è vuoto se l'utente non ha ancora scelto il centro. `attivita` può
essere un array vuoto. `utm` può essere `{}`. `vid` può essere `null`.

### Deve rispondere — HTTP 200, JSON

```json
{ "stato": "nuovo" }
```

`stato` deve corrispondere a questa espressione, e nient'altro viene letto:

```
^(iscritto|esiste|nuovo)(?:_(.+))?$
```

| Valore | Significato | Cosa fa il sito |
|---|---|---|
| `nuovo` | Non lo conosciamo | Prosegue col percorso normale |
| `esiste` | È già un contatto ma non è iscritto | Salta lo step anagrafica: i dati li abbiamo già |
| `iscritto` | È o è stato un iscritto | Sul flusso `prova` mostra la schermata di rifiuto |

Il suffisso dopo l'underscore è libero e viene solo inoltrato nel payload del
lead come `gruppo`: `iscritto_scadenza`, `esiste_lead_freddo`. Serve a
segmentare senza cambiare il codice del sito.

**La regola commerciale che dipende da questa risposta:** il pass prova è
riservato a chi non ha mai avuto un abbonamento o un pass Lume. È `iscritto`
che lo nega. Sbagliare in questa direzione costa un pass regalato; sbagliare
nell'altra blocca un cliente nuovo, che è peggio.

### Se il workflow è giù

Il sito tratta la risposta come `nuovo` e **prosegue**. Non è un ripiego
pigro: un errore di rete non è colpa dell'utente e non è motivo per
fermarlo. Sarà il consulente a riconoscerlo. Quindi **il workflow non deve
mai bloccare**: in dubbio, `nuovo`.

### ⚠️ I campi opzionali della risposta, e perché li sconsiglio

Il motore accetta anche `nome`, `cognome` e `cellulare` nella risposta, e se
ci sono precompila lo step successivo per chi risulta `esiste` o `iscritto`.

**Non implementarli nella prima versione.** Questo endpoint è pubblico e non
autenticato: chiunque può fare un `POST` con un'email e ottenere la scheda
ridotta di quella persona, e con una lista di email si fa enumerazione di
massa. Il risparmio per l'utente sono due campi da riscrivere; il rischio è
un elenco di soci estraibile da chiunque conosca l'indirizzo del webhook, che
sta nel bundle del sito e quindi è pubblico.

Se poi li volete, servono almeno: un limite di richieste per IP, un token
condiviso fra sito e workflow, e la consapevolezza che il token nel bundle lo
legge chiunque — alza l'asticella, non è una difesa.

Per decidere se mostrare o negare il pass prova **basta `stato`.**

### Dove guardare per rispondere

1. **PerfectGym** — `Members` per email. API base
   `https://lumefitness.perfectgym.com/Api/v2.2/odata/`, autenticazione con
   header `X-Client-Id` e `X-Client-Secret`, `clubId=1` Macerata e `clubId=2`
   Montecassiano. Se ha un contratto attivo o scaduto → `iscritto`.
2. **Airtable, tabella RICHIESTE** — se l'email c'è già fra i lead ma su
   PerfectGym non risulta → `esiste`.
3. Nient'altro → `nuovo`.

---

## 2. `PUBLIC_WEBHOOK_LEAD` — il lead

Chiamato all'invio del form. **La risposta viene ignorata: conta solo il 200.**
Se risponde errore, il sito mostra "Invio non riuscito, riprova" e l'utente
resta sullo step con i dati compilati.

### Riceve — `POST`, `Content-Type: application/json`

```json
{
  "flusso": "prova",
  "tipoRichiesta": "RICHIESTA PROVA",
  "modalita": "visita",
  "agenda": "visita",

  "email": "mario@esempio.it",
  "nome": "Mario",
  "cognome": "Rossi",
  "cellulare": "+39 333 1234567",
  "prefisso": "+39",

  "sede": "MACERATA",
  "centro": "macerata",
  "centroLabel": "Lume Macerata",
  "attivita": ["Sala Pesi", "Pilates Reformer"],
  "abbonamento": "",
  "messaggio": "Non mi alleno da un anno",

  "privacy": true,
  "marketing": false,

  "nuovo": "NUOVO",
  "verifica": "nuovo",
  "gruppo": "",

  "source": "SitoWeb",
  "medium": "HeaderProva",
  "cta": "Prova Lume",
  "ctaMedium": "HeaderProva",
  "pagina": "/prova",
  "utm": { "utm_source": "GAds", "utm_medium": "cpc" },
  "vid": "9f2c1a44-1111-4222-8333-444455556666",

  "inviatoIl": "2026-09-02T17:42:11+02:00",
  "sospetto": false
}
```

### Campo per campo

| Campo | Tipo | Valori possibili |
|---|---|---|
| `flusso` | string | `info` · `prova` · `iscrizione` · `newsletter` |
| `tipoRichiesta` | string | `INFO ADULTI` · `INFO JUNIOR` · `RICHIESTA PROVA` · `TOUR` · `ABBONAMENTI` · `ASSISTENZA` · `NEWSLETTER` |
| `modalita` | string | `richiamata` · `visita` · `messaggio` · vuoto |
| `agenda` | string \| null | `visita` · `richiamata` · `null` se il flusso non prenota |
| `cellulare` | string | Prefisso già incluso, separato da uno spazio |
| `sede` | string | `MACERATA` · `MONTECASSIANO` · vuoto |
| `centro` | string | slug: `macerata` · `montecassiano` |
| `attivita` | string[] | Sottoinsieme delle 11 opzioni elencate sotto |
| `abbonamento` | string | `Base` · `Plus` · `Premium` · vuoto — solo sul flusso `iscrizione` |
| `privacy` | bool | Sempre `true` all'invio: senza, il form non parte |
| `marketing` | bool | Il consenso facoltativo. **Rispettalo**: `false` significa niente promozionale |
| `nuovo` | string | `NUOVO` · `ESISTE` — derivato dal check |
| `verifica` | string | `nuovo` · `esiste` · `iscritto` — la risposta grezza del check |
| `gruppo` | string | Il suffisso della risposta del check, o vuoto |
| `source` / `medium` | string | Vedi §5 |
| `vid` | string \| null | Id del browser, persistente. È la chiave che lega il lead alle pagine viste |
| `inviatoIl` | string | ISO **con offset locale** (`+02:00`), non UTC |
| `sospetto` | bool | `true` se fra apertura e invio sono passati meno di 1,5 s |

Le 11 attività, esattamente così: `Sala Pesi` · `Corsi Fitness` ·
`Pilates Reformer` · `CrossFit/Hyrox` · `Personal Training` ·
`Scuola Nuoto Adulti` · `Acqua Fitness` · `Nuoto Libero` ·
`Scuola Nuoto Bambini` · `Acqua Nido` · `Acqua Mamma`.

### Il caso newsletter, che arriva sullo stesso webhook

L'iscrizione alla newsletter manda un payload **ridotto** allo stesso URL:

```json
{
  "flusso": "newsletter",
  "tipoRichiesta": "NEWSLETTER",
  "email": "mario@esempio.it",
  "privacy": true,
  "marketing": true,
  "source": "SitoWeb",
  "medium": "Newsletter",
  "pagina": "/lume-life",
  "utm": {},
  "vid": "9f2c1a44-…"
}
```

Mancano `nome`, `cognome`, `cellulare`, `sede`, `attivita`. **Il workflow non
deve rompersi**: vanno trattati come vuoti, non come errore. Ramifica su
`flusso === 'newsletter'` prima di mappare i campi.

### Cosa deve fare, nell'ordine

**1. Registra il lead così com'è, prima di tutto il resto.** Su Supabase se lo
attivate (schema pronto in `supabase/migrations/`), altrimenti direttamente su
Airtable. Il motivo dell'ordine: i nodi che seguono possono fallire in
silenzio, e la prima riga scritta è la ricevuta che dimostra che il contatto è
arrivato.

**2. Airtable, tabella RICHIESTE** — mappatura:

| Payload | Campo Airtable |
|---|---|
| `inviatoIl` | `Data` |
| `nome` | `Nome` |
| `cognome` | `Cognome` |
| `cellulare` | `Cellulare` |
| `email` | `Email` |
| `tipoRichiesta` | `Tipo Richiesta` |
| `attivita` | `ATTIVITA' INTERESSE NRE` (multi-select) |
| `attivita` unite con `", "` | `Attività di Interesse` (testo, se lo si vuole leggibile) |
| `sede` | `SEDE` |
| `source` | `Source` |
| `medium` | `Medium` |
| `nuovo` | `Nuovo?` |
| `messaggio` | `Messaggio` |
| `abbonamento` | `Nome Abbonamento` |

`vid`, `utm`, `cta`, `pagina`, `agenda`, `sospetto` non hanno una destinazione
su Airtable oggi. Il più utile è **`vid`**: con quello si ricostruisce il
percorso di navigazione che ha portato al lead, cosa che email e telefono non
permettono. Un campo testo `VID` lo rende sfruttabile.

**3. Notifica.** Email o messaggio alla sede di `sede`, con il riassunto. Chi
ha `sospetto: true` non va bloccato, va solo guardato con un occhio in più.

**4. Rispondi 200.** Anche se la notifica è fallita: il dato è già scritto, e
un errore mostrato all'utente lo farebbe reinviare creando un doppione.

### Idempotenza

Il sito riprova una volta su errore. Se il primo tentativo è arrivato ma ha
risposto lentamente o male, il secondo crea un doppione. Deduplica su
`email + tipoRichiesta + inviatoIl`: `inviatoIl` è generato una volta sola
alla costruzione del payload, quindi i due tentativi lo portano identico.

---

## 3. `PUBLIC_WEBHOOK_VISIT` — beacon di pageview

Opzionale, ma è quello che dà un senso al `vid` del lead.

### Riceve

`POST` con `navigator.sendBeacon`, **`Content-Type: text/plain;charset=UTF-8`**.

```json
{
  "vid": "9f2c1a44-…",
  "pagina": "/discipline/reformer",
  "referrer": "https://www.google.com/",
  "utm": { "utm_source": "GAds", "utm_medium": "cpc" }
}
```

**Il body è JSON ma il Content-Type dice `text/plain`: il workflow deve fare
`JSON.parse()` sul body grezzo.** Non è un capriccio. `sendBeacon` invia
sempre le credenziali, e con un content-type non "CORS-safelisted" il browser
fa un preflight che fallisce se il webhook non risponde
`Access-Control-Allow-Credentials: true`; la richiesta vera non parte mai,
senza errori in console. `text/plain` è safelisted: niente preflight, la
richiesta parte sempre.

Non serve rispondere niente: un 200 vuoto basta. `created_at` va messo con
default `now()` a livello di database, mai preso dal client.

---

## 4. Il webhook di Cal.com — `BOOKING_CREATED`

Questo **non lo chiama il sito**: lo chiama Cal.com quando l'utente conferma
un appuntamento nell'embed dentro il form.

Il sito passa a Cal.com questi metadata, che Cal.com inoltra:

```json
{ "vid": "…", "sede": "MACERATA", "flusso": "prova", "source": "SitoWeb", "medium": "HeaderProva" }
```

**A cosa serve.** Il lead viene scritto **prima** che l'utente veda il
calendario: chi abbandona la prenotazione lascia comunque un contatto da
richiamare. Quindi quando arriva `BOOKING_CREATED` il lead esiste già, e il
compito del workflow è **ritrovarlo e completarlo**, non crearne uno nuovo.

Chiave di ricerca, in ordine: `vid`, poi email. Se non trova nulla, crea —
ma quel caso significa che il webhook del lead ha perso una riga, e vale la
pena farselo dire.

Da aggiungere al lead: data e ora dell'appuntamento, il tipo (`agenda`), e
l'uid della prenotazione per gestire spostamenti e cancellazioni.

---

## 5. `source` e `medium` — come sono decisi

Serve a non sovrascriverli con logiche diverse.

`source` è `SitoWeb` di default. Se l'utente arriva da una campagna con `utm`,
vince la campagna: `utm_source` diventa `source` e `utm_medium` diventa
`medium`. Altrimenti `medium` è il `data-medium` del pulsante cliccato —
`HeaderProva`, `BandHome`, `Piano:Plus`, `ScuolaNuotoQuote`.

Il pulsante resta comunque nel payload come `cta` e `ctaMedium`, quindi
l'informazione non si perde nemmeno quando la campagna vince.

Gli `utm` sono salvati al **primo** arrivo sul sito e sopravvivono alla
navigazione fra pagine: un utente che entra da Google Ads e compila il form
tre pagine dopo porta ancora l'attribuzione giusta.

---

## 6. `PUBLIC_WEBHOOK_PLANNING` — non urgente

L'orario dei corsi ora è nei contenuti del sito, vero e completo, quindi
questo webhook **non serve**. Se un giorno si vuole prenderlo da PerfectGym in
automatico, il contratto è in `docs/PLANNING.md`. Lasciandolo vuoto la pagina
mostra l'orario nei contenuti e non tenta nessun aggiornamento.

---

## 7. Da mettere su Netlify quando i workflow esistono

*Site configuration → Environment variables*, poi **rilanciare un deploy**:
le variabili non si applicano alle build già fatte.

```
PUBLIC_WEBHOOK_CHECK=https://…/webhook/lume-verifica
PUBLIC_WEBHOOK_LEAD=https://…/webhook/lume-lead
PUBLIC_WEBHOOK_VISIT=https://…/webhook/lume-visita
```

Sono `PUBLIC_*` e finiscono nel bundle del browser: **sono indirizzi
pubblici**. Non metterci token nell'URL e non dare per scontato che li chiami
solo il nostro sito.

---

## 8. Come collaudarli senza toccare il sito

```bash
# CHECK — deve rispondere {"stato":"..."} in JSON
curl -sS -X POST "$CHECK" -H 'Content-Type: application/json' \
  -d '{"email":"prova@esempio.it","sede":"MACERATA","centro":"macerata",
       "attivita":["Sala Pesi"],"flusso":"prova","pagina":"/prova",
       "cta":"Test","utm":{},"vid":null}'

# LEAD — conta solo il 200
curl -sS -o /dev/null -w '%{http_code}\n' -X POST "$LEAD" \
  -H 'Content-Type: application/json' \
  -d '{"flusso":"prova","tipoRichiesta":"RICHIESTA PROVA","modalita":"visita",
       "agenda":"visita","email":"prova@esempio.it","nome":"Mario",
       "cognome":"Rossi","cellulare":"+39 333 1234567","prefisso":"+39",
       "sede":"MACERATA","centro":"macerata","centroLabel":"Lume Macerata",
       "attivita":["Sala Pesi"],"abbonamento":"","messaggio":"test",
       "privacy":true,"marketing":false,"nuovo":"NUOVO","verifica":"nuovo",
       "gruppo":"","source":"SitoWeb","medium":"Test","cta":"Test",
       "ctaMedium":"Test","pagina":"/prova","utm":{},"vid":null,
       "inviatoIl":"2026-09-02T17:42:11+02:00","sospetto":false}'

# NEWSLETTER — stesso URL, payload ridotto: non deve rompersi
curl -sS -o /dev/null -w '%{http_code}\n' -X POST "$LEAD" \
  -H 'Content-Type: application/json' \
  -d '{"flusso":"newsletter","tipoRichiesta":"NEWSLETTER",
       "email":"prova@esempio.it","privacy":true,"marketing":true,
       "source":"SitoWeb","medium":"Newsletter","pagina":"/","utm":{},"vid":null}'

# VISITA — text/plain, body JSON
curl -sS -o /dev/null -w '%{http_code}\n' -X POST "$VISIT" \
  -H 'Content-Type: text/plain;charset=UTF-8' \
  -d '{"vid":"test","pagina":"/","referrer":null,"utm":{}}'

# CORS — la riga che conta e' Access-Control-Allow-Origin nella risposta
curl -sS -i -X OPTIONS "$LEAD" \
  -H 'Origin: https://www.lumefitness.it' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type' | grep -i 'access-control'
```

Un `curl` che passa e un form che fallisce = quasi sempre CORS. `curl` non
applica la politica di origine, il browser sì.

## 9. Checklist

- [ ] Tre webhook creati e **attivati** (non in bozza)
- [ ] `Access-Control-Allow-Origin` sul dominio del sito, su tutti e tre, e `OPTIONS` gestito
- [ ] CHECK risponde JSON con `stato` conforme all'espressione, e **non** restituisce dati personali
- [ ] CHECK, se PerfectGym è irraggiungibile, risponde `nuovo` invece di errore
- [ ] LEAD scrive il lead **prima** di notifiche e integrazioni
- [ ] LEAD gestisce il payload ridotto della newsletter
- [ ] LEAD deduplica su `email + tipoRichiesta + inviatoIl`
- [ ] Creazione automatica delle opzioni di select **disattivata** sul nodo Airtable
- [ ] VISITA fa `JSON.parse` sul body grezzo con content-type `text/plain`
- [ ] Consenso `marketing: false` rispettato dalle automazioni a valle
- [ ] Le tre variabili su Netlify e un deploy nuovo
- [ ] Prova end-to-end dal sito, non solo con curl
