"use client";
// src/components/public/PublicTendersClient.tsx
//
// ⚠️  SAME PATTERN AS PublicProjectsClient — DO NOT use next-intl useTranslations() here.
//   It is server-resolved and won't re-render when lang state changes.
//   Import JSON directly and walk with a local t() memoized on lang state.

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { PublicNav } from "@/components/public/Publicnav";
import { useRouter, usePathname } from "next/navigation";
import {
  Search, BarChart3, CalendarDays, MapPin, HardHat,
  ClipboardList, FileText, Globe, ArrowRight, Clock,
  Filter, ChevronDown, AlertTriangle, CheckCircle2,
  Phone, Mail,
} from "lucide-react";

// ── Direct JSON imports — must NOT use next-intl here ────────────────────────
import enMessages from "@/app/[locale]/en.json";
import amMessages from "@/app/[locale]/am.json";

// ── Types ─────────────────────────────────────────────────────────────────────
export type SiteLang = "en" | "am";
type AnyObj = Record<string, any>;

type Tender = {
  tender_id: string; title: string; ref_no: string; status: string;
  submission_deadline: string | null; closing_date: string | null;
  budget_estimate: number; currency: string; project_type: string; woreda: string;
  description: string | null; evaluation_method: string; min_experience_years: number;
  required_documents: string[] | null; publication_date: string | null;
};

