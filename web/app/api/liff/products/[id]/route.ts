import { NextRequest, NextResponse } from "next/server";

import { BadRequestError, AppError } from "@/server/errors";
import { authenticateLiffRequest } from "@/server/services/auth/liff";
import {
    DEFAULT_INCLUDE_FIELDS,
    getLiffProductDetail,
    type IncludeField,
} from "@/server/services/liff/products";

export const dynamic = "force-dynamic";

type RouteParams = { id?: string };

export async function GET(
    request: NextRequest,
    context: { params: Promise<RouteParams> }
) {
    try {
        await authenticateLiffRequest(request);

        const params = await context.params;
        const productId = resolveProductId(request, params);
        if (!productId) {
            throw new BadRequestError("Product id is required");
        }

        const include = parseIncludeFields(
            new URL(request.url).searchParams.get("include")
        );

        const product = await getLiffProductDetail({ productId, include });

        return NextResponse.json({ data: product });
    } catch (error) {
        return toErrorResponse(error);
    }
}

const resolveProductId = (
    request: NextRequest,
    params?: RouteParams
): string | undefined => {
    if (params?.id) {
        return params.id;
    }

    const segments = new URL(request.url)
        .pathname.split("/")
        .filter(Boolean);
    const productsIndex = segments.lastIndexOf("products");
    if (productsIndex >= 0 && segments.length > productsIndex + 1) {
        return segments[productsIndex + 1];
    }

    return undefined;
};

const INCLUDE_TOKENS: Record<string, IncludeField> = {
    variations: "variations",
    variants: "variants",
};

const parseIncludeFields = (raw: string | null): ReadonlySet<IncludeField> => {
    if (!raw) {
        return DEFAULT_INCLUDE_FIELDS;
    }

    const result = new Set<IncludeField>();
    raw
        .split(",")
        .map((segment) => segment.trim().toLowerCase())
        .forEach((segment) => {
            const includeField = INCLUDE_TOKENS[segment as keyof typeof INCLUDE_TOKENS];
            if (includeField) {
                result.add(includeField);
            }
        });

    return result.size > 0 ? result : DEFAULT_INCLUDE_FIELDS;
};

const toErrorResponse = (error: unknown) => {
    if (error instanceof AppError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Unhandled /api/liff/products error", error);
    return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
    );
};
