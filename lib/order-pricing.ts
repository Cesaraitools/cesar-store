export const SHIPPING_STATUSES = ["pending", "set", "waived", "legacy"] as const;

export type ShippingStatus = (typeof SHIPPING_STATUSES)[number];

export function isShippingStatus(value: unknown): value is ShippingStatus {
  return (
    typeof value === "string" &&
    SHIPPING_STATUSES.includes(value as ShippingStatus)
  );
}

export function shippingStatusLabel(status: ShippingStatus) {
  switch (status) {
    case "set":
      return "تم تحديد الشحن";
    case "waived":
      return "شحن مجاني";
    case "legacy":
      return "بيانات شحن تاريخية";
    default:
      return "جاري تحديد الشحن";
  }
}

export function formatOrderMoney(value: number, currency = "EGP") {
  return `${Number(value || 0).toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}
