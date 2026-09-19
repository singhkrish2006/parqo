-- Parqo database schema
-- Run this once in Supabase: Project -> SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: every statement is idempotent (if-not-exists / drop-if-exists).

create extension if not exists "pgcrypto";

create table if not exists spots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lat double precision not null,
  lng double precision not null,
  ownership text not null check (ownership in ('public', 'private')),
  type text not null,
  price_per_hour integer not null default 0,
  price_note text not null default '',
  charging boolean not null default false,
  connector_type text,
  charging_speed_kw double precision,
  -- {"days": [1,2,3,4,5], "start": "09:00", "end": "18:00"} or null = always
  -- available. Only meaningful for private (owner-rented) spots.
  availability jsonb,
  verified boolean not null default false,
  status text not null default 'unknown' check (status in ('open', 'limited', 'full', 'unknown')),
  status_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Adds these columns if you already ran an earlier version of this script.
alter table spots add column if not exists connector_type text;
alter table spots add column if not exists charging_speed_kw double precision;
alter table spots add column if not exists availability jsonb;

-- Every status report a driver submits. Kept as its own table (rather than
-- just overwriting a field on spots) so we have a real history to build
-- reporter trust/reputation scoring on later.
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references spots(id) on delete cascade,
  status text not null check (status in ('open', 'limited', 'full', 'unknown')),
  -- A per-browser pseudonymous id (not an account) — lets us count how many
  -- distinct devices agree on a status without needing real user auth.
  reporter_device_id text,
  -- Where the reporter was when they submitted. The rules below only accept
  -- reports from drivers within 1 km of the spot.
  reporter_lat double precision,
  reporter_lng double precision,
  created_at timestamptz not null default now()
);

alter table reports add column if not exists reporter_device_id text;
alter table reports add column if not exists reporter_lat double precision;
alter table reports add column if not exists reporter_lng double precision;

create index if not exists reports_spot_id_idx on reports (spot_id);
create index if not exists reports_spot_status_created_idx on reports (spot_id, status, created_at);

-- Great-circle distance in km between two lat/lng points.
create or replace function haversine_km(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision language sql immutable as $$
  select 6371 * 2 * asin(least(1, sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  )));
$$;

-- Anti-abuse rules for reports. Runs before every insert and rejects with a
-- "parqo:<reason>" message that the app turns into a friendly explanation.
--   * a device id and the reporter's location are required
--   * the reporter must be within 1 km of the spot
--   * one report per device per spot every 2 minutes
--   * at most 20 reports per device per hour
-- The server also stamps created_at so clients can't back- or post-date.
-- security definer so the counting queries are not filtered by row security.
create or replace function enforce_report_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  spot_lat double precision;
  spot_lng double precision;
begin
  if new.reporter_device_id is null or char_length(new.reporter_device_id) < 8 then
    raise exception 'parqo:device_required';
  end if;
  if new.status = 'unknown' then
    raise exception 'parqo:invalid_status';
  end if;
  if new.reporter_lat is null or new.reporter_lng is null then
    raise exception 'parqo:location_required';
  end if;

  select lat, lng into spot_lat, spot_lng from spots where id = new.spot_id;
  if not found then
    raise exception 'parqo:spot_not_found';
  end if;

  if haversine_km(new.reporter_lat, new.reporter_lng, spot_lat, spot_lng) > 1.0 then
    raise exception 'parqo:too_far';
  end if;

  if exists (
    select 1 from reports
    where reporter_device_id = new.reporter_device_id
      and spot_id = new.spot_id
      and created_at > now() - interval '2 minutes'
  ) then
    raise exception 'parqo:rate_limited_spot';
  end if;

  if (
    select count(*) from reports
    where reporter_device_id = new.reporter_device_id
      and created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'parqo:rate_limited_device';
  end if;

  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists reports_enforce_rules on reports;
create trigger reports_enforce_rules
  before insert on reports
  for each row execute function enforce_report_rules();

-- Keep spots.status in sync with the latest report automatically.
-- security definer: clients have no UPDATE policy on spots, so this trigger
-- must run with the table owner's rights or the status would never change.
create or replace function apply_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update spots
  set status = new.status, status_updated_at = new.created_at
  where id = new.spot_id;
  return new;
end;
$$;

drop trigger if exists reports_apply_report on reports;
create trigger reports_apply_report
  after insert on reports
  for each row execute function apply_report();

-- Spots suggested by users. They land here as "pending" and only reach the
-- map when a maintainer approves them (see approve_suggestion below).
create table if not exists spot_suggestions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 120),
  -- Delhi-NCR service area.
  lat double precision not null check (lat between 28.2 and 29.0),
  lng double precision not null check (lng between 76.7 and 77.7),
  ownership text not null check (ownership in ('public', 'private')),
  type text not null check (char_length(type) between 3 and 60),
  price_per_hour integer not null check (price_per_hour between 0 and 500),
  price_note text not null default '' check (char_length(price_note) <= 160),
  charging boolean not null default false,
  connector_type text,
  charging_speed_kw double precision check (charging_speed_kw is null or (charging_speed_kw > 0 and charging_speed_kw <= 350)),
  availability jsonb,
  submitter_device_id text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists spot_suggestions_device_created_idx
  on spot_suggestions (submitter_device_id, created_at);

