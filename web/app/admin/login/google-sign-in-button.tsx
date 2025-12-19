"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export const GoogleSignInButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const origin = window.location.origin;
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=/admin`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });
    } catch (err) {
      console.error(err);
      setError("無法啟動 Google 登入流程");
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="space-y-2">
      <Button onClick={handleSignIn} disabled={isLoading} className="w-full">
        {isLoading ? "跳轉至 Google..." : "使用 Google 登入"}
      </Button>
      {error && <p className="text-sm text-destructive text-center">{error}</p>}
    </div>
  );
};
