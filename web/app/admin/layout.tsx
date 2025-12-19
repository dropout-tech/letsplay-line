import type { ReactNode } from "react";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Console",
  description: "LetsPlay 後台",
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
