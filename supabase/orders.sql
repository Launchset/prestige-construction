create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  product_slug text not null,
  product_name text not null,
  product_sku text,
  user_id uuid references auth.users(id),
  unit_amount_pence integer not null check (unit_amount_pence >= 0),
  currency text not null default 'gbp',
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  shipping_address text not null,
  shipping_address_number text not null default '',
  shipping_road text not null default '',
  shipping_town_city text not null default '',
  shipping_county text not null default '',
  shipping_postcode text not null default '',
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'checkout_failed')),
  stripe_session_id text unique,
  stripe_payment_status text,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists orders_product_slug_idx on public.orders (product_slug);
create index if not exists orders_customer_email_idx on public.orders (customer_email);
create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

alter table public.orders enable row level security;

drop policy if exists "Users can view their own orders" on public.orders;
drop policy if exists "Users can insert their own orders" on public.orders;
drop policy if exists "Users can update their own checkout orders" on public.orders;
drop policy if exists "Users can delete their own pending orders" on public.orders;
drop policy if exists "Admins can view all orders" on public.orders;
drop policy if exists "Admins can update all orders" on public.orders;

create policy "Users can view their own orders"
on public.orders
for select
using (auth.uid() = user_id);

create policy "Users can insert their own orders"
on public.orders
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own checkout orders"
on public.orders
for update
using (
  auth.uid() = user_id
  and status in ('pending', 'checkout_failed')
)
with check (
  auth.uid() = user_id
  and status in ('pending', 'checkout_failed')
  and coalesce(stripe_payment_status, 'unpaid') in ('unpaid', 'failed')
);

create policy "Users can delete their own pending orders"
on public.orders
for delete
using (
  auth.uid() = user_id
  and status in ('pending', 'checkout_failed')
);

create policy "Admins can view all orders"
on public.orders
for select
using (public.is_admin());

create policy "Admins can update all orders"
on public.orders
for update
using (public.is_admin())
with check (public.is_admin());
