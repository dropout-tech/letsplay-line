"use client";

import type { Liff } from "@line/liff";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export interface Profile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

interface LiffContextType {
  liff: Liff | null;
  liffError: string | null;
  profile: Profile | null;
  isLoading: boolean;
  login: () => void;
}

const LiffContext = createContext<LiffContextType>({
  liff: null,
  liffError: null,
  profile: null,
  isLoading: true,
  login: () => {},
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = () => {
    // if (liff && !liff.isLoggedIn()) {
    //   liff.login();
    // }
  };

  useEffect(() => {
    // to avoid `window is not defined` error
    import("@line/liff")
      .then((liff) => liff.default)
      .then((liff) => {
        console.log("LIFF init...");
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) {
          console.error("LIFF ID is missing in environment variables");
          setLiffError("LIFF ID is missing");
          setIsLoading(false);
          return;
        }
        liff
          .init({ liffId })
          .then(() => {
            console.log("LIFF init succeeded.");
            setLiff(liff);
            if (liff.isLoggedIn()) {
              console.log("LIFF is logged in, fetching profile...");
              liff
                .getProfile()
                .then((profile) => {
                  console.log("LIFF profile fetched:", profile);
                  setProfile(profile);
                })
                .catch((e) => {
                  console.error("Failed to get profile", e);
                  setLiffError("Failed to get profile: " + e.toString());
                });
            } else {
              console.log("LIFF is NOT logged in.");
            }
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
    <LiffContext.Provider
      value={{ liff, liffError, profile, isLoading, login }}
    >
      {children}
    </LiffContext.Provider>
  );
}
