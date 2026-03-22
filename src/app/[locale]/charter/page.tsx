"use client";

import { 
  FileText, Clock, ClipboardCheck, 
  MessageSquare, ShieldAlert, Send, 
  Download, Search 
} from "lucide-react";

export default function CitizensCharterPage() {
  const services = [
    {
      title: "Building Permit",
      time: "7 Working Days",
      requirements: ["Site Plan", "Design Document", "Land Ownership Title"],
      category: "Construction"
    },
    {
      title: "Design Review",
      time: "5 Working Days",
      requirements: ["Architectural Drawing", "Structural Analysis"],
      category: "Planning"
    },
    {
      title: "Site Inspection",
      time: "3 Working Days",
      requirements: ["Request Letter", "Previous Inspection Report"],
      category: "Audit"
    }
  ];

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#F4F6F9' }}>
      {/* Header Section */}
      <div className="py-16 text-center text-white shadow-lg" style={{ backgroundColor: '#0B3C5D' }}>
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Citizens Charter</h1>
        <p className="text-blue-200 text-xs font-bold uppercase tracking-[0.3em]">
          Lemi Kura Sub-City Construction Office / 2017 EC
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-10">
        
        {/* SECTION 1: SERVICE REGISTRY TABLE */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden mb-12">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <ClipboardCheck size={24} style={{ color: '#0B3C5D' }} />
              <h2 className="font-black uppercase text-sm tracking-tight" style={{ color: '#2C2C2C' }}>
                Service Delivery Standards
              </h2>
            </div>
            <button className="flex items-center gap-2 text-[10px] font-black uppercase text-[#0B3C5D] border-b-2 border-[#0B3C5D]">
              <Download size={14} /> Download PDF Charter
            </button>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr style={{ backgroundColor: '#F4F6F9' }}>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-[#6C757D]">Service Type</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-[#6C757D]">Processing Time</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-[#6C757D]">Requirements</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {services.map((service, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-6">
                    <span className="text-sm font-bold block" style={{ color: '#0B3C5D' }}>{service.title}</span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                      {service.category}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <Clock size={14} style={{ color: '#2E8B57' }} />
                      <span className="text-sm font-black" style={{ color: '#2E8B57' }}>{service.time}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <ul className="space-y-1">
                      {service.requirements.map((req, i) => (
                        <li key={i} className="text-xs text-[#6C757D] flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-slate-300" /> {req}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SECTION 2: COMPLAINT SUBMISSION (The Forensic Intake) */}
        <div className="grid md:grid-cols-5 gap-8 items-start">
          <div className="md:col-span-2 space-y-4">
            <div className="p-8 rounded-3xl text-white shadow-xl" style={{ backgroundColor: '#0B3C5D' }}>
              <ShieldAlert size={40} className="mb-4" style={{ color: '#F4A261' }} />
              <h3 className="text-xl font-black uppercase leading-tight">Grievance Redress Mechanism</h3>
              <p className="text-xs text-blue-100 mt-2 leading-relaxed">
                As part of our commitment to national cybersecurity and integrity, every complaint is digitally logged and forensically tracked.
              </p>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-slate-200 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-[#2E8B57]/10">
                <MessageSquare size={20} style={{ color: '#2E8B57' }} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Hotline</p>
                <p className="text-sm font-bold text-[#2C2C2C]">8888 (Toll Free)</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-3 bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-200">
            <h3 className="text-xl font-black uppercase mb-6" style={{ color: '#2C2C2C' }}>Submit Feedback</h3>
            <form className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Full Name</label>
                  <input className="w-full px-5 py-3 bg-[#F4F6F9] border-none rounded-2xl outline-none focus:ring-2 focus:ring-[#0B3C5D]" placeholder="Enter name..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Phone Number</label>
                  <input className="w-full px-5 py-3 bg-[#F4F6F9] border-none rounded-2xl outline-none focus:ring-2 focus:ring-[#0B3C5D]" placeholder="09..." />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Description of Issue</label>
                <textarea rows={4} className="w-full px-5 py-3 bg-[#F4F6F9] border-none rounded-2xl outline-none focus:ring-2 focus:ring-[#0B3C5D]" placeholder="Describe the service issue or complaint..." />
              </div>
              <button 
                type="button" 
                className="w-full py-4 rounded-2xl text-white font-black uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-3 transition-transform active:scale-95"
                style={{ backgroundColor: '#0B3C5D' }}
              >
                Submit to Registry <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}