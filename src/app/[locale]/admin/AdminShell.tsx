import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-soft-bg overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <TopNav />
        {/* The blueprint-bg class is applied here */}
        <main className="flex-1 overflow-y-auto p-8 blueprint-bg">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        <footer className="bg-gov-blue text-white py-2 px-8 text-[10px] flex justify-between opacity-90">
           <span>Lemi Kura Sub-City © 2026 | Digital Forensics Audit Enabled</span>
           <span>Working Hours: Mon-Fri 8:30 AM - 5:30 PM</span>
        </footer>
      </div>
    </div>
  );
}