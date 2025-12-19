import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { ConfigurationError } from "@/server/errors";

const getSupabaseConfig = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        throw new ConfigurationError(
            "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
        );
    }

    return { url, anonKey } as const;
};

const cookieAdapter = async () => {
    const cookieStore = await cookies();

    return {
        get(name: string) {
            return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
        },
    };
};

export const createSupabaseServerClient = async () => {
    const { url, anonKey } = getSupabaseConfig();

    return createServerClient(url, anonKey, {
        cookies: await cookieAdapter(),
    });
};
