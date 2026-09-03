# Stato del lavoro

Aggiornato al 3 settembre 2026. Va tenuto aggiornato: è il documento che
permette a chi riprende il repo di non rifare scelte già fatte né rompere cose
che funzionano per una ragione.

Le convenzioni, i comandi e i vincoli stanno in [`../AGENTS.md`](../AGENTS.md).
I dati recuperati dal vecchio sito WordPress — ID Iubenda, URL dei portali,
agende — sono nel progetto Claude come `claude/integrazioni-lume.md`.

## Cosa manca per andare online

In ordine di quanto blocca.

### 1. Prezzi degli abbonamenti — serve il listino

`src/content/abbonamenti/*.md`, tre file, tutti con la nota «prezzi non
confermati dal listino reale». È la pagina che converte, e i numeri non ci
sono. Serve dal cliente: prezzi per sede se differiscono, quota di iscrizione
una tantum se c'è, durata dei vincoli, promo attive.

Attenzione: i `PaymentPlanId` 126, 127 e 128 trovati nel vecchio sito **non
sono gli abbonamenti**. Sono i pacchetti nuoto estivi da 6, 8 e 12 lezioni, e
sulla pagina d'origine i prezzi erano tutti 0 €.

### 2. Orari piscina — in vigore dal 7 settembre

Il cliente manda il file. Quelli che manda vanno sostituiti il 7 settembre,
quando entrano in vigore gli orari di tutto l'anno. Gli orari 2024/25 sono già
trascritti in [`PLANNING-PISCINA.md`](PLANNING-PISCINA.md) ma **non
pubblicati**, perché sono di una stagione scaduta.

### 3. Scuola nuoto — stagione e listino

`/scuola-nuoto` è completa e pubblicata, ma con `stagione.inizio`,
`stagione.fine`, `listino.voci` e `recuperi.nonRecuperabili`
deliberatamente vuoti. La pagina gestisce il vuoto: dove manca il listino
mostra un invito a chiedere invece di una tabella. **È il modello da seguire
per ogni dato mancante**, non un difetto da riempire con numeri plausibili.

### 4. Cal.com — gli event type

`calcom.visita` e `calcom.richiamata` sono vuoti su tutti e quattro i centri.
Nel frattempo il campo `calendlyUrl` fa da ponte: chi chiede un appuntamento
riceve il link all'agenda della segreteria invece di «ti contattiamo noi».
Quando gli event type ci saranno, l'embed Cal.com prende il posto del ripiego
da solo, senza toccare il codice.

Le agende Calendly attive: `calendly.com/macerata-lumefitness` e
`calendly.com/montecassiano-lumefitness`.

### 5. Webhook n8n — da costruire

Nessuno dei quattro esiste ancora. La specifica completa, campo per campo, con
la mappatura sulla tabella RICHIESTE di Airtable, i test `curl` e la lista
delle variabili Netlify, è in [`N8N.md`](N8N.md). Il sito funziona senza: il
check tratta tutti come «nuovo» e il lead viene loggato in console.

**Da correggere prima di metterlo in produzione**: la risposta del webhook di
verifica è pubblica e i campi opzionali `nome`, `cognome`, `cellulare`
esporrebbero dati personali a chiunque provi un'email. La raccomandazione di
non implementarli è scritta in `N8N.md`. Il cliente ha rimandato la
correzione, non l'ha respinta.

### 6. Piediripa e Urban — dati da confermare

Indirizzi e date di apertura previste. I due centri restano nel sito come
«prossima apertura» e i loro pulsanti portano a `promo.lumefitness.it`, che ha
un funnel suo. Non hanno video, non hanno portale, e non devono averli finché
non aprono.

### 7. Discipline — difficoltà, intensità, durata

Le 33 discipline sono state mandate al cliente come xlsx da compilare. Finché
torna, le schede mostrano quello che c'è.

## Cose fatte che è facile rompere

**Il video dei centri compare solo all'evento `playing`.** Non appena gli si
dà un `src`. La differenza non è teorica: un browser senza codec H.264 accetta
l'`src`, non riproduce niente, e mostrarlo comunque significa un rettangolo
nero sopra la foto più un pulsante di pausa che non mette in pausa nulla. Su
`error` l'`src` viene rimosso e si torna alla foto. Non «semplificare» questa
logica.

