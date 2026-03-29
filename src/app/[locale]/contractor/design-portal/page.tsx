"use client";

import React, { useEffect, useState } from "react";
import { HardHat, FileUp, Clock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/actions/supabase/clients";
import Link from "next/link";

// 1. Define the interfaces
interface DesignSubmission {
  status: string;
}

interface ProjectTender {
  title: string;
}

interface ContractorProject {
  id: string;
  name: string;
  status: string;
  budget: number | null;
  tenders: ProjectTender | ProjectTender[] | null;
  design_submissions: DesignSubmission[] | null;
}

// 2. Define Stat Props
interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

export default function ContractorDashboard() {
  const supabase = createClient();
  // Use the interface instead of any[]
  const [myProjects, setMyProjects] = useState<ContractorProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyProjects = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, name, status, budget,
          tenders ( title ),
          design_submissions ( status )
        `)
        .eq('contractor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Fetch error:", error);
      } else {
        // Use 'unknown' bridge to cast to our interface
        setMyProjects((data as unknown as ContractorProject[]) || []);
      }
      setLoading(false);
    };
    
    fetchMyProjects();
  }, [supabase.auth]);

  if (loading) return <div className="p-16 text-center font-black uppercase text-slate-400">Loading Contracts...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8 md:p-16">
      <header className="mb-12 space-y-2">
        <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.3em]">
          <HardHat size={16} /> Partner Portal
        </div>
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
          My <span className="text-blue-600">Contracts</span>
        </h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {myProjects.map((project) => (
          <div key={project.id} className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl shadow-slate-200/40 group">
            <div className="flex justify-between items-start mb-6">
              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                project.status === 'Design Revision' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {project.status}
              </span>
              <p className="text-[10px] font-bold text-slate-400">ID: {project.id.slice(0,8)}</p>
            </div>

            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-8 group-hover:text-blue-600 transition-colors">
              {project.name}
            </h3>

            <div className="flex items-center justify-between pt-6 border-t border-slate-50">
              <div className="flex gap-4">
                 <Stat icon={<Clock size={12}/>} label="Status" value={project.status} />
                 <Stat icon={<CheckCircle2 size={12}/>} label="Submissions" value={project.design_submissions?.length || 0} />
              </div>
              
              <Link 
                href={`/contractor/projects/${project.id}/upload`}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all"
              >
                Upload Designs <FileUp size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Fixed the 'any' here by using the StatProps interface
function Stat({ icon, label, value }: StatProps) {
  return (
    <div>
      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{label}</p>
      <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-700 uppercase">
        {icon} {value}
      </div>
    </div>
  );
}