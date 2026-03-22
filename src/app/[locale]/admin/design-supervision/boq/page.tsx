"use client";
// src/app/[locale]/admin/design-supervision/boq/page.tsx

import React, { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/actions/supabase/clients";
import {
  ArrowLeft, CheckCircle2, Flag, Loader2,
  RefreshCw, Info, FileSpreadsheet, ChevronDown, ChevronUp, AlertTriangle
} from "lucide-react";
import Link from "next/link";

type BOQItem = {
  id: string;
  project_id: string;
  item_description: string;
  category: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  audit_remarks: string | null;
  flagged_at: string | null;
};

type Project = {
  id: string;
  name: string;
  status: string;
  sector: string;
  location: string;
  budget: number;
  boq_approved_at: string | null;
  items: BOQItem[];
};

const CATEGORY_COLORS: Record<string, string> = {
  Materials: "bg-blue-50 text-blue-700",
  Labor:     "bg-emerald-50 text-emerald-700",
  Equipment: "bg-amber-50 text-amber-700",
  Overhead:  "bg-purple-50 text-purple-700",
};

// ── BUG FIXED: category label map — DB stores English keys, we translate for display
const CATEGORY_KEY: Record<string, string> = {
  Materials: "cat_materials",
  Labor:     "cat_labor",
  Equipment: "cat_equipment",
  Overhead:  "cat_overhead",
};

export default function BOQVerificationPage() {
  const t = useTranslations("Admin.boq");
  const supabase = createClient();

  const [projects,   setProjects]   = useState<Project[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [remarks,    setRemarks]    = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast,      setToast]      = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: pData } = await supabase
      .from("projects")
      .select("id, name, status, sector, location, budget, boq_approved_at")
      .in("status", ["BOQ Verification", "Design Phase", "Ongoing"])
      .order("name");

    if (!pData) { setLoading(false); return; }

    const ids = pData.map(p => p.id);
    const { data: bData } = await supabase
      .from("boq_items")
      .select("id, project_id, item_description, category, unit, quantity, unit_price, total_price, status, audit_remarks, flagged_at")
      .in("project_id", ids)
      .order("category");

    const byProject: Record<string, BOQItem[]> = {};
    for (const item of (bData || [])) {
      if (!byProject[item.project_id]) byProject[item.project_id] = [];
      byProject[item.project_id].push(item as BOQItem);
    }

    setProjects(pData.map(p => ({ ...p, items: byProject[p.id] || [] })));
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleItem(itemId: string, newStatus: "Verified" | "Flagged") {
    setProcessing(itemId);
    const update: Record<string, unknown> = { status: newStatus };
    if (newStatus === "Flagged") {
      update.audit_remarks = remarks[itemId] || t("status_flagged");
      update.flagged_at    = new Date().toISOString();
    }
    const { error } = await supabase.from("boq_items").update(update).eq("id", itemId);
    if (error) showToast(error.message, "error");
    else {
      showToast(
        newStatus === "Verified" ? t("toast_verified") : t("toast_flagged"),
        "success"
      );
      load();
    }
    setProcessing(null);
  }

  async function handleVerifyAll(projectId: string, items: BOQItem[]) {
    const pending = items.filter(i => i.status === "Pending");
    if (pending.length === 0) return;
    setProcessing(projectId);
    const { error } = await supabase
      .from("boq_items")
      .update({ status: "Verified" })
      .in("id", pending.map(i => i.id));
    if (error) showToast(error.message, "error");
    else { showToast(t("toast_all_verified"), "success"); load(); }
    setProcessing(null);
  }

  const TABLE_HEADERS: string[] = [
    "col_description","col_category","col_qty","col_unit",
    "col_unit_price","col_total","col_status","col_action",
  ];

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
          </div>

          {/* Info banner */}
          <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-4 mb-6 flex gap-3">
            <Info size={16} className="text-cyan-500 shrink-0 mt-0.5" />
            <p className="text-sm text-cyan-700">
              <strong>{t("info_title")}:</strong> {t("info_body")}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-slate-400">
              <Loader2 size={24} className="animate-spin mr-2" /> {t("loading")}
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-white rounded-[2rem] border border-slate-200 p-16 text-center">
              <FileSpreadsheet size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="font-black text-slate-400">{t("no_projects")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map(project => {
                const verified = project.items.filter(i => i.status === "Verified").length;
                const flagged  = project.items.filter(i => i.status === "Flagged").length;
                const pending  = project.items.filter(i => i.status === "Pending").length;
                const total    = project.items.length;
                const allDone  = total > 0 && pending === 0 && flagged === 0;
                const boqTotal = project.items.reduce((s, i) => s + Number(i.total_price), 0);
                const isOpen   = expanded === project.id;

                return (
                  <div key={project.id} className={`bg-white rounded-[2rem] border shadow-sm overflow-hidden ${
                    project.status === "BOQ Verification" ? "border-cyan-300" : "border-slate-200"
                  }`}>

                    {/* Accordion header */}
                    <div
                      className="p-6 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setExpanded(isOpen ? null : project.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                            project.status === "BOQ Verification" ? "bg-cyan-100 text-cyan-700"
                            : project.status === "Ongoing" ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                          }`}>{project.status}</span>
                          {pending > 0 && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              {t("pending_count", { n: pending  })}
                            </span>
                          )}
                          {flagged > 0 && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                              {t("flagged_count", { n: flagged  })}
                            </span>
                          )}
                          {allDone && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                              <CheckCircle2 size={9} /> {t("all_verified")}
                            </span>
                          )}
                        </div>
                        <h3 className="font-black text-slate-900 text-lg">{project.name}</h3>
                        <p className="text-xs text-slate-400">
                          {project.sector} · {t("items_count", { n: total  })} · {t("boq_total_label")}: {boqTotal.toLocaleString()} ETB · {t("budget_label")}: {Number(project.budget).toLocaleString()} ETB
                        </p>
                        {project.boq_approved_at && (
                          <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
                            {t("boq_approved")}: {new Date(project.boq_approved_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="hidden md:flex flex-col items-end gap-1">
                          <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-500 rounded-full transition-all"
                              style={{ width: total > 0 ? `${(verified / total) * 100}%` : "0%" }} />
                          </div>
                          <p className="text-[10px] font-black text-slate-400">
                            {t("verified_of", { verified: verified }).replace("{total}", String(total))}
                          </p>
                        </div>
                        {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="border-t border-slate-100">
                        {/* Verify All bar */}
                        {pending > 0 && (
                          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <p className="text-xs text-slate-500">
                              {t("items_pending_verify", { n: pending  })}
                            </p>
                            <button
                              onClick={() => handleVerifyAll(project.id, project.items)}
                              disabled={processing === project.id}
                              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white text-xs font-black rounded-xl hover:bg-cyan-700 disabled:opacity-50">
                              {processing === project.id
                                ? <Loader2 size={12} className="animate-spin" />
                                : <CheckCircle2 size={12} />}
                              {t("verify_all_pending")}
                            </button>
                          </div>
                        )}

                        {project.items.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-sm">{t("no_boq_items")}</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                  {TABLE_HEADERS.map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-[10px] font-black uppercase text-slate-400">
                                      {t(h)}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {project.items.map(item => (
                                  <tr key={item.id} className={item.status === "Flagged" ? "bg-red-50" : ""}>
                                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px]">
                                      <p className="truncate">{item.item_description}</p>
                                      {item.audit_remarks && (
                                        <p className="text-[11px] text-red-600 italic mt-0.5">{item.audit_remarks}</p>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category] || "bg-slate-100 text-slate-600"}`}>
                                        {t(CATEGORY_KEY[item.category] || "cat_other")}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{item.quantity}</td>
                                    <td className="px-4 py-3 text-slate-600">{item.unit}</td>
                                    <td className="px-4 py-3 text-slate-600">{Number(item.unit_price).toLocaleString()}</td>
                                    <td className="px-4 py-3 font-black text-slate-800">{Number(item.total_price).toLocaleString()}</td>
                                    <td className="px-4 py-3">
                                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                        item.status === "Verified" ? "bg-green-100 text-green-700"
                                        : item.status === "Flagged" ? "bg-red-100 text-red-700"
                                        : "bg-amber-100 text-amber-700"
                                      }`}>
                                        {/* ── BUG FIXED: status was rendered raw from DB without translation */}
                                        {item.status === "Verified" ? t("status_verified")
                                          : item.status === "Flagged" ? t("status_flagged")
                                          : t("status_pending")}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      {item.status === "Pending" && (
                                        <div className="flex gap-1.5">
                                          <button onClick={() => handleItem(item.id, "Verified")}
                                            disabled={processing === item.id}
                                            className="px-2.5 py-1.5 bg-green-600 text-white text-[10px] font-black rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
                                            {processing === item.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                                            {t("btn_verify")}
                                          </button>
                                          <button onClick={() => handleItem(item.id, "Flagged")}
                                            disabled={processing === item.id}
                                            className="px-2.5 py-1.5 bg-red-500 text-white text-[10px] font-black rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-1">
                                            <Flag size={10} /> {t("btn_flag")}
                                          </button>
                                        </div>
                                      )}
                                      {item.status === "Verified" && <CheckCircle2 size={16} className="text-green-500" />}
                                      {item.status === "Flagged"   && <AlertTriangle size={16} className="text-red-500" />}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-slate-50 border-t border-slate-200">
                                <tr>
                                  <td colSpan={5} className="px-4 py-3 text-xs font-black uppercase text-slate-500">
                                    {t("boq_total_footer")}
                                  </td>
                                  <td className="px-4 py-3 font-black text-slate-900">{boqTotal.toLocaleString()} ETB</td>
                                  <td colSpan={2} className={`px-4 py-3 text-xs font-black ${
                                    boqTotal > Number(project.budget) ? "text-red-600" : "text-green-600"
                                  }`}>
                                    {boqTotal > Number(project.budget) ? t("exceeds_budget") : t("within_budget")}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
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

      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold text-white z-50 max-w-md ${
          toast.type === "success" ? "bg-green-600" : "bg-red-500"
        }`}>{toast.msg}</div>
      )}
    </>
  );
}