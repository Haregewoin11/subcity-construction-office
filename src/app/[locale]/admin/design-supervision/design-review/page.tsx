"use client";
// src/app/[locale]/admin/design-supervision/design-review/page.tsx

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/actions/supabase/clients";
import {
  ArrowLeft, CheckCircle2, XCircle, RotateCcw,
  Loader2, ChevronDown, ChevronUp, ExternalLink,
  FileText, RefreshCw, Info, Upload, Plus, X,
} from "lucide-react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────
type Submission = {
  id: string; project_id: string; title: string | null;
  drawing_type: string; file_url: string; version_number: number;
  status: string; reviewer_notes: string | null;
  created_at: string; reviewed_at: string | null;
};

type Project = {
  id: string; name: string; status: string; sector: string; location: string;
  submissions: Submission[];
};

type FilterStatus = "all" | "Design Phase" | "BOQ Verification";

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { bg: string; text: string }> = {
  "Pending":          { bg: "bg-amber-100",  text: "text-amber-700"  },
  "Approved":         { bg: "bg-green-100",  text: "text-green-700"  },
  "Rejected":         { bg: "bg-red-100",    text: "text-red-700"    },
  "Under Revision":   { bg: "bg-blue-100",   text: "text-blue-700"   },
};

const PROJECT_STATUS_META: Record<string, { bg: string; text: string }> = {
  "Design Phase":     { bg: "bg-indigo-100", text: "text-indigo-700" },
  "BOQ Verification": { bg: "bg-cyan-100",   text: "text-cyan-700"   },
  "Ongoing":          { bg: "bg-emerald-100",text: "text-emerald-700"},
};

const DRAWING_TYPES = ["Architectural", "Structural", "Electrical", "Sanitary", "Mechanical"] as const;

