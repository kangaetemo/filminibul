"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Loader2, UserRound } from "lucide-react";
import { createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile, type User } from "firebase/auth";
import { memberAuth, googleProvider } from "@/lib/auth/firebase";
import { useLanguage } from "@/components/preferences/Preferences";

const errors: Record<string, [string, string]> = {
    "auth/unauthorized-domain": ["Bu alan adı için Google girişi henüz etkinleştirilmemiş.", "Google sign-in hasn't been enabled for this domain yet."],
    "auth/operation-not-allowed": ["Bu giriş yöntemi henüz etkinleştirilmemiş.", "This sign-in method hasn't been enabled yet."],
    "auth/configuration-not-found": ["Üyelik hizmeti henüz etkinleştirilmemiş.", "The account service hasn't been enabled yet."],
    "auth/not-configured": ["Üyelik bağlantısı henüz kurulmamış.", "The account service isn't configured yet."],
    "auth/invalid-api-key": ["Üyelik bağlantısı kontrol edilmeli.", "The account service needs to be configured."],
    "auth/popup-blocked": ["Tarayıcın giriş penceresini engelledi. Açılır pencerelere izin verip tekrar dene.", "Your browser blocked the sign-in window. Allow popups and try again."],
    "auth/invalid-credential": ["E-posta veya şifre hatalı.", "The email or password is incorrect."],
    "auth/email-already-in-use": ["Bu e-postayla bir hesap var. Giriş yapmayı ya da şifreni sıfırlamayı dene.", "An account already uses this email. Try signing in or resetting your password."],
    "auth/weak-password": ["En az 8 karakterlik bir şifre kullan.", "Use a password with at least 8 characters."],
    "auth/too-many-requests": ["Çok fazla deneme yapıldı. Biraz sonra tekrar dene.", "Too many attempts. Try again shortly."],
    "auth/network-request-failed": ["Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.", "Couldn't connect. Check your connection and try again."],
};

