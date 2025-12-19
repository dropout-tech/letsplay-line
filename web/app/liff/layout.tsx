import type { ReactNode } from "react";

import type { Metadata } from "next";

import { LiffProvider } from "./providers/liff-provider";

export const metadata: Metadata = {
  title: "LIFF App",
  description: "LINE LIFF chatbot application",
};

export default function LiffLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <LiffProvider>{children}</LiffProvider>;
}
