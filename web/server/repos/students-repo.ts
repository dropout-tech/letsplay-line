import { DatabaseError } from "@/server/errors";
import { getSupabaseClient } from "@/server/supabaseClient";

export type StudentStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type StudentLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type StudentGender = "MALE" | "FEMALE" | "OTHER";

export type StudentRecord = {
    id: string;
    user_id: string;
    name: string;
    gender: StudentGender | null;
    birthday: string;
    phone: string | null;
    school_or_occupation: string | null;
    level: StudentLevel;
    notes: string | null;
    membership_tier: string | null;
    status: StudentStatus;
    created_at: string;
    updated_at: string;
};

export type CreateStudentInput = {
    user_id: string;
    name: string;
    gender: StudentGender;
    birthday: string;
    phone: string;
    level: StudentLevel;
    school_or_occupation?: string | null;
};

const TABLE = "students";

export const listStudentsByUserId = async (
    userId: string
): Promise<StudentRecord[]> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .select(
            [
                "id",
                "user_id",
                "name",
                "gender",
                "birthday",
                "phone",
                "school_or_occupation",
                "level",
                "notes",
                "membership_tier",
                "status",
                "created_at",
                "updated_at",
            ].join(",")
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .returns<StudentRecord[]>();

    if (error) {
        throw new DatabaseError("Failed to list students", error);
    }

    return data ?? [];
};

export const getStudentByIdForUser = async (
    studentId: string,
    userId: string
): Promise<StudentRecord | null> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .select(
            [
                "id",
                "user_id",
                "name",
                "gender",
                "birthday",
                "phone",
                "school_or_occupation",
                "level",
                "notes",
                "membership_tier",
                "status",
                "created_at",
                "updated_at",
            ].join(",")
        )
        .eq("id", studentId)
        .eq("user_id", userId)
        .returns<StudentRecord>()
        .maybeSingle();

    if (error) {
        throw new DatabaseError("Failed to load student", error);
    }

    return data ?? null;
};

export const listStudentsByIds = async (
    ids: string[]
): Promise<StudentRecord[]> => {
    const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
    if (uniqueIds.length === 0) {
        return [];
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .select(
            [
                "id",
                "user_id",
                "name",
                "gender",
                "birthday",
                "phone",
                "school_or_occupation",
                "level",
                "notes",
                "membership_tier",
                "status",
                "created_at",
                "updated_at",
            ].join(",")
        )
        .in("id", uniqueIds)
        .returns<StudentRecord[]>();

    if (error) {
        throw new DatabaseError("Failed to load students", error);
    }

    return data ?? [];
};

export const createStudent = async (
    input: CreateStudentInput
): Promise<StudentRecord> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .insert({
            user_id: input.user_id,
            name: input.name,
            gender: input.gender,
            birthday: input.birthday,
            phone: input.phone,
            level: input.level,
            school_or_occupation: input.school_or_occupation ?? null,
            status: "ACTIVE",
        })
        .select(
            [
                "id",
                "user_id",
                "name",
                "gender",
                "birthday",
                "phone",
                "school_or_occupation",
                "level",
                "notes",
                "membership_tier",
                "status",
                "created_at",
                "updated_at",
            ].join(",")
        )
        .returns<StudentRecord>()
        .single();

    if (error) {
        throw new DatabaseError("Failed to create student", error);
    }

    return data;
};
