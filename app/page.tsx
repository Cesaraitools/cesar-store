import LandingPageClient from "@/app/LandingPageClient";
import type { Metadata } from "next";
import type { LandingShowcase } from "@/lib/landing-showcase";
import { getLandingShowcase } from "@/lib/server/landing-showcase";

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

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
