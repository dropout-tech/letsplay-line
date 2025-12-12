"use client";

import type { Liff } from "@line/liff";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface LiffContextType {
  liff: Liff | null;
  liffError: string | null;
  isLoading: boolean;
}

const LiffContext = createContext<LiffContextType>({
  liff: null,
  liffError: null,
  isLoading: true,
});

export const useLiff = () => {
  const context = useContext(LiffContext);
  if (!context) {
    throw new Error("useLiff must be used within a LiffProvider");
  }
  return context;
};

interface LiffProviderProps {
  children: ReactNode;
}

export function LiffProvider({ children }: LiffProviderProps) {
  const [liff, setLiff] = useState<Liff | null>(null);
  const [liffError, setLiffError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // to avoid `window is not defined` error
    import("@line/liff")
      .then((liff) => liff.default)
      .then((liff) => {
        console.log("LIFF init...");
        liff
          .init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! })
          .then(() => {
            console.log("LIFF init succeeded.");
            setLiff(liff);
            setIsLoading(false);
          })
          .catch((error: Error) => {
            console.log("LIFF init failed.");
            setLiffError(error.toString());
            setIsLoading(false);
          });
      })
      .catch((error) => {
        console.error("Failed to load LIFF SDK:", error);
        setLiffError("Failed to load LIFF SDK");
        setIsLoading(false);
      });
  }, []);

  return (
    <LiffContext.Provider value={{ liff, liffError, isLoading }}>
      {children}
    </LiffContext.Provider>
  );
}