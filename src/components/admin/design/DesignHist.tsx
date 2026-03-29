"use client";

import React from "react";
import { Clock, Download } from "lucide-react";

// 1. Define the internal comment structure
interface DesignComment {
  id: string;
  comment_text: string;
  created_at: string;
}

// 2. Define the History Item structure
interface HistoryItem {
  id: string;
  status: 'Approved' | 'Rejected' | 'Pending Review' | string;
  drawing_type: string;
  created_at: string;
  file_url: string;
  design_comments?: DesignComment[]; // Optional array of comments
}

// 3. Define the Component Props
interface DesignHistoryProps {
  history: HistoryItem[];
}

export function DesignHistory({ history }: DesignHistoryProps) {
  if (!history || history.length === 0) return null;

  return (
    <div className="mt-8 space-y-6 border-l-2 border-slate-100 ml-4 pl-8 relative">
      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
        <Clock size={14} /> Technical Revision Timeline
      </h4>
      
      {history.map((item, idx) => (
        <div key={item.id} className="relative group">
          {/* Status Dot */}
          <div className={`absolute -left-[41px] top-0 w-5 h-5 rounded-full border-4 border-[#F8FAFC] shadow-sm z-10 transition-transform group-hover:scale-125 ${
            item.status === 'Approved' ? 'bg-emerald-500' : 
            item.status === 'Rejected' ? 'bg-rose-500' : 
            'bg-amber-400'
          }`} />
          
          <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 hover:bg-white hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">
                  {item.drawing_type} — v{history.length - idx}
                </p>
                <p className="text-[9px] font-bold text-slate-400">
                  {new Date(item.created_at).toLocaleDateString()} • {new Date(item.created_at).toLocaleTimeString()}
                </p>
              </div>
              
              <a 
                href={item.file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-white rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              >
                <Download size={14} />
              </a>
            </div>

            {/* Safely check for comments using the defined interface */}
            {item.design_comments && item.design_comments.length > 0 && (
              <div className="bg-white p-3 rounded-xl border-l-2 border-blue-400 shadow-sm">
                <p className="text-[10px] font-medium text-slate-600 italic">
                  &#34;{item.design_comments[0].comment_text}&#34;
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}