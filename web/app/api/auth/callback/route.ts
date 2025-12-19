import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get("code");
    const next = request.nextUrl.searchParams.get("next") ?? "/admin";
    const redirectUrl = new URL(next, request.url);

    if (!code) {
        return NextResponse.redirect(redirectUrl);
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        console.error("Failed to exchange Supabase auth code", error);
        const fallback = new URL("/admin/login?error=auth", request.url);
        return NextResponse.redirect(fallback);
    }

    return NextResponse.redirect(redirectUrl);
}
