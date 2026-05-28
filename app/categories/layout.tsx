import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DEFAULT_OG_IMAGE, SITE_NAME, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "أقسام منتجات السيارات",
  description:
    "استكشف أقسام متجر سيزر: معطرات سيارات، منظفات، إكسسوارات، أدوات، وإضاءة للسيارات.",
  alternates: {
    canonical: "/categories",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "أقسام منتجات السيارات | Cesar Store",
    description:
      "تصفح أقسام متجر سيزر لاختيار منتجات العناية بالسيارات والإكسسوارات المناسبة لك.",
    url: absoluteUrl("/categories"),
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
  twitter: {
    card: "summary_large_image",
    title: "أقسام منتجات السيارات | Cesar Store",
    description:
      "أقسام منتجات سيزر للسيارات: عناية، إكسسوارات، أدوات، معطرات، وإضاءة.",
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
};

export default function CategoriesLayout({ children }: { children: ReactNode }) {
  return children;
}
