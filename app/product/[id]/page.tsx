import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ProductPageClient from "./ProductPageClient";
import {
  getActiveCategories,
  getActiveProductById,
} from "@/lib/server/catalog";
import { absoluteUrl, compactText } from "@/lib/seo";
import { getSafeImage } from "@/lib/image-safe";
import { getSeoProductDescription } from "@/lib/product-seo-description";

type Props = {
  params: { id: string };
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getActiveProductById(params.id);

  if (!product) {
    return {
      title: "المنتج غير موجود",
      robots: {
        index: false,
        follow: false,
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
  const [product, categories] = await Promise.all([
    getActiveProductById(params.id),
    getActiveCategories(),
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
  const productStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: title,
    description: compactText(description, 500),
    image: images,
    sku: product.id,
    url: productUrl,
    category: product.category,
    brand: {
      "@type": "Brand",
      name: "Cesar Store",
    },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "EGP",
      price: product.price,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: 70,
          currency: "EGP",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "EG",
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "EG",
        returnPolicyCategory:
          "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 14,
        returnFees: "https://schema.org/FreeReturn",
        returnMethod: "https://schema.org/ReturnByMail",
      },
    },
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
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([productStructuredData, breadcrumbStructuredData]).replace(
            /</g,
            "\\u003c"
          ),
        }}
      />
      <ProductPageClient product={product} categories={categories} />
    </>
  );
}
