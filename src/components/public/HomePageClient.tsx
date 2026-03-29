"use client";

// src/app/[locale]/HomePageClient.tsx

import { PublicNav } from "@/components/public/Publicnav";
import {
  Activity, AlertTriangle, ArrowRight, BarChart3,
  Building2, CalendarDays, ChevronDown, ChevronRight,
  Clock, Download, ExternalLink, Eye, FileText,
  Globe, HardHat, Mail, MapPin, Newspaper, Phone,
  PieChart, ShieldCheck, TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

import amMessages from "@/app/[locale]/am.json";
import enMessages from "@/app/[locale]/en.json";
import { getProjectName } from "@/lib/projectLocale";

// ─── Types ────────────────────────────────────────────────────────────────
export type SiteLang = "en" | "am";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

// ─── useTranslation ───────────────────────────────────────────────────────
function useTranslation(lang: SiteLang) {
  const messages: AnyObj =
    lang === "am" ? (amMessages as AnyObj) : (enMessages as AnyObj);

  const t = useCallback(
    (path: string): string => {
      const parts = path.split(".");
      let node: unknown = messages;
      for (const p of parts) {
        if (node == null || typeof node !== "object") return path;
        node = (node as AnyObj)[p];
      }
      return typeof node === "string" ? node : path;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const arr = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (path: string): any[] => {
      const parts = path.split(".");
      let node: unknown = messages;
      for (const p of parts) {
        if (node == null || typeof node !== "object") return [];
        node = (node as AnyObj)[p];
      }
      return Array.isArray(node) ? node : [];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang]
  );

  return { t, arr, isAm: lang === "am" };
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + "K";
  return n.toLocaleString();
}
function calcDaysLeft(d: string | null, nowMs: number): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - nowMs) / 86_400_000);
}

// ─── Static lookup tables ─────────────────────────────────────────────────
// FIX 1: Keys match real DB sector values (Education, Health, Youth, Other)
const SECTOR_STYLES: Record<
  string,
  { topBar: string; badge: string; progress: string; bar: string; color: string }
> = {
  Education: { topBar: "bg-[#1B3A6B]", badge: "bg-blue-100   text-blue-800",   progress: "bg-[#1B3A6B]", bar: "bg-blue-500",   color: "text-blue-400"   },
  Health:    { topBar: "bg-[#039737]", badge: "bg-green-100  text-green-800",  progress: "bg-[#039737]", bar: "bg-rose-500",   color: "text-rose-400"   },
  Youth:     { topBar: "bg-[#E85D1A]", badge: "bg-orange-100 text-orange-800", progress: "bg-[#E85D1A]", bar: "bg-violet-500", color: "text-violet-400" },
  Other:     { topBar: "bg-[#7B5EA7]", badge: "bg-purple-100 text-purple-800", progress: "bg-[#7B5EA7]", bar: "bg-amber-500",  color: "text-amber-400"  },
};

const ANN_TAG_COLORS = [
  "bg-[#E85D1A]/10 text-[#E85D1A] border border-[#E85D1A]/20",
  "bg-blue-500/10  text-blue-400  border border-blue-500/20",
  "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
];

const NAV_HREFS = ["/", "/projects", "/tenders", "/services", "/services", "/about"];

// FIX 2: Descriptions match real DB sector names
const SECTOR_DESC: Record<string, { en: string; am: string }> = {
  Education: { en: "Educational infrastructure for the next generation", am: "ለቀጣዩ ትውልድ የትምህርት መሠረተ ልማት" },
  Health:    { en: "Healthcare facilities serving every resident",        am: "ለእያንዳንዱ ነዋሪ የጤና አገልግሎት"      },
  Youth:     { en: "Youth centers and recreational spaces",              am: "የወጣቶች ማዕከሎችና የመዝናኛ ቦታዎች"     },
  Other:     { en: "Infrastructure and community development projects",  am: "የመሠረተ ልማት እና የማህበረሰብ ልማት ፕሮጀክቶች" },
};

// ─── Section Heading ──────────────────────────────────────────────────────
function SH({
  eyebrow, title, accent = "#E85D1A", dark = false, isAm,
}: {
  eyebrow: string; title: string; accent?: string; dark?: boolean; isAm?: boolean;
}) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-1 h-6 shrink-0" style={{ backgroundColor: accent }} />
        <span
          className={`font-black ${isAm ? "amharic text-sm tracking-normal" : "text-[10px] uppercase tracking-[0.35em]"}`}
          style={{ color: accent }}
        >
          {eyebrow}
        </span>
      </div>
      <h2 className={`serif font-black leading-tight tracking-tight pl-[18px] ${dark ? "text-white" : "text-slate-900"} ${isAm ? "amharic text-[32px]" : "text-[40px]"}`}>
        {title}
      </h2>
    </div>
  );
}

