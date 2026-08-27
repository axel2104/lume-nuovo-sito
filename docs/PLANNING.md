# Planning corsi — contratto con n8n e PerfectGym

La pagina `/planning/<centro>` mostra la **settimana tipo** dei corsi. La fonte di
verità è PerfectGym: il sito non è mai il posto dove si decide un orario, è il
posto dove si legge.

- **Componente:** `src/components/planning/PlanningSettimana.astro`
- **Renderer condiviso:** `src/lib/planningVista.ts`
- **Matematica e tipi:** `src/config/planning.ts`
- **Client:** `src/lib/planning.client.js`

---

## 1. Come arrivano i dati

Due sorgenti, in cascata:

```
1. SNAPSHOT   campo `planning` in src/content/centri/<centro>.md
              renderizzato dal server → è ciò che vede Google e ciò che resta
              se n8n non risponde

2. FRESCO     PUBLIC_WEBHOOK_PLANNING?centro=<slug>
              chiamato dal browser → sostituisce lo snapshot se differisce
```

**Perché due e non una.** Il webhook da solo darebbe una pagina vuota ogni volta
che n8n è giù, lento o irraggiungibile, e un orario non è un dettaglio: è
l'informazione per cui la gente apre il sito prima di uscire di casa. Lo snapshot
da solo invecchierebbe. Insieme: la pagina è sempre utile e quasi sempre fresca.

Il client confronta un'impronta dell'orario (`firma()`) e **non ridisegna nulla
se i dati sono identici** — che è il caso normale, dato che un planning cambia
poche volte l'anno. Senza quel confronto si vedrebbe uno sfarfallio a ogni visita.

---

## 2. Il webhook

### Riceve

```
GET  <PUBLIC_WEBHOOK_PLANNING>?centro=macerata
```

`centro` è lo slug della collection `centri` (`macerata`, `montecassiano`).

### Deve rispondere

```json
{
  "aggiornatoIl": "2026-08-20T04:00:00+02:00",
  "lezioni": [
    {
      "giorno": 1,
      "inizio": "07:00",
      "fine": "07:50",
      "corso": "Les Mills BodyPump",
      "disciplina": "lesmills-bodypump",
      "sala": "Sala Les Mills",
      "istruttore": "Giulia",
      "prenotabile": true
    }
  ]
}
```

| Campo | Obbligatorio | Note |
|---|---|---|
| `giorno` | sì | **1 = lunedì … 7 = domenica** (ISO). Attenzione: `Date.getDay()` in JavaScript dà 0 per domenica — va convertito |
| `inizio`, `fine` | sì | `HH:MM`, ora locale della sede. `fine` deve essere maggiore di `inizio` |
| `corso` | sì | il nome mostrato |
| `disciplina` | no | slug della collection `discipline`: rende la lezione cliccabile verso la scheda |
| `sala` | no | alimenta il filtro e la disposizione in colonne parallele |
| `istruttore` | no | mostrato solo nella vista mobile e nel tooltip |
| `prenotabile` | no | default `true` |

### Due requisiti che fanno fallire tutto in silenzio

**CORS.** La chiamata parte dal browser, quindi il workflow deve rispondere con
`Access-Control-Allow-Origin` sul dominio del sito. Senza quell'header la
richiesta muore nel browser, il sito resta sullo snapshot e **non compare nessun
errore** né in pagina né in console lato server. È il guasto più facile da non
accorgersi.

**Nessun dato personale.** La risposta è pubblica: chiunque può aprire l'URL del
webhook. Devono uscire solo orari, nomi dei corsi, sale ed eventualmente il nome
di battesimo dell'istruttore — mai iscritti, prenotazioni o id interni.

### Robustezza del sito

Le lezioni malformate vengono scartate senza far cadere la pagina: orario
illeggibile, `fine` prima di `inizio`, giorno fuori da 1–7, nome vuoto. Se il
workflow manda spazzatura si perde quella lezione, non il planning. `minuti()`
restituisce `NaN` e non `0` proprio per questo: uno zero silenzioso piazzerebbe la
lezione a mezzanotte facendola sembrare valida.

---

## 3. Da dove prendere i corsi in PerfectGym

Quello che sappiamo dall'integrazione già in uso (skill `lume-dashboard-refresh`):

- **API base:** `https://lumefitness.perfectgym.com/Api/v2.2/odata/`
- **Autenticazione:** header `X-Client-Id` e `X-Client-Secret`
- **Club:** `clubId=1` Macerata · `clubId=2` Montecassiano

**L'entità dei corsi va individuata: non la conosco e non va indovinata.** Un nome
sbagliato in un workflow produce un 404 o, peggio, una lista di cose diverse da
quelle attese. Il primo passo è chiedere all'API cosa espone:

