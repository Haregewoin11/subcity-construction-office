/**
 * PLACEMENT: src/app/[locale]/about/page.tsx
 *
 * Thin server component — fetches Supabase data, passes to AboutPageClient.
 * All rendering, language toggle, and team display happen client-side.
 */

import { createClient } from "@/lib/actions/supabase/server";
import { setRequestLocale } from "next-intl/server";
import { AboutPageClient } from "@/components/public/AboutPageClient";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();

  const [{ data: projects }, { data: contractors }] = await Promise.all([
    supabase.from("projects").select("id,status,budget,sector"),
    supabase.from("contractors").select("id,is_verified"),
  ]);

  return (
    <AboutPageClient
      locale={locale}
      projects={projects || []}
      contractors={contractors || []}
    />
  );
}