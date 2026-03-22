"use client";
// src/components/public/AboutPageClient.tsx

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { PublicNav, type SiteLang } from "@/components/public/Publicnav";
import {
  Target, Eye, Shield, Building2, ArrowRight,
  ChevronRight, Quote, Award, Phone, Mail, Globe, Clock,
} from "lucide-react";

// ── Direct JSON imports ───────────────────────────────────────────────────────
import enMessages from "@/app/[locale]/en.json";
import amMessages from "@/app/[locale]/am.json";

type AnyObj = Record<string, any>;

// ── Inline translation hook ───────────────────────────────────────────────────
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
    [lang]
  );

  return { t, isAm: lang === "am" };
}

// ── Static data — module level (stable, no recreation on render) ──────────────
const DIRECTOR = {
  img:    "/assets/teamphoto/tesfaye-ayana.png",
  nameEn: "Tesfaye Ayana",
  nameAm: "ተስፋዬ አይና",                           // ← added missing nameAm
  roleEn: "Head, Design & Construction Works Office",
  roleAm: "የዲዛይንና ግንባታ ሥራዎች ጽ/ቤት ኃላፊ",
};

const TEAM = [
  {
    img:    "/assets/teamphoto/desta-fissehaye-fantahun.png",
    nameEn: "Desta philipos Fanturi",  nameAm: "ደስታ ፈሊጶስ ፋንጡሪ",
    roleEn: "Design & Construction Works Coordinator",
    roleAm: "የዲዛይንና ግንባታ ሥራዎች አስተባባሪ",
    quoteKey: "about.memberQuote1",
  },
  {
    img:    "/assets/teamphoto/abebe-dejahure.png",
    nameEn: "Abebe Deyasa hure",       nameAm: "አበቤ ደያሳ ሁሬ",
    roleEn: "Design & Contract Management Team Leader",
    roleAm: "የዲዛይንና ኮንትራት ማኔጅመንት ቡድን መሪ",
    quoteKey: "about.memberQuote2",
  },
  {
    img:    "/assets/teamphoto/dadi-garma-yidesa.png",
    nameEn: "Dadi Garma Yidesa",       nameAm: "ዳዲ ግርማ ይደሳ",
    roleEn: "Engineering Procurement Team Leader",
    roleAm: "የምህንድስና ግዥ ቡድን መሪ",
    quoteKey: "about.memberQuote3",
  },
  {
    img:    "/assets/teamphoto/dawit-tesfaye-asechalew.png",
    nameEn: "Dawit Tesfaye Asechalew", nameAm: "ዳዊት ተ/ዕፅዮን አስቻለው",
    roleEn: "Project Study & Design Preparation Team Leader",
    roleAm: "የፕሮጀክት ጥናትና ዲዛይን ዝግጅት ቡድን መሪ",
    quoteKey: "about.memberQuote4",
  },
  {
    img:    "/assets/teamphoto/meweret-siyem-tafere.png",
    nameEn: "Meweret Siyem Tafere",    nameAm: "መሠረት ስዩም ተፈራ",
    roleEn: "Project Audit Team",
    roleAm: "የፕሮጀክት አዲት ቡድን",
    quoteKey: "about.memberQuote5",
  },
];

const VALUES = [
  { num: "01", icon: "🔍", titleKey: "about.value1Title" },
  { num: "02", icon: "⚖️", titleKey: "about.value2Title" },
  { num: "03", icon: "🤝", titleKey: "about.value3Title" },
  { num: "04", icon: "🔄", titleKey: "about.value4Title" },
  { num: "05", icon: "✅", titleKey: "about.value5Title" },
  { num: "06", icon: "⚡", titleKey: "about.value6Title" },
  { num: "07", icon: "🦺", titleKey: "about.value7Title" },
];

