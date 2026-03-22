"use client";
// src/components/public/ContactPageClient.tsx

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { PublicNav, type SiteLang } from "@/components/public/Publicnav";
import {
  MapPin, Phone, Mail, Clock, Send, Loader2,
  CheckCircle2, AlertTriangle, Globe,
} from "lucide-react";

// Module-level supabase client
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

const CONTACT_CARDS = [
  {
    icon: <MapPin size={22} />,
    color: "text-orange-600", bg: "bg-orange-100",
    titleKey: "contact.addressLabel",
    content: "Lemi Kura Sub-City Construction Office\nAddis Ababa, Ethiopia",
    subKey: "contact.addressSub",
  },
  {
    icon: <Phone size={22} />,
    color: "text-blue-600", bg: "bg-blue-100",
    titleKey: "contact.phoneLabel",
    content: "+251-11-XXX-XXXX\n+251-9XX-XXX-XXX",
    subKey: "contact.phoneSub",
  },
  {
    icon: <Mail size={22} />,
    color: "text-emerald-600", bg: "bg-emerald-100",
    titleKey: "contact.emailLabel",
    content: "info@lemikura.gov.et\ncomplaints@lemikura.gov.et",
    subKey: "contact.emailSub",
  },
] as const;

const HOURS = [
  { dayKey: "footer.day1", hoursKey: "footer.monFriHours", open: true  },
  { dayKey: "footer.day2", hoursKey: "footer.satHours",    open: true  },
  { dayKey: "footer.day3", hoursKey: "footer.closed",      open: false },
  { dayKey: "footer.day4", hoursKey: "footer.closed",      open: false },
] as const;

