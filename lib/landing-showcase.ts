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

export type LandingShowcase = {
  categories: LandingOrbitCategory[];
};
