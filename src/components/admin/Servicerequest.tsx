"use client";
// src/app/[locale]/admin/service-requests/page.tsx
// ── LOCALIZED via useTranslations("Admin.service_requests")
// ── Status workflow: Pending → In Review → Approved/Rejected → Completed
// ── Inline notes + assignment saving

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/actions/supabase/clients";
import {
  Inbox, Search, Loader2, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Clock, Eye, AlertCircle,
  User, MapPin, Phone, Mail, FileText, Save
} from "lucide-react";
import { toast } from "sonner";

type ServiceRequest = {
  id: string;
  ref_code: string;
  service_type: string;
  name: string;
  phone: string;
  email: string | null;
  location: string | null;
  description: string;
  existing_ref: string | null;
  lang: string;
  status: string;
  admin_notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  pending:     { bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-500"   },
  in_review:   { bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500"    },
  approved:    { bg: "bg-green-100",   text: "text-green-700",   dot: "bg-green-500"   },
  rejected:    { bg: "bg-red-100",     text: "text-red-700",     dot: "bg-red-500"     },
  completed:   { bg: "bg-slate-100",   text: "text-slate-600",   dot: "bg-slate-400"   },
};

const FILTER_OPTIONS = ["all", "pending", "in_review", "approved", "rejected"];

export default function ServiceRequestsPage() {
  const t = useTranslations("Admin.service_requests");
  const supabase = createClient();

  const [requests, setRequests]   = useState<ServiceRequest[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, { notes: string; assigned: string }>>({});

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("service_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setRequests((data as ServiceRequest[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return requests.filter(r => {
      const matchSearch = !search ||
        r.ref_code.toLowerCase().includes(search.toLowerCase()) ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.phone.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "all" || r.status === filter;
      return matchSearch && matchFilter;
    });
  }, [requests, search, filter]);

  // Counts per status
  const countByStatus = useMemo(() => {
    const c: Record<string, number> = { all: requests.length };
    FILTER_OPTIONS.slice(1).forEach(s => { c[s] = requests.filter(r => r.status === s).length; });
    return c;
  }, [requests]);

  async function handleStatusChange(req: ServiceRequest, newStatus: string) {
    setProcessing(req.id);
    const { error } = await supabase
      .from("service_requests")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", req.id);
    if (error) toast.error(t("toast_update_failed"));
    else { toast.success(t("toast_status_updated").replace("{status}", newStatus)); load(); }
    setProcessing(null);
  }

  async function handleSaveNotes(req: ServiceRequest) {
    const draft = notesDraft[req.id];
    if (!draft) return;
    setProcessing(req.id + "_notes");
    const { error } = await supabase
      .from("service_requests")
      .update({ admin_notes: draft.notes, assigned_to: draft.assigned || null, updated_at: new Date().toISOString() })
      .eq("id", req.id);
    if (error) toast.error(t("toast_update_failed"));
    else { toast.success(t("toast_notes_saved")); load(); }
    setProcessing(null);
  }

  function getDraftNotes(req: ServiceRequest) {
    return notesDraft[req.id] ?? { notes: req.admin_notes || "", assigned: req.assigned_to || "" };
  }

  function setDraftNotes(id: string, key: "notes" | "assigned", val: string) {
    setNotesDraft(n => ({ ...n, [id]: { ...getDraftNoteById(id), [key]: val } }));
  }
  function getDraftNoteById(id: string): { notes: string; assigned: string } {
    const req = requests.find(r => r.id === id);
    return notesDraft[id] ?? { notes: req?.admin_notes || "", assigned: req?.assigned_to || "" };
  }

  function getTypeLabel(type: string): string {
    const map: Record<string, string> = {
      construction_permit: t("type_construction_permit"),
      renovation_permit:   t("type_renovation_permit"),
      demolition_permit:   t("type_demolition_permit"),
      occupancy_certificate: t("type_occupancy_certificate"),
      site_inspection_request: t("type_site_inspection_request"),
      complaint:           t("type_complaint"),
      information_request: t("type_information_request"),
      other:               t("type_other"),
    };
    return map[type] || type;
  }

  function StatusBadge({ status }: { status: string }) {
    const style = STATUS_STYLES[status] ?? { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };
    const labelMap: Record<string, string> = {
      pending: t("status_pending"), in_review: t("status_in_review"),
      approved: t("status_approved"), rejected: t("status_rejected"), completed: t("status_completed"),
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${style.bg} ${style.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        {labelMap[status] || status}
      </span>
    );
  }

  return (
    <div className="space-y-6 min-h-screen" style={{ backgroundColor: "#F4F6F9" }}>

      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl shadow-xl text-white bg-[#0A1628]">
            <Inbox size={30} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-[#2C2C2C]">{t("title")}</h1>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{t("subtitle")}</p>
          </div>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("search_placeholder")}
            className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none w-64 focus:ring-2 focus:ring-[#0A1628]/10" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">✕</button>}
        </div>
      </header>

      {/* STATUS FILTER BAR */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
        {FILTER_OPTIONS.map(opt => {
          const isActive = filter === opt;
          const style = STATUS_STYLES[opt] ?? { bg: "bg-transparent", text: "text-slate-500", dot: "bg-slate-400" };
          const labelMap: Record<string, string> = {
            all: t("filter_all"), pending: t("filter_pending"), in_review: t("filter_in_review"),
            approved: t("filter_approved"), rejected: t("filter_rejected"),
          };
          return (
            <button key={opt} onClick={() => setFilter(opt)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                isActive ? `bg-[#0A1628] text-white shadow-md` : `${style.bg} ${style.text} hover:opacity-80`
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white/70" : style.dot}`} />
              {labelMap[opt]}
              <span className={`ml-1 px-1.5 py-0.5 rounded text-[8px] font-black ${isActive ? "bg-white/20 text-white" : "bg-white/80 text-slate-400 border border-slate-200"}`}>
                {countByStatus[opt] ?? 0}
              </span>
            </button>
          );
        })}
        <div className="ml-auto pr-2 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#039737] animate-pulse" />
          <span className="text-[10px] font-black uppercase text-[#039737]">
            {filtered.length} {filtered.length !== 1 ? t("records_found_plural").replace("{n}", String(filtered.length)) : t("records_found").replace("{n}", String(filtered.length))}
          </span>
        </div>
      </div>

      {/* LIST */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-[2rem] border border-slate-200">
          <Loader2 size={32} className="animate-spin text-[#0A1628] mr-3" />
          <span className="text-xs font-black uppercase text-slate-400">{t("loading")}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 py-24 text-center">
          <Inbox size={40} className="text-slate-200 mx-auto mb-4" />
          <h3 className="font-black text-slate-400">{t("no_records_title")}</h3>
          <p className="text-xs text-slate-400 mt-1">{t("no_records_body")}</p>
          {(search || filter !== "all") && (
            <button onClick={() => { setSearch(""); setFilter("all"); }}
              className="mt-4 text-[10px] font-black uppercase text-[#0A1628] hover:underline tracking-widest">{t("clear_filters")}</button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[80px_2fr_1.5fr_1.5fr_1fr_120px_40px] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100">
            {[t("col_ref"), t("col_citizen"), t("col_type"), t("col_location"), t("col_status"), t("col_submitted"), ""].map((h, i) => (
              <p key={i} className="text-[10px] font-black uppercase text-slate-400">{h}</p>
            ))}
          </div>

          <div className="divide-y divide-slate-50">
            {filtered.map(req => {
              const draft = getDraftNotes(req);
              return (
                <div key={req.id}>
                  <div
                    className="grid grid-cols-[80px_2fr_1.5fr_1.5fr_1fr_120px_40px] gap-4 px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer items-center"
                    onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}>
                    <p className="text-[10px] font-mono font-black text-[#0A1628]">{req.ref_code}</p>
                    <div className="min-w-0">
                      <p className="font-black text-sm text-[#2C2C2C] truncate">{req.name}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1"><Phone size={9} />{req.phone}</p>
                    </div>
                    <p className="text-xs text-slate-600">{getTypeLabel(req.service_type)}</p>
                    <p className="text-xs text-slate-600 truncate">{req.location || "—"}</p>
                    <StatusBadge status={req.status} />
                    <p className="text-[11px] text-slate-400">{new Date(req.created_at).toLocaleDateString()}</p>
                    <div>{expandedId === req.id ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}</div>
                  </div>

                  {expandedId === req.id && (
                    <div className="px-6 pb-6 pt-2 bg-slate-50/60 border-t border-slate-100 space-y-5">
                      {/* Meta */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {req.email && (
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">{t("label_email")}</p>
                            <p className="text-xs font-bold text-slate-700 flex items-center gap-1"><Mail size={10} />{req.email}</p>
                          </div>
                        )}
                        {req.existing_ref && (
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">{t("label_existing_ref")}</p>
                            <p className="text-xs font-mono font-bold text-slate-700">{req.existing_ref}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">{t("label_language")}</p>
                          <p className="text-xs font-bold text-slate-700 uppercase">{req.lang}</p>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2">{t("label_description")}</p>
                        <p className="text-sm text-slate-600 bg-white rounded-xl p-4 border border-slate-100">{req.description}</p>
                      </div>

                      {/* Notes & Assignment */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">{t("label_admin_notes")}</label>
                          <textarea rows={3} value={draft.notes} placeholder={t("admin_notes_placeholder")}
                            onChange={e => setDraftNotes(req.id, "notes", e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1628] resize-none bg-white" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">{t("label_assigned_to")}</label>
                          <input value={draft.assigned} placeholder={t("assign_placeholder")}
                            onChange={e => setDraftNotes(req.id, "assigned", e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1628] bg-white" />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => handleSaveNotes(req)} disabled={processing === req.id + "_notes"}
                          className="flex items-center gap-2 px-4 py-2 bg-[#0A1628] text-white text-xs font-black rounded-xl hover:bg-slate-800 disabled:opacity-50">
                          {processing === req.id + "_notes" ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                          {t("save_notes")}
                        </button>
                        {req.status === "pending" && (
                          <button onClick={() => handleStatusChange(req, "in_review")} disabled={!!processing}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 disabled:opacity-50">
                            <Eye size={13} /> {t("action_review")}
                          </button>
                        )}
                        {(req.status === "pending" || req.status === "in_review") && (
                          <>
                            <button onClick={() => handleStatusChange(req, "approved")} disabled={!!processing}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-black rounded-xl hover:bg-green-700 disabled:opacity-50">
                              {processing === req.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                              {t("action_approve")}
                            </button>
                            <button onClick={() => handleStatusChange(req, "rejected")} disabled={!!processing}
                              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-xs font-black rounded-xl hover:bg-red-600 disabled:opacity-50">
                              <XCircle size={13} /> {t("action_reject")}
                            </button>
                          </>
                        )}
                        {req.status === "approved" && (
                          <button onClick={() => handleStatusChange(req, "completed")} disabled={!!processing}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white text-xs font-black rounded-xl hover:bg-slate-800 disabled:opacity-50">
                            <CheckCircle2 size={13} /> {t("action_complete")}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}