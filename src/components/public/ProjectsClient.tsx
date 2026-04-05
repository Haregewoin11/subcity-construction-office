"use client";


import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { PublicNav } from "@/components/public/Publicnav";
import {
  Search, MapPin, Calendar, Building2,
  X, ChevronRight, CheckCircle2, Clock, Layers,
  HardHat, Filter, Phone, Mail, Globe,ChevronLeft,
} from "lucide-react";
import { getProjectLocalized } from "@/lib/projectLocale";

// ── Direct JSON imports — re-evaluated whenever lang state changes ────────────
import enMessages from "@/app/[locale]/en.json"
import amMessages from "@/app/[locale]/am.json"

// ── Types ─────────────────────────────────────────────────────────────────────
export type SiteLang = "en" | "am";
type MessageTree = Record<string, unknown>;

type Project = {
  id: string; name: string; name_am: string | null;
  sector: string | null; status: string;
  progress: number; budget: number; currency: string;
  location: string | null; start_date: string | null;
  expected_end_date: string | null;
  description_en: string | null; description_am: string | null;
  contractor_name: string | null;
};


function useTranslation(lang: SiteLang) {
  const messages: MessageTree =
    lang === "am" ? (amMessages as MessageTree) : (enMessages as MessageTree);

  const t = useCallback(
    (path: string): string => {
      let node: unknown = messages;
      for (const p of path.split(".")) {
        if (node == null || typeof node !== "object") return path;
        node = (node as MessageTree)[p];
      }
      return typeof node === "string" ? node : path;
    },
    // Depend only on lang — messages object identity changes when lang changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang]
  );

  return { t, isAm: lang === "am" };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtBudget(n: number, currency = "ETB"): string {
  if (!n) return "—";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B " + currency;
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1)     + "M " + currency;
  if (n >= 1_000)         return (n / 1_000).toFixed(0)         + "K " + currency;
  return n.toLocaleString() + " " + currency;
}

