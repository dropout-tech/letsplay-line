import { listClassesByIds, type ClassRecord } from "@/server/repos/classes-repo";
import {
    listEnrollmentsByStudentIds,
    type EnrollmentRecord,
} from "@/server/repos/enrollments-repo";
import { listStudentsByUserId } from "@/server/repos/students-repo";
import { assertStudentOwnership } from "@/server/services/liff/students";

export type LiffEnrollmentSummary = {
    id: string;
    student_id: string;
    class_id: string;
    class_name: string;
    total_credits: number;
    remaining_credits: number;
    attended_credits: number;
    expiry_date: string | null;
    status: string;
};

export type ListLiffEnrollmentsParams = {
    studentId?: string;
};

export const listEnrollmentsForLineUser = async (
    lineUserId: string,
    params: ListLiffEnrollmentsParams = {}
): Promise<LiffEnrollmentSummary[]> => {
    const studentIds = await resolveStudentIds(lineUserId, params.studentId);
    if (studentIds.length === 0) {
        return [];
    }

    const enrollments = await listEnrollmentsByStudentIds(studentIds);
    if (enrollments.length === 0) {
        return [];
    }

    const classMap = await buildClassMap(enrollments);

    return enrollments.map((record) => {
        const classInfo = classMap.get(record.class_id);
        return {
            id: record.id,
            student_id: record.student_id,
            class_id: record.class_id,
            class_name: classInfo?.title ?? record.class_id,
            total_credits: record.total_credits,
            remaining_credits: record.remaining_credits,
            attended_credits: Math.max(
                0,
                record.total_credits - record.remaining_credits
            ),
            expiry_date: record.expiry_date,
            status: record.status,
        } satisfies LiffEnrollmentSummary;
    });
};

const resolveStudentIds = async (
    lineUserId: string,
    studentId?: string
): Promise<string[]> => {
    if (studentId) {
        const student = await assertStudentOwnership(studentId, lineUserId);
        return [student.id];
    }
    const students = await listStudentsByUserId(lineUserId);
    return students.map((student) => student.id);
};

const buildClassMap = async (
    enrollments: EnrollmentRecord[]
): Promise<Map<string, ClassRecord>> => {
    const classIds = Array.from(new Set(enrollments.map((e) => e.class_id)));
    if (classIds.length === 0) {
        return new Map();
    }
    const classes = await listClassesByIds(classIds);
    return new Map(classes.map((classRecord) => [classRecord.id, classRecord]));
};
