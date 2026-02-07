create table if not exists public.nessie_customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,
  nessie_customer_id text not null unique,
  created_at timestamptz not null default now()
);

create unique index if not exists nessie_customers_auth_user_id_key
  on public.nessie_customers (auth_user_id);

alter table public.nessie_customers enable row level security;

create policy "Users can read their mapping"
  on public.nessie_customers
  for select
  using (auth.uid() = auth_user_id);

create policy "Users can insert their mapping"
  on public.nessie_customers
  for insert
  with check (auth.uid() = auth_user_id);

create policy "Users can update their mapping"
  on public.nessie_customers
  for update
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);