function getDaysLeft(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CSS: Record<string, { bg: string; text: string; dot: string }> = {
  "Ongoing":          { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500" },
  "Design Phase":     { bg: "bg-indigo-100",  text: "text-indigo-800",  dot: "bg-indigo-500"  },
  "BOQ Verification": { bg: "bg-cyan-100",    text: "text-cyan-800",    dot: "bg-cyan-500"    },
  "Completed":        { bg: "bg-blue-100",    text: "text-blue-800",    dot: "bg-blue-500"    },
  "Planned":          { bg: "bg-slate-100",   text: "text-slate-700",   dot: "bg-slate-400"   },
  "On Hold":          { bg: "bg-amber-100",   text: "text-amber-800",   dot: "bg-amber-500"   },
};

// Full dot-path keys — passed to local t() which walks JSON directly
const STATUS_TKEY: Record<string, string> = {
  "Ongoing":          "projects.statusOngoing",
  "Design Phase":     "projects.statusDesign",
  "BOQ Verification": "projects.statusBOQ",
  "Completed":        "projects.statusCompleted",
  "Planned":          "projects.statusPlanned",
  "On Hold":          "projects.statusOnHold",
};

const ACCENT_CSS: Record<string, string> = {
  "Ongoing":          "bg-emerald-500",
  "Design Phase":     "bg-indigo-500",
  "BOQ Verification": "bg-cyan-500",
  "Completed":        "bg-blue-500",
  "Planned":          "bg-slate-400",
  "On Hold":          "bg-amber-500",
};

const PROGRESS_CSS: Record<string, string> = {
  "Ongoing":          "bg-emerald-500",
  "Design Phase":     "bg-indigo-400",
  "BOQ Verification": "bg-cyan-400",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  "Ongoing":          <HardHat size={10} />,
  "Design Phase":     <Layers size={10} />,
  "BOQ Verification": <Layers size={10} />,
  "Completed":        <CheckCircle2 size={10} />,
  "Planned":          <Clock size={10} />,
  "On Hold":          <Clock size={10} />,
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function PublicProjectsClient({
  projects,
  locale,
}: {
  projects: Project[];
  locale: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [lang, setLangState] = useState<SiteLang>(locale === "am" ? "am" : "en");
  const setLang = (next: SiteLang) => {
    setLangState(next);
    const nextPath = pathname.replace(/^\/(en|am)/, `/${next}`);
    if (nextPath !== pathname) router.replace(nextPath);
  };
  const { t, isAm }     = useTranslation(lang);
  const am = isAm ? "amharic" : "";

  const [currentPage, setCurrentPage] = useState(1);

  const [search, setSearchState] = useState("");
  const setSearch = useCallback((v: string) => {
    setSearchState(v);
    setCurrentPage(1);
  }, []);

  const [filterStatus, setFilterStatusState] = useState("All");
  const setFilterStatus = useCallback((v: string) => {
    setFilterStatusState(v);
    setCurrentPage(1);
  }, []);

  const [filterSector, setFilterSectorState] = useState("All");
  const setFilterSector = useCallback((v: string) => {
    setFilterSectorState(v);
    setCurrentPage(1);
  }, []);

  // ── Derived filter options ────────────────────────────────────────────────
  const statuses = useMemo(
    () => ["All", ...Array.from(new Set(projects.map(p => p.status).filter(Boolean)))],
    [projects]
  );
  const sectors = useMemo(
    () => ["All", ...Array.from(new Set(
      projects.map(p => p.sector).filter(Boolean) as string[]
    ))],
    [projects]
  );

  // ── Filtered list — re-computes when lang changes (Amharic name search) ────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return projects.filter(p => {
      const { name } = getProjectLocalized(p, lang);
      const matchSearch = !q ||
        name.toLowerCase().includes(q) ||
        (p.location || "").toLowerCase().includes(q) ||
        (p.sector   || "").toLowerCase().includes(q);
      const matchStatus = filterStatus === "All" || p.status === filterStatus;
      const matchSector = filterSector === "All" || p.sector  === filterSector;
      return matchSearch && matchStatus && matchSector;
    });
  }, [projects, search, filterStatus, filterSector, lang]);

  const pageSize = 9;

  const totalPages = Math.ceil(filtered.length / pageSize);
const paginatedProjects = useMemo(() => {
  const start = (currentPage - 1) * pageSize;
  return filtered.slice(start, start + pageSize);
}, [filtered, currentPage]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  // const totalActive    = projects.filter(p => p.status === "Ongoing").length;
  // const totalCompleted = projects.filter(p => p.status === "Completed").length;
  // const totalBudget    = projects.reduce((s, p) => s + p.budget, 0);
  // const uniqueSectors  = new Set(projects.map(p => p.sector).filter(Boolean)).size;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    // <div className="min-h-screen" style={{ fontFamily: "'DM Sans', sans-serif" }}>
<div className="min-h-screen bg-[#F4F5F7]">
      {/* ── Global font styles — identical to HomePageClient ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,800&family=DM+Serif+Display:ital@0;1&family=Noto+Serif+Ethiopic:wght@400;600;700&display=swap');
        *, *::before, *::after { font-family: 'DM Sans', sans-serif; }
        .serif   { font-family: 'DM Serif Display', Georgia, serif !important; }
        .amharic { font-family: 'Noto Serif Ethiopic', serif !important; line-height: 1.75 !important; }
        html { scroll-behavior: smooth; }
        .grid-texture {
          background-image:
            // repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 60px),
            // repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 60px);
          opacity: 0.03;
        }
      `}</style>

  
      {/* ══ UTILITY BAR — identical to Projects / Tenders ══ */}
      <div className="bg-[#071220] border-b border-white/6 text-[11.5px] fixed top-0 left-0 right-0 z-50">
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
      
      {/* ══ PUBLIC NAV — receives lang state so nav links also update ══ */}
       <PublicNav locale={lang} lang={lang} onLangChange={setLang} />

      {/* ══════════════════════════════════════
          HERO — dark, matching site design
      ══════════════════════════════════════ */}
      <section className="relative bg-[#0A1628] pt-30 pb-15 overflow-hidden">
        <div className="absolute inset-0  pointer-events-none" />
        <div className="absolute top-0 right-0 w-1/3 h-full bg-linear-to-bl from-[#E85D1A]/10 via-transparent to-transparent pointer-events-none" />
        {/* <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#E85D1A]/40 to-transparent" /> */}

        <div className="relative max-w-7xl mx-auto px-5">
       
          <h1 className={`text-4xl md:text-5xl font-black text-white leading-tight mb-4 ${am}`}>
            {t("projects.heroTitle")}
          </h1>
          <p className={`text-white/40 text-lg max-w-2xl leading-relaxed ${am}`}>
            {t("projects.heroBody")}
          </p>

        </div>
      </section>

      {/* ══════════════════════════════════════
          FILTER BAR — sticky below utility bar
      ══════════════════════════════════════ */}
      <div className="bg-[#071220] border-b border-white/6 sticky top-8 z-30">
        <div className="max-w-7xl mx-auto px-8 py-4 flex flex-wrap items-center gap-3">

          {/* Search */}
          <div className="relative flex-1 min-w-[280px] max-w-md">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                <input 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t("projects.searchPlaceholder")}
                  className={`w-full bg-white/5 border border-white/10 text-white placeholder:text-white/25 pl-11 pr-4 py-3.5 rounded-xl text-sm focus:outline-none focus:border-[#E85D1A]/50 transition-all ${am}`} 
                />
              </div>

          {/* Status pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={12} className="text-white/20 shrink-0" />
            {statuses.map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black border transition-colors ${am} ${
                  filterStatus === s
                    ? "bg-[#E85D1A] text-white border-[#E85D1A]"
                    : "bg-white/4 text-white/50 border-white/10 hover:border-white/30"
                }`}>
                {s === "All" ? t("projects.allStatuses") : t(STATUS_TKEY[s] ?? "projects.statusOngoing")}
              </button>
            ))}
          </div>

          {/* Sector select */}
          {sectors.length > 2 && (
            <select value={filterSector} onChange={e => setFilterSector(e.target.value)}
              className={`bg-white/6 border border-white/10 rounded-xl px-3 py-2.5 text-[11px] text-white/60 focus:outline-none focus:border-[#E85D1A]/50 transition-colors ${am}`}>
              <option value="All">{t("projects.allSectors")}</option>
              {sectors.filter(s => s !== "All").map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}

          {/* Results count — number in JSX, never through t() to avoid ICU */}
          <p className={`text-[11px] text-white/30 font-bold ml-auto shrink-0 ${am}`}>
            {filtered.length} {t("projects.resultsCount")}
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════
          PROJECT GRID — light background
      ══════════════════════════════════════ */}
      <section className="bg-[#F8FAFC] min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-8 py-16">

          {filtered.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-4">
                <Search size={22} className="text-slate-400" />
              </div>
              <p className={`text-slate-500 font-black text-xl mb-2 ${am}`}>
                {search ? t("projects.searchEmpty") : t("projects.noProjects")}
              </p>
              {(search || filterStatus !== "All" || filterSector !== "All") && (
                <button
                  onClick={() => { setSearch(""); setFilterStatus("All"); setFilterSector("All"); }}
                  className={`mt-2 text-[#E85D1A] text-sm font-bold hover:underline ${am}`}>
                  {t("projects.clearFilters")}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedProjects.map(project => {
                // getProjectLocalized reads name_am when lang="am", falls back to name
                const { name, description } = getProjectLocalized(project, lang);
                const daysLeft    = getDaysLeft(project.expected_end_date);
                const isOverdue   = daysLeft !== null && daysLeft < 0;
                const sc          = STATUS_CSS[project.status]    ?? STATUS_CSS["Planned"];
                const sIcon       = STATUS_ICON[project.status]   ?? <Clock size={10}/>;
                const tKey        = STATUS_TKEY[project.status]   ?? "projects.statusPlanned";
                const accentBar   = ACCENT_CSS[project.status]    ?? "bg-slate-300";
                const progressBar = PROGRESS_CSS[project.status];
                const showProgress = !!progressBar;

                return (

                  <div key={project.id}
                    className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-[#E85D1A]/30 hover:-translate-y-0.5 transition-all group flex flex-col">




                    {/* Status-coloured top accent */}
                    <div className={`h-1 w-full ${accentBar}`} />

                    <div className="p-6 flex flex-col flex-1">

                      {/* Badges */}
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        {project.sector && (
                          <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            {project.sector}
                          </span>
                        )}
                        <span className={`flex items-center gap-1.5 text-[9px] font-black px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} shrink-0`} />
                          {sIcon}
                          {/* t(tKey) re-renders in Amharic when lang changes */}
                          {t(tKey)}
                        </span>
                      </div>

                      {/* Project name — locale-aware via getProjectLocalized */}
                      <h3 className={`text-[15px] font-black text-[#0A1628] leading-snug mb-2 group-hover:text-[#E85D1A] transition-colors ${am}`}>
                        {name}
                      </h3>

                      {/* Description — locale-aware */}
                      {description ? (
                        <p className={`text-[12px] text-slate-400 leading-relaxed mb-4 line-clamp-2 ${am}`}>
                          {description}
                        </p>
                      ) : (
                        <p className={`text-[12px] text-slate-300 italic mb-4 ${am}`}>
                          {t("projects.noDescription")}
                        </p>
                      )}

                      {/* Meta */}
                      <div className="space-y-1.5 mb-4">
                        {project.location && (
                          <p className="flex items-center gap-2 text-[11px] text-slate-400">
                            <MapPin size={11} className="text-slate-300 shrink-0" />
                            {project.location}
                          </p>
                        )}
                        {project.contractor_name && (
                          <p className="flex items-center gap-2 text-[11px] text-slate-400">
                            <Building2 size={11} className="text-slate-300 shrink-0" />
                            {project.contractor_name}
                          </p>
                        )}
                        {daysLeft !== null && (
                          <p className={`flex items-center gap-2 text-[11px] font-bold ${isOverdue ? "text-red-500" : "text-slate-400"}`}>
                            <Calendar size={11} className="shrink-0" />
                            {/* Counts in JSX, unit label from t() */}
                            {isOverdue
                              ? `${Math.abs(daysLeft)} ${t("projects.daysOverdue")}`
                              : daysLeft === 0 ? t("projects.dueToday")
                              : `${daysLeft} ${t("projects.daysLeft")}`}
                          </p>
                        )}
                      </div>

                      {/* Progress bar */}
                      {showProgress && (
                        <div className="mb-4">
                          <div className="flex justify-between text-[9px] font-black text-slate-400 mb-1">
                            <span className={am}>{t("projects.progressLabel")}</span>
                            <span className="text-[#E85D1A]">{project.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${progressBar}`}
                              style={{ width: `${project.progress}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Budget */}
                      {project.budget > 0 && (
                        <div className="mb-5">
                          <p className={`text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5 ${am}`}>
                            {t("projects.budgetLabel")}
                          </p>
                          <p className="text-sm font-black text-[#0A1628]">
                            {fmtBudget(project.budget, project.currency)}
                          </p>
                        </div>
                      )}

                      <div className="flex-1" />

                      {/* CTA */}
                      <Link
                        href={`/${lang}/projects/${project.id}`}
                        className={`w-full py-3 bg-[#0A1628] text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#E85D1A] transition-all ${am}`}
                      >
                        {t("projects.viewDetails")}
                        <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-16 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-[#E85D1A] disabled:opacity-30 disabled:hover:text-slate-400 transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    type="button"
                    key={pg}
                    onClick={() => setCurrentPage(pg)}
                    className={`min-w-[40px] h-10 rounded-xl text-xs font-black transition-all ${
                      currentPage === pg
                        ? "bg-[#E85D1A] text-white shadow-lg shadow-orange-500/30"
                        : "bg-white border border-slate-200 text-slate-500 hover:border-[#E85D1A]/50"
                    }`}
                  >
                    {pg}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-[#E85D1A] disabled:opacity-30 disabled:hover:text-slate-400 transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ══ FOOTER BAND ══ */}
      <div className="bg-[#0A1628] border-t border-white/6 py-8">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className={`text-white/30 text-[11px] ${am}`}>
            {t("common.officeTitle")}
          </p>
          <div className="flex items-center gap-6 text-[11px] text-white/30">
            {(["", "/tenders", "/services", "/about"] as const).map((path, i) => {
              const labels = ["Home", "Tenders", "Services", "About"];
              const amLabels = ["መነሻ", "ጨረታዎች", "አገልግሎቶች", "ስለ እኛ"];
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