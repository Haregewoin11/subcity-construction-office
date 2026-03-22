"use client";
import React, { useState } from "react";
import { ShieldCheck, X, AlertTriangle, FileCheck, Landmark } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  projectName: string;
}

export function CertificationModal({ isOpen, onClose, onConfirm, projectName }: Props) {
  const [checked, setChecked] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-8 bg-[#0B3C5D] text-white flex justify-between items-center relative overflow-hidden">
          <div className="absolute right-[-10%] top-[-20%] opacity-10 rotate-12">
            <Landmark size={180} />
          </div>
          <div className="flex items-center gap-4 z-10">
            <div className="p-3 bg-white/10 rounded-2xl">
              <ShieldCheck className="text-amber-400" size={24} />
            </div>
            <div>
              <h3 className="font-black uppercase text-xs tracking-[0.2em] italic">Technical Certification</h3>
              <p className="text-[10px] font-bold text-white/60 uppercase">Forensic Approval Node</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:rotate-90 transition-all opacity-70 hover:opacity-100 z-10"><X /></button>
        </div>

        <div className="p-10 space-y-8">
          <div className="bg-amber-50 rounded-[2rem] p-6 border border-amber-100 flex gap-4">
            <AlertTriangle className="text-amber-500 shrink-0" size={24} />
            <p className="text-[11px] font-bold text-amber-800 leading-relaxed uppercase">
              Warning: Sealing this design will freeze technical revisions and move <span className="underline">"{projectName}"</span> to the BOQ & Cost Verification phase.
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all group">
              <input 
                type="checkbox" 
                className="w-5 h-5 rounded-md border-2 border-slate-300 text-blue-600 focus:ring-blue-500"
                checked={checked}
                onChange={() => setChecked(!checked)}
              />
              <span className="text-[10px] font-black text-slate-600 uppercase leading-tight tracking-tighter">
                I certify that all structural, architectural, and sanitary drawings meet the Lemi Kura construction standards.
              </span>
            </label>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="flex-1 py-5 rounded-[1.5rem] text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button 
              disabled={!checked}
              onClick={onConfirm}
              className={`flex-1 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl transition-all ${
                checked ? 'bg-blue-600 text-white shadow-blue-100 hover:bg-black' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}
            >
              <FileCheck size={16} /> Seal & Graduate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}