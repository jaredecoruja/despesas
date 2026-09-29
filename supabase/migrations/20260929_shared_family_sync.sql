create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  pairing_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id),
  unique (user_id)
);

alter table public.expenses add column if not exists family_id uuid references public.families(id) on delete cascade;
alter table public.categories add column if not exists family_id uuid references public.families(id) on delete cascade;

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.expenses enable row level security;
alter table public.categories enable row level security;

create index if not exists family_members_user_id_idx on public.family_members(user_id);
create index if not exists expenses_family_id_idx on public.expenses(family_id);
create index if not exists categories_family_id_idx on public.categories(family_id);

drop policy if exists "expenses_select_own" on public.expenses;
drop policy if exists "expenses_insert_own" on public.expenses;
drop policy if exists "expenses_update_own" on public.expenses;
drop policy if exists "expenses_delete_own" on public.expenses;
drop policy if exists "categories_select_own" on public.categories;
drop policy if exists "categories_insert_own" on public.categories;
drop policy if exists "categories_update_own" on public.categories;
drop policy if exists "categories_delete_own" on public.categories;

create policy "family members can read expenses" on public.expenses for select to authenticated
using (exists (select 1 from public.family_members fm where fm.family_id=expenses.family_id and fm.user_id=(select auth.uid())));
create policy "family members can insert expenses" on public.expenses for insert to authenticated
with check (user_id=(select auth.uid()) and exists (select 1 from public.family_members fm where fm.family_id=expenses.family_id and fm.user_id=(select auth.uid())));
create policy "family members can update expenses" on public.expenses for update to authenticated
using (exists (select 1 from public.family_members fm where fm.family_id=expenses.family_id and fm.user_id=(select auth.uid())))
with check (user_id=(select auth.uid()) and exists (select 1 from public.family_members fm where fm.family_id=expenses.family_id and fm.user_id=(select auth.uid())));
create policy "family members can delete expenses" on public.expenses for delete to authenticated
using (exists (select 1 from public.family_members fm where fm.family_id=expenses.family_id and fm.user_id=(select auth.uid())));

create policy "family members can read categories" on public.categories for select to authenticated
using (exists (select 1 from public.family_members fm where fm.family_id=categories.family_id and fm.user_id=(select auth.uid())));
create policy "family members can insert categories" on public.categories for insert to authenticated
with check (user_id=(select auth.uid()) and exists (select 1 from public.family_members fm where fm.family_id=categories.family_id and fm.user_id=(select auth.uid())));
create policy "family members can update categories" on public.categories for update to authenticated
using (exists (select 1 from public.family_members fm where fm.family_id=categories.family_id and fm.user_id=(select auth.uid())))
with check (user_id=(select auth.uid()) and exists (select 1 from public.family_members fm where fm.family_id=categories.family_id and fm.user_id=(select auth.uid())));
create policy "family members can delete categories" on public.categories for delete to authenticated
using (exists (select 1 from public.family_members fm where fm.family_id=categories.family_id and fm.user_id=(select auth.uid())));

drop policy if exists "members can read own membership" on public.family_members;
drop policy if exists "members can read their family" on public.families;
create policy "members can read own membership" on public.family_members for select to authenticated using (user_id=(select auth.uid()));
create policy "members can read their family" on public.families for select to authenticated
using (exists (select 1 from public.family_members fm where fm.family_id=families.id and fm.user_id=(select auth.uid())));

grant select on table public.families to authenticated;
grant select on table public.family_members to authenticated;

alter table public.expenses replica identity full;
alter table public.categories replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='expenses') then
    alter publication supabase_realtime add table public.expenses;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='categories') then
    alter publication supabase_realtime add table public.categories;
  end if;
end $$;

alter table public.expenses alter column family_id set not null;
alter table public.categories alter column family_id set not null;
