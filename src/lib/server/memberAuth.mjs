import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export class MemberError extends Error {
    constructor(code, status = 401) { super(code); this.code = code; this.status = status; }
}

export function memberAdminAuth() {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    // Production must never accept unsigned emulator tokens.
    if (!projectId || process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new MemberError("member_not_configured", 503);
    const name = "filminibul-members";
    const app = getApps().find(app => app.name === name) || initializeApp({ projectId }, name);
    // ID-token verification uses Google's public certificates. No private
    // service-account credential or additional Firebase provider is needed.
    return getAuth(app);
}

export async function verifyMember(authorization) {
    if (typeof authorization !== "string" || authorization.length > 12000 || !/^Bearer [A-Za-z0-9_.-]+$/.test(authorization)) throw new MemberError("sign_in_required");
    try {
        const token = await memberAdminAuth().verifyIdToken(authorization.slice(7));
        const now = Math.floor(Date.now() / 1000);
        if (!token.uid || token.uid.length > 128 || !Number.isInteger(token.iat) || token.iat > now
            || !Number.isInteger(token.auth_time) || token.auth_time > now || !Number.isInteger(token.exp) || token.exp <= now) throw new MemberError("sign_in_required");
        return token.uid;
    } catch (error) {
        if (error instanceof MemberError) throw error;
        // Do not return SDK error messages containing a token or account data.
        if (error?.code === "auth/internal-error") throw new MemberError("member_unavailable", 503);
        throw new MemberError("sign_in_required");
    }
}
