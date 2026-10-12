"use client";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

export function memberAuth() {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!apiKey || !authDomain || !projectId) throw new Error("auth/not-configured");
    const app = getApps().length ? getApp() : initializeApp({ apiKey, authDomain, projectId });
    return getAuth(app);
}
export function googleProvider() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    return provider;
}
