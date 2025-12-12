
export interface LineUser {
    lineId: string;
    displayName: string;
    pictureUrl?: string;
}

export interface Student {
    id: string;
    userId: string;
    name: string;
    birthday: string;
    level: string;
    phone: string;
    membership_tier: 'DIAMOND' | 'GOLD' | 'SILVER' | 'NONE';
}

export interface Enrollment {
    id: string;
    studentId: string;
    classId: string;
    className: string;
    totalCredits: number;
    remainingCredits: number;
    expiryDate: string;
    attendedCredits: number;
}

export type SessionStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface Session {
    id: string;
    classId: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    coach: string;
    status: SessionStatus;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE' | 'UNRECORDED';

export interface Attendance {
    id: string;
    sessionId: string;
    studentId: string;
    status: AttendanceStatus;
    creditsUsed: number;
    isMakeup: boolean;
}

// 1. Line User
export const mockLineUser: LineUser = {
    lineId: 'U12345678',
    displayName: 'Alice (Mom)',
    pictureUrl: '',
};

// 2. Students (Modified: Removed 'currentClass')
export const mockStudents: Student[] = [
    {
        id: 'student_1',
        userId: 'U12345678',
        name: '王小明 (Bob)',
        birthday: '2015-05-20',
        level: 'Intermediate',
        phone: '0912-345-678',
        membership_tier: 'GOLD',
    },
    {
        id: 'student_2',
        userId: 'U12345678',
        name: '王小美 (Cathy)',
        birthday: '2018-08-15',
        level: 'Beginner',
        phone: '0912-345-678',
        membership_tier: 'NONE',
    },
];

// 3. Enrollments (Added Cathy's Camp)
export const mockEnrollments: Enrollment[] = [
    {
        id: 'e1',
        studentId: 'student_1',
        classId: 'afterclass_2025_mon_1',
        className: '課後社團桌球班-週一早班',
        totalCredits: 20,
        remainingCredits: 12,
        attendedCredits: 8,
        expiryDate: '2025-12-31',
    },
    {
        id: 'e2',
        studentId: 'student_2',
        classId: 'preschool_sat_A',
        className: '幼幼班-週六A',
        totalCredits: 10,
        remainingCredits: 9,
        attendedCredits: 1,
        expiryDate: '2026-03-01',
    },
    // New Enrollment for Cathy
    {
        id: 'e3',
        studentId: 'student_2',
        classId: 'camp_2026_winter_1_morning',
        className: '2026冬令營第一梯次-早上班',
        totalCredits: 5,
        remainingCredits: 5,
        attendedCredits: 0,
        expiryDate: '2026-02-01',
    },
];

const today = new Date();
const year = today.getFullYear();
const month = today.getMonth() + 1;
const monthStr = month.toString().padStart(2, '0');

// 4. Sessions
export const mockSessions: Session[] = [
    // Bob's Class
    {
        id: 's1',
        classId: 'afterclass_2025_mon_1',
        date: `${year}-${monthStr}-01`,
        startTime: '13:30',
        endTime: '16:30',
        coach: 'Coach Chen',
        status: 'COMPLETED',
    },
    {
        id: 's2',
        classId: 'afterclass_2025_mon_1',
        date: '2025-12-08',
        startTime: '13:30',
        endTime: '16:30',
        coach: 'Coach Chen',
        status: 'COMPLETED',
    },
    {
        id: 's3',
        classId: 'afterclass_2025_mon_1',
        date: '2025-12-15',
        startTime: '13:30',
        endTime: '16:30',
        coach: 'Coach Chen',
        status: 'SCHEDULED',
    },

    // Cathy's Regular Class
    {
        id: 's4',
        classId: 'preschool_sat_A',
        date: '2025-12-06',
        startTime: '09:00',
        endTime: '10:30',
        coach: 'Coach Lin',
        status: 'COMPLETED',
    },
    {
        id: 's5',
        classId: 'preschool_sat_A',
        date: '2025-12-13',
        startTime: '09:00',
        endTime: '10:30',
        coach: 'Coach Lin',
        status: 'SCHEDULED',
    },

    // Cathy's Camp Sessions (e.g., Jan 26, 2026)
    {
        id: 's6',
        classId: 'camp_2026_winter_1_morning',
        date: '2026-01-26',
        startTime: '08:30',
        endTime: '11:30',
        coach: 'Coach Wang',
        status: 'SCHEDULED',
    },
    {
        id: 's7',
        classId: 'camp_2026_winter_1_morning',
        date: '2026-01-27',
        startTime: '08:30',
        endTime: '11:30',
        coach: 'Coach Wang',
        status: 'SCHEDULED',
    },
];

// 5. Attendance
export const mockAttendance: Attendance[] = [
    {
        id: 'a1',
        sessionId: 's1',
        studentId: 'student_1',
        status: 'PRESENT',
        creditsUsed: 1,
        isMakeup: false,
    },
    {
        id: 'a2',
        sessionId: 's2',
        studentId: 'student_1',
        status: 'ABSENT',
        creditsUsed: 1,
        isMakeup: false,
    },
    {
        id: 'a3',
        sessionId: 's4',
        studentId: 'student_2',
        status: 'PRESENT',
        creditsUsed: 1,
        isMakeup: false,
    },
];
