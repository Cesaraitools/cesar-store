"use client";

import { useEffect, useState } from "react";
import {
  createEmptyPromo,
  type PromoData,
  type PromoPosition,
} from "@/types/promo";

const POSITIONS: Array<{
  position: PromoPosition;
  title: string;
  subtitle: string;
}> = [
  {
    position: "categories_side",
    title: "Categories Side Banner",
    subtitle: "Existing banner used on categories page.",
  },
  {
    position: "shop_left",
    title: "Shop Left Ad Block",
    subtitle: "Left-side animated promo block beside the products grid.",
  },
  {
    position: "shop_right",
    title: "Shop Right Ad Block",
    subtitle: "Right-side animated promo block beside the products grid.",
  },
];

function createInitialPromos() {
  return {
    categories_side: createEmptyPromo("categories_side"),
    shop_left: createEmptyPromo("shop_left"),
    shop_right: createEmptyPromo("shop_right"),
  } as Record<PromoPosition, PromoData>;
}

function createBooleanState() {
  return {
    categories_side: false,
    shop_left: false,
    shop_right: false,
  } as Record<PromoPosition, boolean>;
}

function createErrorState() {
  return {
    categories_side: "",
    shop_left: "",
    shop_right: "",
  } as Record<PromoPosition, string>;
}

