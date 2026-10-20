create table if not exists public.progress (
  participant text not null,
  day integer not null check (day between 1 and 30),
  vocab boolean not null default false,
  speech boolean not null default false,
  weekly_report boolean not null default false,
  vocab_submitted_at timestamptz,
  speech_submitted_at timestamptz,
  weekly_report_submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (participant, day)
);

alter table public.progress add column if not exists weekly_report boolean not null default false;
alter table public.progress add column if not exists vocab_submitted_at timestamptz;
alter table public.progress add column if not exists speech_submitted_at timestamptz;
alter table public.progress add column if not exists weekly_report_submitted_at timestamptz;

alter table public.progress enable row level security;

create table if not exists public.tracker_settings (
  id integer primary key check (id = 1),
  current_day integer not null check (current_day between 1 and 30),
  updated_at timestamptz not null default now()
);

alter table public.tracker_settings enable row level security;

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  message text not null check (char_length(trim(message)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.feedback_votes (
  feedback_id bigint not null references public.feedback(id) on delete cascade,
  voter_id uuid not null,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (feedback_id, voter_id)
);

create index if not exists feedback_votes_feedback_id_idx on public.feedback_votes(feedback_id);

alter table public.feedback enable row level security;
alter table public.feedback_votes enable row level security;

create or replace function public.cast_feedback_vote(
  p_feedback_id bigint,
  p_voter_id uuid,
  p_vote smallint
)
returns table (feedback_id bigint, score integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_vote not in (-1, 1) then
    raise exception 'Vote must be 1 or -1';
  end if;

  insert into public.feedback_votes (feedback_id, voter_id, vote)
  values (p_feedback_id, p_voter_id, p_vote)
  on conflict on constraint feedback_votes_pkey do update
    set vote = excluded.vote, updated_at = now();

  return query
  select p_feedback_id, coalesce(sum(vote), 0)::integer
  from public.feedback_votes
  where feedback_votes.feedback_id = p_feedback_id;
end;
$$;

revoke execute on function public.cast_feedback_vote(bigint, uuid, smallint) from public;
grant execute on function public.cast_feedback_vote(bigint, uuid, smallint) to service_role;
notify pgrst, 'reload schema';

-- The app accesses this table only through its server route with the service-role key.
