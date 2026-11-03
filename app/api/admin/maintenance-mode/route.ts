import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import {
  STORE_MAINTENANCE_CACHE_TAG,
  getStoreMaintenanceSchedule,
  startStoreMaintenance,
  stopStoreMaintenance,
} from "@/lib/server/store-maintenance";
import { createServiceRoleClient } from "@/lib/supabase/runtime";

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

async function writeAudit(input: {
  adminEmail: string | null;
  action: string;
  payload: Record<string, unknown>;
}) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("admin_audit_logs").insert({
    admin_email: input.adminEmail,
    action: input.action,
    entity: "store_maintenance",
    entity_id: "default",
    payload: input.payload,
  });

  if (error) console.error("STORE MAINTENANCE AUDIT ERROR:", error);
}

export async function GET() {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    return noStore({ schedule: await getStoreMaintenanceSchedule() });
  } catch (error) {
    console.error("ADMIN MAINTENANCE STATUS ERROR:", error);
    return noStore({ error: "تعذر تحميل حالة وضع الصيانة." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const body = (await request.json()) as {
      hours?: unknown;
      minutes?: unknown;
    };
    const hours = Number(body.hours);
    const minutes = Number(body.minutes);
    const schedule = await startStoreMaintenance({
      hours,
      minutes,
      updatedBy: guard.access.userEmail,
    });

    revalidateTag(STORE_MAINTENANCE_CACHE_TAG);
    await writeAudit({
      adminEmail: guard.access.userEmail,
      action: "store_maintenance_started",
      payload: { hours, minutes, startsAt: schedule.startsAt, endsAt: schedule.endsAt },
    });

    return noStore({ schedule });
  } catch (error) {
    console.error("ADMIN MAINTENANCE START ERROR:", error);
    return noStore(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر بدء وضع الصيانة.",
      },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const schedule = await stopStoreMaintenance(guard.access.userEmail);

    revalidateTag(STORE_MAINTENANCE_CACHE_TAG);
    await writeAudit({
      adminEmail: guard.access.userEmail,
      action: "store_maintenance_stopped",
      payload: { stoppedAt: schedule.endsAt },
    });

    return noStore({ schedule });
  } catch (error) {
    console.error("ADMIN MAINTENANCE STOP ERROR:", error);
    return noStore({ error: "تعذر إنهاء وضع الصيانة." }, { status: 500 });
  }
}
