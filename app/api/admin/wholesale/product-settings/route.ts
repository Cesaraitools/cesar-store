import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import {
  listWholesaleProductSettings,
  saveWholesaleProductSetting,
} from "@/lib/server/wholesale-product-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const products = await listWholesaleProductSettings();
    return NextResponse.json({ products });
  } catch (error) {
    console.error("ADMIN WHOLESALE PRODUCT SETTINGS ERROR:", error);

    return NextResponse.json(
      { error: "تعذر تحميل إعدادات منتجات الجملة" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const body = (await request.json()) as {
      productId?: string;
      isEnabled?: boolean;
      wholesalePrice?: number;
      minOrderUnits?: number;
      notes?: string | null;
    };

    const setting = await saveWholesaleProductSetting({
      productId: body.productId || "",
      isEnabled: Boolean(body.isEnabled),
      wholesalePrice: Number(body.wholesalePrice || 0),
      unitType: "piece",
      unitLabel: "قطعة",
      quantityPerUnit: 1,
      minOrderUnits: Number(body.minOrderUnits || 1),
      notes: body.notes || null,
    });

    return NextResponse.json({ setting });
  } catch (error) {
    console.error("ADMIN WHOLESALE PRODUCT SETTING SAVE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر حفظ إعدادات منتج الجملة",
      },
      { status: 400 }
    );
  }
}
