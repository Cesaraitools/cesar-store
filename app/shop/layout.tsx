import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DEFAULT_OG_IMAGE, SITE_NAME, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "تسوق منتجات السيارات",
  description:
    "تسوق منتجات سيزر للعناية بالسيارات، معطرات، منظفات، إكسسوارات، أدوات، وإضاءة سيارات داخل مصر.",
  alternates: {
    canonical: "/shop",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "تسوق منتجات السيارات | Cesar Store",
    description:
      "اكتشف منتجات سيزر للعناية بالسيارات والإكسسوارات المختارة بعناية داخل مصر.",
    url: absoluteUrl("/shop"),
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
  twitter: {
    card: "summary_large_image",
    title: "تسوق منتجات السيارات | Cesar Store",
    description:
      "منتجات وإكسسوارات سيارات مختارة بعناية من متجر سيزر داخل مصر.",
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
};

export default function ShopLayout({ children }: { children: ReactNode }) {
  return children;
}