// ── Status label map — keys match t() keys exactly (no ICU in JSON, no .replace()) ──
const STATUS_LABEL_KEY: Record<string, string> = {
  "Pending":        "status_pending",
  "Approved":       "status_approved",
  "Rejected":       "status_rejected",
  "Under Revision": "status_under_revision",
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DesignReviewPage() {
  const t        = useTranslations("Admin.design_review");
  const locale   = useLocale();
  const supabase = useRef(createClient()).current;

  const [projects,     setProjects]     = useState<Project[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [notes,        setNotes]        = useState<Record<string, string>>({});
  const [processing,   setProcessing]   = useState<string | null>(null);
  const [toast,        setToast]        = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  // Upload form state per project
  const [uploadOpen,    setUploadOpen]    = useState<string | null>(null);
  const [uploadForm,    setUploadForm]    = useState<{
    drawing_type: string; title: string; file: File | null; uploading: boolean;
  }>({ drawing_type: "Architectural", title: "", file: null, uploading: false });

  // ── Data load ───────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const { data: pData } = await supabase
      .from("projects")
      .select("id, name, status, sector, location")
      .in("status", ["Design Phase", "BOQ Verification", "Ongoing"])
      .order("name");

    if (!pData) { setLoading(false); return; }

    const projectIds = pData.map(p => p.id);
    if (projectIds.length === 0) { setProjects([]); setLoading(false); return; }

    const { data: sData } = await supabase
      .from("design_submissions")
      .select("id, project_id, title, drawing_type, file_url, version_number, status, reviewer_notes, created_at, reviewed_at")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false });

    const subsByProject: Record<string, Submission[]> = {};
    for (const s of (sData || [])) {
      if (!subsByProject[s.project_id]) subsByProject[s.project_id] = [];
      subsByProject[s.project_id].push(s as Submission);
    }

    setProjects(pData.map(p => ({ ...p, submissions: subsByProject[p.id] || [] })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Review action (Approve / Revise / Reject) ─────────────────────────────
  async function handleAction(subId: string, projectId: string, newStatus: string) {
    setProcessing(subId);

    const { error } = await supabase.from("design_submissions").update({
      status:         newStatus,
      reviewer_notes: notes[subId] || null,
      reviewed_at:    new Date().toISOString(),
    }).eq("id", subId);

    if (error) { showToast(error.message, "error"); setProcessing(null); return; }

    // Auto-advance: if ALL submissions for this project are now Approved → BOQ Verification
    if (newStatus === "Approved") {
      const { data: allSubs } = await supabase
        .from("design_submissions")
        .select("id, status")
        .eq("project_id", projectId);

      // Re-fetch includes the just-updated row via server, but to be safe check optimistically
      const updatedSubs = (allSubs || []).map(s => s.id === subId ? { ...s, status: "Approved" } : s);
      const allApproved = updatedSubs.length > 0 && updatedSubs.every(s => s.status === "Approved");

      if (allApproved) {
        await supabase.from("projects")
          .update({ status: "BOQ Verification", updated_at: new Date().toISOString() })
          .eq("id", projectId)
          .eq("status", "Design Phase");   // only advance if still in Design Phase
        showToast(t("toast_approved") + " ✓ Project → BOQ Verification", "success");
      } else {
        showToast(t("toast_approved"), "success");
      }
    } else {
      const toastKey = newStatus === "Rejected" ? "toast_rejected" : "toast_revision";
      showToast(t(toastKey), "success");
    }

    load();
    setProcessing(null);
  }

  // ── Upload new design submission ──────────────────────────────────────────
  async function handleUpload(projectId: string) {
    if (!uploadForm.file) { showToast("Please select a file", "error"); return; }
    setUploadForm(f => ({ ...f, uploading: true }));

    const ext      = uploadForm.file.name.split(".").pop();
    const path     = `designs/${projectId}/${Date.now()}-${uploadForm.drawing_type.toLowerCase()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("technical-drawings")
      .upload(path, uploadForm.file, { upsert: true });

    if (upErr) {
      showToast(upErr.message, "error");
      setUploadForm(f => ({ ...f, uploading: false }));
      return;
    }

    const { data: urlData } = supabase.storage.from("technical-drawings").getPublicUrl(path);

    // Get current max version for this project + drawing_type
    const { data: existing } = await supabase
      .from("design_submissions")
      .select("version_number")
      .eq("project_id", projectId)
      .eq("drawing_type", uploadForm.drawing_type)
      .order("version_number", { ascending: false })
      .limit(1);
    const nextVersion = existing && existing.length > 0 ? (existing[0].version_number + 1) : 1;

    const { error: insErr } = await supabase.from("design_submissions").insert({
      project_id:     projectId,
      drawing_type:   uploadForm.drawing_type,
      title:          uploadForm.title || `${uploadForm.drawing_type} Drawing v${nextVersion}`,
      file_url:       urlData.publicUrl,
      status:         "Pending",
      version_number: nextVersion,
    });

    if (insErr) { showToast(insErr.message, "error"); }
    else {
      showToast("Drawing submitted for review", "success");
      setUploadOpen(null);
      setUploadForm({ drawing_type: "Architectural", title: "", file: null, uploading: false });
      load();
    }
    setUploadForm(f => ({ ...f, uploading: false }));
  }

  // ── Filter + derived data ─────────────────────────────────────────────────
  const FILTERS: { key: FilterStatus; labelKey: string }[] = [
    { key: "all",              labelKey: "filter_all"    },
    { key: "Design Phase",     labelKey: "filter_design" },
    { key: "BOQ Verification", labelKey: "filter_boq"   },
  ];

  const filtered = filterStatus === "all"
    ? projects
    : projects.filter(p => p.status === filterStatus);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-8">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href={`/${locale}/admin/design-supervision`}
              className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">{t("title")}</h1>
              <p className="text-sm font-bold text-slate-400">{t("subtitle")}</p>
            </div>
            <button onClick={load} disabled={loading}
              className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-400 transition-colors">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Info banner */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-6 flex gap-3">
            <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-sm text-indigo-700">
              <strong>{t("info_title")}:</strong> {t("info_body")}
            </p>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilterStatus(f.key)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  filterStatus === f.key
                    ? "bg-[#0A1628] text-white"
                    : "bg-white border border-slate-200 text-slate-500 hover:border-slate-400"
                }`}>
                {t(f.labelKey)}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-24 text-slate-400">
              <Loader2 size={24} className="animate-spin mr-2" /> {t("loading")}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-[2rem] border border-slate-200 p-16 text-center">
              <FileText size={40} className="text-slate-200 mx-auto mb-3" strokeWidth={1} />
              <p className="font-black text-slate-400">{t("no_projects")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(project => {
                const subs       = project.submissions;
                const total      = subs.length;
                const approved   = subs.filter(s => s.status === "Approved").length;
                const pending    = subs.filter(s => s.status === "Pending").length;
                const allApproved = total > 0 && approved === total;
                const pct        = total > 0 ? Math.round((approved / total) * 100) : 0;
                const pMeta      = PROJECT_STATUS_META[project.status] ?? { bg: "bg-slate-100", text: "text-slate-600" };
                const isExpanded = expanded === project.id;
                const isUploading = uploadOpen === project.id;

                return (
                  <div key={project.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">

                    {/* Project header row */}
                    <div
                      className="p-6 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setExpanded(isExpanded ? null : project.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${pMeta.bg} ${pMeta.text}`}>
                            {project.status}
                          </span>
                          {allApproved && (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                              <CheckCircle2 size={9} /> {t("all_approved_badge")}
                            </span>
                          )}
                          {pending > 0 && (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              {/* ✅ no .replace() — append count in JSX */}
                              {pending} {t("status_pending")}
                            </span>
                          )}
                        </div>
                        <h3 className="font-black text-slate-900 text-lg truncate">{project.name}</h3>
                        <p className="text-xs text-slate-400">
                          {project.sector} · {project.location} ·{" "}
                          {/* ✅ count in JSX, plain t() with no ICU vars */}
                          {total} {total === 1 ? t("submissions_label") : t("submissions_plural")}
                          {" · "}{approved}/{total} {t("status_approved").toLowerCase()}
                        </p>
                      </div>

                      {/* Progress bar */}
                      <div className="hidden md:flex flex-col items-end gap-1 shrink-0">
                        <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${allApproved ? "bg-green-500" : "bg-indigo-500"}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400">{pct}% {t("status_approved").toLowerCase()}</p>
                      </div>

                      <div className="shrink-0 ml-2">
                        {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </div>
                    </div>

                    {/* Expanded: submissions + upload */}
                    {isExpanded && (
                      <div className="border-t border-slate-100">

                        {/* Upload toggle button */}
                        <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {total} submission{total !== 1 ? "s" : ""}
                          </p>
                          <button
                            onClick={e => { e.stopPropagation(); setUploadOpen(isUploading ? null : project.id); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 transition-colors">
                            {isUploading ? <X size={12} /> : <Plus size={12} />}
                            {isUploading ? "Cancel" : "Add Drawing"}
                          </button>
                        </div>

                        {/* Upload form */}
                        {isUploading && (
                          <div className="mx-6 my-4 bg-indigo-50 border border-indigo-200 rounded-2xl p-5 space-y-4"
                               onClick={e => e.stopPropagation()}>
                            <p className="text-xs font-black text-indigo-700 uppercase tracking-widest">New Design Submission</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-black text-slate-500 mb-1">Drawing Type</label>
                                <select value={uploadForm.drawing_type}
                                  onChange={e => setUploadForm(f => ({ ...f, drawing_type: e.target.value }))}
                                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                                  {DRAWING_TYPES.map(dt => <option key={dt}>{dt}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-black text-slate-500 mb-1">Title (optional)</label>
                                <input value={uploadForm.title}
                                  onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))}
                                  placeholder="e.g. Ground Floor Plan"
                                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                              </div>
                            </div>

                            {/* File drop zone */}
                            <div className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
                              uploadForm.file ? "border-indigo-400 bg-indigo-100" : "border-slate-300 hover:border-indigo-400"
                            }`}>
                              {uploadForm.file ? (
                                <div className="flex items-center justify-center gap-3">
                                  <FileText size={18} className="text-indigo-600" />
                                  <div className="text-left">
                                    <p className="text-xs font-black text-indigo-700">{uploadForm.file.name}</p>
                                    <p className="text-[10px] text-slate-400">{(uploadForm.file.size / 1024).toFixed(0)} KB</p>
                                  </div>
                                  <button onClick={() => setUploadForm(f => ({ ...f, file: null }))}
                                    className="ml-2 text-slate-400 hover:text-red-500">
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <label className="cursor-pointer block">
                                  <Upload size={20} className="text-slate-300 mx-auto mb-2" />
                                  <p className="text-xs font-black text-slate-500">Click to upload drawing</p>
                                  <p className="text-[10px] text-slate-400 mt-1">PDF, DWG, PNG, JPG up to 50MB</p>
                                  <input type="file" className="hidden"
                                    accept=".pdf,.dwg,.png,.jpg,.jpeg,.svg"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) setUploadForm(u => ({ ...u, file: f })); }} />
                                </label>
                              )}
                            </div>

                            <button onClick={() => handleUpload(project.id)}
                              disabled={!uploadForm.file || uploadForm.uploading}
                              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                              {uploadForm.uploading
                                ? <Loader2 size={13} className="animate-spin" />
                                : <Upload size={13} />}
                              {uploadForm.uploading ? "Uploading…" : "Submit for Review"}
                            </button>
                          </div>
                        )}

                        {/* Submissions list */}
                        {subs.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-sm">{t("no_submissions")}</div>
                        ) : (
                          <div className="divide-y divide-slate-50">
                            {subs.map(sub => {
                              const sMeta = STATUS_META[sub.status] ?? STATUS_META["Pending"];
                              const canReview = sub.status === "Pending" || sub.status === "Under Revision";

                              return (
                                <div key={sub.id} className="p-5 flex flex-col md:flex-row md:items-start gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      {/* ✅ t() with static key — no .replace(), no ICU vars */}
                                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${sMeta.bg} ${sMeta.text}`}>
                                        {t(STATUS_LABEL_KEY[sub.status] ?? "status_pending")}
                                      </span>
                                      <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                        {sub.drawing_type}
                                      </span>
                                      <span className="text-[10px] text-slate-400">v{sub.version_number}</span>
                                    </div>
                                    <p className="font-black text-slate-800 text-sm">
                                      {sub.title || `${sub.drawing_type} Drawing`}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      {sub.created_at ? new Date(sub.created_at).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" }) : "—"}
                                    </p>
                                    {sub.reviewer_notes && (
                                      <p className="text-xs text-slate-500 mt-2 italic bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                                        {t("reviewer_notes_label")}: {sub.reviewer_notes}
                                      </p>
                                    )}
                                    <a href={sub.file_url} target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs font-black text-indigo-600 hover:underline mt-2">
                                      <ExternalLink size={11} /> {t("view_drawing")}
                                    </a>
                                  </div>

                                  {/* Review actions */}
                                  {canReview ? (
                                    <div className="flex flex-col gap-2 shrink-0 md:w-64" onClick={e => e.stopPropagation()}>
                                      <textarea rows={2}
                                        placeholder={t("notes_placeholder")}
                                        value={notes[sub.id] || ""}
                                        onChange={e => setNotes(n => ({ ...n, [sub.id]: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white"
                                      />
                                      <div className="flex gap-2">
                                        <button onClick={() => handleAction(sub.id, project.id, "Approved")}
                                          disabled={processing === sub.id}
                                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white text-xs font-black rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors">
                                          {processing === sub.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                                          {t("btn_approve")}
                                        </button>
                                        <button onClick={() => handleAction(sub.id, project.id, "Under Revision")}
                                          disabled={processing === sub.id}
                                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 text-white text-xs font-black rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors">
                                          <RotateCcw size={11} /> {t("btn_revise")}
                                        </button>
                                        <button onClick={() => handleAction(sub.id, project.id, "Rejected")}
                                          disabled={processing === sub.id}
                                          className="px-3 py-2 bg-red-500 text-white text-xs font-black rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors">
                                          <XCircle size={11} />
                                        </button>
                                      </div>
                                    </div>
                                  ) : sub.status === "Approved" ? (
                                    <div className="flex items-center gap-2 text-green-600 text-xs font-black shrink-0">
                                      <CheckCircle2 size={16} /> {t("status_approved")}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
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

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold text-white z-50 max-w-md flex items-center gap-3 ${
          toast.type === "success" ? "bg-green-600" : "bg-red-500"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <X size={16} />}
          {toast.msg}
        </div>
      )}
    </>
  );
}