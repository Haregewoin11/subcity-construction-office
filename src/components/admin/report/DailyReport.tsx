"use client";
// src/components/admin/report/DailyReport.tsx

import React, { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Sun, Cloud, CloudRain, Wind, ShieldCheck, ShieldAlert,
  Thermometer, CheckCircle2, AlertTriangle, Loader2,
} from "lucide-react";
import { createClient } from "@/lib/actions/supabase/clients";

type Props = {
  projectId: string;
  onSuccess?: () => void;
};

// ── Enum option keys → translation key suffixes ─────────────────────────────
// Values stored in DB are English — displayed via t() map
const WEATHER_OPTIONS = ["Sunny", "Cloudy", "Rainy", "Windy", "Foggy", "Stormy"] as const;
const SHIFT_OPTIONS   = ["Full Day", "Morning", "Afternoon", "Night"] as const;
const SEVERITY_OPTIONS = ["Low", "Medium", "High", "Critical"] as const;

const WEATHER_KEY: Record<string, string> = {
  Sunny: "weather_sunny", Cloudy: "weather_cloudy", Rainy: "weather_rainy",
  Windy: "weather_windy", Foggy: "weather_foggy",  Stormy: "weather_stormy",
};
const SHIFT_KEY: Record<string, string> = {
  "Full Day": "shift_full_day", Morning: "shift_morning",
  Afternoon:  "shift_afternoon", Night: "shift_night",
};
const SEVERITY_KEY: Record<string, string> = {
  Low: "severity_low", Medium: "severity_medium",
  High: "severity_high", Critical: "severity_critical",
};
const SEVERITY_CSS: Record<string, string> = {
  Low:      "bg-emerald-100 text-emerald-700 border-emerald-300",
  Medium:   "bg-amber-100   text-amber-700   border-amber-300",
  High:     "bg-orange-100  text-orange-700  border-orange-300",
  Critical: "bg-red-100     text-red-700     border-red-300",
};

const WEATHER_ICONS: Record<string, React.ReactNode> = {
  Sunny:  <Sun size={16} className="text-amber-500" />,
  Cloudy: <Cloud size={16} className="text-slate-400" />,
  Rainy:  <CloudRain size={16} className="text-blue-500" />,
  Windy:  <Wind size={16} className="text-cyan-500" />,
};

type FormData = {
  report_date:             string;
  weather:                 string;
  temperature:             string;
  shift:                   string;
  cumulative_progress_pct: string;
  work_description:        string;
  issues_description:      string;
  issue_severity:          string;
  action_taken:            string;
  safety_compliance:       boolean;
  supervisor_name:         string;
};

