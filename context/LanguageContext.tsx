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
const LANGUAGE_STORAGE_KEY = "lang";
const LANGUAGE_PREFERENCE_KEY = "cesar_store_language_selected";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("ar");

  // تحميل اللغة المحفوظة (لو موجودة)
  useEffect(() => {
    const hasSelectedLanguage =
      localStorage.getItem(LANGUAGE_PREFERENCE_KEY) === "true";
    const savedLang = localStorage.getItem(
      LANGUAGE_STORAGE_KEY
    ) as Language | null;

    if (
      hasSelectedLanguage &&
      (savedLang === "ar" || savedLang === "en")
    ) {
      setLangState(savedLang);
    } else {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, "ar");
    }
  }, []);

  // ربط اللغة بالـ HTML
  useEffect(() => {
    if (typeof document === "undefined") return;

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const toggleLang = () => {
    setLangState((prev) => {
      const nextLang = prev === "en" ? "ar" : "en";
      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLang);
      localStorage.setItem(LANGUAGE_PREFERENCE_KEY, "true");
      return nextLang;
    });
  };

  const setLang = (value: Language) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
    localStorage.setItem(LANGUAGE_PREFERENCE_KEY, "true");
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
