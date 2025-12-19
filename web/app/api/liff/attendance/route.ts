import { NextRequest, NextResponse } from "next/server";

import { AppError } from "@/server/errors";
import { authenticateLiffRequest } from "@/server/services/auth/liff";
import { listAttendanceForLineUser } from "@/server/services/liff/attendance";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const { lineUserId } = await authenticateLiffRequest(request);
        const searchParams = request.nextUrl.searchParams;
        const studentId = searchParams.get("student_id") ?? undefined;
        const from = searchParams.get("from") ?? undefined;
        const to = searchParams.get("to") ?? undefined;

        const attendance = await listAttendanceForLineUser(lineUserId, {
            studentId,
            from,
            to,
        });

        return NextResponse.json({ data: attendance });
    } catch (error) {
        return toErrorResponse(error);
    }
}

const toErrorResponse = (error: unknown) => {
    if (error instanceof AppError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unhandled /api/liff/attendance error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
};