```
GET /Api/v2.2/odata/$metadata
```

Cerca fra gli `EntitySet` i nomi che riguardano le classi a calendario — tipicamente
qualcosa come *Classes*, *ClassSchedules*, *GroupClasses*, *Zones*, *ClassTypes*.
Poi interroga l'entità candidata con `$top=5` e guarda i campi veri prima di
scrivere la mappatura.

### Dalla risposta di PerfectGym al contratto

Il gestionale ragiona per **date**, il planning per **settimana tipo**: la
conversione è il cuore del workflow.

1. Scarica le classi di una settimana rappresentativa e non festiva (evita agosto
   e le settimane con chiusure: una settimana anomala diventerebbe l'orario
   pubblicato).
2. Per ogni classe: `giorno` dalla data (ISO 1–7), `inizio`/`fine` da inizio e
   durata, `corso` dal nome, `sala` dalla zona.
3. **Deduplica.** La stessa lezione ricorrente comparirà più volte se il periodo
   copre più settimane: chiave `giorno|inizio|corso|sala`.
4. `disciplina`: mappa il nome del corso sullo slug della collection. Serve una
   tabella di corrispondenza — i nomi in PerfectGym non coincidono con gli slug.
   Meglio una tabella esplicita che una normalizzazione automatica che sbaglia in
   silenzio.
5. Ordina e restituisci.

### Aggiornare anche lo snapshot

Il webhook serve il browser, ma lo snapshot nei contenuti va rinfrescato ogni
tanto — è quello che regge quando n8n è giù e quello che vede Google. Un workflow
mensile che scrive `planning` e `planningAggiornatoIl` nei due file dei centri e
fa commit è sufficiente: l'orario cambia a inizio stagione, non ogni giorno.

---

## 4. Configurazione

```bash
# .env
PUBLIC_WEBHOOK_PLANNING=https://n8n.lumeflow.it/webhook/planning
```

Vuoto = nessun aggiornamento tentato, si vede solo lo snapshot.

Per centro, in `src/content/centri/<centro>.md`:

```yaml
perfectgymCorsiUrl: https://lumefitness.perfectgym.com/ClientPortal2/#/Classes/1/List
planningAggiornatoIl: "2026-09-01T04:00:00+02:00"
planning:
  - giorno: 1
    inizio: "07:00"
    fine: "07:50"
    corso: Les Mills BodyPump
    disciplina: lesmills-bodypump
    sala: Sala Les Mills
    istruttore: Giulia
```

`perfectgymCorsiUrl` alimenta il bottone "Prenota sul portale": il numero
nell'URL è il `clubId`, quindi va diverso per centro.

---

## 5. Note sul layout

**Le sovrapposizioni sono affiancate, non sovrapposte.** Un club con quattro sale
manda quattro lezioni alla stessa ora: una griglia che ignora il problema ne
disegna una sopra l'altra e ne rende invisibili tre — e nessuno se ne accorge
finché un iscritto non si presenta al corso sbagliato. `disponi()` assegna le
corsie per gruppo di sovrapposizione, così un incrocio alle 18:30 non stringe
anche le lezioni del mattino.

**Il filtro ridisegna, non nasconde.** Filtrando per sala le lezioni superstiti
riprendono tutta la larghezza della colonna. Nascondendole si vedrebbero tre
tessere strette a sinistra e due terzi di colonna vuoti.

**Con più di tre sale in parallelo la griglia si stringe.** Il filtro sala è la
risposta: una sala alla volta si legge benissimo. Se diventa il modo normale di
consultarla, vale la pena trasformare quel `<select>` in linguette e sceglierne
una di default sul desktop.

**Senza JavaScript** resta un planning completo: la griglia è HTML statico e la
vista mobile diventa tutti i giorni in fila. Si perdono i filtri e il cambio
giorno, non i contenuti.

---

## 6. Checklist

- [ ] Individuata l'entità corsi con `$metadata`
- [ ] Tabella di corrispondenza nome corso → slug disciplina
- [ ] Workflow con deduplica sulla chiave `giorno|inizio|corso|sala`
- [ ] Header CORS sulla risposta del webhook
- [ ] Verificato che la risposta non contenga dati personali
- [ ] `PUBLIC_WEBHOOK_PLANNING` su Netlify
- [ ] `perfectgymCorsiUrl` compilato per entrambi i centri (clubId diverso!)
- [ ] Snapshot iniziale in `planning` per i due centri
- [ ] Test con webhook spento: la pagina deve mostrare lo snapshot
- [ ] Test con una lezione malformata: deve sparire quella, non la pagina
