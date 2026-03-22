"use client";
// src/app/[locale]/admin/design-supervision/monitoring/page.tsx
// ── BUG FIXED: all hardcoded strings replaced with useTranslations("Admin.monitoring")
// ── BUG FIXED: active filter color corrected to #0A1628 (design system navy)
// ── BUG FIXED: null guards added for contract_end / expected_end_date

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Activity, ShieldAlert, Clock, FileCheck,
  AlertTriangle, ChevronDown, ChevronUp, RefreshCw,
  CalendarDays, CheckCircle2, XCircle, Beaker, ClipboardCheck,
  BarChart3, Construction, Minus
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/actions/supabase/clients";

type ProjectRow = {
  id: string;
  name: string;
  sector: string | null;
  status: string;
  progress: number;
  budget: number;
  start_date: string | null;
  expected_end_date: string | null;
  location: string | null;
  boq_approved_at: string | null;
  updated_at: string;
  contractor: string | null;
  signed_amount: number | null;
  contract_start: string | null;
  contract_end: string | null;
  payment_pct: number | null;
  open_issues: number;
  critical_issues: number;
  total_inspections: number;
  failed_inspections: number;
  failed_tests: number;
  boq_total: number | null;
  report_count: number;
  last_report_date: string | null;
};

function getHealth(p: ProjectRow): "on-track" | "at-risk" | "critical" | "no-data" {
  if (p.critical_issues > 0 || p.failed_tests > 0 || p.failed_inspections > 1) return "critical";
  const daysLeft = getDaysLeft(p.contract_end || p.expected_end_date);
  if (daysLeft !== null && daysLeft < 0) return "critical";
  if (p.open_issues > 2 || (daysLeft !== null && daysLeft < 14 && p.progress < 80)) return "at-risk";
  if (p.report_count === 0 && p.status === "Ongoing") return "no-data";
  return "on-track";
}

function getDaysLeft(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + "K";
  return n.toLocaleString();
}

