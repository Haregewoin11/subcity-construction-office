"use client";
// src/app/[locale]/admin/news/page.tsx

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/context/Authcontext";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Plus, Search, RefreshCw, Globe2, Edit2, Trash2,
  Eye, EyeOff, X, Loader2, AlertTriangle, CheckCircle2,
  CalendarDays, ChevronDown, ArrowUp, ArrowDown,
  Newspaper,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface NewsItem {
  id:             string;
  tag_en:         string;
  tag_am:         string;
  title_en:       string;
  title_am:       string;
  body_en:        string;
  body_am:        string;
  published_date: string;
  is_published:   boolean;
  display_order:  number;
  created_at:     string;
}

// ── Tag color helper ──────────────────────────────────────────────────────────
const TAG_PRESETS = ["Notice","Report","Update","Alert","Event","Tender"];
const TAG_COLORS: Record<string, string> = {
  Notice:  "bg-orange-50 text-orange-600 border-orange-200",
  Report:  "bg-blue-50   text-blue-600   border-blue-200",
  Update:  "bg-emerald-50 text-emerald-600 border-emerald-200",
  Alert:   "bg-red-50    text-red-600    border-red-200",
  Event:   "bg-violet-50 text-violet-600 border-violet-200",
  Tender:  "bg-amber-50  text-amber-600  border-amber-200",
};
function tagColor(tag: string) {
  return TAG_COLORS[tag] ?? "bg-slate-50 text-slate-600 border-slate-200";
}

const INP = "w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-800 text-sm placeholder:text-slate-300 focus:outline-none focus:border-[#1B3A6B]/50 focus:ring-1 focus:ring-[#1B3A6B]/20 transition-all";
const LABEL = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2";

