-- Multi-product Social Publisher campaigns with evenly spaced repetitions.
-- Existing queue rows are preserved as one-product, one-occurrence campaigns.

alter table public.social_post_queue
  add column campaign_id uuid,
  add column product_ids uuid[],
  add column product_names jsonb,
  add column image_urls jsonb,
  add column product_urls jsonb,
  add column caption_language text,
  add column caption_tone text,
  add column occurrence_index integer,
  add column occurrence_count integer;

update public.social_post_queue
set
  campaign_id = gen_random_uuid(),
  product_ids = array[product_id],
  product_names = jsonb_build_array(product_name),
  image_urls = jsonb_build_array(image_url),
  product_urls = jsonb_build_array(product_url),
  caption_language = 'ar',
  caption_tone = 'msa',
  occurrence_index = 0,
  occurrence_count = 1;

alter table public.social_post_queue
  alter column campaign_id set default gen_random_uuid(),
  alter column campaign_id set not null,
  alter column product_ids set not null,
  alter column product_names set not null,
  alter column image_urls set not null,
  alter column product_urls set not null,
  alter column caption_language set default 'ar',
  alter column caption_language set not null,
  alter column caption_tone set default 'msa',
  alter column caption_tone set not null,
  alter column occurrence_index set default 0,
  alter column occurrence_index set not null,
  alter column occurrence_count set default 1,
  alter column occurrence_count set not null;

alter table public.social_post_queue
  add constraint social_post_queue_product_ids_count check (
    cardinality(product_ids) between 1 and 10
  ),
  add constraint social_post_queue_product_names_count check (
    jsonb_typeof(product_names) = 'array'
    and jsonb_array_length(product_names) between 1 and 10
  ),
  add constraint social_post_queue_image_urls_count check (
    jsonb_typeof(image_urls) = 'array'
    and jsonb_array_length(image_urls) between 1 and 10
  ),
  add constraint social_post_queue_product_urls_count check (
    jsonb_typeof(product_urls) = 'array'
    and jsonb_array_length(product_urls) between 1 and 10
  ),
  add constraint social_post_queue_caption_language check (
    caption_language in ('ar', 'en')
  ),
  add constraint social_post_queue_caption_tone check (
    caption_tone in ('egyptian', 'msa')
  ),
  add constraint social_post_queue_occurrence_index check (
    occurrence_index between 0 and 9
  ),
  add constraint social_post_queue_occurrence_count check (
    occurrence_count between 1 and 10
    and occurrence_index < occurrence_count
  );

drop index if exists public.social_post_queue_one_active_product_platform;

create unique index social_post_queue_campaign_occurrence_platform
  on public.social_post_queue(campaign_id, occurrence_index, platform);

create index social_post_queue_product_ids_idx
  on public.social_post_queue using gin(product_ids);

comment on column public.social_post_queue.campaign_id is
  'Groups every platform and repeated occurrence created from one approved post.';
comment on column public.social_post_queue.product_ids is
  'Ordered product ids represented by the ordered image_urls array.';
comment on column public.social_post_queue.occurrence_index is
  'Zero-based position in an evenly distributed 24-hour publication cycle.';
