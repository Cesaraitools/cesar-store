// app/api/promos/route.ts

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export type PromoPosition = "categories_side";

export type PromoData = {
  id: string;
  position: PromoPosition;
  isActive: boolean;

  // 🔗 NEW: product link (Single Source of Truth)
  productId?: string;

  title: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  cta: {
    ar: string;
    en: string;
    link: string;
  };
  createdAt: string;
  updatedAt: string;
};

const DATA_FILE = join(process.cwd(), "data-store", "promos.json");

/* ---------------- Helpers ---------------- */

function readPromos(): PromoData[] {
  try {
    const data = readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading promos:", error);
    return [];
  }
}

function writePromos(promos: PromoData[]): void {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(promos, null, 2));
  } catch (error) {
    console.error("Error writing promos:", error);
  }
}

/* ---------------- GET ---------------- */
export async function GET() {
  try {
    const promos = readPromos();
    return Response.json(promos);
  } catch {
    return Response.json(
      { error: "Failed to fetch promos" },
      { status: 500 }
    );
  }
}

/* ---------------- POST ---------------- */
export async function POST(request: Request) {
  try {
    const newPromo = (await request.json()) as PromoData;

    if (!newPromo.id || !newPromo.position) {
      return Response.json(
        { error: "Missing required fields: id, position" },
        { status: 400 }
      );
    }

    const promos = readPromos();

    if (promos.find((p) => p.id === newPromo.id)) {
      return Response.json(
        { error: "Promo with this ID already exists" },
        { status: 409 }
      );
    }

    promos.push({
      ...newPromo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    writePromos(promos);

    return Response.json(newPromo, { status: 201 });
  } catch {
    return Response.json(
      { error: "Failed to create promo" },
      { status: 500 }
    );
  }
}

/* ---------------- PUT ---------------- */
export async function PUT(request: Request) {
  try {
    const { id, ...updates } = (await request.json()) as Partial<PromoData> & {
      id: string;
    };

    if (!id) {
      return Response.json(
        { error: "Promo ID is required" },
        { status: 400 }
      );
    }

    const promos = readPromos();
    const index = promos.findIndex((p) => p.id === id);

    if (index === -1) {
      return Response.json(
        { error: "Promo not found" },
        { status: 404 }
      );
    }

    promos[index] = {
      ...promos[index],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    writePromos(promos);

    return Response.json(promos[index]);
  } catch {
    return Response.json(
      { error: "Failed to update promo" },
      { status: 500 }
    );
  }
}

/* ---------------- DELETE ---------------- */
export async function DELETE(request: Request) {
  try {
    const { id } = (await request.json()) as { id: string };

    if (!id) {
      return Response.json(
        { error: "Promo ID is required" },
        { status: 400 }
      );
    }

    const promos = readPromos();
    const filtered = promos.filter((p) => p.id !== id);

    if (filtered.length === promos.length) {
      return Response.json(
        { error: "Promo not found" },
        { status: 404 }
      );
    }

    writePromos(filtered);

    return Response.json({ message: "Promo deleted successfully" });
  } catch {
    return Response.json(
      { error: "Failed to delete promo" },
      { status: 500 }
    );
  }
}