// ── Modal ─────────────────────────────────────────────────────────────────────
function NewsModal({
  mode, item, supabase, t, onClose, onSuccess,
}: {
  mode: "add" | "edit";
  item?: NewsItem;
  supabase: SupabaseClient;
  t: (key: string) => string; // More precise than 'any'
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    tag_en:         item?.tag_en         ?? "Notice",
    tag_am:         item?.tag_am         ?? "ማስታወቂያ",
    title_en:       item?.title_en       ?? "",
    title_am:       item?.title_am       ?? "",
    body_en:        item?.body_en        ?? "",
    body_am:        item?.body_am        ?? "",
    published_date: item?.published_date ?? new Date().toISOString().split("T")[0],
    is_published:   item?.is_published   ?? false,
    display_order:  item?.display_order  ?? 0,
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

 const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(v => ({ ...v, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.tag_en.trim())   return setError(t("err_tag_en"));
    if (!form.title_en.trim()) return setError(t("err_title_en"));
    if (!form.title_am.trim()) return setError(t("err_title_am"));
    if (!form.body_en.trim())  return setError(t("err_body_en"));
    if (!form.body_am.trim())  return setError(t("err_body_am"));

    setLoading(true);
    try {
    const payload = { ...form, display_order: Number(form.display_order) || 0 };

      if (mode === "add") {
        const { error: err } = await supabase.from("news_announcements").insert(payload);
        if (err) throw err;
        onSuccess(t("toast_created"));
      } else {
        const { error: err } = await supabase.from("news_announcements")
          .update(payload).eq("id", item!.id);
        if (err) throw err;
        onSuccess(t("toast_updated"));
      }
      onClose();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || t("toast_fail"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 py-8 overflow-y-auto"
      style={{ background: "rgba(7,18,32,0.85)", backdropFilter: "blur(6px)" }}>
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 my-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 bg-[#1B3A6B] rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
              <Newspaper size={15} className="text-white" />
            </div>
            <p className="text-white font-black text-sm">
              {mode === "add" ? t("modal_add_title") : t("modal_edit_title")}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-7 space-y-6">
          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle size={13} className="text-red-500 shrink-0" />
              <p className="text-red-600 text-sm font-bold">{error}</p>
            </div>
          )}

          {/* Tags row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>{t("tag_en_label")}</label>
              <div className="relative">
                <select value={form.tag_en}
                  onChange={e => setForm(v => ({ ...v, tag_en: e.target.value }))}
                  className={INP + " appearance-none pr-8 cursor-pointer"}>
                  {TAG_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
                  <option value="custom">Custom…</option>
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              {form.tag_en === "custom" && (
                <input type="text" placeholder={t("tag_ph_en")} className={INP + " mt-2"}
                  onChange={e => setForm(v => ({ ...v, tag_en: e.target.value }))} />
              )}
            </div>
            <div>
              <label className={LABEL}>{t("tag_am_label")}</label>
              <input type="text" value={form.tag_am}
                onChange={e => setForm(v => ({ ...v, tag_am: e.target.value }))}
                placeholder={t("tag_ph_am")} className={INP} />
            </div>
          </div>

          {/* English content */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Globe2 size={11} /> {t("section_english")}
            </p>
            <div>
              <label className={LABEL}>{t("title_en_label")} <span className="text-red-500">*</span></label>
              <input type="text" value={form.title_en} onChange={set("title_en")}
                placeholder={t("title_ph_en")} className={INP} />
            </div>
            <div>
              <label className={LABEL}>{t("body_en_label")} <span className="text-red-500">*</span></label>
              <textarea rows={4} value={form.body_en} onChange={set("body_en")}
                placeholder={t("body_ph_en")} className={INP + " resize-none"} />
            </div>
          </div>

          {/* Amharic content */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Globe2 size={11} /> {t("section_amharic")}
            </p>
            <div>
              <label className={LABEL}>{t("title_am_label")} <span className="text-red-500">*</span></label>
              <input type="text" value={form.title_am} onChange={set("title_am")}
                placeholder={t("title_ph_am")} className={INP + " font-[Noto_Serif_Ethiopic,serif]"} />
            </div>
            <div>
              <label className={LABEL}>{t("body_am_label")} <span className="text-red-500">*</span></label>
              <textarea rows={4} value={form.body_am} onChange={set("body_am")}
                placeholder={t("body_ph_am")}
                className={INP + " resize-none font-[Noto_Serif_Ethiopic,serif]"} />
            </div>
          </div>

          {/* Date + Order */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>{t("date_label")}</label>
              <input type="date" value={form.published_date}
                onChange={e => setForm(v => ({ ...v, published_date: e.target.value }))}
                className={INP} />
            </div>
            <div>
              <label className={LABEL}>{t("order_label")}</label>
              <input type="number" min="0" value={form.display_order}
                onChange={e => setForm(v => ({ ...v, display_order: Number(e.target.value) }))}
                className={INP} />
              <p className="text-slate-400 text-[10px] mt-1">{t("order_sub")}</p>
            </div>
          </div>

          {/* Publish toggle */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-slate-800 font-black text-sm">{t("published_label")}</p>
              <p className="text-slate-400 text-[10px] mt-0.5">{t("published_sub")}</p>
            </div>
            <button type="button"
              onClick={() => setForm(v => ({ ...v, is_published: !v.is_published }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.is_published ? "bg-emerald-500" : "bg-slate-300"}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_published ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#1B3A6B] hover:bg-[#142d54] disabled:opacity-50 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-colors">
            {loading
              ? <><Loader2 size={13} className="animate-spin" /> {mode === "add" ? t("btn_creating") : t("btn_saving")}</>
              : mode === "add"
                ? <><Plus size={13} /> {t("btn_create")}</>
                : <><CheckCircle2 size={13} /> {t("btn_save")}</>
            }
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function NewsPage() {
  const { supabase, role } = useAuth();
  const router = useRouter();
  const t = useTranslations("news_module");

  const [items,   setItems]   = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState<"all" | "published" | "drafts">("all");
  const [modal,   setModal]   = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [deleting,setDeleting]= useState<NewsItem | null>(null);
  const [toast,   setToast]   = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Guard
  useEffect(() => {
    if (role && !["main_admin","project_admin"].includes(role)) router.replace("/admin");
  }, [role, router]);

 const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("news_announcements")
        .select("*")
        .order("display_order", { ascending: true })
        .order("published_date", { ascending: false });
        
      if (error) throw error;
      if (data) setItems(data as NewsItem[]);
    } catch (err) {
      console.error("Forensic Log: Failed to fetch news items", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleTogglePublish = async (item: NewsItem) => {
    const { error } = await supabase.from("news_announcements")
      .update({ is_published: !item.is_published }).eq("id", item.id);
    if (error) showToast(t("toast_fail"), "error");
    else {
      showToast(!item.is_published ? t("toast_published") : t("toast_unpublished"), "success");
      fetchItems();
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("news_announcements").delete().eq("id", deleting.id);
    if (error) showToast(t("toast_fail"), "error");
    else { showToast(t("toast_deleted"), "success"); fetchItems(); }
    setDeleting(null);
  };

  const handleMoveOrder = async (item: NewsItem, dir: "up" | "down") => {
    const newOrder = dir === "up" ? Math.max(0, item.display_order - 1) : item.display_order + 1;
    await supabase.from("news_announcements").update({ display_order: newOrder }).eq("id", item.id);
    fetchItems();
  };

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    const matchSearch = item.title_en.toLowerCase().includes(q) ||
      item.title_am.includes(q) || item.tag_en.toLowerCase().includes(q);
    const matchFilter = filter === "all" ||
      (filter === "published" && item.is_published) ||
      (filter === "drafts" && !item.is_published);
    return matchSearch && matchFilter;
  });

  const stats = {
    total:     items.length,
    published: items.filter(i => i.is_published).length,
    drafts:    items.filter(i => !i.is_published).length,
  };

  if (role && !["main_admin","project_admin"].includes(role)) return null;

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border font-bold text-sm ${
          toast.type === "success"
            ? "bg-white border-emerald-200 text-emerald-700"
            : "bg-white border-red-200 text-red-600"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={16} className="text-emerald-500"/> : <AlertTriangle size={16} className="text-red-500"/>}
          {toast.msg}
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(7,18,32,0.85)", backdropFilter: "blur(6px)" }}>
          <div className="bg-white rounded-2xl p-7 max-w-sm w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <p className="text-slate-800 font-black text-center text-sm mb-2">{t("delete_confirm")}</p>
            <p className="text-slate-400 text-[12px] text-center mb-6 truncate">&#34;`{deleting.title_en}&#34;`</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setDeleting(null)}
                className="py-3 border border-slate-200 rounded-xl text-slate-600 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-colors">
                {t("delete_cancel")}
              </button>
              <button type="button" onClick={handleDelete}
                className="py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest transition-colors">
                {t("delete_yes")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {modal === "add" && (
        <NewsModal mode="add" supabase={supabase} t={t}
          onClose={() => setModal(null)}
          onSuccess={msg => { fetchItems(); showToast(msg, "success"); }} />
      )}
      {modal === "edit" && editing && (
        <NewsModal mode="edit" item={editing} supabase={supabase} t={t}
          onClose={() => { setModal(null); setEditing(null); }}
          onSuccess={msg => { fetchItems(); showToast(msg, "success"); }} />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-black font-black text-2xl uppercase tracking-tight">{t("page_title")}</h1>
          <p className="text-black/50 text-[12px] mt-1">{t("page_subtitle")}</p>
        </div>
        <button type="button" onClick={() => setModal("add")}
          className="flex items-center gap-2 bg-[#E85D1A] hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-colors">
          <Plus size={14} /> {t("add_news")}
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#0D1F38] border border-white rounded-2xl px-5 py-4">
          <p className="text-2xl font-black text-white">{stats.total}</p>
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mt-0.5">{t("stat_total")}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-4">
          <p className="text-2xl font-black text-emerald-400">{stats.published}</p>
          <p className="text-emerald-400/70 text-[10px] font-bold uppercase tracking-wider mt-0.5">{t("stat_published")}</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-5 py-4">
          <p className="text-2xl font-black text-amber-400">{stats.drafts}</p>
          <p className="text-amber-400/70 text-[10px] font-bold uppercase tracking-wider mt-0.5">{t("stat_drafts")}</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("search_ph")}
            className="w-full bg-[#0D1F38] border border-white rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#E85D1A]/40 transition-all" />
        </div>
        <div className="flex gap-2">
          {(["all","published","drafts"] as const).map(f => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                filter === f
                  ? "bg-[#E85D1A] text-white"
                  : "bg-[#0D1F38] border border-white/ text-white/50 hover:text-white"
              }`}>
              {t(`filter_${f}`)}
            </button>
          ))}
        </div>
        <button type="button" onClick={fetchItems}
          className="flex items-center gap-2 bg-[#0D1F38] hover:bg-white border border-white text-white/50 hover:text-white px-4 py-2.5 rounded-xl text-sm transition-all">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> {t("refresh")}
        </button>
      </div>

      {/* ── Table ── */}
      <div className="bg-[#0D1F38] border border-white rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white bg-[#071220]">
          {[
            { label: t("col_title"),   span: "col-span-4" },
            { label: t("col_tag"),     span: "col-span-2" },
            { label: t("col_date"),    span: "col-span-2" },
            { label: t("col_status"),  span: "col-span-2" },
            { label: t("col_order"),   span: "col-span-1" },
            { label: "",               span: "col-span-1" },
          ].map((h, i) => (
            <div key={i} className={`${h.span} text-[9px] font-black text-white/40 uppercase tracking-widest`}>
              {h.label}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-[#E85D1A] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Newspaper size={32} className="text-white/10 mb-3" />
            <p className="text-white/40 font-bold text-sm">{t("no_items")}</p>
          </div>
        ) : (
          <div className="divide-y divide-white">
            {filtered.map(item => (
              <div key={item.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-whitetransition-colors">

                {/* Title */}
                <div className="col-span-4 min-w-0">
                  <p className="text-white font-black text-[13px] truncate">{item.title_en}</p>
                  <p className="text-white/40 text-[11px] truncate mt-0.5" style={{ fontFamily: "'Noto Serif Ethiopic', serif" }}>
                    {item.title_am}
                  </p>
                </div>

                {/* Tag */}
                <div className="col-span-2">
                  <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black border ${tagColor(item.tag_en)}`}>
                    {item.tag_en}
                  </span>
                </div>

                {/* Date */}
                <div className="col-span-2">
                  <div className="flex items-center gap-1.5 text-white/50 text-[12px]">
                    <CalendarDays size={11} />
                    {new Date(item.published_date).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border ${
                    item.is_published
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${item.is_published ? "bg-emerald-400" : "bg-amber-400"}`} />
                    {item.is_published ? t("status_published") : t("status_draft")}
                  </span>
                </div>

                {/* Order controls */}
                <div className="col-span-1 flex items-center gap-1">
                  <span className="text-white/50 text-[12px] font-bold w-4 text-center">{item.display_order}</span>
                  <div className="flex flex-col">
                    <button type="button" onClick={() => handleMoveOrder(item, "up")}
                      className="text-white/25 hover:text-white/70 transition-colors p-0.5">
                      <ArrowUp size={10} />
                    </button>
                    <button type="button" onClick={() => handleMoveOrder(item, "down")}
                      className="text-white/25 hover:text-white/70 transition-colors p-0.5">
                      <ArrowDown size={10} />
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-1 flex items-center justify-end gap-1">
                  <button type="button"
                    onClick={() => handleTogglePublish(item)}
                    title={item.is_published ? t("action_unpublish") : t("action_publish")}
                    className={`p-2 rounded-lg transition-all ${
                      item.is_published
                        ? "text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-500"
                        : "text-white/25 hover:text-white/60 hover:bg-white"
                    }`}>
                    {item.is_published ? <Eye size={14}/> : <EyeOff size={14}/>}
                  </button>
                  <button type="button"
                    onClick={() => { setEditing(item); setModal("edit"); }}
                    className="p-2 text-white/25 hover:text-white hover:bg-white/ rounded-lg transition-all">
                    <Edit2 size={14} />
                  </button>
                  <button type="button"
                    onClick={() => setDeleting(item)}
                    className="p-2 text-white/25 hover:text-red-400 hover:bg-red-500 rounded-lg transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="px-6 py-3 border-t border-white">
          <p className="text-white/25 text-[10px] font-bold">
            {filtered.length} {t("filter_all").toLowerCase()} · {stats.published} {t("stat_published").toLowerCase()} · {stats.drafts} {t("stat_drafts").toLowerCase()}
          </p>
        </div>
      </div>
    </div>
  );
}