export default function DailyReportForm({ projectId, onSuccess }: Props) {
  const t        = useTranslations("Admin.daily_reports");
  const supabase = useRef(createClient()).current;
  const today    = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState<FormData>({
    report_date:             today,
    weather:                 "Sunny",
    temperature:             "",
    shift:                   "Full Day",
    cumulative_progress_pct: "",
    work_description:        "",
    issues_description:      "",
    issue_severity:          "",
    action_taken:            "",
    safety_compliance:       true,
    supervisor_name:         "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const set = (key: keyof FormData, value: any) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.work_description.trim()) {
      setError(t("err_work_required")); return;
    }
    const progress = parseInt(form.cumulative_progress_pct);
    if (form.cumulative_progress_pct && (isNaN(progress) || progress < 0 || progress > 100)) {
      setError(t("err_progress_range")); return;
    }

    setSubmitting(true); setError(null);

    const { data: inserted, error: err } = await supabase
      .from("daily_reports")
      .insert({
        project_id:              projectId,
        report_date:             form.report_date,
        weather:                 form.weather || null,
        temperature:             form.temperature ? parseInt(form.temperature) : null,
        shift:                   form.shift,
        cumulative_progress_pct: form.cumulative_progress_pct ? progress : null,
        work_description:        form.work_description.trim(),
        issues_description:      form.issues_description.trim() || null,
        issue_severity:          form.issues_description.trim() && form.issue_severity
                                   ? form.issue_severity : null,
        action_taken:            form.action_taken.trim() || null,
        safety_compliance:       form.safety_compliance,
        supervisor_name:         form.supervisor_name.trim() || null,
        status:                  "Submitted",
      })
      .select("id")
      .single();

    setSubmitting(false);
    if (err) {
      setError(`${t("err_work_required").replace("Work description is", "Save")} ${err.message}`);
    } else {
      setSuccess(true);
      setTimeout(() => { onSuccess?.(); }, 1800);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (success) return (
    <div className="flex flex-col items-center justify-center py-28 gap-5">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
        <CheckCircle2 size={32} className="text-emerald-600" />
      </div>
      <p className="font-black text-slate-900 text-xl">{t("success_title")}</p>
      <p className="text-slate-400 text-sm">{t("success_body")}</p>
    </div>
  );

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/60">
        <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
          {t("header_title")}
        </h2>
        <p className="text-xs text-slate-400 mt-1 font-bold">{t("header_subtitle")}</p>
      </div>

      <div className="px-8 py-8 space-y-8">

        {/* Row 1: Date / Shift / Supervisor */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <F label={t("field_date")} required>
            <input type="date" value={form.report_date} max={today}
              onChange={e => set("report_date", e.target.value)} className={INP} />
          </F>
          <F label={t("field_shift")}>
            <select value={form.shift} onChange={e => set("shift", e.target.value)} className={INP}>
              {SHIFT_OPTIONS.map(s => (
                <option key={s} value={s}>{t(SHIFT_KEY[s])}</option>
              ))}
            </select>
          </F>
          <F label={t("field_supervisor")}>
            <input type="text" placeholder={t("placeholder_supervisor")}
              value={form.supervisor_name}
              onChange={e => set("supervisor_name", e.target.value)} className={INP} />
          </F>
        </div>

        {/* Row 2: Weather + Temperature */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <F label={t("field_weather")}>
            <div className="flex gap-2 flex-wrap">
              {WEATHER_OPTIONS.map(w => (
                <button key={w} type="button" onClick={() => set("weather", w)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                    form.weather === w
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                  }`}>
                  {WEATHER_ICONS[w] || <Cloud size={14} />}
                  {t(WEATHER_KEY[w])}
                </button>
              ))}
            </div>
          </F>
          <F label={t("field_temperature")}>
            <div className="relative">
              <Thermometer size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="number" placeholder={t("placeholder_temperature")}
                value={form.temperature}
                onChange={e => set("temperature", e.target.value)}
                className={INP + " pl-10"} min={-10} max={55} />
            </div>
          </F>
        </div>

        {/* Row 3: Progress */}
        <F label={t("field_progress")} required>
          <div className="space-y-3">
            <div className="relative">
              <input type="number" placeholder={t("placeholder_progress")}
                value={form.cumulative_progress_pct}
                onChange={e => set("cumulative_progress_pct", e.target.value)}
                className={INP + " pr-10"} min={0} max={100} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">%</span>
            </div>
            {form.cumulative_progress_pct && (
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(parseInt(form.cumulative_progress_pct) || 0, 100)}%` }} />
              </div>
            )}
          </div>
        </F>

        {/* Row 4: Work description */}
        <F label={t("field_work")} required>
          <textarea rows={4} placeholder={t("placeholder_work")}
            value={form.work_description}
            onChange={e => set("work_description", e.target.value)}
            className={INP + " resize-none"} />
        </F>

        {/* Row 5: Issues */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <F label={t("field_issues")}>
            <textarea rows={3} placeholder={t("placeholder_issues")}
              value={form.issues_description}
              onChange={e => set("issues_description", e.target.value)}
              className={INP + " resize-none"} />
          </F>
          <div className="space-y-5">
            <F label={t("field_severity")}>
              <div className="flex gap-2 flex-wrap">
                {SEVERITY_OPTIONS.map(s => {
                  const active = form.issue_severity === s;
                  return (
                    <button key={s} type="button"
                      onClick={() => set("issue_severity", active ? "" : s)}
                      disabled={!form.issues_description.trim()}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                        active ? SEVERITY_CSS[s] : "bg-white text-slate-400 border-slate-200 hover:border-slate-400"
                      }`}>
                      {t(SEVERITY_KEY[s])}
                    </button>
                  );
                })}
              </div>
            </F>
            <F label={t("field_action")}>
              <textarea rows={2} placeholder={t("placeholder_action")}
                value={form.action_taken}
                onChange={e => set("action_taken", e.target.value)}
                className={INP + " resize-none"}
                disabled={!form.issues_description.trim()} />
            </F>
          </div>
        </div>

        {/* Row 6: Safety */}
        <F label={t("field_safety")}>
          <div className="flex gap-3">
            <button type="button" onClick={() => set("safety_compliance", true)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[11px] font-black uppercase border transition-all ${
                form.safety_compliance
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-slate-400 border-slate-200 hover:border-slate-400"
              }`}>
              <ShieldCheck size={15} /> {t("btn_compliant")}
            </button>
            <button type="button" onClick={() => set("safety_compliance", false)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[11px] font-black uppercase border transition-all ${
                !form.safety_compliance
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-white text-slate-400 border-slate-200 hover:border-slate-400"
              }`}>
              <ShieldAlert size={15} /> {t("btn_non_compliant")}
            </button>
          </div>
        </F>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-bold">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button onClick={handleSubmit} disabled={submitting}
            className="flex items-center gap-2 px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            {submitting
              ? <><Loader2 size={14} className="animate-spin" /> {t("btn_submitting")}</>
              : t("btn_submit")}
          </button>
        </div>
      </div>
    </div>
  );
}

const INP = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 focus:bg-white transition-all";

function F({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
        {label}{required && <span className="text-orange-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}