import { NextRequest, NextResponse } from "next/server";

import { AppError } from "@/server/errors";
import { authenticateLiffRequest } from "@/server/services/auth/liff";
import { listEnrollmentsForLineUser } from "@/server/services/liff/enrollments";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const { lineUserId } = await authenticateLiffRequest(request);
        const searchParams = request.nextUrl.searchParams;
        const studentId = searchParams.get("student_id") ?? undefined;
        const enrollments = await listEnrollmentsForLineUser(lineUserId, {
            studentId,
        });
        return NextResponse.json({ data: enrollments });
    } catch (error) {
        return toErrorResponse(error);
    }
}

const toErrorResponse = (error: unknown) => {
    if (error instanceof AppError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unhandled /api/liff/enrollments error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
};
