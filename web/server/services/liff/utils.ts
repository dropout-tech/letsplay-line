export type LiffProfileHeaders = {
    displayName?: string | null;
    pictureUrl?: string | null;
    email?: string | null;
};

const HEADER_DISPLAY_NAME = "x-line-display-name";
const HEADER_PICTURE_URL = "x-line-picture";
const HEADER_EMAIL = "x-line-email";

export const readLiffProfileFromHeaders = (headers: Headers): LiffProfileHeaders => {
    const displayName = headers.get(HEADER_DISPLAY_NAME);
    const pictureUrl = headers.get(HEADER_PICTURE_URL);
    const email = headers.get(HEADER_EMAIL);

    const profile: LiffProfileHeaders = {};
    if (displayName && displayName.trim().length > 0) {
        profile.displayName = displayName;
    }
    if (pictureUrl && pictureUrl.trim().length > 0) {
        profile.pictureUrl = pictureUrl;
    }
    if (email && email.trim().length > 0) {
        profile.email = email;
    }

    return profile;
};
