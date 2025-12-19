import { NextRequest, NextResponse } from "next/server";

import { getBaseUrl } from '@/lib/server/base-url';
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();

    const redirectUrl = new URL("/admin/login", getBaseUrl());
    return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest) {
    return POST(request);
}
