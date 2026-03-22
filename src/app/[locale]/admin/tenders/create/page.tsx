"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/actions/supabase/clients";
import { ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

type Project = { id: string; name: string; sector: string; location: string; budget: number };

const WOREDA_LIST = ["Woreda 1","Woreda 2","Woreda 3","Woreda 4","Woreda 5",
  "Woreda 6","Woreda 7","Woreda 8","Woreda 9","Woreda 10","Woreda 11","Woreda 12","Woreda 13"];

const PROJECT_TYPES = ["School","Health","Youth","Road","Other"];

const REQUIRED_DOCS_OPTIONS = [
  "Technical Proposal","Financial Proposal","Company Registration","Tax Clearance",
  "PPESA License","Bank Statement","Previous Experience","Performance Bond","Bid Security"
];

export default function CreateTenderPage() {
  const supabase = createClient();
  const router = useRouter();

  const [plannedProjects, setPlannedProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    project_id: "",
    title: "",
    description: "",
    project_type: "",
    woreda: "",
    budget_estimate: "",
    submission_deadline: "",
    closing_date: "",
    evaluation_method: "Lowest Price",
    min_experience_years: "0",
    required_documents: [] as string[],
    currency: "ETB",
  });

  // Fetch only Planned projects
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("projects")
        .select("id, name, sector, location, budget")
        .eq("status", "Planned")
        .order("name");
      setPlannedProjects(data || []);
      setLoadingProjects(false);
    }
    load();
  }, []);

  function handleDocToggle(doc: string) {
    setForm(f => ({
      ...f,
      required_documents: f.required_documents.includes(doc)
        ? f.required_documents.filter(d => d !== doc)
        : [...f.required_documents, doc]
    }));
  }

  // Auto-fill from selected project
  function handleProjectChange(projectId: string) {
    const project = plannedProjects.find(p => p.id === projectId);
    if (project) {
      setForm(f => ({
        ...f,
        project_id: projectId,
        project_type: project.sector === "Schools" ? "School"
          : project.sector === "Health" ? "Health"
          : project.sector === "Youth" ? "Youth" : "Other",
        budget_estimate: project.budget ? String(project.budget) : f.budget_estimate,
      }));
    } else {
      setForm(f => ({ ...f, project_id: projectId }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (!form.project_id) {
      setError("Please select a planned project.");
      setSubmitting(false);
      return;
    }

    // Generate ref_no
    const ref_no = `TND-${Date.now().toString().slice(-6)}`;

    const { error: err } = await supabase.from("tenders").insert({
      ref_no,
      project_id: form.project_id,
      title: form.title,
      description: form.description,
      project_type: form.project_type,
      woreda: form.woreda,
      budget_estimate: Number(form.budget_estimate),
      submission_deadline: form.submission_deadline,
      closing_date: form.closing_date || null,
      evaluation_method: form.evaluation_method,
      min_experience_years: Number(form.min_experience_years),
      required_documents: form.required_documents,
      currency: form.currency,
      status: "Draft",
      visible_to_public: false,
    });

    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/admin/tenders/registry"), 2000);
    }
    setSubmitting(false);
  }

  if (success) {
    return (
 
        <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9]">
          <div className="bg-white rounded-[2rem] p-12 shadow-xl text-center max-w-md">
            <CheckCircle2 size={56} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-[#0B3C5D] mb-2">Tender Drafted!</h2>
            <p className="text-slate-500 text-sm">Your tender has been saved as a Draft. Send it to the Committee for review and approval.</p>
            <p className="text-xs text-slate-400 mt-4">Redirecting to registry...</p>
          </div>
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-[#F4F6F9] p-8">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/admin/tenders" className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-[#2C2C2C]">Create Tender</h1>
              <p className="text-sm font-bold text-slate-500">Draft a new procurement tender linked to a planned project</p>
            </div>
          </div>

          {/* Workflow hint */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-8 flex gap-3">
            <AlertCircle size={18} className="text-blue-500 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-700">
              <span className="font-black">Workflow:</span> Only projects with <strong>Planned</strong> status appear below.
              After drafting, send to Committee → Approval → Auto-Published → Bids → Evaluation → Award → Contract Signed → Design Phase.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Project Selection */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5">Linked Project</h2>

              {loadingProjects ? (
                <div className="flex items-center gap-2 text-slate-400"><Loader2 size={16} className="animate-spin" /> Loading planned projects...</div>
              ) : plannedProjects.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700 text-sm">
                  No projects with <strong>Planned</strong> status found. Please create a project first and set its status to Planned.
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-2">Select Planned Project *</label>
                  <select
                    required
                    value={form.project_id}
                    onChange={e => handleProjectChange(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]"
                  >
                    <option value="">-- Select a project --</option>
                    {plannedProjects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.sector} {p.location ? `| ${p.location}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Showing {plannedProjects.length} planned project{plannedProjects.length !== 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </div>

            {/* Tender Details */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5">Tender Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-black uppercase text-slate-500 mb-2">Tender Title *</label>
                  <input
                    required value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Construction of Woreda 3 Primary School"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-black uppercase text-slate-500 mb-2">Description</label>
                  <textarea
                    rows={3} value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Scope of work, objectives..."
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C5D] resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-2">Project Type *</label>
                  <select required value={form.project_type}
                    onChange={e => setForm(f => ({ ...f, project_type: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]"
                  >
                    <option value="">Select type</option>
                    {PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-2">Woreda *</label>
                  <select required value={form.woreda}
                    onChange={e => setForm(f => ({ ...f, woreda: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]"
                  >
                    <option value="">Select woreda</option>
                    {WOREDA_LIST.map(w => <option key={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-2">Budget Estimate *</label>
                  <div className="flex gap-2">
                    <select value={form.currency}
                      onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                      className="border border-slate-200 rounded-xl px-3 py-3 text-sm bg-slate-50 focus:outline-none">
                      <option>ETB</option><option>USD</option>
                    </select>
                    <input required type="number" min="0" value={form.budget_estimate}
                      onChange={e => setForm(f => ({ ...f, budget_estimate: e.target.value }))}
                      placeholder="0.00"
                      className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-2">Evaluation Method</label>
                  <select value={form.evaluation_method}
                    onChange={e => setForm(f => ({ ...f, evaluation_method: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]">
                    <option value="Lowest Price">Lowest Price</option>
                    <option value="Weighted Score">Weighted Score</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-2">Bid Submission Deadline *</label>
                  <input required type="datetime-local" value={form.submission_deadline}
                    onChange={e => setForm(f => ({ ...f, submission_deadline: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-2">Bid Closing Date</label>
                  <input type="datetime-local" value={form.closing_date}
                    onChange={e => setForm(f => ({ ...f, closing_date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-2">Min. Experience (Years)</label>
                  <input type="number" min="0" value={form.min_experience_years}
                    onChange={e => setForm(f => ({ ...f, min_experience_years: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]"
                  />
                </div>
              </div>
            </div>

            {/* Required Documents */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5">Required Bidder Documents</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {REQUIRED_DOCS_OPTIONS.map(doc => (
                  <label key={doc} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    form.required_documents.includes(doc)
                      ? "border-[#0B3C5D] bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}>
                    <input type="checkbox" className="accent-[#0B3C5D]"
                      checked={form.required_documents.includes(doc)}
                      onChange={() => handleDocToggle(doc)} />
                    <span className="text-xs font-bold text-slate-600">{doc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 justify-end pb-8">
              <Link href="/admin/tenders" className="px-6 py-3 rounded-xl border border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50">
                Cancel
              </Link>
              <button type="submit" disabled={submitting || plannedProjects.length === 0}
                className="px-8 py-3 rounded-xl bg-[#0B3C5D] text-white text-sm font-black hover:bg-[#0a3354] disabled:opacity-50 flex items-center gap-2">
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Save as Draft
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}