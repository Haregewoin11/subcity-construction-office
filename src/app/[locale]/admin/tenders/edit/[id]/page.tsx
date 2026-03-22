"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Save, ArrowLeft, Loader2, ShieldAlert, 
  FileText, MapPin, Coins, Layout 
} from "lucide-react";
import { createClient } from "@/lib/actions/supabase/clients";
import { toast } from "sonner";

export default function EditTenderPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  // Fetch current data
  useEffect(() => {
    async function fetchTender() {
      const { data, error } = await supabase
        .from('tenders')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        toast.error("Could not retrieve node data");
        router.push("/admin/tenders/registry");
      } else {
        setFormData(data);
      }
      setLoading(false);
    }
    fetchTender();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('tenders')
      .update({
        title: formData.title,
        description: formData.description,
        project_type: formData.project_type,
        woreda: formData.woreda,
        budget_estimate: parseFloat(formData.budget_estimate),
        currency: formData.currency,
        status: formData.status
      })
      .eq('id', id);

    if (error) {
      toast.error(`Forensic Error: ${error.message}`);
    } else {
      toast.success("Tender Node Updated Successfully");
      router.push("/admin/tenders/registry");
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <Loader2 className="animate-spin text-[#0B3C5D]" size={48} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <button 
              onClick={() => router.back()} 
              className="flex items-center gap-2 text-sm font-black uppercase text-slate-400 hover:text-[#0B3C5D] transition-colors"
            >
              <ArrowLeft size={16} /> Cancel & Return
            </button>
            <h1 className="text-4xl font-black text-[#1A1A1A] uppercase tracking-tight">Edit Tender Node</h1>
            <p className="text-base font-mono font-bold text-[#0B3C5D]">{formData.ref_no}</p>
          </div>

          <div className="px-6 py-4 bg-amber-50 border-2 border-amber-100 rounded-3xl flex items-center gap-3">
             <ShieldAlert size={24} className="text-amber-600" />
             <span className="text-sm font-black uppercase text-amber-700 tracking-wide">Modification Mode Active</span>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* PRIMARY DATA CARD */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 space-y-8">
              
              {/* Title Input */}
              <div className="space-y-3">
                <label className="text-sm font-black uppercase text-slate-500 ml-2">Official Project Title</label>
                <input 
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-[#0B3C5D] focus:bg-white p-5 rounded-2xl font-black text-xl outline-none transition-all"
                />
              </div>

              {/* Description Textarea */}
              <div className="space-y-3">
                <label className="text-sm font-black uppercase text-slate-500 ml-2">Scope & Description</label>
                <textarea 
                  required
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-[#0B3C5D] focus:bg-white p-5 rounded-2xl font-bold text-base outline-none transition-all"
                />
              </div>

              {/* Budget & Currency */}
              <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                <div className="space-y-3">
                  <label className="text-sm font-black uppercase text-slate-500 ml-2 flex items-center gap-2">
                    <Coins size={16} /> Budget Estimate
                  </label>
                  <input 
                    type="number"
                    value={formData.budget_estimate}
                    onChange={(e) => setFormData({...formData, budget_estimate: e.target.value})}
                    className="w-full bg-slate-50 p-5 rounded-2xl font-black text-lg outline-none"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-black uppercase text-slate-500 ml-2">Workflow Status</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-slate-50 p-5 rounded-2xl font-black text-base outline-none border-2 border-transparent focus:border-[#0B3C5D]"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Internal Review">Internal Review</option>
                    <option value="Published">Published</option>
                    <option value="Evaluation">Evaluation</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECONDARY INFO CARD */}
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-8">
              <h3 className="text-sm font-black uppercase text-[#0B3C5D] tracking-widest border-b pb-4">Classification</h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 flex items-center gap-2"><Layout size={14}/> Category</label>
                  <select 
                    value={formData.project_type}
                    onChange={(e) => setFormData({...formData, project_type: e.target.value})}
                    className="w-full bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none"
                  >
                    <option value="Building">Building Construction</option>
                    <option value="Road">Road & Civil Works</option>
                    <option value="Water">Water & Sewerage</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 flex items-center gap-2"><MapPin size={14}/> Woreda Location</label>
                  <input 
                    value={formData.woreda}
                    onChange={(e) => setFormData({...formData, woreda: e.target.value})}
                    className="w-full bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={saving}
                className="w-full bg-[#2E8B57] hover:bg-[#257046] text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-base shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Commit Changes</>}
              </button>
            </div>

            <div className="p-8 bg-[#0B3C5D] rounded-[2.5rem] text-white space-y-4">
               <div className="flex items-center gap-2">
                 <FileText className="text-blue-300" />
                 <p className="text-xs font-black uppercase tracking-widest">Document Integrity</p>
               </div>
               <p className="text-sm font-medium opacity-60">
                 The original tender document cannot be replaced in "Edit" mode to maintain the forensic trail. If a document change is required, please re-initialize the node.
               </p>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}