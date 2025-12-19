import { NextRequest, NextResponse } from "next/server";

import { AppError, BadRequestError } from "@/server/errors";
import { confirmAdminOrderPayment } from "@/server/services/admin/orders";
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
        const excludedSessionIds = Array.isArray(body.excludedSessionIds)
            ? body.excludedSessionIds
            : [];
        const creditsOverrides = body.creditsOverrides || {};

        const updated = await confirmAdminOrderPayment(orderId, undefined, excludedSessionIds, creditsOverrides);
        return NextResponse.json({ data: updated });
    } catch (error) {
        return toErrorResponse(error);
    }
}

const toErrorResponse = (error: unknown) => {
    if (error instanceof AppError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Unhandled /api/admin/orders/[id]/confirm-payment error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
};
