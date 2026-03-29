"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { PublicNav } from "@/components/public/Publicnav";
import {
  ArrowLeft, BarChart3, Calendar, MapPin, Building2,
  Clock, Phone, Mail, Globe, FileText, Camera, HardHat,
  Layers, CheckCircle2,
} from "lucide-react";
import { getProjectLocalized } from "@/lib/projectLocale";
import enMessages from "@/app/[locale]/en.json";
import amMessages from "@/app/[locale]/am.json";

export type SiteLang = "en" | "am";
type MessageTree = Record<string, unknown>;

export type ProjectDocRow = {
  id: string;
  file_name: string;
  file_url: string;
  file_type?: string | null;
};

export type ProjectPhotoRow = {
  id: string;
  image_url: string;
  caption?: string | null;
};

export type PublicProjectDetail = {
  id: string;
  name: string;
  name_am: string | null;
  sector: string | null;
  status: string;
  progress: number;
  budget: number;
  currency: string;
  location: string | null;
  start_date: string | null;
  expected_end_date: string | null;
  description_en: string | null;
  description_am: string | null;
  contractor_name: string | null;
  project_documents: ProjectDocRow[];
  project_photos: ProjectPhotoRow[];
};

export function useProjectTranslation(lang: string) {
  const messages: MessageTree =
    lang === "am" ? (amMessages as MessageTree) : (enMessages as MessageTree);

  const t = useCallback(
    (path: string, variables?: Record<string, string | number>): string => {
      let node: unknown = messages;
      
      // Navigate to the path
      for (const p of path.split(".")) {
        if (node == null || typeof node !== "object") return path;
        node = (node as MessageTree)[p];
      }

      if (typeof node !== "string") return path;

      // Handle variable injection (e.g., {{name}})
      if (variables) {
        let translated = node;
        Object.entries(variables).forEach(([key, value]) => {
          translated = translated.replace(new RegExp(`{{${key}}}`, "g"), String(value));
        });
        return translated;
      }

      return node;
    },
    [messages] // Correct dependency to satisfy React Compiler
  );

  return { t, isAm: lang === "am" };
}

function fmtBudget(n: number, currency = "ETB"): string {
  if (!n) return "—";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B " + currency;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M " + currency;
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K " + currency;
  return n.toLocaleString() + " " + currency;
}

