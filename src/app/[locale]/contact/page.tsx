// src/app/[locale]/contact/page.tsx

import { setRequestLocale } from "next-intl/server";
import ContactPageClient from "@/components/public/ContactPageClient";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ContactPageClient locale={locale} />;
}