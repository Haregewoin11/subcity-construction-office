// src/app/[locale]/admin/layout.tsx
//
// CREATE THIS FILE — it does not exist yet.
// This is the missing piece causing all Sidebar MISSING_MESSAGE errors.
//
// Why it's needed:
//   Sidebar and TopNav are CLIENT components that call useTranslations().
//   useTranslations() requires a NextIntlClientProvider ancestor in the tree.
//   The root [locale]/layout.tsx has one, BUT admin pages also wrap themselves
//   in AdminShell which pulls Sidebar/TopNav OUTSIDE the provider subtree.
//   This layout fixes that by providing translations directly to the admin tree.
//
// Once this file exists, also REMOVE <AdminShell> from admin/page.tsx —
// the shell (Sidebar + TopNav + main wrapper) is now provided here for ALL
// admin routes automatically.

import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // getMessages() reads from src/messages/${locale}.json via your i18n/request.ts
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex h-screen bg-[#F4F5F7] overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          <TopNav />
          <main className="flex-1 overflow-y-auto p-8 blueprint-bg">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
          <footer className="bg-[#071220] border-t border-white/[0.06] text-white/40 py-2 px-8 text-[10px] flex justify-between shrink-0">
            <span>Lemi Kura Sub-City © 2026 · Digital Forensics Audit Enabled</span>
            <span>Working Hours: Mon–Fri 8:30 AM – 5:30 PM</span>
          </footer>
        </div>
      </div>
    </NextIntlClientProvider>
  );
}