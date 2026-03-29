"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function Register() {
  const [formData, setFormData] = useState({ email: '', password: '', role: 'main_admin' });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
      <div className="w-full max-w-md bg-white p-10 shadow-2xl rounded-sm border-t-8 border-[#003366]">
        <h2 className="text-3xl font-bold text-[#003366] mb-2 uppercase tracking-tight">System Registry</h2>
        <p className="text-slate-500 mb-8 text-sm">Official Sub-City Construction Portal</p>
        
        <form className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Office Email</label>
            <input type="email" className="w-full p-3 border-2 border-slate-200 focus:border-[#003366] outline-none transition" required />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Administrative Role</label>
            <select 
              className="w-full p-3 border-2 border-slate-200 bg-white focus:border-[#003366] outline-none"
              onChange={(e) => setFormData({...formData, role: e.target.value})}
            >
              <option value="main_admin">Main Admin</option>
              <option value="project_admin">Project Admin</option>
              <option value="tenders_admin">Tenders Admin</option>
              <option value="design_supervision">Design & Supervision Admin</option>
              <option value="committee">Committee Member</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
            <input type="password" className="w-full p-3 border-2 border-slate-200 focus:border-[#003366] outline-none" required />
          </div>

          <button className="w-full bg-[#003366] text-white p-4 font-bold uppercase hover:bg-[#002244] transition shadow-md">
            Authorize Account
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-600">
          Already have access? 
          <Link href="./login" className="ml-2 text-[#cc5500] font-bold hover:underline">Log In Here</Link>
        </p>
      </div>
    </div>
  );
}