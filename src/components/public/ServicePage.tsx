"use client";
// src/components/public/ServicesPage.tsx
//
// Single `activeId` state drives BOTH the sidebar highlight AND the form dropdown.
// Clicking sidebar → selectService(id) → updates both.
// Changing dropdown → selectService(id) → updates both.

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { PublicNav, type SiteLang } from "@/components/public/Publicnav";
import {
  FileText, AlertTriangle, Search, Building2,
  CheckCircle2, Clock, ArrowRight, Send, Loader2, ChevronDown,
  Phone, Mail, Globe,
} from "lucide-react";

// Module-level supabase client — created once, stable
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Direct JSON imports ───────────────────────────────────────────────────────
import enMessages from "@/app/[locale]/en.json";
import amMessages from "@/app/[locale]/am.json";

type AnyObj = Record<string, any>;

// ── Inline translation hook ───────────────────────────────────────────────────
function useTranslation(lang: SiteLang) {
  const messages: AnyObj =
    lang === "am" ? (amMessages as AnyObj) : (enMessages as AnyObj);

  const t = useCallback(
    (path: string): string => {
      let node: unknown = messages;
      for (const p of path.split(".")) {
        if (node == null || typeof node !== "object") return path;
        node = (node as AnyObj)[p];
      }
      return typeof node === "string" ? node : path;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang]
  );

  return { t, isAm: lang === "am" };
}

// ── Module-level constants ────────────────────────────────────────────────────
const INP =
  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm " +
  "text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 " +
  "focus:bg-white transition-all font-medium";

const SERVICES = [
  {
    id: "permit" as const,
    icon: <Building2 size={24} />, color: "text-blue-600", bg: "bg-blue-100",
    titleKey: "services.permit",     descKey: "services.permitDesc",
    steps: ["services.permitStep1","services.permitStep2","services.permitStep3","services.permitStep4"],
    timeKey: "services.permitTime",
  },
  {
    id: "complaint" as const,
    icon: <AlertTriangle size={24} />, color: "text-red-600", bg: "bg-red-100",
    titleKey: "services.complaint",  descKey: "services.complaintDesc",
    steps: ["services.complaintStep1","services.complaintStep2","services.complaintStep3","services.complaintStep4"],
    timeKey: "services.complaintTime",
  },
  {
    id: "document" as const,
    icon: <FileText size={24} />, color: "text-emerald-600", bg: "bg-emerald-100",
    titleKey: "services.docRequest", descKey: "services.docDesc",
    steps: ["services.docStep1","services.docStep2","services.docStep3","services.docStep4"],
    timeKey: "services.docTime",
  },
  {
    id: "inspection" as const,
    icon: <Search size={24} />, color: "text-violet-600", bg: "bg-violet-100",
    titleKey: "services.inspection", descKey: "services.inspectionDesc",
    steps: ["services.inspStep1","services.inspStep2","services.inspStep3","services.inspStep4"],
    timeKey: "services.inspTime",
  },
] as const;

type ServiceId = (typeof SERVICES)[number]["id"];
type FormData = {
  service: ServiceId; name: string; phone: string; email: string;
  location: string; description: string; ref: string;
};
const EMPTY_FORM: FormData = {
  service: "permit", name: "", phone: "", email: "", location: "", description: "", ref: "",
};

