import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ForbiddenError, UnauthorizedError } from "@/server/errors";
import {
    ensureUserByLineId,
    type UserRecord,
} from "@/server/repos/users-repo";

export type AdminIdentity = {
    supabaseUser: User;
    appUser: UserRecord;
};

const normalizeEmail = (value?: string | null): string | null => {
    if (!value) {
        return null;
    }
    const trimmed = value.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : null;
};

const ensureAdminUserRecord = async (supabaseUser: User): Promise<UserRecord> => {
    const email = normalizeEmail(supabaseUser.email);
    if (!email) {
        throw new UnauthorizedError("缺少 Google 帳號 email");
    }

    const profile = {
        displayName:
            typeof supabaseUser.user_metadata?.full_name === "string"
                ? supabaseUser.user_metadata.full_name
                : supabaseUser.email,
        pictureUrl:
            typeof supabaseUser.user_metadata?.avatar_url === "string"
                ? supabaseUser.user_metadata.avatar_url
                : null,
        email: supabaseUser.email,
    };

    return ensureUserByLineId(email, profile);
};

export const getAuthenticatedAdmin = async (): Promise<AdminIdentity | null> => {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const appUser = await ensureAdminUserRecord(user);
    return { supabaseUser: user, appUser };
};

const assertActiveAdmin = (identity: AdminIdentity) => {
    if (identity.appUser.status !== "ACTIVE") {
        throw new ForbiddenError("此帳號已被停用");
    }

    if (identity.appUser.role !== "ADMIN") {
        throw new ForbiddenError("此帳號沒有管理員權限");
    }
};

export const requireAdminUser = async (): Promise<AdminIdentity> => {
    const identity = await getAuthenticatedAdmin();
    if (!identity) {
        redirect("/admin/login");
    }

    try {
        assertActiveAdmin(identity);
    } catch (error) {
        console.warn("Admin auth rejected", error);
        redirect("/admin/login?error=not-authorized");
    }

    return identity;
};

export const assertAdminApiUser = async (): Promise<AdminIdentity> => {
    const identity = await getAuthenticatedAdmin();
    if (!identity) {
        throw new UnauthorizedError("尚未登入");
    }

    assertActiveAdmin(identity);
    return identity;
};
