alter table public.products
  add column if not exists brand text,
  add column if not exists manufacturer text,
  add column if not exists mpn text,
  add column if not exists gtin text,
  add column if not exists model text;

alter table public.products
  drop constraint if exists products_gtin_format_check;

alter table public.products
  add constraint products_gtin_format_check
  check (
    gtin is null
    or gtin ~ '^([0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14})$'
  );

comment on column public.products.brand is
  'Actual product brand. Null means unknown; do not infer the store name.';
comment on column public.products.manufacturer is
  'Manufacturer name when known from the product or supplier.';
comment on column public.products.mpn is
  'Manufacturer part number. Must not be replaced with the internal product UUID.';
comment on column public.products.gtin is
  'Validated GTIN-8, GTIN-12, GTIN-13, or GTIN-14 without spaces or hyphens.';
comment on column public.products.model is
  'Manufacturer model name or number when known.';
