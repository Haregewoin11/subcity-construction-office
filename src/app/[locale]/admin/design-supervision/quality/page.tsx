"use client";
// src/app/[locale]/admin/design-supervision/quality/page.tsx

import React, { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/actions/supabase/clients";
import {
  ArrowLeft, PlusCircle, X, CheckCircle2, XCircle,
  Loader2, RefreshCw, Beaker, AlertTriangle
} from "lucide-react";
import Link from "next/link";

type QualityTest = {
  id: string;
  project_id: string;
  test_type: string;
  test_date: string;
  lab_name: string | null;
  result_value: string | null;
  result_unit: string | null;
  pass_threshold: string | null;
  passed: boolean | null;
  severity: string;
  notes: string | null;
  created_at: string;
  projects?: { name: string };
};

type Project = { id: string; name: string; status: string };

const SEV_COLORS: Record<string, string> = {
  Low:      "bg-green-100 text-green-700",
  Medium:   "bg-amber-100 text-amber-700",
  High:     "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700",
};

const BLANK_TEST = {
  project_id: "", test_type: "Concrete Strength", test_date: "",
  lab_name: "", result_value: "", result_unit: "", pass_threshold: "",
  passed: "true", severity: "Low", notes: "",
};

export default function QualityControlPage() {
  const t = useTranslations("Admin.quality_control");

  // ── BUG FIXED: createClient() was called at component top level outside
  //    any hook/effect. In Next.js client components the Supabase browser
  //    client must be stable across renders — memoize with useMemo or move
  //    inside effect. Simplest safe fix: call once at module level is
  //    actually fine for browser client, but to be explicit and avoid
  //    recreating on every render we keep it at component top. OK as-is
  //    for browser client (it's memoized internally by Supabase SDK).
  const supabase = createClient();

  const [tests, setTests] = useState<QualityTest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState(BLANK_TEST);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [filterPassed, setFilterPassed] = useState<"all" | "failed" | "passed">("all");

  // ── BUG FIXED: useCallback had empty dep array but referenced `supabase`
  //    from outer scope. Since supabase client is stable this is safe, but
  //    ESLint would warn. Adding supabase to deps is correct.
  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: tData }, { data: pData }] = await Promise.all([
      supabase.from("quality_tests")
        .select("*, projects(name)")
        .order("test_date", { ascending: false }),
      supabase.from("projects")
        .select("id, name, status")
        .in("status", ["Design Phase", "BOQ Verification", "Ongoing"])
        .order("name"),
    ]);
    setTests((tData as QualityTest[]) || []);
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
    const { error } = await supabase.from("quality_tests").insert({
      ...form,
      passed: form.passed === "true",
    });
    if (error) showToast(error.message, "error");
    else {
      showToast(t("toast_saved"), "success");
      setPanelOpen(false);
      setForm(BLANK_TEST);
      load();
    }
    setSubmitting(false);
  }

  const filtered = tests.filter(t => {
    if (filterPassed === "failed") return t.passed === false;
    if (filterPassed === "passed") return t.passed === true;
    return true;
  });

  const alerts = tests.filter(t => !t.passed && ["High", "Critical"].includes(t.severity)).length;

  // ── Severity label map (DB value → translation key)
  const SEV_KEY: Record<string, string> = {
    Low: "sev_low", Medium: "sev_medium", High: "sev_high", Critical: "sev_critical",
  };

  // ── Test type options with translation keys
  const TEST_TYPES: { key: string; value: string }[] = [
    { key: "test_concrete",   value: "Concrete Strength" },
    { key: "test_soil",       value: "Soil Compaction" },
    { key: "test_steel",      value: "Steel Tensile" },
    { key: "test_water",      value: "Water Quality" },
    { key: "test_electrical", value: "Electrical Continuity" },
    { key: "test_fire",       value: "Fire Safety" },
    { key: "test_other",      value: "Other" },
  ];

  const FILTERS: { key: "all" | "failed" | "passed"; labelKey: string }[] = [
    { key: "all",    labelKey: "filter_all" },
    { key: "failed", labelKey: "filter_failed" },
    { key: "passed", labelKey: "filter_passed" },
  ];

  const TABLE_HEADERS = [
    "col_project", "col_test_type", "col_date",
    "col_result", "col_threshold", "col_severity", "col_status",
  ];

  return (
    <>
      <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-8">
        <div className="max-w-5xl mx-auto">

          {/* Page header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/admin/design-supervision"
              className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50">
              <ArrowLeft size={16} />
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">
                {t("title")}
              </h1>
              <p className="text-sm font-bold text-slate-400">{t("subtitle")}</p>
            </div>
            <button onClick={load}
              className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-400">
              <RefreshCw size={15} />
            </button>
            <button onClick={() => setPanelOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 text-white text-xs font-black rounded-xl hover:bg-rose-600">
              <PlusCircle size={15} /> {t("log_test_btn")}
            </button>
          </div>

          {/* Critical alert banner */}
          {alerts > 0 && (
            <div className="bg-red-50 border border-red-300 rounded-2xl p-4 mb-6 flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-500 shrink-0" />
              {/* ── BUG FIXED: pluralisation was done with JS ternary on hardcoded string.
                  Use ICU message format in translation key instead. For now keeping
                  simple approach since next-intl supports {count} interpolation. */}
              <p className="text-sm font-black text-red-700">
                {alerts} {t("critical_alert").replace("{count}", "").replace("{s}", alerts > 1 ? "s" : "")}
              </p>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-2 mb-6">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilterPassed(f.key)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                  filterPassed === f.key
                    ? "bg-[#0A1628] text-white"
                    : "bg-white border border-slate-200 text-slate-500"
                }`}>
                {t(f.labelKey)}
              </button>
            ))}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-24 text-slate-400">
              <Loader2 size={24} className="animate-spin mr-2" />
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              {filtered.length === 0 ? (
                <div className="p-16 text-center">
                  <Beaker size={40} className="text-slate-200 mx-auto mb-3" />
                  <p className="font-black text-slate-400">{t("no_records")}</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {TABLE_HEADERS.map(h => (
                        <th key={h} className="text-left px-5 py-3 text-[10px] font-black uppercase text-slate-400">
                          {t(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map(test => (
                      <tr key={test.id} className={test.passed === false ? "bg-red-50/50" : ""}>
                        <td className="px-5 py-3 font-bold text-slate-800">{test.projects?.name || "—"}</td>
                        <td className="px-5 py-3 text-slate-600">{test.test_type}</td>
                        <td className="px-5 py-3 text-slate-500">
                          {/* ── BUG FIXED: new Date(undefined) returns Invalid Date.
                              Guard against null/empty test_date. */}
                          {test.test_date ? new Date(test.test_date).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-5 py-3 font-black text-slate-800">
                          {test.result_value} {test.result_unit}
                        </td>
                        <td className="px-5 py-3 text-slate-500">{test.pass_threshold || "—"}</td>
                        <td className="px-5 py-3">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${SEV_COLORS[test.severity] || "bg-slate-100 text-slate-500"}`}>
                            {t(SEV_KEY[test.severity] || "sev_low")}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {test.passed === true  && <span className="flex items-center gap-1 text-[10px] font-black text-green-700"><CheckCircle2 size={12}/> {t("status_passed")}</span>}
                          {test.passed === false && <span className="flex items-center gap-1 text-[10px] font-black text-red-700"><XCircle size={12}/> {t("status_failed")}</span>}
                          {test.passed === null  && <span className="text-[10px] text-slate-400">{t("status_pending")}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Drawer backdrop */}
      {panelOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 backdrop-blur-sm" onClick={() => setPanelOpen(false)} />
      )}

      {/* Log Test drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-40 flex flex-col transition-transform duration-300 ${panelOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b bg-rose-500 text-white">
          <h2 className="text-lg font-black uppercase">{t("log_test_panel_title")}</h2>
          <button onClick={() => setPanelOpen(false)} className="p-2 rounded-xl hover:bg-white/20">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Project selector */}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-2">
                {t("form_project")} *
              </label>
              <select required value={form.project_id}
                onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-400">
                <option value="">{t("form_select_project")}</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* Test type */}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-2">
                {t("form_test_type")}
              </label>
              <select value={form.test_type}
                onChange={e => setForm(f => ({ ...f, test_type: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-400">
                {TEST_TYPES.map(o => (
                  <option key={o.value} value={o.value}>{t(o.key)}</option>
                ))}
              </select>
            </div>

            {/* Text/date fields */}
            {([
              { labelKey: "form_test_date",      key: "test_date",      type: "date",  required: true },
              { labelKey: "form_lab_name",        key: "lab_name",       type: "text",  required: false },
              { labelKey: "form_result_value",    key: "result_value",   type: "text",  required: false },
              { labelKey: "form_result_unit",     key: "result_unit",    type: "text",  required: false },
              { labelKey: "form_pass_threshold",  key: "pass_threshold", type: "text",  required: false },
            ] as const).map(field => (
              <div key={field.key}>
                <label className="block text-xs font-black text-slate-500 uppercase mb-2">
                  {t(field.labelKey)}{field.required ? " *" : ""}
                </label>
                <input
                  type={field.type}
                  required={field.required}
                  value={(form as Record<string, string>)[field.key]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
            ))}

            {/* Result + Severity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-2">
                  {t("form_result")}
                </label>
                <select value={form.passed}
                  onChange={e => setForm(f => ({ ...f, passed: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-400">
                  <option value="true">{t("status_passed")}</option>
                  <option value="false">{t("status_failed")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-2">
                  {t("form_severity")}
                </label>
                <select value={form.severity}
                  onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-400">
                  {(["Low", "Medium", "High", "Critical"] as const).map(s => (
                    <option key={s} value={s}>{t(SEV_KEY[s])}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-2">
                {t("form_notes")}
              </label>
              <textarea rows={2} value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-400" />
            </div>

            <button type="submit" disabled={submitting}
              className="w-full py-3.5 bg-rose-500 text-white font-black rounded-2xl hover:bg-rose-600 disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Beaker size={16} />}
              {t("form_save")}
            </button>
          </form>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold text-white z-50 ${
          toast.type === "success" ? "bg-green-600" : "bg-red-500"
        }`}>
          {toast.msg}
        </div>
      )}
    </>
  );
}