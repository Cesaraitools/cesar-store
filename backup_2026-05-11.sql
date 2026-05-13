


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."create_order_atomic"("p_user_id" "uuid", "p_items" "jsonb", "p_customer" "jsonb", "p_currency" "text", "p_order_token" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$DECLARE
  v_order_id uuid := gen_random_uuid();
  v_order_number text;
  v_subtotal numeric := 0;
  v_item jsonb;
  v_product record;
  v_qty int;
BEGIN

   FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::int;

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity';
    END IF;

    SELECT * INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::uuid
    FOR UPDATE;

    IF v_product IS NULL OR NOT v_product.is_active THEN
      RAISE EXCEPTION 'Product not available';
    END IF;

    IF v_product.stock < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock';
    END IF;

    -- 🔥 خصم آمن + رجوع القيمة الجديدة
  UPDATE products
SET 
  stock = stock - v_qty,
  is_active = (stock - v_qty) > 0
WHERE id = v_product.id
RETURNING stock INTO v_product.stock;
    -- 🔥 الحساب من DB فقط
    v_subtotal := v_subtotal + (v_product.price * v_qty);

  END LOOP;

  v_order_number :=
    'CS-' || to_char(now(), 'YYMMDDHH24MISS') ||
    '-' || substr(v_order_id::text, 1, 6);

  INSERT INTO orders (
    id,
    user_id,
    order_number,
    status,
    subtotal,
    total,
    currency,
    customer_snapshot,
    items_snapshot,
    order_token
  )
  VALUES (
    v_order_id,
    p_user_id,
    v_order_number,
    'requested',
    v_subtotal,
    v_subtotal,
    p_currency,
    p_customer,
    p_items,
    p_order_token
  )
  ON CONFLICT (order_token) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('reused', true);
  END IF;

  INSERT INTO order_tracking_events (
    id,
    order_id,
    status,
    actor
  )
  VALUES (
    gen_random_uuid(),
    v_order_id,
    'requested',
    'system'
  );

  DELETE FROM cart_items
  WHERE cart_id = (
    SELECT id FROM carts 
    WHERE user_id = p_user_id 
    AND status = 'active'
    LIMIT 1
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'ORDER FAILED: % | user_id=%', SQLERRM, p_user_id;
END;$$;


ALTER FUNCTION "public"."create_order_atomic"("p_user_id" "uuid", "p_items" "jsonb", "p_customer" "jsonb", "p_currency" "text", "p_order_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN

  INSERT INTO public.users (
    id,
    email,
    name,
    avatar_url,
    providers,
    is_admin,
    is_catalog_admin,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      ''
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      ''
    ),
    ARRAY[
      COALESCE(
        NEW.raw_app_meta_data->>'provider',
        'email'
      )
    ],
    false,
    false,
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;

END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_order_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.order_tracking_events (order_id, status, created_at, note)
        VALUES (NEW.id, NEW.status, now(), 'تم تحديث حالة الطلب تلقائياً إلى ' || NEW.status);
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_order_status_change"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_email" "text",
    "action" "text",
    "entity" "text",
    "entity_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cart_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "price" numeric,
    "image" "text",
    "name_ar" "text" DEFAULT ''::"text",
    "name_en" "text" DEFAULT ''::"text",
    CONSTRAINT "cart_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."carts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "anonymous_id" "uuid",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "carts_user_or_guest_check" CHECK (((("user_id" IS NOT NULL) AND ("anonymous_id" IS NULL)) OR (("user_id" IS NULL) AND ("anonymous_id" IS NOT NULL))))
);


ALTER TABLE "public"."carts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "text" NOT NULL,
    "category" "text" NOT NULL,
    "image" "text",
    "en" "jsonb" NOT NULL,
    "ar" "jsonb" NOT NULL,
    "active" boolean DEFAULT true,
    "order" integer DEFAULT 0,
    "createdAt" timestamp with time zone DEFAULT "now"(),
    "updatedAt" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."import_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "file_name" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "rows_total" integer DEFAULT 0 NOT NULL,
    "rows_processed" integer DEFAULT 0 NOT NULL,
    "rows_success" integer DEFAULT 0 NOT NULL,
    "rows_failed" integer DEFAULT 0 NOT NULL,
    "rows_skipped" integer DEFAULT 0 NOT NULL,
    "next_index" integer DEFAULT 0 NOT NULL,
    "rows_json" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "known_product_keys_json" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "image_cache_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "failures_json" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "last_error" "text",
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "import_jobs_next_index_check" CHECK (("next_index" >= 0)),
    CONSTRAINT "import_jobs_rows_failed_check" CHECK (("rows_failed" >= 0)),
    CONSTRAINT "import_jobs_rows_processed_check" CHECK (("rows_processed" >= 0)),
    CONSTRAINT "import_jobs_rows_skipped_check" CHECK (("rows_skipped" >= 0)),
    CONSTRAINT "import_jobs_rows_success_check" CHECK (("rows_success" >= 0)),
    CONSTRAINT "import_jobs_rows_total_check" CHECK (("rows_total" >= 0)),
    CONSTRAINT "import_jobs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."import_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "invoice_number" "text" NOT NULL,
    "issued_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "currency" "text" DEFAULT 'EGP'::"text" NOT NULL,
    "seller_snapshot" "jsonb" NOT NULL,
    "customer_snapshot" "jsonb" NOT NULL,
    "items_snapshot" "jsonb" NOT NULL,
    "subtotal" numeric NOT NULL,
    "shipping_fee" numeric DEFAULT 0 NOT NULL,
    "discount" numeric DEFAULT 0 NOT NULL,
    "total" numeric NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hash" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "public_url" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "byte_size" bigint DEFAULT 0 NOT NULL,
    "original_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."media_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "name" "text" NOT NULL,
    "price" numeric NOT NULL,
    "quantity" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_tracking_events" (
    "id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "actor" "text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."order_tracking_events" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."orders_order_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."orders_order_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "order_number" "text" DEFAULT "nextval"('"public"."orders_order_number_seq"'::"regclass") NOT NULL,
    "status" "text" NOT NULL,
    "subtotal" numeric NOT NULL,
    "shipping_fee" numeric DEFAULT 0 NOT NULL,
    "discount" numeric DEFAULT 0 NOT NULL,
    "total" numeric NOT NULL,
    "currency" "text" DEFAULT 'EGP'::"text" NOT NULL,
    "customer_snapshot" "jsonb" NOT NULL,
    "items_snapshot" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "confirmed_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "snapshot" "jsonb",
    "order_token" "text" NOT NULL,
    "archived_at" timestamp with time zone
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name_ar" "text" NOT NULL,
    "name_en" "text",
    "description_ar" "text",
    "description_en" "text",
    "price" numeric(10,2) NOT NULL,
    "image_url" "text",
    "stock" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category" "text",
    "images_json" "jsonb",
    "slug" "text",
    "low_stock_threshold" integer DEFAULT 10,
    CONSTRAINT "products_price_check" CHECK (("price" >= (0)::numeric)),
    CONSTRAINT "products_stock_check" CHECK (("stock" >= 0))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promos" (
    "id" "text" NOT NULL,
    "position" "text",
    "is_active" boolean,
    "product_id" "text",
    "title" "jsonb",
    "description" "jsonb",
    "cta" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."promos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text",
    "name" "text",
    "avatar_url" "text",
    "providers" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_admin" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "phone" "text",
    "is_catalog_admin" boolean DEFAULT false NOT NULL,
    "role" "text" DEFAULT 'customer'::"text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_unique_product_per_cart" UNIQUE ("cart_id", "product_id");



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."import_jobs"
    ADD CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_invoice_number_key" UNIQUE ("invoice_number");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_assets"
    ADD CONSTRAINT "media_assets_hash_key" UNIQUE ("hash");



ALTER TABLE ONLY "public"."media_assets"
    ADD CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_assets"
    ADD CONSTRAINT "media_assets_storage_path_key" UNIQUE ("storage_path");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_tracking_events"
    ADD CONSTRAINT "order_tracking_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promos"
    ADD CONSTRAINT "promos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "unique_order_token" UNIQUE ("order_token");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "cart_items_cart_id_idx" ON "public"."cart_items" USING "btree" ("cart_id");



CREATE UNIQUE INDEX "carts_active_guest_idx" ON "public"."carts" USING "btree" ("anonymous_id") WHERE (("status" = 'active'::"text") AND ("anonymous_id" IS NOT NULL));



CREATE UNIQUE INDEX "carts_active_user_idx" ON "public"."carts" USING "btree" ("user_id") WHERE (("status" = 'active'::"text") AND ("user_id" IS NOT NULL));



CREATE INDEX "idx_invoices_issued_at" ON "public"."invoices" USING "btree" ("issued_at");



CREATE INDEX "idx_invoices_order_id" ON "public"."invoices" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_product_id" ON "public"."order_items" USING "btree" ("product_id");



CREATE UNIQUE INDEX "idx_order_token_unique" ON "public"."orders" USING "btree" ("order_token");



CREATE INDEX "idx_order_tracking_events_created_at" ON "public"."order_tracking_events" USING "btree" ("created_at");



CREATE INDEX "idx_order_tracking_events_order_id" ON "public"."order_tracking_events" USING "btree" ("order_id");



CREATE INDEX "idx_order_tracking_events_status" ON "public"."order_tracking_events" USING "btree" ("status");



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at");



CREATE INDEX "idx_orders_order_number" ON "public"."orders" USING "btree" ("order_number");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_user_created" ON "public"."orders" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_orders_user_id" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "idx_tracking_order" ON "public"."order_tracking_events" USING "btree" ("order_id");



CREATE INDEX "idx_tracking_order_created" ON "public"."order_tracking_events" USING "btree" ("order_id", "created_at");



CREATE INDEX "idx_tracking_order_id" ON "public"."order_tracking_events" USING "btree" ("order_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "import_jobs_status_created_at_idx" ON "public"."import_jobs" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "media_assets_created_at_idx" ON "public"."media_assets" USING "btree" ("created_at" DESC);



CREATE UNIQUE INDEX "one_active_cart_per_user" ON "public"."carts" USING "btree" ("user_id") WHERE ("status" = 'active'::"text");



CREATE UNIQUE INDEX "orders_order_number_unique" ON "public"."orders" USING "btree" ("order_number");



CREATE UNIQUE INDEX "orders_order_token_unique" ON "public"."orders" USING "btree" ("order_token");



CREATE UNIQUE INDEX "orders_user_recent_idx" ON "public"."orders" USING "btree" ("user_id", "created_at");



CREATE INDEX "products_active_idx" ON "public"."products" USING "btree" ("is_active");



CREATE INDEX "products_stock_idx" ON "public"."products" USING "btree" ("stock");



CREATE UNIQUE INDEX "uniq_active_cart_per_user" ON "public"."carts" USING "btree" ("user_id") WHERE (("status" = 'active'::"text") AND ("user_id" IS NOT NULL));



CREATE UNIQUE INDEX "uniq_cart_product" ON "public"."cart_items" USING "btree" ("cart_id", "product_id");



CREATE UNIQUE INDEX "unique_product_name_category" ON "public"."products" USING "btree" ("name_ar", "category");



CREATE INDEX "users_email_idx" ON "public"."users" USING "btree" ("email");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "fk_invoices_order" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."order_tracking_events"
    ADD CONSTRAINT "fk_order_tracking_order" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



CREATE POLICY "Admins can view all orders" ON "public"."orders" FOR SELECT TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Allow insert" ON "public"."products" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow insert products" ON "public"."products" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow read products" ON "public"."products" FOR SELECT USING (true);



CREATE POLICY "Customer can read own order items" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_items"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Public can view active products" ON "public"."products" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Users can access their cart" ON "public"."carts" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can access their cart items" ON "public"."cart_items" TO "authenticated" USING (("cart_id" IN ( SELECT "carts"."id"
   FROM "public"."carts"
  WHERE ("carts"."user_id" = "auth"."uid"())))) WITH CHECK (("cart_id" IN ( SELECT "carts"."id"
   FROM "public"."carts"
  WHERE ("carts"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create orders" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own orders" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their orders" ON "public"."orders" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own orders" ON "public"."orders" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their profile" ON "public"."users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their tracking" ON "public"."order_tracking_events" FOR SELECT TO "authenticated" USING (("order_id" IN ( SELECT "orders"."id"
   FROM "public"."orders"
  WHERE ("orders"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view tracking for their orders" ON "public"."order_tracking_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_tracking_events"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view tracking of their orders" ON "public"."order_tracking_events" FOR SELECT TO "authenticated" USING (("order_id" IN ( SELECT "orders"."id"
   FROM "public"."orders"
  WHERE ("orders"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."carts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "catalog_admin_read_invoices" ON "public"."invoices" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_catalog_admin" = true)))));



CREATE POLICY "catalog_admin_read_orders" ON "public"."orders" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_catalog_admin" = true)))));



ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoices_select_own" ON "public"."invoices" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "invoices"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_tracking_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."cart_items";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."order_tracking_events";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."orders";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."products";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."create_order_atomic"("p_user_id" "uuid", "p_items" "jsonb", "p_customer" "jsonb", "p_currency" "text", "p_order_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_order_atomic"("p_user_id" "uuid", "p_items" "jsonb", "p_customer" "jsonb", "p_currency" "text", "p_order_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_order_atomic"("p_user_id" "uuid", "p_items" "jsonb", "p_customer" "jsonb", "p_currency" "text", "p_order_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_order_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_order_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_order_status_change"() TO "service_role";


















GRANT ALL ON TABLE "public"."admin_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."cart_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."carts" TO "anon";
GRANT ALL ON TABLE "public"."carts" TO "authenticated";
GRANT ALL ON TABLE "public"."carts" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."import_jobs" TO "anon";
GRANT ALL ON TABLE "public"."import_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."import_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."media_assets" TO "anon";
GRANT ALL ON TABLE "public"."media_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."media_assets" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."order_tracking_events" TO "anon";
GRANT ALL ON TABLE "public"."order_tracking_events" TO "authenticated";
GRANT ALL ON TABLE "public"."order_tracking_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."orders_order_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."orders_order_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."orders_order_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."promos" TO "anon";
GRANT ALL ON TABLE "public"."promos" TO "authenticated";
GRANT ALL ON TABLE "public"."promos" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































