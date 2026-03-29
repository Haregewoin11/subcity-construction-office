"use client";
// src/components/public/Publicnav.tsx
//
// Language routing — mirrors how Admin TopNav uses module-level stable references:
//   Admin:  const supabase = createClient(...)  ← module level, created once
//   Public: const enMessages = require(...)     ← module level, imported once
//
// The inline t() hook re-reads the correct message object on every render
// based on lang state — identical concept to how admin reads static English strings.
//
// URL sync: handleLang → router.replace(/en|am/ → next) so the next page
// mount initialises from the correct URL locale. Language persists across navigation.

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import Image from "next/image";

// ── Module-level JSON imports — like admin's module-level supabase client ─────
// Imported once, stable reference, no recreation on render
import enMessages from "@/app/[locale]/en.json";
import amMessages from "@/app/[locale]/am.json";

// ── Types ─────────────────────────────────────────────────────────────────────
export type SiteLang = "en" | "am";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;


const NAV_ITEMS = [
  { key: "nav.home",     href: "/"         },
  { key: "nav.about",    href: "/about"    },
  { key: "nav.projects", href: "/projects" },
  { key: "nav.tenders",  href: "/tenders"  },
  { key: "nav.services", href: "/services" },
  { key: "nav.contact",  href: "/contact"  },
] as const;

// ── Inline translation hook ───────────────────────────────────────────────────
// Admin has no hook (English-only). Public needs one that re-renders on lang change.
// useCallback([lang]) ensures t() is recreated only when lang changes — not every render.
function useTranslation(lang: SiteLang) {
  const messages: AnyObj =
    lang === "am" ? (amMessages as AnyObj) : (enMessages as AnyObj);

  const t = useCallback(
    (path: string): string => {
      let node: unknown = messages;
      for (const p of path.split(".")) {
        if (node == null || typeof node !== "object") return path;
        node = (node as AnyObj)[p];
      }
      return typeof node === "string" ? node : path;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang] // only recreate when lang changes — same stability principle as admin's module-level client
  );

  return t;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function PublicNav({
  locale,
  lang: langProp,
}: {
  locale: string;        // current URL locale — used for link hrefs
  lang?: SiteLang;       // controlled by parent when parent manages lang state
  onLangChange?: (l: SiteLang) => void; // parent's setLang — called on toggle
}) {
  const pathname = usePathname();

  // Own lang state — used when parent doesn't pass langProp (standalone usage)
  // Initialized from locale so fresh page load shows the correct language
  const [ownLang] = useState<SiteLang>(locale === "am" ? "am" : "en");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Use parent's lang if provided, otherwise own state
  const lang  = langProp ?? ownLang;
  const t     = useTranslation(lang);
  const amCls = lang === "am" ? "amharic tracking-normal" : "";

  // ── Single toggle handler ──────────────────────────────────────────────────
  // Three things happen atomically:
  //   1. Own state updates (for standalone usage)
  //   2. Parent state updates via onLangChange (for controlled usage)
  //   3. URL locale prefix swaps — so the NEXT page mount reads correct locale

  const isActive = (href: string) =>
    href === "/"
      ? pathname === `/${locale}` || pathname === `/${locale}/`
      : pathname.includes(href);

  return (
    // top-8 → nav sits directly below the 32px utility bar (fixed top-0 h-8)
    // z-40 → below utility bar's z-50 but above page content
    <nav className="fixed top-8 left-0 right-0 z-40 bg-[#0A1628]/96 backdrop-blur-md border-b border-white/8">
      <div className="max-w-[1400px] mx-auto px-8">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* ── Logo ── */}
          <Link href={`/${locale}`} className="flex items-center gap-3 shrink-0 group">
            <div className="relative flex items-center justify-center">
              <div className="absolute -inset-1.5 bg-[#E85D1A]/10 blur-xl rounded-full opacity-70
                              group-hover:opacity-100 transition-opacity" />
              <Image
                src="/assets/lemikura-logo.png"
                alt="Lemi Kura Office Logo"
                width={40}
                height={40}
                className="relative z-10 transition-transform duration-300 group-hover:scale-110"
                priority
              />
            </div>
            <div className="hidden sm:block">
              <p className={`text-white font-black text-[13px] uppercase tracking-tight leading-none ${amCls}`}>
                {t("footer.brand")}
              </p>
              <p className={`text-white/30 text-[9px] font-semibold uppercase tracking-widest mt-0.5 ${amCls}`}>
                {t("footer.unit")}
              </p>
            </div>
          </Link>

          {/* ── Desktop nav links ── */}
          <div className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.href}
                href={`/${locale}${item.href === "/" ? "" : item.href}`}
                className={`px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all ${amCls} ${
                  isActive(item.href)
                    ? "bg-[#E85D1A] text-white"
                    : "text-white/55 hover:text-white hover:bg-white/8"
                }`}
              >
                {t(item.key)}
              </Link>
            ))}
          </div>

          {/* ── Controls ── */}
          <div className="flex items-center gap-3 shrink-0">

            {/* Language toggle — the only interactive element that changes language */}
            {/* <button
              type="button"
              onClick={() => handleLang(lang === "en" ? "am" : "en")}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.08] hover:bg-white/[0.15]
                         border border-white/[0.12] text-white/70 hover:text-white
                         transition-all text-[10px] font-black uppercase tracking-wider"
              aria-label="Toggle language"
            >
              <Globe size={11} />
              {lang === "en" ? "አማ" : "EN"}
            </button> */}

            {/* Admin portal link — desktop */}
            <Link
              href={`/${locale}/admin/login`}
              className={`hidden md:flex items-center px-3 py-2 bg-[#E85D1A]/10 hover:bg-[#E85D1A]/20
                          border border-[#E85D1A]/25 text-[#E85D1A] text-[10px] font-black
                          uppercase tracking-widest transition-all ${amCls}`}
            >
              {t("nav.login")}
            </Link>

            {/* Mobile hamburger — opens/closes drawer */}
            <button
              type="button"
              onClick={() => setMobileOpen(v => !v)}
              className="md:hidden p-2 text-white/60 hover:text-white hover:bg-white/10 transition-all"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* ── Mobile drawer ── */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/8 py-4 space-y-1 pb-6">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.href}
                href={`/${locale}${item.href === "/" ? "" : item.href}`}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 text-sm font-black uppercase tracking-wide transition-all ${amCls} ${
                  isActive(item.href)
                    ? "bg-[#E85D1A] text-white"
                    : "text-white/55 hover:text-white hover:bg-white/8"
                }`}
              >
                {t(item.key)}
              </Link>
            ))}
            <div className="pt-3 border-t border-white/8 mt-3">
              <Link
                href={`/${locale}/admin/login`}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 text-sm font-black uppercase tracking-wide
                            text-[#E85D1A] bg-[#E85D1A]/10 hover:bg-[#E85D1A]/20 transition-all ${amCls}`}
              >
                {t("nav.login")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}