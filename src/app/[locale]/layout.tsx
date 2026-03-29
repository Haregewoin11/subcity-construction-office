import { Noto_Sans_Ethiopic, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Toaster } from "sonner";
import "../globals.css";



const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const ethiopic = Noto_Sans_Ethiopic({
  subsets: ["ethiopic"],
  variable: "--font-ethiopic",
});

// ── Strip non-string leaf values before passing to NextIntlClientProvider ─────
// next-intl's validateMessagesSegment crashes with a "Maximum call stack size
// exceeded" error if the messages object contains arrays or boolean values.
// Arrays trigger infinite recursion because forEach treats them as objects
// and recurses into their items, which may themselves be objects or arrays.
// This sanitizer removes any value that is not a string, number, or nested object.
function sanitizeMessages(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      // Recurse into nested objects
      result[key] = sanitizeMessages(value as Record<string, unknown>);
    } else if (typeof value === "string" || typeof value === "number") {
      // Valid leaf — keep it
      result[key] = value;
    }
    // Arrays, booleans, null → silently dropped
  }
  return result;
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const rawMessages = await getMessages();

  // Sanitize before passing to the client provider
  const messages = sanitizeMessages(rawMessages as Record<string, unknown>);

  return (
    <html lang={locale} className={`${inter.variable} ${ethiopic.variable}`}>
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <Toaster position="top-right" richColors />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}