"use client";

import Link from "next/link";
import { ShieldCheck, MapPin, Phone, Mail, Clock, Globe, ExternalLink, ArrowUpRight } from "lucide-react";
import { useTranslations, type SiteLang } from "@/lib/useTranslations";

interface Props {
  locale: string;
  lang?: SiteLang;
}

export function PublicFooter({ locale, lang = "en" }: Props) {
  const { t } = useTranslations(lang);
  const am = lang === "am" ? "amharic" : "";
  const year = new Date().getFullYear();

  const NAV_LINKS = [
    { key: "nav.home",     href: "/" },
    { key: "nav.about",    href: "/about" },
    { key: "nav.projects", href: "/projects" },
    { key: "nav.tenders",  href: "/tenders" },
    { key: "nav.services", href: "/services" },
    { key: "nav.contact",  href: "/contact" },
  ];

  const LEGAL_LINKS = [
    { key: "footer.legal1", href: "#" },
    { key: "footer.legal2", href: "#" },
    { key: "footer.legal3", href: "#" },
    { key: "footer.legal4", href: "#" },
    { key: "footer.legal5", href: "#" },
  ];

  const HOURS = [
    { dayKey: "footer.day1", hoursKey: "footer.monFriHours", open: true  },
    { dayKey: "footer.day2", hoursKey: "footer.satHours",    open: true  },
    { dayKey: "footer.day3", hoursKey: "footer.closed",      open: false },
    { dayKey: "footer.day4", hoursKey: "footer.closed",      open: false },
  ];

  return (
    <footer className="bg-[#060E1C] text-white">

      {/* ── Contact info bar ── */}
      <div className="bg-[#0A1628] border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-8 py-5 grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
          {[
            { icon: <MapPin size={14} />,  label: t("contact.addressLabel"), value: "Lemi Kura Sub-City, Addis Ababa" },
            { icon: <Phone size={14} />,   label: t("contact.phoneLabel"),   value: "+251-11-XXX-XXXX" },
            { icon: <Mail size={14} />,    label: t("contact.emailLabel"),   value: "info@lemikura.gov.et" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3.5 py-4 md:py-0 md:px-8 first:pl-0 last:pr-0">
              <div className="w-9 h-9 rounded-xl bg-[#E85D1A]/12 border border-[#E85D1A]/20 flex items-center justify-center shrink-0 text-[#E85D1A]">
                {item.icon}
              </div>
              <div className="min-w-0">
                <p className={`text-[9px] font-black text-white/25 uppercase tracking-widest mb-0.5 ${am}`}>{item.label}</p>
                <p className="text-sm text-white/60 font-medium truncate">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main footer grid ── */}
      <div className="max-w-7xl mx-auto px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* Brand column */}
          <div className="lg:col-span-4">
            {/* Logo */}
            <Link href={`/${locale}`} className="inline-flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#E85D1A] flex items-center justify-center shrink-0">
                <span className="text-white font-black text-lg amharic leading-none">ሌ</span>
              </div>
              <div>
                <p className={`font-black text-white text-sm leading-tight ${am}`}>{t("footer.brand")}</p>
                <p className={`text-white/25 text-[9px] font-semibold uppercase tracking-widest mt-0.5 ${am}`}>{t("footer.unit")}</p>
              </div>
            </Link>

            {/* Tagline */}
            <p className={`text-white/35 text-sm leading-relaxed mb-8 max-w-[300px] ${am}`}>
              {t("footer.about")}
            </p>

            {/* Office hours */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={12} className="text-[#E85D1A]" />
                <p className={`text-[9px] font-black uppercase tracking-widest text-white/30 ${am}`}>{t("footer.officeHours")}</p>
              </div>
              <div className="space-y-2">
                {HOURS.map(h => (
                  <div key={h.dayKey} className="flex justify-between items-center">
                    <span className={`text-xs text-white/35 ${am}`}>{t(h.dayKey)}</span>
                    <span className={`text-xs font-bold ${h.open ? "text-white/55" : "text-white/20"} ${am}`}>{t(h.hoursKey)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Nav + Legal */}
          <div className="lg:col-span-2">
            <p className={`text-[9px] font-black text-[#E85D1A] uppercase tracking-[0.25em] mb-6 ${am}`}>{t("nav.home") && t("footer.navTitle") || "Navigation"}</p>
            <ul className="space-y-3.5">
              {NAV_LINKS.map(item => (
                <li key={item.key}>
                  <Link href={`/${locale}${item.href === "/" ? "" : item.href}`}
                    className={`group flex items-center gap-1.5 text-sm text-white/35 hover:text-white transition-colors ${am}`}>
                    <ArrowUpRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#E85D1A]" />
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal / Docs */}
          <div className="lg:col-span-2">
            <p className={`text-[9px] font-black text-white/25 uppercase tracking-[0.25em] mb-6 ${am}`}>{t("footer.legalTitle")}</p>
            <ul className="space-y-3.5">
              {LEGAL_LINKS.map(item => (
                <li key={item.key}>
                  <Link href={item.href}
                    className={`group flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors ${am}`}>
                    <ExternalLink size={10} className="opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social + Admin */}
          <div className="lg:col-span-4">
            <p className={`text-[9px] font-black text-white/25 uppercase tracking-[0.25em] mb-6 ${am}`}>{t("footer.social_title") || "Connect"}</p>

            {/* Social buttons */}
            <div className="flex flex-wrap gap-2 mb-8">
              {["Facebook", "Telegram", "Twitter", "LinkedIn"].map(platform => (
                <a key={platform} href="#"
                  className="group flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.04] hover:bg-[#E85D1A]/10 border border-white/[0.08] hover:border-[#E85D1A]/30 text-white/30 hover:text-white/70 text-[10px] font-black uppercase tracking-wider transition-all rounded-lg">
                  {platform}
                  <ArrowUpRight size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>

            {/* Admin portal */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
              <p className={`text-[9px] font-black text-white/20 uppercase tracking-widest mb-3 ${am}`}>{t("nav.adminPortal")}</p>
              <Link href={`/${locale}/admin`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E85D1A]/10 hover:bg-[#E85D1A]/20 border border-[#E85D1A]/20 hover:border-[#E85D1A]/40 text-[#E85D1A] text-[10px] font-black uppercase tracking-widest transition-all rounded-xl">
                <ShieldCheck size={12} /> {t("nav.adminPortal")}
              </Link>
              <p className={`text-[9px] text-white/15 mt-3 leading-relaxed ${am}`}>
                {lang === "am" ? "ለስርዓቱ አስተዳዳሪዎች ብቻ" : "Restricted to system administrators only"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-white/[0.05] bg-[#04090F]">
        <div className="max-w-7xl mx-auto px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#E85D1A]/20 flex items-center justify-center rounded">
              <span className="text-[#E85D1A] text-[8px] font-black amharic">ሌ</span>
            </div>
            <p className={`text-white/15 text-[10px] ${am}`}>
              © {year} {t("footer.brand")} · {t("footer.unit")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-white/15">
              <Globe size={10} />
              <span className="text-[10px] font-black uppercase tracking-wider">
                {lang === "am" ? "አማርኛ" : "English"}
              </span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <p className="text-white/10 text-[10px] font-bold uppercase tracking-wider">
              Addis Ababa · Ethiopia
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}