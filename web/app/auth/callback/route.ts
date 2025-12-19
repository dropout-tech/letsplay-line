import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_REDIRECT = "/admin";

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");

    let next = searchParams.get("next") ?? DEFAULT_REDIRECT;
    if (!next.startsWith("/")) {
        next = DEFAULT_REDIRECT;
    }

    const supabase = await createSupabaseServerClient();

    if (!code) {
        return NextResponse.redirect(`${origin}${DEFAULT_REDIRECT}`);
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
        console.error("Failed to exchange Supabase auth code", error);
        return NextResponse.redirect(`${origin}/admin/login?error=auth`);
    }

    const forwardedHost = request.headers.get("x-forwarded-host");
    const isLocalEnv = process.env.NODE_ENV === "development";

    if (!isLocalEnv && forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
    }

    return NextResponse.redirect(`${origin}${next}`);
}
