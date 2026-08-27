-- ============================================================================
-- Test dell'anagrafica e della deduplica.
--
-- Si esegue su un database vuoto dopo aver applicato le migrazioni:
--
--   createdb lume_test
--   psql -d lume_test -f supabase/migrations/20260827_anagrafica_e_richieste.sql
--   psql -d lume_test -v ON_ERROR_STOP=1 -f supabase/test/anagrafica.test.sql
--
-- Non serve un framework: `assert` di plpgsql ferma tutto alla prima
-- differenza, e `ON_ERROR_STOP` fa uscire psql con codice diverso da zero.
--
-- Perché esistono. Le migrazioni si applicano incollandole nella SQL Editor,
-- una volta sola, in produzione. Non c'è una pipeline che le provi e non c'è
-- un ambiente di prova: senza questi test, il primo collaudo della deduplica
-- sarebbe su lead veri, e un errore si scoprirebbe da un'anagrafica sbagliata
-- settimane dopo.
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

do $$
declare
  v_utente uuid;
  v_altro uuid;
  v_riga public.utenti%rowtype;
  v_n integer;
  v_txt text;
begin

-- ─── 1. Il payload vero del form crea la persona ────────────────────────────
-- Campi e valori sono quelli documentati in docs/FORM.md: se il contratto
-- cambia, questo test è il primo posto in cui si vede.
insert into public.richieste (
  email, nome, cognome, cellulare, prefisso,
  flusso, tipo_richiesta, modalita, agenda,
  sede, centro, attivita, abbonamento, messaggio,
  privacy, marketing, verifica, gruppo, nuovo,
  source, medium, cta, cta_medium, pagina, utm, vid, inviato_il, sospetto
) values (
  'Mario@Esempio.it ', 'Mario', 'Rossi', '+39 333 1234567', '+39',
  'prova', 'RICHIESTA PROVA', 'visita', 'visita',
  'MACERATA', 'macerata', array['Sala Pesi', 'Pilates Reformer'], null, 'Non mi alleno da un anno',
  true, false, 'nuovo', '', 'NUOVO',
  'SitoWeb', 'HeaderProva', 'Prova Lume', 'HeaderProva', '/prova',
  '{"utm_source":"GAds","utm_medium":"cpc"}'::jsonb, '9f2c1a44-1111-4222-8333-444455556666',
  '2026-08-17T17:42:11+02:00', false
) returning utente_id into v_utente;

assert v_utente is not null, '1: la richiesta non ha agganciato nessuna persona';

select * into v_riga from public.utenti where id = v_utente;
assert v_riga.email_norm = 'mario@esempio.it',
  format('1: email non normalizzata: %L', v_riga.email_norm);
assert v_riga.cellulare_norm = '393331234567',
  format('1: cellulare non normalizzato: %L', v_riga.cellulare_norm);
assert v_riga.tocchi = 1, format('1: tocchi = %s invece di 1', v_riga.tocchi);
assert v_riga.prima_fonte = 'SitoWeb', '1: prima fonte non registrata';
assert v_riga.primo_contatto = '2026-08-17T17:42:11+02:00'::timestamptz,
  '1: primo contatto diverso da inviato_il';
assert v_riga.marketing = false, '1: consenso marketing non registrato';

-- ─── 2. Stessa persona, email scritta diversamente ──────────────────────────
insert into public.richieste (email, nome, cognome, flusso, tipo_richiesta, sede,
                              source, marketing, inviato_il)
values ('  MARIO@esempio.IT', 'Mario', 'Rossi', 'info', 'INFO ADULTI', 'MONTECASSIANO',
        'Google', true, '2026-09-01T10:00:00+02:00')
returning utente_id into v_altro;

assert v_altro = v_utente,
  '2: maiuscole e spazi hanno creato una seconda persona';

select * into v_riga from public.utenti where id = v_utente;
assert v_riga.tocchi = 2, format('2: tocchi = %s invece di 2', v_riga.tocchi);
assert v_riga.prima_fonte = 'SitoWeb' and v_riga.ultima_fonte = 'Google',
  '2: prima e ultima fonte confuse';
assert v_riga.sede = 'MONTECASSIANO',
  '2: la sede deve seguire l''ultima richiesta';
assert v_riga.primo_contatto = '2026-08-17T17:42:11+02:00'::timestamptz,
  '2: il primo contatto si è spostato in avanti';
assert v_riga.marketing = true, '2: il consenso marketing non si è aggiornato';

-- ─── 3. I form riempiono i buchi, non sovrascrivono ─────────────────────────
-- Chi compila di fretta scrive "rossi" nel campo nome. Se quel valore vincesse
-- su un nome già noto, ogni contatto successivo peggiorerebbe l'anagrafica.
insert into public.richieste (email, nome, cognome, cellulare, flusso, tipo_richiesta,
                              source, inviato_il)
values ('mario@esempio.it', 'mario', 'rossi', '+39 000 0000000', 'info', 'INFO ADULTI',
        'SitoWeb', '2026-09-02T10:00:00+02:00');

select * into v_riga from public.utenti where id = v_utente;
assert v_riga.nome = 'Mario' and v_riga.cognome = 'Rossi',
  format('3: nome sovrascritto: %L %L', v_riga.nome, v_riga.cognome);
assert v_riga.cellulare = '+39 333 1234567',
  format('3: cellulare sovrascritto: %L', v_riga.cellulare);