export default function PromosAdminPage() {
  const [promos, setPromos] = useState<Record<PromoPosition, PromoData>>(
    createInitialPromos()
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<PromoPosition, boolean>>(
    createBooleanState()
  );
  const [uploading, setUploading] = useState<Record<PromoPosition, boolean>>(
    createBooleanState()
  );
  const [errors, setErrors] = useState<Record<PromoPosition, string>>(
    createErrorState()
  );

  useEffect(() => {
    fetch("/api/promos")
      .then((response) => response.json())
      .then((data: PromoData[]) => {
        const nextPromos = createInitialPromos();

        if (Array.isArray(data)) {
          for (const promo of data) {
            if (promo.position in nextPromos) {
              nextPromos[promo.position] = {
                ...nextPromos[promo.position],
                ...promo,
                images: Array.isArray(promo.images) ? promo.images : [],
                image: promo.image || promo.images?.[0] || "",
              };
            }
          }
        }

        setPromos(nextPromos);
      })
      .finally(() => setLoading(false));
  }, []);

  function setPromo(position: PromoPosition, nextPromo: PromoData) {
    setPromos((prev) => ({
      ...prev,
      [position]: nextPromo,
    }));
  }

  function updatePromoField(
    position: PromoPosition,
    field:
      | "isActive"
      | "title.ar"
      | "title.en"
      | "description.ar"
      | "description.en"
      | "cta.ar"
      | "cta.en"
      | "cta.link",
    value: string | boolean
  ) {
    const promo = promos[position];

    if (field === "isActive") {
      setPromo(position, {
        ...promo,
        isActive: Boolean(value),
      });
      return;
    }

    const [group, key] = field.split(".") as [
      "title" | "description" | "cta",
      "ar" | "en" | "link",
    ];

    setPromo(position, {
      ...promo,
      [group]: {
        ...promo[group],
        [key]: value,
      },
    });
  }

  async function handleBrowseImages(
    position: PromoPosition,
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(e.target.files || []);

    if (!files.length) return;

    setUploading((prev) => ({ ...prev, [position]: true }));
    setErrors((prev) => ({ ...prev, [position]: "" }));

    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "promo");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Upload failed");
        }

        uploadedUrls.push(payload.url);
      }

      const promo = promos[position];
      const nextImages = [...promo.images, ...uploadedUrls];

      setPromo(position, {
        ...promo,
        images: nextImages,
        image: nextImages[0] || "",
      });
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        [position]:
          error instanceof Error ? error.message : "Upload failed",
      }));
    } finally {
      setUploading((prev) => ({ ...prev, [position]: false }));
      e.target.value = "";
    }
  }

  function removeImage(position: PromoPosition, index: number) {
    const promo = promos[position];
    const nextImages = promo.images.filter((_, imageIndex) => imageIndex !== index);

    setPromo(position, {
      ...promo,
      images: nextImages,
      image: nextImages[0] || "",
    });
  }

  function makePrimaryImage(position: PromoPosition, index: number) {
    if (index <= 0) return;

    const promo = promos[position];
    const nextImages = [...promo.images];
    const [selectedImage] = nextImages.splice(index, 1);

    if (!selectedImage) return;

    nextImages.unshift(selectedImage);

    setPromo(position, {
      ...promo,
      images: nextImages,
      image: nextImages[0] || "",
    });
  }

  async function savePromo(position: PromoPosition) {
    const promo = promos[position];

    if (promo.images.some((image) => image.startsWith("blob:"))) {
      alert("Invalid image detected. Please re-upload image.");
      return;
    }

    setSaving((prev) => ({ ...prev, [position]: true }));
    setErrors((prev) => ({ ...prev, [position]: "" }));

    try {
      const response = await fetch("/api/promos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...promo,
          image: promo.images[0] || "",
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to save promo");
      }

      setPromo(position, {
        ...promo,
        ...payload,
      });

      alert("Saved");
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        [position]:
          error instanceof Error ? error.message : "Failed to save promo",
      }));
    } finally {
      setSaving((prev) => ({ ...prev, [position]: false }));
    }
  }

  if (loading) {
    return <p className="p-10">Loading promos...</p>;
  }

  return (
    <main className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Promotional Blocks</h1>
        <p className="mt-2 text-sm text-gray-500">
          Manage the existing categories banner and the two new shop-side
          advertising blocks from one place.
        </p>
      </div>

      <div className="grid gap-6">
        {POSITIONS.map(({ position, title, subtitle }) => {
          const promo = promos[position];

          return (
            <section
              key={position}
              className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold">{title}</h2>
                  <p className="text-sm text-gray-500">{subtitle}</p>
                </div>

                <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={promo.isActive}
                    onChange={(e) =>
                      updatePromoField(position, "isActive", e.target.checked)
                    }
                  />
                  Active
                </label>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Promo Images
                    </label>

                    <input
                      id={`promo-upload-${position}`}
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={(e) => handleBrowseImages(position, e)}
                    />

                    <div className="flex flex-wrap gap-3">
                      {promo.images.map((image, index) => (
                        <div key={`${image}-${index}`} className="relative">
                          <button
                            type="button"
                            onClick={() => makePrimaryImage(position, index)}
                            className={`overflow-hidden rounded-2xl border-2 ${
                              index === 0 ? "border-black" : "border-gray-200"
                            }`}
                            title={index === 0 ? "Opening slide" : "Move to first slide"}
                          >
                            <img
                              src={image}
                              alt=""
                              className="h-28 w-24 object-cover"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(position, index)}
                            className="absolute -left-2 -top-2 h-6 w-6 rounded-full bg-black text-xs text-white"
                            aria-label="Remove image"
                          >
                            x
                          </button>
                        </div>
                      ))}

                      <label
                        htmlFor={`promo-upload-${position}`}
                        className="flex h-28 w-24 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 text-sm font-bold text-gray-500 hover:bg-gray-50"
                      >
                        {uploading[position] ? "..." : "+"}
                      </label>
                    </div>

                    <p className="mt-2 text-xs text-gray-500">
                      The first image is used as the opening slide and preview
                      cover. You can upload multiple images for the rotating
                      ad block.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      value={promo.title.en}
                      onChange={(e) =>
                        updatePromoField(position, "title.en", e.target.value)
                      }
                      placeholder="Title (EN)"
                      className="w-full rounded-xl border p-3"
                    />
                    <input
                      value={promo.title.ar}
                      onChange={(e) =>
                        updatePromoField(position, "title.ar", e.target.value)
                      }
                      placeholder="Title (AR)"
                      className="w-full rounded-xl border p-3"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <textarea
                      value={promo.description.en}
                      onChange={(e) =>
                        updatePromoField(
                          position,
                          "description.en",
                          e.target.value
                        )
                      }
                      placeholder="Description (EN)"
                      rows={4}
                      className="w-full rounded-xl border p-3"
                    />
                    <textarea
                      value={promo.description.ar}
                      onChange={(e) =>
                        updatePromoField(
                          position,
                          "description.ar",
                          e.target.value
                        )
                      }
                      placeholder="Description (AR)"
                      rows={4}
                      className="w-full rounded-xl border p-3"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      value={promo.cta.en}
                      onChange={(e) =>
                        updatePromoField(position, "cta.en", e.target.value)
                      }
                      placeholder="CTA (EN)"
                      className="w-full rounded-xl border p-3"
                    />
                    <input
                      value={promo.cta.ar}
                      onChange={(e) =>
                        updatePromoField(position, "cta.ar", e.target.value)
                      }
                      placeholder="CTA (AR)"
                      className="w-full rounded-xl border p-3"
                    />
                  </div>

                  <input
                    value={promo.cta.link}
                    onChange={(e) =>
                      updatePromoField(position, "cta.link", e.target.value)
                    }
                    placeholder="CTA Link"
                    className="w-full rounded-xl border p-3"
                  />

                  {errors[position] && (
                    <p className="text-sm text-red-600">{errors[position]}</p>
                  )}

                  <button
                    type="button"
                    onClick={() => savePromo(position)}
                    disabled={saving[position] || uploading[position]}
                    className="rounded-xl bg-sky-500 px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {saving[position] ? "Saving..." : "Save Changes"}
                  </button>
                </div>

                <div className="rounded-[2rem] border border-gray-100 bg-gray-50 p-4">
                  <p className="mb-3 text-sm font-semibold text-gray-600">
                    Quick Preview
                  </p>
                  <div
                    className="relative min-h-[420px] overflow-hidden rounded-[1.75rem] bg-slate-900"
                    style={{
                      backgroundImage: promo.images[0]
                        ? `url(${promo.images[0]})`
                        : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/70" />
                    <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 z-10 p-6 text-white">
                      <div className="mb-4 flex gap-2">
                        {promo.images.slice(0, 5).map((_, index) => (
                          <span
                            key={index}
                            className={`h-1.5 rounded-full ${
                              index === 0 ? "w-8 bg-white" : "w-3 bg-white/45"
                            }`}
                          />
                        ))}
                      </div>
                      <h3 className="text-2xl font-black">
                        {promo.title.en || promo.title.ar || "Promo headline"}
                      </h3>
                      <p className="mt-3 max-w-xs text-sm leading-6 text-white/85">
                        {promo.description.en ||
                          promo.description.ar ||
                          "Upload multiple slides and write a short ad copy for this block."}
                      </p>
                      {(promo.cta.en || promo.cta.ar) && (
                        <span className="mt-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold backdrop-blur-sm">
                          {promo.cta.en || promo.cta.ar}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
