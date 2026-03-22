"use client";
// src/app/[locale]/admin/tenders/bids/page.tsx

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/actions/supabase/clients";
import Link from "next/link";
import {
  ArrowLeft, Trophy, Star, Loader2, ChevronDown, ChevronUp,
  FileText, CheckCircle2, XCircle, Clock, Filter,
  Building2, Phone, Mail, MapPin, Hash, Briefcase,
  BarChart3, AlertTriangle, Eye, RefreshCw, Layers,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
type BidSubmission = {
  id: string; submission_ref: string; tender_id: string;
  company_name: string; tin_number: string; license_number: string;
  contact_person: string; contact_email: string; contact_phone: string;
  physical_address: string | null; years_of_experience: number;
  financial_offer: number; currency: string;
  technical_approach: string | null; project_timeline_days: number | null;
  status: string; technical_score: number; financial_score: number;
  evaluation_notes: string | null; is_shortlisted: boolean; is_winner: boolean;
  admin_notes: string | null; created_at: string; awarded_at: string | null;
  tenders?: {
    ref_no: string; title: string; status: string;
    budget_estimate: number; evaluation_method: string; currency: string;
    project_id: string | null;
  };
};

type TenderGroup = {
  tender_id: string; ref_no: string; title: string; status: string;
  budget_estimate: number; evaluation_method: string; currency: string;
  project_id: string | null; submissions: BidSubmission[];
};

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return n.toLocaleString();
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  "Submitted":    { label: "Submitted",    bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-400"   },
  "Under Review": { label: "Under Review", bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400"  },
  "Shortlisted":  { label: "Shortlisted",  bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-400" },
  "Rejected":     { label: "Rejected",     bg: "bg-red-50",    text: "text-red-600",    dot: "bg-red-400"    },
  "Awarded":      { label: "Awarded",      bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500"  },
};

const TENDER_STATUS_CSS: Record<string, string> = {
  "Open":             "bg-emerald-100 text-emerald-700",
  "Closed":           "bg-slate-100 text-slate-600",
  "Under Evaluation": "bg-violet-100 text-violet-700",
  "Awarded":          "bg-blue-100 text-blue-700",
  "Contract Signed":  "bg-teal-100 text-teal-700",
};

// ── Page ───────────────────────────────────────────────────────────────────
export default function BidManagementPage() {
  const locale   = useLocale();
  const supabase = useRef(createClient()).current;

  const [groups,      setGroups]      = useState<TenderGroup[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const [detailOpen,  setDetailOpen]  = useState<string | null>(null);
  const [processing,  setProcessing]  = useState<string | null>(null);
  const [toast,       setToast]       = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [scores, setScores] = useState<Record<string, {
    technical: string; financial: string; notes: string; admin_notes: string;
  }>>({});

  // ── Load ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bid_submissions")
      .select(`
        id, submission_ref, tender_id, company_name, tin_number, license_number,
        contact_person, contact_email, contact_phone, physical_address,
        years_of_experience, financial_offer, currency, technical_approach,
        project_timeline_days, status, technical_score, financial_score,
        evaluation_notes, is_shortlisted, is_winner, admin_notes,
        created_at, awarded_at,
        tenders(ref_no, title, status, budget_estimate, evaluation_method, currency, project_id)
      `)
      .order("created_at", { ascending: false });

    if (error) { showToast(error.message, "error"); setLoading(false); return; }

    const map = new Map<string, TenderGroup>();
    for (const sub of (data ?? []) as BidSubmission[]) {
      const tid = sub.tender_id;
      if (!map.has(tid)) {
        map.set(tid, {
          tender_id:         tid,
          ref_no:            sub.tenders?.ref_no            ?? "—",
          title:             sub.tenders?.title             ?? "Unknown Tender",
          status:            sub.tenders?.status            ?? "—",
          budget_estimate:   sub.tenders?.budget_estimate   ?? 0,
          evaluation_method: sub.tenders?.evaluation_method ?? "Lowest Price",
          currency:          sub.tenders?.currency          ?? "ETB",
          project_id:        sub.tenders?.project_id        ?? null,
          submissions:       [],
        });
      }
      map.get(tid)!.submissions.push(sub);
    }
    setGroups(Array.from(map.values()));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type }); setTimeout(() => setToast(null), 4000);
  }

  function scoreFor(sub: BidSubmission) {
    return scores[sub.id] ?? {
      technical:   String(sub.technical_score  ?? 0),
      financial:   String(sub.financial_score  ?? 0),
      notes:       sub.evaluation_notes        ?? "",
      admin_notes: sub.admin_notes             ?? "",
    };
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  async function handleStatusChange(subId: string, status: string) {
    setProcessing(subId);
    const { error } = await supabase
      .from("bid_submissions")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", subId);
    if (error) showToast(error.message, "error");
    else { showToast(`Status → ${status}`, "success"); load(); }
    setProcessing(null);
  }

  async function handleSaveScore(sub: BidSubmission) {
    const s = scoreFor(sub);
    setProcessing(sub.id);
    const { error } = await supabase.from("bid_submissions").update({
      technical_score:  Number(s.technical)  || 0,
      financial_score:  Number(s.financial)  || 0,
      evaluation_notes: s.notes              || null,
      admin_notes:      s.admin_notes        || null,
      status:           "Under Review",
      reviewed_at:      new Date().toISOString(),
    }).eq("id", sub.id);
    if (error) showToast(error.message, "error");
    else { showToast("Scores saved", "success"); load(); }
    setProcessing(null);
  }

  async function handleShortlist(subId: string, current: boolean) {
    setProcessing(subId);
    const { error } = await supabase.from("bid_submissions").update({
      is_shortlisted: !current,
      status: !current ? "Shortlisted" : "Under Review",
    }).eq("id", subId);
    if (error) showToast(error.message, "error");
    else { showToast(!current ? "Shortlisted" : "Removed from shortlist", "success"); load(); }
    setProcessing(null);
  }

  // Award → mark winner + Awarded tender + advance project to Design Phase
  async function handleAward(sub: BidSubmission, group: TenderGroup) {
    if (!confirm(`Award contract to ${sub.company_name}?\n\nThis will:\n• Mark this bid as the winner\n• Set the tender status to Awarded\n• Move the linked project to Design Phase`)) return;
    setProcessing(sub.id);

    // 1. Mark winning submission
    const { error: e1 } = await supabase.from("bid_submissions").update({
      is_winner: true, status: "Awarded", awarded_at: new Date().toISOString(),
    }).eq("id", sub.id);

    // 2. Flip tender → Awarded
    const { error: e2 } = await supabase.from("tenders").update({
      status: "Awarded", updated_at: new Date().toISOString(),
    }).eq("tender_id", group.tender_id);

    // 3. Advance linked project → Design Phase (if project is linked and still at Planned)
    let projectAdvanced = false;
    if (group.project_id) {
      const { error: e3 } = await supabase.from("projects")
        .update({ status: "Design Phase", updated_at: new Date().toISOString() })
        .eq("id", group.project_id)
        .in("status", ["Planned", "Awarded"]);
      projectAdvanced = !e3;
    }

    if (e1 || e2) {
      showToast((e1 || e2)!.message, "error");
    } else {
      const extra = projectAdvanced ? " · Project moved to Design Phase ✓" : "";
      showToast(`Contract awarded to ${sub.company_name}${extra}`, "success");
      load();
    }
    setProcessing(null);
  }

  async function handleCloseForEvaluation(group: TenderGroup) {
    if (!confirm(`Close tender "${group.title}" for bid evaluation?`)) return;
    setProcessing(group.tender_id);
    const { error } = await supabase.from("tenders").update({
      status: "Under Evaluation", updated_at: new Date().toISOString(),
    }).eq("tender_id", group.tender_id);
    if (error) showToast(error.message, "error");
    else { showToast("Tender closed for evaluation", "success"); load(); }
    setProcessing(null);
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const allSubs      = groups.flatMap(g => g.submissions);
  const totalSubs    = allSubs.length;
  const pendingCount = allSubs.filter(s => s.status === "Submitted").length;
  const reviewCount  = allSubs.filter(s => s.status === "Under Review").length;
  const shortCount   = allSubs.filter(s => s.is_shortlisted).length;
  const awardCount   = allSubs.filter(s => s.is_winner).length;

  const filteredGroups = groups.filter(g =>
    filterStatus === "All" ? true : g.submissions.some(s => s.status === filterStatus)
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F4F6F9] p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/${locale}/admin/tenders`}
            className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-black uppercase tracking-tight text-[#2C2C2C]">Bid Management</h1>
            <p className="text-sm font-bold text-slate-500">
              Review, evaluate and award public bid submissions
            </p>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { label: "Total",        val: totalSubs,    color: "#0A1628" },
            { label: "New",          val: pendingCount, color: "#2980B9" },
            { label: "Under Review", val: reviewCount,  color: "#E85D1A" },
            { label: "Shortlisted",  val: shortCount,   color: "#8E44AD" },
            { label: "Awarded",      val: awardCount,   color: "#039737" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{s.label}</p>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter size={14} className="text-slate-400" />
          {["All","Submitted","Under Review","Shortlisted","Rejected","Awarded"].map(f => (
            <button key={f} onClick={() => setFilterStatus(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-black border transition-colors ${
                filterStatus === f
                  ? "bg-[#0A1628] text-white border-[#0A1628]"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
              }`}>{f}</button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <Loader2 size={24} className="animate-spin mr-2" /> Loading submissions…
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="bg-white rounded-[2rem] border border-slate-200 p-16 text-center">
            <FileText size={48} className="text-slate-200 mx-auto mb-4" strokeWidth={1} />
            <p className="font-black text-slate-400 text-lg">No bid submissions yet</p>
            <p className="text-slate-400 text-sm mt-2">Submissions from the public tender portal will appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredGroups.map(group => {
              const isExpanded = expanded === group.tender_id;
              const winner     = group.submissions.find(s => s.is_winner);
              const tCss       = TENDER_STATUS_CSS[group.status] ?? "bg-slate-100 text-slate-500";
              const isEval     = group.status === "Under Evaluation";

              const sortedSubs = [...group.submissions].sort((a, b) => {
                if (a.is_winner !== b.is_winner) return a.is_winner ? -1 : 1;
                const sa = (a.technical_score||0) + (a.financial_score||0);
                const sb = (b.technical_score||0) + (b.financial_score||0);
                return sb !== sa ? sb - sa : a.financial_offer - b.financial_offer;
              });

              return (
                <div key={group.tender_id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">

                  {/* Tender row */}
                  <div className="p-6 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-black text-slate-400 font-mono">{group.ref_no}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${tCss}`}>{group.status}</span>
                        <span className="text-[10px] text-slate-400">{group.submissions.length} submission{group.submissions.length !== 1?"s":""}</span>
                        {winner && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                            <Trophy size={9} /> Awarded
                          </span>
                        )}
                        {group.project_id && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 flex items-center gap-1">
                            <Layers size={9} /> Linked to project
                          </span>
                        )}
                      </div>
                      <h3 className="font-black text-[#2C2C2C] text-lg leading-tight">{group.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {group.evaluation_method} · Budget: {fmt(group.budget_estimate)} {group.currency}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {group.status === "Open" && group.submissions.length > 0 && !winner && (
                        <button onClick={() => handleCloseForEvaluation(group)}
                          disabled={processing === group.tender_id}
                          className="px-4 py-2 bg-violet-600 text-white text-xs font-black rounded-xl hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2">
                          {processing === group.tender_id ? <Loader2 size={12} className="animate-spin"/> : <BarChart3 size={12}/>}
                          Close for Evaluation
                        </button>
                      )}
                      <button onClick={() => setExpanded(isExpanded ? null : group.tender_id)}
                        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                        {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                      </button>
                    </div>
                  </div>

                  {/* Submissions */}
                  {isExpanded && (
                    <div className="border-t border-slate-100">
                      {sortedSubs.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 text-sm">No submissions for this tender.</div>
                      ) : sortedSubs.map((sub, idx) => {
                        const sc         = STATUS_CFG[sub.status] ?? STATUS_CFG["Submitted"];
                        const totalScore = (sub.technical_score||0) + (sub.financial_score||0);
                        const isTopBid   = idx === 0 && !sub.is_winner && totalScore > 0;
                        const isDetail   = detailOpen === sub.id;
                        const ed         = scoreFor(sub);

                        return (
                          <div key={sub.id}
                            className={`border-b border-slate-100 last:border-0 ${sub.is_winner ? "bg-green-50" : isTopBid ? "bg-amber-50/40" : ""}`}>
                            <div className="p-6">

                              {/* Top row */}
                              <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div className="flex items-start gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${
                                    sub.is_winner ? "bg-green-500 text-white"
                                    : isTopBid    ? "bg-amber-400 text-white"
                                    : "bg-slate-100 text-slate-500"
                                  }`}>
                                    {sub.is_winner ? <Trophy size={14}/> : isTopBid ? <Star size={14}/> : idx+1}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-black text-[#2C2C2C]">{sub.company_name}</p>
                                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${sc.bg} ${sc.text}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/>{sc.label}
                                      </span>
                                      {sub.is_shortlisted && !sub.is_winner && (
                                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">Shortlisted</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">{sub.submission_ref} · {fmtDate(sub.created_at)}</p>
                                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 flex-wrap">
                                      <span className="flex items-center gap-1"><Mail size={10}/>{sub.contact_email}</span>
                                      <span className="flex items-center gap-1"><Phone size={10}/>{sub.contact_phone}</span>
                                      <span className="flex items-center gap-1"><Briefcase size={10}/>{sub.years_of_experience}y exp</span>
                                      <span className="flex items-center gap-1"><Hash size={10}/>TIN: {sub.tin_number}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-black text-[#0A1628] text-lg">{fmt(sub.financial_offer)} {sub.currency}</p>
                                  <p className="text-[10px] text-slate-400">Financial Offer</p>
                                  {totalScore > 0 && <p className="text-xs font-black text-violet-600 mt-1">Score: {totalScore}/100</p>}
                                  {sub.project_timeline_days && <p className="text-[10px] text-slate-400">{sub.project_timeline_days}d timeline</p>}
                                </div>
                              </div>

                              {/* Score bars */}
                              {totalScore > 0 && (
                                <div className="mt-4 grid grid-cols-3 gap-3">
                                  {[
                                    { label:"Technical", val:sub.technical_score, max:70, color:"#0A1628" },
                                    { label:"Financial",  val:sub.financial_score, max:30, color:"#039737" },
                                    { label:"Total",      val:totalScore,          max:100,color:"#8E44AD" },
                                  ].map(s => (
                                    <div key={s.label} className="bg-slate-50 rounded-xl p-3">
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{s.label}</p>
                                      <p className="text-lg font-black" style={{color:s.color}}>{s.val}</p>
                                      <div className="w-full bg-slate-200 rounded-full h-1 mt-1">
                                        <div className="h-1 rounded-full transition-all" style={{width:`${Math.min(100,(s.val/s.max)*100)}%`,backgroundColor:s.color}}/>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Action buttons */}
                              <div className="mt-4 flex items-center gap-2 flex-wrap">
                                <button onClick={() => setDetailOpen(isDetail ? null : sub.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors">
                                  <Eye size={12}/> {isDetail ? "Hide" : "View Details"}
                                </button>
                                {!sub.is_winner && sub.status !== "Awarded" && (
                                  <>
                                    {sub.status === "Submitted" && (
                                      <button onClick={() => handleStatusChange(sub.id, "Under Review")}
                                        disabled={processing===sub.id}
                                        className="px-3 py-1.5 bg-amber-500 text-white text-xs font-black rounded-xl hover:bg-amber-600 disabled:opacity-50 flex items-center gap-1.5">
                                        {processing===sub.id ? <Loader2 size={11} className="animate-spin"/> : <Clock size={11}/>}
                                        Under Review
                                      </button>
                                    )}
                                    <button onClick={() => handleShortlist(sub.id, sub.is_shortlisted)}
                                      disabled={processing===sub.id}
                                      className={`px-3 py-1.5 text-xs font-black rounded-xl disabled:opacity-50 flex items-center gap-1.5 transition-colors ${
                                        sub.is_shortlisted
                                          ? "bg-violet-100 text-violet-700 hover:bg-violet-200"
                                          : "bg-violet-600 text-white hover:bg-violet-700"
                                      }`}>
                                      <Star size={11}/> {sub.is_shortlisted ? "Remove" : "Shortlist"}
                                    </button>
                                    <button onClick={() => handleStatusChange(sub.id,"Rejected")}
                                      disabled={processing===sub.id}
                                      className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-black rounded-xl hover:bg-red-100 disabled:opacity-50 flex items-center gap-1.5">
                                      <XCircle size={11}/> Reject
                                    </button>
                                  </>
                                )}
                                {(isEval || sub.is_shortlisted) && !sub.is_winner && sub.status !== "Rejected" && (
                                  <button onClick={() => handleAward(sub, group)}
                                    disabled={processing===sub.id}
                                    className="px-4 py-1.5 bg-green-600 text-white text-xs font-black rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5 ml-auto">
                                    {processing===sub.id ? <Loader2 size={12} className="animate-spin"/> : <Trophy size={12}/>}
                                    Award Contract
                                  </button>
                                )}
                                {sub.is_winner && (
                                  <div className="ml-auto flex items-center gap-2 text-green-700 text-xs font-black bg-green-100 px-4 py-1.5 rounded-xl">
                                    <Trophy size={13}/> Contract Awarded
                                    {sub.awarded_at && <span className="font-normal opacity-70">· {fmtDate(sub.awarded_at)}</span>}
                                  </div>
                                )}
                              </div>

                              {/* Detail panel */}
                              {isDetail && (
                                <div className="mt-4 bg-slate-50 rounded-2xl p-5 space-y-5 border border-slate-200">
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <IC icon={<Building2 size={11}/>} label="Company"    value={sub.company_name}/>
                                    <IC icon={<Hash size={11}/>}      label="TIN Number" value={sub.tin_number}/>
                                    <IC icon={<Hash size={11}/>}      label="License"    value={sub.license_number}/>
                                    <IC icon={<Mail size={11}/>}      label="Email"      value={sub.contact_email}/>
                                    <IC icon={<Phone size={11}/>}     label="Phone"      value={sub.contact_phone}/>
                                    <IC icon={<MapPin size={11}/>}    label="Address"    value={sub.physical_address ?? "—"}/>
                                  </div>
                                  {sub.technical_approach && (
                                    <div>
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Technical Approach</p>
                                      <p className="text-xs text-slate-600 leading-relaxed bg-white rounded-xl p-3 border border-slate-200">{sub.technical_approach}</p>
                                    </div>
                                  )}

                                  {/* Scoring panel */}
                                  {!sub.is_winner && sub.status !== "Rejected" && (
                                    <div className="border-t border-slate-200 pt-5">
                                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <BarChart3 size={12}/> Score This Bid
                                      </p>
                                      <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                          <label className="text-[10px] font-black text-slate-500 block mb-1">Technical Score (0–70)</label>
                                          <input type="number" min="0" max="70" value={ed.technical}
                                            onChange={e => setScores(s => ({...s,[sub.id]:{...scoreFor(sub),...s[sub.id],technical:e.target.value}}))}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1628] bg-white"/>
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-black text-slate-500 block mb-1">Financial Score (0–30)</label>
                                          <input type="number" min="0" max="30" value={ed.financial}
                                            onChange={e => setScores(s => ({...s,[sub.id]:{...scoreFor(sub),...s[sub.id],financial:e.target.value}}))}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1628] bg-white"/>
                                        </div>
                                      </div>
                                      <input placeholder="Evaluation notes…" value={ed.notes}
                                        onChange={e => setScores(s => ({...s,[sub.id]:{...scoreFor(sub),...s[sub.id],notes:e.target.value}}))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1628] bg-white mb-2"/>
                                      <input placeholder="Internal admin notes (not visible to bidder)…" value={ed.admin_notes}
                                        onChange={e => setScores(s => ({...s,[sub.id]:{...scoreFor(sub),...s[sub.id],admin_notes:e.target.value}}))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1628] bg-white mb-3"/>
                                      <div className="flex gap-2">
                                        <button onClick={() => handleSaveScore(sub)} disabled={processing===sub.id}
                                          className="flex items-center gap-2 px-4 py-2 bg-[#0A1628] text-white text-xs font-black rounded-xl hover:bg-slate-800 disabled:opacity-50">
                                          {processing===sub.id && <Loader2 size={11} className="animate-spin"/>}
                                          <CheckCircle2 size={12}/> Save Scores
                                        </button>
                                        {(isEval || sub.is_shortlisted) && (
                                          <button onClick={() => handleAward(sub,group)} disabled={processing===sub.id}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-black rounded-xl hover:bg-green-700 disabled:opacity-50">
                                            <Trophy size={12}/> Award Contract
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold text-white z-50 max-w-sm flex items-center gap-3 ${
          toast.type==="success" ? "bg-green-600" : "bg-red-500"
        }`}>
          {toast.type==="success" ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function IC({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">{icon}{label}</p>
      <p className="text-xs font-bold text-slate-700 break-all">{value}</p>
    </div>
  );
}