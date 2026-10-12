-- Applicata a mano su lume-perfectgym (rnhzuecojiewmrskgufe) il 12/10/2026.
-- Il sito scrive dalle route server /api/{verifica,lead,evento} con la chiave publishable:
-- anon non tocca le tabelle, può solo eseguire queste tre funzioni (security definer).
-- Riusa crm_leads (letta dal CRM di Maurizio, trigger crm_leads_match aggancia il socio per email).
-- Mapping sede -> club_id: MACERATA 1, MONTECASSIANO 2, URBAN 3 (Lume - Centro). Verificare Urban.

create table if not exists public.crm_site_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  lead_id bigint references public.crm_leads (id) on delete set null,
  email text,
  vid text,
  evento text not null,
  dati jsonb,
  pagina text,
  constraint crm_site_events_len check (
    char_length(evento) <= 60 and char_length(coalesce(vid,'')) <= 64
    and char_length(coalesce(pagina,'')) <= 300 and char_length(coalesce(email,'')) <= 254)
);
create index if not exists crm_site_events_email_idx on public.crm_site_events (lower(email), created_at desc);
create index if not exists crm_site_events_lead_idx on public.crm_site_events (lead_id, created_at desc);
alter table public.crm_site_events enable row level security;
drop policy if exists crm_site_events_select on public.crm_site_events;
create policy crm_site_events_select on public.crm_site_events for select to authenticated
  using ((select public.crm_is_operator()));

-- Restituisce SOLO la parola: iscritto = contratto attivo non scaduto, esiste = in PerfectGym ma senza.
create or replace function public.site_verifica_email(p_email text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_email text := lower(nullif(btrim(p_email), '')); v_id bigint; v_attivo boolean;
begin
  if v_email is null or char_length(v_email) > 254 then return 'nuovo'; end if;
  select m.id into v_id from public.pg_members m
   where lower(m.email) = v_email and not m.is_deleted limit 1;
  if v_id is null then return 'nuovo'; end if;
  select exists (select 1 from public.pg_contracts c
                  where c.member_id = v_id and c.is_active and not c.is_deleted
                    and (c.end_date is null or c.end_date > now())) into v_attivo;
  return case when v_attivo then 'iscritto' else 'esiste' end;
end $$;

create or replace function public.site_registra_lead(p jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_id bigint; v_email text := lower(nullif(btrim(p->>'email'), ''));
begin
  if v_email is null or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or char_length(v_email) > 254 then
    raise exception 'email non valida';
  end if;
  insert into public.crm_leads (first_name, last_name, email, phone, club_id, source, form_type, message, utm, raw)
  values (
    left(p->>'nome', 100), left(p->>'cognome', 100), v_email, left(p->>'cellulare', 40),
    case upper(coalesce(p->>'sede', '')) when 'MACERATA' then 1 when 'MONTECASSIANO' then 2 when 'URBAN' then 3 end,
    case when nullif(p->'utm'->>'ref', '') is not null then 'referral' else 'form_sito' end,
    left(p->>'flusso', 40), left(p->>'messaggio', 2000),
    case when jsonb_typeof(p->'utm') = 'object' then p->'utm' end,
    p - 'utm' || jsonb_build_object('inviato_server', now())
  ) returning id into v_id;
  return v_id;
end $$;

create or replace function public.site_registra_evento(p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(nullif(btrim(p->>'email'), '')); v_lead bigint;
begin
  if nullif(p->>'evento', '') is null then return; end if;
  if v_email is not null then
    select id into v_lead from public.crm_leads where email = v_email order by created_at desc limit 1;
  end if;
  insert into public.crm_site_events (lead_id, email, vid, evento, dati, pagina)
  values (v_lead, v_email, left(p->>'vid', 64), left(p->>'evento', 60),
          case when jsonb_typeof(p->'dati') = 'object' then p->'dati' end, left(p->>'pagina', 300));
end $$;

revoke all on function public.site_verifica_email(text), public.site_registra_lead(jsonb), public.site_registra_evento(jsonb) from public;
grant execute on function public.site_verifica_email(text), public.site_registra_lead(jsonb), public.site_registra_evento(jsonb) to anon, authenticated;
