-- ============================================================================
-- Test della Row Level Security.
--
-- È il test più importante di tutti: verifica che la chiave pubblica di
-- Supabase — quella che chiunque può leggere dal browser se un giorno la
-- mettiamo in pagina — non veda e non scriva niente.
--
-- Va eseguito su un database che ha già dei dati dentro (dopo
-- `anagrafica.test.sql`), altrimenti "zero righe lette" sarebbe vero anche a
-- tabelle vuote e il test non proverebbe nulla.
--
--   psql -d lume_test -v ON_ERROR_STOP=1 -f supabase/test/rls.test.sql
--
-- In locale i ruoli `anon` e `authenticated` non esistono e vengono creati qui;
-- su Supabase esistono già e questo blocco non li tocca.
-- ============================================================================

\set ON_ERROR_STOP on

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;

-- Il caso peggiore: qualcuno ha dato i permessi di tabella ai ruoli pubblici.
-- La RLS deve reggere lo stesso — è esattamente la sua ragione di esistere,
-- e i `grant` di default di Supabase sullo schema `public` sono proprio così.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;

do $$
declare
  v_tot integer;
  v_visti integer;
  v_tab text;
begin
  select count(*) into v_tot from public.utenti;
  assert v_tot > 0,
    'il database di prova è vuoto: questo test non proverebbe niente. Esegui prima anagrafica.test.sql';

  -- ─── Nessuna policy su nessuna tabella ────────────────────────────────────
  -- Una policy su queste tabelle sarebbe un elenco di lead pubblicato. Se un
  -- giorno ne serve una, questo test deve fallire e costringere a discuterla.
  select count(*) into v_visti from pg_policies
   where schemaname = 'public' and tablename in ('utenti', 'richieste');
  assert v_visti = 0,
    format('esistono %s policy su utenti/richieste: verifica che siano volute', v_visti);

  -- ─── RLS attiva ovunque ───────────────────────────────────────────────────
  select string_agg(c.relname, ', ') into v_tab
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  assert v_tab is null, format('tabelle senza RLS: %s', v_tab);

  -- ─── Le viste non scavalcano ──────────────────────────────────────────────
  -- Senza `security_invoker` una vista gira con i permessi di chi l'ha creata:
  -- sarebbe una porta di servizio che rende pubblico proprio ciò che la RLS
  -- protegge, e non lo direbbe nessun errore.
  select string_agg(c.relname, ', ') into v_tab
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'v'
     and coalesce(array_to_string(c.reloptions, ','), '') not like '%security_invoker=true%';
  assert v_tab is null, format('viste senza security_invoker: %s', v_tab);
end $$;

-- ─── Prova sul campo: cosa vede davvero anon ────────────────────────────────
set role anon;

do $$
declare
  v_n integer;
begin
  select count(*) into v_n from public.utenti;
  assert v_n = 0, format('anon legge %s righe da utenti', v_n);

  select count(*) into v_n from public.richieste;
  assert v_n = 0, format('anon legge %s righe da richieste', v_n);

  select count(*) into v_n from public.utenti_completi;
  assert v_n = 0, format('anon legge %s righe dalla vista utenti_completi', v_n);

  select count(*) into v_n from public.richieste_da_inoltrare;
  assert v_n = 0, format('anon legge %s righe dalla vista della coda', v_n);

  -- E non deve nemmeno poter avvelenare i dati.
  begin
    insert into public.richieste (email, flusso, tipo_richiesta)
    values ('spam@esempio.it', 'info', 'INFO ADULTI');
    raise exception 'anon è riuscito a inserire una richiesta';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.utenti set note = 'toccato da anon';
    -- Un update senza policy non solleva: semplicemente non vede righe da
    -- aggiornare. Il controllo è che non ne abbia toccata nessuna.
    get diagnostics v_n = row_count;
    assert v_n = 0, format('anon ha aggiornato %s righe di utenti', v_n);
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.richieste;
    get diagnostics v_n = row_count;
    assert v_n = 0, format('anon ha cancellato %s richieste', v_n);
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

-- ─── E la service key invece deve passare ───────────────────────────────────
-- Il controllo speculare: se la RLS bloccasse anche le automazioni, il sistema
-- sarebbe sicuro e inutile. `postgres` e `service_role` hanno BYPASSRLS.
do $$
declare
  v_n integer;
begin
  select count(*) into v_n from public.utenti;
  assert v_n > 0, 'nemmeno il proprietario legge: la RLS sta bloccando le automazioni';
  raise notice 'RLS: anon non vede e non scrive, il proprietario sì — tutti i test passati';
end $$;
