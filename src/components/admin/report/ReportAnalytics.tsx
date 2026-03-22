"use client";
// src/components/admin/report/ReportAnalytics.tsx

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  TrendingUp, ShieldCheck, ShieldAlert, Sun, Cloud,
  CloudRain, AlertTriangle, BarChart3, Inbox, Calendar,
} from "lucide-react";
import { createClient } from "@/lib/actions/supabase/clients";

type Report = {
  id: string; report_date: string;
  cumulative_progress_pct: number | null;
  issue_severity: string | null;
  safety_compliance: boolean;
  weather: string | null;
  shift: string | null;
  issues_description: string | null;
};

export default function ReportAnalytics({ projectId }: { projectId: string }) {
  const t        = useTranslations("Admin.daily_reports");
  const supabase = useRef(createClient()).current;

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("daily_reports")
      .select("id, report_date, cumulative_progress_pct, issue_severity, safety_compliance, weather, shift, issues_description")
      .eq("project_id", projectId)
      .order("report_date", { ascending: true });
    setReports(data || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200 animate-pulse" />
      ))}
    </div>
  );

  if (reports.length === 0) return (
    <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center">
      <Inbox size={48} className="text-slate-200 mx-auto mb-4" strokeWidth={1} />
      <p className="font-black text-slate-400 text-lg">{t("analytics_empty_title")}</p>
      <p className="text-sm text-slate-300 mt-1">{t("analytics_empty_body")}</p>
    </div>
  );

  // ── Derived stats ─────────────────────────────────────────────────────────
  const total          = reports.length;
  const safeCount      = reports.filter(r => r.safety_compliance).length;
  const unsafeCount    = total - safeCount;
  const withIssues     = reports.filter(r => r.issues_description?.trim()).length;
  const latestProgress = [...reports].reverse()
    .find(r => r.cumulative_progress_pct != null)?.cumulative_progress_pct ?? 0;
  const progressSeries = reports.filter(r => r.cumulative_progress_pct != null).slice(-12);

  const weatherCount: Record<string, number> = {};
  reports.forEach(r => { if (r.weather) weatherCount[r.weather] = (weatherCount[r.weather] || 0) + 1; });
  const topWeather = Object.entries(weatherCount).sort((a, b) => b[1] - a[1]);

  const sevCount: Record<string, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  reports.forEach(r => { if (r.issue_severity) sevCount[r.issue_severity] = (sevCount[r.issue_severity] || 0) + 1; });

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split("T")[0];
  });
  const reportedDays = new Set(reports.map(r => r.report_date));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label={t("kpi_total")}    value={total}                 color="slate"   icon={<BarChart3 size={18}/>} />
        <KpiCard label={t("kpi_progress")} value={`${latestProgress}%`} color="orange"  icon={<TrendingUp size={18}/>} />
        <KpiCard label={t("kpi_safety")}   value={`${safeCount}/${total}`} color="emerald" icon={<ShieldCheck size={18}/>} />
        <KpiCard label={t("kpi_issues")}   value={withIssues}            color={withIssues > 0 ? "amber" : "slate"} icon={<AlertTriangle size={18}/>} />
      </div>

      {/* Progress Chart */}
      {progressSeries.length > 1 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5">
            {t("chart_progress_title")}
          </p>
          <div className="flex items-end gap-2 h-36">
            {progressSeries.map(r => {
              const h = Math.max(((r.cumulative_progress_pct! / 100) * 100), 2);
              const date = new Date(r.report_date);
              return (
                <div key={r.id} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  <span className="text-[9px] font-black text-orange-500">{r.cumulative_progress_pct}%</span>
                  <div className="w-full relative flex justify-center">
                    <div className="w-full max-w-[28px] rounded-t-lg bg-orange-500 transition-all duration-500"
                      style={{ height: `${h}px` }} />
                  </div>
                  <span className="text-[8px] text-slate-400 font-bold whitespace-nowrap">
                    {date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Safety */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5">
            {t("section_safety")}
          </p>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-xs font-black text-emerald-600 flex items-center gap-1">
                  <ShieldCheck size={12} /> {t("safety_compliant")}
                </span>
                <span className="text-xs font-black text-slate-700">{safeCount}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${(safeCount / total) * 100}%` }} />
              </div>
            </div>
            {unsafeCount > 0 && (
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs font-black text-red-600 flex items-center gap-1">
                    <ShieldAlert size={12} /> {t("safety_non_compliant")}
                  </span>
                  <span className="text-xs font-black text-slate-700">{unsafeCount}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full"
                    style={{ width: `${(unsafeCount / total) * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Issue severity */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5">
            {t("section_severity")}
          </p>
          {Object.values(sevCount).every(v => v === 0) ? (
            <p className="text-sm text-slate-300 italic">{t("no_issues")}</p>
          ) : (
            <div className="space-y-2.5">
              {[
                { key: "Critical", color: "bg-red-500",     textKey: "severity_critical" },
                { key: "High",     color: "bg-orange-500",  textKey: "severity_high"     },
                { key: "Medium",   color: "bg-amber-400",   textKey: "severity_medium"   },
                { key: "Low",      color: "bg-emerald-500", textKey: "severity_low"      },
              ].map(s => sevCount[s.key] > 0 && (
                <div key={s.key}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-black text-slate-600">{t(s.textKey)}</span>
                    <span className="text-[10px] font-black text-slate-700">{sevCount[s.key]}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${s.color} rounded-full`}
                      style={{ width: `${(sevCount[s.key] / withIssues) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weather */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5">
            {t("section_weather")}
          </p>
          <div className="space-y-2.5">
            {topWeather.map(([w, count]) => (
              <div key={w} className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-2">
                  {w === "Sunny"  ? <Sun size={12} className="text-amber-500" />
                  : w === "Rainy" ? <CloudRain size={12} className="text-blue-500" />
                  : <Cloud size={12} className="text-slate-400" />}
                  {/* weather label — raw DB value displayed as-is (English enum) */}
                  {w}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full"
                      style={{ width: `${(count / total) * 100}%` }} />
                  </div>
                  {/* count in JSX */}
                  <span className="text-[10px] font-black text-slate-500 w-4 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 30-day heatmap */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
          <Calendar size={12} /> {t("section_activity")}
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {last30.map(day => {
            const hasReport = reportedDays.has(day);
            const d = new Date(day);
            return (
              <div key={day}
                title={`${d.toLocaleDateString("en-GB", { dateStyle: "medium" })} — ${
                  hasReport ? t("tooltip_reported") : t("tooltip_no_report")
                }`}
                className={`w-7 h-7 rounded-lg transition-all ${hasReport ? "bg-orange-500" : "bg-slate-100"}`}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 text-[10px] font-bold text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-orange-500 inline-block" /> {t("legend_reported")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-100 inline-block" /> {t("legend_no_report")}
          </span>
        </div>
      </div>

    </div>
  );
}

function KpiCard({ label, value, color, icon }: { label: string; value: any; color: string; icon: React.ReactNode }) {
  const colors: Record<string, string> = {
    slate:   "bg-slate-900  text-white",
    orange:  "bg-orange-500 text-white",
    emerald: "bg-emerald-500 text-white",
    amber:   "bg-amber-400  text-white",
    red:     "bg-red-500    text-white",
  };
  return (
    <div className={`rounded-2xl p-5 ${colors[color] || colors.slate}`}>
      <div className="flex items-start justify-between mb-3 opacity-70">{icon}</div>
      <p className="text-2xl font-black tracking-tight">{value}</p>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mt-1">{label}</p>
    </div>
  );
}