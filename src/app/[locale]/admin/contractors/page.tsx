"use client";
// src/app/[locale]/admin/contractors/page.tsx

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Building2, ShieldCheck, ShieldAlert, Phone, Mail, Hash,
  FileText, Plus, RefreshCw, Search, Inbox,
  BadgeCheck, TrendingUp, X, Loader2, AlertTriangle,
  ExternalLink, Eye, CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/actions/supabase/clients";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────
type Contractor = {
  id: string;
  company_name: string;
  tin_number: string;
  license_number: string;
  contact_email: string;
  phone_number: string | null;
  physical_address: string | null;
  is_verified: boolean;
  created_at: string;
  project_count: number;
  active_projects: number;
  total_bid_value: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (!n) return "—";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B ETB";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + "M ETB";
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + "K ETB";
  return n.toLocaleString() + " ETB";
}

const EMPTY_FORM = {
  company_name: "", tin_number: "", license_number: "",
  contact_email: "", phone_number: "", physical_address: "",
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ContractorsPage() {
  const t        = useTranslations("Admin.contractors_module");
  const locale   = useLocale();
  const supabase = useRef(createClient()).current;

  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [error,       setError]       = useState<string | null>(null);

  const [showAdd,   setShowAdd]   = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved,     setSaved]     = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setError(null);

    const { data: raw, error: rawErr } = await supabase
      .from("contractors")
      .select("id, company_name, tin_number, license_number, contact_email, phone_number, physical_address, is_verified, created_at")
      .order("created_at", { ascending: false });

    if (rawErr || !raw) { setError(rawErr?.message || "Failed to load"); setLoading(false); return; }
    if (raw.length === 0) { setContractors([]); setLoading(false); return; }

    const ids = raw.map((c: any) => c.id);

    const [{ data: projects }, { data: bids }] = await Promise.all([
      supabase.from("projects").select("id, contractor_id, status").in("contractor_id", ids),
      supabase.from("bids").select("id, contractor_id, financial_offer, is_winner").in("contractor_id", ids),
    ]);

    setContractors(raw.map((c: any) => {
      const cProjects = (projects || []).filter((p: any) => p.contractor_id === c.id);
      const winBids   = (bids     || []).filter((b: any) => b.contractor_id === c.id && b.is_winner);
      return {
        ...c,
        project_count:   cProjects.length,
        active_projects: cProjects.filter((p: any) => p.status === "Ongoing").length,
        total_bid_value: winBids.reduce((s: number, b: any) => s + Number(b.financial_offer || 0), 0),
      };
    }));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Verify toggle ──────────────────────────────────────────────────────────
  const handleVerify = async (c: Contractor) => {
    await supabase.from("contractors").update({
      is_verified:       !c.is_verified,
      verification_date: !c.is_verified ? new Date().toISOString().split("T")[0] : null,
    }).eq("id", c.id);
    load();
  };

  // ── Add contractor ─────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!form.company_name.trim() || !form.tin_number.trim() || !form.license_number.trim() || !form.contact_email.trim()) {
      setFormError(t("error_required")); return;
    }
    setSaving(true); setFormError(null);
    const { error: err } = await supabase.from("contractors").insert({
      company_name:     form.company_name.trim(),
      tin_number:       form.tin_number.trim(),
      license_number:   form.license_number.trim(),
      contact_email:    form.contact_email.trim(),
      phone_number:     form.phone_number.trim()     || null,
      physical_address: form.physical_address.trim() || null,
      is_verified:      false,
    });
    setSaving(false);
    if (err) { setFormError(err.message); return; }
    setSaved(true);
    setTimeout(() => { setSaved(false); setShowAdd(false); setForm(EMPTY_FORM); load(); }, 1200);
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = contractors.filter(c =>
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    c.tin_number.toLowerCase().includes(search.toLowerCase()) ||
    c.license_number.toLowerCase().includes(search.toLowerCase())
  );

  const verified   = contractors.filter(c => c.is_verified).length;
  const unverified = contractors.length - verified;
  const activeSites = contractors.reduce((s, c) => s + c.active_projects, 0);

  return (
    <div className="min-h-screen bg-[#F4F5F7]">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-orange-500 mb-0.5">{t("eyebrow")}</p>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">{t("title")}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t("search_placeholder")}
                className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 w-56"
              />
            </div>
            <button onClick={load}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-colors">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => { setShowAdd(true); setFormError(null); setSaved(false); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-orange-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-colors">
              <Plus size={13} /> {t("new_contractor")}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* KPI strip */}
        {!loading && !error && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { labelKey: "kpi_total",      val: contractors.length, icon: <Building2 size={18}/>,  bg: "bg-slate-900",   text: "text-white" },
              { labelKey: "kpi_verified",   val: verified,           icon: <BadgeCheck size={18}/>, bg: "bg-emerald-500", text: "text-white" },
              { labelKey: "kpi_unverified", val: unverified,         icon: <ShieldAlert size={18}/>,bg: "bg-amber-400",   text: "text-white" },
              { labelKey: "kpi_active_sites",val: activeSites,       icon: <TrendingUp size={18}/>, bg: "bg-orange-500",  text: "text-white" },
            ].map(k => (
              <div key={k.labelKey} className={`rounded-2xl p-5 ${k.bg}`}>
                <div className={`${k.text} opacity-60 mb-3`}>{k.icon}</div>
                <p className={`text-3xl font-black tracking-tight ${k.text}`}>{k.val}</p>
                <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${k.text} opacity-60`}>{t(k.labelKey)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm font-bold">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : !error && filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center">
            <Inbox size={48} className="text-slate-200 mx-auto mb-4" strokeWidth={1} />
            <p className="font-black text-slate-400 text-xl">
              {search ? t("no_records_search") : t("no_records_empty")}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Table header */}
            <div className="grid grid-cols-12 px-6 py-3 bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
              <div className="col-span-4">{t("col_company")}</div>
              <div className="col-span-2">{t("col_tin_license")}</div>
              <div className="col-span-2">{t("col_contact")}</div>
              <div className="col-span-1 text-center">{t("col_projects")}</div>
              <div className="col-span-1 text-center">{t("col_status")}</div>
              <div className="col-span-2 text-right">{t("col_actions")}</div>
            </div>

            {/* Rows */}
            {filtered.map((c, idx) => (
              <div key={c.id}
                className={`grid grid-cols-12 items-center px-6 py-4 gap-3 transition-colors hover:bg-slate-50/70 ${
                  idx < filtered.length - 1 ? "border-b border-slate-100" : ""
                }`}>

                {/* Company */}
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    c.is_verified ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                  }`}>
                    <Building2 size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-slate-900 text-sm uppercase truncate">{c.company_name}</p>
                    {c.active_projects > 0 && (
                      <p className="text-[9px] font-black text-orange-500">
                        {c.active_projects} {c.active_projects > 1 ? t("active_site_plural") : t("active_site_singular")}
                      </p>
                    )}
                    {c.total_bid_value > 0 && (
                      <p className="text-[9px] text-slate-400 font-bold">{fmt(c.total_bid_value)}</p>
                    )}
                  </div>
                </div>

                {/* TIN / License */}
                <div className="col-span-2 space-y-1">
                  <p className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                    <Hash size={9} className="shrink-0 text-slate-300" />{c.tin_number}
                  </p>
                  <p className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                    <FileText size={9} className="shrink-0 text-slate-300" />{c.license_number}
                  </p>
                </div>

                {/* Contact */}
                <div className="col-span-2 space-y-1 min-w-0">
                  <p className="flex items-center gap-1 text-[10px] text-slate-500 font-bold truncate">
                    <Mail size={9} className="shrink-0 text-slate-300" />{c.contact_email}
                  </p>
                  {c.phone_number && (
                    <p className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                      <Phone size={9} className="shrink-0 text-slate-300" />{c.phone_number}
                    </p>
                  )}
                </div>

                {/* Projects count */}
                <div className="col-span-1 text-center">
                  <span className="text-sm font-black text-slate-700">{c.project_count}</span>
                </div>

                {/* Verification badge */}
                <div className="col-span-1 flex justify-center">
                  {c.is_verified ? (
                    <span className="flex items-center gap-1 text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                      <ShieldCheck size={9} /> {t("verified_badge")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                      <ShieldAlert size={9} /> {t("unverified_badge")}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center gap-2 justify-end">
                  <button
                    onClick={() => handleVerify(c)}
                    title={c.is_verified ? t("tooltip_revoke") : t("tooltip_verify")}
                    className={`p-2 rounded-xl border transition-all ${
                      c.is_verified
                        ? "bg-slate-100 border-slate-200 text-slate-400 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                        : "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
                    }`}>
                    <CheckCircle2 size={14} />
                  </button>
                  <Link
                    href={`/${locale}/admin/contractors/${c.id}`}
                    title={t("tooltip_view")}
                    className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-400 transition-all">
                    <Eye size={14} />
                  </Link>
                  {c.project_count > 0 && (
                    <Link
                      href={`/${locale}/admin/contractors/${c.id}#projects`}
                      title={t("tooltip_projects")}
                      className="p-2 rounded-xl border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all">
                      <ExternalLink size={14} />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Contractor Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-orange-500 mb-0.5">{t("modal_eyebrow")}</p>
                <h2 className="text-lg font-black uppercase text-slate-900">{t("panel_add_title")}</h2>
              </div>
              <button onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); setFormError(null); }}
                className="p-2 rounded-xl text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-all">
                <X size={16} />
              </button>
            </div>

            {saved ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-emerald-600" />
                </div>
                <p className="font-black text-slate-900 text-lg">{t("saved_title")}</p>
              </div>
            ) : (
              <div className="px-7 py-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <MF label={t("label_company_name")} required span={2}>
                    <input placeholder={t("placeholder_company")}
                      value={form.company_name} onChange={e => setForm(f => ({...f, company_name: e.target.value}))}
                      className={INP} />
                  </MF>
                  <MF label={t("label_tin")} required>
                    <input placeholder={t("placeholder_tin")}
                      value={form.tin_number} onChange={e => setForm(f => ({...f, tin_number: e.target.value}))}
                      className={INP} />
                  </MF>
                  <MF label={t("label_license")} required>
                    <input placeholder={t("placeholder_license")}
                      value={form.license_number} onChange={e => setForm(f => ({...f, license_number: e.target.value}))}
                      className={INP} />
                  </MF>
                  <MF label={t("label_email_form")} required span={2}>
                    <input type="email" placeholder={t("placeholder_email")}
                      value={form.contact_email} onChange={e => setForm(f => ({...f, contact_email: e.target.value}))}
                      className={INP} />
                  </MF>
                  <MF label={t("label_phone_form")}>
                    <input placeholder={t("placeholder_phone")}
                      value={form.phone_number} onChange={e => setForm(f => ({...f, phone_number: e.target.value}))}
                      className={INP} />
                  </MF>
                  <MF label={t("label_address_form")}>
                    <input placeholder={t("placeholder_address")}
                      value={form.physical_address} onChange={e => setForm(f => ({...f, physical_address: e.target.value}))}
                      className={INP} />
                  </MF>
                </div>

                {formError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs font-bold">
                    <AlertTriangle size={13} /> {formError}
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-1">
                  <button onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); setFormError(null); }}
                    className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-slate-700 border border-slate-200 hover:border-slate-400 transition-all">
                    {t("cancel")}
                  </button>
                  <button onClick={handleAdd} disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50">
                    {saving
                      ? <><Loader2 size={13} className="animate-spin"/> {t("loading")} </>
                      : <><Plus size={13}/> {t("save_contractor")}</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const INP = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 focus:bg-white transition-all";

function MF({ label, required, span, children }: {
  label: string; required?: boolean; span?: number; children: React.ReactNode;
}) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
        {label}{required && <span className="text-orange-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}