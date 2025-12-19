import { headers as readHeaders } from "next/headers";

type GetBaseUrlOptions = {
    headersList?: Headers;
    requestUrl?: string;
};

export const getBaseUrl = (options: GetBaseUrlOptions = {}): string => {
    const envUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.APP_URL ??
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

    if (envUrl) {
        return normalizeUrl(envUrl);
    }

    return "http://localhost:3000";
};

const normalizeUrl = (value: string): string => {
    return value.startsWith("http") ? value : `https://${value}`;
};

const extractOrigin = (url: string): string | null => {
    try {
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.host}`;
    } catch {
        return null;
    }
};;