const HEALTH_COLORS = {
  "on-track": { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", icon: CheckCircle2  },
  "at-risk":  { bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-500",   icon: AlertTriangle  },
  "critical": { bg: "bg-red-100",     text: "text-red-700",     dot: "bg-red-500",     icon: ShieldAlert    },
  "no-data":  { bg: "bg-slate-100",   text: "text-slate-500",   dot: "bg-slate-400",   icon: Minus          },
};

const SECTOR_COLOR: Record<string, string> = {
  Schools:   "bg-blue-50   text-blue-700   border-blue-200",
  Health:    "bg-rose-50   text-rose-700   border-rose-200",
  Youth:     "bg-violet-50 text-violet-700 border-violet-200",
  Libraries: "bg-amber-50  text-amber-700  border-amber-200",
};

const STATUS_COLOR: Record<string, string> = {
  "Ongoing":          "bg-emerald-100 text-emerald-700",
  "Design Phase":     "bg-indigo-100  text-indigo-700",
  "BOQ Verification": "bg-cyan-100    text-cyan-700",
};

type Tab = "All" | "Ongoing" | "Design Phase" | "BOQ Verification";

export default function ProjectMonitoringPage() {
  const t        = useTranslations("Admin.monitoring");
  const locale   = useLocale();
  const supabase = useRef(createClient()).current;

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab,      setTab]      = useState<Tab>("All");
  const [sortBy,   setSortBy]   = useState<"progress" | "health" | "deadline">("health");

  const load = useCallback(async () => {
    setLoading(true);

    const { data: flat, error } = await supabase
      .from("projects")
      .select("id, name, sector, status, progress, budget, start_date, expected_end_date, location, boq_approved_at, updated_at, contractor_id, tender_id")
      .in("status", ["Ongoing", "Design Phase", "BOQ Verification"])
      .order("progress", { ascending: false });

    if (error || !flat || flat.length === 0) {
      setProjects([]);
      setLoading(false);
      return;
    }

    const projectIds    = flat.map((p: any) => p.id);
    const tenderIds     = flat.map((p: any) => p.tender_id).filter(Boolean) as string[];
    const contractorIds = [...new Set(flat.map((p: any) => p.contractor_id).filter(Boolean))] as string[];

    const [
      { data: contractors },
      { data: contracts },
      { data: issues },
      { data: inspections },
      { data: tests },
      { data: boqItems },
      { data: reports },
    ] = await Promise.all([
      contractorIds.length
        ? supabase.from("contractors").select("id, company_name").in("id", contractorIds)
        : Promise.resolve({ data: [] }),
      tenderIds.length
        ? supabase.from("contracts").select("tender_id, signed_amount, start_date, end_date, progress_percent").in("tender_id", tenderIds)
        : Promise.resolve({ data: [] }),
      supabase.from("project_issues").select("project_id, status, severity").in("project_id", projectIds),
      supabase.from("site_inspections").select("project_id, passed").in("project_id", projectIds),
      supabase.from("quality_tests").select("project_id, passed").in("project_id", projectIds),
      supabase.from("boq_items").select("project_id, total_price").in("project_id", projectIds),
      supabase.from("daily_reports").select("project_id, report_date").in("project_id", projectIds).order("report_date", { ascending: false }),
    ]);

    const contractorMap = Object.fromEntries((contractors || []).map((c: any) => [c.id, c.company_name]));
    const contractMap   = Object.fromEntries((contracts   || []).map((c: any) => [c.tender_id, c]));

    const enriched: ProjectRow[] = flat.map((p: any) => {
      const contract    = p.tender_id    ? contractMap[p.tender_id]    : null;
      const projIssues  = (issues      || []).filter((i: any) => i.project_id === p.id);
      const projInsp    = (inspections || []).filter((i: any) => i.project_id === p.id);
      const projTests   = (tests       || []).filter((tst: any) => tst.project_id === p.id);
      const projBOQ     = (boqItems    || []).filter((b: any)   => b.project_id === p.id);
      const projReports = (reports     || []).filter((r: any)   => r.project_id === p.id);
      const boqTotal    = projBOQ.reduce((s: number, i: any) => s + Number(i.total_price || 0), 0);

      return {
        id:                 p.id,
        name:               p.name,
        sector:             p.sector,
        status:             p.status,
        progress:           p.progress ?? 0,
        budget:             Number(p.budget) || 0,
        start_date:         p.start_date,
        expected_end_date:  p.expected_end_date,
        location:           p.location,
        boq_approved_at:    p.boq_approved_at,
        updated_at:         p.updated_at,
        contractor:         p.contractor_id ? (contractorMap[p.contractor_id] ?? null) : null,
        signed_amount:      contract ? Number(contract.signed_amount) || null : null,
        contract_start:     contract?.start_date ?? null,
        contract_end:       contract?.end_date ?? null,
        payment_pct:        contract?.progress_percent ?? null,
        open_issues:        projIssues.filter((i: any) => i.status === "Open").length,
        critical_issues:    projIssues.filter((i: any) => i.severity === "Critical" && i.status !== "Resolved").length,
        total_inspections:  projInsp.length,
        failed_inspections: projInsp.filter((i: any) => i.passed === false).length,
        failed_tests:       projTests.filter((tst: any) => tst.passed === false).length,
        boq_total:          boqTotal > 0 ? boqTotal : null,
        report_count:       projReports.length,
        last_report_date:   projReports[0]?.report_date ?? null,
      };
    });

    setProjects(enriched);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = projects
    .filter(p => tab === "All" || p.status === tab)
    .sort((a, b) => {
      if (sortBy === "progress") return b.progress - a.progress;
      if (sortBy === "deadline") {
        const da = getDaysLeft(a.contract_end || a.expected_end_date) ?? 9999;
        const db = getDaysLeft(b.contract_end || b.expected_end_date) ?? 9999;
        return da - db;
      }
      const order = { critical: 0, "at-risk": 1, "no-data": 2, "on-track": 3 };
      return order[getHealth(a)] - order[getHealth(b)];
    });

  const critical  = projects.filter(p => getHealth(p) === "critical").length;
  const atRisk    = projects.filter(p => getHealth(p) === "at-risk").length;
  const onTrack   = projects.filter(p => getHealth(p) === "on-track").length;
  const avgProg   = projects.length ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;

  const HEALTH_LABEL_KEY: Record<string, string> = {
    "on-track": "health_on_track",
    "at-risk":  "health_at_risk",
    "critical": "health_critical",
    "no-data":  "health_no_data",
  };

  const TABS: { val: Tab; labelKey: string }[] = [
    { val: "All",               labelKey: "tab_all"    },
    { val: "Ongoing",           labelKey: "tab_ongoing"},
    { val: "Design Phase",      labelKey: "tab_design" },
    { val: "BOQ Verification",  labelKey: "tab_boq"    },
  ];

  const SORT_KEYS: { val: "health"|"progress"|"deadline"; labelKey: string }[] = [
    { val: "health",   labelKey: "sort_health"   },
    { val: "progress", labelKey: "sort_progress" },
    { val: "deadline", labelKey: "sort_deadline" },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] p-6 md:p-10">
      <div className="max-w-[1400px] mx-auto space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-slate-400 uppercase font-black text-[10px] tracking-[0.35em] mb-3">
              <Activity size={14} /> {t("live_feed")}
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
              {t("title").split(" ")[0]}<br />
              <span className="text-blue-600">{t("title").split(" ").slice(1).join(" ")}</span>
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              { labelKey: "kpi_total",        val: projects.length, cls: "bg-slate-900 text-white"  },
              { labelKey: "kpi_on_track",      val: onTrack,         cls: "bg-emerald-500 text-white"},
              { labelKey: "kpi_at_risk",       val: atRisk,          cls: "bg-amber-400 text-white"  },
              { labelKey: "kpi_critical",      val: critical,        cls: "bg-red-500 text-white"    },
              { labelKey: "kpi_avg_progress",  val: `${avgProg}%`,   cls: "bg-blue-600 text-white"   },
            ].map(k => (
              <div key={k.labelKey} className={`px-5 py-3 rounded-2xl ${k.cls} min-w-[80px] text-center`}>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-70">{t(k.labelKey)}</p>
                <p className="text-xl font-black tracking-tight">{loading ? "—" : k.val}</p>
              </div>
            ))}
            <button onClick={load}
              className="px-4 py-3 bg-white rounded-2xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {/* Tabs + Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-2 flex-wrap">
            {TABS.map(tab_ => {
              const cnt = tab_.val === "All" ? projects.length : projects.filter(p => p.status === tab_.val).length;
              return (
                <button key={tab_.val} onClick={() => setTab(tab_.val)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    tab === tab_.val ? "bg-[#0A1628] text-white" : "bg-white border border-slate-200 text-slate-500"
                  }`}>
                  {t(tab_.labelKey)} {!loading && <span className="opacity-60 ml-1">({cnt})</span>}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-xs font-black text-slate-400">
            <span className="uppercase tracking-widest">{t("sort_by")}</span>
            {SORT_KEYS.map(s => (
              <button key={s.val} onClick={() => setSortBy(s.val)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  sortBy === s.val ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-500"
                }`}>
                {t(s.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Project list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-[1.5rem] border border-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-[2rem] border border-slate-200 p-20 text-center">
            <Construction size={48} className="text-slate-200 mx-auto mb-4" />
            <p className="font-black text-slate-400 text-lg">{t("no_projects")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(project => {
              const health   = getHealth(project);
              const hColors  = HEALTH_COLORS[health];
              const daysLeft = getDaysLeft(project.contract_end || project.expected_end_date);
              const isOpen   = expanded === project.id;
              const HealthIcon = hColors.icon;

              const budgetUtil = project.boq_total && project.budget
                ? Math.min(Math.round((project.boq_total / project.budget) * 100), 999)
                : null;

              return (
                <div key={project.id}
                  className={`bg-white rounded-[1.75rem] border shadow-sm overflow-hidden transition-all duration-200 ${
                    health === "critical" ? "border-red-300 shadow-red-100"
                    : health === "at-risk" ? "border-amber-200"
                    : "border-slate-200"
                  }`}>

                  {/* Main row */}
                  <div
                    className="grid grid-cols-12 gap-0 items-center px-6 py-5 cursor-pointer hover:bg-slate-50/60 transition-colors"
                    onClick={() => setExpanded(isOpen ? null : project.id)}
                  >
                    {/* Identity */}
                    <div className="col-span-12 md:col-span-4 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${hColors.dot}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                              SECTOR_COLOR[project.sector || ""] || "bg-slate-100 text-slate-600 border-slate-200"
                            }`}>{project.sector || "—"}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                              STATUS_COLOR[project.status] || "bg-slate-100 text-slate-600"
                            }`}>{project.status}</span>
                          </div>
                          <p className="font-black text-slate-900 text-sm leading-tight truncate">{project.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {project.contractor || t("no_contractor")}
                            {project.location ? ` · ${project.location}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Progress bars */}
                    <div className="col-span-12 md:col-span-4 mt-3 md:mt-0 px-0 md:px-6">
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{t("progress_physical")}</span>
                            <span className="text-[10px] font-black text-orange-500">{project.progress}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${
                              health === "critical" ? "bg-red-500" : health === "at-risk" ? "bg-amber-500" : "bg-orange-500"
                            }`} style={{ width: `${project.progress}%` }} />
                          </div>
                        </div>
                        {budgetUtil !== null && (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{t("progress_boq")}</span>
                              <span className={`text-[10px] font-black ${budgetUtil > 100 ? "text-red-500" : "text-blue-500"}`}>{budgetUtil}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${budgetUtil > 100 ? "bg-red-500" : "bg-blue-400"}`}
                                style={{ width: `${Math.min(budgetUtil, 100)}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timeline + alerts */}
                    <div className="col-span-12 md:col-span-3 mt-3 md:mt-0 flex flex-wrap md:flex-col gap-2 md:gap-1.5 md:items-end">
                      {daysLeft !== null ? (
                        <div className={`flex items-center gap-1.5 text-[10px] font-black rounded-lg px-2.5 py-1.5 ${
                          daysLeft < 0   ? "bg-red-100 text-red-700"
                          : daysLeft < 14 ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                        }`}>
                          <Clock size={11} />
                          {daysLeft < 0 ? t("overdue", { n: Math.abs(daysLeft) })
                            : daysLeft === 0 ? t("due_today")
                            : t("days_left", { n: daysLeft })}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 px-2.5 py-1.5 bg-slate-100 rounded-lg">
                          <CalendarDays size={11} /> {t("no_deadline")}
                        </div>
                      )}
                      {project.critical_issues > 0 && (
                        <span className="flex items-center gap-1 text-[9px] font-black bg-red-100 text-red-700 px-2 py-1 rounded-lg">
                          <ShieldAlert size={10} /> {t("critical_badge", { n: project.critical_issues })}
                        </span>
                      )}
                      {project.failed_tests > 0 && (
                        <span className="flex items-center gap-1 text-[9px] font-black bg-orange-100 text-orange-700 px-2 py-1 rounded-lg">
                          <Beaker size={10} /> {t("test_fail_badge", { n: project.failed_tests })}
                        </span>
                      )}
                      {project.report_count === 0 && project.status === "Ongoing" && (
                        <span className="flex items-center gap-1 text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">
                          <Minus size={10} /> {t("no_reports_badge")}
                        </span>
                      )}
                    </div>

                    {/* Health + expand */}
                    <div className="col-span-12 md:col-span-1 mt-3 md:mt-0 flex md:flex-col items-center justify-between md:justify-center gap-2">
                      <span className={`flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-full ${hColors.bg} ${hColors.text}`}>
                        <HealthIcon size={9} /> {t(HEALTH_LABEL_KEY[health])}
                      </span>
                      <div className="text-slate-300">
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded panel */}
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50/60 p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Budget & Contract */}
                        <div className="space-y-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t("section_budget")}</p>
                          <div className="space-y-2">
                            {[
                              { labelKey: "label_project_budget",  val: project.budget        ? `${fmt(project.budget)} ETB` : "—" },
                              { labelKey: "label_contract_value",  val: project.signed_amount  ? `${fmt(project.signed_amount)} ETB` : "—" },
                              { labelKey: "label_boq_total",       val: project.boq_total      ? `${fmt(project.boq_total)} ETB` : "—" },
                              { labelKey: "label_contract_start",  val: project.contract_start ? new Date(project.contract_start).toLocaleDateString("en-GB") : "—" },
                              { labelKey: "label_contract_end",    val: project.contract_end   ? new Date(project.contract_end).toLocaleDateString("en-GB") : "—" },
                            ].map(row => (
                              <div key={row.labelKey} className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500">{t(row.labelKey)}</span>
                                <span className="text-[10px] font-black text-slate-800">{row.val}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Site Activity */}
                        <div className="space-y-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t("section_activity")}</p>
                          <div className="space-y-2">
                            {[
                              { icon: ClipboardCheck, labelKey: "label_inspections",   val: t("val_inspections", { total: project.total_inspections, failed: project.failed_inspections }) },
                              { icon: Beaker,         labelKey: "label_quality_tests", val: t("val_failed_tests", { n: project.failed_tests }) },
                              { icon: ShieldAlert,    labelKey: "label_open_issues",   val: t("val_open_issues", { open: project.open_issues }) + (project.critical_issues ? t("val_critical_issues", { n: project.critical_issues }) : "") },
                              { icon: BarChart3,      labelKey: "label_daily_reports", val: t("val_reports", { n: project.report_count }) },
                              {
                                icon: CalendarDays,
                                labelKey: "label_last_report",
                                // ── FIX: closing ) for toLocaleDateString was missing ──
                                val: project.last_report_date
                                  ? new Date(project.last_report_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                                  : t("val_none_yet"),
                              },
                            ].map(row => (
                              <div key={row.labelKey} className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                  <row.icon size={11} className="text-slate-400" /> {t(row.labelKey)}
                                </span>
                                <span className="text-[10px] font-black text-slate-800">{row.val}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="space-y-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t("section_actions")}</p>
                          <div className="space-y-2">
                            <Link href={`/${locale}/admin/construction-tracking/${project.id}/reports`}
                              className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 transition-all group">
                              <span>{t("action_daily_reports")}</span>
                              <FileCheck size={13} className="group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                            <Link href={`/${locale}/admin/design-supervision/inspections`}
                              className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase hover:border-slate-400 transition-all">
                              <span>{t("action_inspections")}</span>
                              <ClipboardCheck size={13} />
                            </Link>
                            <Link href={`/${locale}/admin/design-supervision/issues`}
                              className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase hover:border-slate-400 transition-all">
                              <span>{t("action_issues", { n: project.open_issues })}</span>
                              <ShieldAlert size={13} />
                            </Link>
                            <Link href={`/${locale}/admin/design-supervision/quality`}
                              className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase hover:border-slate-400 transition-all">
                              <span>{t("action_quality")}</span>
                              <Beaker size={13} />
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Warning banners */}
                      {project.report_count === 0 && project.status === "Ongoing" && (
                        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                          <AlertTriangle size={14} /> {t("warn_no_reports")}
                        </div>
                      )}
                      {daysLeft !== null && daysLeft < 0 && (
                        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                          <ShieldAlert size={14} /> {t("warn_overdue", { n: Math.abs(daysLeft) })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Health legend */}
        {!loading && projects.length > 0 && (
          <div className="flex items-center gap-6 pt-2 flex-wrap">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">{t("health_legend")}</p>
            {(Object.entries(HEALTH_COLORS) as [string, typeof HEALTH_COLORS["on-track"]][]).map(([k, v]) => {
              const Icon = v.icon;
              return (
                <div key={k} className={`flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-full ${v.bg} ${v.text}`}>
                  <Icon size={10} /> {t(HEALTH_LABEL_KEY[k])}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}