// ─── Construction animation scene ────────────────────────────────────────
function ConstructionScene() {
  return (
    <div className="relative w-full h-full min-h-[360px] overflow-hidden select-none" aria-hidden>
      <style>{`
        @keyframes swing{0%,100%{transform-origin:top center;transform:rotate(-8deg)}50%{transform-origin:top center;transform:rotate(8deg)}}
        .crane-hook{animation:swing 3.5s ease-in-out infinite}
        @keyframes hammer{0%,100%{transform:rotate(0deg) translateY(0)}40%{transform:rotate(-40deg) translateY(-4px)}60%{transform:rotate(10deg) translateY(2px)}}
        .worker-arm1{transform-origin:16px 12px;animation:hammer 1.2s ease-in-out infinite}
        @keyframes dig{0%,100%{transform:rotate(0deg)}50%{transform:rotate(18deg)}}
        .worker-arm2{transform-origin:8px 8px;animation:dig 1.6s ease-in-out infinite}
        @keyframes rise{0%{transform:scaleY(0)}100%{transform:scaleY(1)}}
        .floor1{transform-origin:bottom;animation:rise 1s ease-out 0.3s both}
        .floor2{transform-origin:bottom;animation:rise 1s ease-out 0.7s both}
        .floor3{transform-origin:bottom;animation:rise 1s ease-out 1.1s both}
        .floor4{transform-origin:bottom;animation:rise 1s ease-out 1.5s both}
        @keyframes puff{0%{opacity:0;transform:scale(0.4) translateY(0)}40%{opacity:0.6;transform:scale(1) translateY(-8px)}100%{opacity:0;transform:scale(1.4) translateY(-18px)}}
        .dust1{animation:puff 2s ease-out 0.5s infinite}.dust2{animation:puff 2s ease-out 1.2s infinite}
        @keyframes barfill{from{width:0%}to{width:62%}}
        .progbar{animation:barfill 2.5s ease-out 0.5s both}
        @keyframes floatbadge{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        .floatbadge{animation:floatbadge 3s ease-in-out infinite}
        @keyframes livedot{0%,100%{opacity:1}50%{opacity:0.2}}
        .livedot{animation:livedot 1.5s ease-in-out infinite}
      `}</style>
      <svg viewBox="0 0 520 360" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cs-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#C8DDF0"/><stop offset="100%" stopColor="#E8F2FA"/></linearGradient>
          <linearGradient id="cs-bldg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#4A7290"/><stop offset="100%" stopColor="#2E5570"/></linearGradient>
          <linearGradient id="cs-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9BAFC0"/><stop offset="100%" stopColor="#7A9AB0"/></linearGradient>
        </defs>
        <rect width="520" height="360" fill="url(#cs-sky)"/>
        <rect x="20" y="190" width="50" height="120" fill="#A8BFCC" rx="1"/>
        <rect x="25" y="196" width="8" height="8" fill="#C8D8E4" rx="0.5"/>
        <rect x="37" y="196" width="8" height="8" fill="#C8D8E4" rx="0.5"/>
        <rect x="25" y="210" width="8" height="8" fill="#C8D8E4" rx="0.5"/>
        <rect x="37" y="210" width="8" height="8" fill="#C8D8E4" rx="0.5"/>
        <rect x="78" y="210" width="42" height="100" fill="#94B0C2" rx="1"/>
        <rect x="170" y="270" width="180" height="40" fill="#5A7A90"/>
        <rect x="170" y="230" width="180" height="42" fill="url(#cs-bldg)" className="floor1"/>
        <rect x="178" y="238" width="18" height="15" fill="#7AACCC" rx="0.5" opacity="0.7"/>
        <rect x="204" y="238" width="18" height="15" fill="#7AACCC" rx="0.5" opacity="0.7"/>
        <rect x="230" y="238" width="18" height="15" fill="#7AACCC" rx="0.5" opacity="0.7"/>
        <rect x="170" y="190" width="180" height="42" fill="url(#cs-bldg)" className="floor2"/>
        <rect x="178" y="198" width="18" height="15" fill="#7AACCC" rx="0.5" opacity="0.6"/>
        <rect x="170" y="152" width="180" height="40" fill="url(#cs-bldg)" className="floor3"/>
        <rect x="178" y="130" width="164" height="24" fill="#3A6278" className="floor4"/>
        <rect x="356" y="130" width="4" height="180" fill="#6A8090"/>
        <rect x="370" y="130" width="4" height="180" fill="#6A8090"/>
        <rect x="430" y="50" width="10" height="260" fill="#C08010"/>
        <rect x="380" y="52" width="54" height="6" fill="#D09020"/>
        <rect x="440" y="48" width="70" height="8" fill="#E8A020"/>
        <g className="crane-hook">
          <line x1="480" y1="64" x2="480" y2="100" stroke="#5A4A30" strokeWidth="1.5"/>
          <rect x="474" y="100" width="12" height="8" fill="#4A3A28" rx="1"/>
          <rect x="472" y="108" width="16" height="12" fill="#6A5A40" rx="1"/>
        </g>
        <rect x="0" y="310" width="520" height="50" fill="url(#cs-ground)"/>
        {[0,30,60,90,120,150,180,210,240,270,300,330,360,390,420,450,480].map(x => (
          <rect key={x} x={x} y="305" width="22" height="8" fill="#E85D1A" opacity="0.75" rx="0.5"/>
        ))}
        <g transform="translate(186,270)">
          <rect x="8" y="14" width="12" height="20" fill="#E85D1A" rx="2"/>
          <ellipse cx="14" cy="10" rx="9" ry="6" fill="#F4A03A"/>
          <circle cx="14" cy="9" r="7" fill="#F5DDB8"/>
          <g className="worker-arm1">
            <rect x="18" y="12" width="4" height="14" fill="#D4560F" rx="1"/>
            <rect x="17" y="8" width="12" height="6" fill="#5A4A30" rx="1"/>
          </g>
          <rect x="8" y="33" width="5" height="14" fill="#2A4A6B" rx="1"/>
          <rect x="15" y="33" width="5" height="14" fill="#2A4A6B" rx="1"/>
        </g>
        <g transform="translate(310,268)">
          <rect x="8" y="14" width="12" height="20" fill="#039737" rx="2"/>
          <ellipse cx="14" cy="10" rx="9" ry="6" fill="#F4C03A"/>
          <circle cx="14" cy="9" r="7" fill="#F0D0A8"/>
          <g className="worker-arm2">
            <rect x="18" y="10" width="3" height="28" fill="#8A6840" rx="1"/>
            <ellipse cx="19.5" cy="38" rx="5" ry="3.5" fill="#5A4828"/>
          </g>
          <rect x="8" y="33" width="5" height="14" fill="#1A3A5A" rx="1"/>
          <rect x="15" y="33" width="5" height="14" fill="#1A3A5A" rx="1"/>
        </g>
        <circle cx="200" cy="265" r="8" fill="#C8D8E4" opacity="0.5" className="dust1"/>
        <circle cx="325" cy="264" r="7" fill="#C8D8E4" opacity="0.5" className="dust2"/>
        <g transform="translate(200,90)" className="floatbadge">
          <rect width="120" height="44" rx="4" fill="white" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.15))"/>
          <rect x="10" y="10" width="14" height="14" rx="2" fill="#E85D1A"/>
          <text x="30" y="20" fontSize="7" fill="#0A1628" fontWeight="700" fontFamily="sans-serif">PROJECT PROGRESS</text>
          <rect x="10" y="28" width="80" height="6" rx="2" fill="#EEF1F6"/>
          <rect x="10" y="28" width="50" height="6" rx="2" fill="#E85D1A" className="progbar"/>
          <text x="96" y="34" fontSize="8" fill="#0A1628" fontWeight="800" fontFamily="sans-serif">62%</text>
        </g>
        <g transform="translate(360,86)">
          <rect width="90" height="24" rx="12" fill="#E85D1A"/>
          <circle cx="16" cy="12" r="4" fill="white" className="livedot"/>
          <text x="25" y="16" fontSize="8" fill="white" fontWeight="700" fontFamily="sans-serif">LIVE SITE</text>
        </g>
      </svg>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────
