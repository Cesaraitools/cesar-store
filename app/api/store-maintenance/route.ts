import { NextResponse } from "next/server";
import { getStoreMaintenanceSchedule } from "@/lib/server/store-maintenance";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const schedule = await getStoreMaintenanceSchedule();

    return NextResponse.json(
      {
        serverNow: Date.now(),
        schedule: {
          enabled: schedule.enabled,
          startsAt: schedule.startsAt,
          endsAt: schedule.endsAt,
          updatedAt: schedule.updatedAt,
        },
      },
      {
        headers: {
          "Cache-Control": "public, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("STORE MAINTENANCE STATUS ERROR:", error);
    return NextResponse.json(
      { error: "Unable to load maintenance status." },
      {
        status: 503,
        headers: { "Cache-Control": "public, no-store, max-age=0" },
      }
    );
  }
}
