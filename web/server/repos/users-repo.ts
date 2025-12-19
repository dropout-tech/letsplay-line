import { DatabaseError } from "@/server/errors";
import { getSupabaseClient } from "@/server/supabaseClient";

export type UserStatus = "ACTIVE" | "SUSPENDED" | "DELETED";
export type UserRole = "USER" | "ADMIN";

export type UserRecord = {
    line_id: string;
    display_name: string;
    picture_url: string | null;
    email: string | null;
    role: UserRole;
    status: UserStatus;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
};

const TABLE = "users";
const SELECT_COLUMNS = [
    "line_id",
    "display_name",
    "picture_url",
    "email",
    "role",
    "status",
    "last_login_at",
    "created_at",
    "updated_at",
].join(",");

export const getUserByLineId = async (
    lineId: string
): Promise<UserRecord | null> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .select(SELECT_COLUMNS)
        .eq("line_id", lineId)
        .returns<UserRecord>()
        .maybeSingle();

    if (error) {
        throw new DatabaseError("Failed to load user", error);
    }

    return data ?? null;
};

export const listUsersByLineIds = async (
    lineIds: string[]
): Promise<UserRecord[]> => {
    const uniqueIds = Array.from(new Set(lineIds)).filter(Boolean);
    if (uniqueIds.length === 0) {
        return [];
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .select(SELECT_COLUMNS)
        .in("line_id", uniqueIds)
        .returns<UserRecord[]>();

    if (error) {
        throw new DatabaseError("Failed to load users", error);
    }

    return data ?? [];
};

export type EnsureUserProfile = {
    displayName?: string | null;
    pictureUrl?: string | null;
    email?: string | null;
};

export const ensureUserByLineId = async (
    lineId: string,
    profile?: EnsureUserProfile
): Promise<UserRecord> => {
    const existing = await getUserByLineId(lineId);
    if (existing) {
        const shouldUpdate = needsProfileUpdate(existing, profile);
        if (!shouldUpdate.needs) {
            return existing;
        }

        return updateUserProfile(lineId, shouldUpdate.updates);
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .insert({
            line_id: lineId,
            display_name: coalesceProfile(profile?.displayName, "LINE User"),
            picture_url: profile?.pictureUrl ?? null,
            email: profile?.email ?? null,
            role: "USER",
            status: "ACTIVE",
        })
        .select(SELECT_COLUMNS)
        .returns<UserRecord>()
        .single();

    if (error) {
        throw new DatabaseError("Failed to create user", error);
    }

    return data;
};

const needsProfileUpdate = (
    existing: UserRecord,
    profile?: EnsureUserProfile
): { needs: boolean; updates: Partial<UserRecord> } => {
    if (!profile) {
        return { needs: false, updates: {} };
    }

    const updates: Partial<UserRecord> = {};
    const desiredName = coalesceProfile(profile.displayName, existing.display_name);
    if (desiredName && desiredName !== existing.display_name) {
        updates.display_name = desiredName;
    }
    if (profile.pictureUrl && profile.pictureUrl !== existing.picture_url) {
        updates.picture_url = profile.pictureUrl;
    }
    if (profile.email && profile.email !== existing.email) {
        updates.email = profile.email;
    }

    return { needs: Object.keys(updates).length > 0, updates };
};

const updateUserProfile = async (
    lineId: string,
    updates: Partial<UserRecord>
): Promise<UserRecord> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .update(updates)
        .eq("line_id", lineId)
        .select(SELECT_COLUMNS)
        .returns<UserRecord>()
        .single();

    if (error) {
        throw new DatabaseError("Failed to update user", error);
    }

    return data;
};

const coalesceProfile = (value: string | null | undefined, fallback: string): string => {
    if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
    }
    return fallback;
};
