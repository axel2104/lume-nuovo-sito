-- ============================================================================
-- Fase 1 — anagrafica unica e richieste dai form
--
-- Cosa risolve. Oggi ogni lead è una riga su Airtable e basta: due richieste
-- della stessa persona a due mesi di distanza sono due righe che nessuno
-- collega, e la domanda "questo tizio ci aveva già scritto?" non ha risposta
-- se non guardando a occhio. Qui la persona diventa un'entità con un id, e
-- ogni form le si aggancia da solo.
--
-- Airtable non sparisce: resta il posto dove i consulenti lavorano i lead.
-- Cambia chi è la fonte di verità. Il workflow n8n scrive **prima** qui e poi
-- su Airtable, perché il nodo Airtable può fallire in silenzio e un lead perso
-- è perso: la riga in questa tabella è la ricevuta che dimostra che è arrivato.
--
-- ─── Sicurezza: RLS attiva e nessuna policy ─────────────────────────────────
-- Ogni tabella qui contiene dati personali. RLS attiva con zero policy è il
-- modo di dire "passa solo la service key": la chiave anon di Supabase, quella
-- che finirebbe nel browser, non legge e non scrive niente. Ci scrivono le
-- automazioni n8n, mai il sito.
--
-- Una policy `anon` su una di queste tabelle sarebbe un elenco di lead
-- pubblicato. Se un giorno serve leggerle da un pannello, la strada è una
-- funzione `security definer` che restituisce solo quello che serve, oppure
-- un'API con la service key dietro autenticazione — non una policy aperta.
--
-- ─── Come si applica ────────────────────────────────────────────────────────
-- Non c'è `db push` automatico: si incolla nella SQL Editor di Supabase. Il
-- file è scritto per essere rieseguibile senza danni (`if not exists`,
-- `create or replace`), così riapplicarlo dopo una modifica non costringe a
-- ricostruire da zero.
-- ============================================================================

-- ─── utenti ─────────────────────────────────────────────────────────────────
-- Una riga per persona. Non è l'anagrafica di PerfectGym: è l'anagrafica di
-- chi ci ha parlato, che comprende chi non si è mai iscritto e che di quelli
-- iscritti conosce solo ciò che ha lasciato sul sito, finché la fase 4 non
-- collega il gestionale.
create table if not exists public.utenti (
  id uuid primary key default gen_random_uuid(),
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),

  -- I campi `_norm` sono generated e non riempiti a mano: una normalizzazione
  -- che dipende da chi scrive è una normalizzazione che prima o poi qualcuno
  -- dimentica, e la chiave di deduplica smette di funzionare in silenzio.
  email text,
  email_norm text generated always as (nullif(lower(btrim(email)), '')) stored,

  cellulare text,
  cellulare_norm text generated always as (
    nullif(regexp_replace(coalesce(cellulare, ''), '\D', '', 'g'), '')
  ) stored,

  nome text,
  cognome text,

  -- Sede di riferimento: l'ultima da cui ha scritto. Non è un vincolo, è un
  -- indizio per chi lo richiama.
  sede text,

  -- PerfectGym. Vuoti finché non esiste la fase 4; già qui perché aggiungere
  -- una colonna a una tabella viva è più fastidioso che averla vuota.
  pgm_member_id bigint,
  pgm_numero_utente text,
  pgm_stato text,
  pgm_sincronizzato_il timestamptz,

  -- Storia del contatto. `tocchi` conta gli invii, non le persone: serve a
  -- distinguere chi ha scritto una volta da chi insiste.
  primo_contatto timestamptz,
  ultimo_contatto timestamptz,
  prima_fonte text,
  ultima_fonte text,
  tocchi integer not null default 0,

  -- Ultimo consenso marketing espresso. Il consenso vive anche sulla singola
  -- richiesta, che è la prova di quando è stato dato: questo è solo lo stato
  -- corrente, comodo per le liste.
  marketing boolean,

  note text,

  constraint utenti_pgm_stato_check
    check (pgm_stato is null or pgm_stato in ('lead', 'guest', 'member', 'ex-member'))
);

-- Chiavi di deduplica, tutte parziali: due righe senza email non sono
-- duplicati, sono due sconosciuti.
create unique index if not exists utenti_email_norm_key
  on public.utenti (email_norm) where email_norm is not null;
