export type LiffProfileHeaders = {
    displayName?: string | null;
    pictureUrl?: string | null;
    email?: string | null;
};

const HEADER_DISPLAY_NAME = "x-line-display-name";
const HEADER_PICTURE_URL = "x-line-picture";
const HEADER_EMAIL = "x-line-email";

/**
 * Safely decode a URI component, returning the original value if decoding fails.
 * This is useful for handling potentially malformed URI-encoded strings in HTTP headers.
 * 
 * @param value - The URI-encoded string to decode
 * @returns The decoded string, or the original value if decoding fails
 */
const safeDecodeURIComponent = (value: string): string => {
    try {
        return decodeURIComponent(value);
    } catch (error) {
        // Fallback to original value if decoding fails
        // TODO: Consider using a structured logger for production
        console.warn("Failed to decode URI component:", error);
        return value;
    }
};

export const readLiffProfileFromHeaders = (headers: Headers): LiffProfileHeaders => {
    const displayName = headers.get(HEADER_DISPLAY_NAME);
    const pictureUrl = headers.get(HEADER_PICTURE_URL);
    const email = headers.get(HEADER_EMAIL);

    const profile: LiffProfileHeaders = {};
    if (displayName && displayName.trim().length > 0) {
        profile.displayName = safeDecodeURIComponent(displayName);
    }
    if (pictureUrl && pictureUrl.trim().length > 0) {
        profile.pictureUrl = safeDecodeURIComponent(pictureUrl);
    }
    if (email && email.trim().length > 0) {
        profile.email = safeDecodeURIComponent(email);
    }

    return profile;
};
