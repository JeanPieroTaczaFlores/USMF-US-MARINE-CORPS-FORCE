alter table public.shop_items
  add column if not exists archived_at timestamptz;

create index if not exists shop_items_active_catalog_idx
  on public.shop_items (created_at desc)
  where archived_at is null;

comment on column public.shop_items.archived_at is
  'Soft-delete marker used when inventory history prevents a physical delete.';

update public.shop_items
set disponible = false,
    archived_at = coalesce(archived_at, now())
where nombre in (
  'Placa conmemorativa',
  'Parche de unidad USMCF',
  'Kit visual de operador'
);