create unique index if not exists utenti_pgm_member_id_key
  on public.utenti (pgm_member_id) where pgm_member_id is not null;
create unique index if not exists utenti_pgm_numero_utente_key
  on public.utenti (pgm_numero_utente) where pgm_numero_utente is not null;

-- Il telefono NON è una chiave di deduplica, ed è una scelta, non una
-- dimenticanza: i corsi junior (Scuola Nuoto Bambini, Acqua Nido, Acqua Mamma)
-- si iscrivono col numero del genitore. Unire su quello fonderebbe madre e
-- figlio in una persona sola. Resta un indice normale, per cercare.
create index if not exists utenti_cellulare_norm_idx
  on public.utenti (cellulare_norm) where cellulare_norm is not null;
create index if not exists utenti_ultimo_contatto_idx
  on public.utenti (ultimo_contatto desc nulls last);

comment on table public.utenti is
  'Anagrafica di chi ci ha contattato. Deduplica su email o id PerfectGym, mai sul telefono.';

-- ─── richieste ──────────────────────────────────────────────────────────────
-- Una riga per invio di form, di qualunque flusso.
--
-- Una tabella sola e non quattro: i quattro flussi del sito hanno gli stessi
-- campi con valori diversi, e tenerli separati vorrebbe dire scrivere quattro
-- volte lo stesso trigger, quattro viste e quattro join. Su Airtable è già
-- così — RICHIESTE è una tabella sola con `Tipo Richiesta` — quindi questa
-- forma è anche quella che rende la copia verso Airtable un mapping diretto.
create table if not exists public.richieste (
  id uuid primary key default gen_random_uuid(),
  creato_il timestamptz not null default now(),
  utente_id uuid references public.utenti (id) on delete set null,

  -- Identità come l'ha scritta lui. Non si normalizza qui: questa riga è la
  -- prova di cosa è stato inviato, la normalizzazione vive su `utenti`.
  email text,
  nome text,
  cognome text,
  cellulare text,
  prefisso text,

  flusso text not null,
  tipo_richiesta text not null,
  -- Come vuole essere contattato: richiamata, visita, messaggio. Vuoto sui
  -- flussi che non lo chiedono.
  modalita text,
  -- Agenda Cal.com usata, quando il flusso porta a una prenotazione.
  agenda text,

  sede text,
  centro text,
  attivita text[] not null default '{}',
  abbonamento text,
  messaggio text,

  privacy boolean not null default false,
  marketing boolean not null default false,

  -- Risposta del webhook di verifica al momento dell'invio. Si conserva com'era
  -- allora: se domani la persona si iscrive, resta scritto che quando ha
  -- chiesto la prova risultava nuova.
  verifica text,
  gruppo text,
  nuovo text,

  -- Attribuzione.
  source text,
  medium text,
  cta text,
  cta_medium text,
  pagina text,
  utm jsonb not null default '{}'::jsonb,
  -- `vid` è text e non uuid di proposito: arriva da un webhook pubblico, e un
  -- valore malformato deve sporcare una colonna, non far fallire l'inserimento
  -- e perdere il lead.
  vid text,
  inviato_il timestamptz,
  sospetto boolean not null default false,

  -- Esito dell'inoltro verso gli altri sistemi. Gli scarti si registrano come
  -- i successi: una tabella che contiene solo ciò che è andato bene non dice
  -- mai perché manca qualcosa.
  airtable_id text,
  esito text not null default 'ricevuta',
  motivo_scarto text,

  constraint richieste_flusso_check
    check (flusso in ('info', 'prova', 'iscrizione', 'newsletter')),
  constraint richieste_sede_check
    check (sede is null or sede in ('MACERATA', 'MONTECASSIANO')),
  constraint richieste_esito_check
    check (esito in ('ricevuta', 'inoltrata', 'scartata'))
);

create index if not exists richieste_creato_il_idx on public.richieste (creato_il desc);
create index if not exists richieste_utente_idx on public.richieste (utente_id, creato_il desc);
create index if not exists richieste_vid_idx on public.richieste (vid) where vid is not null;
create index if not exists richieste_flusso_idx on public.richieste (flusso, creato_il desc);
-- Le richieste non ancora inoltrate sono la coda da guardare quando qualcosa
-- si rompe: l'indice parziale la tiene piccola anche con un milione di righe.
create index if not exists richieste_da_inoltrare_idx
  on public.richieste (creato_il) where esito <> 'inoltrata';

