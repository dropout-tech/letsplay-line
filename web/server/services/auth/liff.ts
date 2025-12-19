import type { NextRequest } from "next/server";

import { UnauthorizedError } from "@/server/errors";

const DEV_HEADER = "x-line-user-id";

export type LiffAuthContext = {
    lineUserId: string;
    source: "dev-header" | "dev-env";
};

/**
 * Temporary LIFF auth stub. The real implementation should verify the LIFF ID token
 * or access token with LINE and derive the `lineUserId` from that response.
 *
 * For now we allow a mocked identity to be provided via the `X-Line-User-Id` header
 * or `DEV_LIFF_USER_ID` environment variable so the rest of the stack can be implemented
 * and exercised locally.
 */
export const authenticateLiffRequest = async (
    request: NextRequest
): Promise<LiffAuthContext> => {
    const headerUserId = request.headers.get(DEV_HEADER);
    if (headerUserId) {
        return { lineUserId: headerUserId, source: "dev-header" };
    }

    const envUserId = process.env.DEV_LIFF_USER_ID;
    if (envUserId) {
        return { lineUserId: envUserId, source: "dev-env" };
    }

    throw new UnauthorizedError(
        "Missing LIFF identity. Provide the X-Line-User-Id header (dev-only) until full LIFF auth is wired."
    );
};
