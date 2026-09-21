# Stato del lavoro

Aggiornato al 9 settembre 2026. Va tenuto aggiornato: è il documento che
permette a chi riprende il repo di non rifare scelte già fatte né rompere cose
che funzionano per una ragione.

Le convenzioni, i comandi e i vincoli stanno in [`../AGENTS.md`](../AGENTS.md).
I dati recuperati dal vecchio sito WordPress — ID Iubenda, URL dei portali,
agende — sono nel progetto Claude come `claude/integrazioni-lume.md`.

## Cosa manca per andare online

In ordine di quanto blocca.

### 1. Gli id PerfectGym dei piani

Il listino reale è pubblicato, ma i pulsanti "Richiedi" aprono il form invece
di portare al checkout del piano scelto. Per farlo servono i `PaymentPlanId`
delle otto combinazioni piano-formula, nella forma
`ClientPortal2/Registration/Start?clubID=N&PaymentPlanId=NNN`.

Non sono deducibili: i tre trovati nel vecchio sito (126, 127, 128) sono i
pacchetti nuoto estivi, non gli abbonamenti.

### 2. Orari piscina — pubblicati il 7 settembre 2026

FATTO il 7/9/26: il planning piscina 26/27 è caricato in
`src/content/centri/montecassiano.md`: i 42 corsi in acqua hanno
`sezione: 'In acqua'` ed escono in una sezione a parte sotto la griglia; le
fasce di nuoto libero stanno nel campo `aperture` (blocco "Accesso libero").
La scuola nuoto (bambini/ragazzi, corso a iscrizione) NON sta più nel
planning generale: il suo calendario è nella pagina `/scuola-nuoto`.
Fonte: il file del cliente "PLANNING FITNESS 2026-2027.docx", tabella «dal
07/09» (verificata voce per voce contro il planning caricato il 9/9/26);
nuoto libero da "planning nuoto libero.xlsx". La tabella «IPOTETICO DAL
19/10» dello stesso file NON è pubblicata: se l'apertura di Piediripa sposta
qualche corso, il planning va aggiornato a mano.

Gli orari 2024/25 restano in [`PLANNING-PISCINA.md`](PLANNING-PISCINA.md)
come storico, non vanno ripubblicati.

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

### 8. Foto delle attività — il cliente le sta preparando

Le otto foto che c'erano in `src/assets/discipline/` erano di repertorio, non
scatti Lume: mostrarle significava vendere la palestra di qualcun altro. Il
campo `immagine` è stato **svuotato su tutte e 35 le discipline**, e i file
sono rimasti su disco (orfani: nessun contenuto li cita, quindi Astro non li
manda al browser) in attesa di essere sostituiti.

Finché il campo è vuoto compare il logo in filigrana sulla sfumatura di
categoria, in tutti e tre i posti dove una disciplina si mostra:

| Dove | Regola |
|---|---|
| tessere della home | `.card-d:not(:has(img))::before` — `editoriale.css` |
| bento di `/discipline` | `.tessera:not(:has(.t-foto)):not(:has(.t-video)) .t-velo` — `bento.css` |
| intestazione della scheda | `.disc-hero.senza-media::before` — `bento.css` |

**Niente da riattivare quando arrivano le foto**: basta caricarle dal CMS sul
campo `immagine` della disciplina e la filigrana sparisce da sola, una
disciplina per volta. Non c'è nessun interruttore globale da ricordarsi.

Nota sulla vetrina in home: sei tessere, una per categoria in ordine di
`ordine`, e le categorie sono otto — **Acqua e Danza restano fuori**. Se la
piscina deve comparire in homepage va abbassato l'`ordine` di una disciplina
Acqua.

## Cose fatte che è facile rompere

