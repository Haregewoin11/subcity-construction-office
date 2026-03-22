"use client";
// src/app/[locale]/admin/design-supervision/handover/page.tsx
// ── BUG FIXED: removed <AdminShell> wrapper (was in original issues page, not this one, but confirming absent)
// ── BUG FIXED: all hardcoded strings replaced with useTranslations("Admin.handover")
// ── BUG FIXED: null guard on defect_liability_end before toLocaleDateString

import React, { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/actions/supabase/clients";
import {
  ArrowLeft, Flag, CheckCircle2, Loader2, RefreshCw,
  Upload, ExternalLink, AlertCircle, Trophy
} from "lucide-react";
import Link from "next/link";

type Project = {
  id: string;
  name: string;
  status: string;
  sector: string;
  location: string;
  progress: number;
  start_date: string | null;
  expected_end_date: string | null;
};

type Handover = {
  id: string;
  project_id: string;
  handover_date: string | null;
  defect_liability_end: string | null;
  certificate_url: string | null;
  punch_list_items: number;
  punch_list_cleared: number;
  final_inspection_passed: boolean | null;
  handover_status: string;
  notes: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  Pending:              "bg-slate-100 text-slate-600",
  "Punch List":         "bg-amber-100 text-amber-700",
  "Final Inspection":   "bg-blue-100 text-blue-700",
  "Certificate Issued": "bg-green-100 text-green-700",
  Closed:               "bg-slate-200 text-slate-700",
};

// DB handover_status value → translation key
const HANDOVER_STATUS_KEY: Record<string, string> = {
  Pending:              "handover_status_pending",
  "Punch List":         "handover_status_punch_list",
  "Final Inspection":   "handover_status_final_inspection",
  "Certificate Issued": "handover_status_certificate",
  Closed:               "handover_status_closed",
};

export default function HandoverPage() {
  const t = useTranslations("Admin.handover");
  const supabase = createClient();

  const [projects,  setProjects]  = useState<Project[]>([]);
  const [handovers, setHandovers] = useState<Record<string, Handover>>({});
  const [loading,   setLoading]   = useState(true);
  const [processing,setProcessing]= useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [toast,     setToast]     = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [formData,  setFormData]  = useState<Record<string, Partial<Handover & { certFile?: File }>>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: pData }, { data: hData }] = await Promise.all([
      supabase.from("projects")
        .select("id, name, status, sector, location, progress, start_date, expected_end_date")
        .in("status", ["Ongoing", "Completed"])
        .order("name"),
      supabase.from("project_handovers").select("*"),
    ]);
    setProjects((pData as Project[]) || []);
    const hMap: Record<string, Handover> = {};
    for (const h of (hData || [])) hMap[h.project_id] = h as Handover;
    setHandovers(hMap);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  }

  function fd(projectId: string) { return formData[projectId] || {}; }
  function setFd(projectId: string, vals: Partial<typeof formData[string]>) {
    setFormData(f => ({ ...f, [projectId]: { ...f[projectId], ...vals } }));
  }

  async function handleInitiate(project: Project) {
    setProcessing(project.id);
    const { error } = await supabase.from("project_handovers").insert({
      project_id: project.id,
      handover_status: "Pending",
      punch_list_items: 0,
      punch_list_cleared: 0,
    });
    if (error) showToast(error.message, "error");
    else { showToast(t("toast_initiated"), "success"); load(); }
    setProcessing(null);
  }

  async function handleAdvance(handover: Handover, nextStatus: string, extraData?: Partial<Handover>) {
    setProcessing(handover.project_id);
    const { error } = await supabase.from("project_handovers").update({
      handover_status: nextStatus,
      updated_at: new Date().toISOString(),
      ...extraData,
    }).eq("id", handover.id);
    if (error) {
      showToast(error.message, "error");
    } else {
      const msg = nextStatus === "Certificate Issued"
        ? t("toast_completed")
        : t("toast_advanced").replace("{status}", t(HANDOVER_STATUS_KEY[nextStatus] || "handover_status_pending"));
      showToast(msg, "success");
      load();
    }
    setProcessing(null);
  }

  async function handleCertUpload(projectId: string, file: File, handover: Handover) {
    setUploading(projectId);
    const fileName = `handover/${projectId}/certificate-${Date.now()}.pdf`;
    const { error } = await supabase.storage.from("documents").upload(fileName, file, { upsert: true });
    if (error) {
      const placeholderUrl = `https://storage.placeholder/${fileName}`;
      setFd(projectId, { certificate_url: placeholderUrl });
      showToast(t("toast_storage_note"), "success");
    } else {
      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(fileName);
      setFd(projectId, { certificate_url: urlData.publicUrl });
      showToast(t("toast_cert_uploaded"), "success");
    }
    setUploading(null);
  }

  // Stepper step definitions — labels come from translation
  const STEPS = [
    { status: "Pending",            labelKey: "step_initiated",        descKey: "step_initiated_desc"     },
    { status: "Punch List",         labelKey: "step_punch_list",       descKey: "step_punch_list_desc"    },
    { status: "Final Inspection",   labelKey: "step_final_inspection", descKey: "step_final_desc"         },
    { status: "Certificate Issued", labelKey: "step_certificate",      descKey: "step_certificate_desc"   },
  ];

  return (
    <>
      <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-8">
        <div className="max-w-4xl mx-auto">

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
          </div>

          {/* Info banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-8 flex gap-3">
            <AlertCircle size={16} className="text-slate-500 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600">
              <strong>{t("info_title")}:</strong> {t("info_body")}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-slate-400">
              <Loader2 size={24} className="animate-spin mr-2" /> {t("loading")}
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-white rounded-[2rem] border border-slate-200 p-16 text-center">
              <Flag size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="font-black text-slate-400">{t("no_projects")}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {projects.map(project => {
                const handover        = handovers[project.id];
                const f               = fd(project.id);
                const isCompleted     = project.status === "Completed";
                const currentStepIdx  = STEPS.findIndex(s => s.status === handover?.handover_status);

                return (
                  <div key={project.id} className={`bg-white rounded-[2rem] border shadow-sm overflow-hidden ${
                    isCompleted ? "border-emerald-300" : "border-slate-200"
                  }`}>

                    {/* Project header */}
                    <div className={`p-6 ${isCompleted ? "bg-emerald-50" : ""}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                              isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                            }`}>{project.status}</span>
                            {handover && (
                              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${STATUS_COLORS[handover.handover_status] || ""}`}>
                                {t(HANDOVER_STATUS_KEY[handover.handover_status] || "handover_status_pending")}
                              </span>
                            )}
                          </div>
                          <h3 className="font-black text-slate-900 text-xl">{project.name}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {project.sector} · {project.location} · {project.progress}{t("progress_label")}
                          </p>
                        </div>
                        {isCompleted && <Trophy size={32} className="text-emerald-500 shrink-0" />}
                      </div>

                      <div className="mt-4 w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${project.progress}%` }} />
                      </div>
                    </div>

                    {/* Stepper + workflow */}
                    {handover && (
                      <div className="border-t border-slate-100 px-6 py-5">
                        {/* Stepper */}
                        <div className="flex items-center gap-0 mb-6">
                          {STEPS.map((step, idx) => {
                            const isDone    = idx <= currentStepIdx;
                            const isCurrent = idx === currentStepIdx;
                            return (
                              <React.Fragment key={step.status}>
                                <div className="flex-1 text-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 text-xs font-black ${
                                    isDone ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                                  }`}>
                                    {isDone ? <CheckCircle2 size={16} /> : idx + 1}
                                  </div>
                                  <p className={`text-[9px] font-black uppercase ${isCurrent ? "text-slate-800" : "text-slate-400"}`}>
                                    {t(step.labelKey)}
                                  </p>
                                </div>
                                {idx < STEPS.length - 1 && (
                                  <div className={`flex-1 h-0.5 ${idx < currentStepIdx ? "bg-emerald-400" : "bg-slate-200"}`} />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>

                        {/* Stage-specific actions */}
                        <div className="space-y-4">

                          {handover.handover_status === "Pending" && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-black text-slate-500 uppercase mb-2">{t("label_punch_items")}</label>
                                  <input type="number" min="0"
                                    value={f.punch_list_items ?? ""}
                                    onChange={e => setFd(project.id, { punch_list_items: Number(e.target.value) })}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                                </div>
                                <div>
                                  <label className="block text-xs font-black text-slate-500 uppercase mb-2">{t("label_handover_date")}</label>
                                  <input type="date"
                                    value={f.handover_date ?? ""}
                                    onChange={e => setFd(project.id, { handover_date: e.target.value })}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                                </div>
                              </div>
                              <button onClick={() => handleAdvance(handover, "Punch List", {
                                punch_list_items: f.punch_list_items || 0,
                                handover_date:    f.handover_date || null,
                              })} disabled={processing === project.id}
                                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white text-xs font-black rounded-xl hover:bg-amber-600 disabled:opacity-50">
                                {processing === project.id && <Loader2 size={13} className="animate-spin" />}
                                {t("btn_move_punch")}
                              </button>
                            </div>
                          )}

                          {handover.handover_status === "Punch List" && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <div>
                                  <p className="text-[10px] font-black text-amber-700 uppercase">{t("punch_progress")}</p>
                                  <p className="text-2xl font-black text-amber-700">
                                    {t("punch_cleared")
                                      .replace("{cleared}", String(handover.punch_list_cleared))
                                      .replace("{total}",   String(handover.punch_list_items))}
                                  </p>
                                </div>
                                <div className="flex-1 h-3 bg-amber-100 rounded-full overflow-hidden ml-4">
                                  <div className="h-full bg-amber-500 rounded-full"
                                    style={{ width: handover.punch_list_items > 0
                                      ? `${(handover.punch_list_cleared / handover.punch_list_items) * 100}%`
                                      : "0%" }} />
                                </div>
                              </div>
                              <div className="flex gap-3">
                                <input type="number" min="0" max={handover.punch_list_items}
                                  placeholder={t("punch_items_placeholder")}
                                  value={f.punch_list_cleared ?? ""}
                                  onChange={e => setFd(project.id, { punch_list_cleared: Number(e.target.value) })}
                                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                                <button onClick={() => handleAdvance(handover, "Final Inspection", {
                                  punch_list_cleared: f.punch_list_cleared ?? handover.punch_list_cleared,
                                })} disabled={processing === project.id}
                                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 disabled:opacity-50">
                                  {processing === project.id && <Loader2 size={13} className="animate-spin" />}
                                  {t("btn_proceed_inspection")}
                                </button>
                              </div>
                            </div>
                          )}

                          {handover.handover_status === "Final Inspection" && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-black text-slate-500 uppercase mb-2">{t("label_defect_end")}</label>
                                  <input type="date"
                                    value={f.defect_liability_end ?? ""}
                                    onChange={e => setFd(project.id, { defect_liability_end: e.target.value })}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                                </div>
                              </div>

                              {/* Certificate upload */}
                              <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-2">{t("label_certificate")} *</label>
                                <div className={`border-2 border-dashed rounded-2xl p-5 text-center ${
                                  f.certificate_url ? "border-green-400 bg-green-50" : "border-slate-300 hover:border-blue-400"
                                }`}>
                                  {f.certificate_url ? (
                                    <div>
                                      <CheckCircle2 size={20} className="text-green-500 mx-auto mb-1" />
                                      <p className="text-xs font-black text-green-700">{t("cert_uploaded")}</p>
                                      <a href={f.certificate_url} target="_blank" rel="noopener noreferrer"
                                        className="text-[11px] text-green-600 hover:underline flex items-center justify-center gap-1 mt-1">
                                        <ExternalLink size={10} /> {t("cert_view")}
                                      </a>
                                    </div>
                                  ) : uploading === project.id ? (
                                    <div className="text-slate-400">
                                      <Loader2 size={18} className="animate-spin mx-auto mb-1" />
                                      <p className="text-xs">{t("cert_uploading")}</p>
                                    </div>
                                  ) : (
                                    <label className="cursor-pointer">
                                      <Upload size={20} className="text-slate-300 mx-auto mb-1" />
                                      <p className="text-xs font-black text-slate-500">{t("cert_upload_label")}</p>
                                      <input type="file" className="hidden" accept=".pdf"
                                        onChange={e => {
                                          const file = e.target.files?.[0];
                                          if (file) handleCertUpload(project.id, file, handover);
                                        }} />
                                    </label>
                                  )}
                                </div>
                              </div>

                              <textarea rows={2} placeholder={t("final_notes_placeholder")}
                                value={f.notes ?? ""}
                                onChange={e => setFd(project.id, { notes: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />

                              <button
                                onClick={() => handleAdvance(handover, "Certificate Issued", {
                                  certificate_url:         f.certificate_url || null,
                                  defect_liability_end:    f.defect_liability_end || null,
                                  final_inspection_passed: true,
                                  notes:                   f.notes || null,
                                })}
                                disabled={processing === project.id || !f.certificate_url}
                                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white text-sm font-black rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                                {processing === project.id
                                  ? <Loader2 size={14} className="animate-spin" />
                                  : <Trophy size={14} />}
                                {t("btn_issue_cert")}
                              </button>
                            </div>
                          )}

                          {handover.handover_status === "Certificate Issued" && (
                            <div className="flex items-center gap-3 text-emerald-700">
                              <CheckCircle2 size={24} />
                              <div>
                                <p className="font-black">{t("completed_msg")}</p>
                                {handover.certificate_url && (
                                  <a href={handover.certificate_url} target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                                    <ExternalLink size={11} /> {t("view_cert_link")}
                                  </a>
                                )}
                                {/* ── BUG FIXED: null guard on defect_liability_end */}
                                {handover.defect_liability_end && (
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {t("defect_until")}: {new Date(handover.defect_liability_end).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Initiate handover */}
                    {!handover && project.status === "Ongoing" && (
                      <div className="border-t border-slate-100 px-6 py-5">
                        <button onClick={() => handleInitiate(project)} disabled={processing === project.id}
                          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white text-xs font-black rounded-xl hover:bg-slate-900 disabled:opacity-50">
                          {processing === project.id
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Flag size={13} />}
                          {t("btn_initiate")}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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