-- At most 5 suggestions per device per day; always enters as pending.
create or replace function enforce_suggestion_rules() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.submitter_device_id is null or char_length(new.submitter_device_id) < 8 then
    raise exception 'parqo:device_required';
  end if;
  if (
    select count(*) from spot_suggestions
    where submitter_device_id = new.submitter_device_id
      and created_at > now() - interval '1 day'
  ) >= 5 then
    raise exception 'parqo:suggestion_limit';
  end if;
  new.status := 'pending';
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists spot_suggestions_enforce_rules on spot_suggestions;
create trigger spot_suggestions_enforce_rules
  before insert on spot_suggestions
  for each row execute function enforce_suggestion_rules();

-- Maintainer tool: run in the SQL editor to publish a reviewed suggestion.
--   select approve_suggestion('<suggestion id>');
-- New spots start unverified with an unknown status.
create or replace function approve_suggestion(suggestion_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
begin
  insert into spots (
    name, lat, lng, ownership, type, price_per_hour, price_note,
    charging, connector_type, charging_speed_kw, availability, verified, status
  )
  select
    name, lat, lng, ownership, type, price_per_hour, price_note,
    charging, connector_type, charging_speed_kw, availability, false, 'unknown'
  from spot_suggestions
  where id = suggestion_id and status = 'pending'
  returning id into new_id;

  if new_id is null then
    raise exception 'suggestion not found or not pending';
  end if;

  update spot_suggestions set status = 'approved' where id = suggestion_id;
  return new_id;
end;
$$;

revoke all on function approve_suggestion(uuid) from public, anon, authenticated;

-- Row Level Security: anyone can read spots/reports, anyone can add a
-- report (this is a crowdsourced app), but spots can only be edited via
-- the trigger above, not directly by clients.
alter table spots enable row level security;
alter table reports enable row level security;

drop policy if exists "Public read spots" on spots;
create policy "Public read spots" on spots for select using (true);

drop policy if exists "Public read reports" on reports;
create policy "Public read reports" on reports for select using (true);

drop policy if exists "Public insert reports" on reports;
create policy "Public insert reports" on reports for insert with check (true);

-- Suggestions can be submitted by anyone but are never publicly readable,
-- so there is intentionally no select policy: maintainers review them in
-- the Supabase dashboard.
alter table spot_suggestions enable row level security;

drop policy if exists "Public insert suggestions" on spot_suggestions;
create policy "Public insert suggestions" on spot_suggestions for insert with check (true);

-- Let the app receive live updates when anyone reports a status change.
-- (Wrapped so re-running this script doesn't error if it's already added.)
do $$
begin
  alter publication supabase_realtime add table spots;
exception
  when duplicate_object then null;
end $$;

-- Initial catalogue of Delhi listings. Pricing follows published tariff
-- categories (NDMC ₹20/hr up to 5 hrs then ₹100 flat; MCD standard ₹20/hr,
-- ₹100/day cap; MCD premium Karol Bagh site tiered from ₹40; posted mall
-- tariffs). Private listings are owner-set, not government rates.
-- Every listing starts unverified with an unknown status: status comes from
-- driver reports, and "verified" should only be set after a maintainer has
-- checked the location and tariff. Guarded on the spot name so re-running
-- the script won't duplicate rows.
insert into spots (
  name, lat, lng, ownership, type, price_per_hour, price_note,
  charging, connector_type, charging_speed_kw, availability, verified, status
)
select * from (values
  ('Connaught Place — Inner Circle', 28.6315, 77.2167, 'public', 'Multilevel parking', 20, '₹20/hr up to 5 hrs, ₹100 flat beyond (NDMC rate)', true, 'Type 2 (AC)', 7, null::jsonb, false, 'unknown'),
  ('Khan Market', 28.6001, 77.2276, 'public', 'Surface lot', 20, '₹20/hr up to 5 hrs, ₹100 flat beyond (NDMC rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Hauz Khas Village', 28.5535, 77.1892, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Select Citywalk, Saket', 28.5286, 77.2192, 'public', 'Basement parking', 25, '₹100 for the first 4 hrs, ₹20/hr after (mall tariff)', true, 'CCS2 (DC fast)', 30, null::jsonb, false, 'unknown'),
  ('India Gate Lawns', 28.6129, 77.2295, 'public', 'Surface lot', 0, 'Free — DDA-maintained public lawns', false, null, null, null::jsonb, false, 'unknown'),
  ('Karol Bagh Market', 28.6519, 77.1909, 'public', 'On-street parking', 40, '₹40 for hour 1, rising to ₹70 by hour 5, ₹300 max/day (MCD premium site)', false, null, null, null::jsonb, false, 'unknown'),
  ('Nehru Place', 28.5487, 77.2519, 'public', 'Multilevel parking', 30, '≈₹30/hr (MCD multilevel site, commercial district rate)', true, 'Type 2 (AC)', 7, null::jsonb, false, 'unknown'),
  ('Lajpat Nagar Central Market', 28.5677, 77.2431, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Panchsheel Enclave — Resident Driveway', 28.5525, 77.2001, 'private', 'Private driveway', 15, '₹15/hr — set by the owner', false, null, null, '{"days":[1,2,3,4,5],"start":"09:00","end":"18:00"}'::jsonb, false, 'unknown'),
  ('Vasant Vihar — Society Slot', 28.559, 77.1591, 'private', 'Private society parking', 25, '₹25/hr — set by the owner', true, 'Bharat AC-001', 3.3, '{"days":[0,1,2,3,4,5,6],"start":"08:00","end":"22:00"}'::jsonb, false, 'unknown'),
  ('Chandni Chowk', 28.6506, 77.2303, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Red Fort', 28.6559, 77.2415, 'public', 'Surface lot', 20, '₹20/hr (ASI-managed monument parking)', false, null, null, null::jsonb, false, 'unknown'),
  ('Paharganj Main Bazaar', 28.6448, 77.2167, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('ITO', 28.6289, 77.241, 'public', 'Multilevel parking', 30, '≈₹30/hr (MCD multilevel site, commercial district rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Palika Bazaar, Connaught Place', 28.6321, 77.2197, 'public', 'Basement parking', 25, '₹100 for the first 4 hrs, ₹20/hr after (mall tariff)', true, 'Type 2 (AC)', 7, null::jsonb, false, 'unknown'),
  ('Jama Masjid', 28.6507, 77.2334, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Kamla Nagar Market', 28.6813, 77.2077, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Sadar Bazaar', 28.6608, 77.2107, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('GTB Nagar Market', 28.6997, 77.2065, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Model Town Market', 28.7115, 77.1912, 'public', 'Surface lot', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Civil Lines', 28.6775, 77.2213, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Green Park Market', 28.5588, 77.2064, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('GK-1 M Block Market', 28.5622, 77.2416, 'public', 'Surface lot', 30, '≈₹30/hr (MCD multilevel site, commercial district rate)', true, 'Type 2 (AC)', 7, null::jsonb, false, 'unknown'),
  ('GK-2 Market', 28.5495, 77.2493, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Saket District Centre', 28.5232, 77.2168, 'public', 'Multilevel parking', 30, '≈₹30/hr (MCD multilevel site, commercial district rate)', true, 'CCS2 (DC fast)', 30, null::jsonb, false, 'unknown'),
  ('Malviya Nagar Market', 28.5307, 77.2093, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Sarojini Nagar Market', 28.5768, 77.1963, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Defence Colony Market', 28.5735, 77.232, 'public', 'Surface lot', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Vasant Kunj — Ambience Mall', 28.5245, 77.159, 'public', 'Basement parking', 25, '₹100 for the first 4 hrs, ₹20/hr after (mall tariff)', true, 'CCS2 (DC fast)', 30, null::jsonb, false, 'unknown'),
  ('Chattarpur', 28.4989, 77.175, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Qutub Minar', 28.5245, 77.1855, 'public', 'Surface lot', 20, '₹20/hr (ASI-managed monument parking)', false, null, null, null::jsonb, false, 'unknown'),
  ('Laxmi Nagar Market', 28.6345, 77.2767, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Preet Vihar Market', 28.6353, 77.2949, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Mayur Vihar Phase 1 Market', 28.6096, 77.2934, 'public', 'Surface lot', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Anand Vihar ISBT', 28.6469, 77.3152, 'public', 'Multilevel parking', 30, '≈₹30/hr (MCD multilevel site, commercial district rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Yamuna Bank', 28.6169, 77.274, 'public', 'Surface lot', 0, 'Free — DDA-maintained public grounds', false, null, null, null::jsonb, false, 'unknown'),
  ('Rajouri Garden Market', 28.6467, 77.1201, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Janakpuri District Centre', 28.6219, 77.0895, 'public', 'Multilevel parking', 30, '≈₹30/hr (MCD multilevel site, commercial district rate)', true, 'Type 2 (AC)', 7, null::jsonb, false, 'unknown'),
  ('Tilak Nagar Market', 28.6414, 77.0917, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Punjabi Bagh Market', 28.6692, 77.1315, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Paschim Vihar Market', 28.6692, 77.101, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Dwarka Sector 21', 28.5522, 77.0589, 'public', 'Surface lot', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Dwarka Sector 10 Market', 28.5921, 77.0498, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Pitampura — Netaji Subhash Place', 28.6984, 77.15, 'public', 'Multilevel parking', 30, '≈₹30/hr (MCD multilevel site, commercial district rate)', true, 'Type 2 (AC)', 7, null::jsonb, false, 'unknown'),
  ('Rohini Sector 7 Market', 28.7136, 77.1188, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Shalimar Bagh Market', 28.7145, 77.1642, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Ashok Vihar Market', 28.695, 77.181, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Yamuna Vihar Market', 28.6935, 77.2711, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Shahdara Market', 28.6692, 77.2897, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Dilli Haat, INA', 28.5732, 77.2069, 'public', 'Surface lot', 30, '≈₹30/hr (MCD multilevel site, commercial district rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('AIIMS Area', 28.5672, 77.21, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Chanakyapuri', 28.5933, 77.1885, 'public', 'Surface lot', 0, 'Free — DDA-maintained public grounds', false, null, null, null::jsonb, false, 'unknown'),
  ('R K Puram Sector 5 Market', 28.565, 77.177, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Vikaspuri District Centre', 28.6377, 77.0688, 'public', 'Multilevel parking', 30, '≈₹30/hr (MCD multilevel site, commercial district rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Uttam Nagar Market', 28.6193, 77.0587, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('GK-2 — Resident Driveway', 28.5502, 77.2465, 'private', 'Private driveway', 15, '₹15/hr — set by the owner', false, null, null, '{"days":[1,2,3,4,5],"start":"09:00","end":"18:00"}'::jsonb, false, 'unknown'),
  ('Vasant Kunj — Society Slot', 28.527, 77.158, 'private', 'Private society parking', 20, '₹20/hr — set by the owner', false, null, null, '{"days":[0,1,2,3,4,5,6],"start":"08:00","end":"22:00"}'::jsonb, false, 'unknown'),
  ('Rajouri Garden — Resident Driveway', 28.648, 77.1225, 'private', 'Private driveway', 15, '₹15/hr — set by the owner', false, null, null, '{"days":[1,2,3,4,5],"start":"09:00","end":"18:00"}'::jsonb, false, 'unknown'),
  ('Dwarka Sector 10 — Society Slot', 28.591, 77.051, 'private', 'Private society parking', 20, '₹20/hr — set by the owner', true, 'Bharat AC-001', 3.3, '{"days":[0,1,2,3,4,5,6],"start":"08:00","end":"22:00"}'::jsonb, false, 'unknown'),
  ('Rohini Sector 7 — Resident Driveway', 28.714, 77.12, 'private', 'Private driveway', 15, '₹15/hr — set by the owner', false, null, null, '{"days":[1,2,3,4,5],"start":"09:00","end":"18:00"}'::jsonb, false, 'unknown'),
  ('Safdarjung Enclave — Society Slot', 28.565, 77.195, 'private', 'Private society parking', 25, '₹25/hr — set by the owner', true, 'Bharat AC-001', 3.3, '{"days":[0,1,2,3,4,5,6],"start":"08:00","end":"22:00"}'::jsonb, false, 'unknown'),
  ('Punjabi Bagh — Resident Driveway', 28.67, 77.133, 'private', 'Private driveway', 15, '₹15/hr — set by the owner', false, null, null, '{"days":[1,2,3,4,5],"start":"09:00","end":"18:00"}'::jsonb, false, 'unknown'),
  ('Shalimar Bagh — Society Slot', 28.715, 77.165, 'private', 'Private society parking', 25, '₹25/hr — set by the owner', true, 'Type 2 (AC)', 7, '{"days":[0,1,2,3,4,5,6],"start":"08:00","end":"22:00"}'::jsonb, false, 'unknown')
) as seed(name, lat, lng, ownership, type, price_per_hour, price_note, charging, connector_type, charging_speed_kw, availability, verified, status)
where not exists (select 1 from spots where spots.name = seed.name);
