import { NextRequest, NextResponse } from "next/server";

import { AppError, BadRequestError } from "@/server/errors";
import { authenticateLiffRequest } from "@/server/services/auth/liff";
import {
    createStudentForLineUser,
    listStudentsForLineUser,
    type CreateStudentPayload,
} from "@/server/services/liff/students";
import { readLiffProfileFromHeaders } from "@/server/services/liff/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const { lineUserId } = await authenticateLiffRequest(request);
        const students = await listStudentsForLineUser(lineUserId);
        return NextResponse.json({ data: students });
    } catch (error) {
        return toErrorResponse(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const { lineUserId } = await authenticateLiffRequest(request);
        const body = await parseJson(request);
        const profile = readLiffProfileFromHeaders(request.headers);
        const student = await createStudentForLineUser(lineUserId, body, profile);
        return NextResponse.json({ data: student }, { status: 201 });
    } catch (error) {
        return toErrorResponse(error);
    }
}

const parseJson = async (request: NextRequest): Promise<CreateStudentPayload> => {
    try {
        return (await request.json()) as CreateStudentPayload;
    } catch (error) {
        throw new BadRequestError("Invalid JSON body", error);
    }
};

const toErrorResponse = (error: unknown) => {
    if (error instanceof AppError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unhandled /api/liff/students error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
};
