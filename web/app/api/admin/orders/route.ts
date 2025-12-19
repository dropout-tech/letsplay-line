import { NextRequest, NextResponse } from "next/server";

import { AppError, BadRequestError } from "@/server/errors";
import {
    listAdminOrders,
    type AdminOrderListFilters,
} from "@/server/services/admin/orders";
import type { OrderStatus } from "@/server/repos/orders-repo";
import { assertAdminApiUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        // await assertAdminApiUser();
        const filters = parseFilters(request);
        const data = await listAdminOrders(filters);
        return NextResponse.json({ data });
    } catch (error) {
        return toErrorResponse(error);
    }
}

const parseFilters = (request: NextRequest): AdminOrderListFilters => {
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status");
    if (!statusParam) {
        return {};
    }

    const normalized = normalizeStatus(statusParam);
    if (!normalized) {
        throw new BadRequestError("Invalid status filter");
    }

    return { status: normalized } satisfies AdminOrderListFilters;
};

const normalizeStatus = (value: string | null): OrderStatus | undefined => {
    if (!value) {
        return undefined;
    }

    const normalized = value.replace(/-/g, "_").toUpperCase();
    const allowed: OrderStatus[] = [
        "PENDING_PAYMENT",
        "PAID",
        "CANCELLED",
        "REFUNDED",
    ];
    return allowed.find((status) => status === normalized);
};

const toErrorResponse = (error: unknown) => {
    if (error instanceof AppError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Unhandled /api/admin/orders error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
};
