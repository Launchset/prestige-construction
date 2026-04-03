alter table public.orders
add column if not exists shipping_address_number text not null default '',
add column if not exists shipping_road text not null default '',
add column if not exists shipping_town_city text not null default '',
add column if not exists shipping_county text not null default '',
add column if not exists shipping_postcode text not null default '';
