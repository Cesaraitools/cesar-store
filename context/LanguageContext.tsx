"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Language = "en" | "ar";

type LanguageContextType = {
  lang: Language;
  toggleLang: () => void;
  setLang: (lang: Language) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  // تحميل اللغة المحفوظة (لو موجودة)
  useEffect(() => {
    const savedLang =
      typeof window !== "undefined"
        ? (localStorage.getItem("lang") as Language | null)
        : null;

    if (savedLang === "ar" || savedLang === "en") {
      setLangState(savedLang);
    }
  }, []);

  // ربط اللغة بالـ HTML
  useEffect(() => {
    if (typeof document === "undefined") return;

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    localStorage.setItem("lang", lang);
  }, [lang]);

  const toggleLang = () => {
    setLangState((prev) => (prev === "en" ? "ar" : "en"));
  };

  const setLang = (value: Language) => {
    setLangState(value);
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        toggleLang,
        setLang,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider"
    );
  }
  return context;
}
