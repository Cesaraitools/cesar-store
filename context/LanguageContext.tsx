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

function loadSavedLanguage(): Language | null {
  try {
    const hasSelectedLanguage =
      window.localStorage.getItem(LANGUAGE_PREFERENCE_KEY) === "true";
    const savedLang = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

    return hasSelectedLanguage && (savedLang === "ar" || savedLang === "en")
      ? savedLang
      : null;
  } catch {
    return null;
  }
}

function saveLanguage(value: Language, markAsSelected: boolean) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
    if (markAsSelected) {
      window.localStorage.setItem(LANGUAGE_PREFERENCE_KEY, "true");
    }
  } catch {}
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("ar");

  // تحميل اللغة المحفوظة (لو موجودة)
  useEffect(() => {
    const savedLang = loadSavedLanguage();

    if (savedLang) {
      setLangState(savedLang);
    } else {
      saveLanguage("ar", false);
    }
  }, []);

  // ربط اللغة بالـ HTML
  useEffect(() => {
    if (typeof document === "undefined") return;

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const toggleLang = () => {
    const nextLang = lang === "en" ? "ar" : "en";
    saveLanguage(nextLang, true);
    setLangState(nextLang);
  };

  const setLang = (value: Language) => {
    saveLanguage(value, true);
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
