// src/app/[locale]/admin/layout.tsx
//
// Wraps ALL /admin/* routes.
// - Provides NextIntlClientProvider for admin translations
// - Provides AuthProvider (session + role context)
// - Guards: if not authenticated → redirect to /admin/login
// - Renders Sidebar + TopNav shell for all authenticated admin pages
// - Login and Register pages bypass the shell (they render standalone)

import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { AuthProvider } from "@/context/Authcontext";
import { AdminShell } from "./AdminShell";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthProvider>
        <AdminShell locale={locale}>
          {children}
        </AdminShell>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}