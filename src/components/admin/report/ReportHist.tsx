"use client";
// src/components/admin/report/ReportHist.tsx

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  CalendarDays, Cloud, Sun, CloudRain, Wind, Thermometer,
  ShieldCheck, ShieldAlert, ChevronDown, ChevronUp,
  Clock, User, FileText, RefreshCw, Inbox, AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/actions/supabase/clients";

type Report = {
  id: string; report_date: string; weather: string | null;
  temperature: number | null; shift: string | null;
  cumulative_progress_pct: number | null; work_description: string | null;
  issues_description: string | null; issue_severity: string | null;
  action_taken: string | null; safety_compliance: boolean;
  supervisor_name: string | null; status: string; created_at: string;
};

const WEATHER_ICON: Record<string, React.ReactNode> = {
  Sunny:  <Sun size={14} className="text-amber-500" />,
  Cloudy: <Cloud size={14} className="text-slate-400" />,
  Rainy:  <CloudRain size={14} className="text-blue-500" />,
  Windy:  <Wind size={14} className="text-cyan-500" />,
};

// Severity display — colour only, label comes from t()
const SEVERITY_CSS: Record<string, { bg: string; text: string }> = {
  Low:      { bg: "bg-emerald-100", text: "text-emerald-700" },
  Medium:   { bg: "bg-amber-100",   text: "text-amber-700"   },
  High:     { bg: "bg-orange-100",  text: "text-orange-700"  },
  Critical: { bg: "bg-red-100",     text: "text-red-700"     },
};
const SEVERITY_KEY: Record<string, string> = {
  Low: "severity_low", Medium: "severity_medium",
  High: "severity_high", Critical: "severity_critical",
};
const STATUS_CSS: Record<string, string> = {
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
};
const STATUS_KEY: Record<string, string> = {
  Submitted: "status_submitted",
  Approved:  "status_approved",
  Rejected:  "status_rejected",
};

export default function ReportHistory({ projectId }: { projectId: string }) {
  const t        = useTranslations("Admin.daily_reports");
  const supabase = useRef(createClient()).current;

  const [reports,  setReports]  = useState<Report[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("daily_reports")
      .select("id, report_date, weather, temperature, shift, cumulative_progress_pct, work_description, issues_description, issue_severity, action_taken, safety_compliance, supervisor_name, status, created_at")
      .eq("project_id", projectId)
      .order("report_date", { ascending: false });
    setReports(data || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-20 bg-white rounded-2xl border border-slate-200 animate-pulse" />
      ))}
    </div>
  );

  if (reports.length === 0) return (
    <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center">
      <Inbox size={48} className="text-slate-200 mx-auto mb-4" strokeWidth={1} />
      <p className="font-black text-slate-400 text-lg">{t("empty_title")}</p>
      <p className="text-sm text-slate-300 mt-1">{t("empty_body")}</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Summary strip */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {/* count in JSX, singular/plural label from t() */}
          {reports.length}{" "}
          {reports.length === 1 ? t("reports_count_singular") : t("reports_count_plural")}
        </p>
        <button onClick={load}
          className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-slate-700 transition-colors">
          <RefreshCw size={12} /> {t("btn_refresh")}
        </button>
      </div>

      {reports.map(r => {
        const isOpen = expanded === r.id;
        const sev    = r.issue_severity ? SEVERITY_CSS[r.issue_severity] : null;
        const sevKey = r.issue_severity ? SEVERITY_KEY[r.issue_severity] : null;
        const statusKey = STATUS_KEY[r.status] ?? "status_submitted";
        const date   = new Date(r.report_date);

        return (
          <div key={r.id}
            className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
              r.issue_severity === "Critical" ? "border-red-200 shadow-red-50"
              : r.issue_severity === "High"   ? "border-orange-200"
              : "border-slate-200"
            }`}>

            {/* Row */}
            <div className="grid grid-cols-12 items-center px-5 py-4 cursor-pointer hover:bg-slate-50/70 transition-colors gap-2"
              onClick={() => setExpanded(isOpen ? null : r.id)}>

              {/* Date */}
              <div className="col-span-3 md:col-span-2">
                <p className="text-xs font-black text-slate-900">
                  {date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                </p>
                <p className="text-[10px] text-slate-400 font-bold">{date.getFullYear()}</p>
              </div>

              {/* Progress */}
              <div className="col-span-4 md:col-span-3">
                <div className="flex justify-between mb-1">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                    {t("col_progress")}
                  </span>
                  <span className="text-[10px] font-black text-orange-500">
                    {r.cumulative_progress_pct ?? "—"}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all"
                    style={{ width: `${r.cumulative_progress_pct ?? 0}%` }} />
                </div>
              </div>

              {/* Weather + temp */}
              <div className="col-span-3 md:col-span-3 flex items-center gap-3">
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                  {WEATHER_ICON[r.weather || ""] || <Cloud size={14} className="text-slate-300" />}
                  {r.weather || "—"}
                </div>
                {r.temperature && (
                  <span className="flex items-center gap-0.5 text-[9px] text-slate-400 font-bold">
                    <Thermometer size={10} /> {r.temperature}°C
                  </span>
                )}
              </div>

              {/* Badges */}
              <div className="col-span-8 md:col-span-3 flex items-center gap-2 flex-wrap">
                {r.safety_compliance ? (
                  <span className="flex items-center gap-1 text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg">
                    <ShieldCheck size={10} /> {t("badge_safe")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[9px] font-black bg-red-100 text-red-700 px-2 py-1 rounded-lg">
                    <ShieldAlert size={10} /> {t("badge_unsafe")}
                  </span>
                )}
                {sev && sevKey && (
                  <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${sev.bg} ${sev.text}`}>
                    {t(sevKey)}
                  </span>
                )}
                {r.shift && (
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                    {r.shift}
                  </span>
                )}
              </div>

              <div className="col-span-1 flex justify-end text-slate-300">
                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </div>

            {/* Expanded */}
            {isOpen && (
              <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">

                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                    <FileText size={10} /> {t("expanded_work_title")}
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {r.work_description || (
                      <span className="text-slate-300 italic">{t("expanded_not_provided")}</span>
                    )}
                  </p>
                </div>

                <div className="space-y-4">
                  {r.issues_description && (
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                        <AlertTriangle size={10} /> {t("expanded_issues_title")}
                      </p>
                      <p className="text-sm text-slate-700">{r.issues_description}</p>
                    </div>
                  )}
                  {r.action_taken && (
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        {t("expanded_action_title")}
                      </p>
                      <p className="text-sm text-slate-700">{r.action_taken}</p>
                    </div>
                  )}
                </div>

                {/* Meta footer */}
                <div className="col-span-1 md:col-span-2 border-t border-slate-200 pt-4 flex items-center gap-6 flex-wrap text-[10px] text-slate-400 font-bold">
                  {r.supervisor_name && (
                    <span className="flex items-center gap-1.5">
                      <User size={11} /> {r.supervisor_name}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Clock size={11} />
                    {t("meta_submitted")}{" "}
                    {new Date(r.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                  <span className={`ml-auto px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                    STATUS_CSS[r.status] ?? "bg-slate-100 text-slate-500"
                  }`}>
                    {t(statusKey)}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}