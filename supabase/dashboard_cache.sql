create table if not exists public.dashboard_cache (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  fetched_at timestamptz not null default now(),
  fetched_at_epoch bigint not null
);

alter table public.dashboard_cache enable row level security;

create policy "Users can read their dashboard cache"
  on public.dashboard_cache
  for select
  using (auth.uid() = auth_user_id);

create policy "Users can insert their dashboard cache"
  on public.dashboard_cache
  for insert
  with check (auth.uid() = auth_user_id);

create policy "Users can update their dashboard cache"
  on public.dashboard_cache
  for update
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);
