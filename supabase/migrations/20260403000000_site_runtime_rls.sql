drop policy if exists "Anyone can create enquiries" on public.enquiries;

create policy "Anyone can create enquiries"
on public.enquiries
for insert
with check (true);

drop policy if exists "Users can update their own checkout orders" on public.orders;
drop policy if exists "Users can delete their own pending orders" on public.orders;
drop policy if exists "Admins can update all orders" on public.orders;

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

create policy "Admins can update all orders"
on public.orders
for update
using (public.is_admin())
with check (public.is_admin());

do $$
begin
  if to_regclass('public.categories') is not null then
    execute 'alter table public.categories enable row level security';
    execute 'drop policy if exists "Public can view categories" on public.categories';
    execute 'create policy "Public can view categories" on public.categories for select using (true)';
  end if;

  if to_regclass('public.products') is not null then
    execute 'alter table public.products enable row level security';
    execute 'drop policy if exists "Public can view published products" on public.products';
    execute $sql$
      create policy "Public can view published products"
      on public.products
      for select
      using (btrim(coalesce(scraped_name, '')) <> '')
    $sql$;
  end if;

  if to_regclass('public.product_images') is not null then
    execute 'alter table public.product_images enable row level security';
    execute 'drop policy if exists "Public can view published product images" on public.product_images';
    execute $sql$
      create policy "Public can view published product images"
      on public.product_images
      for select
      using (
        (
          coalesce(sort_order, 0) > 0
          or lower(coalesce(media_type, '')) = 'spec sheet'
        )
        and exists (
          select 1
          from public.products
          where products.id = product_images.product_id
            and btrim(coalesce(products.scraped_name, '')) <> ''
        )
      )
    $sql$;
  end if;
end $$;
