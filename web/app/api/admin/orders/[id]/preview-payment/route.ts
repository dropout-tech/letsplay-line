import { NextRequest, NextResponse } from "next/server";

import { AppError, BadRequestError } from "@/server/errors";
import { previewAdminOrderPayment } from "@/server/services/admin/orders";
import { assertAdminApiUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

type RouteParams = { id?: string };

export async function POST(
    request: NextRequest,
    context: { params: Promise<RouteParams> }
) {
    try {
        // await assertAdminApiUser();
        const params = await context.params;
        const orderId = params.id;
        if (!orderId) {
            throw new BadRequestError("Order id is required");
        }

        const body = await request.json().catch(() => ({}));
        const creditsOverrides = body.creditsOverrides || {};

        const preview = await previewAdminOrderPayment(orderId, creditsOverrides);
        return NextResponse.json(preview);
    } catch (error) {
        return toErrorResponse(error);
    }
}

const toErrorResponse = (error: unknown) => {
    if (error instanceof AppError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Unhandled /api/admin/orders/[id]/preview-payment error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
};
