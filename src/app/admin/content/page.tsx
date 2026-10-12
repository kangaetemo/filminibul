import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ADMIN_COOKIE, isValidSession } from "@/lib/server/adminAuth";
import { githubConfigured, listRuns } from "@/lib/server/github";
import RefreshProvidersPanel from "@/components/admin/RefreshProvidersPanel";
import ContentEditor from "./ContentEditor";
export const dynamic = "force-dynamic";
export const metadata = { title: "Film içerikleri · Filminibul", robots: { index: false, follow: false } };
export default async function ContentPage() {
    if (!await isValidSession(cookies().get(ADMIN_COOKIE)?.value)) redirect("/admin/login");
    const configured = githubConfigured();
    const runs = configured ? await listRuns("content").catch(() => []) : [];
    return <main className="mx-auto max-w-4xl px-5 py-10"><Link href="/admin" className="text-sm text-white/60 underline">← Yönetim paneli</Link><h1 className="mt-4 text-3xl font-bold text-white">Film açıklamalarını düzenle</h1><p className="mt-3 text-sm text-white/60">Türkçe metni elden geçir. İngilizce kaynak ve öneri verileri korunur. TMDB metni önce taslağa alınır; kaydetmeden siteye yansımaz.</p><ContentEditor /><section className="mt-10 rounded-xl border border-white/15 bg-card p-5"><h2 className="text-lg font-semibold text-white">Toplu içerik bakımı</h2><p className="mt-2 mb-4 text-sm text-white/60">Eksik Türkçe özetleri tamamlar, biçim bozukluklarını temizler ve mümkünse orijinal dildeki afişi seçer. İlk tam tarama uzun sürebilir; ilerleyen çalıştırmalarda güncel kayıtları atlar.</p><RefreshProvidersPanel initialRuns={runs} configured={configured} endpoint="/api/admin/refresh-content" startedMessage="İçerik bakımı başlatıldı. İlk tam tarama uzun sürebilir. Durumu GitHub çalıştırmasından takip edebilirsin." /></section></main>;
}
