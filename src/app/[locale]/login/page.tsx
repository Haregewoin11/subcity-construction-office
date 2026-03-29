"use client";
import Link from 'next/link';

export default function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
      <div className="w-full max-w-md bg-white p-10 shadow-2xl rounded-sm border-t-8 border-[#cc5500]">
        <h2 className="text-3xl font-bold text-[#003366] mb-2 uppercase tracking-tight">Portal Access</h2>
        <p className="text-slate-500 mb-8 text-sm">Enter credentials to manage sub-city assets.</p>
        
        <form className="space-y-6">
          <input type="email" placeholder="OFFICE EMAIL" className="w-full p-4 border-2 border-slate-200 focus:border-[#003366] outline-none font-mono text-sm" required />
          <input type="password" placeholder="PASSWORD" className="w-full p-4 border-2 border-slate-200 focus:border-[#003366] outline-none font-mono text-sm" required />
          
          <button className="w-full bg-[#cc5500] text-white p-4 font-bold uppercase hover:bg-[#b34a00] transition shadow-md">
            Secure Sign In
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-600">
          New personnel? 
          <Link href="./register" className="ml-2 text-[#003366] font-bold hover:underline">Request Access</Link>
        </p>
      </div>
    </div>
  );
}