export default function Account() {
    const { language } = useLanguage();
    const en = language === "en";
    const [user, setUser] = useState<User | null>(null);
    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [mode, setMode] = useState<"login" | "register">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [notice, setNotice] = useState("");
    const [failed, setFailed] = useState(false);
    const handleError = (error: unknown) => {
        const code = (error as { code?: string })?.code || (error as Error)?.message;
        if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
        setFailed(true);
        setNotice(errors[code]?.[en ? 1 : 0] || (en ? "Couldn't complete the request. Please try again." : "İşlem tamamlanamadı. Tekrar dene."));
    };
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        try { unsubscribe = onAuthStateChanged(memberAuth(), current => { setUser(current); setReady(true); }); }
        catch (error) { handleError(error); setReady(true); }
        return () => unsubscribe?.();
        // Subscription runs once; UI labels react to language separately.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const run = async (action: () => Promise<unknown>) => {
        if (busy) return;
        setBusy(true); setNotice(""); setFailed(false);
        try { await action(); } catch (error) { handleError(error); } finally { setBusy(false); }
    };
    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        void run(async () => {
            const auth = memberAuth();
            if (mode === "register") {
                const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
                await updateProfile(result.user, { displayName: name.trim() || null });
                setUser(result.user);
                try { await sendEmailVerification(result.user); setNotice(en ? "Your account is ready. Check your email to verify your address." : "Hesabın hazır. E-postandaki bağlantıyla adresini doğrulayabilirsin."); }
                catch { setNotice(en ? "Your account is ready. Verification email couldn't be sent; try again below." : "Hesabın hazır. Doğrulama e-postası gönderilemedi; aşağıdan tekrar deneyebilirsin."); }
            } else await signInWithEmailAndPassword(auth, email.trim(), password);
            setPassword("");
        });
    };
    if (!ready) return <p role="status" className="text-muted">{en ? "Loading your account…" : "Hesabın yükleniyor…"}</p>;
    return <div className="mx-auto max-w-md">
        <p className="eyebrow text-accent-ink">{en ? "Your film corner" : "Senin sinema köşen"}</p>
        <h1 className="mt-3 font-display text-4xl text-ink">{user ? (en ? "Your account" : "Hesabım") : (en ? "Welcome." : "Hoş geldin.")}</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">{en ? "Discovery is open to everyone. You can create a free account with Google or your email." : "Film keşfi herkese açık. Google hesabınla ya da e-postanla ücretsiz üye olabilirsin."}</p>
        {notice && <p role={failed ? "alert" : "status"} className={`mt-5 rounded-lg border border-line p-4 text-sm ${failed ? "text-red-500" : "text-ink"}`}>{notice}</p>}
        {user ? <section className="mt-6 space-y-5 rounded-xl border border-line bg-card p-6">
            <UserRound className="h-8 w-8 text-accent-ink" aria-hidden />
            <div><p className="font-bold text-ink">{user.displayName || (en ? "Film lover" : "Sinema sever")}</p><p className="mt-1 break-all text-sm text-muted">{user.email}</p></div>
            <Link href="/kaydedilenler" className="button-secondary w-full"><Bookmark className="h-4 w-4" aria-hidden />{en ? "Open watchlist" : "Kaydettiklerimi aç"}</Link>
            <p className="text-xs leading-relaxed text-muted">{en ? "Your watchlist is currently stored in this browser." : "İzleme listen şu an kullandığın tarayıcıda saklanır."}</p>
            {!user.emailVerified && <button type="button" className="text-link" disabled={busy} onClick={() => void run(async () => { await sendEmailVerification(user); setNotice(en ? "Verification email sent." : "Doğrulama e-postası gönderildi."); })}>{en ? "Send verification email" : "Doğrulama e-postası gönder"}</button>}
            <button type="button" disabled={busy} className="button-secondary w-full" onClick={() => void run(() => signOut(memberAuth()))}>{en ? "Sign out" : "Çıkış yap"}</button>
        </section> : <>
            <button type="button" disabled={busy} onClick={() => void run(() => signInWithPopup(memberAuth(), googleProvider()))} className="button-secondary mt-6 w-full"><span className="text-lg font-extrabold" aria-hidden>G</span>{en ? "Continue with Google" : "Google ile devam et"}</button>
            <div className="my-6 flex items-center gap-4 text-xs text-muted"><span className="h-px flex-1 bg-line" />{en ? "or with email" : "ya da e-postayla"}<span className="h-px flex-1 bg-line" /></div>
            <form onSubmit={submit} className="space-y-4">
                {mode === "register" && <label className="block text-sm font-semibold text-ink">{en ? "Name" : "Adın"}<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" maxLength={80} className="mt-2 min-h-12 w-full rounded-lg border border-line bg-card px-3" /></label>}
                <label className="block text-sm font-semibold text-ink">{en ? "Email" : "E-posta"}<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" maxLength={254} className="mt-2 min-h-12 w-full rounded-lg border border-line bg-card px-3" /></label>
                <label className="block text-sm font-semibold text-ink">{en ? "Password" : "Şifre"}<input type="password" required minLength={mode === "register" ? 8 : 1} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "register" ? "new-password" : "current-password"} className="mt-2 min-h-12 w-full rounded-lg border border-line bg-card px-3" /></label>
                <button type="submit" disabled={busy} className="button-primary w-full">{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{mode === "register" ? (en ? "Create account" : "Üye ol") : (en ? "Sign in" : "Giriş yap")}</button>
            </form>
            <div className="mt-4 flex flex-wrap justify-between gap-3 text-sm">
                <button type="button" disabled={busy} className="min-h-11 text-ink underline underline-offset-4" onClick={() => { setMode(mode === "login" ? "register" : "login"); setNotice(""); }}>{mode === "login" ? (en ? "Create an account" : "Yeni hesap aç") : (en ? "Already have an account?" : "Zaten hesabın var mı?")}</button>
                {mode === "login" && <button type="button" disabled={busy} className="min-h-11 text-muted underline underline-offset-4" onClick={() => void run(async () => {
                    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setFailed(true); setNotice(en ? "Enter your email first." : "Önce e-posta adresini yaz."); return; }
                    await sendPasswordResetEmail(memberAuth(), email.trim());
                    setNotice(en ? "If an account exists, you'll receive a password reset email." : "Bu adresle bir hesap varsa şifre sıfırlama e-postası alacaksın.");
                })}>{en ? "Forgot password?" : "Şifremi unuttum"}</button>}
            </div>
            <p className="mt-6 text-xs leading-relaxed text-muted">{en ? "By creating an account, you agree to the " : "Hesap oluşturduğunda "}<Link href="/privacy" className="underline underline-offset-4">{en ? "privacy policy" : "gizlilik politikasını"}</Link>{en ? "." : " kabul etmiş olursun."}</p>
        </>}
    </div>;
}
