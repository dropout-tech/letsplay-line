import {
    BadRequestError,
    ConflictError,
    NotFoundError,
    type AppError,
} from "@/server/errors";
import {
    createStudent,
    getStudentByIdForUser,
    listStudentsByUserId,
    type CreateStudentInput,
    type StudentGender,
    type StudentLevel,
    type StudentRecord,
} from "@/server/repos/students-repo";
import { ensureUserByLineId } from "@/server/repos/users-repo";

const GENDER_SET: ReadonlySet<StudentGender> = new Set([
    "MALE",
    "FEMALE",
    "OTHER",
]);

const LEVEL_SET: ReadonlySet<StudentLevel> = new Set([
    "BEGINNER",
    "INTERMEDIATE",
    "ADVANCED",
]);

export type CreateStudentPayload = {
    name?: unknown;
    gender?: unknown;
    birthday?: unknown;
    phone?: unknown;
    level?: unknown;
    school_or_occupation?: unknown;
};

export const listStudentsForLineUser = async (
    lineUserId: string
): Promise<StudentRecord[]> => listStudentsByUserId(lineUserId);

export const createStudentForLineUser = async (
    lineUserId: string,
    payload: CreateStudentPayload,
    profile?: { displayName?: string | null; pictureUrl?: string | null; email?: string | null }
): Promise<StudentRecord> => {
    const input = validateCreatePayload(payload);
    await ensureUserByLineId(lineUserId, profile);

    try {
        return await createStudent({
            user_id: lineUserId,
            ...input,
        });
    } catch (error) {
        return handleStudentWriteError(error);
    }
};

export const assertStudentOwnership = async (
    studentId: string,
    lineUserId: string
): Promise<StudentRecord> => {
    const student = await getStudentByIdForUser(studentId, lineUserId);
    if (!student) {
        throw new NotFoundError("Student not found");
    }
    if (student.status === "ARCHIVED") {
        throw new BadRequestError("Student is archived and cannot perform this action");
    }
    return student;
};

const validateCreatePayload = (
    payload: CreateStudentPayload
): Omit<CreateStudentInput, "user_id"> => {
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    if (!name) {
        throw new BadRequestError("Name is required");
    }

    const gender = normalizeGender(payload.gender);
    const level = normalizeLevel(payload.level);
    const birthday = normalizeDate(payload.birthday);

    const phone = typeof payload.phone === "string" ? payload.phone.trim() : "";
    if (!phone) {
        throw new BadRequestError("Phone is required");
    }

    const school =
        typeof payload.school_or_occupation === "string"
            ? payload.school_or_occupation.trim()
            : null;

    return {
        name,
        gender,
        birthday,
        phone,
        level,
        school_or_occupation: school,
    };
};

const normalizeGender = (value: unknown): StudentGender => {
    if (typeof value !== "string") {
        throw new BadRequestError("Gender is required");
    }
    const upper = value.toUpperCase() as StudentGender;
    if (!GENDER_SET.has(upper)) {
        throw new BadRequestError("Invalid gender value");
    }
    return upper;
};

const normalizeLevel = (value: unknown): StudentLevel => {
    if (typeof value !== "string") {
        throw new BadRequestError("Level is required");
    }
    const upper = value.toUpperCase() as StudentLevel;
    if (!LEVEL_SET.has(upper)) {
        throw new BadRequestError("Invalid level value");
    }
    return upper;
};

const normalizeDate = (value: unknown): string => {
    if (typeof value !== "string") {
        throw new BadRequestError("Birthday is required");
    }
    const trimmed = value.trim();
    if (!trimmed) {
        throw new BadRequestError("Birthday is required");
    }
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
        throw new BadRequestError("Birthday must be a valid date");
    }
    return trimmed;
};

const handleStudentWriteError = (error: unknown): never => {
    if (isAppError(error)) {
        const root = error.details as PostgrestError | undefined;
        if (root?.code === "23505") {
            throw new ConflictError("Student with the same name already exists");
        }
    }
    throw error instanceof Error ? error : new Error("Unknown student write error");
};

type PostgrestError = {
    code?: string;
};

const isAppError = (error: unknown): error is AppError => {
    return Boolean(error && typeof error === "object" && "status" in error);
};