// ── Local translation hook — re-renders when lang state changes ───────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return n.toLocaleString();
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Design constants ──────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  School:    { bg: "bg-blue-500/10",   text: "text-blue-300",   border: "border-blue-500/20"   },
  Health:    { bg: "bg-green-500/10",  text: "text-green-300",  border: "border-green-500/20"  },
  Youth:     { bg: "bg-violet-500/10", text: "text-violet-300", border: "border-violet-500/20" },
  Road:      { bg: "bg-amber-500/10",  text: "text-amber-300",  border: "border-amber-500/20"  },
  Education: { bg: "bg-blue-500/10",   text: "text-blue-300",   border: "border-blue-500/20"   },
  Other:     { bg: "bg-slate-500/10",  text: "text-slate-300",  border: "border-slate-500/20"  },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function PublicTendersClient({
  locale,
  tenders,
}: {
  locale: string;
  tenders: Tender[];
}) {
  // lang STATE drives all translations — same as HomePageClient / PublicProjectsClient
  const router   = useRouter();
  const pathname = usePathname();
  const [lang, setLangState] = useState<SiteLang>(locale === "am" ? "am" : "en");
  const setLang = (newLang: SiteLang) => {
    setLangState(newLang);
    router.replace(pathname.replace(/^\/(en|am)/, `/${newLang}`));
  };
  const { t, isAm }     = useTranslation(lang);
  const am = isAm ? "amharic" : "";   // ← correct CSS class name (not font-noto-ethiopic)

  const [search,       setSearch]       = useState("");
  const [typeFilter,   setTypeFilter]   = useState("All");
  const [woredaFilter, setWoredaFilter] = useState("All");
  const [expanded,     setExpanded]     = useState<string | null>(null);

  const projectTypes = useMemo(() =>
    ["All", ...Array.from(new Set(tenders.map(tn => tn.project_type).filter(Boolean)))],
    [tenders]
  );
  const woredas = useMemo(() =>
    ["All", ...Array.from(new Set(tenders.map(tn => tn.woreda).filter(Boolean))).sort()],
    [tenders]
  );

  const filtered = useMemo(() => tenders.filter(tn => {
    const q = search.toLowerCase();
    return (
      (!q || tn.title.toLowerCase().includes(q) ||
        tn.ref_no.toLowerCase().includes(q) ||
        (tn.description ?? "").toLowerCase().includes(q) ||
        tn.woreda.toLowerCase().includes(q)) &&
      (typeFilter   === "All" || tn.project_type === typeFilter) &&
      (woredaFilter === "All" || tn.woreda       === woredaFilter)
    );
  }), [tenders, search, typeFilter, woredaFilter]);

  const urgentCount = tenders.filter(tn => {
    if (!tn.submission_deadline) return false;
    const d = Math.ceil((new Date(tn.submission_deadline).getTime() - Date.now()) / 86_400_000);
    return d >= 0 && d <= 7;
  }).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Global font styles — identical to all public pages ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,800&family=DM+Serif+Display:ital@0;1&family=Noto+Serif+Ethiopic:wght@400;600;700&display=swap');
        *, *::before, *::after { font-family: 'DM Sans', sans-serif; }
        .serif   { font-family: 'DM Serif Display', Georgia, serif !important; }
        .amharic { font-family: 'Noto Serif Ethiopic', serif !important; line-height: 1.75 !important; }
        html { scroll-behavior: smooth; }
        .grid-texture {
          background-image:
            repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 60px),
            repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 60px);
          opacity: 0.03;
        }
      `}</style>

      {/* ══ UTILITY BAR — fixed top, z-50 ══ */}
      <div className="bg-[#071220] border-b border-white/[0.06] text-[11.5px] fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-8 h-8 flex items-center justify-between">
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
          {/* Language toggle */}
          <div className="flex items-center gap-1 ml-auto">
            <Globe size={10} className="text-white/20 mr-1" />
            <button onClick={() => setLang("en")}
              className={`px-3 py-0.5 text-[11px] font-black uppercase tracking-wider transition-all ${
                lang === "en" ? "text-white bg-[#E85D1A]" : "text-white/35 hover:text-white/70"
              }`}>EN</button>
            <span className="text-white/15">|</span>
            <button onClick={() => setLang("am")}
              className={`px-3 py-0.5 text-[11px] font-bold amharic transition-all ${
                lang === "am" ? "text-white bg-[#E85D1A]" : "text-white/35 hover:text-white/70"
              }`}>አማ</button>
          </div>
        </div>
      </div>

      {/* ══ PUBLIC NAV — receives lang STATE ══ */}
      <PublicNav locale={lang} />

      {/* ══════════════════════════════════════
          HERO — dark, matching site design
      ══════════════════════════════════════ */}
      <section className="relative bg-[#0A1628] pt-40 pb-20 overflow-hidden">
        <div className="absolute inset-0 grid-texture pointer-events-none" />
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-bl from-[#E85D1A]/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#E85D1A]/40 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-5">
          <div className="flex items-start justify-between gap-8 flex-wrap mb-14">
            <div>
              {/* <p className={`text-[10px] font-black uppercase tracking-[0.5em] text-[#E85D1A] mb-4 ${am}`}>
                {t("tenders.eyebrow")}
              </p> */}
              <h1 className={`text-4xl md:text-5xl font-black text-white leading-tight mb-4 ${am}`}>
                {t("tenders.heroTitle")}
              </h1>
              <p className={`text-white/40 text-lg max-w-2xl leading-relaxed ${am}`}>
                {t("tenders.heroBody")}
              </p>
            </div>

            {/* KPI cards */}
            <div className="flex gap-4 flex-wrap">
              {[
                { val: tenders.length, labelKey: "tenders.totalOpen",   border: "border-[#E85D1A]/30" },
                { val: urgentCount,    labelKey: "tenders.closingSoon",  border: "border-red-500/30"   },
              ].map(s => (
                <div key={s.labelKey}
                  className={`bg-white/[0.04] border ${s.border} rounded-2xl px-6 py-4 text-center min-w-[110px]`}>
                  <p className={`text-3xl font-black ${s.labelKey.includes("closing") && urgentCount > 0 ? "text-red-400" : "text-white"}`}>
                    {s.val}
                  </p>
                  <p className={`text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1 ${am}`}>
                    {t(s.labelKey)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Search + filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[260px] max-w-md">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={t("tenders.searchPlaceholder")}
                className={`w-full bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-white/25 pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#E85D1A]/50 transition-colors ${am}`} />
            </div>

            <div className="relative">
              <Filter size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="appearance-none bg-white/[0.06] border border-white/[0.1] text-white/60 pl-8 pr-8 py-3 rounded-xl text-xs font-black focus:outline-none focus:border-[#E85D1A]/50 transition-colors">
                {projectTypes.map(o => (
                  <option key={o} value={o} className="bg-[#0A1628]">
                    {o === "All" ? t("tenders.allTypes") : o}
                  </option>
                ))}
              </select>
              <ChevronDown size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>

            <div className="relative">
              <MapPin size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              <select value={woredaFilter} onChange={e => setWoredaFilter(e.target.value)}
                className="appearance-none bg-white/[0.06] border border-white/[0.1] text-white/60 pl-8 pr-8 py-3 rounded-xl text-xs font-black focus:outline-none focus:border-[#E85D1A]/50 transition-colors">
                {woredas.map(o => (
                  <option key={o} value={o} className="bg-[#0A1628]">
                    {o === "All" ? t("tenders.allWoredas") : o}
                  </option>
                ))}
              </select>
              <ChevronDown size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>

            {/* Count — number in JSX, unit from t() — no ICU */}
            <p className={`text-[11px] text-white/30 font-bold ml-auto shrink-0 ${am}`}>
              {filtered.length} {t("tenders.resultsCount")}
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          TENDER CARDS — light background
      ══════════════════════════════════════ */}
      <section className="bg-[#F8FAFC] min-h-[50vh] py-16 px-8">
        <div className="max-w-7xl mx-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-4">
                <FileText size={22} className="text-slate-400" />
              </div>
              <p className={`text-slate-500 font-black text-xl ${am}`}>
                {(search || typeFilter !== "All" || woredaFilter !== "All")
                  ? t("tenders.noResults")
                  : t("tenders.empty")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map(tn => {
                const deadline   = tn.submission_deadline ? new Date(tn.submission_deadline) : null;
                const days       = deadline ? Math.ceil((deadline.getTime() - Date.now()) / 86_400_000) : null;
                const closed     = days !== null && days < 0;
                const urgent     = days !== null && !closed && days <= 7;
                const docs       = Array.isArray(tn.required_documents) ? tn.required_documents : [];
                const isExpanded = expanded === tn.tender_id;
                const tColor     = TYPE_COLORS[tn.project_type] || TYPE_COLORS.Other;

                return (
                  <div key={tn.tender_id}
                    className={`bg-white border flex flex-col overflow-hidden rounded-[1.5rem] shadow-sm transition-all hover:shadow-xl hover:-translate-y-0.5 ${
                      urgent ? "border-red-300 hover:border-red-400" : "border-slate-200 hover:border-[#E85D1A]/30"
                    }`}>

                    {/* Top accent bar */}
                    <div className={`h-1 w-full shrink-0 ${urgent ? "bg-red-500" : "bg-[#E85D1A]"}`} />

                    <div className="p-6 flex flex-col flex-1 gap-4">

                      {/* Ref + type badges */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <span className="text-[9px] font-black text-[#E85D1A] bg-[#E85D1A]/10 border border-[#E85D1A]/20 px-2.5 py-1 rounded font-mono tracking-widest">
                          {tn.ref_no}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {tn.project_type && (
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wide ${tColor.bg} ${tColor.text} ${tColor.border}`}>
                              {tn.project_type}
                            </span>
                          )}
                          <span className="text-[9px] font-black px-2 py-0.5 text-emerald-700 bg-emerald-100 rounded-full uppercase tracking-wide flex items-center gap-1">
                            <Globe size={8} /> {t("tenders.openLabel")}
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <h2 className={`font-black text-[#0A1628] uppercase leading-snug text-[14px] ${am}`}>
                        {tn.title}
                      </h2>

                      {/* Description */}
                      {tn.description && (
                        <p className={`text-[11px] text-slate-400 leading-relaxed ${isExpanded ? "" : "line-clamp-2"} ${am}`}>
                          {tn.description}
                        </p>
                      )}

                      {/* Info rows */}
                      <div className="space-y-2">
                        <InfoRow icon={<BarChart3 size={10}/>}    label={t("tenders.budget")}
                          value={`${fmt(Number(tn.budget_estimate))} ${tn.currency || "ETB"}`} am={am} />
                        <InfoRow icon={<MapPin size={10}/>}        label={t("tenders.woreda")}
                          value={tn.woreda} am={am} />
                        <InfoRow icon={<ClipboardList size={10}/>} label={t("tenders.evaluation")}
                          value={tn.evaluation_method} am={am} />
                        {(tn.min_experience_years ?? 0) > 0 && (
                          <InfoRow icon={<HardHat size={10}/>}     label={t("tenders.minExperience")}
                            value={`${tn.min_experience_years} ${t("tenders.years")}`} am={am} />
                        )}

                        {/* Deadline */}
                        {deadline && (
                          <div className={`flex items-center gap-2 text-[11px] font-bold ${urgent ? "text-red-500" : "text-slate-400"}`}>
                            <CalendarDays size={10} className="shrink-0" />
                            <span className={am}>{t("tenders.deadline")}</span>
                            <span className={`ml-auto ${urgent ? "text-red-500" : "text-slate-600"}`}>
                              {fmtDate(tn.submission_deadline!)}
                            </span>
                            {/* Days count in JSX — never through t() */}
                            {!closed && days !== null && (
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                                urgent ? "bg-red-100 text-red-600" : days <= 14 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                              }`}>
                                {urgent && <AlertTriangle size={8} className="inline mr-0.5" />}
                                {days}d {t("tenders.daysLeft")}
                              </span>
                            )}
                          </div>
                        )}

                        {isExpanded && tn.closing_date && (
                          <InfoRow icon={<Clock size={10}/>}       label={t("tenders.closingDate")}
                            value={fmtDate(tn.closing_date)} am={am} />
                        )}
                        {isExpanded && tn.publication_date && (
                          <InfoRow icon={<CheckCircle2 size={10}/>} label={t("tenders.published")}
                            value={fmtDate(tn.publication_date)} am={am} />
                        )}
                      </div>

                      {/* Required docs */}
                      {docs.length > 0 && (
                        <div>
                          <p className={`text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2 ${am}`}>
                            {t("tenders.requiredDocs")}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {(isExpanded ? docs : docs.slice(0, 3)).map(d => (
                              <span key={d} className="text-[9px] font-bold text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full">
                                {d}
                              </span>
                            ))}
                            {!isExpanded && docs.length > 3 && (
                              <button onClick={() => setExpanded(tn.tender_id)}
                                className="text-[9px] font-bold text-[#E85D1A] border border-[#E85D1A]/30 px-2 py-0.5 rounded-full hover:border-[#E85D1A]/60">
                                +{docs.length - 3} more
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Expand toggle */}
                      <button onClick={() => setExpanded(isExpanded ? null : tn.tender_id)}
                        className={`text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 self-start ${am}`}>
                        <ChevronDown size={11} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        {isExpanded ? t("tenders.lessDetails") : t("tenders.moreDetails")}
                      </button>

                      {/* CTA */}
                      <div className="pt-3 border-t border-slate-100 mt-auto">
                        <Link href={`/${lang}/tenders/${tn.tender_id}`}
                          className={`w-full inline-flex items-center justify-center gap-2 bg-[#0A1628] hover:bg-[#E85D1A] text-white py-3 px-4 rounded-xl font-black transition-colors text-[10px] uppercase tracking-widest ${am}`}>
                          {t("tenders.viewDetails")} <ArrowRight size={11} />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════
          HOW TO PARTICIPATE — dark section
      ══════════════════════════════════════ */}
      <section className="bg-[#0A1628] border-t border-white/[0.06] py-20 px-8">
        <div className="max-w-7xl mx-auto">
          <p className={`text-[10px] font-black uppercase tracking-[0.5em] text-[#E85D1A] mb-4 ${am}`}>
            {t("tenders.howToParticipate")}
          </p>
          <h2 className={`text-white font-black uppercase text-3xl mb-12 tracking-tight ${am}`}>
            {t("tenders.biddingProcess")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {[
              { n: "01", title: t("tenders.step1Title"), body: t("tenders.step1Body") },
              { n: "02", title: t("tenders.step2Title"), body: t("tenders.step2Body") },
              { n: "03", title: t("tenders.step3Title"), body: t("tenders.step3Body") },
              { n: "04", title: t("tenders.step4Title"), body: t("tenders.step4Body") },
            ].map(s => (
              <div key={s.n} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:border-[#E85D1A]/20 transition-colors">
                <span className="text-[#E85D1A] text-2xl font-black block mb-3">{s.n}</span>
                <h3 className={`text-white font-black text-sm mb-2 uppercase tracking-tight ${am}`}>
                  {s.title}
                </h3>
                <p className={`text-white/30 text-[11px] leading-relaxed ${am}`}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FOOTER BAND — matches PublicProjectsClient exactly ══ */}
      <div className="bg-[#0A1628] border-t border-white/[0.06] py-8">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className={`text-white/30 text-[11px] ${am}`}>
            {t("common.officeTitle")}
          </p>
          <div className="flex items-center gap-6 text-[11px] text-white/30">
            {(["", "/projects", "/tenders", "/services", "/about"] as const).map((path, i) => {
              const labels   = ["Home", "Projects", "Tenders", "Services", "About"];
              const amLabels = ["መነሻ", "ፕሮጀክቶች", "ጨረታዎች", "አገልግሎቶች", "ስለ እኛ"];
              return (
                <Link key={path} href={`/${lang}${path}`}
                  className="hover:text-white/60 transition-colors">
                  {isAm ? amLabels[i] : labels[i]}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── InfoRow — light version for white cards ───────────────────────────────────
function InfoRow({
  icon, label, value, am,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  am: string;          // ← string class, not boolean
}) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-slate-400">
      <span className="shrink-0 text-slate-300">{icon}</span>
      <span className={am}>{label}</span>
      <span className="text-slate-600 ml-auto text-right font-bold">{value}</span>
    </div>
  );
}