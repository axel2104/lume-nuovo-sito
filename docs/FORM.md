# Form del sito — contratto con n8n e Airtable

Documento di riferimento per chi costruisce i workflow n8n. Il sito è la parte
già fatta: qui c'è esattamente cosa arriva, quando, e dove va messo.

- **Definizione dei flussi:** `src/config/forms.ts`
- **Motore:** `src/lib/leadForm.client.js`
- **Destinazione finale:** base Airtable `LUME FITNESS`, tabella `RICHIESTE`

---

## 1. I cinque flussi

| Flusso | Sostituisce | `Tipo Richiesta` | Prenotazione |
|---|---|---|---|
| `info` | Typeform `infoMacerata` + `infoMonte` | `INFO ADULTI` / `INFO JUNIOR` / `TOUR` | sì (visita o richiamata) |
| `prova` | `n8n.../form/guest-pass` + Typeform `/provagratis` | `RICHIESTA PROVA` | sì |
| `iscrizione` | `n8n.../form/iscrizioni` | `ABBONAMENTI` | sì (opzionale) |
| `referral` | niente: sul vecchio sito il referral non esisteva online | `ASSISTENZA` (finché non c'è `REFERRAL`) | no |
| `newsletter` | i due form del blog (che non salvavano nulla) | `NEWSLETTER` | no |

In tutti i flussi, se il check dice che l'utente è già iscritto il tipo diventa
`ASSISTENZA`: non è un lead commerciale, è la segreteria che deve rispondere.

`referral` è l'unico flusso col check **ribaltato**: lo usa un socio, quindi
`iscritto` è la strada buona e `nuovo` il vicolo cieco. E non chiede i dati
dell'amico — sarebbero dati di un terzo, raccolti da qualcun altro, per mandargli
un messaggio commerciale. Il socio riceve un link, lo gira lui, e l'amico
compila il form `prova` da sé arrivando su `/prova?ref=<codice>`.

Chi invita ha **50 € sul proprio rinnovo per ogni persona che si iscrive** col
suo link — non per la sola settimana di prova. È l'unico numero del referral che
la pagina dice ad alta voce: è l'incentivo, non lo sconto.

Il codice di invito viaggia in `utm.ref` del payload (`ref` è fra i parametri
catturati da `tracking.js`). **Non è una prova di niente**: sta nella query
string e chiunque può scriverselo. Il prezzo ridotto lo decide n8n guardando se
quel codice esiste davvero, esattamente come per `utm_source`.

---

## 2. Webhook di verifica — `PUBLIC_WEBHOOK_CHECK`

Chiamato quando l'utente conferma email e centro, **prima** di chiedergli altro.

### Riceve

```json
{
  "email": "mario@esempio.it",
  "sede": "MACERATA",
  "centro": "macerata",
  "attivita": ["Sala Pesi", "Pilates Reformer"],
  "flusso": "prova",
  "pagina": "/prova",
  "cta": "Prova Lume",
  "utm": { "utm_source": "GAds", "utm_medium": "cpc", "gclid": "..." },
  "vid": "9f2c1a44-…"
}
```

### Deve rispondere

```json
{ "stato": "nuovo" }
```

`stato` ammette tre valori, con un sottogruppo opzionale dopo l'underscore
(`iscritto_scaduto`, `esiste_pass`, …) che il sito conserva nel campo `gruppo`
senza interpretarlo:

| `stato` | Significato | Cosa fa il sito |
|---|---|---|
| `nuovo` | email mai vista | chiede l'anagrafica e prosegue |
| `esiste` | contatto già in anagrafica, non iscritto | salta l'anagrafica (i dati ci sono già) |
| `iscritto` | ha un abbonamento attivo | `info`/`iscrizione` → assistenza; `prova` → offerta negata; `referral` → **prosegue**, è il caso buono |

### Campi opzionali della risposta

Quando lo stato è `esiste` o `iscritto` il form **salta lo step anagrafica**: i
dati di quella persona sono già nei vostri archivi, richiederli sarebbe assurdo.
Ma il payload finale partirebbe quindi senza nome, e Cal.com chiederebbe di
riscriverlo proprio a chi è già cliente.

Se la risposta include questi campi, il sito li adotta:

```json
{ "stato": "esiste", "nome": "Mario", "cognome": "Rossi", "cellulare": "+39 333 1234567" }
```

Sono facoltativi: senza di loro il flusso funziona, con un lead un po' più povero.
**Vale la pena mandarli** — sono già in Airtable e costano un lookup.

> **Questo endpoint applica una regola commerciale, non solo un'ottimizzazione di
> UI.** Il pass prova è riservato a chi non ha mai avuto un abbonamento o un
> pass: è il check a farlo rispettare, e lo fa prima che l'utente compili tutto.
>
> Se il webhook non risponde o va in errore, il sito tratta l'utente come
> `nuovo` e va avanti. È deliberato: meglio un lead da qualificare a mano che un
> visitatore bloccato da un guasto che non è suo. Il campo `verifica` nel payload
> finale dice sempre cosa è stato deciso, quindi il caso è riconoscibile a valle.

---

## 3. Webhook del lead — `PUBLIC_WEBHOOK_LEAD`

Chiamato all'invio del form. **La risposta viene ignorata**: quello che conta è
il `200`. Se risponde errore il sito mostra "Invio non riuscito, riprova" e
l'utente resta sullo step con i dati compilati (un solo retry automatico dopo
700 ms).