const ORG_UNITS = [
  { icon: "📐", border: "border-l-[#1B3A6B]", key: "about.org1" },
  { icon: "🏗",  border: "border-l-[#D4560F]", key: "about.org2" },
  { icon: "📋", border: "border-l-[#2A7A4B]", key: "about.org3" },
  { icon: "✅", border: "border-l-[#7B5EA7]", key: "about.org4" },
  { icon: "💰", border: "border-l-[#D4A020]", key: "about.org5" },
  { icon: "🤝", border: "border-l-[#C0404A]", key: "about.org6" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + "M";
  return n.toLocaleString();
}

function SectionEyebrow({ children, color = "#D4560F" }: { children: string; color?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-1 h-5 shrink-0" style={{ background: color }} />
      <span className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color }}>
        {children}
      </span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AboutPageClient({
  locale,
  projects,
  contractors,
}: {
  locale: string;
  projects: any[];
  contractors: any[];
}) {
  const router   = useRouter();
  const pathname = usePathname();

  const [lang, setLangState] = useState<SiteLang>(locale === "am" ? "am" : "en");
  const setLang = (newLang: SiteLang) => {
    setLangState(newLang);
    router.replace(pathname.replace(/^\/(en|am)/, `/${newLang}`));
  };

  // ← hook called FIRST, then variables derived from it
  const { t, isAm } = useTranslation(lang);
  const am = isAm ? "amharic" : "";           // single consistent variable name

  // tSector defined AFTER t is available
  const tSector = (s: string) => t(`sectors.${s.toLowerCase()}`) || s;

  const totalBudget = projects.reduce((s, p) => s + Number(p.budget || 0), 0);
  const completed   = projects.filter(p => p.status === "Completed");
  const verified    = (contractors || []).filter(c => c.is_verified);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Noto+Serif+Ethiopic:wght@400;600;700&display=swap');
        *,*::before,*::after{font-family:'DM Sans',system-ui,sans-serif;}
        .amharic{font-family:'Noto Serif Ethiopic',serif !important;line-height:1.75 !important;}
        .blueprint{
          background-color:#F7F8FA;
          background-image:
            linear-gradient(rgba(27,58,107,.045) 1px,transparent 1px),
            linear-gradient(90deg,rgba(27,58,107,.045) 1px,transparent 1px);
          background-size:44px 44px;
        }
        .card-lift{transition:box-shadow .2s,border-color .2s,transform .2s;}
        .card-lift:hover{box-shadow:0 12px 32px rgba(10,22,40,.10);transform:translateY(-2px);}
        .photo-grad::after{
          content:'';position:absolute;inset:0;
          background:linear-gradient(to top,rgba(11,24,41,.88) 0%,rgba(11,24,41,.25) 55%,transparent 100%);
        }
        .director-grad::after{
          content:'';position:absolute;inset:0;
          background:
            linear-gradient(to bottom,rgba(11,24,41,.55) 0%,transparent 35%),
            linear-gradient(to top,rgba(11,24,41,.90) 0%,rgba(11,24,41,.35) 50%,transparent 100%);
        }
        .team-photo{transition:transform .5s ease;}
        .team-card:hover .team-photo{transform:scale(1.06);}
      `}</style>

      {/* ══ UTILITY BAR — identical to Projects / Tenders ══ */}
      <div className="bg-[#071220] border-b border-white/[0.06] text-[11.5px] fixed top-0 left-0 right-0 z-50">
        <div className="max-w-[1400px] mx-auto px-8 h-8 flex items-center justify-between">
          <div className="hidden md:flex items-center gap-6 text-white/35">
            <a href={`tel:${t("util_bar.phone")}`}
              className="flex items-center gap-1.5 hover:text-white/70 transition-colors">
              <Phone size={10} /> {t("util_bar.phone")}
            </a>
            <a href={`mailto:${t("util_bar.email")}`}
              className="flex items-center gap-1.5 hover:text-white/70 transition-colors">
              <Mail size={10} /> {t("util_bar.email")}
            </a>
            <span className={`flex items-center gap-1.5 ${am}`}>
              <Clock size={10} className="text-[#E85D1A] shrink-0" /> {t("util_bar.hours")}
            </span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <Globe size={10} className="text-white/20 mr-1" />
            <button type="button" onClick={() => setLang("en")}
              className={`px-3 py-0.5 text-[11px] font-black uppercase tracking-wider transition-all ${
                lang === "en" ? "text-white bg-[#E85D1A]" : "text-white/35 hover:text-white/70"
              }`}>EN</button>
            <span className="text-white/15">|</span>
            <button type="button" onClick={() => setLang("am")}
              className={`px-3 py-0.5 text-[11px] font-bold amharic transition-all ${
                lang === "am" ? "text-white bg-[#E85D1A]" : "text-white/35 hover:text-white/70"
              }`}>አማ</button>
          </div>
        </div>
      </div>

      {/* ══ PUBLIC NAV — locale={lang} so links update when language changes ══ */}
      <PublicNav locale={lang} />

      {/* ══════════════════════════════════════════════════════
          1. HERO — compact split: heading+stats LEFT | director photo RIGHT
             paddingTop: 96 = 32px utility bar + 64px nav
      ══════════════════════════════════════════════════════ */}
      <section className="bg-[#0B1829] overflow-hidden relative" style={{ paddingTop: 96 }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 60px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 60px)",
          opacity: .025,
        }} />

        <div className="max-w-[1400px] mx-auto relative">
          <div className="grid grid-cols-1 lg:grid-cols-12">

            {/* LEFT — eyebrow + heading + body + stats */}
            <div className="lg:col-span-7 flex flex-col justify-center px-8 py-12">
              <h1 className={`text-4xl md:text-5xl font-black text-white leading-tight mb-4 ${am}`}>
                {t("about.heroTitle1")}
              </h1>
              <p className={`text-white/50 leading-[1.85] max-w-[480px] mb-8 ${
                isAm ? "amharic text-[14px]" : "text-[15px]"
              }`}>
                {t("about.heroBody")}
              </p>

              {/* Live stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { val: projects.length,           labelKey: "about.statManaged"     },
                  { val: completed.length,           labelKey: "about.statCompleted"   },
                  { val: `${fmt(totalBudget)} ETB`,  labelKey: "about.statInvestment"  },
                  { val: verified.length,            labelKey: "about.statContractors" },
                ].map(s => (
                  <div key={s.labelKey} className="border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-center">
                    <p className="text-xl font-extrabold text-white">{s.val}</p>
                    <p className={`text-white/30 text-[10px] mt-0.5 ${isAm ? "amharic text-[11px]" : "font-semibold uppercase tracking-wider"}`}>
                      {t(s.labelKey)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — director photo */}
            <div className="lg:col-span-5 relative min-h-[420px] lg:min-h-[480px]">
              <div className="absolute left-0 top-12 bottom-0 w-px bg-white/[0.08] hidden lg:block" />
              <div className="absolute inset-0 director-grad">
                <img
                  src={DIRECTOR.img}
                  alt={isAm ? DIRECTOR.nameAm : DIRECTOR.nameEn}
                  className="w-full h-full object-cover object-center"
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                <div className="inline-flex items-center gap-2 bg-[#D4560F] px-3.5 py-1.5 mb-4">
                  <Award size={12} className="text-white" />
                  <span className={`text-white text-[10px] font-bold uppercase tracking-[0.22em] ${am}`}>
                    {t("about.directorBadge")}
                  </span>
                </div>
                <h2 className={`font-bold text-white mb-1 ${isAm ? "amharic text-[22px]" : "text-[22px]"}`}>
                  {isAm ? DIRECTOR.nameAm : DIRECTOR.nameEn}
                </h2>
                <p className={`text-white/55 mb-4 ${isAm ? "amharic text-[12px]" : "text-sm"}`}>
                  {isAm ? DIRECTOR.roleAm : DIRECTOR.roleEn}
                </p>
                <div className="bg-[#0B1829]/80 backdrop-blur-sm border border-white/10 p-4">
                  <p className={`text-[#D4560F] text-[10px] font-bold uppercase tracking-[0.2em] mb-2 ${am}`}>
                    {t("about.directorQuoteLabel")}
                  </p>
                  <div className="flex gap-2.5">
                    <Quote size={14} className="text-white/20 shrink-0 mt-0.5" />
                    <p className={`text-white/70 leading-relaxed ${isAm ? "amharic text-[12px]" : "text-[13px] italic"}`}>
                      {t("about.directorQuote")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          2. VISION · MISSION · VALUES
      ══════════════════════════════════════════════════════ */}
      <section className="blueprint py-20">
        <div className="max-w-[1400px] mx-auto px-8">
          <SectionEyebrow color="#D4560F">{t("about.missionEyebrow")}</SectionEyebrow>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 mb-6">

            {/* Vision */}
            <div className="bg-white border border-[#DDE2EB] border-t-4 border-t-[#D4560F]">
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 bg-[#D4560F] flex items-center justify-center text-white shrink-0">
                    <Eye size={20} />
                  </div>
                  <h3 className={`font-bold text-[#1B3A6B] ${isAm ? "amharic text-[20px]" : "text-xl"}`}>
                    {t("about.visionTitle")}
                  </h3>
                </div>
                <p className={`text-[#6B7FA8] leading-[1.85] ${isAm ? "amharic text-[13px]" : "text-sm"}`}>
                  {t("about.visionBody")}
                </p>
              </div>
            </div>

            {/* Mission */}
            <div className="bg-white border border-[#DDE2EB] border-t-4 border-t-[#D4560F]">
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 bg-[#D4560F] flex items-center justify-center text-white shrink-0">
                    <Target size={20} />
                  </div>
                  <h3 className={`font-bold text-[#1B3A6B] ${isAm ? "amharic text-[20px]" : "text-xl"}`}>
                    {t("about.missionTitle")}
                  </h3>
                </div>
                <div className="space-y-4">
                  {[
                    isAm
                      ? "የክ/ከተማውን ነዋሪዎች ፍላጎት መሠረት በማድረግ የህዝብ መገልገያ ተቋማት ግንባታዎች ጥራታቸው ተጠብቆ ለህዝብ ተገቢውን አገልግሎት መስጠት የሚያስችል ደረጃ ላይ ማድረስ።"
                      : "Ensure government-funded public service institutions are constructed to standard and deliver appropriate services to all residents.",
                    isAm
                      ? "ህዝቡ ከሀገሪቱ ልማት ተጠቃሚ እንዲሆን ጋሬጣ የሆነውን የብልሹ አሰራርና አስተሳሰብ በፅናት የሚታገል ኃይል በተቋሙ መፍጠር።"
                      : "Create an institutional force that firmly combats corrupt practices and attitudes hindering citizens from benefiting from national development.",
                    isAm
                      ? "የህዝቡን አንገብጋቢ የሆኑ የመልካም አስተዳደር ተግዳሮቶችን ከሚመለከታቸው ባለድርሻ አካላት ጋር በመቀናጀት መፍታትና ፍትሃዊነትን ማረጋገጥ።"
                      : "Identify and resolve pressing good-governance challenges in coordination with relevant stakeholders, ensuring fairness.",
                  ].map((point, i) => (
                    <div key={i} className="flex items-start gap-3.5">
                      <span className="w-6 h-6 bg-[#D4560F]/10 text-[#D4560F] text-[11px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className={`text-[#6B7FA8] leading-[1.85] ${isAm ? "amharic text-[13px]" : "text-sm"}`}>
                        {point}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Values */}
          <div className="bg-white border border-[#DDE2EB] border-t-4 border-t-[#2A7A4B]">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 bg-[#2A7A4B] flex items-center justify-center text-white shrink-0">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className={`font-bold text-[#1B3A6B] ${isAm ? "amharic text-[20px]" : "text-xl"}`}>
                    {t("about.valuesTitle")}
                  </h3>
                  <p className={`text-[#9AABB8] mt-0.5 ${isAm ? "amharic text-[12px]" : "text-[11px] uppercase tracking-wider"}`}>
                    {t("about.valuesSub")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {VALUES.map(v => (
                  <div key={v.num}
                    className="flex items-center gap-2 bg-[#F7F8FA] border border-[#DDE2EB] px-4 py-2.5">
                    <span className="text-base leading-none">{v.icon}</span>
                    <span className={`font-bold text-[#3D5280] text-[13px] ${am}`}>
                      {t(v.titleKey)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          3. TEAM GRID — 5 members (2 senior + 3 specialists)
      ══════════════════════════════════════════════════════ */}
      <section className="bg-white py-20 border-t border-[#DDE2EB]">
        <div className="max-w-[1400px] mx-auto px-8">
          <div className="mb-3">
            <SectionEyebrow color="#2A7A4B">{t("about.teamEyebrow")}</SectionEyebrow>
          </div>
          <h2 className={`font-extrabold text-[#1B3A6B] leading-tight mb-6 ${isAm ? "amharic text-[32px]" : "text-[36px]"}`}>
            {t("about.teamTitle")}
          </h2>
          <p className={`text-[#6B7FA8] leading-relaxed max-w-[680px] mb-12 ${isAm ? "amharic text-[15px]" : "text-base"}`}>
            {t("about.teamBody")}
          </p>

          {/* Row 1 — 2 senior */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            {TEAM.slice(0, 2).map((member, idx) => (
              <div key={member.nameEn} className="team-card group bg-white border border-[#DDE2EB] card-lift overflow-hidden flex flex-col">
                <div className={`h-1.5 ${idx === 0 ? "bg-[#1B3A6B]" : "bg-[#2A7A4B]"}`} />
                <div className="relative h-72 overflow-hidden bg-[#0B1829] photo-grad">
                  <img src={member.img} alt={isAm ? member.nameAm : member.nameEn}
                    className="team-photo absolute inset-0 w-full h-full object-cover object-top" />
                  <div className="absolute top-0 left-0 w-10 h-10 bg-[#1B3A6B] flex items-center justify-center z-10">
                    <span className="text-white text-[12px] font-extrabold tabular-nums">
                      {String(idx + 2).padStart(2, "0")}
                    </span>
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className={`font-bold text-[#1B3A6B] leading-snug mb-1 group-hover:text-[#D4560F] transition-colors ${
                    isAm ? "amharic text-[18px]" : "text-[19px]"
                  }`}>
                    {isAm ? member.nameAm : member.nameEn}
                  </h3>
                  <p className={`text-[#D4560F] font-semibold mb-5 ${
                    isAm ? "amharic text-[13px]" : "text-[11px] uppercase tracking-wide"
                  }`}>
                    {isAm ? member.roleAm : member.roleEn}
                  </p>
                  <div className="h-px bg-[#F0F3F8] mb-5" />
                  <div className="flex gap-3 flex-1">
                    <Quote size={13} className="text-[#C8D4E0] shrink-0 mt-0.5" />
                    <p className={`text-[#9AABB8] leading-relaxed flex-1 ${isAm ? "amharic text-[13px]" : "text-[13px]"}`}>
                      {t(member.quoteKey)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Row 2 — 3 specialists */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {TEAM.slice(2).map((member, idx) => (
              <div key={member.nameEn} className="team-card group bg-white border border-[#DDE2EB] card-lift overflow-hidden flex flex-col">
                <div className="h-1.5 bg-[#D4560F]" />
                <div className="relative h-56 overflow-hidden bg-[#0B1829] photo-grad">
                  <img src={member.img} alt={isAm ? member.nameAm : member.nameEn}
                    className="team-photo absolute inset-0 w-full h-full object-cover object-top" />
                  <div className="absolute top-0 left-0 w-9 h-9 bg-[#D4560F] flex items-center justify-center z-10">
                    <span className="text-white text-[11px] font-extrabold tabular-nums">
                      {String(idx + 4).padStart(2, "0")}
                    </span>
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className={`font-bold text-[#1B3A6B] leading-snug mb-1 group-hover:text-[#D4560F] transition-colors ${
                    isAm ? "amharic text-[16px]" : "text-[17px]"
                  }`}>
                    {isAm ? member.nameAm : member.nameEn}
                  </h3>
                  <p className={`text-[#D4560F] font-semibold mb-4 ${
                    isAm ? "amharic text-[12px]" : "text-[11px] uppercase tracking-wide"
                  }`}>
                    {isAm ? member.roleAm : member.roleEn}
                  </p>
                  <div className="h-px bg-[#F0F3F8] mb-4" />
                  <div className="flex gap-2.5 flex-1">
                    <Quote size={12} className="text-[#C8D4E0] shrink-0 mt-0.5" />
                    <p className={`text-[#9AABB8] leading-relaxed flex-1 ${isAm ? "amharic text-[12px]" : "text-[12px]"}`}>
                      {t(member.quoteKey)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          4. MANDATE + ORG UNITS
      ══════════════════════════════════════════════════════ */}
      <section className="blueprint py-20 border-t border-[#DDE2EB]">
        <div className="max-w-[1400px] mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

            {/* Mandate */}
            <div className="bg-[#0B1829] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#D4560F]/8 to-transparent pointer-events-none" />
              <div className="relative p-10">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-1 h-5 bg-[#D4560F]" />
                  <span className={`text-[#D4560F] text-[11px] font-bold uppercase tracking-[0.22em] ${am}`}>
                    {t("about.mandateEyebrow")}
                  </span>
                </div>
                <h2 className={`font-extrabold text-white mb-9 leading-tight ${isAm ? "amharic text-[26px]" : "text-[28px]"}`}>
                  {t("about.mandateTitle")}
                </h2>
                <div className="space-y-6">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="flex items-start gap-4 group/item">
                      <span className="text-[#D4560F] font-extrabold text-sm shrink-0 w-6 text-right mt-0.5 tabular-nums">
                        {String(i).padStart(2, "0")}
                      </span>
                      <div className="w-4 h-px bg-white/15 shrink-0 mt-3" />
                      <p className={`text-white/50 leading-relaxed group-hover/item:text-white/80 transition-colors ${
                        isAm ? "amharic text-[13px]" : "text-sm"
                      }`}>
                        {t(`about.mandate${i}`)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Org units */}
            <div className="bg-white border border-[#DDE2EB] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F0F3F8] flex items-center gap-3 bg-[#F7F8FA]">
                <Building2 size={14} className="text-[#1B3A6B]/40" />
                <p className={`text-[#1B3A6B] font-bold ${isAm ? "amharic text-sm" : "text-[11px] uppercase tracking-widest"}`}>
                  {t("about.orgTitle")}
                </p>
              </div>
              {ORG_UNITS.map(u => (
                <div key={u.key}
                  className={`flex items-center gap-3.5 px-6 py-3.5 border-l-[3px] ${u.border} border-b border-[#F7F8FA] last:border-b-0 hover:bg-[#F7F8FA] transition-colors`}>
                  <span className="text-lg shrink-0">{u.icon}</span>
                  <p className={`text-[#3D5280] font-semibold ${isAm ? "amharic text-[13px]" : "text-sm"}`}>
                    {t(u.key)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          5. CTA
      ══════════════════════════════════════════════════════ */}
      <section className="bg-[#1B3A6B] py-20">
        <div className="max-w-[1400px] mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className={`font-extrabold text-white mb-2 ${isAm ? "amharic text-[30px]" : "text-[32px]"}`}>
              {t("about.ctaTitle")}
            </h2>
            <p className={`text-white/50 ${isAm ? "amharic text-[15px]" : "text-lg"}`}>
              {t("about.ctaBody")}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 shrink-0">
            {/* ← use lang (state) not locale (server prop) for correct links after toggle */}
            <Link href={`/${lang}/contact`}
              className={`inline-flex items-center gap-2.5 bg-[#D4560F] hover:bg-[#b8470d] text-white px-8 py-4 font-bold transition-colors ${
                isAm ? "amharic text-sm" : "text-sm uppercase tracking-[0.14em]"
              }`}>
              {t("common.contactUs")} <ArrowRight size={15} />
            </Link>
            <Link href={`/${lang}/services`}
              className={`inline-flex items-center gap-2.5 bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/15 px-8 py-4 font-bold transition-all ${
                isAm ? "amharic text-sm" : "text-sm uppercase tracking-[0.14em]"
              }`}>
              {t("about.ctaServices")} <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}