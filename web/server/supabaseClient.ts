import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ConfigurationError } from "./errors";

type SupabaseConfig = {
    url: string;
    serviceRoleKey: string;
    keySource: "secret" | "service_role";
};

let cachedClient: SupabaseClient | null = null;

const readSupabaseConfig = (): SupabaseConfig => {
    const url = process.env.SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    const legacyServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) {
        throw new ConfigurationError(
            "SUPABASE_URL is not set. Add it to your environment before calling the API."
        );
    }

    if (secretKey) {
        return { url, serviceRoleKey: secretKey, keySource: "secret" };
    }

    if (legacyServiceRoleKey) {
        return {
            url,
            serviceRoleKey: legacyServiceRoleKey,
            keySource: "service_role",
        };
    }

    throw new ConfigurationError(
        "Missing Supabase server credential. Set SUPABASE_SECRET_KEY (new API keys) or SUPABASE_SERVICE_ROLE_KEY (legacy) as described in https://github.com/orgs/supabase/discussions/29260."
    );
};

export const getSupabaseClient = (): SupabaseClient => {
    if (cachedClient) {
        return cachedClient;
    }

    const { url, serviceRoleKey, keySource } = readSupabaseConfig();
    cachedClient = createClient(url, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
        global: {
            headers: {
                "X-Client-Info": `letsplay-line-backend (${keySource})`,
            },
        },
    });

    return cachedClient;
};
