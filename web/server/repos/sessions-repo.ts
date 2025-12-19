import { DatabaseError } from "@/server/errors";
import { getSupabaseClient } from "@/server/supabaseClient";

export type SessionStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";
export type SalaryStatus =
    | "PENDING"
    | "CALCULATED"
    | "APPROVED"
    | "PAID"
    | "DISPUTED";

export type SessionRecord = {
    id: string;
    class_id: string;
    coach_ids: string[] | null;
    branch_id: string | null;
    start_time: string;
    end_time: string;
    status: SessionStatus;
    cancellation_reason: string | null;
    salary: number | null;
    salary_status: SalaryStatus;
    notes: string | null;
    created_at: string;
    updated_at: string;
};

export type ListSessionsOptions = {
    startFrom?: string;
    includeCancelled?: boolean;
    limit?: number;
};

export type CreateSessionInput = {
    class_id: string;
    coach_ids: string[] | null;
    branch_id: string | null;
    start_time: string;
    end_time: string;
    status?: SessionStatus;
    salary_status?: SalaryStatus;
    cancellation_reason?: string | null;
    notes?: string | null;
};

const TABLE = "sessions";
const SESSION_COLUMNS = [
    "id",
    "class_id",
    "coach_ids",
    "branch_id",
    "start_time",
    "end_time",
    "status",
    "cancellation_reason",
    "salary",
    "salary_status",
    "notes",
    "created_at",
    "updated_at",
] as const;
const SESSION_SELECT = SESSION_COLUMNS.join(",");

export const listSessionsByClass = async (
    classId: string,
    options: ListSessionsOptions = {}
): Promise<SessionRecord[]> => {
    const supabase = getSupabaseClient();
    let query = supabase
        .from(TABLE)
        .select(SESSION_SELECT)
        .eq("class_id", classId)
        .order("start_time", { ascending: true });

    if (options.startFrom) {
        query = query.gte("start_time", options.startFrom);
    }

    if (!options.includeCancelled) {
        query = query.neq("status", "CANCELLED");
    }

    if (typeof options.limit === "number") {
        query = query.limit(options.limit);
    }

    const { data, error } = await query.returns<SessionRecord[]>();

    if (error) {
        throw new DatabaseError("Failed to list sessions", error);
    }

    return data ?? [];
};

export const createSessions = async (
    inputs: CreateSessionInput[]
): Promise<SessionRecord[]> => {
    if (inputs.length === 0) {
        return [];
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .insert(
            inputs.map((input) => ({
                ...input,
                status: input.status ?? "SCHEDULED",
                salary_status: input.salary_status ?? "PENDING",
            }))
        )
        .select(SESSION_SELECT)
        .returns<SessionRecord[]>();

    if (error) {
        throw new DatabaseError("Failed to create sessions", error);
    }

    return data ?? [];
};

export const listSessionsByIds = async (
    ids: string[]
): Promise<SessionRecord[]> => {
    const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
    if (uniqueIds.length === 0) {
        return [];
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .select(SESSION_SELECT)
        .in("id", uniqueIds)
        .returns<SessionRecord[]>();

    if (error) {
        throw new DatabaseError("Failed to load sessions", error);
    }

    return data ?? [];
};