### Payload completo

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
  "vid": "9f2c1a44-…",

  "inviatoIl": "2026-08-17T17:42:11+02:00",
  "sospetto": false
}
```

### Mappatura su `RICHIESTE`

| Campo payload | Campo Airtable | Note |
|---|---|---|
| `inviatoIl` | `Data` | già con offset locale (`+02:00`), non UTC |
| `nome` | `Nome` | |
| `cognome` | `Cognome` | |
| `cellulare` | `Cellulare` | prefisso già incluso |
| `email` | `Email` | sempre minuscolo e trimmato |
| `tipoRichiesta` | `Tipo Richiesta` | valore già valido per la select |
| `attivita` | `ATTIVITA' INTERESSE NRE` | array di opzioni già esistenti |
| `attivita` (join `", "`) | `Attività di Interesse` | il campo testo, se lo si vuole leggibile |
| `sede` | `SEDE` | `MACERATA` o `MONTECASSIANO` |
| `source` | `Source` | |
| `medium` | `Medium` | |
| `nuovo` | `Nuovo?` | `NUOVO` o `ESISTE` |
| `messaggio` | `Messaggio` | |
| `abbonamento` | `Nome Abbonamento` | solo flusso `iscrizione` |

Campi senza destinazione naturale su Airtable oggi — `vid`, `utm`, `cta`,
`pagina`, `agenda`, `sospetto`. Il più utile dei quattro è **`vid`**: è l'id
persistente del browser, lo stesso che il beacon di pageview manda su
`PUBLIC_WEBHOOK_VISIT`. Con quello si ricostruisce il percorso di navigazione
che ha portato al lead, cosa che email e telefono non permettono. Se vale la
pena, un campo testo `VID` sulla tabella lo rende sfruttabile.

### Due dettagli che evitano dati sporchi

**Le stringhe delle select sono un contratto.** `tipoRichiesta`, `sede`, `nuovo`
e i valori di `attivita` corrispondono a opzioni che su Airtable esistono già.
Se in n8n il nodo Airtable è configurato per creare opzioni mancanti, un typo
nel sito genererebbe silenziosamente un'opzione nuova e i filtri salvati dei
consulenti smetterebbero di restituire quei record. **Meglio lasciare la
creazione automatica disattivata:** un errore visibile è preferibile a un lead
che sparisce da una vista.

**`sospetto: true`** significa che il form è stato inviato in meno di 1,5
secondi. Non è un blocco — chi incolla i dati e corre è un utente vero — ma vale
come segnale se un giorno arrivasse spam. I bot che compilano l'honeypot invece
non arrivano nemmeno: il sito mostra loro la conferma e non invia niente.

---

## 4. Prenotazione — Cal.com

La scelta di giorno e ora **non passa dal sito**. Dopo l'invio del lead, la
schermata di conferma monta l'embed Cal.com dell'event type della sede.

```
form → POST lead a n8n → record su RICHIESTE      ← il lead esiste QUI
                ↓
      embed Cal.com prefillato (nome, email, telefono, note)
                ↓
   webhook BOOKING_CREATED → n8n → aggiorna il record esistente
```

**L'ordine è la parte importante.** Il lead parte prima del calendario, così chi
apre l'embed e non conferma lo slot resta un contatto acquisito. Invertendo i due
passaggi si perderebbe la maggioranza: la prenotazione arricchisce un lead che
esiste già, non lo crea.

### Metadata inoltrati a Cal.com

Il sito passa questi valori come `metadata[...]`, e Cal.com li rimanda nel
webhook `BOOKING_CREATED`. Servono a **ritrovare il record già scritto** invece
di crearne un doppione:

