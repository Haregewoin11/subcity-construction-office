"use client";

/**
 * DashboardPublicServices
 * ─────────────────────────────────────────────────────────────
 * "How Can We Help You Today?" panel for the admin dashboard.
 * Includes bilingual toggle (EN / አማ) independent of the
 * public site's language state — the admin may want to preview
 * in either language while managing the portal.
 */

import { useState } from "react";
import Link from "next/link";
import {
  Building2, AlertTriangle, Download,
  TrendingUp, ShieldCheck, FileText, Phone,
  Globe, ArrowRight, Users, ClipboardList,
  ExternalLink,
} from "lucide-react";

type Lang = "en" | "am";

const PRIMARY_SERVICES = [
  {
    icon: <Building2 size={22} />,
    en:  { title: "Construction Permits",  desc: "Review and approve permit applications submitted by residents and contractors." },
    am:  { title: "የግንባታ ፈቃዶች",         desc: "በነዋሪዎች እና ተቋራጮች የቀረቡ የፈቃድ ማመልከቻዎችን ይገምግሙ እና ያጽድቁ።" },
    href: "/admin/construction-tracking",
    color: "bg-[#1B3A6B]", iconColor: "text-white", textColor: "text-white",
  },
  {
    icon: <AlertTriangle size={22} />,
    en:  { title: "Complaints & Issues",   desc: "Track and resolve complaints filed by the public regarding construction quality or safety." },
    am:  { title: "አቤቱታዎችና ችግሮች",       desc: "ስለ ግንባታ ጥራት ወይም ደህንነት በሕዝብ የቀረቡ አቤቱታዎችን ይከታተሉ እና ይፍቱ።" },
    href: "/admin/construction-tracking",
    color: "bg-[#D4560F]", iconColor: "text-white", textColor: "text-white",
  },
  {
    icon: <Download size={22} />,
    en:  { title: "Document Requests",     desc: "Manage requests for official certificates, reports, and project documentation." },
    am:  { title: "የሰነድ ጥያቄዎች",         desc: "ለኦፊሴላዊ ሰነዶች፣ ሪፖርቶች እና የፕሮጀክት ሰነዶች ጥያቄዎችን ያስተዳድሩ።" },
    href: "/admin/reports",
    color: "bg-[#2A7A4B]", iconColor: "text-white", textColor: "text-white",
  },
];

const QUICK_LINKS = [
  { en: "Track Applications",     am: "ማመልከቻዎችን ይከታተሉ",  icon: <TrendingUp size={14} />,   href: "/admin/construction-tracking" },
  { en: "Schedule Inspection",    am: "ምርመራ ይርሸዱ",         icon: <ShieldCheck size={14} />,  href: "/admin/design-supervision"    },
  { en: "Contractor Registry",    am: "ተቋራጭ መዝገብ",         icon: <ClipboardList size={14} />,href: "/admin/contractors"           },
  { en: "View Public Portal",     am: "የሕዝብ ፖርታል ይመልከቱ", icon: <ExternalLink size={14} />, href: "/en", target: "_blank"        },
];

export function DashboardPublicServices({ locale = "en" }: { locale?: string }) {
  const [lang, setLang] = useState<Lang>("en");
  const t = (en: string, am: string) => lang === "am" ? am : en;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="bg-[#1B3A6B] px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-white/40 text-[9px] font-bold uppercase tracking-[0.22em] mb-0.5">
            {t("Citizen Services Management", "የዜጎች አገልግሎቶች አስተዳደር")}
          </p>
          <h3 className={`text-white font-bold leading-tight ${lang === "am" ? "text-[14px]" : "text-[15px]"}`}>
            {t("How Can We Help You Today?", "ዛሬ እንዴት ልናግዝዎ እንችላለን?")}
          </h3>
        </div>
        {/* Language toggle */}
        <button
          onClick={() => setLang(l => l === "en" ? "am" : "en")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white/70 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-all"
        >
          <Globe size={11} />
          {lang === "en" ? "አማ" : "EN"}
        </button>
      </div>

      <div className="p-5 space-y-4">

        {/* 3 primary service cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRIMARY_SERVICES.map(svc => (
            <Link key={svc.en.title} href={svc.href}
              className={`${svc.color} p-4 flex flex-col gap-3 group hover:opacity-90 transition-all`}>
              <div className={`${svc.iconColor} opacity-80 group-hover:opacity-100`}>{svc.icon}</div>
              <div>
                <p className={`font-bold ${svc.textColor} leading-tight mb-1 ${
                  lang === "am" ? "text-[13px]" : "text-sm uppercase tracking-tight"
                }`}>
                  {t(svc.en.title, svc.am.title)}
                </p>
                <p className={`text-white/55 leading-relaxed ${lang === "am" ? "text-[11px]" : "text-[11px]"}`}>
                  {t(svc.en.desc, svc.am.desc)}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1 font-bold text-white/70 group-hover:text-white group-hover:gap-2 transition-all mt-auto ${
                lang === "am" ? "text-[11px]" : "text-[10px] uppercase tracking-wider"
              }`}>
                {t("Manage", "ያስተዳድሩ")} <ArrowRight size={10} />
              </span>
            </Link>
          ))}
        </div>

        {/* 4 quick links */}
        <div className="grid grid-cols-2 gap-2">
          {QUICK_LINKS.map(item => (
            <Link key={item.en}
              href={item.href}
              target={(item as any).target}
              className={`flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 py-3 px-4 transition-all ${
                lang === "am" ? "text-[12px]" : "text-[11px] font-bold uppercase tracking-wider"
              }`}
            >
              <span className="text-slate-400 shrink-0">{item.icon}</span>
              {t(item.en, item.am)}
            </Link>
          ))}
        </div>

        {/* Live portal status */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#F7F8FA] border border-[#E8EBF0]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className={`text-[#3D5280] font-semibold ${lang === "am" ? "text-[13px]" : "text-xs uppercase tracking-wider"}`}>
              {t("Public Portal is Live", "የሕዝብ ፖርታል ቀጥታ ነው")}
            </span>
          </div>
          <Link href="/en" target="_blank"
            className={`flex items-center gap-1.5 text-[#1B3A6B] hover:text-[#D4560F] font-bold transition-colors ${
              lang === "am" ? "text-[12px]" : "text-[10px] uppercase tracking-widest"
            }`}>
            {t("View Site", "ድህረ ገጽ ይመልከቱ")} <ExternalLink size={10} />
          </Link>
        </div>

      </div>
    </div>
  );
}