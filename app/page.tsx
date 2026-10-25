import LandingPageClient from "@/app/LandingPageClient";
import type { LandingShowcase } from "@/lib/landing-showcase";
import { getLandingShowcase } from "@/lib/server/landing-showcase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const EMPTY_SHOWCASE: LandingShowcase = { categories: [] };

export default async function LandingPage() {
  let initialShowcase = EMPTY_SHOWCASE;

  try {
    initialShowcase = await getLandingShowcase();
  } catch (error) {
    console.error("LANDING PAGE SHOWCASE ERROR:", error);
  }

  return <LandingPageClient initialShowcase={initialShowcase} />;
}
