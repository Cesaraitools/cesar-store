import { NextResponse } from "next/server";
import { getWholesaleCustomerForAuthUser } from "@/lib/server/wholesale-applications";
import { listWholesaleCatalogProducts } from "@/lib/server/wholesale-product-settings";
import { createClient } from "@/lib/supabase/server";
import type { WholesaleCatalogAccess } from "@/types/wholesale";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const access: WholesaleCatalogAccess = {
      signedIn: false,
      canViewPrices: false,
      wholesaleStatus: null,
    };

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        access.signedIn = true;
        const wholesaleCustomer = await getWholesaleCustomerForAuthUser(user.id);
        access.wholesaleStatus = wholesaleCustomer?.status ?? null;
        access.canViewPrices = wholesaleCustomer?.status === "active";
      }
    } catch (authError) {
      console.warn("WHOLESALE CATALOG AUTH CHECK WARNING:", authError);
    }

    const products = access.canViewPrices
      ? await listWholesaleCatalogProducts({
          includePrices: true,
        })
      : [];

    return NextResponse.json({ products, access });
  } catch (error) {
    console.error("WHOLESALE CATALOG ERROR:", error);

    return NextResponse.json(
      { error: "تعذر تحميل كتالوج الجملة" },
      { status: 500 }
    );
  }
}