// ── Sub-component ─────────────────────────────────────────────────────────────
function CField({ label, children }: { label: string; children: React.ReactNode }) {
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
export default function ContactPageClient({
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

  const { t, isAm } = useTranslation(lang);
  const amCls = isAm ? "amharic" : "";

  const [form, setForm] = useState({
    name: "", email: "", phone: "", subject: "", message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.message) {
      setError(t("contact.requiredError")); return;
    }
    setSubmitting(true); setError(null);
    const ref = `LK-C-${Date.now().toString().slice(-6)}`;
    const { error: dbError } = await supabase.from("service_requests").insert({
      ref_code:     ref,
      service_type: "contact",              // ← 'contact' enum value added via migration
      name:         form.name,
      phone:        form.phone,
      email:        form.email    || null,
      location:     null,
      description:  form.message,
      existing_ref: form.subject  || null,  // reuse existing_ref for subject
      lang,
      status: "pending",
    });
    setSubmitting(false);
    if (dbError) { setError(t("contact.requiredError")); return; }
    setSubmitted(true);
  };

  // ── Utility bar ───────────────────────────────────────────────────────────
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

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      {UtilBar}
      <PublicNav locale={lang} />

      {/* ── Hero ── */}
      <section className="bg-[#0A1628] pt-40 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 60px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 60px)",
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-[#E85D1A] to-transparent" />
        <div className="relative max-w-7xl mx-auto px-6">
          {/* <p className={`text-[10px] font-black uppercase tracking-[0.5em] text-[#E85D1A] mb-4 ${amCls}`}>
            {t("contact.eyebrow")}
          </p> */}
          <h1 className={`text-5xl font-black text-white uppercase tracking-tight mb-4 ${amCls}`}>
            {t("contact.heroTitle")}
          </h1>
          <p className={`text-white/40 text-xl max-w-xl leading-relaxed ${amCls}`}>
            {t("contact.heroBody")}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">

        {/* ── Contact cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CONTACT_CARDS.map(c => (
            <div key={c.titleKey} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-7">
              <div className={`w-12 h-12 ${c.bg} rounded-2xl flex items-center justify-center mb-5`}>
                <span className={c.color}>{c.icon}</span>
              </div>
              <h3 className={`font-black text-slate-900 uppercase tracking-tight mb-4 ${amCls}`}>
                {t(c.titleKey)}
              </h3>
              <p className="text-sm text-slate-700 font-bold leading-relaxed whitespace-pre-line">
                {c.content}
              </p>
              <p className={`text-[10px] text-slate-400 mt-3 ${amCls}`}>{t(c.subKey)}</p>
            </div>
          ))}
        </div>

        {/* ── Form + Map/Hours ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Contact form */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
            {submitted ? (
              <div className="flex flex-col items-center justify-center h-full py-10 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-5">
                  <CheckCircle2 size={32} className="text-emerald-600" />
                </div>
                <h3 className={`text-2xl font-black text-slate-900 uppercase tracking-tight mb-2 ${amCls}`}>
                  {t("contact.successTitle")}
                </h3>
                <p className={`text-slate-500 ${amCls}`}>{t("contact.successBody")}</p>
                <button
                  type="button"
                  onClick={() => { setSubmitted(false); setForm({ name:"", email:"", phone:"", subject:"", message:"" }); }}
                  className={`mt-6 text-[10px] font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest transition-colors ${amCls}`}>
                  {t("contact.sendAnother")}
                </button>
              </div>
            ) : (
              <>
                <p className={`text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 ${amCls}`}>
                  {t("contact.formTitle")}
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <CField label={t("contact.nameLabel")}>
                      <input type="text" value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder={t("contact.namePlaceholder")} className={INP} />
                    </CField>
                    <CField label={t("contact.phoneLabel")}>
                      <input type="tel" value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+251-9XX..." className={INP} />
                    </CField>
                  </div>
                  <CField label={t("contact.emailLabel")}>
                    <input type="email" value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="your@email.com" className={INP} />
                  </CField>
                  <CField label={t("contact.subjectLabel")}>
                    <input type="text" value={form.subject}
                      onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                      placeholder={t("contact.subjectPlaceholder")} className={INP} />
                  </CField>
                  <CField label={t("contact.messageLabel")}>
                    <textarea rows={5} value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      placeholder={t("contact.messagePlaceholder")}
                      className={INP + " resize-none"} />
                  </CField>
                  {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-bold">
                      <AlertTriangle size={13} /> {error}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className={`w-full flex items-center justify-center gap-2 py-4 bg-slate-900 hover:bg-[#E85D1A] text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all disabled:opacity-50 ${amCls}`}>
                    {submitting
                      ? <><Loader2 size={14} className="animate-spin" />{t("contact.sending")}</>
                      : <><Send size={14} />{t("contact.sendBtn")}</>}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Map + Office hours */}
          <div className="space-y-5">

            {/* Map placeholder */}
            <div className="bg-[#0A1628] rounded-3xl overflow-hidden h-64 relative flex items-center justify-center border border-slate-200">
              <div className="absolute inset-0 opacity-[0.04]" style={{
                backgroundImage: "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 30px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 30px)",
              }} />
              <div className="relative text-center">
                <MapPin size={32} className="text-[#E85D1A] mx-auto mb-2" />
                <p className={`text-white/60 font-black text-sm uppercase tracking-widest ${amCls}`}>
                  {t("footer.brand")}
                </p>
                <p className="text-white/30 text-xs mt-1">Addis Ababa, Ethiopia</p>
                <a
                  href="https://maps.google.com/?q=Lemi+Kura+Addis+Ababa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 mt-3 text-[10px] font-black text-[#E85D1A] uppercase tracking-widest hover:opacity-70 transition-opacity ${amCls}`}>
                  {t("contact.mapLabel")} →
                </a>
              </div>
            </div>

            {/* Office hours */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-7">
              <div className="flex items-center gap-3 mb-5">
                <Clock size={16} className="text-[#E85D1A]" />
                <p className={`text-[10px] font-black uppercase tracking-widest text-slate-400 ${amCls}`}>
                  {t("footer.officeHours")}
                </p>
              </div>
              <div className="space-y-3">
                {HOURS.map(h => (
                  <div key={h.dayKey}
                    className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
                    <span className={`text-sm font-black text-slate-700 ${amCls}`}>{t(h.dayKey)}</span>
                    <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                      h.open ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                    } ${amCls}`}>
                      {t(h.hoursKey)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}