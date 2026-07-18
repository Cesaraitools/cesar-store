import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { listWholesaleApplications } from "@/lib/server/wholesale-applications";
import { listWholesaleOrdersForAdmin } from "@/lib/server/wholesale-orders";
import { listWholesaleProductSettings } from "@/lib/server/wholesale-product-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const [applications, orders, products] = await Promise.all([
      listWholesaleApplications(),
      listWholesaleOrdersForAdmin({ status: "all", query: "" }),
      listWholesaleProductSettings(),
    ]);

    const returnedUnits = orders.reduce(
      (total, order) =>
        total +
        order.returns.reduce(
          (orderTotal, itemReturn) => orderTotal + itemReturn.returnedUnits,
          0
        ),
      0
    );
    const deliveredOrders = orders.filter((order) => order.status === "delivered");
    const canceledOrders = orders.filter((order) => order.status === "canceled");
    const enabledProducts = products.filter(
      (product) => product.setting?.isEnabled ?? true
    );
    const missingPriceProducts = products.filter((product) => {
      const enabled = product.setting?.isEnabled ?? true;
      return enabled && Number(product.setting?.wholesalePrice || 0) <= 0;
    });

    return NextResponse.json({
      summary: {
        applications: {
          total: applications.length,
          pending: applications.filter((item) => item.status === "pending").length,
          underReview: applications.filter(
            (item) => item.status === "under_review"
          ).length,
          approved: applications.filter((item) => item.status === "approved").length,
          rejected: applications.filter((item) => item.status === "rejected").length,
        },
        orders: {
          total: orders.length,
          requested: orders.filter((order) => order.status === "requested").length,
          delivered: deliveredOrders.length,
          canceled: canceledOrders.length,
          revenue: orders.reduce((total, order) => total + order.subtotal, 0),
          deliveredRevenue: deliveredOrders.reduce(
            (total, order) => total + order.subtotal,
            0
          ),
          averageOrderValue:
            orders.length > 0
              ? orders.reduce((total, order) => total + order.subtotal, 0) /
                orders.length
              : 0,
        },
        returns: {
          records: orders.reduce((total, order) => total + order.returns.length, 0),
          returnedUnits,
        },
        products: {
          total: products.length,
          enabled: enabledProducts.length,
          disabled: products.length - enabledProducts.length,
          missingPrice: missingPriceProducts.length,
          outOfStock: products.filter((product) => product.stock <= 0).length,
        },
      },
    });
  } catch (error) {
    console.error("ADMIN WHOLESALE SUMMARY ERROR:", error);

    return NextResponse.json(
      { error: "تعذر تحميل ملخص إدارة الجملة" },
      { status: 500 }
    );
  }
}
