# Planning piscina Montecassiano — da confermare, NON pubblicato

Il planning pubblicato di Montecassiano ha 51 lezioni e **non contiene una sola
lezione di acqua fitness**. Il foglio "Ipotesi Planning 26/27" non ha un foglio
piscina: ha il palinsesto sala e i due Reformer, e basta.

Le 38 lezioni qui sotto vengono da un'immagine trovata nei media del vecchio
sito — `wp-content/uploads/2024/09/orariopiscina.png`, un cartello
"PLANNING MONTECASSIANO - PISCINA" — quindi sono **della stagione 2024/25**.

**Non le ho pubblicate.** Un orario di due stagioni fa su una pagina che dice
"questo è il nostro orario" manda gente in piscina per un corso che non c'è
più. Se sono ancora buone, o quasi, il blocco è pronto: si incolla nel campo
`planning` di `src/content/centri/montecassiano.md` sotto le lezioni di sala,
oppure si compila dall'editor.

Le durate sono a 50 minuti, come per il resto del planning: sul cartello non
c'erano.

## Le lezioni sul cartello

| | Lunedì | Martedì | Mercoledì | Giovedì | Venerdì | Sabato |
|---|---|---|---|---|---|---|
| | 7:30 AcquaGym | 9:00 AcquaGYM | 7:45 AcquaWALKING | 9:00 AcquaFIT | 7:30 LesMills Acquatonus | 8:45 AcquaBIKE |
| | 8:45 AcquaWALKING | 10:00 AcquaCROSS | 8:45 AcquaGYM | 10:00 AcquaGYM | 9:00 AcquaWALKING | 9:45 LesMills Acquatonus |
| | 9:45 AcquaFIT | 12:45 AcquaWALKING | 9:45 AcquaFIT | 12:40 AcquaGYM | 10:00 LesMills AquaDynamic | |
| | 12:45 AcquaCROSS | 13:40 AcquaGYM | 13:00 AcquaCROSS | 13:45 AcquaWALKING | 12:40 LesMills AquaDynamic | |
| | 13:45 LesMills Walking | 18:30 AcquaBIKE | 14:00 AcquaBIKE | 18:15 LesMills AquaDynamic | 13:40 LesMills Aquawork | |
| | 18:15 AcquaWALKING | 19:30 AcquaCROSS | 18:30 AcquaGYM | 19:10 AcquaWALKING | 19:15 AcquaWALKING | |
| | 19:15 LesMills AquaDynamic | 20:30 AcquaGYM | 19:30 AcquaBIKE | 20:10 LesMills AquaWork | 20:15 AcquaBIKE | |
| | 20:10 LesMills Aquawork | | | | | |

## Due cose da sistemare prima di pubblicarle

**I nomi non coincidono con le schede del sito.** Sul cartello ci sono
`AcquaGym`, `AcquaGYM`, `AcquaFIT`, `AcquaCROSS`, `AcquaWALKING`, `AcquaBIKE`,
più quattro varianti Les Mills — `Acquatonus`, `AquaDynamic`, `Aquawork`,
`Walking` — scritte in cinque modi diversi. Nel sito le schede sono
`acquagym`, `acquafit`, `acquacross`, `acquawalking`, `acquabike` e una sola
`lesmills-aqua` con tre varianti. Nel blocco sotto ho normalizzato: le quattro
Les Mills puntano tutte a `lesmills-aqua` tenendo il nome originale come
titolo della lezione.

**`LesMills Walking` di lunedì 13:45** è l'unica ambigua: potrebbe essere
AcquaWALKING in versione Les Mills o il Walking su tappeto, che è un'altra
cosa e non sta in piscina. L'ho lasciata su `lesmills-aqua`.

## Blocco pronto da incollare

