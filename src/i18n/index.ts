import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import ru from "./ru.json";

/** English is the source language; every other file is a translation of en.json. */
export const LANGUAGES = { en: "English", ru: "Русский" } as const;
export type Language = keyof typeof LANGUAGES;

const LANG_KEY = "ha-ui.lang";

function savedLanguage(): Language {
  try {
    const lang = localStorage.getItem(LANG_KEY);
    if (lang && lang in LANGUAGES) return lang as Language;
  } catch {
    /* storage unavailable */
  }
  return "en";
}

export function setLanguage(lang: Language) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* storage unavailable */
  }
  void i18n.changeLanguage(lang);
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ru: { translation: ru } },
  lng: savedLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false }, // React escapes already
});

i18n.on("languageChanged", (lang) => (document.documentElement.lang = lang));
document.documentElement.lang = i18n.language;

export default i18n;
