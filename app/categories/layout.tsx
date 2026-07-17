import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DEFAULT_OG_IMAGE, SITE_NAME, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "أقسام منتجات السيارات",
  description:
    "تصفح أقسام متجر سيزر لمنتجات السيارات في مصر، واكتشف المعطرات، المنظفات، الإكسسوارات، أدوات الطوارئ، الإضاءة، وسوائل العناية المناسبة لسيارتك.",
  alternates: {
    canonical: "/categories",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "أقسام منتجات السيارات | Cesar Store",
    description:
      "استكشف أقسام Cesar Store لاختيار منتجات العناية بالسيارات، المعطرات، المنظفات، الإكسسوارات، الأدوات، الإضاءة، والسوائل داخل مصر.",
    url: absoluteUrl("/categories"),
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
  twitter: {
    card: "summary_large_image",
    title: "أقسام منتجات السيارات | Cesar Store",
    description:
      "أقسام متجر سيزر تساعدك على الوصول بسرعة إلى منتجات العناية بالسيارات، الإكسسوارات، المعطرات، الأدوات، الإضاءة، والسوائل.",
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
};

export default function CategoriesLayout({ children }: { children: ReactNode }) {
  return children;
}