**Urban ha il planning (11/9/26).** Fonte: foglio «Centro» del file del
cliente "Ipotesi Planning Generale Stagione '26-'27-2.ods" (36 lezioni,
durata convenzionale 50 min, capienze NON pubblicate). La route
`/planning/[centro]` ora include i centri non aperti che hanno un planning
compilato: il filtro è sui contenuti, non sullo stato. Venerdì 13:30 è
"Yoga / BodyPump" senza link disciplina: nel foglio il corso è ancora
indeciso. Stesso file = correzioni applicate a Macerata (rinomine, spostamenti
Reformer, aggiunta LesMills Dance mar 18:30) e Montecassiano (Reformer: via
lun 9:30, aggiunto ven 10:00). Il palinsesto CrossFit del foglio «Box
CrossFit - HYROX» NON è allineato col sito (il foglio ha anche le Hybrid
Class e orari diversi): lasciato com'è, da confermare col cliente prima di
toccarlo.

**L'hero della home è a piena larghezza, col testo sopra il video (11/9/26).**
Il video del centro (autoplay muto) o la sua foto riempiono tutto il primo
schermo (`calc(100svh - altezza nav)`); titolo, sottotitolo e CTA stanno in
basso a sinistra sopra un gradiente, senza più la card affiancata. Pallini e
pulsante «Video del centro» vivono nella riga `.hero-tools` in basso a
destra: su mobile salgono a `bottom:84px` perché lì sotto c'è SEMPRE il
bottone delle preferenze cookie di Iubenda. Sotto i 720px di altezza viewport
il sopratitolo dell'hero sparisce (toccherebbe la chip del centro). Se un
giorno l'hero torna un riquadro dentro il wrap, ricontrollare queste tre cose.

