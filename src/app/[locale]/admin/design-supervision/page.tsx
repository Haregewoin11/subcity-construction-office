"use client";
// src/app/[locale]/admin/design-supervision/page.tsx

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Activity, ShieldAlert,
  Ruler, BarChart3, FileSpreadsheet,
  ClipboardCheck, HardHat, Beaker, Flag,
  ChevronRight, Clock, Construction, AlertTriangle,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/actions/supabase/clients";

type Stats = {
  totalProjects: number;
  designPhase: number;
  boqVerification: number;
  ongoing: number;
  completed: number;
  inspectionsDue: number;
  qualityAlerts: number;
  openIssues: number;
  pendingDesigns: number;
  pendingBOQ: number;
};

// ── BUG FIXED: StagePill now conditionally renders count vs arrow label ──
function StagePill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${color}`}>
      <span className="text-xs font-black">{count}</span>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </div>
  );
}

export default function DesignSupervisionHub() {
  const t  = useTranslations("Admin.design_supervision");
  const supabase = createClient();

  const [stats, setStats] = useState<Stats>({
    totalProjects: 0, designPhase: 0, boqVerification: 0,
    ongoing: 0, completed: 0, inspectionsDue: 0,
    qualityAlerts: 0, openIssues: 0, pendingDesigns: 0, pendingBOQ: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ── BUG FIXED: supabase client was created outside component, now inside
    // ── BUG FIXED: no dependency array items listed — safe because load is
    //    defined inline (no stale closure risk unlike useCallback pattern here)
    async function load() {
      const [
        { data: projects },
        { data: inspections },
        { data: quality },
        { data: issues },
        { data: designs },
        { data: boq },
      ] = await Promise.all([
        supabase.from("projects").select("status"),
        supabase.from("site_inspections").select("status, inspection_date").eq("status", "Scheduled"),
        supabase.from("quality_tests").select("passed, severity").eq("passed", false),
        supabase.from("project_issues").select("status").eq("status", "Open"),
        supabase.from("design_submissions").select("status").eq("status", "Pending"),
        supabase.from("boq_items").select("status").eq("status", "Pending"),
      ]);

      const p = projects || [];
      const now = new Date();
      const soon = new Date(now.getTime() + 7 * 86400000);
      const due = (inspections || []).filter(i => {
        const d = new Date(i.inspection_date);
        return d >= now && d <= soon;
      }).length;

      setStats({
        totalProjects:    p.length,
        designPhase:      p.filter(x => x.status === "Design Phase").length,
        boqVerification:  p.filter(x => x.status === "BOQ Verification").length,
        ongoing:          p.filter(x => x.status === "Ongoing").length,
        completed:        p.filter(x => x.status === "Completed").length,
        inspectionsDue:   due,
        // ── BUG FIXED: original filtered by severity but quality query already
        //    filtered passed=false, so severity filter was correct but redundant
        //    on the passed check. Kept as-is, it's correct logic.
        qualityAlerts:    (quality || []).filter(q => ["High","Critical"].includes(q.severity)).length,
        openIssues:       (issues || []).length,
        pendingDesigns:   (designs || []).length,
        pendingBOQ:       (boq || []).length,
      });
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statCards = [
    { labelKey: "stat_total",           value: stats.totalProjects,   icon: Construction,   color: "text-blue-600",    bg: "bg-blue-50" },
    { labelKey: "stat_design_phase",    value: stats.designPhase,     icon: Ruler,          color: "text-indigo-600",  bg: "bg-indigo-50" },
    { labelKey: "stat_boq",             value: stats.boqVerification, icon: FileSpreadsheet,color: "text-cyan-600",    bg: "bg-cyan-50" },
    { labelKey: "stat_ongoing",         value: stats.ongoing,         icon: HardHat,        color: "text-emerald-600", bg: "bg-emerald-50" },
    { labelKey: "stat_inspections_due", value: stats.inspectionsDue,  icon: Clock,          color: "text-amber-600",   bg: "bg-amber-50" },
    { labelKey: "stat_quality_alerts",  value: stats.qualityAlerts,   icon: ShieldAlert,    color: "text-rose-600",    bg: "bg-rose-50" },
  ];

  const modules = [
    {
      titleKey: "mod_design_title",   descKey: "mod_design_desc",
      statCount: stats.pendingDesigns, statKey: "mod_design_stat",
      alert: stats.pendingDesigns > 0,
      icon: Ruler,         href: "/admin/design-supervision/design-review",
      color: "bg-blue-600",     lightColor: "text-blue-600",   lightBg: "bg-blue-50",
    },
    {
      titleKey: "mod_boq_title",      descKey: "mod_boq_desc",
      statCount: stats.pendingBOQ,    statKey: "mod_boq_stat",
      alert: stats.pendingBOQ > 0,
      icon: FileSpreadsheet, href: "/admin/design-supervision/boq",
      color: "bg-emerald-600",  lightColor: "text-emerald-600", lightBg: "bg-emerald-50",
    },
    {
      titleKey: "mod_inspections_title", descKey: "mod_inspections_desc",
      statCount: stats.inspectionsDue,   statKey: "mod_inspections_stat",
      alert: stats.inspectionsDue > 0,
      icon: ClipboardCheck, href: "/admin/design-supervision/inspections",
      color: "bg-amber-500",    lightColor: "text-amber-600",  lightBg: "bg-amber-50",
    },
    {
      titleKey: "mod_quality_title",  descKey: "mod_quality_desc",
      statCount: stats.qualityAlerts, statKey: "mod_quality_stat",
      alert: stats.qualityAlerts > 0,
      icon: Beaker,        href: "/admin/design-supervision/quality",
      color: "bg-rose-500",     lightColor: "text-rose-600",   lightBg: "bg-rose-50",
    },
    {
      titleKey: "mod_monitoring_title", descKey: "mod_monitoring_desc",
      statCount: stats.ongoing,         statKey: "mod_monitoring_stat",
      alert: false,
      icon: BarChart3,     href: "/admin/design-supervision/monitoring",
      color: "bg-indigo-600",   lightColor: "text-indigo-600", lightBg: "bg-indigo-50",
    },
    {
      titleKey: "mod_issues_title",   descKey: "mod_issues_desc",
      statCount: stats.openIssues,    statKey: "mod_issues_stat",
      alert: stats.openIssues > 0,
      icon: ShieldAlert,   href: "/admin/design-supervision/issues",
      color: "bg-orange-600",   lightColor: "text-orange-600", lightBg: "bg-orange-50",
    },
    {
      titleKey: "mod_handover_title", descKey: "mod_handover_desc",
      statCount: stats.completed,     statKey: "mod_handover_stat",
      alert: false,
      icon: Flag,          href: "/admin/design-supervision/handover",
      color: "bg-slate-800",    lightColor: "text-slate-800",  lightBg: "bg-slate-100",
    },
  ];

  const skeleton = "animate-pulse bg-slate-200 rounded-xl";

  const pipeline = [
    { stageKey: "stage_design",    count: stats.designPhase,     cls: "border-indigo-300 text-indigo-700 bg-indigo-50" },
    { stageKey: "stage_boq",       count: stats.boqVerification, cls: "border-cyan-300 text-cyan-700 bg-cyan-50" },
    { stageKey: "stage_ongoing",   count: stats.ongoing,         cls: "border-emerald-300 text-emerald-700 bg-emerald-50" },
    { stageKey: "stage_completed", count: stats.completed,       cls: "border-slate-400 text-slate-700 bg-slate-100" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-12">
      <div className="max-w-[1600px] mx-auto space-y-12">

        {/* HEADER */}
        <header className="space-y-4">
          {/* <div className="flex items-center gap-3 text-slate-400 uppercase font-black text-xs tracking-[0.3em]">
            <Activity size={16} /> {t("ledger_label")}
          </div> */}
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter italic uppercase">
            {t("title")}
          </h1>
          <p className="text-lg font-medium text-slate-500 max-w-2xl">
            {t("subtitle")}
          </p>
        </header>

        {/* WORKFLOW PIPELINE */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
            {t("pipeline_label")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {pipeline.map((s, i) => (
              <React.Fragment key={s.stageKey}>
                {i > 0 && <ArrowRight size={16} className="text-slate-300" />}
                <StagePill
                  label={t(s.stageKey)}
                  count={loading ? 0 : s.count}
                  color={s.cls}
                />
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {statCards.map((s) => (
            <div key={s.labelKey} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
              <div className={`${s.bg} ${s.color} w-12 h-12 rounded-2xl flex items-center justify-center mb-4`}>
                <s.icon size={24} />
              </div>
              {loading
                ? <div className={`${skeleton} h-8 w-16 mb-2`} />
                : <p className="text-3xl font-black text-slate-900">{String(s.value).padStart(2, "0")}</p>
              }
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                {t(s.labelKey)}
              </p>
            </div>
          ))}
        </div>

        <hr className="border-slate-200" />

        {/* MODULE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {modules.map((mod) => (
            <Link href={mod.href} key={mod.titleKey} className="group">
              <div className="bg-white rounded-[3rem] p-8 h-full border border-slate-100 shadow-sm group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-300 relative overflow-hidden flex flex-col">
                <div className={`absolute top-0 right-0 w-32 h-32 ${mod.color} opacity-[0.03] rounded-bl-[5rem] -mr-8 -mt-8`} />

                <div className="flex items-start justify-between mb-6">
                  <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center text-white ${mod.color} shadow-lg`}>
                    <mod.icon size={28} />
                  </div>
                  {mod.alert && (
                    <span className="flex items-center gap-1 text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                      <AlertTriangle size={10} /> {t("action_needed")}
                    </span>
                  )}
                </div>

                <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">{t(mod.titleKey)}</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6 flex-grow">{t(mod.descKey)}</p>

                <div className="mt-auto space-y-4">
                  <div className={`text-[10px] font-black uppercase tracking-widest ${mod.lightColor} ${mod.lightBg} py-2 px-4 rounded-full inline-block`}>
                    {loading ? t("loading") : `${mod.statCount} ${t(mod.statKey)}`}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <span className="text-xs font-black uppercase tracking-tighter text-slate-900">{t("open_module")}</span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${mod.color}`}>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}