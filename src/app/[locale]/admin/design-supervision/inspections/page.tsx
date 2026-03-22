"use client";
// src/app/[locale]/admin/design-supervision/inspections/page.tsx

import React, { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/actions/supabase/clients";
import {
  ArrowLeft, PlusCircle, X, CheckCircle2, XCircle,
  Loader2, RefreshCw, Calendar, ClipboardCheck
} from "lucide-react";
import Link from "next/link";

type Inspection = {
  id: string;
  project_id: string;
  inspector_name: string;
  inspection_date: string;
  inspection_type: string;
  status: string;
  findings: string | null;
  recommendations: string | null;
  passed: boolean | null;
  created_at: string;
  projects?: { name: string; location: string };
};

type Project = { id: string; name: string; location: string; status: string };

const TYPE_COLORS: Record<string, string> = {
  Routine:    "bg-blue-50 text-blue-700",
  Structural: "bg-purple-50 text-purple-700",
  Electrical: "bg-amber-50 text-amber-700",
  Sanitary:   "bg-cyan-50 text-cyan-700",
  Final:      "bg-emerald-50 text-emerald-700",
  Safety:     "bg-rose-50 text-rose-700",
};

const STATUS_COLORS: Record<string, string> = {
  Scheduled:    "bg-amber-100 text-amber-700",
  "In Progress":"bg-blue-100 text-blue-700",
  Completed:    "bg-green-100 text-green-700",
  Failed:       "bg-red-100 text-red-700",
};

// DB value → translation key
const TYPE_KEY: Record<string, string> = {
  Routine: "type_routine", Structural: "type_structural",
  Electrical: "type_electrical", Sanitary: "type_sanitary",
  Final: "type_final", Safety: "type_safety",
};

const BLANK = {
  project_id: "", inspector_name: "", inspection_date: "",
  inspection_type: "Routine", findings: "", recommendations: "",
};

export default function InspectionsPage() {
  const t = useTranslations("Admin.inspections");
  const supabase = createClient();

  const [inspections,     setInspections]     = useState<Inspection[]>([]);
  const [projects,        setProjects]        = useState<Project[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [panelOpen,       setPanelOpen]       = useState(false);
  const [form,            setForm]            = useState(BLANK);
  const [submitting,      setSubmitting]      = useState(false);
  const [processing,      setProcessing]      = useState<string | null>(null);
  const [toast,           setToast]           = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [filterStatus,    setFilterStatus]    = useState("All");
  const [expandedId,      setExpandedId]      = useState<string | null>(null);
  const [completionData,  setCompletionData]  = useState<Record<string, { findings: string; recommendations: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: iData }, { data: pData }] = await Promise.all([
      supabase.from("site_inspections")
        .select("*, projects(name, location)")
        .order("inspection_date", { ascending: false }),
      supabase.from("projects")
        .select("id, name, location, status")
        .in("status", ["Design Phase","BOQ Verification","Ongoing"])
        .order("name"),
    ]);
    setInspections((iData as Inspection[]) || []);
    setProjects((pData as Project[]) || []);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("site_inspections").insert({
      project_id:      form.project_id,
      inspector_name:  form.inspector_name,
      inspection_date: form.inspection_date,
      inspection_type: form.inspection_type,
      status: "Scheduled",
    });
    if (error) showToast(error.message, "error");
    else {
      showToast(t("toast_scheduled"), "success");
      setPanelOpen(false);
      setForm(BLANK);
      load();
    }
    setSubmitting(false);
  }

  async function handleComplete(insp: Inspection, passed: boolean, findings: string, recommendations: string) {
    setProcessing(insp.id);
    const { error } = await supabase.from("site_inspections").update({
      status: passed ? "Completed" : "Failed",
      passed,
      findings,
      recommendations,
    }).eq("id", insp.id);
    if (error) showToast(error.message, "error");
    else {
      showToast(passed ? t("toast_passed") : t("toast_failed_log"), "success");
      load();
    }
    setProcessing(null);
  }

  const FILTER_KEYS = [
    { val: "All",          labelKey: "filter_all"         },
    { val: "Scheduled",    labelKey: "filter_scheduled"   },
    { val: "In Progress",  labelKey: "filter_in_progress" },
    { val: "Completed",    labelKey: "filter_completed"   },
    { val: "Failed",       labelKey: "filter_failed"      },
  ];

  const INSPECTION_TYPES = [
    "Routine","Structural","Electrical","Sanitary","Final","Safety",
  ];

  const filtered = filterStatus === "All"
    ? inspections
    : inspections.filter(i => i.status === filterStatus);

  const scheduled = inspections.filter(i => i.status === "Scheduled").length;
  const completed  = inspections.filter(i => i.status === "Completed").length;
  const failed     = inspections.filter(i => i.status === "Failed").length;

  return (
    <>
      <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-8">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/admin/design-supervision"
              className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50">
              <ArrowLeft size={16} />
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">{t("title")}</h1>
              <p className="text-sm font-bold text-slate-400">{t("subtitle")}</p>
            </div>
            <button onClick={load}
              className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-400">
              <RefreshCw size={15} />
            </button>
            <button onClick={() => setPanelOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white text-xs font-black rounded-xl hover:bg-amber-600">
              <PlusCircle size={15} /> {t("btn_schedule")}
            </button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { labelKey: "stat_scheduled", val: scheduled, cls: "bg-amber-50 text-amber-700 border-amber-200" },
              { labelKey: "stat_completed", val: completed, cls: "bg-green-50 text-green-700 border-green-200" },
              { labelKey: "stat_failed",    val: failed,    cls: "bg-red-50 text-red-700 border-red-200"       },
            ].map(s => (
              <div key={s.labelKey} className={`rounded-2xl border p-5 ${s.cls}`}>
                <p className="text-2xl font-black">{s.val}</p>
                <p className="text-[10px] font-black uppercase tracking-widest mt-1">{t(s.labelKey)}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {FILTER_KEYS.map(f => (
              <button key={f.val} onClick={() => setFilterStatus(f.val)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  filterStatus === f.val ? "bg-[#0A1628] text-white" : "bg-white border border-slate-200 text-slate-500"
                }`}>
                {t(f.labelKey)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-slate-400">
              <Loader2 size={24} className="animate-spin mr-2" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-[2rem] border border-slate-200 p-16 text-center">
              <ClipboardCheck size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="font-black text-slate-400">{t("no_inspections")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(insp => {
                const cd     = completionData[insp.id] || { findings: "", recommendations: "" };
                const isOpen = expandedId === insp.id;
                return (
                  <div key={insp.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 flex items-center gap-4 cursor-pointer hover:bg-slate-50"
                      onClick={() => setExpandedId(isOpen ? null : insp.id)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${STATUS_COLORS[insp.status] || "bg-slate-100 text-slate-500"}`}>
                            {insp.status}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${TYPE_COLORS[insp.inspection_type] || "bg-slate-100 text-slate-500"}`}>
                            {t(TYPE_KEY[insp.inspection_type] || "type_routine")}
                          </span>
                          {insp.passed === false && insp.status === "Failed" && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                              {t("status_failed_badge")}
                            </span>
                          )}
                        </div>
                        <p className="font-black text-slate-900">{insp.projects?.name || "—"}</p>
                        <p className="text-xs text-slate-400">
                          {t("inspector_label")}: {insp.inspector_name} ·{" "}
                          {/* ── BUG FIXED: guard against invalid date */}
                          {insp.inspection_date ? new Date(insp.inspection_date).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "—"}
                          {insp.projects?.location ? ` · ${insp.projects.location}` : ""}
                        </p>
                      </div>
                      <Calendar size={16} className="text-slate-300 shrink-0" />
                    </div>

                    {isOpen && (
                      <div className="border-t border-slate-100 p-5 bg-slate-50 space-y-4">
                        {insp.findings && (
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{t("findings_label")}</p>
                            <p className="text-sm text-slate-700">{insp.findings}</p>
                          </div>
                        )}
                        {insp.recommendations && (
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{t("recommendations_label")}</p>
                            <p className="text-sm text-slate-700">{insp.recommendations}</p>
                          </div>
                        )}

                        {(insp.status === "Scheduled" || insp.status === "In Progress") && (
                          <div className="space-y-3 pt-2">
                            <p className="text-[10px] font-black uppercase text-slate-400">{t("record_outcome")}</p>
                            <textarea rows={2} placeholder={t("findings_placeholder")}
                              value={cd.findings}
                              onChange={e => setCompletionData(d => ({ ...d, [insp.id]: { ...d[insp.id], findings: e.target.value } }))}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                            <textarea rows={2} placeholder={t("recommendations_placeholder")}
                              value={cd.recommendations}
                              onChange={e => setCompletionData(d => ({ ...d, [insp.id]: { ...d[insp.id], recommendations: e.target.value } }))}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                            <div className="flex gap-3">
                              <button onClick={() => handleComplete(insp, true, cd.findings, cd.recommendations)}
                                disabled={processing === insp.id}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-black rounded-xl hover:bg-green-700 disabled:opacity-50">
                                {processing === insp.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                {t("btn_mark_passed")}
                              </button>
                              <button onClick={() => handleComplete(insp, false, cd.findings, cd.recommendations)}
                                disabled={processing === insp.id}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-xs font-black rounded-xl hover:bg-red-600 disabled:opacity-50">
                                <XCircle size={12} /> {t("btn_mark_failed")}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Panel */}
      {panelOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 backdrop-blur-sm" onClick={() => setPanelOpen(false)} />
      )}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-40 flex flex-col transition-transform duration-300 ${panelOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b bg-amber-500 text-white">
          <h2 className="text-lg font-black uppercase">{t("panel_title")}</h2>
          <button onClick={() => setPanelOpen(false)} className="p-2 rounded-xl hover:bg-white/20">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-2">{t("form_project")} *</label>
              <select required value={form.project_id}
                onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400">
                <option value="">{t("form_select_project")}</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.status})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-2">{t("form_inspector_name")} *</label>
              <input required value={form.inspector_name}
                onChange={e => setForm(f => ({ ...f, inspector_name: e.target.value }))}
                placeholder={t("form_inspector_placeholder")}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-2">{t("form_date")} *</label>
              <input required type="date" value={form.inspection_date}
                onChange={e => setForm(f => ({ ...f, inspection_date: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-2">{t("form_type")}</label>
              <select value={form.inspection_type}
                onChange={e => setForm(f => ({ ...f, inspection_type: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400">
                {INSPECTION_TYPES.map(type => (
                  <option key={type} value={type}>{t(TYPE_KEY[type])}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={submitting}
              className="w-full py-3.5 bg-amber-500 text-white font-black rounded-2xl hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
              {t("form_submit")}
            </button>
          </form>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold text-white z-50 max-w-md ${
          toast.type === "success" ? "bg-green-600" : "bg-red-500"
        }`}>{toast.msg}</div>
      )}
    </>
  );
}