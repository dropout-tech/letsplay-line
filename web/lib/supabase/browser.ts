"use client";

import { createBrowserClient } from "@supabase/ssr";

const getConfig = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }

    return { url, anonKey } as const;
};

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export const getSupabaseBrowserClient = () => {
    if (browserClient) {
        return browserClient;
    }

    const { url, anonKey } = getConfig();
    browserClient = createBrowserClient(url, anonKey);
    return browserClient;
};
