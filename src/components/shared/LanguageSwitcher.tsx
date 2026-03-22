"use client";
// src/components/shared/LanguageSwitcher.tsx
//
// Used in: Admin TopNav (and any server-locale-aware context)
// NOT used in: Public pages (those use PublicNav's inline handleLang instead)
//
// Why this works for admin:
//   usePathname() from @/i18n/routing returns the path WITHOUT the locale prefix.
//   e.g. on /en/admin/projects → pathname = '/admin/projects'
//   router.replace('/admin/projects', { locale: 'am' }) → /am/admin/projects
//   next-intl handles the prefix swap transparently.

import { usePathname, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const locale  = useLocale();
  const router  = useRouter();
  const pathname = usePathname();

  const toggleLanguage = (newLocale: "en" | "am") => {
    // Guard: don't navigate if already on the correct locale
    if (newLocale === locale) return;
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-1">
      <Globe size={11} className="text-white/30 mr-1" />
      <button
        type="button"
        onClick={() => toggleLanguage("en")}
        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all rounded-lg ${
          locale === "en"
            ? "bg-[#E85D1A] text-white"
            : "text-white/40 hover:text-white hover:bg-white/[0.08]"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => toggleLanguage("am")}
        className={`px-3 py-1.5 text-[10px] font-black tracking-wider transition-all rounded-lg ${
          locale === "am"
            ? "bg-[#E85D1A] text-white"
            : "text-white/40 hover:text-white hover:bg-white/[0.08]"
        }`}
        style={{ fontFamily: "'Noto Serif Ethiopic', serif" }}
      >
        አማ
      </button>
    </div>
  );
}