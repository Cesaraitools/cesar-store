import { getLandingShowcase } from "@/lib/server/landing-showcase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0, must-revalidate",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};

export async function GET() {
  try {
    return Response.json(await getLandingShowcase(), {
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error("LANDING SHOWCASE ERROR:", error);

    return Response.json(
      { error: "Failed to load landing showcase" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