-- ─── 4. Un campo che prima mancava viene riempito ───────────────────────────
insert into public.richieste (email, flusso, tipo_richiesta, source, inviato_il)
values ('nuova@esempio.it', 'newsletter', 'NEWSLETTER', 'SitoWeb', now())
returning utente_id into v_altro;

select * into v_riga from public.utenti where id = v_altro;
assert v_riga.nome is null, '4: la newsletter non chiede il nome, non deve inventarlo';

insert into public.richieste (email, nome, cognome, flusso, tipo_richiesta, source, inviato_il)
values ('nuova@esempio.it', 'Giulia', 'Bianchi', 'info', 'INFO ADULTI', 'SitoWeb', now());

select * into v_riga from public.utenti where id = v_altro;
assert v_riga.nome = 'Giulia' and v_riga.cognome = 'Bianchi',
  '4: il buco non è stato riempito dalla richiesta successiva';

-- ─── 5. Il telefono NON unisce due persone ──────────────────────────────────
-- Due figli iscritti dal genitore con lo stesso numero: sono due anagrafiche,
-- e unirle sarebbe l'errore più difficile da disfare.
insert into public.richieste (email, nome, cognome, cellulare, flusso, tipo_richiesta,
                              attivita, source, inviato_il)
values ('genitore+luca@esempio.it', 'Luca', 'Verdi', '+39 347 1112223', 'info', 'INFO JUNIOR',
        array['Scuola Nuoto Bambini'], 'SitoWeb', now());
insert into public.richieste (email, nome, cognome, cellulare, flusso, tipo_richiesta,
                              attivita, source, inviato_il)
values ('genitore+sara@esempio.it', 'Sara', 'Verdi', '+39 347 1112223', 'info', 'INFO JUNIOR',
        array['Acqua Nido'], 'SitoWeb', now());

select count(*) into v_n from public.utenti where cellulare_norm = '393471112223';
assert v_n = 2, format('5: due fratelli sono diventati %s persona/e', v_n);

-- ─── 6. Senza email e senza id del gestionale non si crea nulla ─────────────
-- Ma la richiesta deve restare: è pur sempre qualcosa che è arrivato.
insert into public.richieste (nome, cognome, flusso, tipo_richiesta, source, inviato_il)
values ('Anonimo', 'Senza Email', 'info', 'INFO ADULTI', 'SitoWeb', now())
returning utente_id into v_altro;

assert v_altro is null, '6: creata una persona senza nessuna chiave';
select count(*) into v_n from public.richieste where cognome = 'Senza Email';
assert v_n = 1, '6: la richiesta senza email è andata persa';

-- ─── 7. Aggiornare l'esito non è un nuovo contatto ──────────────────────────
select tocchi into v_n from public.utenti where id = v_utente;
update public.richieste set esito = 'inoltrata', airtable_id = 'recABC123'
 where utente_id = v_utente;
select tocchi into v_n from public.utenti where id = v_utente and tocchi = v_n;
assert found, '7: segnare l''inoltro ha incrementato i tocchi';

-- ─── 8. Reimportare dati vecchi non sposta il primo contatto ────────────────
-- Il ripopolamento dev'essere idempotente: se un giorno si caricano i lead del
-- 2024, nessuno deve risultare arrivato nel 2024 *dopo* essere arrivato nel 2026.
insert into public.richieste (email, flusso, tipo_richiesta, source, inviato_il)
values ('mario@esempio.it', 'info', 'INFO ADULTI', 'Import', '2024-01-05T09:00:00+01:00');

select * into v_riga from public.utenti where id = v_utente;
assert v_riga.primo_contatto = '2024-01-05T09:00:00+01:00'::timestamptz,
  format('8: primo contatto = %s, doveva arretrare al 2024', v_riga.primo_contatto);
assert v_riga.ultimo_contatto = '2026-09-02T10:00:00+02:00'::timestamptz,
  format('8: ultimo contatto = %s, non doveva arretrare', v_riga.ultimo_contatto);

-- ─── 9. La vista riassume davvero ───────────────────────────────────────────
select richieste, array_to_string(attivita_chieste, ',') into v_n, v_txt
  from public.utenti_completi where id = v_utente;
assert v_n = 4, format('9: la vista conta %s richieste invece di 4', v_n);
assert v_txt like '%Pilates Reformer%' and v_txt like '%Sala Pesi%',
  format('9: attività non aggregate: %L', v_txt);

-- ─── 10. I vincoli fermano i valori inventati ───────────────────────────────
begin
  insert into public.richieste (email, flusso, tipo_richiesta, source)
  values ('x@y.it', 'sconosciuto', 'BOH', 'SitoWeb');
  raise exception '10: un flusso inesistente è stato accettato';
exception when check_violation then null;
end;

begin
  insert into public.richieste (email, flusso, tipo_richiesta, sede, source)
  values ('x@y.it', 'info', 'INFO ADULTI', 'PIEDIRIPA', 'SitoWeb');
  raise exception '10: una sede che Airtable non conosce è stata accettata';
exception when check_violation then null;
end;

-- ─── 11. La coda di inoltro ─────────────────────────────────────────────────
select count(*) into v_n from public.richieste_da_inoltrare;
assert v_n > 0, '11: la vista della coda non vede le richieste non inoltrate';
select count(*) into v_n from public.richieste_da_inoltrare where esito = 'inoltrata';
assert v_n = 0, '11: la coda mostra anche le richieste già inoltrate';

raise notice 'tutti i test passati';
end;
$$;