**La pagina planning ha sezioni (7/9/26).** Una lezione con il campo `sezione`
esce dalla griglia principale e finisce in una sezione omonima in fondo (oggi:
"In acqua" e "Scuola nuoto adulti" a Montecassiano; a Macerata non restano
sezioni dal 21/9/26, quando il Reformer è tornato in griglia principale su
richiesta del cliente, e il CrossFit era già in griglia; lo stesso giorno il
Reformer è entrato in griglia anche a Montecassiano). Sopra la griglia c'è
il blocco "Accesso libero": la card Sala pesi è automatica dal campo `orari`
del centro, le altre (Nuoto libero a Montecassiano) dal campo `aperture` — le
fasce con lo stesso `titolo` si raccolgono in una card. Ogni sezione ha il
suo PDF (`/planning/<centro>/<sezione>.pdf`, stesso motore del planning
intero) e il PDF completo include TUTTE le lezioni, anche quelle in sezione:
chi filtra `planning` a mano (es. per non pubblicare una sezione) deve
ricordarselo. Dal 21/9/26 le route PDF sono **dinamiche** (`prerender =
false`) e accettano `?corso=` e `?sala=`: è il "Scarica la vista filtrata"
che il client accende quando un filtro è attivo — il criterio di filtro della
route deve restare identico a quello di `planning.client.js`, altrimenti il
PDF non è ciò che l'utente vede.
La scuola nuoto bambini/ragazzi (corso a iscrizione per fasce d'età) NON sta
nel `planning` proprio come dato: il suo palinsesto vive in `/scuola-nuoto`.
La **scuola nuoto adulti** invece è nel planning dal 11/9/26: 29 turni con
`sezione: 'Scuola nuoto adulti'`, fonte PerfectGym (classi «Scuola Nuoto
Adulti - base/Intermedio/Avanzato/MASTER» del club 2, settimana tipo
verificata su due settimane consecutive), livelli normalizzati in «Nuoto
Adulti Base/Intermedio/Avanzato/Master». Se gli orari adulti cambiano in PG,
vanno aggiornati a mano qui — come il resto del planning.

**La mappa del footer è un'immagine statica, non si aggiorna da sola.** La
genera `scripts/genera_mappa_centri.py` (Python + Pillow) leggendo il campo
`coordinate` dei centri: se cambia un indirizzo, una coordinata o apre un
centro nuovo, va rilanciato a mano. I pin numerati seguono il campo `ordine`
dei contenuti e la legenda usa lo stesso ordine — chi cambia uno dei due deve
cambiare entrambi. L'attribuzione «© OpenStreetMap contributors» è obbligatoria
per licenza, non decorazione. È statica di proposito: niente tile di terze
parti né consensi extra su ogni pagina.

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

**Le attività di un piano stanno sul piano, non sulla formula di pagamento.**
Sul portale PerfectGym ogni combinazione piano-formula ripete l'intero elenco:
nove copie, e sono già divergite fra loro — il GOLD annuale in soluzione unica
aveva perso la sospensione gratuita che l'annuale a rate aveva, e il GOLD
mensile aveva perso lo SHAPE che il piano da 40 € in meno teneva. Nel sito
c'è un elenco solo per piano, quindi la stessa divergenza non può ripetersi.
Non reintrodurre le attività dentro le formule.

**Il delta delle schede si calcola per contenimento, non per posizione.**
L'ordine in cui si mostrano i piani (All Lume, GOLD, Sala Pesi) non è l'ordine
in cui si contengono: il Sala Pesi è il più piccolo dei tre ma sta per ultimo.
Confrontando con la scheda precedente, la sua diceva «tutto di All Lume GOLD,
più» seguito da un elenco vuoto. E il riferimento si usa solo se viene prima
nella pagina, altrimenti si mostra l'elenco intero: un rimando a una scheda
che il lettore non ha ancora letto non è una sintesi.

**I nomi dei piani nel form arrivano dai contenuti.** Erano cablati in
`src/config/forms.ts` e sono sopravvissuti al cambio di listino: il form
offriva Base, Plus e Premium, piani inesistenti, e quel nome finiva nel campo
`Nome Abbonamento` di Airtable. `data-abbonamento` dei pulsanti del listino
deve combaciare **alla lettera** con il `value` della chip, altrimenti la
preselezione non seleziona niente e non segnala nulla.

**Il planning mostra la settimana intera a ogni larghezza.** Sotto i 1024px
c'era una vista diversa — un giorno per volta, scelto con sei pulsanti — e i
clienti si lamentavano di non vedere il palinsesto. Ora la griglia è una e
cambia densità: tessere da 8px col solo nome sul telefono, con orario e nome
intero da 1024. Non reintrodurre il selettore di giorno: è quello che
impediva di rispondere alla domanda con cui la gente arriva, «quando posso
venire».

**Montecassiano sta in una schermata, Macerata no.** 14 fasce contro 26: a
390px la griglia è alta 586px e 1106px. Non è un difetto da correggere
stringendo il testo — a 8px si è già al limite del leggibile — ed è il motivo
per cui esiste il PDF.

**I colori delle categorie stanno in `src/data/categorie.ts` e in nessun altro
posto.** Li usano la griglia e il PDF: se finissero anche in `planning.css`,
il giorno che si cambia una tinta il planning stampato resterebbe indietro
senza che nessuno lo noti. Il foglio di stile sa *come* usare `--cat`, non
quanto vale.

**Nella vista compatta il nome perde il prefisso «LesMills».** Con 41px per il
testo, "LesMills BodyPump" finiva troncato proprio sulla parola che distingue
il corso. Il nome intero torna da 1024px e sta sempre nel `title` e nel popup.
E i nomi composti hanno un `<wbr>` al maiuscolo interno, altrimenti si
spezzavano in "BodyPum/p" con una lettera orfana.

**Attenzione alla specificità di `.pl-lez b`.** Vale (0,1,1) e batte una
classe sola: `.pl-lez-pieno { display: none }` non nascondeva niente, e la
vista compatta mostrava comunque il nome intero. Va scritto
`.pl-lez b.pl-lez-pieno`. Trovato misurando, non leggendo.

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
| Si entra col braccialetto NFC, non col QR code dell'app | correzione del cliente: i testi che parlavano di QR erano sbagliati |
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
- Nel planning di Macerata la stessa lezione compare come «LesMills BodyPump»
  e come «Bodypump»: sono lo stesso corso scritto in due modi, e il filtro
  dei corsi li elenca come due voci. Da uniformare dal CMS.
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