comment on table public.richieste is
  'Un invio di form. La riga si scrive prima di Airtable: è la ricevuta che il lead è arrivato.';

-- ─── trova_o_crea_utente ────────────────────────────────────────────────────
-- La deduplica sta qui, in Postgres, e non dentro n8n. Un workflow che cerca
-- prima e inserisce dopo perde la corsa contro sé stesso appena due form
-- partono insieme; e la stessa logica andrebbe ricopiata in ogni workflow che
-- tocca una persona.
--
-- Ordine di ricerca, dal più forte al più debole:
--   1. pgm_member_id — l'id del gestionale, non ambiguo
--   2. email_norm    — quello che abbiamo quasi sempre
-- Il telefono non compare, per il motivo scritto sopra.
--
-- Regola di scrittura: `coalesce(vecchio, nuovo)`. **I dati dei form riempiono
-- i buchi e non sovrascrivono mai.** Chi compila di fretta scrive "mario" nel
-- campo cognome; se quel valore vincesse su un cognome già noto, ogni form
-- successivo peggiorerebbe l'anagrafica invece di migliorarla. Il gestionale
-- avrà la regola opposta, perché lì il dato è verificato.
create or replace function public.trova_o_crea_utente(
  p_email text,
  p_nome text default null,
  p_cognome text default null,
  p_cellulare text default null,
  p_sede text default null,
  p_fonte text default null,
  p_quando timestamptz default now(),
  p_pgm_member_id bigint default null,
  p_marketing boolean default null
) returns uuid
language plpgsql
as $$
declare
  v_email_norm text := nullif(lower(btrim(p_email)), '');
  v_id uuid;
begin
  if v_email_norm is null and p_pgm_member_id is null then
    -- Senza una chiave non si crea nulla: una riga senza email né id sarebbe
    -- un duplicato garantito al contatto successivo.
    return null;
  end if;

  if p_pgm_member_id is not null then
    select id into v_id from public.utenti where pgm_member_id = p_pgm_member_id;
  end if;

  if v_id is null and v_email_norm is not null then
    select id into v_id from public.utenti where email_norm = v_email_norm;
  end if;

  if v_id is null then
    begin
      insert into public.utenti (email, nome, cognome, cellulare, sede, pgm_member_id,
                                 primo_contatto, ultimo_contatto, prima_fonte, ultima_fonte,
                                 tocchi, marketing)
      values (p_email, p_nome, p_cognome, p_cellulare, p_sede, p_pgm_member_id,
              p_quando, p_quando, p_fonte, p_fonte, 1, p_marketing)
      returning id into v_id;
      return v_id;
    exception when unique_violation then
      -- Due form partiti nello stesso istante: uno dei due ha vinto la corsa.
      -- Si rilegge la riga sua invece di sollevare.
      select id into v_id from public.utenti
       where (v_email_norm is not null and email_norm = v_email_norm)
          or (p_pgm_member_id is not null and pgm_member_id = p_pgm_member_id);
    end;
  end if;

  update public.utenti u set
    -- L'email non si sostituisce mai: è la chiave con cui l'abbiamo trovato.
    nome = coalesce(u.nome, p_nome),
    cognome = coalesce(u.cognome, p_cognome),
    cellulare = coalesce(u.cellulare, p_cellulare),
    -- La sede invece è l'ultima da cui ha scritto: se cambia centro, vogliamo
    -- saperlo. Non è un dato anagrafico, è un indizio operativo.
    sede = coalesce(p_sede, u.sede),
    pgm_member_id = coalesce(u.pgm_member_id, p_pgm_member_id),
    -- `least`/`greatest` invece di assegnare: rende il ripopolamento
    -- idempotente. Reimportare i lead vecchi non deve spostare in avanti il
    -- primo contatto di nessuno.
    primo_contatto = least(coalesce(u.primo_contatto, p_quando), p_quando),
    ultimo_contatto = greatest(coalesce(u.ultimo_contatto, p_quando), p_quando),
    prima_fonte = coalesce(u.prima_fonte, p_fonte),
    ultima_fonte = coalesce(p_fonte, u.ultima_fonte),
    marketing = coalesce(p_marketing, u.marketing),
    tocchi = u.tocchi + 1,
    aggiornato_il = now()
  where u.id = v_id;

  return v_id;
