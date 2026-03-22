"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { 
  Calendar, MapPin, FileText, ArrowRight, 
  ShieldCheck, Info, Landmark 
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/actions/supabase/clients";

export default function PublicTenderView() {
  const { id } = useParams();
  const supabase = createClient();
  const [tender, setTender] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTender() {
      const { data } = await supabase.from('tenders').select('*').eq('id', id).single();
      setTender(data);
      setLoading(false);
    }
    fetchTender();
  }, [id]);

  if (loading) return <div className="p-20 text-center font-black animate-pulse">SYNCING NODE...</div>;
  if (!tender) return <div className="p-20 text-center">Tender Node Not Found</div>;

  return (
    <div className="min-h-screen bg-white p-8 md:p-16">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* BREADCRUMB / STATUS */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3 text-emerald-600">
            <ShieldCheck size={20} />
            <span className="text-sm font-black uppercase tracking-widest">Official Publication</span>
          </div>
          <div className="px-4 py-2 bg-slate-100 rounded-full text-[11px] font-black uppercase text-slate-500">
            Ref: {tender.ref_no}
          </div>
        </div>

        {/* TITLE & DESCRIPTION */}
        <div className="space-y-6">
          <h1 className="text-5xl font-black text-slate-900 leading-tight uppercase tracking-tighter">
            {tender.title}
          </h1>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2 text-slate-500 font-bold">
              <MapPin size={18} className="text-[#0B3C5D]" />
              <span className="text-base">{tender.subcity}, {tender.woreda}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 font-bold">
              <Calendar size={18} className="text-[#0B3C5D]" />
              <span className="text-base">Deadline: {new Date(tender.submission_deadline).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* SCOPE CARD */}
        <div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-100 space-y-6">
          <h3 className="text-lg font-black uppercase flex items-center gap-3 text-[#0B3C5D]">
            <Info size={22} /> Project Scope
          </h3>
          <p className="text-lg text-slate-600 leading-relaxed font-medium">
            {tender.description}
          </p>
        </div>

        {/* THE LINKING COMPONENT (APPLICATION CTA) */}
        <div className="grid md:grid-cols-2 gap-8 items-center pt-8">
          <div className="space-y-4">
            <h4 className="text-xl font-black text-slate-900 uppercase">Ready to submit?</h4>
            <p className="text-base text-slate-500 font-medium">
              Ensure your technical and financial documents are formatted according to the sub-city directive.
            </p>
          </div>
          
          {/* We pass the ID through the URL to the submission page */}
          <Link 
            href={`/tenders/${id}/apply`} 
            className="flex items-center justify-between bg-[#0B3C5D] text-white p-8 rounded-[2.5rem] shadow-2xl hover:bg-black transition-all group"
          >
            <div className="text-left">
              <p className="text-xs font-black uppercase opacity-60 tracking-widest mb-1">Begin Submission</p>
              <p className="text-xl font-black">Submit Bid Proposal</p>
            </div>
            <ArrowRight size={32} className="group-hover:translate-x-3 transition-transform" />
          </Link>
        </div>

      </div>
    </div>
  );
}