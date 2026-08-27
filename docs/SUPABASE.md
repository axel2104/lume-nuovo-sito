# Supabase — anagrafica, richieste e tutto ciò che verrà

Il sito raccoglie lead da mesi e non sa dire se due richieste sono della stessa
persona. Questa cartella è la risposta: un database dove la persona esiste come
entità, e ogni form le si aggancia da solo.

---

## 1. Dove sta ogni cosa

```
BROWSER  ──POST──►  n8n  ──service key──►  SUPABASE
                     │
                     └──────────────────►  AIRTABLE
```

**Il browser non ha mai una credenziale di database.** Non c'è un client
Supabase nel sito, non c'è una chiave anon nel bundle, e non ci sarà: il sito
manda a n8n, n8n scrive. È la stessa architettura che avevamo già per i form —
non cambia una riga di codice del sito per attivare tutto questo.

**Airtable non sparisce.** Resta il posto dove i consulenti lavorano i lead, con
le loro viste e i loro filtri salvati. Cambia chi è la fonte di verità: il
workflow scrive **prima** su Supabase e poi su Airtable, perché un nodo Airtable
può fallire in silenzio e un lead perso è perso. La riga su `richieste` è la
ricevuta che dimostra che è arrivato.

---

## 2. Come si applica

Non c'è `db push` automatico e non c'è una pipeline: le migrazioni si incollano
nella SQL Editor di Supabase, in ordine di nome. Sono scritte per essere
**rieseguibili** (`if not exists`, `create or replace`), quindi riapplicarle
dopo una modifica non costringe a ricostruire niente.

Prima di incollarne una in produzione, però, si prova:

```bash
# serve un Postgres qualunque — locale, in container, o un progetto di prova
PGHOST=/tmp PGPORT=5433 ./supabase/test/esegui.sh
```

Lo script ricrea un database vuoto, applica le migrazioni, **le riapplica** per
verificare che siano davvero rieseguibili, e ci gira sopra i test.

I test non sono un lusso. Le migrazioni si applicano a mano, una volta sola, su
un database che contiene dati veri: senza, il primo collaudo della deduplica
sarebbe su lead di persone vere, e un errore si scoprirebbe da un'anagrafica
sbagliata settimane dopo.

---

## 3. Cosa c'è adesso — fase 1

`supabase/migrations/20260827_anagrafica_e_richieste.sql`

### `utenti`

Una riga per persona. Deduplica su **id PerfectGym** o **email**, mai sul
telefono: i corsi junior si iscrivono col numero del genitore, e unire su quello
fonderebbe madre e figlio in una persona sola. È l'errore più difficile da
disfare, quindi non si corre il rischio.

I campi `email_norm` e `cellulare_norm` sono `generated`: una normalizzazione
che dipende da chi scrive è una normalizzazione che prima o poi qualcuno
dimentica, e la chiave smette di funzionare in silenzio.

### `richieste`

Una riga per invio di form, **di qualunque flusso**. Una tabella sola e non
quattro: i quattro flussi hanno gli stessi campi con valori diversi, e su
Airtable è già così — `RICHIESTE` è una tabella sola con `Tipo Richiesta`.
Questo rende la copia verso Airtable un mapping diretto, campo per campo.

Le colonne ricalcano il payload di `docs/FORM.md` uno a uno. I tre `check`
(`flusso`, `sede`, `esito`) fermano i valori inventati: se un giorno il sito
mandasse `PIEDIRIPA` in `sede`, la riga viene rifiutata invece di entrare e
sparire dai filtri.

### `trova_o_crea_utente()` e il trigger `aggancia_utente()`

La deduplica sta **in Postgres**, non dentro n8n. Un workflow che cerca prima e
inserisce dopo perde la corsa contro sé stesso appena due form partono insieme;
e la stessa logica andrebbe ricopiata in ogni workflow che tocca una persona.

Il trigger funziona **per convenzione**: una tabella che raccoglie persone deve
avere le colonne `email`, `nome`, `cognome`, `cellulare`, `sede`, `source`,
`inviato_il`, `marketing`, `utente_id`. Chi rispetta i nomi ha l'aggancio
gratis, chi non li rispetta se ne accorge subito.

Regola di scrittura dei form: **`coalesce(vecchio, nuovo)`** — riempiono i
buchi, non sovrascrivono mai. Chi compila di fretta scrive "rossi" nel campo
nome; se quel valore vincesse su un cognome già noto, ogni contatto successivo
peggiorerebbe l'anagrafica invece di migliorarla. Il gestionale, in fase 4, avrà
la regola opposta, perché lì il dato è verificato.

Il trigger **non solleva mai**: se la deduplica va storta la richiesta entra
comunque con `utente_id` nullo. Un errore nell'anagrafica non deve trasformarsi
in un lead perso, che è l'unica cosa davvero irrecuperabile.

