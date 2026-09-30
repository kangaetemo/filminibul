import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getProviderStats } from "@/lib/server/adminStats";
import { githubConfigured, listRuns, type WorkflowRun } from "@/lib/server/github";
import RefreshProvidersPanel from "@/components/admin/RefreshProvidersPanel";
import LogoutButton from "@/components/admin/LogoutButton";

// Erişim kontrolü src/middleware.ts'te (oturum yoksa /admin/login'e yönlendirir)
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin · Filminibul", robots: { index: false, follow: false } };

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) : "—");

function daysAgo(iso: string | null) {
    if (!iso) return null;
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return d === 0 ? "bugün" : `${d} gün önce`;
}

export default async function AdminPage() {
    const configured = githubConfigured();
    const [stats, runs] = await Promise.all([
        getProviderStats(),
        configured ? listRuns().catch((err): WorkflowRun[] => (console.error("GitHub runs:", err), [])) : Promise.resolve([]),
    ]);
    const coverage = stats.catalogFilms ? Math.round((stats.filmsWithProviders / stats.catalogFilms) * 1000) / 10 : 0;

    return (
        <main className="min-h-screen bg-background px-4 sm:px-8 py-6">
            <div className="max-w-5xl mx-auto">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Admin</h1>
                        <Link href="/" className="text-sm text-white/40 hover:text-white">
                            ← Siteye dön
                        </Link>
                    </div>
                    <LogoutButton />
                </header>

                <section className="mt-8 p-5 rounded-2xl bg-card border border-white/10">
                    <h2 className="text-lg font-semibold text-white">Platform bilgisi (Nerede izlenir?)</h2>
                    <p className="mt-1 text-sm text-white/40">
                        Kaynak: JustWatch (TMDB). Her pazartesi 06:00&apos;da otomatik yenilenir.
                    </p>

                    <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Stat label="Katalogdaki film" value={stats.catalogFilms.toLocaleString("tr-TR")} />
                        <Stat label="Platform bilgisi olan" value={stats.filmsWithProviders.toLocaleString("tr-TR")} sub={`%${coverage}`} />
                        <Stat label="Son güncelleme" value={daysAgo(stats.lastUpdated) ?? "—"} sub={fmt(stats.lastUpdated)} />
                        <Stat label="En eski kayıt" value={daysAgo(stats.oldestUpdated) ?? "—"} sub={fmt(stats.oldestUpdated)} />
                    </div>

                    <h3 className="mt-6 text-sm font-semibold text-white/80">Platform başına film (abonelik + ücretsiz)</h3>
                    <ul className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {stats.perPlatform.map(({ platform, films }) => (
                            <li key={platform.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/60 border border-white/5">
                                {platform.logoUrl && <Image src={platform.logoUrl} alt="" width={24} height={24} className="rounded" />}
                                <span className="text-sm text-white/80 truncate">{platform.name}</span>
                                <span className="ml-auto text-sm font-semibold text-white">{films}</span>
                            </li>
                        ))}
                    </ul>

                    <h3 className="mt-6 text-sm font-semibold text-white/80">Yenileme</h3>
                    <div className="mt-3">
                        <RefreshProvidersPanel initialRuns={runs} configured={configured} />
                    </div>
                </section>
            </div>
        </main>
    );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className="p-3 rounded-xl bg-background/60 border border-white/5">
            <div className="text-xs text-white/40">{label}</div>
            <div className="mt-1 text-xl font-semibold text-white">{value}</div>
            {sub && <div className="text-xs text-white/40">{sub}</div>}
        </div>
    );
}
