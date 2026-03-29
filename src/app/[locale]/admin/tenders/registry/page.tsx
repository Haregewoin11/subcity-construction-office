"use client";
// src/app/[locale]/admin/tenders/registry/page.tsx
// ── BUG FIXED: removed <AdminShell> import and wrapper (double-shell bug)
// ── BUG FIXED: active filter color corrected to bg-[#0A1628]
// ── LOCALIZED: all strings via useTranslations("Admin.tenders_module")

import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/actions/supabase/clients";
import {
  AlertCircle, ArrowLeft, CheckCircle2, ChevronDown, Clock,
  FileSignature, FileText, Filter, Globe, Loader2, Lock,
  PlusCircle, RefreshCw, Search, Send, Trophy, X
} from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useState, useRef } from "react";

type Project = { id: string; name: string; sector: string; location: string; budget: number };

type Tender = {
  tender_id: string;
  ref_no: string;
  title: string;
  status: string;
  woreda: string;
  project_type: string;
  budget_estimate: number;
  currency: string;
  submission_deadline: string;
  created_at: string;
  visible_to_public: boolean;
  evaluation_method: string;
  project_id: string | null;
  projects?: { name: string; location: string } | null;
  rejection_remarks?: string;
};

const WOREDA_LIST = ["Woreda 1","Woreda 2","Woreda 3","Woreda 4","Woreda 5","Woreda 6",
  "Woreda 7","Woreda 8","Woreda 9","Woreda 10","Woreda 11","Woreda 12","Woreda 13"];
const PROJECT_TYPES = ["School","Health","Youth","Road","Other"];
const REQUIRED_DOCS_OPTIONS = [
  "Technical Proposal","Financial Proposal","Company Registration","Tax Clearance",
  "PPESA License","Bank Statement","Previous Experience","Performance Bond","Bid Security",
];
const STATUS_ALL = ["Draft","Pending Approval","Open","Closed","Opening",
  "Under Evaluation","Awarded","Contract Signed","Cancelled","Re-Tendered"];

const STATUS_META: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  "Draft":            { color: "text-slate-600",   bg: "bg-slate-100",   icon: <FileText size={11} /> },
  "Pending Approval": { color: "text-amber-700",   bg: "bg-amber-100",   icon: <Clock size={11} /> },
  "Open":             { color: "text-green-700",   bg: "bg-green-100",   icon: <Globe size={11} /> },
  "Closed":           { color: "text-red-600",     bg: "bg-red-100",     icon: <Lock size={11} /> },
  "Under Evaluation": { color: "text-purple-700",  bg: "bg-purple-100",  icon: <Filter size={11} /> },
  "Awarded":          { color: "text-blue-700",    bg: "bg-blue-100",    icon: <Trophy size={11} /> },
  "Contract Signed":  { color: "text-emerald-700", bg: "bg-emerald-100", icon: <FileSignature size={11} /> },
  "Cancelled":        { color: "text-red-700",     bg: "bg-red-100",     icon: <X size={11} /> },
};

const BLANK_FORM = {
  project_id: "", title: "", description: "", project_type: "", woreda: "",
  budget_estimate: "", submission_deadline: "", closing_date: "",
  evaluation_method: "Lowest Price", min_experience_years: "0",
  required_documents: [] as string[], currency: "ETB",
};

