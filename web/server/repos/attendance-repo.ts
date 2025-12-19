import { DatabaseError } from "@/server/errors";
import { getSupabaseClient } from "@/server/supabaseClient";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE" | "UNRECORDED";

export type AttendanceRecord = {
    id: string;
    session_id: string;
    student_id: string;
    status: AttendanceStatus;
    credits_used: number;
    notes: string | null;
    is_makeup: boolean;
    created_at: string;
    updated_at: string;
};

export type CreateAttendanceInput = {
    session_id: string;
    student_id: string;
    status: AttendanceStatus;
    credits_used: number;
    notes?: string | null;
    is_makeup?: boolean;
};

const TABLE = "attendance";
const ATTENDANCE_COLUMNS = [
    "id",
    "session_id",
    "student_id",
    "status",
    "credits_used",
    "notes",
    "is_makeup",
    "created_at",
    "updated_at",
] as const;
const ATTENDANCE_SELECT = ATTENDANCE_COLUMNS.join(",");

export const listAttendanceByStudentAndSessions = async (
    studentId: string,
    sessionIds: string[]
): Promise<AttendanceRecord[]> => {
    if (sessionIds.length === 0) {
        return [];
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .select(ATTENDANCE_SELECT)
        .eq("student_id", studentId)
        .in("session_id", sessionIds)
        .returns<AttendanceRecord[]>();

    if (error) {
        throw new DatabaseError("Failed to load attendance", error);
    }

    return data ?? [];
};

export const listAttendanceByStudentId = async (
    studentId: string
): Promise<AttendanceRecord[]> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .select(ATTENDANCE_SELECT)
        .eq("student_id", studentId)
        .order("created_at", { ascending: true })
        .returns<AttendanceRecord[]>();

    if (error) {
        throw new DatabaseError("Failed to load attendance", error);
    }

    return data ?? [];
};

export const createAttendanceRecords = async (
    inputs: CreateAttendanceInput[]
): Promise<AttendanceRecord[]> => {
    if (inputs.length === 0) {
        return [];
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .insert(
            inputs.map((input) => ({
                ...input,
                notes: input.notes ?? null,
                is_makeup: input.is_makeup ?? false,
            }))
        )
        .select(ATTENDANCE_SELECT)
        .returns<AttendanceRecord[]>();

    if (error) {
        throw new DatabaseError("Failed to create attendance", error);
    }

    return data ?? [];
};
export const updateAttendanceStatus = async (
    studentId: string,
    sessionId: string,
    status: AttendanceStatus
): Promise<AttendanceRecord> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .update({ status, updated_at: new Date().toISOString() })
        .eq("student_id", studentId)
        .eq("session_id", sessionId)
        .select(ATTENDANCE_SELECT)
        .returns<AttendanceRecord>()
        .single();

    if (error) {
        throw new DatabaseError("Failed to update attendance status", error);
    }

    return data;
};