```yaml
  - giorno: '1'
    inizio: '07:30'
    fine: '08:20'
    corso: 'AcquaGYM'
    disciplina: acquagym
  - giorno: '1'
    inizio: '08:45'
    fine: '09:35'
    corso: 'AcquaWALKING'
    disciplina: acquawalking
  - giorno: '1'
    inizio: '09:45'
    fine: '10:35'
    corso: 'AcquaFIT'
    disciplina: acquafit
  - giorno: '1'
    inizio: '12:45'
    fine: '13:35'
    corso: 'AcquaCROSS'
    disciplina: acquacross
  - giorno: '1'
    inizio: '13:45'
    fine: '14:35'
    corso: 'LesMills Walking'
    disciplina: lesmills-aqua
  - giorno: '1'
    inizio: '18:15'
    fine: '19:05'
    corso: 'AcquaWALKING'
    disciplina: acquawalking
  - giorno: '1'
    inizio: '19:15'
    fine: '20:05'
    corso: 'LesMills AquaDynamic'
    disciplina: lesmills-aqua
  - giorno: '1'
    inizio: '20:10'
    fine: '21:00'
    corso: 'LesMills Aquawork'
    disciplina: lesmills-aqua
  - giorno: '2'
    inizio: '09:00'
    fine: '09:50'
    corso: 'AcquaGYM'
    disciplina: acquagym
  - giorno: '2'
    inizio: '10:00'
    fine: '10:50'
    corso: 'AcquaCROSS'
    disciplina: acquacross
  - giorno: '2'
    inizio: '12:45'
    fine: '13:35'
    corso: 'AcquaWALKING'
    disciplina: acquawalking
  - giorno: '2'
    inizio: '13:40'
    fine: '14:30'
    corso: 'AcquaGYM'
    disciplina: acquagym
  - giorno: '2'
    inizio: '18:30'
    fine: '19:20'
    corso: 'AcquaBIKE'
    disciplina: acquabike
  - giorno: '2'
    inizio: '19:30'
    fine: '20:20'
    corso: 'AcquaCROSS'
    disciplina: acquacross
  - giorno: '2'
    inizio: '20:30'
    fine: '21:20'
    corso: 'AcquaGYM'
    disciplina: acquagym
  - giorno: '3'
    inizio: '07:45'
    fine: '08:35'
    corso: 'AcquaWALKING'
    disciplina: acquawalking
  - giorno: '3'
    inizio: '08:45'
    fine: '09:35'
    corso: 'AcquaGYM'
    disciplina: acquagym
  - giorno: '3'
    inizio: '09:45'
    fine: '10:35'
    corso: 'AcquaFIT'
    disciplina: acquafit
  - giorno: '3'
    inizio: '13:00'
    fine: '13:50'
    corso: 'AcquaCROSS'
    disciplina: acquacross
  - giorno: '3'
    inizio: '14:00'
    fine: '14:50'
    corso: 'AcquaBIKE'
    disciplina: acquabike
  - giorno: '3'
    inizio: '18:30'
    fine: '19:20'
    corso: 'AcquaGYM'
    disciplina: acquagym
  - giorno: '3'
    inizio: '19:30'
    fine: '20:20'
    corso: 'AcquaBIKE'
    disciplina: acquabike
  - giorno: '4'
    inizio: '09:00'
    fine: '09:50'
    corso: 'AcquaFIT'
    disciplina: acquafit
  - giorno: '4'
    inizio: '10:00'
    fine: '10:50'
    corso: 'AcquaGYM'
    disciplina: acquagym
  - giorno: '4'
    inizio: '12:40'
    fine: '13:30'
    corso: 'AcquaGYM'
    disciplina: acquagym
  - giorno: '4'
    inizio: '13:45'
    fine: '14:35'
    corso: 'AcquaWALKING'
    disciplina: acquawalking
  - giorno: '4'
    inizio: '18:15'
    fine: '19:05'
    corso: 'LesMills AquaDynamic'
    disciplina: lesmills-aqua
  - giorno: '4'
    inizio: '19:10'
    fine: '20:00'
    corso: 'AcquaWALKING'
    disciplina: acquawalking
  - giorno: '4'
    inizio: '20:10'
    fine: '21:00'
    corso: 'LesMills AquaWork'
    disciplina: lesmills-aqua
  - giorno: '5'
    inizio: '07:30'
    fine: '08:20'
    corso: 'LesMills Acquatonus'
    disciplina: lesmills-aqua
  - giorno: '5'
    inizio: '09:00'
    fine: '09:50'
    corso: 'AcquaWALKING'
    disciplina: acquawalking
  - giorno: '5'
    inizio: '10:00'
    fine: '10:50'
    corso: 'LesMills AquaDynamic'
    disciplina: lesmills-aqua
  - giorno: '5'
    inizio: '12:40'
    fine: '13:30'
    corso: 'LesMills AquaDynamic'
    disciplina: lesmills-aqua
  - giorno: '5'
    inizio: '13:40'
    fine: '14:30'
    corso: 'LesMills Aquawork'
    disciplina: lesmills-aqua
  - giorno: '5'
    inizio: '19:15'
    fine: '20:05'
    corso: 'AcquaWALKING'
    disciplina: acquawalking
  - giorno: '5'
    inizio: '20:15'
    fine: '21:05'
    corso: 'AcquaBIKE'
    disciplina: acquabike
  - giorno: '6'
    inizio: '08:45'
    fine: '09:35'
    corso: 'AcquaBIKE'
    disciplina: acquabike
  - giorno: '6'
    inizio: '09:45'
    fine: '10:35'
    corso: 'LesMills Acquatonus'
    disciplina: lesmills-aqua
```
