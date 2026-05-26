-- Run this in Supabase Dashboard → SQL Editor (one time setup)

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  amount numeric not null check (amount >= 0),
  category text not null default 'General',
  estate_name text,
  payment_method text default 'Cash',
  notes text,
  status text default 'Approved'
);

alter table public.expenses enable row level security;

drop policy if exists "expenses_select" on public.expenses;
drop policy if exists "expenses_insert" on public.expenses;
drop policy if exists "expenses_update" on public.expenses;
drop policy if exists "expenses_delete" on public.expenses;

create policy "expenses_select" on public.expenses for select using (true);
create policy "expenses_insert" on public.expenses for insert with check (true);
create policy "expenses_update" on public.expenses for update using (true);
create policy "expenses_delete" on public.expenses for delete using (true);

-- Enable real-time updates for the Expenses page
alter publication supabase_realtime add table public.expenses;
