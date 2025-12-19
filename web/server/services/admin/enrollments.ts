import { NotFoundError } from "@/server/errors";
import {
    listEnrollments,
    updateEnrollment,
    type EnrollmentRecord,
    type EnrollmentStatus,
    type EnrollmentUpdateInput,
} from "@/server/repos/enrollments-repo";
import {
    listStudentsByIds,
    type StudentRecord,
} from "@/server/repos/students-repo";
import {
    listClassesByIds,
    type ClassRecord,
} from "@/server/repos/classes-repo";

export type AdminEnrollmentListItem = {
    enrollment: EnrollmentRecord;
    student: Pick<StudentRecord, "id" | "name"> | null;
    class: Pick<ClassRecord, "id" | "title"> | null;
};

export const listAdminEnrollments = async (filters: {
    status?: EnrollmentStatus;
} = {}): Promise<AdminEnrollmentListItem[]> => {
    const enrollments = await listEnrollments(filters);
    if (enrollments.length === 0) {
        return [];
    }

    const studentIds = enrollments.map((e) => e.student_id);
    const classIds = enrollments.map((e) => e.class_id);

    const [students, classes] = await Promise.all([
        listStudentsByIds(uniqueIds(studentIds)),
        listClassesByIds(uniqueIds(classIds)),
    ]);

    const studentMap = new Map(students.map((s) => [s.id, s]));
    const classMap = new Map(classes.map((c) => [c.id, c]));

    return enrollments.map((enrollment) => {
        const student = studentMap.get(enrollment.student_id);
        const classRecord = classMap.get(enrollment.class_id);

        return {
            enrollment,
            student: student ? { id: student.id, name: student.name } : null,
            class: classRecord ? { id: classRecord.id, title: classRecord.title } : null,
        };
    });
};

export const updateAdminEnrollment = async (
    id: string,
    input: EnrollmentUpdateInput
): Promise<EnrollmentRecord> => {
    const enrollment = await updateEnrollment(id, input);
    if (!enrollment) {
        throw new NotFoundError("Enrollment not found");
    }
    return enrollment;
};

const uniqueIds = (values: string[]): string[] => [
    ...new Set(values.filter(Boolean)),
];
