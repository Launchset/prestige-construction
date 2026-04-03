create extension if not exists pgcrypto;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null default '',
  message text not null,
  product text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists enquiries_created_at_idx on public.enquiries (created_at desc);
create index if not exists enquiries_email_idx on public.enquiries (email);
create index if not exists enquiries_product_idx on public.enquiries (product);

alter table public.enquiries enable row level security;

drop policy if exists "Admins can view all enquiries" on public.enquiries;

create policy "Admins can view all enquiries"
on public.enquiries
for select
using (public.is_admin());;
