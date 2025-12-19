import { NextRequest, NextResponse } from "next/server";

import { AppError } from "@/server/errors";
import { authenticateLiffRequest } from "@/server/services/auth/liff";
import { applyLeaveForLineUser } from "@/server/services/liff/attendance";

export async function POST(request: NextRequest) {
    try {
        const { lineUserId } = await authenticateLiffRequest(request);
        const body = await request.json();

        await applyLeaveForLineUser(lineUserId, {
            studentId: body.student_id,
            sessionId: body.session_id,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return toErrorResponse(error);
    }
}

const toErrorResponse = (error: unknown) => {
    if (error instanceof AppError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unhandled /api/liff/attendance/leave error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
};