const ACTIVE_PROJECT_STATUSES = new Set(["Ongoing", "Design Phase", "BOQ Verification"]);

const PROJECT_ROW_DOT: Record<string, string> = {
  Ongoing: "bg-emerald-500",
  "Design Phase": "bg-indigo-500",
  "BOQ Verification": "bg-cyan-500",
};

const HOME_SECTION_MIN_PROJECTS = 3;
const HOME_SECTION_MIN_TENDERS  = 2;

const PROJECT_STATUS_TKEY: Record<string, string> = {
  Ongoing:            "projects.statusOngoing",
  "Design Phase":     "projects.statusDesign",
  "BOQ Verification": "projects.statusBOQ",
  Completed:          "projects.statusCompleted",
  Planned:            "projects.statusPlanned",
  "On Hold":          "projects.statusOnHold",
};

interface ProjectRow {
  id: string; name: string; name_am?: string | null;
  sector: string | null; status: string;
  progress: number | null; budget: number | null;
  location: string | null; expected_end_date: string | null;
  contractor_name: string | null;
}
interface TenderRow {
  tender_id: string; title: string; ref_no: string; status: string;
  submission_deadline: string | null; budget_estimate: number;
  project_type: string | null; woreda: string | null;
}
interface ContractorRow { id: string; }

// FIX 3: sectorMap now tracks ongoing count too
type SectorStats = { count: number; completed: number; ongoing: number };

export interface NewsItem {
  id: string; tag_en: string; tag_am: string;
  title_en: string; title_am: string;
  body_en: string; body_am: string;
  published_date: string; display_order: number;
}

