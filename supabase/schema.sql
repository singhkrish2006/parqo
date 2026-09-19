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
  created_at timestamptz not null default now()
);

alter table reports add column if not exists reporter_device_id text;

create index if not exists reports_spot_id_idx on reports (spot_id);
create index if not exists reports_spot_status_created_idx on reports (spot_id, status, created_at);

-- Keep spots.status in sync with the latest report automatically.
create or replace function apply_report() returns trigger as $$
begin
  update spots
  set status = new.status, status_updated_at = new.created_at
  where id = new.spot_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists reports_apply_report on reports;
create trigger reports_apply_report
  after insert on reports
  for each row execute function apply_report();

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

-- Let the app receive live updates when anyone reports a status change.
-- (Wrapped so re-running this script doesn't error if it's already added.)
do $$
begin
  alter publication supabase_realtime add table spots;
exception
  when duplicate_object then null;
end $$;

-- Seed data: the same Delhi spots the app shipped with locally. Pricing
-- follows published Delhi tariffs (NDMC ₹20/hr up to 5 hrs then ₹100 flat;
-- MCD standard ₹20/hr, ₹100/day cap; MCD premium Karol Bagh site tiered
-- from ₹40; Select Citywalk's posted mall tariff). Private listings are
-- owner-set, not government rates. Only run once (guarded on the unique
-- spot name below) so it won't duplicate rows on re-run.
insert into spots (
  name, lat, lng, ownership, type, price_per_hour, price_note,
  charging, connector_type, charging_speed_kw, availability, verified, status
)
select * from (values
  ('Connaught Place — Inner Circle', 28.6315, 77.2167, 'public', 'Multilevel parking', 20, '₹20/hr up to 5 hrs, ₹100 flat beyond (NDMC rate)', true, 'Type 2 (AC)', 7, null::jsonb, true, 'open'),
  ('Khan Market', 28.6001, 77.2276, 'public', 'Surface lot', 20, '₹20/hr up to 5 hrs, ₹100 flat beyond (NDMC rate)', false, null, null, null::jsonb, true, 'limited'),
  ('Hauz Khas Village', 28.5535, 77.1892, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'open'),
  ('Select Citywalk, Saket', 28.5286, 77.2192, 'public', 'Basement parking', 25, '₹100 for the first 4 hrs, ₹20/hr after (mall tariff)', true, 'CCS2 (DC fast)', 30, null::jsonb, true, 'full'),
  ('India Gate Lawns', 28.6129, 77.2295, 'public', 'Surface lot', 0, 'Free — DDA-maintained public lawns', false, null, null, null::jsonb, true, 'open'),
  ('Karol Bagh Market', 28.6519, 77.1909, 'public', 'On-street parking', 40, '₹40 for hour 1, rising to ₹70 by hour 5, ₹300 max/day (MCD premium site)', false, null, null, null::jsonb, false, 'unknown'),
  ('Nehru Place', 28.5487, 77.2519, 'public', 'Multilevel parking', 30, '≈₹30/hr (MCD multilevel site, commercial district rate)', true, 'Type 2 (AC)', 7, null::jsonb, true, 'limited'),
  ('Lajpat Nagar Central Market', 28.5677, 77.2431, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'open'),
  ('Panchsheel Enclave — Resident Driveway', 28.5525, 77.2001, 'private', 'Private driveway', 15, '₹15/hr — set by the owner', false, null, null, '{"days":[1,2,3,4,5],"start":"09:00","end":"18:00"}'::jsonb, true, 'open'),
  ('Vasant Vihar — Society Slot', 28.559, 77.1591, 'private', 'Private society parking', 25, '₹25/hr — set by the owner', true, 'Bharat AC-001', 3.3, '{"days":[0,1,2,3,4,5,6],"start":"08:00","end":"22:00"}'::jsonb, false, 'open'),
  ('Chandni Chowk', 28.6506, 77.2303, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, true, 'open'),
  ('Red Fort', 28.6559, 77.2415, 'public', 'Surface lot', 20, '₹20/hr (ASI-managed monument parking)', false, null, null, null::jsonb, true, 'limited'),
  ('Paharganj Main Bazaar', 28.6448, 77.2167, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'open'),
  ('ITO', 28.6289, 77.241, 'public', 'Multilevel parking', 30, '≈₹30/hr (MCD multilevel site, commercial district rate)', false, null, null, null::jsonb, true, 'limited'),
  ('Palika Bazaar, Connaught Place', 28.6321, 77.2197, 'public', 'Basement parking', 25, '₹100 for the first 4 hrs, ₹20/hr after (mall tariff)', true, 'Type 2 (AC)', 7, null::jsonb, true, 'full'),
  ('Jama Masjid', 28.6507, 77.2334, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Kamla Nagar Market', 28.6813, 77.2077, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'open'),
  ('Sadar Bazaar', 28.6608, 77.2107, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'limited'),
  ('GTB Nagar Market', 28.6997, 77.2065, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'open'),
  ('Model Town Market', 28.7115, 77.1912, 'public', 'Surface lot', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, true, 'open'),
  ('Civil Lines', 28.6775, 77.2213, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Green Park Market', 28.5588, 77.2064, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, true, 'open'),
  ('GK-1 M Block Market', 28.5622, 77.2416, 'public', 'Surface lot', 30, '≈₹30/hr (MCD multilevel site, commercial district rate)', true, 'Type 2 (AC)', 7, null::jsonb, true, 'limited'),
  ('GK-2 Market', 28.5495, 77.2493, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'open'),
  ('Saket District Centre', 28.5232, 77.2168, 'public', 'Multilevel parking', 30, '≈₹30/hr (MCD multilevel site, commercial district rate)', true, 'CCS2 (DC fast)', 30, null::jsonb, true, 'full'),
  ('Malviya Nagar Market', 28.5307, 77.2093, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'open'),
  ('Sarojini Nagar Market', 28.5768, 77.1963, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, true, 'limited'),
  ('Defence Colony Market', 28.5735, 77.232, 'public', 'Surface lot', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, true, 'open'),
  ('Vasant Kunj — Ambience Mall', 28.5245, 77.159, 'public', 'Basement parking', 25, '₹100 for the first 4 hrs, ₹20/hr after (mall tariff)', true, 'CCS2 (DC fast)', 30, null::jsonb, true, 'full'),
  ('Chattarpur', 28.4989, 77.175, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'open'),
  ('Qutub Minar', 28.5245, 77.1855, 'public', 'Surface lot', 20, '₹20/hr (ASI-managed monument parking)', false, null, null, null::jsonb, true, 'open'),
  ('Laxmi Nagar Market', 28.6345, 77.2767, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'limited'),
  ('Preet Vihar Market', 28.6353, 77.2949, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'open'),
  ('Mayur Vihar Phase 1 Market', 28.6096, 77.2934, 'public', 'Surface lot', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, true, 'open'),
  ('Anand Vihar ISBT', 28.6469, 77.3152, 'public', 'Multilevel parking', 30, '≈₹30/hr (MCD multilevel site, commercial district rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Yamuna Bank', 28.6169, 77.274, 'public', 'Surface lot', 0, 'Free — DDA-maintained public grounds', false, null, null, null::jsonb, false, 'open'),
  ('Rajouri Garden Market', 28.6467, 77.1201, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, true, 'full'),
  ('Janakpuri District Centre', 28.6219, 77.0895, 'public', 'Multilevel parking', 30, '≈₹30/hr (MCD multilevel site, commercial district rate)', true, 'Type 2 (AC)', 7, null::jsonb, true, 'limited'),
  ('Tilak Nagar Market', 28.6414, 77.0917, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'open'),
  ('Punjabi Bagh Market', 28.6692, 77.1315, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'open'),
  ('Paschim Vihar Market', 28.6692, 77.101, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Dwarka Sector 21', 28.5522, 77.0589, 'public', 'Surface lot', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, true, 'open'),
  ('Dwarka Sector 10 Market', 28.5921, 77.0498, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'limited'),
  ('Pitampura — Netaji Subhash Place', 28.6984, 77.15, 'public', 'Multilevel parking', 30, '≈₹30/hr (MCD multilevel site, commercial district rate)', true, 'Type 2 (AC)', 7, null::jsonb, true, 'full'),
  ('Rohini Sector 7 Market', 28.7136, 77.1188, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'open'),
  ('Shalimar Bagh Market', 28.7145, 77.1642, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'open'),
  ('Ashok Vihar Market', 28.695, 77.181, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'limited'),
  ('Yamuna Vihar Market', 28.6935, 77.2711, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'open'),
  ('Shahdara Market', 28.6692, 77.2897, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'unknown'),
  ('Dilli Haat, INA', 28.5732, 77.2069, 'public', 'Surface lot', 30, '≈₹30/hr (MCD multilevel site, commercial district rate)', false, null, null, null::jsonb, true, 'open'),
  ('AIIMS Area', 28.5672, 77.21, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'full'),
  ('Chanakyapuri', 28.5933, 77.1885, 'public', 'Surface lot', 0, 'Free — DDA-maintained public grounds', false, null, null, null::jsonb, true, 'open'),
  ('R K Puram Sector 5 Market', 28.565, 77.177, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'open'),
  ('Vikaspuri District Centre', 28.6377, 77.0688, 'public', 'Multilevel parking', 30, '≈₹30/hr (MCD multilevel site, commercial district rate)', false, null, null, null::jsonb, true, 'limited'),
  ('Uttam Nagar Market', 28.6193, 77.0587, 'public', 'On-street parking', 20, '₹20/hr, ₹100 max per day (MCD standard rate)', false, null, null, null::jsonb, false, 'open'),
  ('GK-2 — Resident Driveway', 28.5502, 77.2465, 'private', 'Private driveway', 15, '₹15/hr — set by the owner', false, null, null, '{"days":[1,2,3,4,5],"start":"09:00","end":"18:00"}'::jsonb, true, 'open'),
  ('Vasant Kunj — Society Slot', 28.527, 77.158, 'private', 'Private society parking', 20, '₹20/hr — set by the owner', false, null, null, '{"days":[0,1,2,3,4,5,6],"start":"08:00","end":"22:00"}'::jsonb, false, 'open'),
  ('Rajouri Garden — Resident Driveway', 28.648, 77.1225, 'private', 'Private driveway', 15, '₹15/hr — set by the owner', false, null, null, '{"days":[1,2,3,4,5],"start":"09:00","end":"18:00"}'::jsonb, true, 'open'),
  ('Dwarka Sector 10 — Society Slot', 28.591, 77.051, 'private', 'Private society parking', 20, '₹20/hr — set by the owner', true, 'Bharat AC-001', 3.3, '{"days":[0,1,2,3,4,5,6],"start":"08:00","end":"22:00"}'::jsonb, false, 'limited'),
  ('Rohini Sector 7 — Resident Driveway', 28.714, 77.12, 'private', 'Private driveway', 15, '₹15/hr — set by the owner', false, null, null, '{"days":[1,2,3,4,5],"start":"09:00","end":"18:00"}'::jsonb, false, 'open'),
  ('Safdarjung Enclave — Society Slot', 28.565, 77.195, 'private', 'Private society parking', 25, '₹25/hr — set by the owner', true, 'Bharat AC-001', 3.3, '{"days":[0,1,2,3,4,5,6],"start":"08:00","end":"22:00"}'::jsonb, true, 'open'),
  ('Punjabi Bagh — Resident Driveway', 28.67, 77.133, 'private', 'Private driveway', 15, '₹15/hr — set by the owner', false, null, null, '{"days":[1,2,3,4,5],"start":"09:00","end":"18:00"}'::jsonb, false, 'open'),
  ('Shalimar Bagh — Society Slot', 28.715, 77.165, 'private', 'Private society parking', 25, '₹25/hr — set by the owner', true, 'Type 2 (AC)', 7, '{"days":[0,1,2,3,4,5,6],"start":"08:00","end":"22:00"}'::jsonb, true, 'open')
) as seed(name, lat, lng, ownership, type, price_per_hour, price_note, charging, connector_type, charging_speed_kw, availability, verified, status)
where not exists (select 1 from spots where spots.name = seed.name);