| Metadata | Uso in n8n |
|---|---|
| `vid` | chiave più precisa per ricucire prenotazione ↔ lead |
| `sede` | per instradare al centro |
| `flusso` | `info` / `prova` / `iscrizione` |
| `source`, `medium` | attribuzione, già risolta dal sito |

Cerca il record per `vid` + `Email`, ordina per `Data` decrescente e aggiorna il
più recente. La sola email non basta: chi richiede una prova a maggio e informazioni
a settembre ha due record legittimi, e il secondo non deve sovrascrivere il primo.

### Configurazione degli event type

Gli URL stanno nei **contenuti**, non nelle variabili d'ambiente, perché cambiano
per centro:

```yaml
# src/content/centri/macerata.md
calcom:
  visita: lume-macerata/visita-guidata
  richiamata: lume-macerata/richiamata
```

Sono facoltativi. Se mancano, il form registra il lead e mostra *"ti contattiamo
noi per fissare l'appuntamento"* al posto del calendario: un lead senza
appuntamento vale comunque, un embed vuoto no.

L'istanza si cambia con `PUBLIC_CALCOM_ORIGIN` — `https://cal.com` per il cloud,
il proprio dominio per il self-hosted. Il passaggio è solo quella variabile.

### Una trappola in produzione

L'autoblocking di Iubenda blocca gli script di terze parti che riconosce. Lo
script dell'embed è marcato `_iub_cs_skip` perché venga caricato: si carica solo
dopo che l'utente ha chiesto un appuntamento, quindi è necessario a fornire il
servizio richiesto, non tracciamento. **Senza quella classe, in produzione il
calendario resta vuoto senza alcun errore visibile** — mentre in sviluppo, dove
Iubenda non è configurato, funziona benissimo. È il tipo di guasto che si scopre
dai lead che non arrivano.

---

## 5. Attribuzione: `source` e `medium`

I vecchi link passavano tutto in query string (`?source=SitoWebMC&medium=BtnProva`).
Adesso il `medium` lo dichiara il bottone (`data-medium="HeaderProva"`), ma la
convenzione vecchia continua a funzionare: `source` e `medium` senza prefisso
`utm_` sono catturati dal tracciamento e hanno la precedenza.

Precedenza, dal più forte:

1. `?source=` / `?medium=` in query string — i link storici ancora in circolazione
2. `utm_source` / `utm_medium` — le campagne
3. `data-medium` del bottone cliccato
4. il default del flusso (`FormProva`, `FormContatti`, …)

Le campagne vincono sul bottone di proposito: sapere che un lead arriva da Google
Ads conta più di sapere quale bottone ha premuto. Il bottone non va comunque
perso — resta in `ctaMedium` e in `cta` (il suo testo).

### Cosa era rotto prima

Otto CTA su cinque pagine puntavano a `/provagratis`, che rimandava a Typeform
**perdendo `source` e `medium` nel redirect**. Otto punti d'ingresso diversi
arrivavano indistinguibili. I redirect in `netlify.toml` ora conservano la query
string, quindi anche i link vecchi mantengono l'attribuzione.

---

## 6. Newsletter

Stesso webhook, payload ridotto:

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

Va nella stessa tabella `RICHIESTE`: teniamo un solo posto dove guardare invece
di una lista separata da riconciliare a mano.

Nota per il workflow: `marketing: true` qui è il senso stesso dell'iscrizione, ma
resta il campo `privacy` a documentare che il consenso è stato raccolto. Se un
indirizzo è già presente in tabella, aggiorna il record invece di duplicarlo.

---

## 7. Checklist prima del go-live

- [ ] Workflow `check` pubblicato e collegato a `PUBLIC_WEBHOOK_CHECK`
- [ ] Workflow `lead` pubblicato e collegato a `PUBLIC_WEBHOOK_LEAD`
- [ ] Creazione automatica delle opzioni **disattivata** sul nodo Airtable
- [ ] Event type Cal.com creati per Macerata e Montecassiano
- [ ] `calcom.visita` / `calcom.richiamata` compilati nei due file dei centri
- [ ] Webhook `BOOKING_CREATED` di Cal.com collegato a n8n
- [ ] `PUBLIC_CALCOM_ORIGIN` impostata su Netlify (vuota = cloud)
- [ ] Redirect verificati: `/provagratis`, `/form/guest-pass`, `/form/iscrizioni`
- [ ] Test end-to-end con un'email `iscritto`: la prova deve essere negata
- [ ] Test con Iubenda attivo: il calendario deve comparire davvero