function fmtDate(d: string | null, lang: SiteLang): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(lang === "am" ? "am-ET" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_TKEY: Record<string, string> = {
  Ongoing: "projects.statusOngoing",
  "Design Phase": "projects.statusDesign",
  "BOQ Verification": "projects.statusBOQ",
  Completed: "projects.statusCompleted",
  Planned: "projects.statusPlanned",
  "On Hold": "projects.statusOnHold",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  Ongoing: <HardHat size={10} />,
  "Design Phase": <Layers size={10} />,
  "BOQ Verification": <Layers size={10} />,
  Completed: <CheckCircle2 size={10} />,
  Planned: <Clock size={10} />,
  "On Hold": <Clock size={10} />,
};

const STATUS_CSS: Record<string, { bg: string; text: string; dot: string }> = {
  Ongoing: { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500" },
  "Design Phase": { bg: "bg-indigo-100", text: "text-indigo-800", dot: "bg-indigo-500" },
  "BOQ Verification": { bg: "bg-cyan-100", text: "text-cyan-800", dot: "bg-cyan-500" },
  Completed: { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500" },
  Planned: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" },
  "On Hold": { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500" },
};

export default function PublicProjectDetailClient({
  project,
  locale,
}: {
  project: PublicProjectDetail;
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
  const { t, isAm } = useProjectTranslation(lang);
  const am = isAm ? "amharic" : "";

  const { name, description } = getProjectLocalized(project, lang);
  const sc = STATUS_CSS[project.status] ?? STATUS_CSS["Planned"];
  const sIcon = STATUS_ICON[project.status] ?? <Clock size={10} />;
  const tKey = STATUS_TKEY[project.status] ?? "projects.statusPlanned";

  const docs = project.project_documents ?? [];
  const photos = project.project_photos ?? [];

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,800&family=DM+Serif+Display:ital@0;1&family=Noto+Serif+Ethiopic:wght@400;600;700&display=swap');
        *, *::before, *::after { font-family: 'DM Sans', sans-serif; }
        .amharic { font-family: 'Noto Serif Ethiopic', serif !important; line-height: 1.75 !important; }
        html { scroll-behavior: smooth; }
        .grid-texture {
          background-image:
            repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 60px),
            repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 60px);
          opacity: 0.03;
        }
      `}</style>

      <div className="bg-[#071220] border-b border-white/6 text-[11.5px] fixed top-0 left-0 right-0 z-50">
        <div className="max-w-[1400px] mx-auto px-8 h-8 flex items-center justify-between">
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

      <PublicNav locale={lang} lang={lang} onLangChange={setLang} />

      <section className="relative bg-[#0A1628] pt-36 pb-12 overflow-hidden">
        <div className="absolute inset-0 grid-texture pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-5">
          <Link href={`/${lang}/projects`}
            className={`inline-flex items-center gap-2 text-[11px] font-bold text-white/40 hover:text-[#E85D1A] mb-6 ${am}`}>
            <ArrowLeft size={14} /> {t("projects.detailBack")}
          </Link>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {project.sector && (
              <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 text-white/80 border border-white/10">
                {project.sector}
              </span>
            )}
            <span className={`flex items-center gap-1.5 text-[9px] font-black px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} shrink-0`} />
              {sIcon}
              {t(tKey)}
            </span>
          </div>
          <h1 className={`text-3xl md:text-4xl font-black text-white leading-tight mb-4 ${am}`}>{name}</h1>
          {project.budget > 0 && (
            <p className={`text-[#E85D1A] font-black text-lg ${am}`}>
              {fmtBudget(project.budget, project.currency)}
            </p>
          )}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 md:px-8 py-12 -mt-6 relative z-10">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-10 space-y-8">
          {description ? (
            <div>
              <h2 className={`text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ${am}`}>
                {t("projects.detailScope")}
              </h2>
              <p className={`text-slate-600 text-sm leading-relaxed ${am}`}>{description}</p>
            </div>
          ) : (
            <p className={`text-slate-400 text-sm italic ${am}`}>{t("projects.noDescription")}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {project.location && (
              <div className="flex items-start gap-3 text-sm text-slate-600">
                <MapPin size={16} className="text-[#E85D1A] shrink-0 mt-0.5" />
                <div>
                  <p className={`text-[9px] font-black text-slate-400 uppercase ${am}`}>{t("projects.locationLabel")}</p>
                  <p className={`font-bold ${am}`}>{project.location}</p>
                </div>
              </div>
            )}
            {project.contractor_name && (
              <div className="flex items-start gap-3 text-sm text-slate-600">
                <Building2 size={16} className="text-[#E85D1A] shrink-0 mt-0.5" />
                <div>
                  <p className={`text-[9px] font-black text-slate-400 uppercase ${am}`}>{t("projects.contractorLabel")}</p>
                  <p className={`font-bold ${am}`}>{project.contractor_name}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 text-sm text-slate-600">
              <Calendar size={16} className="text-[#E85D1A] shrink-0 mt-0.5" />
              <div>
                <p className={`text-[9px] font-black text-slate-400 uppercase ${am}`}>{t("projects.detailStart")}</p>
                <p className={`font-bold ${am}`}>{fmtDate(project.start_date, lang)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm text-slate-600">
              <Calendar size={16} className="text-[#E85D1A] shrink-0 mt-0.5" />
              <div>
                <p className={`text-[9px] font-black text-slate-400 uppercase ${am}`}>{t("projects.detailEnd")}</p>
                <p className={`font-bold ${am}`}>{fmtDate(project.expected_end_date, lang)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm text-slate-600 sm:col-span-2">
              <BarChart3 size={16} className="text-[#E85D1A] shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className={`text-[9px] font-black text-slate-400 uppercase mb-1 ${am}`}>{t("projects.progressLabel")}</p>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0A1628] rounded-full" style={{ width: `${Math.min(100, project.progress) || 0}%` }} />
                </div>
                <p className={`text-xs font-black text-[#0A1628] mt-1 ${am}`}>{project.progress ?? 0}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
              <FileText className="text-[#0A1628]" size={20} />
              <h3 className={`text-sm font-black uppercase text-[#0A1628] ${am}`}>{t("projects.detailDocuments")}</h3>
            </div>
            {docs.length === 0 ? (
              <p className={`text-sm text-slate-400 ${am}`}>{t("projects.detailNoDocs")}</p>
            ) : (
              <ul className="space-y-2">
                {docs.map((doc) => (
                  <li key={doc.id}>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-[#E85D1A]/40 transition-colors">
                      <span className={`text-xs font-bold text-slate-800 truncate ${am}`}>{doc.file_name}</span>
                      <span className="text-[10px] font-black text-[#E85D1A] shrink-0 uppercase">{t("projects.detailDownload")}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
              <Camera className="text-[#0A1628]" size={20} />
              <h3 className={`text-sm font-black uppercase text-[#0A1628] ${am}`}>{t("projects.detailPhotos")}</h3>
            </div>
            {photos.length === 0 ? (
              <p className={`text-sm text-slate-400 ${am}`}>{t("projects.detailNoPhotos")}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((photo) => (
                  <a key={photo.id} href={photo.image_url} target="_blank" rel="noopener noreferrer"
                    className="aspect-square rounded-xl overflow-hidden border border-slate-100 bg-slate-100 block group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.image_url} alt={photo.caption || ""}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="bg-[#0A1628] border-t border-white/6 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className={`text-white/30 text-[11px] ${am}`}>{t("common.officeTitle")}</p>
          <div className="flex items-center gap-6 text-[11px] text-white/30">
            {(["", "/projects", "/tenders", "/services", "/about"] as const).map((path, i) => {
              const labels = ["Home", "Projects", "Tenders", "Services", "About"];
              const amLabels = ["መነሻ", "ፕሮጀክቶች", "ጨረታዎች", "አገልግሎቶች", "ስለ እኛ"];
              return (
                <Link key={path} href={`/${lang}${path}`} className="hover:text-white/60 transition-colors">
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
