// =====================================================
// Admin Analytics API (READ-ONLY)
// Project: Cesar Store
// Route: /api/admin/analytics
// Method: GET
// =====================================================
// DATA SOURCES (VIEWS):
// - analytics_volume
// - analytics_orders_per_day
// - analytics_financial_totals
// - analytics_revenue_per_day
// - analytics_lifecycle_durations
// - analytics_reliability
// - analytics_orders_multiple_versions
// - analytics_orders_index
//
// RULES:
// - Read-only
// - No mutations
// - No background jobs
// - No realtime
// - Filters applied safely
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const dateFrom = searchParams.get("from");
    const dateTo = searchParams.get("to");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // -------------------------------------------------
    // Volume
    // -------------------------------------------------
    const { data: volume, error: volumeError } =
      await supabase.from("analytics_volume").select("*").single();

    if (volumeError) throw volumeError;

    // -------------------------------------------------
    // Orders Per Day (Date Filter)
    // -------------------------------------------------
    let ordersPerDayQuery = supabase
      .from("analytics_orders_per_day")
      .select("*");

    if (dateFrom) {
      ordersPerDayQuery = ordersPerDayQuery.gte("day", dateFrom);
    }
    if (dateTo) {
      ordersPerDayQuery = ordersPerDayQuery.lte("day", dateTo);
    }

    const { data: ordersPerDay, error: opdError } =
      await ordersPerDayQuery;

    if (opdError) throw opdError;

    // -------------------------------------------------
    // Financial Totals
    // -------------------------------------------------
    const { data: financials, error: finError } =
      await supabase.from("analytics_financial_totals").select("*");

    if (finError) throw finError;

    // -------------------------------------------------
    // Revenue Per Day (Date Filter)
    // -------------------------------------------------
    let revenuePerDayQuery = supabase
      .from("analytics_revenue_per_day")
      .select("*");

    if (dateFrom) {
      revenuePerDayQuery = revenuePerDayQuery.gte("day", dateFrom);
    }
    if (dateTo) {
      revenuePerDayQuery = revenuePerDayQuery.lte("day", dateTo);
    }

    const { data: revenuePerDay, error: rpdError } =
      await revenuePerDayQuery;

    if (rpdError) throw rpdError;

    // -------------------------------------------------
    // Lifecycle Durations
    // -------------------------------------------------
    const { data: lifecycle, error: lifecycleError } =
      await supabase.from("analytics_lifecycle_durations").select("*");

    if (lifecycleError) throw lifecycleError;

    // -------------------------------------------------
    // Reliability
    // -------------------------------------------------
    const { data: reliability, error: relError } =
      await supabase.from("analytics_reliability").select("*").single();

    if (relError) throw relError;

    // -------------------------------------------------
    // Orders With Multiple Versions
    // -------------------------------------------------
    const { data: multipleVersions, error: mvError } =
      await supabase.from("analytics_orders_multiple_versions").select("*");

    if (mvError) throw mvError;

    // -------------------------------------------------
    // Orders Index (Filters: status / search / date)
    // -------------------------------------------------
    let ordersIndexQuery = supabase
      .from("analytics_orders_index")
      .select("*");

    if (status) {
      ordersIndexQuery = ordersIndexQuery.eq("current_status", status);
    }

    if (search) {
      ordersIndexQuery = ordersIndexQuery.or(
        `order_number.ilike.%${search}%,user_id.ilike.%${search}%`
      );
    }

    if (dateFrom) {
      ordersIndexQuery = ordersIndexQuery.gte("created_at", dateFrom);
    }

    if (dateTo) {
      ordersIndexQuery = ordersIndexQuery.lte("created_at", dateTo);
    }

    const { data: ordersIndex, error: oiError } =
      await ordersIndexQuery;

    if (oiError) throw oiError;

    // -------------------------------------------------
    // Response (Analytics Data Contract)
    // -------------------------------------------------
    return NextResponse.json({
      volume,
      ordersPerDay,
      financials,
      revenuePerDay,
      lifecycle,
      reliability,
      multipleVersions,
      ordersIndex,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Analytics fetch failed",
        details: error.message ?? error,
      },
      { status: 500 }
    );
  }
}