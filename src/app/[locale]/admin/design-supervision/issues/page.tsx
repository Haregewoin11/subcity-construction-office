"use client";
// src/app/[locale]/admin/design-supervision/issues/page.tsx
// ── BUG FIXED: removed <AdminShell> wrapper — shell is provided by admin/layout.tsx

import React, { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/actions/supabase/clients";
import {
  ArrowLeft, PlusCircle, X, CheckCircle2, Loader2,
  RefreshCw, ShieldAlert, AlertTriangle
} from "lucide-react";
import Link from "next/link";

type Issue = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  severity: string;
  category: string;
  status: string;
  raised_by: string | null;
  assigned_to: string | null;
  due_date: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  projects?: { name: string };
};

type Project = { id: string; name: string; status: string };

const SEV_COLORS: Record<string, string> = {
  Low:      "bg-green-100 text-green-700",
  Medium:   "bg-amber-100 text-amber-700",
  High:     "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700 border border-red-300",
};

const STATUS_COLORS: Record<string, string> = {
  Open:          "bg-red-100 text-red-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Resolved:      "bg-green-100 text-green-700",
  Closed:        "bg-slate-100 text-slate-500",
  Escalated:     "bg-purple-100 text-purple-700",
};

// DB value → translation key maps
const SEV_KEY: Record<string, string> = {
  Low: "sev_low", Medium: "sev_medium", High: "sev_high", Critical: "sev_critical",
};
const STATUS_KEY: Record<string, string> = {
  Open: "status_open", "In Progress": "status_in_progress",
  Resolved: "status_resolved", Closed: "status_closed", Escalated: "status_escalated",
};
const CAT_KEY: Record<string, string> = {
  Structural: "cat_structural", Electrical: "cat_electrical", Sanitary: "cat_sanitary",
  Safety: "cat_safety", Material: "cat_material", Design: "cat_design", Other: "cat_other",
};

const BLANK = {
  project_id: "", title: "", description: "", severity: "Medium",
  category: "Other", raised_by: "", assigned_to: "", due_date: "",
};

