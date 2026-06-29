import { NextResponse } from "next/server";
import { getWholesaleCustomerForAuthUser } from "@/lib/server/wholesale-applications";
import { getWholesaleCatalogProductById } from "@/lib/server/wholesale-product-settings";
import { rateLimit } from "@/lib/rateLimit";
import { createClient } from "@/lib/supabase/server";
import type { WholesaleCatalogAccess } from "@/types/wholesale";

export const dynamic = "force-dynamic";

function getRequestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await rateLimit(`${getRequestIp(request)}:wholesale-catalog-item:get`, 80, 60000))) {
      return NextResponse.json({ error: "طلبات كثيرة خلال وقت قصير. حاول مرة أخرى بعد لحظات." }, { status: 429 });
    }

    const access: WholesaleCatalogAccess = {
      signedIn: false,
      canViewPrices: false,
      wholesaleStatus: null,
    };

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

    const product = access.canViewPrices
      ? await getWholesaleCatalogProductById(params.id, { includePrices: true })
      : null;

    if (access.canViewPrices && !product) {
      return NextResponse.json(
        { error: "لم يتم العثور على المنتج في كتالوج الجملة" },
        { status: 404 }
      );
    }

    return NextResponse.json({ product, access });
  } catch (error) {
    console.error("WHOLESALE CATALOG ITEM ERROR:", error);

    return NextResponse.json(
      { error: "تعذر تحميل بيانات منتج الجملة" },
      { status: 500 }
    );
  }
}
