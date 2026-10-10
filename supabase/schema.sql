create table if not exists public.progress (
  participant text not null,
  day integer not null check (day between 1 and 30),
  vocab boolean not null default false,
  speech boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (participant, day)
);

alter table public.progress enable row level security;

-- The app accesses this table only through its server route with the service-role key.
