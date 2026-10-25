export type LandingLocalizedCopy = {
  title: string;
  subtitle: string;
};

export type LandingOrbitCategory = {
  id: string;
  category: string;
  image: string;
  ar: LandingLocalizedCopy;
  en: LandingLocalizedCopy;
};

export type LandingBackdropProduct = {
  id: string;
  image: string;
  category: string;
  name: { ar: string; en: string };
};

export type LandingShowcase = {
  categories: LandingOrbitCategory[];
  products: LandingBackdropProduct[];
};
