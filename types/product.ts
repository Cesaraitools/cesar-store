export type Product = {
  id: string;

  name: {
    ar: string;
    en: string;
  };

  description: {
    ar: string;
    en: string;
  };

  price: number;
  category: string;
  images: string[];

  variantOptions?: ProductVariantOption[];
  variants?: ProductVariant[];

  badge?: "new" | "sale" | "best";

  stock: number;
  active: boolean;

low_stock_threshold?: number;

  createdAt: string;
  updatedAt: string;
};

export type ProductVariantOptionValue = {
  id: string;
  label: {
    ar: string;
    en: string;
  };
};

export type ProductVariantOption = {
  id: string;
  name: {
    ar: string;
    en: string;
  };
  values: ProductVariantOptionValue[];
};

export type ProductVariant = {
  id: string;
  key: string;
  selections: Record<string, string>;
  price?: number | null;
  stock?: number | null;
  image?: string | null;
  active?: boolean;
};

export type ProductVariantSnapshot = {
  key: string;
  label_ar: string;
  label_en: string;
  selected_options: Array<{
    option_id: string;
    option_name_ar: string;
    option_name_en: string;
    value_id: string;
    value_ar: string;
    value_en: string;
  }>;
};
