import type { MetadataRoute } from "next";

import { getActiveProducts } from "@/lib/server/catalog";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/shop"),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/wholesale"),
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: absoluteUrl("/categories"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/about"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/contact"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/shipping"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/ordering-guide"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/car-care"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/car-air-fresheners"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/car-cleaning-products"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/car-accessories"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/car-lighting-tools"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/car-tools-equipment"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/car-fluids-additives"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/return-policy"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/terms-of-service"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/faq"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/search-guide"),
      changeFrequency: "monthly",
      priority: 0.7,
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
