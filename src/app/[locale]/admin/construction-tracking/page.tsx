"use client";
// src/app/[locale]/admin/construction-tracking/page.tsx

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  HardHat, Activity, MapPin, ChevronRight, Clock,
  FileText, ShieldAlert, RefreshCw,
  Building2, AlertTriangle, Inbox, CalendarDays,
} from "lucide-react";
import { createClient } from "@/lib/actions/supabase/clients";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────
type Project = {
  id: string; name: string; sector: string | null;
  progress: number; budget: number; location: string | null;
  expected_end_date: string | null; contractor_id: string | null;
  contractor: string | null; report_count: number;
  open_issues: number; failed_inspections: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDaysLeft(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

function fmtBudget(n: number): string {
  if (!n) return "—";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B ETB";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + "M ETB";
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + "K ETB";
  return n.toLocaleString() + " ETB";
}

const SECTOR_COLOR: Record<string, string> = {
  Education: "bg-blue-100   text-blue-700",
  Schools:   "bg-blue-100   text-blue-700",
  Health:    "bg-rose-100   text-rose-700",
  Youth:     "bg-violet-100 text-violet-700",
  Roads:     "bg-amber-100  text-amber-700",
  Market:    "bg-teal-100   text-teal-700",
  Housing:   "bg-green-100  text-green-700",
  Water:     "bg-cyan-100   text-cyan-700",
  Other:     "bg-slate-100  text-slate-600",
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ConstructionTrackingPage() {
  const t        = useTranslations("Admin.construction_tracking");
  const locale   = useLocale();
  const supabase = useRef(createClient()).current;

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);

    const { data: flat, error } = await supabase
      .from("projects")
      .select("id, name, sector, progress, budget, location, expected_end_date, contractor_id")
      .eq("status", "Ongoing")
      .order("progress", { ascending: false });

    if (error || !flat) { setLoading(false); return; }
    if (flat.length === 0) { setProjects([]); setLoading(false); return; }

    const ids           = flat.map((p: any) => p.id);
    const contractorIds = [...new Set(flat.map((p: any) => p.contractor_id).filter(Boolean))] as string[];

    const [
      { data: contractors },
      { data: reports },
      { data: issues },
      { data: inspections },
    ] = await Promise.all([
      contractorIds.length
        ? supabase.from("contractors").select("id, company_name").in("id", contractorIds)
        : Promise.resolve({ data: [] }),
      supabase.from("daily_reports").select("project_id").in("project_id", ids),
      supabase.from("project_issues").select("project_id, status").in("project_id", ids),
      supabase.from("site_inspections").select("project_id, passed").in("project_id", ids),
    ]);

    const contractorMap = Object.fromEntries(
      (contractors || []).map((c: any) => [c.id, c.company_name])
    );

    const enriched: Project[] = flat.map((p: any) => ({
      id:                p.id,
      name:              p.name,
      sector:            p.sector,
      progress:          p.progress ?? 0,
      budget:            Number(p.budget) || 0,
      location:          p.location,
      expected_end_date: p.expected_end_date,
      contractor_id:     p.contractor_id,
      contractor:        p.contractor_id ? (contractorMap[p.contractor_id] ?? null) : null,
      report_count:      (reports     || []).filter((r: any) => r.project_id === p.id).length,
      open_issues:       (issues      || []).filter((i: any) => i.project_id === p.id && i.status === "Open").length,
      failed_inspections:(inspections || []).filter((i: any) => i.project_id === p.id && i.passed === false).length,
    }));

    setProjects(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const avgProgress = projects.length
    ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;
  const noReports   = projects.filter(p => p.report_count === 0).length;
  const totalIssues = projects.reduce((s, p) => s + p.open_issues, 0);
  const overdue     = projects.filter(p => {
    const d = getDaysLeft(p.expected_end_date);
    return d !== null && d < 0;
  }).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F4F5F7] p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-orange-600 mb-3">
              <Activity size={16} strokeWidth={3} />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">{t("live_feed")}</span>
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
              {t("title_line1")}<br />
              <span className="text-orange-600">{t("title_line2")}</span>
            </h1>
          </div>

          {/* KPI strip — only shown once data is loaded */}
          {!loading && projects.length > 0 && (
            <div className="flex gap-3 flex-wrap">
              {[
                { labelKey: "active_sites",  val: projects.length,   cls: "bg-slate-900 text-white" },
                { labelKey: "avg_progress",  val: `${avgProgress}%`, cls: "bg-orange-500 text-white" },
                { labelKey: "open_issues",   val: totalIssues,
                  cls: totalIssues > 0 ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-600" },
                { labelKey: "no_reports",    val: noReports,
                  cls: noReports > 0 ? "bg-red-500 text-white" : "bg-slate-100 text-slate-600" },
                { labelKey: "overdue",       val: overdue,
                  cls: overdue > 0 ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600" },
              ].map(k => (
                <div key={k.labelKey} className={`px-5 py-3 rounded-2xl text-center min-w-[80px] ${k.cls}`}>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-70">{t(k.labelKey)}</p>
                  <p className="text-xl font-black tracking-tight">{k.val}</p>
                </div>
              ))}
              <button onClick={load}
                className="px-4 py-3 bg-white rounded-2xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all">
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          )}
        </header>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-52 bg-white rounded-[2.5rem] border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-24 text-center">
            <Inbox size={52} className="text-slate-200 mx-auto mb-4" strokeWidth={1} />
            <p className="font-black text-slate-400 text-xl">{t("no_projects_title")}</p>
            <p className="text-sm text-slate-300 mt-2">{t("no_projects_body")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {projects.map(project => {
              const daysLeft  = getDaysLeft(project.expected_end_date);
              const isOverdue = daysLeft !== null && daysLeft < 0;
              const isDueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 14;
              const noReport  = project.report_count === 0;

              return (
                <div key={project.id}
                  className={`bg-white rounded-[2.5rem] border shadow-sm overflow-hidden transition-all hover:shadow-md group ${
                    isOverdue               ? "border-red-300 shadow-red-50"
                    : project.open_issues > 0 ? "border-amber-200"
                    : "border-slate-200"
                  }`}>

                  {/* Accent bar */}
                  <div className={`h-1.5 w-full ${isOverdue ? "bg-red-500" : "bg-orange-500"}`} />

                  <div className="p-7">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="min-w-0">
                        {project.sector && (
                          <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-2 ${
                            SECTOR_COLOR[project.sector] || "bg-slate-100 text-slate-600"
                          }`}>{project.sector}</span>
                        )}
                        <h3 className="text-xl font-black text-slate-900 uppercase leading-tight truncate">
                          {project.name}
                        </h3>
                        <p className="text-[11px] font-bold text-slate-400 mt-1 flex items-center gap-1.5">
                          <Building2 size={11} />
                          {project.contractor || t("no_contractor")}
                        </p>
                        {project.location && (
                          <p className="text-[11px] font-bold text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <MapPin size={11} /> {project.location}
                          </p>
                        )}
                      </div>
                      <div className={`p-4 rounded-2xl shrink-0 ${isOverdue ? "bg-red-50" : "bg-slate-50"}`}>
                        <HardHat size={22} className={isOverdue ? "text-red-400" : "text-slate-300"} />
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-5">
                      <div className="flex justify-between text-[9px] font-black uppercase mb-2 text-slate-400">
                        <span>{t("physical_progress")}</span>
                        <span className="text-orange-500">{project.progress}%</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isOverdue ? "bg-red-500" : "bg-orange-500"
                          }`}
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Meta chips — counts in JSX, never in t() */}
                    <div className="flex items-center gap-3 flex-wrap mb-6">
                      {project.budget > 0 && (
                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                          {fmtBudget(project.budget)}
                        </span>
                      )}

                      {/* Deadline */}
                      {daysLeft !== null ? (
                        <span className={`flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-lg ${
                          isOverdue   ? "bg-red-100 text-red-700"
                          : isDueSoon ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-500"
                        }`}>
                          <CalendarDays size={11} />
                          {isOverdue   ? `${Math.abs(daysLeft)}${t("days_overdue")}`
                           : daysLeft === 0 ? t("due_today")
                           : `${daysLeft}${t("days_left")}`}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">
                          <CalendarDays size={11} /> {t("no_deadline")}
                        </span>
                      )}

                      {/* Reports */}
                      <span className={`flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-lg ${
                        noReport ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"
                      }`}>
                        <FileText size={11} />
                        {noReport
                          ? t("no_reports_label")
                          : `${project.report_count} ${project.report_count !== 1
                              ? t("reports_plural") : t("reports_label")}`}
                      </span>

                      {/* Open issues */}
                      {project.open_issues > 0 && (
                        <span className="flex items-center gap-1.5 text-[10px] font-black bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg">
                          <ShieldAlert size={11} />
                          {project.open_issues}{" "}
                          {project.open_issues !== 1 ? t("issues_plural") : t("issues_label")}
                        </span>
                      )}

                      {/* Failed inspections */}
                      {project.failed_inspections > 0 && (
                        <span className="flex items-center gap-1.5 text-[10px] font-black bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg">
                          <AlertTriangle size={11} />
                          {project.failed_inspections} {t("insp_fail_label")}
                        </span>
                      )}
                    </div>

                    {/* CTA — locale-prefixed */}
                    <Link
                      href={`/${locale}/admin/construction-tracking/${project.id}/reports`}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-orange-600 transition-all group-hover:shadow-lg"
                    >
                      {t("open_reports_hub")}
                      <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}