create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wholesale-documents',
  'wholesale-documents',
  false,
  5242880,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.wholesale_applications (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  entity_type text not null check (
    entity_type in ('shop', 'distributor', 'company', 'other')
  ),
  contact_name text not null,
  phone text not null,
  whatsapp text not null,
  email text,
  governorate text not null,
  city text not null,
  address text,
  tax_number text,
  commercial_register_number text,
  notes text,
  documents jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (
    status in ('pending', 'under_review', 'approved', 'rejected')
  ),
  review_notes text,
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wholesale_applications_status
  on public.wholesale_applications(status);

create index if not exists idx_wholesale_applications_created_at
  on public.wholesale_applications(created_at desc);

create index if not exists idx_wholesale_applications_phone
  on public.wholesale_applications(phone);

create table if not exists public.wholesale_customers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.wholesale_applications(id) on delete restrict,
  auth_user_id uuid,
  business_name text not null,
  entity_type text not null check (
    entity_type in ('shop', 'distributor', 'company', 'other')
  ),
  contact_name text not null,
  phone text not null,
  whatsapp text not null,
  email text,
  governorate text not null,
  city text not null,
  address text,
  tax_number text,
  commercial_register_number text,
  status text not null default 'pending_account' check (
    status in ('pending_account', 'active', 'suspended')
  ),
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(application_id)
);

create unique index if not exists idx_wholesale_customers_auth_user_id
  on public.wholesale_customers(auth_user_id)
  where auth_user_id is not null;

create index if not exists idx_wholesale_customers_status
  on public.wholesale_customers(status);

create index if not exists idx_wholesale_customers_whatsapp
  on public.wholesale_customers(whatsapp);

create table if not exists public.wholesale_product_settings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  is_enabled boolean not null default true,
  wholesale_price numeric not null default 0 check (wholesale_price >= 0),
  unit_type text not null default 'carton' check (
    unit_type in ('carton', 'piece', 'liter', 'meter', 'set', 'box', 'pack', 'custom')
  ),
  unit_label text not null default '',
  quantity_per_unit numeric not null default 1 check (quantity_per_unit > 0),
  min_order_units integer not null default 1 check (min_order_units > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id)
);

create index if not exists idx_wholesale_product_settings_enabled
  on public.wholesale_product_settings(is_enabled);

create index if not exists idx_wholesale_product_settings_product_id
  on public.wholesale_product_settings(product_id);

alter table public.wholesale_applications enable row level security;
alter table public.wholesale_customers enable row level security;
alter table public.wholesale_product_settings enable row level security;
