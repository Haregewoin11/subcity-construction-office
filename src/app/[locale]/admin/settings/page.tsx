"use client";

import React, { useState, useCallback } from "react";
import { 
  Settings, Building2, ShieldCheck, MapPin, 
  Save, Lock, History, Globe, AlertCircle,
  ShieldAlert, UserCog, Database
} from "lucide-react";


interface SubCitySettings {
    office_name: string;
    office_email: string;
    office_phone: string;
    address_line: string;
    working_hours: string;
    permit_types: string[]; // e.g., ["Residential", "Commercial", "Public"]
    woredas: string[];      // List of Woredas in Lemi Kura
    maintenance_mode: boolean;
    allow_public_tenders: boolean;
  }
// ── Specialized Sub-Components ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SettingSection = ({ title, description, children }: any) => (
  <div className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
    <div className="mb-4">
      <h3 className="text-lg font-black text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      {children}
    </div>
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AdminInput = ({ label, icon: Icon, ...props }: any) => (
  <div className="flex flex-col gap-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
      {Icon && <Icon size={12} />} {label}
    </label>
    <input 
      {...props}
      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
    />
  </div>
);

// ── Main Dashboard Module ──────────────────────────────────────────────────

export default function ConstructionSettings() {
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    // Simulate API call to update site_settings
    setTimeout(() => {
      setIsSaving(false);
      // Trigger success toast here
    }, 1200);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header with Breadcrumbs */}
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 mb-2 uppercase tracking-tighter">
              <ShieldCheck size={14} /> System Administration
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Portal Settings
            </h1>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-2xl font-black flex items-center gap-3 transition-all active:scale-95 disabled:opacity-70 shadow-lg shadow-slate-200"
          >
            {isSaving ? "Synchronizing..." : <><Save size={18} /> Deploy Changes</>}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-3 space-y-1">
            <NavBtn id="general" icon={<Building2 size={18}/>} label="Office Profile" active={activeTab} setActive={setActiveTab} />
            <NavBtn id="jurisdiction" icon={<MapPin size={18}/>} label="Jurisdiction" active={activeTab} setActive={setActiveTab} />
            <NavBtn id="security" icon={<Lock size={18}/>} label="Security & Auth" active={activeTab} setActive={setActiveTab} />
            <NavBtn id="logs" icon={<History size={18}/>} label="Audit Trail" active={activeTab} setActive={setActiveTab} />
          </aside>

          {/* Main Configuration Panels */}
          <div className="lg:col-span-9">
            
            {activeTab === "general" && (
              <SettingSection 
                title="Office Metadata" 
                description="General identification for Lemi Kura Sub-City communications."
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AdminInput label="Department Name" defaultValue="Construction & Land Management" />
                  <AdminInput label="Public Support Email" defaultValue="support@lemikura.gov.et" />
                  <AdminInput label="Official Phone" defaultValue="+251 11 123 4567" />
                  <AdminInput label="Office ID / Code" defaultValue="LK-CONST-01" />
                </div>
              </SettingSection>
            )}

            {activeTab === "security" && (
              <div className="space-y-6">
                <SettingSection 
                  title="Access Governance" 
                  description="Control administrative access and system-wide security protocols."
                >
                  <div className="flex items-center justify-between p-4 bg-red-50/50 border border-red-100 rounded-2xl">
                    <div className="flex gap-4">
                      <div className="p-3 bg-red-100 text-red-600 rounded-xl h-fit">
                        <ShieldAlert size={20} />
                      </div>
                      <div>
                        <p className="font-black text-slate-800">Maintenance Lockdown</p>
                        <p className="text-xs text-slate-500">Instantly revoke public access to all permit services.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>
                </SettingSection>

                <SettingSection title="IP Whitelisting" description="Restrict dashboard access to government network ranges.">
                  <div className="flex gap-2">
                    <input className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm" placeholder="e.g. 192.168.1.1" />
                    <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">Add IP</button>
                  </div>
                </SettingSection>
              </div>
            )}

            {activeTab === "logs" && (
              <SettingSection title="System Audit Trail" description="Detailed immutable record of administrative modifications.">
                <div className="overflow-hidden border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Administrator</th>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <LogRow time="2026-03-29 14:10" user="Admin_Haregewoin" action="Updated Permit Thresholds" status="Success" />
                      <LogRow time="2026-03-29 09:45" user="System_Auto" action="Database Backup" status="Success" />
                      <LogRow time="2026-03-28 16:20" user="Admin_Tesfaye" action="Modified IP Whitelist" status="Security Alert" alert />
                    </tbody>
                  </table>
                </div>
              </SettingSection>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helper Components ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NavBtn({ id, icon, label, active, setActive }: any) {
  const isActive = active === id;
  return (
    <button 
      onClick={() => setActive(id)}
      className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold transition-all ${
        isActive 
          ? "bg-white text-blue-600 shadow-sm border border-slate-200" 
          : "text-slate-500 hover:bg-slate-200/50 border border-transparent"
      }`}
    >
      {icon} <span className="text-sm">{label}</span>
    </button>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LogRow({ time, user, action, status, alert }: any) {
  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{time}</td>
      <td className="px-4 py-3 font-bold text-slate-700">{user}</td>
      <td className="px-4 py-3 text-slate-600">{action}</td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${alert ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {status}
        </span>
      </td>
    </tr>
  );
}