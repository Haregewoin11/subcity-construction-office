// src/app/layout.tsx
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return children; // Pure pass-through
}