"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type Lang = "en" | "am";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (en: string, am: string) => string;
}

const LangContext = createContext<LangCtx>({
  lang: "en",
  setLang: () => {},
  t: (en) => en,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const t = (en: string, am: string) => lang === "am" ? am : en;
  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}