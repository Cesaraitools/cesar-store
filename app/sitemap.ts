import type { MetadataRoute } from "next";

import { getActiveProducts } from "@/lib/server/catalog";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/shop"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/categories"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/return-policy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/faq"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  let productRoutes: MetadataRoute.Sitemap = [];

  try {
    const products = await getActiveProducts(1000);

    productRoutes = products.map((product) => ({
      url: absoluteUrl(`/product/${product.id}`),
      lastModified: new Date(product.updatedAt || product.createdAt),
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch (error) {
    console.error("SITEMAP PRODUCTS ERROR:", error);
  }

  return [...staticRoutes, ...productRoutes];
}
