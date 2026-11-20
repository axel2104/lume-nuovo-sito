# Black Week Red Pass — link e UTM per le ads

Pagina: https://lumefitness.it/blackfriday (23–29/11/2026, il banner in home parte lunedì 23/11 00:00).

## Parametri da mettere nelle ads Meta ("Parametri URL")

    utm_source=meta&utm_medium=paid&utm_campaign=blackfriday&utm_content={{ad.name}}

`utm_source=meta` + `utm_medium=paid` è la combinazione che la pagina /marketing del CRM riconosce come Meta Ads.
Non cambiare `utm_campaign=blackfriday`: è la chiave con cui si raggruppa tutta la campagna.
Per Google Ads: `utm_source=google&utm_medium=cpc&utm_campaign=blackfriday&utm_content={creative}`.

## URL di destinazione (uno per centro)

- Macerata:      https://lumefitness.it/blackfriday#macerata
- Montecassiano: https://lumefitness.it/blackfriday#montecassiano
- Urban:         https://lumefitness.it/blackfriday#urban
- Tutti i centri: https://lumefitness.it/blackfriday

Aggiungere in fondo i parametri sopra (prima dell'#): es.
`https://lumefitness.it/blackfriday?utm_source=meta&utm_medium=paid&utm_campaign=blackfriday&utm_content=macerata-gold#macerata`

## Altri canali (nomi già pronti)

| Dove | utm_source | utm_medium | utm_campaign | utm_content |
|---|---|---|---|---|
| Banner in home | sito | hero | blackfriday | (già nel link) |
| Instagram bio / story organica | instagram | social | blackfriday | story / bio / post |
| Mail clienti | mail | email | blackfriday | nome dell'invio |
| WhatsApp / Spoki | spoki | whatsapp | blackfriday | nome del messaggio |
| QR in sede | stampa | qr | blackfriday | macerata / montecassiano / urban |

## Come arrivano nel CRM

Gli UTM della prima visita restano per tutta la sessione e passano ai pulsanti «Vieni in sede» / «Fatti chiamare»,
quindi ogni appuntamento prenotato dal sito porta con sé la ad che l'ha generato (in `crm_activities.briefing`).
Il tracciamento parte solo se il visitatore accetta i cookie analytics.