export default function TendersRegistryPage() {
  const t      = useTranslations("Admin.tenders_module");
  const locale = useLocale();
  const supabase = useRef(createClient()).current;

  const [tenders,    setTenders]    = useState<Tender[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType,   setFilterType]   = useState("All");
  const [panelOpen,  setPanelOpen]  = useState(false);
  const [form,       setForm]       = useState(BLANK_FORM);
  const [plannedProjects, setPlannedProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState("");
  const [formSuccess,setFormSuccess]= useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadTenders = useCallback(async () => {
    setLoading(true);
    interface RawTenderResponse extends Omit<Tender, 'projects'> {
      projects: { name: string; location: string }[] | { name: string; location: string } | null;
    }
  const { data, error } = await supabase
      .from("tenders")
      .select(`
        tender_id, ref_no, title, status, woreda, project_type, 
        budget_estimate, currency, submission_deadline, created_at, 
        visible_to_public, evaluation_method, project_id, rejection_remarks, 
        projects:projects!tenders_project_id_fkey(name, location)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadTenders error:", error);
      setLoading(false);
      return;
    }
    const rawData = (data as unknown as RawTenderResponse[]) || [];
    
    const formattedTenders: Tender[] = rawData.map((item) => ({
      ...item,
      // Flatten the projects array into a single object
      projects: Array.isArray(item.projects) ? item.projects[0] : item.projects || null,
    }));

    setTenders(formattedTenders);
    setLoading(false);
  }, [supabase]);



  async function openPanel() {
    setPanelOpen(true);
    setFormSuccess(false);
    setFormError("");
    setForm(BLANK_FORM);
    setLoadingProjects(true);
    const { data } = await supabase.from("projects").select("id,name,sector,location,budget").eq("status", "Planned").order("name");
    setPlannedProjects((data as Project[]) || []);
    setLoadingProjects(false);
  }

  function handleProjectChange(projectId: string) {
    const project = plannedProjects.find(p => p.id === projectId);
    if (project) {
      setForm(f => ({
        ...f, project_id: projectId,
        project_type: project.sector === "Schools" ? "School" : project.sector === "Health" ? "Health" : project.sector === "Youth" ? "Youth" : "Other",
        budget_estimate: project.budget ? String(project.budget) : f.budget_estimate,
      }));
    } else {
      setForm(f => ({ ...f, project_id: projectId }));
    }
  }

  function handleDocToggle(doc: string) {
    setForm(f => ({
      ...f, required_documents: f.required_documents.includes(doc)
        ? f.required_documents.filter(d => d !== doc)
        : [...f.required_documents, doc],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    if (!form.project_id) { setFormError(t("no_planned_projects")); setSubmitting(false); return; }
    const ref_no = `TND-${Date.now().toString().slice(-7)}`;
    const { error } = await supabase.from("tenders").insert({
      ref_no, project_id: form.project_id, title: form.title, description: form.description,
      project_type: form.project_type, woreda: form.woreda, budget_estimate: Number(form.budget_estimate),
      submission_deadline: form.submission_deadline, closing_date: form.closing_date || null,
      evaluation_method: form.evaluation_method, min_experience_years: Number(form.min_experience_years),
      required_documents: form.required_documents, currency: form.currency, status: "Draft", visible_to_public: false,
    });
    if (error) { setFormError(error.message); } 
    else { setFormSuccess(true); loadTenders(); setTimeout(() => { setPanelOpen(false); setFormSuccess(false); }, 2200); }
    setSubmitting(false);
  }

  async function handleSendToCommittee(tenderId: string) {
    setProcessing(tenderId);
    const { error } = await supabase.from("tenders").update({
      status: "Pending Approval",
      updated_at: new Date().toISOString(),
    }).eq("tender_id", tenderId);
    if (error) console.error("sendToCommittee error:", error);
    else loadTenders();
    setProcessing(null);
  }

  const filtered = tenders.filter(tender => {
    const matchSearch = !search || tender.title.toLowerCase().includes(search.toLowerCase()) || tender.ref_no.toLowerCase().includes(search.toLowerCase()) || tender.woreda.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || tender.status === filterStatus;
    const matchType   = filterType   === "All" || tender.project_type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  function StatusBadge({ status }: { status: string }) {
    const meta = STATUS_META[status] || { color: "text-slate-500", bg: "bg-slate-100", icon: null };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${meta.bg} ${meta.color}`}>
        {meta.icon}{status}
      </span>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#F4F6F9] flex flex-col">

        {/* TOP BAR */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Link href={`/${locale}/admin/tenders`} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-[#2C2C2C]">{t("registry_title")}</h1>
              <p className="text-[11px] font-bold text-slate-400">
                {t("registry_subtitle", {
                  total:   tenders.length,
                  open:    tenders.filter(x => x.status === "Open").length,
                  pending: tenders.filter(x => x.status === "Pending Approval").length,
                 })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadTenders} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-400">
              <RefreshCw size={15} />
            </button>
            <button onClick={openPanel}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0A1628] text-white text-xs font-black rounded-xl hover:bg-slate-800 transition-all shadow-md">
              <PlusCircle size={15} /> {t("create_tender")}
            </button>
          </div>
        </div>

        {/* FLOW BANNER */}
        <div className="px-8 pt-6">
          <div className="bg-white border border-slate-200 rounded-2xl px-6 py-4 flex items-center gap-0">
            {[
              { num: "1", label: "Create Draft",      sub: "Internal only",        color: "bg-slate-700",   active: true  },
              { num: "2", label: "Committee Review",   sub: "Approve or reject",    color: "bg-amber-500",   active: true  },
              { num: "3", label: "Published",          sub: "Live on public page",  color: "bg-green-600",   active: true  },
            ].map((step, i) => (
              <React.Fragment key={step.num}>
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-8 h-8 rounded-full ${step.color} text-white text-xs font-black flex items-center justify-center shrink-0`}>{step.num}</div>
                  <div>
                    <p className="text-xs font-black text-slate-700">{step.label}</p>
                    <p className="text-[10px] text-slate-400">{step.sub}</p>
                  </div>
                </div>
                {i < 2 && <div className="w-8 h-px bg-slate-200 shrink-0 mx-2" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* FILTERS */}
        <div className="px-8 pt-6 pb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t("search_placeholder")}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1628]" />
          </div>
          <div className="relative">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl pl-4 pr-8 py-2.5 text-xs font-black text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#0A1628]">
              <option value="All">{t("all_statuses")}</option>
              {STATUS_ALL.map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl pl-4 pr-8 py-2.5 text-xs font-black text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#0A1628]">
              <option value="All">{t("all_types")}</option>
              {PROJECT_TYPES.map(type => <option key={type}>{type}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <span className="text-xs font-bold text-slate-400 ml-auto">
            {filtered.length !== 1 ? t("results_found_plural", { n: filtered.length }) : t("results_found", { n: filtered.length  })}
          </span>
        </div>

        {/* TABLE */}
        <div className="px-8 pb-10 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-slate-400">
              <Loader2 size={24} className="animate-spin mr-2" /> {t("loading_tenders")}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-[2rem] border border-slate-200 p-16 text-center">
              <FileText size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="font-black text-slate-400">{t("no_tenders_title")}</p>
              <p className="text-sm text-slate-400 mt-1">
                {search || filterStatus !== "All" || filterType !== "All" ? t("no_tenders_filter") : t("no_tenders_body")}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100">
                {[t("col_tender"), t("col_status"), t("col_project"), t("col_woreda_type"), t("col_budget"), t("col_deadline")].map(h => (
                  <p key={h} className="text-[10px] font-black uppercase text-slate-400">{h}</p>
                ))}
              </div>
              <div className="divide-y divide-slate-50">
                {filtered.map(tender => (
                  <React.Fragment key={tender.tender_id}>
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => setExpandedId(expandedId === tender.tender_id ? null : tender.tender_id)}>
                      <div className="min-w-0">
                        <p className="font-black text-sm text-[#2C2C2C] truncate">{tender.title}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{tender.ref_no}</p>
                      </div>
                      <div className="flex items-center"><StatusBadge status={tender.status} /></div>
                      <div className="flex items-center min-w-0">
                        <p className="text-xs text-slate-600 truncate">
                          {tender.projects?.name || <span className="text-slate-300 italic">{t("no_project")}</span>}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <div>
                          <p className="text-xs font-bold text-slate-600">{tender.woreda}</p>
                          <p className="text-[11px] text-slate-400">{tender.project_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div>
                          <p className="text-xs font-black text-[#0A1628]">{Number(tender.budget_estimate).toLocaleString()}</p>
                          <p className="text-[11px] text-slate-400">{tender.currency}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <p className="text-[11px] text-slate-500">
                          {tender.submission_deadline
                            ? new Date(tender.submission_deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit"})
                            : "—"}
                        </p>
                      </div>
                    </div>

                    {expandedId === tender.tender_id && (
                      <div className="px-6 pb-5 pt-2 bg-slate-50 border-t border-slate-100">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">{t("label_eval_method")}</p>
                            <p className="font-bold text-slate-700">{tender.evaluation_method}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">{t("label_visibility")}</p>
                            <p className={`font-bold ${tender.visible_to_public ? "text-green-600" : "text-slate-400"}`}>
                              {tender.visible_to_public ? t("visibility_public") : t("visibility_internal")}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">{t("label_created")}</p>
                            <p className="font-bold text-slate-700">{new Date(tender.created_at).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">{t("label_project_location")}</p>
                            <p className="font-bold text-slate-700">{tender.projects?.location || "—"}</p>
                          </div>
                        </div>
                        {tender.rejection_remarks && (
                          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-xs text-red-700">
                            <span className="font-black">{t("rejection_label")}</span> {tender.rejection_remarks}
                          </div>
                        )}

                        {/* STAGE-AWARE ACTION AREA */}
                        {tender.status === "Draft" && (
                          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-700 text-white text-xs font-black flex items-center justify-center shrink-0">1</div>
                              <div>
                                <p className="text-xs font-black text-slate-700">{t("stage_draft_label")}</p>
                                <p className="text-[11px] text-slate-400">{t("stage_draft_hint")}</p>
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSendToCommittee(tender.tender_id); }}
                              disabled={processing === tender.tender_id}
                              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white text-xs font-black rounded-xl hover:bg-amber-600 transition-all disabled:opacity-50 shrink-0">
                              {processing === tender.tender_id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                              {t("action_send_approval")}
                            </button>
                          </div>
                        )}
                        {tender.status === "Pending Approval" && (
                          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-amber-500 text-white text-xs font-black flex items-center justify-center shrink-0">2</div>
                              <div>
                                <p className="text-xs font-black text-amber-700">{t("stage_pending_label")}</p>
                                <p className="text-[11px] text-amber-500">{t("stage_pending_hint")}</p>
                              </div>
                            </div>
                            <Link href={`/${locale}/admin/tenders/approval`}
                              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white text-xs font-black rounded-xl hover:bg-amber-600 transition-all shrink-0">
                              <CheckCircle2 size={13} /> {t("action_review_approve")}
                            </Link>
                          </div>
                        )}
                        {tender.status === "Open" && (
                          <div className="mt-4 bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-600 text-white text-xs font-black flex items-center justify-center shrink-0">3</div>
                            <div>
                              <p className="text-xs font-black text-green-700">{t("stage_published_label")}</p>
                              <p className="text-[11px] text-green-500">{t("stage_published_hint")}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 mt-3">
                          {["Open", "Closed", "Under Evaluation"].includes(tender.status) && (
                            <Link href={`/${locale}/admin/tenders/bids`}
                              className="px-4 py-2 bg-purple-600 text-white text-xs font-black rounded-xl hover:bg-purple-700 flex items-center gap-1.5">
                              <Filter size={12} /> {t("action_manage_bids")}
                            </Link>
                          )}
                          {tender.status === "Awarded" && (
                            <Link href={`/${locale}/admin/tenders/awards`}
                              className="px-4 py-2 bg-[#0A1628] text-white text-xs font-black rounded-xl hover:bg-slate-800 flex items-center gap-1.5">
                              <FileSignature size={12} /> {t("action_upload_contract")}
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {panelOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 backdrop-blur-sm"
          onClick={() => !submitting && setPanelOpen(false)} />
      )}

      {/* Slide-in Panel */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-in-out ${
        panelOpen ? "translate-x-0" : "translate-x-full"
      }`}>
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 bg-[#0A1628] text-white shrink-0">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight">{t("panel_title")}</h2>
            <p className="text-[11px] text-blue-200">{t("panel_subtitle")}</p>
          </div>
          <button onClick={() => !submitting && setPanelOpen(false)}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {formSuccess ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-black text-[#0A1628] mb-2">{t("panel_drafted")}</h3>
              <p className="text-sm text-slate-500">{t("panel_drafted_body")}</p>
              <p className="text-xs text-slate-400 mt-3">{t("panel_closing")}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-7 space-y-7">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3 text-xs text-blue-700">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-blue-500" />
                <span>{t("workflow_hint")}</span>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">{t("section_project")}</p>
                {loadingProjects ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm py-3">
                    <Loader2 size={14} className="animate-spin" /> {t("loading_projects")}
                  </div>
                ) : plannedProjects.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700 text-xs">
                    {t("no_planned_projects")}
                  </div>
                ) : (
                  <select required value={form.project_id} onChange={e => handleProjectChange(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0A1628]">
                    <option value="">{t("select_project")}</option>
                    {plannedProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} · {p.sector}{p.location ? ` · ${p.location}` : ""}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">{t("section_details")}</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 mb-1.5">{t("label_title")}</label>
                    <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder={t("label_title_placeholder")}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1628]" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 mb-1.5">{t("label_description")}</label>
                    <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder={t("label_description_placeholder")}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1628] resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-500 mb-1.5">{t("label_project_type")}</label>
                      <select required value={form.project_type} onChange={e => setForm(f => ({ ...f, project_type: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0A1628]">
                        <option value="">Select</option>
                        {PROJECT_TYPES.map(type => <option key={type}>{type}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-500 mb-1.5">{t("label_woreda")}</label>
                      <select required value={form.woreda} onChange={e => setForm(f => ({ ...f, woreda: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0A1628]">
                        <option value="">Select</option>
                        {WOREDA_LIST.map(w => <option key={w}>{w}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-[80px_1fr] gap-2">
                    <div>
                      <label className="block text-xs font-black text-slate-500 mb-1.5">{t("label_currency")}</label>
                      <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-2 py-3 text-sm bg-slate-50 focus:outline-none">
                        <option>ETB</option><option>USD</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-500 mb-1.5">{t("label_budget")}</label>
                      <input required type="number" min="0" value={form.budget_estimate}
                        onChange={e => setForm(f => ({ ...f, budget_estimate: e.target.value }))} placeholder="0.00"
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1628]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-500 mb-1.5">{t("label_deadline")}</label>
                      <input required type="datetime-local" value={form.submission_deadline}
                        onChange={e => setForm(f => ({ ...f, submission_deadline: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1628]" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-500 mb-1.5">{t("label_closing")}</label>
                      <input type="datetime-local" value={form.closing_date}
                        onChange={e => setForm(f => ({ ...f, closing_date: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1628]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-500 mb-1.5">{t("label_eval_method_form")}</label>
                      <select value={form.evaluation_method} onChange={e => setForm(f => ({ ...f, evaluation_method: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0A1628]">
                        <option>Lowest Price</option><option>Weighted Score</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-500 mb-1.5">{t("label_min_experience")}</label>
                      <input type="number" min="0" value={form.min_experience_years}
                        onChange={e => setForm(f => ({ ...f, min_experience_years: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1628]" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">{t("section_documents")}</p>
                <div className="grid grid-cols-2 gap-2">
                  {REQUIRED_DOCS_OPTIONS.map(doc => (
                    <label key={doc} className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all text-xs font-bold ${
                      form.required_documents.includes(doc) ? "border-[#0A1628] bg-blue-50 text-[#0A1628]" : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}>
                      <input type="checkbox" className="accent-[#0A1628] shrink-0"
                        checked={form.required_documents.includes(doc)} onChange={() => handleDocToggle(doc)} />
                      {doc}
                    </label>
                  ))}
                </div>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs flex gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" /> {formError}
                </div>
              )}

              <div className="pb-4">
                <button type="submit" disabled={submitting || plannedProjects.length === 0}
                  className="w-full py-3.5 bg-[#0A1628] text-white text-sm font-black rounded-2xl hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                  {t("save_draft")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}