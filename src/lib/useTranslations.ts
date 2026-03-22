"use client";
/**
 * useTranslations — single source of truth for all page i18n
 *
 * ONE en.json + ONE am.json covers every page.
 * Toggling lang flips 100% of strings — zero mixing ever.
 *
 * Usage:
 *   const { t, tStatus, tSector } = useTranslations(lang);
 *   t("home.heroTitle1")   → "Building a Stronger"   (EN)
 *                          → "ጠንካራ ክፍለ ከተማ"          (AM)
 */
import { useMemo } from "react";
import enJson from "@/app/[locale]/messages/en.json"
import amJson from "@/app/[locale]/messages/am.json";

export type SiteLang = "en" | "am";

function flatten(obj: Record<string, any>, prefix = ""): Record<string, string> {
  return Object.entries(obj).reduce((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(acc, flatten(v, key));
    } else {
      acc[key] = String(v ?? "");
    }
    return acc;
  }, {} as Record<string, string>);
}

// Pre-flattened once at module load — zero per-render cost
const FLAT: Record<SiteLang, Record<string, string>> = {
  en: flatten(enJson as any),
  am: flatten(amJson as any),
};

export function useTranslations(lang: SiteLang) {
  const flat = useMemo(() => FLAT[lang], [lang]);
  const t       = (key: string, fb?: string) => flat[key] ?? fb ?? key;
  const tStatus = (s?: string | null)        => flat[`status.${s}`]  ?? s ?? "";
  const tSector = (s?: string | null)        => flat[`sectors.${s}`] ?? s ?? "";
  return { t, tStatus, tSector, lang, flat };
}

/** Server-side version (no React hook) */
export function getTranslations(lang: SiteLang) {
  const flat = FLAT[lang];
  return {
    t:       (key: string, fb?: string) => flat[key] ?? fb ?? key,
    tStatus: (s?: string | null)        => flat[`status.${s}`]  ?? s ?? "",
    tSector: (s?: string | null)        => flat[`sectors.${s}`] ?? s ?? "",
    lang,
  };
}