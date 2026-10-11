import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getDbUsage, getProviderStats, type DbUsage } from "@/lib/server/adminStats";
import { githubConfigured, listRuns, type WorkflowName, type WorkflowRun } from "@/lib/server/github";
import RefreshProvidersPanel from "@/components/admin/RefreshProvidersPanel";
import LogoutButton from "@/components/admin/LogoutButton";
import CatalogAdder from "@/components/admin/CatalogAdder";

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
    const runsOf = (workflow: WorkflowName) =>
        configured ? listRuns(workflow).catch((err): WorkflowRun[] => (console.error("GitHub runs:", err), [])) : Promise.resolve([]);
    const [stats, runs, catalogRuns, usage] = await Promise.all([getProviderStats(), runsOf("providers"), runsOf("catalog"), getDbUsage()]);
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

                <Link href="/admin/analytics" className="mt-6 inline-flex rounded-xl bg-accent px-4 py-2 font-semibold text-black">Ürün istatistiklerini aç →</Link>

                <section className="mt-8 p-5 rounded-2xl bg-card border border-white/10">
                    <h2 className="text-lg font-semibold text-white">Katalog</h2>
                    <p className="mt-1 text-sm text-white/40">
                        Eklenen film anında aranabilir, kendi benzer filmleri çıkar ve diğer filmlerin önerilerine girer. Mod listeleri ve keyword çevirileri haftalık güncellemeyle yenilenir.
                    </p>
                    <div className="mt-4">
                        <DbUsageBar usage={usage} />
                    </div>
                    <div className="mt-5">
                        <CatalogAdder />
                    </div>

                    <h3 className="mt-6 text-sm font-semibold text-white/80">Haftalık otomatik güncelleme</h3>
                    <p className="mt-1 text-sm text-white/40">
                        Her pazartesi 05:00&apos;te: Türkiye&apos;de yeni vizyona giren ve katalogda eksik popüler filmler eklenir (en fazla 100), oy/puanlar tazelenir, mod
                        listeleri ve keyword çevirileri yenilenir. Eklenen filmler çalıştırmanın Log sayfasındaki özette listelenir.
                    </p>
                    <div className="mt-3">
                        <RefreshProvidersPanel
                            initialRuns={catalogRuns}
                            configured={configured}
                            endpoint="/api/admin/update-catalog"
                            startedMessage="Başlatıldı. GitHub'ın işi sıraya alması birkaç saniye sürer; güncelleme ~5 dakika. Yeni filmler sitede en geç 1 saat içinde görünür."
                        />
                    </div>
                </section>

                <section className="mt-6 p-5 rounded-2xl bg-card border border-white/10">
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

const mb = (b: number) => `${Math.round(b / 1024 / 1024)} MB`;

function DbUsageBar({ usage }: { usage: DbUsage | null }) {
    if (!usage) {
        return (
            <p className="text-sm text-yellow-300">
                Veritabanı doluluğu okunamadı. Supabase SQL Editor&apos;de <code>scripts/sql/admin_db_usage.sql</code> dosyasını çalıştır.
            </p>
        );
    }
    const pct = Math.min(100, Math.round((usage.usedBytes / usage.limitBytes) * 100));
    const color = pct >= 90 ? "bg-pass" : pct >= 75 ? "bg-yellow-400" : "bg-like";
    return (
        <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="text-white/80">
                    Veritabanı: <b className="text-white">{mb(usage.usedBytes)}</b> / {mb(usage.limitBytes)} (%{pct})
                </span>
                <span className="text-white/50">
                    {usage.films.toLocaleString("tr-TR")} film · tahminen <b className="text-white">~{usage.remainingFilms.toLocaleString("tr-TR")}</b> film daha sığar
                </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            {pct >= 90 && <p className="mt-2 text-xs text-pass-glow">Ücretsiz plan sınırına yaklaşıldı: yeni film eklemeden önce yer açmak gerekir.</p>}
        </div>
    );
}
