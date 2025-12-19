import { DatabaseError } from "@/server/errors";
import { getSupabaseClient } from "@/server/supabaseClient";

export type ClassType = "REGULAR" | "CAMP" | "PRIVATE" | "GROUP";

export type ClassRecord = {
    id: string;
    type: ClassType;
    title: string;
    description: string | null;
    capacity: number | null;
    coach_ids: string[] | null;
    branch_id: string | null;
    start_time: string | null;
    end_time: string | null;
    recurrence_rule: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

const TABLE = "classes";
const CLASS_COLUMNS = [
    "id",
    "type",
    "title",
    "description",
    "capacity",
    "coach_ids",
    "branch_id",
    "start_time",
    "end_time",
    "recurrence_rule",
    "is_active",
    "created_at",
    "updated_at",
] as const;
const CLASS_SELECT = CLASS_COLUMNS.join(",");

export const getClassById = async (classId: string): Promise<ClassRecord | null> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .select(CLASS_SELECT)
        .eq("id", classId)
        .returns<ClassRecord>()
        .maybeSingle();

    if (error) {
        throw new DatabaseError("Failed to load class", error);
    }

    return data;
};

export const listClassesByIds = async (
    classIds: string[]
): Promise<ClassRecord[]> => {
    const uniqueIds = Array.from(new Set(classIds)).filter(Boolean);
    if (uniqueIds.length === 0) {
        return [];
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .select(CLASS_SELECT)
        .in("id", uniqueIds)
        .returns<ClassRecord[]>();

    if (error) {
        throw new DatabaseError("Failed to list classes", error);
    }

    return data ?? [];
};
