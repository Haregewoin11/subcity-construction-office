"use client";

import React from "react";
import { FileText, ArrowRight, AlertCircle, CheckCircle, Scale } from "lucide-react";

// 1. Define the Submission interface
interface Submission {
  id: string;
  file_url: string;
  created_at?: string;
  // Add other fields as necessary
}

// 2. Update the Props interface
interface RevisionComparisonProps {
  oldSubmission: Submission | null;
  newSubmission: Submission | null;
  rejectionRemarks: string;
}

export function RevisionComparison({ 
  oldSubmission, 
  newSubmission, 
  rejectionRemarks 
}: RevisionComparisonProps) {
  
  // Helper to safely extract filename from URL
  const getFileName = (url?: string) => {
    if (!url) return "No file attached";
    return url.split('/').pop() || "Document.pdf";
  };

  return (
    <div className="bg-slate-900 rounded-[3rem] p-10 text-white space-y-8 shadow-2xl overflow-hidden relative">
      {/* Decorative Forensic Background */}
      <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
        <Scale size={150} />
      </div>

      <div className="flex items-center gap-4 border-b border-white/10 pb-6">
        <div className="p-3 bg-blue-600 rounded-2xl">
          <Scale size={20} />
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-white">Forensic Delta Analysis</h3>
          <p className="text-[9px] font-bold text-white/40 uppercase">Comparing Version History for Re-Certification</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 relative z-10">
        {/* REJECTED VERSION */}
        <div className="space-y-4 opacity-60 grayscale hover:grayscale-0 transition-all">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-rose-400">
            <AlertCircle size={14} /> Rejected Version
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
             <div className="flex justify-between items-start mb-4">
                <FileText size={32} className="text-slate-400" />
                <span className="text-[8px] font-black bg-rose-500/20 text-rose-400 px-2 py-1 rounded">V1.0</span>
             </div>
             <p className="text-xs font-bold truncate">{getFileName(oldSubmission?.file_url)}</p>
             <div className="mt-4 p-4 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <p className="text-[9px] font-black text-rose-300 uppercase mb-1">Auditor&#39;s Concern:</p>
                <p className="text-[10px] italic text-rose-100 leading-relaxed">&#39;{rejectionRemarks}&#39;</p>
             </div>
          </div>
        </div>

        {/* REVISED VERSION */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-400">
            <CheckCircle size={14} /> Corrective Submission
          </div>
          <div className="bg-white/10 border-2 border-emerald-500/30 p-6 rounded-3xl shadow-xl shadow-emerald-500/5">
             <div className="flex justify-between items-start mb-4">
                <FileText size={32} className="text-emerald-400" />
                <span className="text-[8px] font-black bg-emerald-500 text-slate-900 px-2 py-1 rounded">V1.1 (LATEST)</span>
             </div>
             <p className="text-xs font-black truncate">{getFileName(newSubmission?.file_url)}</p>
             <a 
               href={newSubmission?.file_url} 
               target="_blank"
               rel="noopener noreferrer"
               className="mt-6 block w-full py-4 bg-emerald-500 text-slate-900 text-center text-[10px] font-black uppercase rounded-2xl hover:bg-white transition-all"
             >
                Open & Verify Changes
             </a>
          </div>
        </div>
        
        {/* Connector Arrow */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-slate-800 border border-white/10 rounded-full items-center justify-center pointer-events-none">
          <ArrowRight className="text-blue-500" />
        </div>
      </div>
    </div>
  );
}