end;
$$;

comment on function public.trova_o_crea_utente is
  'Trova la persona per id PerfectGym o email, altrimenti la crea. I form riempiono i buchi, non sovrascrivono.';

-- ─── aggancia_utente ────────────────────────────────────────────────────────
-- Trigger da mettere su ogni tabella che raccoglie una persona.
--
-- Funziona per convenzione e non per configurazione: la tabella deve avere le
-- colonne `email`, `nome`, `cognome`, `cellulare`, `sede`, `source`,
-- `inviato_il`, `marketing` e `utente_id`. Chiedere di dichiararle a ogni
-- trigger renderebbe possibile dichiararle sbagliate; così una tabella nuova o
-- rispetta i nomi di casa o non ha l'aggancio, e ce se ne accorge subito.
--
-- Non solleva mai. Se la deduplica va storta, la riga entra comunque con
-- `utente_id` nullo e il problema finisce nei log del database: un errore
-- nell'anagrafica non deve trasformarsi in un lead perso, che è l'unica cosa
-- davvero irrecuperabile.
create or replace function public.aggancia_utente()
returns trigger
language plpgsql
as $$
declare
  v_riga jsonb := to_jsonb(new);
  v_id uuid;
begin
  begin
    v_id := public.trova_o_crea_utente(
      p_email      => v_riga->>'email',
      p_nome       => v_riga->>'nome',
      p_cognome    => v_riga->>'cognome',
      p_cellulare  => v_riga->>'cellulare',
      p_sede       => v_riga->>'sede',
      p_fonte      => v_riga->>'source',
      p_quando     => coalesce((v_riga->>'inviato_il')::timestamptz, now()),
      p_marketing  => (v_riga->>'marketing')::boolean
    );
  exception when others then
    raise warning 'aggancia_utente: % (%), riga non agganciata', sqlerrm, sqlstate;
    v_id := null;
  end;

  new.utente_id := v_id;
  return new;
end;
$$;

-- `of email, nome, ...` e non su tutta la riga: l'aggiornamento dell'esito
-- dell'inoltro non deve rifare la deduplica e incrementare `tocchi`.
drop trigger if exists richieste_aggancia_utente on public.richieste;
create trigger richieste_aggancia_utente
  before insert or update of email, nome, cognome, cellulare, sede
  on public.richieste
  for each row execute function public.aggancia_utente();

-- ─── Viste ──────────────────────────────────────────────────────────────────
-- `security_invoker = true` su tutte: senza, una vista girerebbe con i
-- permessi di chi l'ha creata e scavalcherebbe la RLS delle tabelle sotto —
-- cioè renderebbe pubblico proprio ciò che le policy assenti proteggono.

-- Chi sono, con il riassunto di cosa hanno chiesto.
create or replace view public.utenti_completi
with (security_invoker = true) as
select
  u.*,
  coalesce(r.richieste, 0) as richieste,
  r.ultima_richiesta,
  r.flussi,
  r.attivita_chieste
from public.utenti u
left join lateral (
  select
    count(*) as richieste,
    max(x.creato_il) as ultima_richiesta,
    array_agg(distinct x.flusso) as flussi,
    -- Tutte le attività nominate in tutte le sue richieste, senza doppioni:
    -- è la domanda "cosa gli interessa?", che nessuna singola riga risponde.
    (select array_agg(distinct a) from public.richieste y, unnest(y.attivita) a
      where y.utente_id = u.id) as attivita_chieste
  from public.richieste x
  where x.utente_id = u.id
) r on true;

-- La coda di chi non è ancora arrivato su Airtable. Sta a zero righe quando
-- tutto funziona: è quello che la rende utile da guardare.
create or replace view public.richieste_da_inoltrare
with (security_invoker = true) as
select id, creato_il, flusso, tipo_richiesta, email, sede, esito, motivo_scarto
from public.richieste
where esito <> 'inoltrata'
order by creato_il;

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.utenti enable row level security;
alter table public.richieste enable row level security;
