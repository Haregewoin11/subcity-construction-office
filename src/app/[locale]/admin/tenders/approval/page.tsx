"use client";
// src/app/[locale]/admin/tenders/approval/page.tsx

import React, { useEffect, useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/actions/supabase/clients";
import {
  ArrowLeft, CheckCircle2, XCircle, Loader2, Send,
  ChevronDown, ChevronUp, AlertCircle, Globe, FileText,
  Clock, RefreshCw
} from "lucide-react";
import Link from "next/link";

type Tender = {
  tender_id: string; ref_no: string; title: string; status: string;
  budget_estimate: number; currency: string; woreda: string; project_type: string;
  submission_deadline: string; description: string; evaluation_method: string;
  required_documents: string[]; created_at: string; project_id: string;
  rejection_remarks?: string;
  projects?: { name: string; location: string };
};

const STATUS_META: Record<string, { bg: string; text: string; label: string }> = {
  "Draft":            { bg: "bg-slate-100",  text: "text-slate-600",  label: "Draft"           },
  "Pending Approval": { bg: "bg-amber-100",  text: "text-amber-700",  label: "Pending Review"  },
  "Open":             { bg: "bg-green-100",  text: "text-green-700",  label: "Published"        },
  "Closed":           { bg: "bg-red-100",    text: "text-red-600",    label: "Closed"           },
};

export default function CommitteeApprovalPage() {
  const t      = useTranslations("Admin.tenders_module");
  const locale = useLocale();
  const supabase = useRef(createClient()).current;

  const [tenders,    setTenders]    = useState<Tender[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [notes,      setNotes]      = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast,      setToast]      = useState<{ msg: string; type: "success"|"error" } | null>(null);
  const [tab,        setTab]        = useState<"pending"|"all">("pending");

  async function load() {
    setLoading(true);
    const q = supabase
      .from("tenders")
      .select("*, projects!tenders_project_id_fkey(name, location)")
      .order("created_at", { ascending: false });
    if (tab === "pending") q.in("status", ["Draft", "Pending Approval"]);
    const { data, error } = await q;
    if (error) console.error("load error:", error);
    setTenders((data as Tender[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [tab]);

  function toast_(msg: string, type: "success"|"error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function sendToCommittee(id: string) {
    setProcessing(id);
    const { error } = await supabase.from("tenders")
      .update({ status: "Pending Approval", updated_at: new Date().toISOString() })
      .eq("tender_id", id);
    if (error) toast_(error.message, "error");
    else { toast_(t("toast_sent_committee"), "success"); load(); }
    setProcessing(null);
  }

  async function approve(tender: Tender) {
    setProcessing(tender.tender_id);
    const { error } = await supabase.from("tenders").update({
      status: "Open",
      visible_to_public: true,
      approval_notes: notes[tender.tender_id] || "",
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("tender_id", tender.tender_id);
    if (error) toast_(error.message, "error");
    else { toast_(t("toast_approved"), "success"); load(); }
    setProcessing(null);
  }

  async function reject(tender: Tender) {
    if (!notes[tender.tender_id]?.trim()) { toast_(t("reject_notes_required"), "error"); return; }
    setProcessing(tender.tender_id);
    const { error } = await supabase.from("tenders").update({
      status: "Draft",
      rejection_remarks: notes[tender.tender_id],
      updated_at: new Date().toISOString(),
    }).eq("tender_id", tender.tender_id);
    if (error) toast_(error.message, "error");
    else { toast_(t("toast_rejected"), "success"); load(); }
    setProcessing(null);
  }

  const pendingCount = tenders.filter(x => x.status === "Pending Approval").length;
  const draftCount   = tenders.filter(x => x.status === "Draft").length;

  return (
    <div className="min-h-screen bg-[#F4F6F9] p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/admin/tenders`} className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-black uppercase tracking-tight text-[#2C2C2C]">{t("committee_title")}</h1>
            <p className="text-sm font-bold text-slate-500">{t("committee_subtitle")}</p>
          </div>
          <button onClick={load} className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-400">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* FLOW STEPS */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-700 text-white text-sm font-black flex items-center justify-center shrink-0">1</div>
            <div>
              <p className="text-xs font-black text-slate-700">Draft</p>
              <p className="text-[11px] text-slate-400">{draftCount} tender{draftCount !== 1 ? "s" : ""} waiting</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500 text-white text-sm font-black flex items-center justify-center shrink-0">2</div>
            <div>
              <p className="text-xs font-black text-amber-700">Committee Review</p>
              <p className="text-[11px] text-amber-500">{pendingCount} pending approval</p>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-600 text-white text-sm font-black flex items-center justify-center shrink-0">3</div>
            <div>
              <p className="text-xs font-black text-green-700">Published</p>
              <p className="text-[11px] text-green-500">Live on public page</p>
            </div>
          </div>
        </div>

        {/* INFO BANNER */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
          <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700">{t("approval_info")}</p>
        </div>

        {/* TABS */}
        <div className="flex gap-2">
          {(["pending", "all"] as const).map(tabVal => (
            <button key={tabVal} onClick={() => setTab(tabVal)}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                tab === tabVal ? "bg-[#0A1628] text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}>
              {tabVal === "pending"
                ? <>{t("tab_pending")}{pendingCount > 0 && <span className="ml-2 bg-amber-500 text-white rounded-full px-1.5 py-0.5 text-[9px]">{pendingCount}</span>}</>
                : t("tab_all")}
            </button>
          ))}
        </div>

        {/* LIST */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 size={24} className="animate-spin mr-2" /> {t("loading_tenders_short")}
          </div>
        ) : tenders.length === 0 ? (
          <div className="bg-white rounded-[2rem] border border-slate-200 p-12 text-center">
            <CheckCircle2 size={40} className="text-green-400 mx-auto mb-3" />
            <p className="font-black text-slate-500">{t("no_pending")}</p>
            <p className="text-sm text-slate-400 mt-1">All tenders are up to date</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tenders.map(tender => {
              const meta = STATUS_META[tender.status] || { bg: "bg-slate-100", text: "text-slate-500", label: tender.status };
              const isExpanded = expanded === tender.tender_id;
              const isProcessing = processing === tender.tender_id;

              return (
                <div key={tender.tender_id} className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">

                  {/* CARD HEADER — always visible */}
                  <div className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : tender.tender_id)}>
                    <div className="flex-1 min-w-0 flex items-center gap-4">
                      {/* Stage indicator dot */}
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        tender.status === "Draft" ? "bg-slate-400" :
                        tender.status === "Pending Approval" ? "bg-amber-400 ring-4 ring-amber-100" :
                        "bg-green-500"
                      }`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black text-slate-400 font-mono">{tender.ref_no}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>{meta.label}</span>
                        </div>
                        <h3 className="font-black text-[#2C2C2C] truncate text-sm mt-0.5">{tender.title}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {tender.projects?.name || "—"} · {tender.woreda} · {Number(tender.budget_estimate).toLocaleString()} {tender.currency}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Quick action for Pending tenders without expanding */}
                      {tender.status === "Pending Approval" && !isExpanded && (
                        <button onClick={e => { e.stopPropagation(); setExpanded(tender.tender_id); }}
                          className="px-3 py-1.5 bg-amber-500 text-white text-[10px] font-black rounded-lg hover:bg-amber-600 flex items-center gap-1">
                          <Clock size={10} /> Review
                        </button>
                      )}
                      {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                  </div>

                  {/* EXPANDED DETAIL */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50">

                      {/* Details grid */}
                      <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm border-b border-slate-100">
                        <div><p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">{t("col_project_type")}</p><p className="font-bold text-slate-700">{tender.project_type || "—"}</p></div>
                        <div><p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">{t("col_evaluation")}</p><p className="font-bold text-slate-700">{tender.evaluation_method || "—"}</p></div>
                        <div><p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">{t("col_deadline_short")}</p><p className="font-bold text-slate-700">{tender.submission_deadline ? new Date(tender.submission_deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</p></div>
                        <div><p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Project</p><p className="font-bold text-slate-700">{tender.projects?.name || "—"}</p></div>
                        <div><p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Location</p><p className="font-bold text-slate-700">{tender.projects?.location || "—"}</p></div>
                        <div><p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Created</p><p className="font-bold text-slate-700">{new Date(tender.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p></div>
                      </div>

                      {tender.description && (
                        <div className="px-5 py-4 border-b border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{t("description_label")}</p>
                          <p className="text-sm text-slate-600 leading-relaxed">{tender.description}</p>
                        </div>
                      )}

                      {tender.required_documents?.length > 0 && (
                        <div className="px-5 py-4 border-b border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{t("required_docs_label")}</p>
                          <div className="flex flex-wrap gap-2">
                            {tender.required_documents.map(d => (
                              <span key={d} className="bg-white border border-slate-200 text-xs font-bold text-slate-600 px-3 py-1 rounded-full">{d}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {tender.rejection_remarks && (
                        <div className="px-5 py-4 border-b border-slate-100">
                          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                            <span className="font-black block mb-0.5">Previous Rejection Reason:</span>
                            {tender.rejection_remarks}
                          </div>
                        </div>
                      )}

                      {/* ACTION AREA */}
                      <div className="p-5 space-y-3">
                        {/* Stage 1 → 2: Draft can be sent to committee */}
                        {tender.status === "Draft" && (
                          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs font-black text-slate-700 flex items-center gap-2">
                                <FileText size={13} className="text-slate-400" /> {t("stage_draft_label")}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">{t("stage_draft_hint")}</p>
                            </div>
                            <button onClick={() => sendToCommittee(tender.tender_id)} disabled={isProcessing}
                              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white text-xs font-black rounded-xl hover:bg-amber-600 disabled:opacity-50 shrink-0">
                              {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                              {t("action_send_approval")}
                            </button>
                          </div>
                        )}

                        {/* Stage 2 → 3: Pending can be approved or rejected */}
                        {tender.status === "Pending Approval" && (
                          <div className="bg-white border-2 border-amber-300 rounded-2xl p-4 space-y-3">
                            <p className="text-xs font-black text-amber-700 flex items-center gap-2">
                              <Clock size={13} /> {t("stage_pending_label")}
                            </p>
                            <textarea rows={2} placeholder={t("notes_placeholder")}
                              value={notes[tender.tender_id] || ""}
                              onChange={e => setNotes(n => ({ ...n, [tender.tender_id]: e.target.value }))}
                              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1628] resize-none bg-slate-50" />
                            <p className="text-[10px] text-slate-400">{t("label_committee_notes")} · {t("reject_notes_required")}</p>
                            <div className="flex gap-3">
                              <button onClick={() => approve(tender)} disabled={isProcessing}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white text-xs font-black rounded-xl hover:bg-green-700 disabled:opacity-50 transition-all">
                                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                {t("action_approve_publish")}
                                <Globe size={12} className="opacity-60" />
                              </button>
                              <button onClick={() => reject(tender)} disabled={isProcessing}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 text-white text-xs font-black rounded-xl hover:bg-red-600 disabled:opacity-50 transition-all">
                                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                {t("action_reject_return")}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Stage 3: Already published */}
                        {tender.status === "Open" && (
                          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                            <Globe size={16} className="text-green-600 shrink-0" />
                            <div>
                              <p className="text-xs font-black text-green-700">{t("stage_published_label")}</p>
                              <p className="text-[11px] text-green-500">{t("stage_published_hint")}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold text-white z-50 max-w-sm flex items-center gap-3 ${
          toast.type === "success" ? "bg-green-600" : "bg-red-500"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}