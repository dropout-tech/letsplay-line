import { BadRequestError, NotFoundError } from "@/server/errors";
import { listClassesByIds, type ClassRecord } from "@/server/repos/classes-repo";
import {
    listAttendanceByStudentId,
    updateAttendanceStatus,
    type AttendanceRecord,
} from "@/server/repos/attendance-repo";
import {
    listSessionsByIds,
    type SessionRecord,
} from "@/server/repos/sessions-repo";
import { assertStudentOwnership } from "@/server/services/liff/students";

export type ListLiffAttendanceParams = {
    studentId?: string;
    from?: string;
    to?: string;
};

export type LiffAttendanceItem = {
    id: string;
    student_id: string;
    session_id: string;
    status: string;
    credits_used: number;
    session: {
        id: string;
        class_id: string;
        class_name: string;
        start_time: string;
        end_time: string;
        status: string;
        branch_id: string | null;
    };
};

export const listAttendanceForLineUser = async (
    lineUserId: string,
    params: ListLiffAttendanceParams = {}
): Promise<LiffAttendanceItem[]> => {
    if (!params.studentId) {
        throw new BadRequestError("student_id is required");
    }

    const student = await assertStudentOwnership(params.studentId, lineUserId);

    const attendanceRows = await listAttendanceByStudentId(student.id);
    if (attendanceRows.length === 0) {
        return [];
    }

    const sessionMap = await buildSessionMap(attendanceRows);
    if (sessionMap.size === 0) {
        return [];
    }

    const classMap = await buildClassMap(Array.from(sessionMap.values()));
    const range = normalizeRange(params.from, params.to);

    const items: LiffAttendanceItem[] = [];
    for (const record of attendanceRows) {
        const session = sessionMap.get(record.session_id);
        if (!session) {
            continue;
        }
        if (!isWithinRange(session.start_time, range)) {
            continue;
        }
        const classInfo = classMap.get(session.class_id);
        items.push({
            id: record.id,
            student_id: record.student_id,
            session_id: record.session_id,
            status: record.status,
            credits_used: record.credits_used,
            session: {
                id: session.id,
                class_id: session.class_id,
                class_name: classInfo?.title ?? session.class_id,
                start_time: session.start_time,
                end_time: session.end_time,
                status: session.status,
                branch_id: session.branch_id ?? null,
            },
        });
    }

    return items;
};

const buildSessionMap = async (
    attendanceRows: AttendanceRecord[]
): Promise<Map<string, SessionRecord>> => {
    const sessionIds = Array.from(new Set(attendanceRows.map((row) => row.session_id)));
    if (sessionIds.length === 0) {
        return new Map();
    }
    const sessions = await listSessionsByIds(sessionIds);
    return new Map(sessions.map((session) => [session.id, session]));
};

const buildClassMap = async (
    sessions: SessionRecord[]
): Promise<Map<string, ClassRecord>> => {
    const classIds = Array.from(new Set(sessions.map((session) => session.class_id)));
    if (classIds.length === 0) {
        return new Map();
    }
    const classes = await listClassesByIds(classIds);
    return new Map(classes.map((classRecord) => [classRecord.id, classRecord]));
};

type DateRange = {
    from?: Date;
    to?: Date;
};

const normalizeRange = (from?: string, to?: string): DateRange => {
    const range: DateRange = {};
    if (from) {
        range.from = assertDateBoundary(from, "from");
    }
    if (to) {
        range.to = assertDateBoundary(to, "to", true);
    }
    return range;
};

const assertDateBoundary = (
    value: string,
    field: "from" | "to",
    isEndBoundary = false
): Date => {
    const trimmed = value.trim();
    if (!trimmed) {
        throw new BadRequestError(`${field} must be a valid date`);
    }
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
        throw new BadRequestError(`${field} must be a valid date`);
    }
    if (!isEndBoundary) {
        date.setHours(0, 0, 0, 0);
    } else {
        date.setHours(23, 59, 59, 999);
    }
    return date;
};

const isWithinRange = (value: string, range: DateRange): boolean => {
    if (!range.from && !range.to) {
        return true;
    }
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
        return false;
    }
    if (range.from && timestamp < range.from.getTime()) {
        return false;
    }
    if (range.to && timestamp > range.to.getTime()) {
        return false;
    }
    return true;
};

export type ApplyLeavePayload = {
    studentId?: unknown;
    sessionId?: unknown;
};

export const applyLeaveForLineUser = async (
    lineUserId: string,
    payload: ApplyLeavePayload
): Promise<void> => {
    const studentId = typeof payload.studentId === "string" ? payload.studentId : "";
    const sessionId = typeof payload.sessionId === "string" ? payload.sessionId : "";

    if (!studentId || !sessionId) {
        throw new BadRequestError("student_id and session_id are required");
    }

    // 1. Assert student ownership
    await assertStudentOwnership(studentId, lineUserId);

    // 2. Fetch session details to check cutoff
    const [session] = await listSessionsByIds([sessionId]);
    if (!session) {
        throw new NotFoundError("Session not found");
    }

    // 3. Cutoff check (24 hours as per spec)
    const startTime = new Date(session.start_time).getTime();
    const cutoffTime = startTime - 24 * 60 * 60 * 1000;
    if (Date.now() > cutoffTime) {
        throw new BadRequestError("逾期不予請假（需於 24 小時前請假）");
    }

    // 4. Update status
    await updateAttendanceStatus(studentId, sessionId, "LEAVE");
};
