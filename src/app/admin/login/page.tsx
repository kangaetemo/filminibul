"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
            if (res.ok) {
                router.replace("/admin");
                router.refresh();
                return;
            }
            const data = await res.json().catch(() => ({}));
            setError(data.error ?? "Giriş başarısız");
        } catch {
            setError("Bağlantı hatası");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-background flex items-center justify-center px-4">
            <form onSubmit={submit} className="w-full max-w-sm p-6 rounded-2xl bg-card border border-white/10">
                <div className="flex items-center gap-2 text-white">
                    <Lock className="w-5 h-5 text-accent-glow" />
                    <h1 className="text-lg font-semibold">Filminibul Admin</h1>
                </div>
                <input
                    type="password"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Şifre"
                    className="mt-4 w-full px-4 py-3 rounded-xl bg-background border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-accent/60"
                />
                {error && <p className="mt-2 text-sm text-pass-glow">{error}</p>}
                <button
                    type="submit"
                    disabled={loading || !password}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent hover:bg-accent-glow disabled:opacity-50 text-white font-medium transition-colors"
                >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Giriş yap
                </button>
            </form>
        </main>
    );
}