// ── Sub-components ────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ServicesPage({
  locale,
  lang: initLang = "en",
}: {
  locale: string;
  lang?: SiteLang;
}) {
  const router   = useRouter();
  const pathname = usePathname();

  const [lang, setLangState] = useState<SiteLang>(locale === "am" ? "am" : "en");
  const setLang = (newLang: SiteLang) => {
    setLangState(newLang);
    router.replace(pathname.replace(/^\/(en|am)/, `/${newLang}`));
  };

  // ← hook destructured correctly: { t, isAm }
  const { t, isAm } = useTranslation(lang);
  const amCls = isAm ? "amharic" : "";

  // ── Single source of truth for active service ──────────────────────────────
  const [activeId, setActiveId] = useState<ServiceId>("permit");
  const [form, setForm]         = useState<FormData>(EMPTY_FORM);

  const selectService = (id: ServiceId) => {
    setActiveId(id);
    setForm(f => ({ ...f, service: id }));
  };

  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [refCode,    setRefCode]    = useState("");
  const [error,      setError]      = useState<string | null>(null);

  const activeService = SERVICES.find(s => s.id === activeId)!;

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.description) {
      setError(t("services.requiredError")); return;
    }
    setSubmitting(true); setError(null);
    const ref = `LK-${Date.now().toString().slice(-6)}`;
    const { error: dbError } = await supabase.from("service_requests").insert({
      ref_code:     ref,
      service_type: form.service,
      name:         form.name,
      phone:        form.phone,
      email:        form.email        || null,
      location:     form.location     || null,
      description:  form.description,
      existing_ref: form.ref          || null,
      lang,
      status: "pending",
    });
    setSubmitting(false);
    if (dbError) { setError(t("services.submitError")); return; }
    setRefCode(ref); setSubmitted(true);
  };

  // ── Utility bar — shared across success + main views ──────────────────────
  const UtilBar = (
    <div className="bg-[#071220] border-b border-white/[0.06] text-[11.5px] fixed top-0 left-0 right-0 z-50">
      <div className="max-w-[1400px] mx-auto px-8 h-8 flex items-center justify-between">
        <div className="hidden md:flex items-center gap-6 text-white/35">
          <a href={`tel:${t("util_bar.phone")}`}
            className="flex items-center gap-1.5 hover:text-white/70 transition-colors">
            <Phone size={10} /> {t("util_bar.phone")}
          </a>
          <a href={`mailto:${t("util_bar.email")}`}
            className="flex items-center gap-1.5 hover:text-white/70 transition-colors">
            <Mail size={10} /> {t("util_bar.email")}
          </a>
          <span className={`flex items-center gap-1.5 ${amCls}`}>
            <Clock size={10} className="text-[#E85D1A] shrink-0" /> {t("util_bar.hours")}
          </span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <Globe size={10} className="text-white/20 mr-1" />
          <button type="button" onClick={() => setLang("en")}
            className={`px-3 py-0.5 text-[11px] font-black uppercase tracking-wider transition-all ${
              lang === "en" ? "text-white bg-[#E85D1A]" : "text-white/35 hover:text-white/70"
            }`}>EN</button>
          <span className="text-white/15">|</span>
          <button type="button" onClick={() => setLang("am")}
            className={`px-3 py-0.5 text-[11px] font-bold amharic transition-all ${
              lang === "am" ? "text-white bg-[#E85D1A]" : "text-white/35 hover:text-white/70"
            }`}>አማ</button>
        </div>
      </div>
    </div>
  );

  // ── Success screen ─────────────────────────────────────────────────────────
  if (submitted) return (
    <div className="min-h-screen bg-[#F4F5F7]">
      {UtilBar}
      <PublicNav locale={lang} />
      <div className="flex items-center justify-center min-h-screen pt-24">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-600" />
          </div>
          <h2 className={`text-3xl font-black text-slate-900 uppercase tracking-tight mb-3 ${amCls}`}>
            {t("services.successTitle")}
          </h2>
          <p className={`text-slate-500 text-lg mb-8 ${amCls}`}>{t("services.successBody")}</p>
          <div className="bg-slate-100 rounded-2xl p-4 mb-8">
            <p className={`text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ${amCls}`}>
              {t("services.refLabel")}
            </p>
            <p className="text-2xl font-black text-slate-900 font-mono">{refCode}</p>
          </div>
          <button
            type="button"
            onClick={() => { setSubmitted(false); setForm(EMPTY_FORM); setActiveId("permit"); }}
            className={`px-7 py-4 bg-[#E85D1A] text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-orange-500 transition-all ${amCls}`}>
            {t("services.submitAnother")}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Main view ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      {UtilBar}
      {/* locale={lang} so nav links update when language changes */}
      <PublicNav locale={lang} />

      {/* ── Hero ── */}
      <section className="bg-[#0A1628] pt-40 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 60px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 60px)",
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-[#E85D1A] to-transparent" />
        <div className="relative max-w-7xl mx-auto px-6">
          {/* <p className={`text-[10px] font-black uppercase tracking-[0.5em] text-[#E85D1A] mb-4 ${amCls}`}>
            {t("services.eyebrow")}
          </p> */}
          <h1 className={`text-4xl md:text-5xl font-black text-white leading-tight mb-4 ${amCls}`}>
            {t("services.heroTitle")}
          </h1>
          <p className={`text-white/40 text-lg max-w-2xl leading-relaxed ${amCls}`}>
            {t("services.heroBody")}
          </p>
        </div>
      </section>

      {/* ── Body ── */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Sidebar ── */}
          <div className="space-y-3">
            <p className={`text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ${amCls}`}>
              {t("services.selectService")}
            </p>
            {SERVICES.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectService(s.id)}
                className={`w-full text-left rounded-2xl border p-5 transition-all ${
                  activeId === s.id
                    ? "bg-slate-900 border-slate-900 shadow-xl"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"
                }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    activeId === s.id ? "bg-white/10" : s.bg
                  }`}>
                    <span className={activeId === s.id ? "text-white" : s.color}>{s.icon}</span>
                  </div>
                  <p className={`font-black text-sm uppercase tracking-tight ${
                    activeId === s.id ? "text-white" : "text-slate-900"
                  } ${amCls}`}>
                    {t(s.titleKey)}
                  </p>
                  {activeId === s.id && <ArrowRight size={14} className="text-[#E85D1A] ml-auto shrink-0" />}
                </div>
                <div className={`flex items-center gap-1.5 mt-3 text-[9px] font-black uppercase tracking-widest ${
                  activeId === s.id ? "text-[#E85D1A]" : "text-slate-400"
                } ${amCls}`}>
                  <Clock size={9} /> {t(s.timeKey)}
                </div>
              </button>
            ))}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-4">
              <p className={`text-[10px] font-black uppercase tracking-widest text-amber-700 mb-2 ${amCls}`}>
                {t("services.inPersonTitle")}
              </p>
              <p className={`text-xs text-amber-700 leading-relaxed ${amCls}`}>
                {t("services.inPersonBody")}
              </p>
            </div>
          </div>

          {/* ── Right panel ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Info card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className={`w-12 h-12 rounded-2xl ${activeService.bg} flex items-center justify-center shrink-0`}>
                  <span className={activeService.color}>{activeService.icon}</span>
                </div>
                <div>
                  <h2 className={`text-2xl font-black text-slate-900 uppercase tracking-tight ${amCls}`}>
                    {t(activeService.titleKey)}
                  </h2>
                  <p className={`text-slate-400 text-sm mt-1 ${amCls}`}>{t(activeService.descKey)}</p>
                </div>
              </div>
              <p className={`text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ${amCls}`}>
                {t("services.processSteps")}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeService.steps.map((stepKey, i) => (
                  <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-xl p-4">
                    <span className="text-[#E85D1A] font-black text-sm shrink-0">{i + 1}.</span>
                    <p className={`text-sm text-slate-600 leading-relaxed ${amCls}`}>{t(stepKey)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
              <p className={`text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 ${amCls}`}>
                {t("services.submitOnline")}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Field label={t("services.serviceTypeLabel") || "Service Type"}>
                    <div className="relative">
                      <select
                        value={form.service}
                        onChange={e => selectService(e.target.value as ServiceId)}
                        className={INP + " appearance-none cursor-pointer pr-10"}>
                        {SERVICES.map(s => (
                          <option key={s.id} value={s.id}>{t(s.titleKey)}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </Field>
                </div>
                <Field label={t("services.nameLabel")}>
                  <input type="text" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={t("services.namePlaceholder")} className={INP} />
                </Field>
                <Field label={t("services.phoneLabel")}>
                  <input type="tel" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+251-9XX-XXX-XXX" className={INP} />
                </Field>
                <Field label={t("services.emailLabel")}>
                  <input type="email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="your@email.com" className={INP} />
                </Field>
                <Field label={t("services.locationLabel")}>
                  <input type="text" value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder={t("services.locationPlaceholder")} className={INP} />
                </Field>
                {form.service !== "complaint" && (
                  <Field label={t("services.refLabel")}>
                    <input type="text" value={form.ref}
                      onChange={e => setForm(f => ({ ...f, ref: e.target.value }))}
                      placeholder={t("services.refPlaceholder")} className={INP} />
                  </Field>
                )}
              </div>
              <div className="mt-4">
                <Field label={t("services.descLabel")}>
                  <textarea rows={4} value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder={t("services.descPlaceholder")}
                    className={INP + " resize-none"} />
                </Field>
              </div>
              {error && (
                <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-bold">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-100">
                <p className={`text-[10px] text-slate-400 font-bold ${amCls}`}>
                  {t("services.requiredNote")}
                </p>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-[#E85D1A] text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all disabled:opacity-50 ${amCls}`}>
                  {submitting
                    ? <><Loader2 size={14} className="animate-spin" />{t("services.submitting")}</>
                    : <><Send size={14} />{t("services.submitBtn")}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}