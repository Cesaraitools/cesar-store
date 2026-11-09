import { unstable_cache } from "next/cache";
import {
  createServiceRoleClient,
  createUncachedServiceRoleClient,
} from "@/lib/supabase/runtime";
import {
  validateStoreMaintenanceDuration,
  type StoreMaintenanceSchedule,
} from "@/lib/store-maintenance";

export const STORE_MAINTENANCE_CACHE_TAG = "store-maintenance";
type StoreMaintenanceRow = {
  enabled: boolean;
  starts_at: string | null;
  ends_at: string | null;
  updated_at: string | null;
  updated_by: string | null;
};

export type AdminStoreMaintenanceSchedule = StoreMaintenanceSchedule & {
  updatedBy: string | null;
};

function mapRow(row: StoreMaintenanceRow): AdminStoreMaintenanceSchedule {
  return {
    enabled: row.enabled,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

export async function getStoreMaintenanceSchedule(): Promise<AdminStoreMaintenanceSchedule> {
  const supabase = createUncachedServiceRoleClient();
  const { data, error } = await supabase
    .from("store_maintenance_settings")
    .select("enabled, starts_at, ends_at, updated_at, updated_by")
    .eq("id", "default")
    .single();

  if (error) {
    throw new Error(`Unable to load store maintenance settings: ${error.message}`);
  }

  return mapRow(data as StoreMaintenanceRow);
}

export const getCachedStoreMaintenanceSchedule = unstable_cache(
  async () => getStoreMaintenanceSchedule(),
  ["store-maintenance-schedule"],
  {
    revalidate: 5,
    tags: [STORE_MAINTENANCE_CACHE_TAG],
  }
);

export async function startStoreMaintenance(input: {
  hours: number;
  minutes: number;
  updatedBy: string | null;
}) {
  const durationMinutes = validateStoreMaintenanceDuration(
    input.hours,
    input.minutes
  );
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("store_maintenance_settings")
    .upsert(
      {
        id: "default",
        enabled: true,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        updated_at: startsAt.toISOString(),
        updated_by: input.updatedBy,
      },
      { onConflict: "id" }
    )
    .select("enabled, starts_at, ends_at, updated_at, updated_by")
    .single();

  if (error) {
    throw new Error(`Unable to start store maintenance: ${error.message}`);
  }

  return mapRow(data as StoreMaintenanceRow);
}

export async function stopStoreMaintenance(updatedBy: string | null) {
  const stoppedAt = new Date().toISOString();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("store_maintenance_settings")
    .update({
      enabled: false,
      ends_at: stoppedAt,
      updated_at: stoppedAt,
      updated_by: updatedBy,
    })
    .eq("id", "default")
    .select("enabled, starts_at, ends_at, updated_at, updated_by")
    .single();

  if (error) {
    throw new Error(`Unable to stop store maintenance: ${error.message}`);
  }

  return mapRow(data as StoreMaintenanceRow);
}
