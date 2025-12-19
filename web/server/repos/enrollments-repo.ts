import { BadRequestError, DatabaseError } from "@/server/errors";
import { getSupabaseClient } from "@/server/supabaseClient";

export type EnrollmentStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";

export type EnrollmentRecord = {
    id: string;
    student_id: string;
    class_id: string;
    total_credits: number;
    remaining_credits: number;
    expiry_date: string | null;
    status: EnrollmentStatus;
    created_at: string;
    updated_at: string;
};

const TABLE = "enrollments";
const ENROLLMENT_COLUMNS = [
    "id",
    "student_id",
    "class_id",
    "total_credits",
    "remaining_credits",
    "expiry_date",
    "status",
    "created_at",
    "updated_at",
] as const;
const ENROLLMENT_SELECT = ENROLLMENT_COLUMNS.join(",");

export type EnrollmentUpdateInput = {
    total_credits?: number;
    remaining_credits?: number;
    expiry_date?: string | null;
    status?: EnrollmentStatus;
};


type Nullable<T> = T | null;

export const getEnrollmentByStudentAndClass = async (
    studentId: string,
    classId: string
): Promise<EnrollmentRecord | null> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .select(ENROLLMENT_SELECT)
        .eq("student_id", studentId)
        .eq("class_id", classId)
        .returns<EnrollmentRecord>()
        .maybeSingle();

    if (error) {
        throw new DatabaseError("Failed to load enrollment", error);
    }

    return data;
};

export const listEnrollmentsByStudentIds = async (
    studentIds: string[]
): Promise<EnrollmentRecord[]> => {
    const uniqueIds = Array.from(new Set(studentIds)).filter(Boolean);
    if (uniqueIds.length === 0) {
        return [];
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .select(ENROLLMENT_SELECT)
        .in("student_id", uniqueIds)
        .returns<EnrollmentRecord[]>();

    if (error) {
        throw new DatabaseError("Failed to list enrollments", error);
    }

    return data ?? [];
};

export const listEnrollments = async (filters: {
    status?: EnrollmentStatus;
} = {}): Promise<EnrollmentRecord[]> => {
    const supabase = getSupabaseClient();
    let query = supabase.from(TABLE).select(ENROLLMENT_SELECT);

    if (filters.status) {
        query = query.eq("status", filters.status);
    }

    const orderedQuery = query.order("created_at", { ascending: false });
    const { data, error } = await orderedQuery.returns<EnrollmentRecord[]>();

    if (error) {
        throw new DatabaseError("Failed to list enrollments", error);
    }

    return data ?? [];
};

export const updateEnrollment = async (
    id: string,
    input: EnrollmentUpdateInput
): Promise<EnrollmentRecord> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .update(input)
        .eq("id", id)
        .select(ENROLLMENT_SELECT)
        .returns<EnrollmentRecord>()
        .single();

    if (error) {
        if (error.code?.startsWith("23")) {
            if (error.message?.includes("enrollments_check")) {
                throw new BadRequestError("剩餘點數不可大於總點數，或數值不合法");
            }
            throw new BadRequestError(error.message, error);
        }
        throw new DatabaseError("Failed to update enrollment", error);
    }

    return data;
};


export type UpsertEnrollmentCreditsInput = {
    student_id: string;
    class_id: string;
    credits: number;
    expiry_date?: string | null;
};

export const upsertEnrollmentCredits = async (
    input: UpsertEnrollmentCreditsInput
): Promise<EnrollmentRecord> => {
    const existing = await getEnrollmentByStudentAndClass(
        input.student_id,
        input.class_id
    );

    if (!existing) {
        return await createEnrollment(input);
    }

    return await incrementEnrollmentCredits(existing, input.credits, input.expiry_date ?? null);
};

const createEnrollment = async (
    input: UpsertEnrollmentCreditsInput
): Promise<EnrollmentRecord> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .insert({
            student_id: input.student_id,
            class_id: input.class_id,
            total_credits: input.credits,
            remaining_credits: input.credits,
            expiry_date: input.expiry_date ?? null,
            status: "ACTIVE",
        })
        .select(ENROLLMENT_SELECT)
        .returns<EnrollmentRecord>()
        .single();

    if (error) {
        throw new DatabaseError("Failed to create enrollment", error);
    }

    return data;
};

const incrementEnrollmentCredits = async (
    enrollment: EnrollmentRecord,
    credits: number,
    expiryDate: Nullable<string>
): Promise<EnrollmentRecord> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE)
        .update({
            total_credits: enrollment.total_credits + credits,
            remaining_credits: enrollment.remaining_credits + credits,
            expiry_date: pickLaterDate(enrollment.expiry_date, expiryDate),
            status: "ACTIVE",
        })
        .eq("id", enrollment.id)
        .select(ENROLLMENT_SELECT)
        .returns<EnrollmentRecord>()
        .single();

    if (error) {
        throw new DatabaseError("Failed to update enrollment", error);
    }

    return data;
};

const pickLaterDate = (
    currentDate: Nullable<string>,
    candidate: Nullable<string>
): Nullable<string> => {
    if (!candidate) {
        return currentDate ?? null;
    }

    if (!currentDate) {
        return candidate;
    }

    const current = Date.parse(currentDate);
    const next = Date.parse(candidate);

    if (Number.isNaN(next)) {
        return currentDate;
    }

    if (Number.isNaN(current)) {
        return candidate;
    }

    return next > current ? candidate : currentDate;
};
