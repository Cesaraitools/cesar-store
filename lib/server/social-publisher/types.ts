export type SocialPlatform = "facebook" | "instagram";

export type SocialPostStatus =
  | "draft"
  | "queued"
  | "processing"
  | "published"
  | "failed"
  | "cancelled"
  | "skipped";

export type SocialPublisherMode = "draft" | "live";

export type SocialPublisherSettings = {
  id: "default";
  enabled: boolean;
  mode: SocialPublisherMode;
  facebook_enabled: boolean;
  instagram_enabled: boolean;
  auto_queue_enabled: boolean;
  min_stock: number;
  repeat_cooldown_days: number;
  daily_post_limit: number;
  posting_times: string[];
  timezone: string;
  created_at: string;
  updated_at: string;
};
export type SocialPostQueueRow = {
  id: string;
  product_id: string;
  platform: SocialPlatform;
  status: SocialPostStatus;
  scheduled_for: string;
  caption: string;
  product_name: string;
  price_snapshot: number | string;
  stock_snapshot: number;
  image_url: string;
  product_url: string;
  idempotency_key: string;
  attempt_count: number;
  max_attempts: number;
  locked_at: string | null;
  locked_by: string | null;
  last_error: string | null;
  external_post_id: string | null;
  external_post_url: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SocialPublicationEvent = {
  id: number;
  queue_id: string | null;
  event_type: string;
  platform: SocialPlatform | null;
  details: Record<string, unknown>;
  created_at: string;
};

export type SocialProductCandidate = {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string;
  productUrl: string;
  category: string;
};

export type MetaPublisherReadiness = {
  configured: boolean;
  graphApiVersion: string;
  missing: string[];
};
