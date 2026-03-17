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

  badge?: "new" | "sale" | "best";

  stock: number;
  active: boolean;

  createdAt: string;
  updatedAt: string;
};
