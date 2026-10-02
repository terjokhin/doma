import en from "./en.json";
import ru from "./ru.json";

/** English is the source language; every other file is a translation of en.json. */
export const LANGUAGES = { en: "English", ru: "Русский" } as const;
export type Language = keyof typeof LANGUAGES;

type Messages = { [key: string]: string | Messages };
const MESSAGES: Record<Language, Messages> = { en, ru };

const LANG_KEY = "doma.lang";

function savedLanguage(): Language {
  try {
    const lang = localStorage.getItem(LANG_KEY);
    if (lang && lang in LANGUAGES) return lang as Language;
  } catch {
    /* storage unavailable */
  }
  return "en";
}

const initial = savedLanguage();
let current = $state<Language>(initial);
document.documentElement.lang = initial;

/** The UI language. Reading it in a template or effect re-runs that code when it changes. */
export const language = () => current;

export function setLanguage(lang: Language) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* storage unavailable */
  }
  current = lang;
  document.documentElement.lang = lang;
}

function lookup(lang: Language, key: string): string | undefined {
  let node: string | Messages | undefined = MESSAGES[lang];
  for (const part of key.split(".")) {
    if (typeof node !== "object") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

const pluralRules = new Map<Language, Intl.PluralRules>();
function pluralCategory(lang: Language, count: number) {
  let rules = pluralRules.get(lang);
  if (!rules) pluralRules.set(lang, (rules = new Intl.PluralRules(lang)));
  return rules.select(count);
}

function find(lang: Language, key: string, count: unknown): string | undefined {
  if (typeof count === "number") {
    // Same suffixes as i18next: `_zero` for exactly 0, then the language's plural category.
    if (count === 0) {
      const zero = lookup(lang, `${key}_zero`);
      if (zero !== undefined) return zero;
    }
    const plural = lookup(lang, `${key}_${pluralCategory(lang, count)}`);
    if (plural !== undefined) return plural;
  }
  return lookup(lang, key);
}

export interface TOptions {
  count?: number;
  /** Returned when the key is missing in every language. */
  defaultValue?: string;
  [name: string]: unknown;
}

/** Translate `key` (dot-separated) into the current language, filling `{{name}}` from `options`. */
export function t(key: string, options: TOptions = {}): string {
  const text = find(current, key, options.count) ?? find("en", key, options.count) ?? options.defaultValue ?? key;
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) => String(options[name] ?? ""));
}

/** Whether `key` has a translation in the current language or in English. */
export const exists = (key: string) => lookup(current, key) !== undefined || lookup("en", key) !== undefined;
