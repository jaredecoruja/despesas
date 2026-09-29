-- Shared cloud data for the single-owner finance app.
-- The same authenticated account can be used on multiple devices.

create table if not exists public.expenses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  description text not null,
  category text not null,
  value numeric(14,2) not null check (value >= 0),
  payment text not null check (payment in ('Dinheiro','Pix','Cartão de crédito','Boleto')),
  note text not null default '',
  paid boolean not null default false,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default '🏷️',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.expenses enable row level security;
alter table public.categories enable row level security;

drop policy if exists "expenses_select_own" on public.expenses;
drop policy if exists "expenses_insert_own" on public.expenses;
drop policy if exists "expenses_update_own" on public.expenses;
drop policy if exists "expenses_delete_own" on public.expenses;
drop policy if exists "categories_select_own" on public.categories;
drop policy if exists "categories_insert_own" on public.categories;
drop policy if exists "categories_update_own" on public.categories;
drop policy if exists "categories_delete_own" on public.categories;

create policy "expenses_select_own" on public.expenses for select to authenticated using (auth.uid() = user_id);
create policy "expenses_insert_own" on public.expenses for insert to authenticated with check (auth.uid() = user_id);
create policy "expenses_update_own" on public.expenses for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "expenses_delete_own" on public.expenses for delete to authenticated using (auth.uid() = user_id);

create policy "categories_select_own" on public.categories for select to authenticated using (auth.uid() = user_id);
create policy "categories_insert_own" on public.categories for insert to authenticated with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories for delete to authenticated using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at before update on public.expenses
for each row execute function public.set_updated_at();

-- Enable database-change streaming for multi-device live updates.
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.categories;
