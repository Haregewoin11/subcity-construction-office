// src/app/[locale]/services/page.tsx
// Server component — resolves locale, passes to ServicesPage client component.
// No DB fetch needed here: submissions go directly from client → Supabase.

import { notFound } from "next/navigation";
import ServicesPage from "@/components/public/ServicePage";
import type { SiteLang } from "@/components/public/Publicnav";

const SUPPORTED_LOCALES = ["en", "am"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeRaw } = await params;
  const locale = localeRaw as SiteLang;

  const meta = {
    en: {
      title: "Citizen Services | Lemi Kura Sub-City Construction Office",
      description:
        "Submit building permit applications, complaints, document requests, and inspection requests to the Lemi Kura Sub-City Construction Office.",
    },
    am: {
      title: "የዜጎች አገልግሎቶች | የለሚ ቁራ ክፍለ ከተማ የግንባታ ቢሮ",
      description:
        "የህንጻ ፈቃድ ማመልከቻ፣ ቅሬታ፣ የሰነድ ጥያቄ እና የፍተሻ ጥያቄ ለለሚ ቁራ ክፍለ ከተማ የግንባታ ቢሮ ያስገቡ።",
    },
  };

  const m = meta[locale] ?? meta.en;

  return {
    title: m.title,
    description: m.description,
    openGraph: {
      title: m.title,
      description: m.description,
      locale,
    },
  };
}

export default async function ServicesRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!SUPPORTED_LOCALES.includes(locale as SiteLang)) {
    notFound();
  }

  return (
    <ServicesPage
      locale={locale}
      lang={locale as SiteLang}
    />
  );
}