### RLS: attiva, e zero policy

Ogni tabella ha `enable row level security` e **nessuna policy**. È il modo di
dire "passa solo la service key": la chiave anon non legge e non scrive niente.
`supabase/test/rls.test.sql` lo verifica sul campo, dando ad `anon` i permessi
di tabella e controllando che veda comunque zero righe.

**Una policy `anon` su queste tabelle è un elenco di lead pubblicato.** Se un
giorno serve leggerle da un pannello, la strada è una funzione
`security definer` che restituisce solo il necessario, o un'API con la service
key dietro autenticazione — non una policy aperta.

Le viste sono tutte `security_invoker = true`. Senza, girerebbero con i permessi
di chi le ha create e scavalcherebbero la RLS delle tabelle sotto: una porta di
servizio che rende pubblico proprio ciò che le policy assenti proteggono, e non
lo direbbe nessun errore.

---

## 4. Cosa deve fare il workflow n8n

Il webhook `PUBLIC_WEBHOOK_LEAD` oggi scrive su Airtable. Diventa così:

1. **Supabase — insert su `richieste`.** Campi dal payload, uno a uno (i nomi
   sono gli stessi, `snake_case` invece di `camelCase`). Il trigger aggancia la
   persona da solo: non serve cercarla, non serve crearla.
2. **Airtable — create record**, con la mappatura di `docs/FORM.md`. Lasciare
   **disattivata** la creazione automatica delle opzioni di select.
3. **Supabase — update** della stessa riga: `esito = 'inoltrata'`,
   `airtable_id = <id del record>`. Se il passo 2 fallisce,
   `esito = 'scartata'` e `motivo_scarto` con l'errore.

Il passo 3 è quello che rende la coda utile: `select * from
richieste_da_inoltrare` sta a zero righe quando tutto funziona, ed è per questo
che vale la pena guardarla.

**Non mettere la service key in un nodo HTTP generico** se puoi usare il nodo
Supabase con la credenziale salvata: una chiave incollata dentro un header
finisce nell'export del workflow.

---

## 5. Le fasi successive

| Fase | Cosa | Nota |
|---|---|---|
| **1 — fatta** | `utenti`, `richieste`, deduplica, RLS | il workflow lead va aggiornato |
| **2** | `visite_pagina`, `eventi_interazione`, viste analitiche | serve un `sid` nel tracciamento: oggi il sito manda solo il `vid`, e senza id di sessione non si ricostruisce il percorso di chi non dà il consenso |
| **3** | `prenotazioni` — le conferme Cal.com | il `vid` viaggia già nei metadata dell'embed: è la chiave con cui una prenotazione ritrova il suo lead |
| **4** | sync PerfectGym | la parte più grossa; vedi sotto |
| **5** | help desk, referral | solo se servono davvero |

### Sulla fase 4, prima di iniziare

Athlon ci è passata e ha lasciato scritto cosa costa (`docs/pgm-sync-contratto.md`
nel loro repo). Tre cose da sapere prima, non dopo:

- PerfectGym manda **quattro webhook in 240 ms** per una modifica sola. Serve
  una guardia sul contatore di versione, altrimenti si riscrive quattro volte.
- Usare l'email come chiave di join contro il gestionale è pericoloso: da loro
  ha unito **761 persone sbagliate**, perché i figli si iscrivono con l'email
  del genitore. La chiave forte è l'id del membro.
- Il mapping fra i nomi di PerfectGym e i nostri non deve vivere dentro un Code
  node di n8n, o diventa l'unica copia di una cosa importante. Va in una
  funzione qui, versionata.

---

## 6. Una cosa da non copiare

Athlon ha un endpoint pubblico che, data un'email, restituisce nome, cognome,
telefono e stato dell'abbonamento. Senza autenticazione. Con una lista di
email si estrae l'anagrafica dei soci; e la variante che accetta il numero
socio, che è sequenziale, permette di farlo senza conoscere nemmeno un
indirizzo.

**Il nostro `PUBLIC_WEBHOOK_CHECK` fa la stessa cosa** — vedi la sezione 2 di
`docs/FORM.md`, dove i campi opzionali della risposta comprendono `nome`,
`cognome` e `cellulare` per precompilare il passo successivo.

Va chiuso prima che i form vadano online sul dominio vero. Tre difese, in
ordine di efficacia:

1. **Non restituire dati personali.** Per decidere se mostrare il pass prova
   basta `stato`. La precompilazione fa risparmiare all'utente due campi; non
   vale un elenco di soci estraibile da chiunque.
2. Limite di richieste per IP sul workflow.
3. Un token condiviso fra sito e workflow — che sta nel bundle e quindi chiunque
   può leggerlo: alza l'asticella, non è una difesa.
