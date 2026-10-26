-- Translation vocabulary (Supabase / PostgreSQL)
-- Run once in Supabase SQL Editor: https://supabase.com/dashboard → SQL

create extension if not exists "pgcrypto";

create table if not exists public.translation_history (
  id uuid primary key default gen_random_uuid(),
  english_input text not null,
  english_key text not null,
  original_input text default '',
  thai_word text not null,
  roman_syllables text default '',
  roman_compact text default '',
  chinese_traditional text default '',
  meaning_en text not null,
  example_thai text default '',
  example_roman text default '',
  example_chinese text default '',
  raw_json jsonb,
  notes text default '',
  revision_status text not null default 'current'
    check (revision_status in ('current', 'draft', 'reviewed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists translation_history_created_at_idx
  on public.translation_history (created_at desc);

create index if not exists translation_history_updated_at_idx
  on public.translation_history (updated_at desc);

create index if not exists translation_history_english_key_idx
  on public.translation_history (english_key);

create index if not exists translation_history_english_idx
  on public.translation_history (english_input);

create index if not exists translation_history_status_idx
  on public.translation_history (revision_status);

-- Lookup log (optional audit trail)
create table if not exists public.lookup_log (
  id uuid primary key default gen_random_uuid(),
  english_raw text not null,
  english_key text not null,
  card_id uuid references public.translation_history(id) on delete set null,
  action text not null,
  detail text default '',
  created_at timestamptz not null default now()
);

create index if not exists lookup_log_created_at_idx
  on public.lookup_log (created_at desc);

-- Card relations for reuse / linking
create table if not exists public.card_links (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.translation_history(id) on delete cascade,
  to_id uuid not null references public.translation_history(id) on delete cascade,
  relation text not null default 'same_topic'
    check (relation in ('synonym', 'formal_variant', 'opposite', 'often_with', 'same_topic')),
  created_at timestamptz not null default now(),
  unique (from_id, to_id)
);

create index if not exists card_links_from_idx on public.card_links (from_id);
create index if not exists card_links_to_idx on public.card_links (to_id);

-- Challenge topics (saved LLM runs for revision / regenerate)
create table if not exists public.challenge_topics (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  topic_en text default '',
  note_en text default '',
  web_mode_requested text default 'auto',
  web_decision text default 'practice',
  web_decision_reason text default '',
  web_used boolean default false,
  web_search_error text default '',
  source_links jsonb not null default '[]'::jsonb,
  sentences jsonb not null default '[]'::jsonb,
  notes text default '',
  revision_status text not null default 'current'
    check (revision_status in ('current', 'draft', 'reviewed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists challenge_topics_updated_at_idx
  on public.challenge_topics (updated_at desc);

create index if not exists challenge_topics_status_idx
  on public.challenge_topics (revision_status);

-- Migration for existing tables (run if table already existed without new columns):
-- alter table public.translation_history add column if not exists english_key text;
-- alter table public.translation_history add column if not exists original_input text default '';
-- update public.translation_history set english_key = lower(trim(english_input)) where english_key is null;

alter table public.translation_history enable row level security;
alter table public.lookup_log enable row level security;
alter table public.card_links enable row level security;

-- Simple login for translation workshop (passwords stored hashed server-side)
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  user_id uuid not null references public.app_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists app_sessions_token_idx on public.app_sessions (token);
create index if not exists app_sessions_expires_idx on public.app_sessions (expires_at);

alter table public.app_users enable row level security;
alter table public.app_sessions enable row level security;

-- Spaced recall (Today's 10 · English → Thai self-rating)
create table if not exists public.review_state (
  card_id uuid primary key references public.translation_history(id) on delete cascade,
  interval_days int not null default 0,
  due_on date not null default current_date,
  last_rating text,
  updated_at timestamptz not null default now()
);

create index if not exists review_state_due_on_idx on public.review_state (due_on);

alter table public.review_state enable row level security;
alter table public.challenge_topics enable row level security;

-- Netlify Functions use SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
