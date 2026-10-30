import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { createServiceRoleClient } from "@/lib/supabase/runtime";
import {
  getPublisherOverview,
  queueProductPosts,
  runPublisherWorker,
  updatePublisherSettings,
  updateQueueItem,
} from "@/lib/server/social-publisher";
import type { SocialPlatform } from "@/lib/server/social-publisher/types";

export const dynamic = "force-dynamic";

function noStore(payload: unknown, init?: ResponseInit) {
  return NextResponse.json(payload, {
    ...init,
    headers: {
      ...init?.headers,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
async function writeAdminAudit(input: {
  adminEmail: string | null;
  action: string;
  entityId?: string | null;
  payload?: Record<string, unknown>;
}) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("admin_audit_logs").insert({
    admin_email: input.adminEmail,
    action: input.action,
    entity: "social_publisher",
    entity_id: input.entityId || null,
    payload: input.payload || {},
  });

  if (error) console.error("SOCIAL PUBLISHER AUDIT ERROR:", error);
}

export async function GET() {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    return noStore(await getPublisherOverview());
  } catch (error) {
    console.error("SOCIAL PUBLISHER OVERVIEW ERROR:", error);
    return noStore({ error: "تعذر تحميل لوحة النشر التلقائي." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const settings = await updatePublisherSettings({
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      mode: body.mode === "live" || body.mode === "draft" ? body.mode : undefined,
      facebook_enabled:
        typeof body.facebook_enabled === "boolean" ? body.facebook_enabled : undefined,
      instagram_enabled:
        typeof body.instagram_enabled === "boolean" ? body.instagram_enabled : undefined,
      auto_queue_enabled:
        typeof body.auto_queue_enabled === "boolean" ? body.auto_queue_enabled : undefined,
      min_stock: typeof body.min_stock === "number" ? body.min_stock : undefined,
      repeat_cooldown_days:
        typeof body.repeat_cooldown_days === "number"
          ? body.repeat_cooldown_days
          : undefined,
      daily_post_limit:
        typeof body.daily_post_limit === "number" ? body.daily_post_limit : undefined,
      posting_times: Array.isArray(body.posting_times)
        ? body.posting_times.map(String)
        : undefined,
    });

    await writeAdminAudit({
      adminEmail: guard.access.userEmail,
      action: "social_publisher_settings_updated",
      payload: {
        enabled: settings.enabled,
        mode: settings.mode,
        facebookEnabled: settings.facebook_enabled,
        instagramEnabled: settings.instagram_enabled,
      },
    });

    return noStore({ settings });
  } catch (error) {
    console.error("SOCIAL PUBLISHER SETTINGS ERROR:", error);
    return noStore(
      { error: error instanceof Error ? error.message : "تعذر حفظ الإعدادات." },
      { status: 400 }
    );
  }
}
export async function POST(request: Request) {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action || "");

    if (action === "queue") {
      const platforms = (Array.isArray(body.platforms) ? body.platforms : []).filter(
        (platform): platform is SocialPlatform =>
          platform === "facebook" || platform === "instagram"
      );
      const rows = await queueProductPosts({
        productId: String(body.productId || ""),
        platforms,
        scheduledFor: String(body.scheduledFor || ""),
        status: body.status === "queued" ? "queued" : "draft",
        createdBy: guard.access.userEmail,
      });

      await writeAdminAudit({
        adminEmail: guard.access.userEmail,
        action: "social_posts_created",
        entityId: rows[0]?.id || null,
        payload: { count: rows.length, productId: body.productId, platforms },
      });

      return noStore({ rows }, { status: 201 });
    }

    if (action === "approve" || action === "cancel" || action === "retry") {
      const row = await updateQueueItem({
        queueId: String(body.queueId || ""),
        action,
        actor: guard.access.userEmail,
      });

      await writeAdminAudit({
        adminEmail: guard.access.userEmail,
        action: `social_post_${action}`,
        entityId: row.id,
        payload: { platform: row.platform, status: row.status },
      });

      return noStore({ row });
    }

    if (action === "run") {
      const result = await runPublisherWorker({ maxPosts: 4 });
      await writeAdminAudit({
        adminEmail: guard.access.userEmail,
        action: "social_publisher_manual_run",
        payload: { result },
      });
      return noStore({ result });
    }

    return noStore({ error: "إجراء غير معروف." }, { status: 400 });
  } catch (error) {
    console.error("SOCIAL PUBLISHER ACTION ERROR:", error);
    return noStore(
      { error: error instanceof Error ? error.message : "تعذر تنفيذ الإجراء." },
      { status: 400 }
    );
  }
}
