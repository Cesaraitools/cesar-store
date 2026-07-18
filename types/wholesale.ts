export type WholesaleApplicationStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected";

export type WholesaleCustomerStatus =
  | "pending_account"
  | "active"
  | "suspended";

export type WholesaleOrderStatus =
  | "requested"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "canceled";

export type WholesaleUnitType =
  | "carton"
  | "piece"
  | "liter"
  | "meter"
  | "set"
  | "box"
  | "pack"
  | "custom";

export type WholesaleEntityType = "shop" | "distributor" | "company" | "other";

export type WholesaleDocumentType =
  | "national_id_front"
  | "national_id_back"
  | "tax_card_front"
  | "tax_card_back"
  | "commercial_register";

export type WholesaleApplicationDocument = {
  type: WholesaleDocumentType;
  label: string;
  fileName: string;
  mimeType: string;
  size: number;
  storagePath: string;
};

export type WholesaleApplication = {
  id: string;
  businessName: string;
  entityType: WholesaleEntityType;
  contactName: string;
  phone: string;
  whatsapp: string;
  email: string | null;
  governorate: string;
  city: string;
  address: string | null;
  taxNumber: string | null;
  commercialRegisterNumber: string | null;
  notes: string | null;
  documents: WholesaleApplicationDocument[];
  status: WholesaleApplicationStatus;
  reviewNotes: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  wholesaleCustomer?: {
    id: string;
    status: WholesaleCustomerStatus;
    authUserId: string | null;
    approvedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type WholesaleProductSetting = {
  id: string;
  productId: string;
  isEnabled: boolean;
  wholesalePrice: number;
  unitType: WholesaleUnitType;
  unitLabel: string;
  quantityPerUnit: number;
  minOrderUnits: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WholesaleProductSettingProduct = {
  id: string;
  name: {
    ar: string;
    en: string;
  };
  category: string;
  retailPrice: number;
  stock: number;
  active: boolean;
  image: string | null;
  setting: WholesaleProductSetting | null;
};

export type WholesaleCatalogAccess = {
  signedIn: boolean;
  canViewPrices: boolean;
  wholesaleStatus: WholesaleCustomerStatus | null;
};

export type WholesaleCatalogProduct = {
  id: string;
  name: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  category: string;
  stock: number;
  image: string | null;
  priceVisible: boolean;
  wholesalePrice: number | null;
  unitType: WholesaleUnitType | null;
  unitLabel: string | null;
  quantityPerUnit: number | null;
  minOrderUnits: number | null;
  notes: string | null;
  variantOptions?: import("@/types/product").ProductVariantOption[];
  variants?: import("@/types/product").ProductVariant[];
};

export type WholesaleCartItem = {
  productId: string;
  orderedUnits: number;
  variantKey?: string;
  variant?: import("@/types/product").ProductVariantSnapshot | null;
};

export type WholesaleOrderItem = {
  id: string;
  productId: string;
  productNameAr: string;
  productNameEn: string;
  image: string | null;
  variantKey?: string;
  variant?: import("@/types/product").ProductVariantSnapshot | null;
  unitType: WholesaleUnitType;
  unitLabel: string;
  quantityPerUnit: number;
  minOrderUnits: number;
  orderedUnits: number;
  unitPrice: number;
  lineTotal: number;
  stockSnapshot: number;
  returnedUnits: number;
};

export type WholesaleOrderReturn = {
  id: string;
  returnNumber: string;
  orderId: string;
  orderItemId: string;
  productId: string;
  returnedUnits: number;
  reason: string;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type WholesaleAdminCustomer = {
  id: string;
  applicationId: string | null;
  businessName: string;
  entityType: WholesaleEntityType;
  contactName: string;
  phone: string;
  whatsapp: string;
  email: string | null;
  governorate: string;
  city: string;
  address: string | null;
  taxNumber: string | null;
  commercialRegisterNumber: string | null;
  status: WholesaleCustomerStatus;
  authUserId: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WholesaleAdminReturn = WholesaleOrderReturn & {
  orderNumber: string;
  orderStatus: WholesaleOrderStatus;
  orderCreatedAt: string;
  customerSnapshot: Record<string, unknown>;
  productNameAr: string;
  productNameEn: string;
  variantKey?: string;
  variant?: import("@/types/product").ProductVariantSnapshot | null;
  unitPrice: number;
  lineTotal: number;
};

export type WholesaleOrder = {
  id: string;
  orderNumber: string;
  wholesaleCustomerId: string;
  authUserId: string;
  status: WholesaleOrderStatus;
  subtotal: number;
  currency: string;
  notes: string | null;
  customerSnapshot: Record<string, unknown>;
  items: WholesaleOrderItem[];
  returns: WholesaleOrderReturn[];
  stockDeductedAt?: string | null;
  stockRestoredAt?: string | null;
  createdAt: string;
  updatedAt: string;
};
