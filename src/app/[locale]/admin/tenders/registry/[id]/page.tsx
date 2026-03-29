"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { 
  ArrowLeft, ShieldCheck, Clock, FileText, 
  CheckCircle2, AlertCircle, Send, Globe,
  Download, History, Briefcase, Landmark
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/actions/supabase/clients";
import { toast } from "sonner";

export default function TenderDetailControl() {
  const { id } = useParams();
  const supabase = createClient();
  
  const [tender, setTender] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTender() {
      const { data, error } = await supabase
        .from('tenders')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!error) setTender(data);
      setLoading(false);
    }
    fetchTender();
  }, [id]);

  const updateStatus = async (newStatus: string) => {
    setLoading(true);
    const { error } = await supabase
      .from('tenders')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      setTender({ ...tender, status: newStatus });
      toast.success(`Transitioned to ${newStatus}`);
    } else {
      toast.error("Forensic Lock: Status update failed");
    }
    setLoading(false);
  };

  if (loading && !tender) return <div className="p-20 text-center font-black animate-pulse uppercase">Syncing Node...</div>;

  return (
    <>
    <div className="min-h-screen bg-[#F8FAFC] p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* TOP NAV & STATUS FLOW */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <Link href="/admin/tenders/registry" className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-[#0B3C5D]">
              <ArrowLeft size={14} /> Back to Registry
            </Link>
            <h1 className="text-3xl font-black text-[#1A1A1A] uppercase tracking-tighter">{tender.title}</h1>
            <p className="text-xs font-mono text-[\#0B3C5D]\ font-bold">{tender.ref_no}</p>
          </div>
          
          {/* ACTION HUB (Stage Controller) */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
             <div className="px-4 border-r border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Current Phase</p>
                <span className="text-[10px] font-black uppercase text-\[\#0B3C5D\]">{tender.status}</span>
             </div>
             
             {/* Dynamic Action Buttons based on Stage */}
             {tender.status === 'Draft' && (
               <button onClick={() => updateStatus('Internal Review')} className="bg-[\#0B3C5D]\ text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                 <Send size={14} /> Submit for Review
               </button>
             )}
             {tender.status === 'Internal Review' && (
               <button onClick={() => updateStatus('Published')} className="bg-[\#2E8B57]\ text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                 <Globe size={14} /> Approve & Publish
               </button>
             )}
          </div>
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* LEFT: SPECS & FORENSICS */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
              <div className="flex items-center gap-2 text-[#0B3C5D] pb-4 border-b border-slate-50">
                <Briefcase size={20} />
                <h3 className="text-xs font-black uppercase tracking-widest">Project Scope</h3>
              </div>
              
              <p className="text-sm font-medium text-slate-600 leading-relaxed">
                {tender.description || "No detailed description provided for this node."}
              </p>

              <div className="grid md:grid-cols-3 gap-6 pt-6">
                <div className="bg-slate-50 p-6 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Fiscal Node</p>
                  <p className="text-lg font-black text-[#0B3C5D]">{new Intl.NumberFormat().format(tender.budget_estimate)} <span className="text-[10px]">{tender.currency}</span></p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Category</p>
                  <p className="text-lg font-black text-[#0B3C5D]">{tender.project_type}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Sub-City Region</p>
                  <p className="text-lg font-black text-[#0B3C5D]">{tender.woreda}</p>
                </div>
              </div>
            </div>

            {/* LIVE TIMELINE (Forensic Audit Trail) */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
               <div className="flex items-center gap-2 text-[#0B3C5D] mb-8">
                  <History size={20} />
                  <h3 className="text-xs font-black uppercase tracking-widest">Audit Lifecycle</h3>
               </div>
               <div className="space-y-6">
                 {[
                   { stage: 'Draft Initialized', date: tender.created_at, icon: CheckCircle2, completed: true },
                   { stage: 'Internal Review', date: '-', icon: Clock, completed: tender.status !== 'Draft' },
                   { stage: 'Public Publication', date: '-', icon: Globe, completed: false },
                 ].map((step, i) => (
                   <div key={i} className={`flex items-center gap-4 ${step.completed ? 'opacity-100' : 'opacity-30'}`}>
                      <div className={`p-2 rounded-lg ${step.completed ? 'bg-[#2E8B57] text-white' : 'bg-slate-100'}`}>
                        <step.icon size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider">{step.stage}</p>
                        <p className="text-[9px] font-medium text-slate-400">{step.date}</p>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>

          {/* RIGHT: DOCUMENT VAULT & ALERTS */}
          <div className="space-y-6">
            <div className="bg-[#0B3C5D] p-8 rounded-[3rem] text-white shadow-2xl space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Landmark size={18} className="text-[#F4A261]" /> Legal Vault
              </h3>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <FileText size={20} className="text-blue-300" />
                     <p className="text-[10px] font-bold uppercase">Technical_Spec.pdf</p>
                   </div>
                   <a href={tender.document_url} target="_blank" className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all">
                     <Download size={16} />
                   </a>
                </div>
              </div>
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-start gap-3">
                 <AlertCircle size={16} className="text-[#F4A261] shrink-0 mt-1" />
                 <p className="text-[9px] font-medium text-orange-100 leading-relaxed uppercase">
                   Warning: This tender is in {tender.status} mode. It is not yet visible to the construction market.
                 </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <ShieldCheck className="text-[#2E8B57]" size={20} />
                 <span className="text-[10px] font-black uppercase text-slate-500">Node Integrity: Verified</span>
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
    </>
  );
}