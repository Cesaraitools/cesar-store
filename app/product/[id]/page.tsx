import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ProductPageClient from "./ProductPageClient";
import {
  getActiveCategories,
  getActiveProductById,
} from "@/lib/server/catalog";
import { absoluteUrl, compactText } from "@/lib/seo";
import { getSafeImage } from "@/lib/image-safe";

type Props = {
  params: { id: string };
};

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
  const description = compactText(
    product.description.ar ||
      product.description.en ||
      `${title} من متجر سيزر لمنتجات وإكسسوارات السيارات في مصر.`
  );
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
  const description =
    product.description.ar ||
    product.description.en ||
    `${title} من متجر سيزر لمنتجات وإكسسوارات السيارات في مصر.`;
  const images = product.images.length
    ? product.images.map((image) => absoluteUrl(getSafeImage(image)))
    : [absoluteUrl(getSafeImage())];
  const productUrl = absoluteUrl(`/product/${product.id}`);
  const productStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description: compactText(description, 500),
    image: images,
    sku: product.id,
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
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      <ProductPageClient product={product} categories={categories} />
    </>
  );
}