**Gli ID Iubenda sono default nel codice, non solo variabili Netlify.** Sono
identificativi pubblici, presenti in chiaro nell'HTML di ogni sito che usa
Iubenda: non c'è niente da proteggere. Se restassero vuoti, una build fatta
prima di configurare l'ambiente andrebbe online **senza banner**, e un banner
assente non si vede. Le variabili d'ambiente restano e hanno la precedenza.

**TCF è disattivato**, mentre il vecchio sito lo aveva attivo. Serve ai vendor
pubblicitari IAB, che qui non ci sono, e in cambio appesantisce il banner con
una lista vendor. Se entrano circuiti display programmatici, va riacceso.

**Il planning è una tabella a slot, non corsie a tempo continuo.** La versione
a corsie è stata rifatta perché con 8 lezioni sovrapposte servivano 5 corsie e
le tessere finivano al 19% di larghezza, illeggibili. Per slot di inizio il
massimo misurato è 4. Se qualcuno ripropone le corsie, è già stato provato.

**Le sale dei centri sono un dato per il cliente, non le aule dei corsi.** Il
planning non mostra in quale sala si tiene una lezione: serve solo a far
capire il palinsesto.

**`minmax(0,1fr)` su `.about` e `.about-imgs`.** `1fr` vale `minmax(auto,1fr)`
e la larghezza intrinseca delle immagini sfondava la traccia, facendo scorrere
la home in orizzontale. Non rimetterlo a `1fr`.

**`white-space:nowrap` su `.nav-cta`.** Con sette voci di menu «Prova Lume»
andava a capo a 1024px.

## Decisioni prese, con la ragione

| Decisione | Perché |
|---|---|
| Contenuti in Keystatic, non a codice | il cliente edita da solo, senza chiedere un deploy |
| Un solo numero di telefono per tutti i centri | scelta del cliente: risponde la reception e smista |
| Istruttori non mostrati | scelta del cliente |
| Il planning mostra tutto, con la fascia «provvisorio» | meglio un orario indicativo che una pagina vuota |
| Durate corsi: 50 minuti per tutto | scelta del cliente, in attesa dei dati reali |
| La piscina è solo a Montecassiano | confermato dal cliente |
| La prevendita porta fuori dal sito | ha un funnel proprio, con contratto e pagamento, e i suoi lead finiscono in un'altra tabella |
| Supabase fermo alla fase 1 | il cliente l'ha giudicata prematura. Le migrazioni sono inerti finché nessuno le applica |
| Corso estivo non pubblicato | fuori stagione |

## Punti che poggiano su un'inferenza, non su un dato

Uno solo, e va verificato in reception.

**L'id del club negli URL PerfectGym.** Nel link dell'elenco corsi
(`#/Classes/N/List`) il numero è l'id del club. Il vecchio sito puntava
`Classes/1` su **entrambe** le sedi. È stato messo Macerata = 1 e
Montecassiano = 2 perché la scuola nuoto, che esiste solo a Montecassiano, usa
`Groups/2` e `clubID=2`. Se l'inferenza è sbagliata, il pulsante «Prenota sul
portale» del planning mostra i corsi della sede sbagliata: funziona e non dà
errore, quindi nessuno se ne accorge.

## Piccole cose ancora aperte

- `PUBLIC_PLANNING_ESEMPIO` va **rimossa** dalle variabili Netlify: il
  planning ora è quello reale e la variabile può solo confondere.
- `interessiLead` in `src/config/tassonomie.ts` è codice morto con
  un'intestazione di avvertimento. Va rimosso o usato.
- `Lume_Urban.mp4` è verticale 1080×1920 e non ha una collocazione nel design.
- I video stanno in `public/media/`, ma il piano (già deciso a luglio, §12 di
  `ARCHITETTURA.md`) è **S3 + CloudFront**. Il campo `video` dei centri è una
  stringa qualunque: quando il CDN c'è, si sostituisce il valore dal CMS senza
  toccare il codice. Da fare: policy CORS sul bucket e un `preconnect` verso
  il dominio CloudFront.
- Il gate dei consensi non è mai stato visto renderizzato: `cdn.iubenda.com`
  era bloccato dalla rete dell'ambiente di sviluppo. Verificato il ripiego, il
  Consent Mode e i link; il documento incorporato va guardato una volta in un
  browser vero.
- Idem per il video: la riproduzione non è verificabile senza codec H.264.