export default function IssueTrackingPage() {
  const t = useTranslations("Admin.issue_tracking");
  const supabase = createClient();

  const [issues,           setIssues]           = useState<Issue[]>([]);
  const [projects,         setProjects]         = useState<Project[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [panelOpen,        setPanelOpen]        = useState(false);
  const [form,             setForm]             = useState(BLANK);
  const [submitting,       setSubmitting]       = useState(false);
  const [processing,       setProcessing]       = useState<string | null>(null);
  const [resolutionNotes,  setResolutionNotes]  = useState<Record<string, string>>({});
  const [toast,            setToast]            = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [filterStatus,     setFilterStatus]     = useState("Open");
  const [expandedId,       setExpandedId]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: iData }, { data: pData }] = await Promise.all([
      supabase.from("project_issues")
        .select("*, projects(name)")
        .order("created_at", { ascending: false }),
      supabase.from("projects")
        .select("id, name, status")
        .in("status", ["Design Phase","BOQ Verification","Ongoing"])
        .order("name"),
    ]);
    setIssues((iData as Issue[]) || []);
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
    const { error } = await supabase.from("project_issues").insert({ ...form, status: "Open" });
    if (error) showToast(error.message, "error");
    else {
      showToast(t("toast_logged"), "success");
      setPanelOpen(false);
      setForm(BLANK);
      load();
    }
    setSubmitting(false);
  }

  async function handleResolve(issue: Issue) {
    setProcessing(issue.id);
    const { error } = await supabase.from("project_issues").update({
      status:           "Resolved",
      resolved_at:      new Date().toISOString(),
      resolution_notes: resolutionNotes[issue.id] || "",
    }).eq("id", issue.id);
    if (error) showToast(error.message, "error");
    else { showToast(t("toast_resolved"), "success"); load(); }
    setProcessing(null);
  }

  async function handleEscalate(issueId: string) {
    setProcessing(issueId);
    const { error } = await supabase.from("project_issues")
      .update({ status: "Escalated" }).eq("id", issueId);
    if (error) showToast(error.message, "error");
    else { showToast(t("toast_escalated"), "success"); load(); }
    setProcessing(null);
  }

  const FILTER_STATUSES = ["Open","In Progress","Resolved","Escalated","Closed","All"];
  const SEVERITIES      = ["Low","Medium","High","Critical"];
  const CATEGORIES      = ["Structural","Electrical","Sanitary","Safety","Material","Design","Other"];

  const filtered      = filterStatus === "All" ? issues : issues.filter(i => i.status === filterStatus);
  const criticalOpen  = issues.filter(i => i.severity === "Critical" && i.status === "Open").length;

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
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white text-xs font-black rounded-xl hover:bg-orange-700">
              <PlusCircle size={15} /> {t("btn_log")}
            </button>
          </div>

          {/* Critical banner */}
          {criticalOpen > 0 && (
            <div className="bg-red-50 border border-red-300 rounded-2xl p-4 mb-6 flex gap-3">
              <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-black text-red-700">
                {(criticalOpen > 1 ? t("critical_banner_plural") : t("critical_banner"))
                  .replace("{n}", String(criticalOpen))}
              </p>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {FILTER_STATUSES.map(f => (
              <button key={f} onClick={() => setFilterStatus(f)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                  filterStatus === f ? "bg-[#0A1628] text-white" : "bg-white border border-slate-200 text-slate-500"
                }`}>
                {/* ── BUG FIXED: "All" had no count badge — consistent with other filters */}
                {f === "All" ? t("filter_all") : `${t(STATUS_KEY[f] || "status_open")} (${issues.filter(i => i.status === f).length})`}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-slate-400">
              <Loader2 size={24} className="animate-spin mr-2" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-[2rem] border border-slate-200 p-16 text-center">
              <ShieldAlert size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="font-black text-slate-400">{t("no_issues")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(issue => (
                <div key={issue.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                  issue.severity === "Critical" && issue.status === "Open" ? "border-red-300" : "border-slate-200"
                }`}>
                  <div className="p-5 flex items-start gap-4 cursor-pointer hover:bg-slate-50"
                    onClick={() => setExpandedId(expandedId === issue.id ? null : issue.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${SEV_COLORS[issue.severity] || "bg-slate-100 text-slate-500"}`}>
                          {t(SEV_KEY[issue.severity] || "sev_medium")}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${STATUS_COLORS[issue.status] || "bg-slate-100 text-slate-500"}`}>
                          {t(STATUS_KEY[issue.status] || "status_open")}
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {t(CAT_KEY[issue.category] || "cat_other")}
                        </span>
                      </div>
                      <p className="font-black text-slate-900">{issue.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {issue.projects?.name || "—"}
                        {issue.assigned_to ? ` · ${t("assigned_label")}: ${issue.assigned_to}` : ""}
                        {/* ── BUG FIXED: null check on due_date */}
                        {issue.due_date ? ` · ${t("due_label")}: ${new Date(issue.due_date).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                  </div>

                  {expandedId === issue.id && (
                    <div className="border-t border-slate-100 bg-slate-50 p-5 space-y-4">
                      {issue.description && (
                        <p className="text-sm text-slate-700">{issue.description}</p>
                      )}
                      {issue.resolution_notes && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
                          <strong>{t("resolution_label")}:</strong> {issue.resolution_notes}
                        </div>
                      )}
                      {(issue.status === "Open" || issue.status === "In Progress") && (
                        <div className="space-y-3">
                          <textarea rows={2} placeholder={t("resolution_placeholder")}
                            value={resolutionNotes[issue.id] || ""}
                            onChange={e => setResolutionNotes(n => ({ ...n, [issue.id]: e.target.value }))}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleResolve(issue)} disabled={processing === issue.id}
                              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-xs font-black rounded-xl hover:bg-green-700 disabled:opacity-50">
                              {processing === issue.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                              {t("btn_resolve")}
                            </button>
                            {issue.severity !== "Critical" && (
                              <button onClick={() => handleEscalate(issue.id)} disabled={processing === issue.id}
                                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-xs font-black rounded-xl hover:bg-purple-700 disabled:opacity-50">
                                <AlertTriangle size={11} /> {t("btn_escalate")}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Log Issue panel */}
      {panelOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 backdrop-blur-sm" onClick={() => setPanelOpen(false)} />
      )}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-40 flex flex-col transition-transform duration-300 ${panelOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b bg-orange-600 text-white">
          <h2 className="text-lg font-black uppercase">{t("panel_title")}</h2>
          <button onClick={() => setPanelOpen(false)} className="p-2 rounded-xl hover:bg-white/20">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-2">{t("form_project")} *</label>
              <select required value={form.project_id}
                onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">{t("form_select_project")}</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-2">{t("form_issue_title")} *</label>
              <input required value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder={t("form_title_placeholder")}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-2">{t("form_description")}</label>
              <textarea rows={3} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-2">{t("form_severity")}</label>
                <select value={form.severity}
                  onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400">
                  {SEVERITIES.map(s => (
                    <option key={s} value={s}>{t(SEV_KEY[s])}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-2">{t("form_category")}</label>
                <select value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400">
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{t(CAT_KEY[c])}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-2">{t("form_raised_by")}</label>
                <input value={form.raised_by}
                  onChange={e => setForm(f => ({ ...f, raised_by: e.target.value }))}
                  placeholder={t("form_raised_placeholder")}
                  className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-2">{t("form_assigned_to")}</label>
                <input value={form.assigned_to}
                  onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                  placeholder={t("form_assigned_placeholder")}
                  className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-2">{t("form_due_date")}</label>
              <input type="date" value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full py-3.5 bg-orange-600 text-white font-black rounded-2xl hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={16} />}
              {t("form_submit")}
            </button>
          </form>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold text-white z-50 ${
          toast.type === "success" ? "bg-green-600" : "bg-red-500"
        }`}>{toast.msg}</div>
      )}
    </>
  );
}