export function HomePageClient({
  locale, projects, tenders, contractors, news = [],
}: {
  locale: string;
  projects: ProjectRow[]; tenders: TenderRow[]; contractors: ContractorRow[];
  news?: NewsItem[];
}) {
  const [lang, setLang] = useState<SiteLang>("en");
  const [projectsExpanded, setProjectsExpanded] = useState(false);
  const [tendersExpanded,  setTendersExpanded]  = useState(false);
  const [listNowMs] = useState(() => Date.now());
  const { t, isAm } = useTranslation(lang);
  const am = isAm ? "amharic" : "";

  // ── Data derivations ──
  const projs          = projects     ?? [];
  const allTenders     = tenders      ?? [];
  const allContractors = contractors  ?? [];
  const totalBudget    = projs.reduce((s, p) => s + Number(p.budget || 0), 0);
  const completed      = projs.filter(p => p.status === "Completed");
  const openTenders    = allTenders.filter(tn => tn.status === "Published");

  const activeProjectsHome = projs
    .filter(p => ACTIVE_PROJECT_STATUSES.has(p.status))
    .sort((a, b) => (Number(b.progress) || 0) - (Number(a.progress) || 0))
    .slice(0, 12);

  const projectsExpandable = activeProjectsHome.length > HOME_SECTION_MIN_PROJECTS;
  const visibleActiveProjects =
    projectsExpanded || !projectsExpandable
      ? activeProjectsHome
      : activeProjectsHome.slice(0, HOME_SECTION_MIN_PROJECTS);

  const tendersExpandable = allTenders.length > HOME_SECTION_MIN_TENDERS;
  const visibleTenders =
    tendersExpanded || !tendersExpandable
      ? allTenders
      : allTenders.slice(0, HOME_SECTION_MIN_TENDERS);

  // FIX 3: build sectorMap with ongoing count so the card displays correctly
  const sectorMap: Record<string, SectorStats> = {};
  projs.forEach(p => {
    if (!p.sector) return;
    if (!sectorMap[p.sector]) sectorMap[p.sector] = { count: 0, completed: 0, ongoing: 0 };
    sectorMap[p.sector].count++;
    if (p.status === "Completed") sectorMap[p.sector].completed++;
    if (p.status === "Ongoing")   sectorMap[p.sector].ongoing++;
  });

  return (
    <div className="min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Serif+Display:ital@0;1&family=Noto+Serif+Ethiopic:wght@400;600;700&display=swap');
        *, *::before, *::after { font-family: 'DM Sans', sans-serif; }
        .serif   { font-family: 'DM Serif Display', Georgia, serif !important; }
        .amharic { font-family: 'Noto Serif Ethiopic', serif !important; line-height: 1.75 !important; }
        html { scroll-behavior: smooth; }
        .card-dark { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); transition:border-color .2s,background .2s,transform .2s,box-shadow .2s; }
        .card-dark:hover { border-color:rgba(232,93,26,0.45); background:rgba(255,255,255,0.06); transform:translateY(-2px); box-shadow:0 16px 40px rgba(0,0,0,.3); }
        .card-light { background:#fff; border:1px solid #e2e8f0; transition:box-shadow .2s,border-color .2s,transform .2s; }
        .card-light:hover { box-shadow:0 12px 32px rgba(10,22,40,.12); border-color:rgba(232,93,26,.30); transform:translateY(-2px); }
        .grid-texture { background-image:repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 60px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 60px); opacity:0.03; }
        @keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.35}}.pulse{animation:pulse-dot 2s ease-in-out infinite;}
      `}</style>

      {/* UTILITY BAR */}
      <div className="bg-[#071220] border-b border-white/[0.06] text-[11.5px] fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-8 h-8 flex items-center justify-between">
          <div className="hidden md:flex items-center gap-6 text-white/35">
            <a href={`tel:${t("util_bar.phone")}`} className="flex items-center gap-1.5 hover:text-white/70 transition-colors">
              <Phone size={10} /> {t("util_bar.phone")}
            </a>
            <a href={`mailto:${t("util_bar.email")}`} className="flex items-center gap-1.5 hover:text-white/70 transition-colors">
              <Mail size={10} /> {t("util_bar.email")}
            </a>
            <span className={`flex items-center gap-1.5 ${am}`}>
              <Clock size={10} className="text-[#E85D1A] shrink-0" /> {t("util_bar.hours")}
            </span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <Globe size={10} className="text-white/20 mr-1" />
            <button type="button" onClick={() => setLang("en")}
              className={`px-3 py-0.5 text-[11px] font-black uppercase tracking-wider transition-all ${lang==="en" ? "text-white bg-[#E85D1A]" : "text-white/35 hover:text-white/70"}`}>
              EN
            </button>
            <span className="text-white/15">|</span>
            <button type="button" onClick={() => setLang("am")}
              className={`px-3 py-0.5 text-[11px] font-bold amharic transition-all ${lang==="am" ? "text-white bg-[#E85D1A]" : "text-white/35 hover:text-white/70"}`}>
              አማ
            </button>
          </div>
        </div>
      </div>

      <PublicNav locale={locale} />

      {/* ══ 1. HERO ══ */}
      <section className="relative min-h-screen bg-[#0A1628] flex items-center overflow-hidden pt-32">
        <div className="absolute inset-0 grid pointer-events-none" />
        <div className="absolute top-0 right-0 w-1/2 h-full  via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-8 py-24 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-7">
              <h1 className={`serif text-white leading-[1.02] tracking-tight mb-4 ${isAm ? `${am} text-[52px] md:text-[64px]` : "text-[64px] md:text-[80px]"}`}>
                {t("hero.headline_1")}<br />
                <em className="not-italic text-[#039737]">{t("hero.headline_accent")}</em>
                {" "}{t("hero.headline_2")}
              </h1>
              <p className={`text-white/45 leading-[1.85] mb-10 max-w-[540px] ${isAm ? `${am} text-[15px]` : "text-[17px]"}`}>
                {t("hero.subtext")}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href={`/${locale}/projects`}
                  className={`inline-flex items-center gap-2.5 bg-[#E85D1A] hover:bg-orange-500 text-white px-8 py-4 font-black transition-colors ${isAm ? `${am} text-sm` : "text-[12px] uppercase tracking-[0.18em]"}`}>
                  <Building2 size={14} strokeWidth={2.5} /> {t("hero.cta_projects")}
                </Link>
                <Link href={`/${locale}/tenders`}
                  className={`inline-flex items-center gap-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/15 px-8 py-4 font-black transition-all ${isAm ? `${am} text-sm` : "text-[12px] uppercase tracking-[0.18em]"}`}>
                  <FileText size={14} strokeWidth={2.5} /> {t("hero.cta_tenders")}
                </Link>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="card-dark overflow-hidden">
                <ConstructionScene />
                {(() => {
                  const INIT_WOREDAS = 10, INIT_CITIZENS = 5_000, INIT_COMPLETED = 95, INIT_YEARS = 4;
                  const stats = [
                    { display: `${INIT_WOREDAS}+`,                              labelKey: "hero.stat_woredas",   liveAdded: 0              },
                    { display: `${(INIT_CITIZENS/1_000).toFixed(0)}K+`,         labelKey: "hero.stat_citizens",  liveAdded: 0              },
                    { display: `${INIT_COMPLETED + completed.length}+`,          labelKey: "hero.stat_completed", liveAdded: completed.length},
                    { display: `${INIT_YEARS}+`,                                 labelKey: "hero.stat_years",     liveAdded: 0              },
                  ] as const;
                  return (
                    <div className="border-t border-white/[0.06] grid grid-cols-2 gap-px bg-white/[0.04]">
                      {stats.map((s, i) => (
                        <div key={i} className="bg-[#0A1628] px-4 py-3 text-center relative">
                          <p className="text-[22px] font-black text-[#E85D1A] leading-none mb-1">{s.display}</p>
                          <p className={`text-white/30 font-black ${isAm ? `${am} text-[10px]` : "text-[9px] uppercase tracking-wider"}`}>
                            {t(s.labelKey)}
                          </p>
                          {s.liveAdded > 0 && (
                            <span className="absolute top-1.5 right-1.5 text-[8px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-1.5 py-0.5">
                              +{s.liveAdded}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 2. KPI STRIP ══ */}
      <section className="bg-[#E85D1A]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/20">
            {[
              { val: projs.length,              labelKey: "statistics.active_projects"        },
              { val: fmt(totalBudget) + " ETB", labelKey: "statistics.portfolio_label"        },
              { val: allContractors.length,     labelKey: "statistics.registered_contractors" },
              { val: openTenders.length,        labelKey: "statistics.open_tenders"           },
            ].map(s => (
              <div key={s.labelKey} className="flex flex-col items-center justify-center py-10 px-6 text-center gap-1">
                <p className="text-[38px] font-black text-white leading-none">{s.val}</p>
                <p className={`text-white/75 font-black ${isAm ? `${am} text-[13px]` : "text-[10px] uppercase tracking-[0.2em]"}`}>
                  {t(s.labelKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 3. SECTOR HIGHLIGHTS ══ */}
      <section className="bg-[#0D1F38] py-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <p className={`font-black text-[#E85D1A] mb-4 ${isAm ? `${am} text-sm` : "text-[10px] uppercase tracking-[0.45em]"}`}>
              {t("statistics.eyebrow")}
            </p>
            <h2 className={`serif text-white leading-tight tracking-tight ${isAm ? `${am} text-[38px]` : "text-[48px]"}`}>
              {t("statistics.title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* FIX 4: SECTOR_STYLES keys now match DB; sectorMap now has .ongoing */}
            {Object.entries(SECTOR_STYLES).map(([sector, meta]) => {
              const stats: SectorStats = sectorMap[sector] ?? { count: 0, completed: 0, ongoing: 0 };
              const pct = stats.count > 0 ? Math.round((stats.completed / stats.count) * 100) : 0;
              const desc = SECTOR_DESC[sector];
              return (
                <Link key={sector} href={`/${locale}/projects?sector=${sector}`} className="card-dark p-7 block">
                  <div className={`font-black mb-5 ${meta.color} ${isAm ? `${am} text-xs` : "text-[10px] uppercase tracking-[0.2em]"}`}>
                    ◆ {sector}
                  </div>
                  <h3 className={`serif text-white leading-tight mb-3 ${isAm ? `${am} text-[20px]` : "text-[22px]"}`}>{sector}</h3>
                  <p className={`text-white/35 leading-relaxed mb-1 ${isAm ? `${am} text-[12px]` : "text-[13px]"}`}>
                    {isAm ? desc?.am : desc?.en}
                  </p>
                  <div className="flex justify-between font-black text-white/30 mb-2 mt-5 text-[10px] uppercase tracking-wider">
                    <span>{stats.count} {isAm ? "ፕሮጀክቶች" : "projects"}</span>
                    <span className={meta.color}>
                      {stats.ongoing > 0
                        ? `${stats.ongoing} ${isAm ? "ቀጣይ" : "ongoing"}`
                        : `${pct}% ${isAm ? "ተጠናቅቋል" : "done"}`}
                    </span>
                  </div>
                  <div className="h-[3px] bg-white/[0.08] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ 4. ACTIVE PROJECTS ══ */}
      <section className="bg-[#F4F5F7] py-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-14">
            <SH eyebrow={t("projects.eyebrow")} title={t("projects.title")} accent="#E85D1A" dark={false} isAm={isAm} />
            <div className="flex items-center gap-3 shrink-0">
              {projectsExpandable && (
                <button type="button" onClick={() => setProjectsExpanded(v => !v)}
                  className={`inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition-colors hover:border-[#E85D1A]/40 hover:text-[#E85D1A] ${am}`}
                  aria-expanded={projectsExpanded}>
                  <ChevronDown size={20} strokeWidth={2.5} className={`transition-transform duration-200 ${projectsExpanded ? "rotate-180" : ""}`} aria-hidden />
                </button>
              )}
              <Link href={`/${locale}/projects`}
                className={`inline-flex items-center gap-2 font-black text-slate-400 hover:text-[#E85D1A] uppercase transition-colors whitespace-nowrap ${isAm ? `${am} text-sm tracking-normal` : "text-[12px] tracking-[0.14em]"}`}>
                {t("projects.view_all")} <ArrowRight size={13} strokeWidth={2.5} />
              </Link>
            </div>
          </div>

          {activeProjectsHome.length === 0 ? (
            <div className="bg-white border border-slate-200 p-16 text-center">
              <Building2 size={32} className="text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
              <p className={`text-slate-400 font-bold text-sm ${am}`}>{t("projects.empty")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleActiveProjects.map(p => {
                const days = calcDaysLeft(p.expected_end_date, listNowMs);
                const urgent = days !== null && days >= 0 && days <= 7;
                const dotClass = urgent ? "bg-red-500" : (PROJECT_ROW_DOT[p.status] ?? "bg-[#E85D1A]");
                const statusKey = PROJECT_STATUS_TKEY[p.status];
                const statusLabel = statusKey ? t(statusKey) : p.status;
                const sectorMono = (p.sector || "—").replace(/\s+/g, " ").slice(0, 10).toUpperCase();
                return (
                  <Link key={p.id} href={`/${locale}/projects/${p.id}`}
                    className="card-light flex items-center gap-5 px-6 py-4 group rounded-none">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                    <span className="text-[9px] font-black text-[#E85D1A] font-mono tracking-widest w-28 shrink-0 hidden sm:block">{sectorMono}</span>
                    <span className={`flex-1 font-black text-slate-900 group-hover:text-[#E85D1A] transition-colors truncate ${isAm ? `${am} text-[13px]` : "text-[13px] uppercase tracking-tight"}`}>
                      {getProjectName(p, lang)}
                    </span>
                    <span className={`text-[9px] font-black text-slate-400 uppercase tracking-wider hidden md:block shrink-0 max-w-[140px] truncate ${am}`}>{statusLabel}</span>
                    {p.location && <span className="text-[10px] font-bold text-slate-400 hidden lg:block shrink-0 max-w-[160px] truncate">{p.location}</span>}
                    {p.contractor_name && (
                      <span className="text-[10px] font-bold text-slate-400 hidden xl:flex items-center gap-1 shrink-0 max-w-[140px] truncate">
                        <HardHat size={10} className="shrink-0 opacity-60" />{p.contractor_name}
                      </span>
                    )}
                    <span className="text-[9px] font-black text-[#E85D1A] shrink-0 hidden sm:block">{p.progress ?? 0}%</span>
                    {days !== null && days >= 0 && (
                      <span className={`text-[9px] font-black px-2.5 py-1 shrink-0 ${urgent ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
                        {days}d {t("projects.left")}
                      </span>
                    )}
                    {days !== null && days < 0 && (
                      <span className="text-[9px] font-black px-2.5 py-1 shrink-0 bg-red-50 text-red-600">
                        {Math.abs(days)}d {t("projects.overdue")}
                      </span>
                    )}
                    <ArrowRight size={13} className="text-slate-300 group-hover:text-[#E85D1A] transition-colors shrink-0" />
                  </Link>
                );
              })}
              <div className="pt-2">
                <Link href={`/${locale}/projects`}
                  className={`inline-flex items-center gap-2 font-black text-slate-400 hover:text-[#E85D1A] uppercase transition-colors ${isAm ? `${am} text-sm tracking-normal` : "text-[11px] tracking-[0.14em]"}`}>
                  {t("projects.view_all")} <ArrowRight size={12} strokeWidth={2.5} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══ 5. TENDERS ══ */}
      <section className="bg-[#0A1628] py-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-14">
            <SH eyebrow={t("tenders.eyebrow")} title={t("tenders.title")} accent="#E85D1A" dark isAm={isAm} />
            <div className="flex items-center gap-3 shrink-0">
              {tendersExpandable && (
                <button type="button" onClick={() => setTendersExpanded(v => !v)}
                  className={`inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 text-white/40 transition-colors hover:border-[#E85D1A]/40 hover:text-[#E85D1A] ${am}`}
                  aria-expanded={tendersExpanded}>
                  <ChevronDown size={20} strokeWidth={2.5} className={`transition-transform duration-200 ${tendersExpanded ? "rotate-180" : ""}`} aria-hidden />
                </button>
              )}
              <Link href={`/${locale}/tenders`}
                className={`inline-flex items-center gap-2 font-black text-white/30 hover:text-[#E85D1A] uppercase transition-colors whitespace-nowrap ${isAm ? `${am} text-sm tracking-normal` : "text-[12px] tracking-[0.14em]"}`}>
                {t("tenders.view_all")} <ArrowRight size={13} strokeWidth={2.5} />
              </Link>
            </div>
          </div>

          {allTenders.length === 0 ? (
            <div className="card-dark p-16 text-center">
              <FileText size={32} className="text-white/15 mx-auto mb-3" strokeWidth={1.5} />
              <p className={`text-white/30 font-bold ${am}`}>{t("tenders.empty")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleTenders.map(tn => {
                const deadline = tn.submission_deadline ? new Date(tn.submission_deadline) : null;
                const days = deadline ? Math.ceil((deadline.getTime() - listNowMs) / 86400000) : null;
                const urgent = days !== null && days >= 0 && days <= 7;
                return (
                  <Link key={tn.tender_id} href={`/${locale}/tenders/${tn.tender_id}`}
                    className="card-dark flex items-center gap-5 px-6 py-4 group border border-transparent hover:border-[#E85D1A]/40 transition-all rounded-none">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${urgent ? "bg-red-400" : "bg-[#E85D1A]"}`} />
                    <span className="text-[9px] font-black text-[#E85D1A]/60 font-mono tracking-widest w-28 shrink-0 hidden sm:block">{tn.ref_no}</span>
                    <span className={`flex-1 font-black text-white/80 group-hover:text-[#E85D1A] transition-colors truncate ${isAm ? `${am} text-[13px]` : "text-[13px] uppercase tracking-tight"}`}>{tn.title}</span>
                    {tn.project_type && <span className="text-[9px] font-black text-white/25 uppercase tracking-wider hidden md:block shrink-0">{tn.project_type}</span>}
                    {tn.woreda && <span className="text-[10px] font-bold text-white/30 hidden lg:block shrink-0">{tn.woreda}</span>}
                    {days !== null && days >= 0 && (
                      <span className={`text-[9px] font-black px-2.5 py-1 shrink-0 ${urgent ? "bg-red-500/15 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                        {days}d {t("tenders.left")}
                      </span>
                    )}
                    <ArrowRight size={13} className="text-white/15 group-hover:text-[#E85D1A] transition-colors shrink-0" />
                  </Link>
                );
              })}
              <div className="pt-2">
                <Link href={`/${locale}/tenders`}
                  className={`inline-flex items-center gap-2 font-black text-white/25 hover:text-[#E85D1A] uppercase transition-colors ${isAm ? `${am} text-sm tracking-normal` : "text-[11px] tracking-[0.14em]"}`}>
                  {t("tenders.view_all")} <ArrowRight size={12} strokeWidth={2.5} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══ 6. NEWS ══ */}
      <section className="bg-[#F4F5F7] py-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-end justify-between mb-14 " >
            <SH eyebrow={t("news.eyebrow")} title={t("news.title")} accent="#E85D1A" dark={false} isAm={isAm} />
            <Link href={`/${locale}/contact`}
              className={`inline-flex items-center gap-2 font-black text-slate-400 hover:text-[#E85D1A] uppercase transition-colors ${isAm ? `${am} text-sm tracking-normal` : "text-[12px] tracking-[0.14em]"}`}>
              {t("news.view_all")} <ArrowRight size={13} strokeWidth={2.5} />
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {news.length === 0 ? (
              <div className="col-span-3 bg-white border border-slate-200 p-12 text-center">
                <Newspaper size={32} className="text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
                <p className={`text-slate-400 font-bold text-sm ${am}`}>{t("news.empty")}</p>
              </div>
            ) : news.map((item, i) => (
              <div key={item.id} className="card-light flex flex-col group cursor-pointer overflow-hidden">
                <div className={`h-1 ${i===0?"bg-[#E85D1A]":i===1?"bg-[#0A1628]":"bg-[#039737]"}`} />
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`text-[9px] font-black px-2.5 py-1 uppercase tracking-wider ${ANN_TAG_COLORS[i % ANN_TAG_COLORS.length]}`}>
                      {isAm ? item.tag_am : item.tag_en}
                    </span>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold">
                      <CalendarDays size={10} strokeWidth={2} />
                      {new Date(item.published_date).toLocaleDateString(isAm?"am-ET":"en-GB",{day:"numeric",month:"long",year:"numeric"})}
                    </div>
                  </div>
                  <h3 className={`font-black text-slate-900 leading-snug mb-3 group-hover:text-[#E85D1A] transition-colors ${isAm?`${am} text-[15px]`:"text-[16px]"}`}>
                    {isAm ? item.title_am : item.title_en}
                  </h3>
                  <p className={`text-slate-500 leading-relaxed flex-1 line-clamp-3 ${isAm?`${am} text-[12.5px]`:"text-sm"}`}>
                    {isAm ? item.body_am : item.body_en}
                  </p>
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <span className={`inline-flex items-center gap-1.5 font-black text-slate-300 group-hover:text-[#E85D1A] transition-colors ${isAm?`${am} text-[11px]`:"text-[11px] uppercase tracking-wider"}`}>
                      {t("news.read_more")} <ChevronRight size={10} strokeWidth={2.5} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 7. CITIZEN SERVICES ══ */}
      <section className="bg-[#0D1F38] py-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="mb-14">
            <SH eyebrow={t("citizen_services.eyebrow")} title={t("citizen_services.title")} accent="#E85D1A" dark isAm={isAm} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { tKey:"permit",  icon:<Building2 size={28} strokeWidth={1.75}/>,    bg:"bg-white",     titleC:"text-slate-900",descC:"text-slate-500", iconC:"text-[#0A1628]", ctaStyle:"bg-[#0A1628] hover:bg-[#071220] text-white" },
              { tKey:"illegal", icon:<AlertTriangle size={28} strokeWidth={1.75}/>, bg:"bg-[#E85D1A]", titleC:"text-white",    descC:"text-white/60", iconC:"text-white/80",  ctaStyle:"bg-white hover:bg-orange-50 text-[#E85D1A]" },
              { tKey:"land",    icon:<Download size={28} strokeWidth={1.75}/>,      bg:"bg-white",     titleC:"text-slate-900",descC:"text-slate-500", iconC:"text-[#039737]", ctaStyle:"bg-[#039737] hover:bg-[#027a2d] text-white" },
            ].map(svc => (
              <Link key={svc.tKey} href={`/${locale}/services`}
                className={`${svc.bg} p-7 flex flex-col group hover:shadow-2xl transition-all duration-200`}>
                <div className={`${svc.iconC} mb-5`}>{svc.icon}</div>
                <h3 className={`serif leading-tight tracking-tight mb-2 ${svc.titleC} ${isAm?`${am} text-[18px]`:"text-[22px]"}`}>
                  {t(`citizen_services.${svc.tKey}_title`)}
                </h3>
                <p className={`leading-relaxed flex-1 mb-6 ${svc.descC} ${isAm?`${am} text-[13px]`:"text-[13.5px]"}`}>
                  {t(`citizen_services.${svc.tKey}_desc`)}
                </p>
                <span className={`inline-flex items-center justify-center gap-2 py-3 px-5 font-black transition-colors ${svc.ctaStyle} ${isAm?`${am} text-sm`:"text-[11px] uppercase tracking-[0.18em]"}`}>
                  {t(`citizen_services.${svc.tKey}_cta`)} <ArrowRight size={12} strokeWidth={2.5} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="bg-[#0A1628] text-white">
        <div className="max-w-7xl mx-auto px-8 py-14 grid grid-cols-1 md:grid-cols-5 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-[#E85D1A] flex items-center justify-center shrink-0">
                <span className="text-white font-black text-lg amharic leading-none">ሌ</span>
              </div>
              <div>
                <p className={`font-black text-white text-sm leading-tight ${am}`}>{t("footer.org_name")}</p>
                <p className={`text-white/20 ${isAm?`${am} text-[10px]`:"text-[9px] uppercase tracking-widest"}`}>{t("footer.org_sub")}</p>
              </div>
            </div>
            <p className={`text-white/30 text-sm leading-relaxed max-w-[280px] ${isAm?`${am} text-[12px]`:""}`}>{t("footer.about")}</p>
            <div className="mt-6 border-t border-white/[0.07] pt-5">
              <p className={`font-black text-white/20 mb-3 ${isAm?am:"text-[9px] uppercase tracking-widest"}`}>{t("footer.hours_label")}</p>
              <div className="space-y-1.5 text-xs">
                {[
                  { dayKey:"footer.day1", hoursKey:"footer.monFriHours", open:true  },
                  { dayKey:"footer.day2", hoursKey:"footer.satHours",    open:true  },
                  { dayKey:"footer.day3", hoursKey:"footer.closed",      open:false },
                  { dayKey:"footer.day4", hoursKey:"footer.closed",      open:false },
                ].map((h, i) => (
                  <div key={i} className="flex justify-between">
                    <span className={`text-white/30 ${am}`}>{t(h.dayKey)}</span>
                    <span className={h.open?"text-white/55 font-medium":"text-white/15"}>{t(h.hoursKey)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <p className={`font-black text-[#E85D1A] mb-5 ${isAm?`${am} text-sm`:"text-[9px] uppercase tracking-[0.2em]"}`}>{t("footer.nav_title")}</p>
            <ul className="space-y-3">
              {[
                {labelEn:"Home",     labelAm:"መነሻ",      href:""},
                {labelEn:"About",    labelAm:"ስለ እኛ",    href:"/about"},
                {labelEn:"Projects", labelAm:"ፕሮጀክቶች",  href:"/projects"},
                {labelEn:"Tenders",  labelAm:"ጨረታዎች",   href:"/tenders"},
                {labelEn:"Services", labelAm:"አገልግሎቶች", href:"/services"},
                {labelEn:"Contact",  labelAm:"አግኙን",     href:"/contact"},
              ].map((item, i) => (
                <li key={i}>
                  <Link href={`/${lang}${item.href}`} className={`text-sm text-white/35 hover:text-white transition-colors ${am}`}>
                    {isAm ? item.labelAm : item.labelEn}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className={`font-black text-[#039737] mb-5 ${isAm?`${am} text-sm`:"text-[9px] uppercase tracking-[0.2em]"}`}>{t("footer.services_title")}</p>
            <ul className="space-y-3">
              {(isAm
                ? ["የግንባታ ፍቃዶች","ቦታ ምርመራ","ሰነድ ጥያቄዎች","ቅሬታ ማቅረብ","ኮንትራክተር ምዝገባ"]
                : ["Construction Permits","Site Inspections","Document Requests","Complaint Submission","Contractor Registration"]
              ).map((s, i) => (
                <li key={i} className={`text-sm text-white/30 ${am}`}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className={`font-black text-white/20 mb-5 ${isAm?`${am} text-sm`:"text-[9px] uppercase tracking-[0.2em]"}`}>{t("footer.contact_title")}</p>
            <ul className="space-y-3 mb-6">
              {[t("util_bar.phone"), t("util_bar.email"), isAm?"ለሚ ኩራ ክ/ከተማ፣ አዲስ አበባ":"Lemi Kura Sub-City, Addis Ababa"].map((item, i) => (
                <li key={i} className={`text-sm text-white/25 ${am}`}>{item}</li>
              ))}
            </ul>
            <div className="border-t border-white/[0.07] pt-5">
              <p className={`font-black text-white/15 mb-3 ${isAm?am:"text-[9px] uppercase tracking-widest"}`}>{t("footer.social_title")}</p>
              <div className="flex gap-2 flex-wrap">
                {["Facebook","Telegram","YouTube"].map(s => (
                  <button key={s} type="button" className="text-[9px] font-black px-3 py-1.5 border border-white/10 text-white/25 hover:text-white/55 hover:border-white/25 transition-colors uppercase tracking-wider">{s}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-white/[0.05] bg-[#060F1E]">
          <div className="max-w-7xl mx-auto px-8 py-4 flex flex-wrap items-center justify-between gap-4">
            <p className="text-white/12 text-xs">&copy; {new Date().getFullYear()} {t("footer.copyright")} | {t("footer.city")}</p>
            <Link href={`/${locale}/admin/login`}
              className="flex items-center gap-1.5 text-white/12 hover:text-white/35 text-[9px] font-black uppercase tracking-widest transition-colors">
              <ShieldCheck size={9} /> {t("footer.admin")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}