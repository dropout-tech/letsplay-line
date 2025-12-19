import { NextRequest, NextResponse } from "next/server";

import { AppError, BadRequestError } from "@/server/errors";
import {
    listAdminEnrollments,
    updateAdminEnrollment,
} from "@/server/services/admin/enrollments";
import type { EnrollmentStatus } from "@/server/repos/enrollments-repo";
import { assertAdminApiUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        // await assertAdminApiUser();
        const filters = parseFilters(request);
        const data = await listAdminEnrollments(filters);
        return NextResponse.json({ data });
    } catch (error) {
        return toErrorResponse(error);
    }
}

export async function PATCH(request: NextRequest) {
    try {
        // await assertAdminApiUser();
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            throw new BadRequestError("Missing enrollment ID");
        }

        const data = await updateAdminEnrollment(id, updates);
        return NextResponse.json({ data });
    } catch (error) {
        return toErrorResponse(error);
    }
}

const parseFilters = (request: NextRequest) => {
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status");
    if (!statusParam) {
        return {};
    }

    const allowed: EnrollmentStatus[] = ["ACTIVE", "EXPIRED", "CANCELLED"];
    const status = statusParam.toUpperCase() as EnrollmentStatus;

    if (!allowed.includes(status)) {
        throw new BadRequestError("Invalid status filter");
    }

    return { status };
};

const toErrorResponse = (error: unknown) => {
    if (error instanceof AppError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Unhandled /api/admin/enrollments error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
};
