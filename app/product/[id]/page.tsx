import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ProductPageClient from "./ProductPageClient";
import {
  getActiveCategories,
  getActiveProductById,
} from "@/lib/server/catalog";
import {
  SITE_URL,
  absoluteUrl,
  compactText,
  getCategorySeo,
} from "@/lib/seo";
import { getSafeImage } from "@/lib/image-safe";
import { gtinStructuredData } from "@/lib/product-identifiers";
import {
  createVariantSnapshot,
  getVariantDisplayImage,
  getVariantDisplayPrice,
  getVariantDisplayStock,
  getProductVariants,
} from "@/lib/product-variants";
import { getSeoProductDescription } from "@/lib/product-seo-description";
import { isStoreMaintenanceActive } from "@/lib/store-maintenance";
import { getCachedStoreMaintenanceSchedule } from "@/lib/server/store-maintenance";

type Props = {
  params: { id: string };
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getActiveProductById(params.id);

  if (!product) {
    return {
      title: "المنتج غير متاح حاليًا",
      description:
        "هذا المنتج غير متاح حاليًا في متجر سيزر. تصفح المنتجات والأقسام المتاحة للوصول إلى بديل مناسب.",
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const title = product.name.ar || product.name.en;
  const description = compactText(getSeoProductDescription(product, "ar"));
  const image = absoluteUrl(getSafeImage(product.images[0]));
  const url = absoluteUrl(`/product/${product.id}`);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      images: [
        {
          url: image,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const [product, categories, maintenanceSchedule] = await Promise.all([
    getActiveProductById(params.id),
    getActiveCategories().catch((error) => {
      console.error("PRODUCT CATEGORIES ERROR:", error);
      return [];
    }),
    getCachedStoreMaintenanceSchedule(),
  ]);

  if (!product) {
    notFound();
  }

  const title = product.name.ar || product.name.en;
  const description = getSeoProductDescription(product, "ar");
  const images = product.images.length
    ? product.images.map((image) => absoluteUrl(getSafeImage(image)))
    : [absoluteUrl(getSafeImage())];
  const productUrl = absoluteUrl(`/product/${product.id}`);
  const categorySeo = getCategorySeo(product.category);
  const maintenanceActive = isStoreMaintenanceActive(maintenanceSchedule);
  const commonStructuredData = {
    "@context": "https://schema.org",
    name: title,
    description: compactText(description, 500),
    image: images,
    url: productUrl,
    category: categorySeo?.titleAr || product.category,
    ...(categorySeo && {
      isRelatedTo: {
        "@type": "CollectionPage",
        name: categorySeo.titleAr,
        url: absoluteUrl(categorySeo.guidePath),
      },
    }),
    ...(product.brand && {
      brand: {
        "@type": "Brand",
        name: product.brand,
      },
    }),
    ...(product.manufacturer && {
      manufacturer: {
        "@type": "Organization",
        name: product.manufacturer,
      },
    }),
    ...(product.model && { model: product.model }),
  };
  const offerFor = (price: number, stock: number, url: string) => ({
    "@type": "Offer",
    url,
    priceCurrency: "EGP",
    price,
    availability:
      stock > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    seller: {
      "@id": `${SITE_URL}/#store`,
    },
  });
  const activeVariants = getProductVariants(product).filter(
    (variant) => variant.active !== false
  );
  const variesBy = Array.from(
    new Set(
      (product.variantOptions || []).flatMap((option) => {
        const name = `${option.id} ${option.name.ar} ${option.name.en}`.toLowerCase();
        if (name.includes("لون") || name.includes("color")) {
          return ["https://schema.org/color"];
        }
        if (name.includes("مقاس") || name.includes("size")) {
          return ["https://schema.org/size"];
        }
        if (name.includes("خامة") || name.includes("خامه") || name.includes("material")) {
          return ["https://schema.org/material"];
        }
        if (name.includes("نمط") || name.includes("pattern")) {
          return ["https://schema.org/pattern"];
        }
        return [];
      })
    )
  );
  const productStructuredData = activeVariants.length
    ? {
        ...commonStructuredData,
        "@type": "ProductGroup",
        "@id": `${productUrl}#product-group`,
        productGroupID: product.id,
        ...(variesBy.length > 0 && { variesBy }),
        hasVariant: activeVariants.map((variant, index) => {
          const snapshot = createVariantSnapshot(
            product.variantOptions || [],
            variant.selections
          );
          const variantLabel = snapshot.label_ar || snapshot.label_en;
          const variantUrl = `${productUrl}?variant=${encodeURIComponent(variant.key)}`;
          const variantImage = absoluteUrl(
            getSafeImage(getVariantDisplayImage(product, variant))
          );

          return {
            "@type": "Product",
            "@id": `${productUrl}#variant-${index + 1}`,
            name: variantLabel ? `${title} - ${variantLabel}` : title,
            description: compactText(description, 500),
            image: [variantImage, ...images.filter((image) => image !== variantImage)],
            sku: `${product.id}-${variant.id}`,
            url: variantUrl,
            isVariantOf: { "@id": `${productUrl}#product-group` },
            additionalProperty: snapshot.selected_options.map((selection) => ({
              "@type": "PropertyValue",
              name: selection.option_name_ar || selection.option_name_en,
              value: selection.value_ar || selection.value_en,
            })),
            ...(!maintenanceActive && {
              offers: offerFor(
                getVariantDisplayPrice(product, variant),
                getVariantDisplayStock(product, variant),
                variantUrl
              ),
            }),
          };
        }),
      }
    : {
        ...commonStructuredData,
        "@type": "Product",
        "@id": `${productUrl}#product`,
        sku: product.id,
        ...(product.mpn && { mpn: product.mpn }),
        ...gtinStructuredData(product.gtin),
        ...(!maintenanceActive && {
          offers: offerFor(product.price, product.stock, productUrl),
        }),
      };
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Cesar Store",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Shop",
        item: absoluteUrl("/shop"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: title,
        item: productUrl,
      },
    ],
  };

  return (
    <>
      <script
        id="product-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      <script
        id="product-breadcrumb-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      <ProductPageClient product={product} categories={categories} />
    </>
  );
}
