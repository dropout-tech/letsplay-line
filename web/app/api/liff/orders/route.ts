import { NextRequest, NextResponse } from "next/server";

import { AppError, BadRequestError } from "@/server/errors";
import { authenticateLiffRequest } from "@/server/services/auth/liff";
import {
    createPendingOrder,
    type CreateOrderPayload,
} from "@/server/services/liff/orders";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const { lineUserId } = await authenticateLiffRequest(request);
        const body = await parseJson(request);
        const order = await createPendingOrder(lineUserId, body);
        return NextResponse.json({ data: order }, { status: 201 });
    } catch (error) {
        return toErrorResponse(error);
    }
}

const parseJson = async (request: NextRequest): Promise<CreateOrderPayload> => {
    try {
        return (await request.json()) as CreateOrderPayload;
    } catch (error) {
        throw new BadRequestError("Invalid JSON body", error);
    }
};

const toErrorResponse = (error: unknown) => {
    if (error instanceof AppError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unhandled /api/liff/orders error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
};
