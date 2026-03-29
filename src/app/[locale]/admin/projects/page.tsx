"use client";
// src/app/[locale]/admin/projects/page.tsx
// ── Add project: 2-step modal (data → file upload), matching existing AddProjectForm flow
// ── Edit project: slide-in panel, pre-filled, no page navigation
// ── ProjectTable onEdit callback → opens edit panel directly
// ── LOCALIZED via Admin.projects_module + Admin.manage_project

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/actions/supabase/clients";
import { useAuth } from "@/context/Authcontext";
import { saveProject, deleteProject } from "@/lib/actions/projects";
import { DeleteWarningModal } from "@/components/admin/DeleteWarningModal";
import { ProjectTable } from "@/components/admin/ProjectTable";
import { FileUpload } from "@/components/admin/FileUpload";
import {
  PlusCircle, Search, Loader2, Database, ChevronRight, Filter,
  X, CheckCircle2, AlertCircle, ShieldAlert, ArrowRight,
  Calendar, CheckCircle, Save, DollarSign
} from "lucide-react";
import { toast } from "sonner";

// ─── Status filter config ──────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { dot: string; text: string; bg: string; activeBg: string; activeText: string }> = {
  "All":              { dot: "bg-slate-400",   text: "text-slate-500",   bg: "bg-transparent", activeBg: "bg-[#0A1628]",   activeText: "text-white" },
  "Planned":          { dot: "bg-sky-400",     text: "text-sky-700",     bg: "bg-sky-50",      activeBg: "bg-sky-500",     activeText: "text-white" },
  "Design Phase":     { dot: "bg-purple-500",  text: "text-purple-700",  bg: "bg-purple-50",   activeBg: "bg-purple-600",  activeText: "text-white" },
  "BOQ Verification": { dot: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50",    activeBg: "bg-amber-500",   activeText: "text-white" },
  "Ongoing":          { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50",  activeBg: "bg-emerald-600", activeText: "text-white" },
  "On Hold":          { dot: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50",      activeBg: "bg-red-500",     activeText: "text-white" },
  "Completed":        { dot: "bg-blue-500",    text: "text-blue-700",    bg: "bg-blue-50",     activeBg: "bg-blue-600",    activeText: "text-white" },
};
const FILTER_OPTIONS = ["All", "Planned", "Design Phase", "BOQ Verification", "Ongoing", "On Hold", "Completed"];

// ─── Blank form ────────────────────────────────────────────────────────────────
const BLANK_FORM = {
  name: "", name_am: "", sector: "Education", location: "", status: "Planned",
  contractor_id: "", advisor: "", currency: "ETB", budget: "",
  progress: "0", start_date: "", expected_end_date: "",
  description_en: "", description_am: "",
};

// ─── Shared styles ─────────────────────────────────────────────────────────────
const FLD = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1628]/20 transition-all";
const LBL = "block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5";

// ─── Inner component (needs useSearchParams) ───────────────────────────────────
function ProjectsPageInner() {
  const t  = useTranslations("Admin.projects_module");
  const tm = useTranslations("Admin.manage_project");
  const { supabase } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // List state
  const [projects, setProjects]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [deleteModal, setDeleteModal]   = useState({ open: false, id: "", name: "" });
  const [isDeleting, setIsDeleting]     = useState(false);

  // Modal mode: "add" | "edit" | null
  const [modalMode, setModalMode]       = useState<"add" | "edit" | null>(null);
  const [addStep, setAddStep]           = useState<1 | 2>(1);
  const [newProjectId, setNewProjectId] = useState<string | null>(null);
  const [editProject, setEditProject]   = useState<any | null>(null);
  const [form, setForm]                 = useState(BLANK_FORM);
  const [contractors, setContractors]   = useState<any[]>([]);
  const [loadingCtr, setLoadingCtr]     = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [panelSuccess, setPanelSuccess] = useState(false);
  const [formError, setFormError]       = useState("");

  // Load projects
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("projects")
      .select(`*, contractors(company_name, is_verified)`)
      .order("created_at", { ascending: false });
    if (data) setProjects(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // Handle ?edit=id from deep links (e.g. detail page)
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && projects.length > 0) {
      const p = projects.find(x => x.id === editId);
      if (p) openEditPanel(p);
      router.replace("/admin/projects", { scroll: false });
    }
  }, [searchParams, projects]);

  // Load contractors once when modal opens
  async function loadContractors() {
    setLoadingCtr(true);
    const { data } = await supabase.from("contractors").select("id, company_name, is_verified").order("company_name");
    setContractors(data || []);
    setLoadingCtr(false);
  }

  // Open Add modal
  function openAddModal() {
    setModalMode("add");
    setAddStep(1);
    setNewProjectId(null);
    setForm(BLANK_FORM);
    setFormError("");
    setPanelSuccess(false);
    loadContractors();
  }

  // Open Edit panel
  function openEditPanel(project: any) {
    setModalMode("edit");
    setEditProject(project);
    setForm({
      name: project.name || "",
      name_am: project.name_am || "",
      sector: project.sector || "Education",
      location: project.location || "",
      status: project.status || "Planned",
      contractor_id: project.contractor_id || "",
      advisor: project.advisor || "",
      currency: project.currency || "ETB",
      budget: project.budget ? String(project.budget) : "",
      progress: project.progress != null ? String(project.progress) : "0",
      start_date: project.start_date || "",
      expected_end_date: project.expected_end_date || "",
      description_en: project.description_en || "",
      description_am: project.description_am || "",
    });
    setFormError("");
    setPanelSuccess(false);
    loadContractors();
  }

  function closeModal() {
    if (submitting) return;
    setModalMode(null);
    setEditProject(null);
    setAddStep(1);
    setNewProjectId(null);
    setPanelSuccess(false);
  }

  // ── STEP 1: Save project data ────────────────────────────────────────────────
  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.sector || !form.status) {
      setFormError(tm("error_required")); return;
    }
    setSubmitting(true); setFormError("");

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));

    const result = await saveProject(fd);
    setSubmitting(false);

    if (result.success && result.id) {
      setNewProjectId(result.id);
      setAddStep(2);
      fetchProjects();
      toast.success(tm("success_add"));
    } else {
      setFormError(result.error || "Failed to create project.");
    }
  }

  // ── Edit submit ───────────────────────────────────────────────────────────────
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.sector || !form.status) {
      setFormError(tm("error_required")); return;
    }
    setSubmitting(true); setFormError("");

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));

    const result = await saveProject(fd, editProject.id);
    setSubmitting(false);

    if (result.success) {
      setPanelSuccess(true);
      toast.success(tm("success_edit"));
      fetchProjects();
      setTimeout(closeModal, 1800);
    } else {
      setFormError(result.error || "Update failed.");
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  async function handleConfirmedDelete() {
    setIsDeleting(true);
    const res = await deleteProject(deleteModal.id);
    if (res.success) {
      setProjects(prev => prev.filter(p => p.id !== deleteModal.id));
      toast.success(t("delete_success"));
      setDeleteModal({ open: false, id: "", name: "" });
    } else {
      toast.error(t("delete_failed"), { description: res.error });
    }
    setIsDeleting(false);
  }

  // ── Derived ───────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => projects.filter(p => {
    const matchSearch = !searchTerm ||
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name_am?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sector?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = activeFilter === "All" || p.status === activeFilter;
    return matchSearch && matchStatus;
  }), [projects, searchTerm, activeFilter]);

  const countByStatus = useMemo(() => {
    const c: Record<string, number> = { All: projects.length };
    FILTER_OPTIONS.slice(1).forEach(s => { c[s] = projects.filter(p => p.status === s).length; });
    return c;
  }, [projects]);

  const SECTORS = [
    { val: "Education", label: tm("sector_education") },
    { val: "Health",    label: tm("sector_health")    },
    { val: "Roads",     label: tm("sector_roads")     },
    { val: "Youth",     label: tm("sector_youth")     },
    { val: "Market",    label: tm("sector_market")    },
    { val: "Housing",   label: tm("sector_housing")   },
    { val: "Water",     label: tm("sector_water")     },
    { val: "Other",     label: tm("sector_other")     },
  ];
  const STATUSES = [
    { val: "Planned",          label: "Planned (Tender Stage)"              },
    { val: "Design Phase",     label: "Design Phase (Technical Review)"     },
    { val: "BOQ Verification", label: "BOQ Verification (Cost Audit)"       },
    { val: "Ongoing",          label: "Ongoing (Construction Started)"      },
    { val: "On Hold",          label: "On Hold (Suspended)"                 },
    { val: "Completed",        label: "Completed (Final Handover)"          },
  ];

  const isModalOpen = modalMode !== null;

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-6 min-h-screen" style={{ backgroundColor: "#F4F6F9" }}>

        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-2xl shadow-xl text-white bg-[#0A1628]">
              <Database size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[9px] font-black text-white uppercase tracking-widest bg-[#039737]">
                  {t("live_registry")}
                </span>
                <ChevronRight size={12} className="text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t("subtitle")}</span>
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-[#2C2C2C]">{t("title")}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder={t("search_placeholder")}
                className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none w-72 shadow-sm focus:ring-4 focus:ring-[#0A1628]/10" />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">✕</button>
              )}
            </div>
            <button onClick={openAddModal}
              className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-white flex items-center gap-2 shadow-lg active:scale-95 bg-[#0A1628] hover:bg-slate-800">
              <PlusCircle size={18} /> {t("new_entry")}
            </button>
          </div>
        </header>

        {/* FILTER BAR */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 px-4 border-r border-slate-100 mr-2 shrink-0">
            <Filter size={16} className="text-[#0A1628]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t("filter_status")}</span>
          </div>
          <div className="flex flex-wrap gap-2 flex-1">
            {FILTER_OPTIONS.map(option => {
              const cfg = STATUS_CONFIG[option];
              const isActive = activeFilter === option;
              return (
                <button key={option} onClick={() => setActiveFilter(option)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    isActive ? `${cfg.activeBg} ${cfg.activeText} shadow-md` : `${cfg.bg} ${cfg.text} hover:opacity-80`
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white/70" : cfg.dot}`} />
                  {option === "All" ? t("filter_all") : option}
                  <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[8px] font-black ${isActive ? "bg-white/20 text-white" : "bg-white/80 text-slate-500 border border-slate-200"}`}>
                    {countByStatus[option] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="ml-auto pr-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse bg-[#039737]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#039737]">
              {filtered.length} {filtered.length !== 1 ? t("records_found_plural") : t("records_found")}
            </span>
          </div>
        </div>

        {/* TABLE */}
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-4 bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-200">
            <Loader2 className="animate-spin text-[#0A1628]" size={48} />
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{t("loading")}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-32 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
            <Search size={24} className="text-slate-300 mx-auto mb-4" />
            <h3 className="text-sm font-black uppercase text-[#2C2C2C]">{t("no_records_title")}</h3>
            <button onClick={() => { setSearchTerm(""); setActiveFilter("All"); }}
              className="mt-4 text-[10px] font-black uppercase tracking-widest text-[#0A1628] hover:underline">{t("clear_filters")}</button>
          </div>
        ) : (
          <ProjectTable
            projects={filtered}
            onDelete={(id, name) => setDeleteModal({ open: true, id, name })}
            onEdit={openEditPanel}
          />
        )}

        <DeleteWarningModal
          isOpen={deleteModal.open} isDeleting={isDeleting} projectName={deleteModal.name}
          onClose={() => setDeleteModal({ ...deleteModal, open: false })}
          onConfirm={handleConfirmedDelete} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MODAL BACKDROP
      ══════════════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 backdrop-blur-sm"
          onClick={closeModal}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SLIDE-IN PANEL
      ══════════════════════════════════════════════════════════════════ */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-in-out ${isModalOpen ? "translate-x-0" : "translate-x-full"}`}>

        {/* ── Panel Header ── */}
        <div className={`flex items-center justify-between px-7 py-5 text-white shrink-0 ${modalMode === "edit" ? "bg-amber-600" : "bg-[#0A1628]"}`}>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              {modalMode === "edit" && <ShieldAlert size={14} className="text-amber-200" />}
              <h2 className="text-lg font-black uppercase tracking-tight">
                {modalMode === "edit" ? tm("modal_edit_title") : tm("modal_add_title")}
              </h2>
            </div>
            <p className="text-[11px] text-white/60">
              {modalMode === "edit"
                ? `${tm("modal_edit_subtitle")} · ${editProject?.name || ""}`
                : tm("modal_add_subtitle")}
            </p>
          </div>
          <button onClick={closeModal} className="p-2 rounded-xl hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        {/* ── Step indicator (Add only) ── */}
        {modalMode === "add" && (
          <div className="flex items-center gap-4 px-7 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
            <StepPill number={1} label="Project Data" active={addStep === 1} done={addStep > 1} />
            <div className="h-px flex-1 bg-slate-200" />
            <StepPill number={2} label="Evidence Upload" active={addStep === 2} done={false} />
          </div>
        )}

        {/* ── Panel Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── EDIT SUCCESS ── */}
          {modalMode === "edit" && panelSuccess ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-8 gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-black text-[#0A1628]">{tm("success_edit")}</h3>
              <p className="text-xs text-slate-400">{tm("closing")}</p>
            </div>

          /* ── ADD STEP 2: File Upload ── */
          ) : modalMode === "add" && addStep === 2 && newProjectId ? (
            <div className="p-7 space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                <p className="text-xs text-[#0A1628] font-bold flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-600" />
                  Project ID {newProjectId.slice(0, 8)}… initialized. Attach supporting documents below.
                </p>
              </div>
              <FileUpload
                projectId={newProjectId}
                onUploadComplete={() => toast.success("File synchronized with database.")}
              />
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => { closeModal(); router.push(`/admin/projects/${newProjectId}`); }}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700">
                  Complete Forensic Entry
                </button>
              </div>
            </div>

          /* ── ADD STEP 1 or EDIT FORM ── */
          ) : (
            <form
              onSubmit={modalMode === "edit" ? handleEditSubmit : handleStep1}
              className="p-7 space-y-7"
            >
              {/* Section 1 */}
              <Section label={tm("section_identity")}>
                <div className="grid grid-cols-1 gap-4">
                  {/* Bilingual name fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <F label={tm("label_name_en")} required>
                      <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder={tm("placeholder_name_en")} className={FLD} />
                    </F>
                    <div>
                      <F label={tm("label_name_am")}>
                        <input value={form.name_am} onChange={e => setForm(f => ({ ...f, name_am: e.target.value }))}
                          placeholder={tm("placeholder_name_am")} className={`${FLD} font-amharic`} />
                      </F>
                      <p className="text-[10px] text-slate-400 mt-1">{tm("name_am_hint")}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <F label={tm("label_sector")} required>
                      <select required value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} className={FLD}>
                        {SECTORS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
                      </select>
                    </F>
                    <F label={tm("label_status")} required>
                      <select required value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={FLD}>
                        {STATUSES.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
                      </select>
                    </F>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <F label={tm("label_location")}>
                      <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                        placeholder={tm("placeholder_location")} className={FLD} />
                    </F>
                    <F label={tm("label_contractor")}>
                      {loadingCtr ? (
                        <div className={`${FLD} flex items-center gap-2 text-slate-400`}>
                          <Loader2 size={14} className="animate-spin" /> {tm("loading_contractors")}
                        </div>
                      ) : (
                        <select value={form.contractor_id} onChange={e => setForm(f => ({ ...f, contractor_id: e.target.value }))} className={FLD}>
                          <option value="">{tm("select_contractor")}</option>
                          {contractors.map(c => <option key={c.id} value={c.id}>{c.company_name}{c.is_verified ? " ✓" : ""}</option>)}
                        </select>
                      )}
                    </F>
                  </div>
                  <F label={tm("label_advisor")}>
                    <input value={form.advisor} onChange={e => setForm(f => ({ ...f, advisor: e.target.value }))}
                      placeholder={tm("placeholder_advisor")} className={FLD} />
                  </F>
                </div>
              </Section>

              {/* Section 2: Scope */}
              <Section label={tm("section_scope")}>
                <div className="grid grid-cols-[80px_1fr] gap-3">
                  <F label={tm("label_currency")}>
                    <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className={FLD}>
                      <option>ETB</option><option>USD</option><option>EUR</option><option>GBP</option>
                    </select>
                  </F>
                  <F label={tm("label_budget")} required>
                    <input type="number" min="0" step="0.01" required value={form.budget}
                      onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="0.00" className={FLD} />
                  </F>
                </div>
                <div className="mt-4">
                  <label className={LBL}>{tm("label_progress")}</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min="0" max="100" value={form.progress}
                      onChange={e => setForm(f => ({ ...f, progress: e.target.value }))}
                      className="flex-1 accent-[#0A1628]" />
                    <span className="text-sm font-black text-[#0A1628] w-12 text-right">{form.progress}%</span>
                  </div>
                </div>
              </Section>

              {/* Section 3: Schedule */}
              <Section label={tm("section_schedule")}>
                <div className="grid grid-cols-2 gap-4">
                  <F label={tm("label_start_date")}>
                    <div className="relative">
                      <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                        className={`${FLD} pl-10`} />
                      <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </F>
                  <F label={tm("label_end_date")}>
                    <div className="relative">
                      <input type="date" value={form.expected_end_date} onChange={e => setForm(f => ({ ...f, expected_end_date: e.target.value }))}
                        className={`${FLD} pl-10`} />
                      <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </F>
                </div>
              </Section>

              {/* Section 4: Descriptions */}
              <Section label={tm("section_descriptions")}>
                <F label={tm("label_desc_en")}>
                  <textarea rows={3} value={form.description_en}
                    onChange={e => setForm(f => ({ ...f, description_en: e.target.value }))}
                    placeholder={tm("placeholder_desc_en")} className={`${FLD} resize-none`} />
                </F>
                <F label={tm("label_desc_am")}>
                  <textarea rows={3} value={form.description_am}
                    onChange={e => setForm(f => ({ ...f, description_am: e.target.value }))}
                    placeholder={tm("placeholder_desc_am")} className={`${FLD} resize-none font-amharic`} />
                </F>
              </Section>

              {/* Error */}
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs flex gap-2 items-start">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" /> {formError}
                </div>
              )}

              {/* Footer */}
              <div className="flex gap-3 pb-4">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-3.5 border border-slate-200 rounded-2xl text-sm font-black text-slate-600 hover:bg-slate-50">
                  {tm("cancel")}
                </button>
                <button type="submit" disabled={submitting}
                  className={`flex-[2] py-3.5 text-white text-sm font-black rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2 transition-all ${
                    modalMode === "edit" ? "bg-amber-600 hover:bg-amber-700" : "bg-[#0A1628] hover:bg-slate-800"
                  }`}>
                  {submitting
                    ? <Loader2 size={16} className="animate-spin" />
                    : modalMode === "edit"
                      ? <><Save size={16} /> {tm("save_edit")}</>
                      : <><ArrowRight size={16} /> {tm("save_add")}</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Shell with Suspense (needed for useSearchParams) ──────────────────────────
export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsPageInner />
    </Suspense>
  );
}

// ─── Mini components ───────────────────────────────────────────────────────────
function StepPill({ number, label, active, done }: { number: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
      done ? "bg-emerald-500 text-white" : active ? "bg-[#0A1628] text-white" : "bg-slate-100 text-slate-400"
    }`}>
      {done ? <CheckCircle size={13} /> : <span>{String(number).padStart(2, "0")}</span>}
      {label}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <p className={`${LBL} mb-4 pb-2 border-b border-slate-100`}>{label}</p>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function F({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={LBL}>{label}</label>
      {children}
    </div>
  );
}