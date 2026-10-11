import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, isValidSession } from "@/lib/server/adminAuth";
import { analyticsRpc } from "@/lib/server/analytics";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ürün istatistikleri · Filminibul", robots: { index: false, follow: false } };
type Daily = { day: string; sessions: number; views: number; searches: number; no_results: number; impressions: number; matched_clicks: number; recommendation_clicks: number; blends: number; trailers: number; platforms: number; moods: number };
type Query = { query: string; context: string; searches: number; no_results: number; clicked: number };
type Report = {
    raw_start: string; days: number; daily: Daily[]; budget_used: number;
    queries: Query[]; no_result_queries: Query[];
    ranks: { rank: number; impressions: number; clicked: number }[];
    sources: { source: string; sessions: number; views: number; recommendation_sessions: number; blend_sessions: number }[];
    landings: { path: string; sessions: number; recommendation_sessions: number }[];
    films: { film_id: number; title: string; opens: number; recommendations: number }[];
    pairs: { source_film_id: number; film_id: number; clicks: number }[];
    events: { name: string; count: number }[];
};
const n = (value: number) => value.toLocaleString("tr-TR");
const pct = (a: number, b: number) => b ? `%${(100 * a / b).toFixed(1)}` : "—";
const labels: Record<string, string> = { google: "Google", direct: "Doğrudan / kaynak bilinmiyor", bing: "Bing", social: "Sosyal medya", referral: "Diğer siteler", search: "Film adı", vibe: "Tarif", blend: "Karıştırma seçimi", page_view: "Sayfa açma", film_opened: "Film açma", film_clicked: "Film kartı seçme", recommendation_impression: "Öneri kartı gösterimi", recommendation_clicked: "Öneri tıklama", search_performed: "Arama", blend_completed: "Karıştırma sonucu", mood_selected: "Mod seçme", trailer_clicked: "Fragman açma", platform_clicked: "JustWatch bağlantısı" };
function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
    return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{headers.map(h => <th key={h} className="border-b border-slate-200 px-3 py-3 font-medium text-slate-500">{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((r,i) => <tr key={i}>{r.map((v,j) => <td key={j} className="border-b border-slate-100 px-3 py-3 align-top">{v}</td>)}</tr>) : <tr><td colSpan={headers.length} className="p-5 text-slate-500">Bu aralıkta kayıt yok.</td></tr>}</tbody></table></div>;
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><h2 className="mb-3 text-lg font-semibold">{title}</h2>{children}</section>;
}
function Trend({ daily }: { daily: Daily[] }) {
    const max = Math.max(1, ...daily.flatMap(d => [d.views, d.searches, d.recommendation_clicks]));
    const line = (key: "views" | "searches" | "recommendation_clicks") => daily.map((d,i) => `${45 + i / Math.max(1,daily.length - 1) * 710},${185 - d[key]/max*150}`).join(" ");
    return <><div className="flex flex-wrap gap-4 text-xs"><span className="text-slate-700">● Sayfa açma</span><span className="text-teal-700">● Arama</span><span className="text-orange-700">● Öneri tıklama</span></div><svg viewBox="0 0 800 225" role="img" aria-label="Günlük sayfa açma, arama ve öneri tıklama grafiği; kesin değerler aşağıdaki tabloda" className="mt-3 w-full"><line x1="45" y1="185" x2="755" y2="185" stroke="#cbd5e1"/><text x="8" y="40" fontSize="12" fill="#64748b">{max}</text><text x="20" y="188" fontSize="12" fill="#64748b">0</text><polyline points={line("views")} fill="none" stroke="#334155" strokeWidth="2"/><polyline points={line("searches")} fill="none" stroke="#0f766e" strokeWidth="2"/><polyline points={line("recommendation_clicks")} fill="none" stroke="#c2410c" strokeWidth="2"/><text x="45" y="215" fontSize="12" fill="#64748b">{daily[0]?.day}</text><text x="755" y="215" textAnchor="end" fontSize="12" fill="#64748b">{daily[daily.length-1]?.day}</text></svg></>;
}
export default async function AnalyticsPage({ searchParams }: { searchParams?: { days?: string } }) {
    // Defense in depth: never rely only on middleware for private report reads.
    if (!(await isValidSession(cookies().get(ADMIN_COOKIE)?.value))) redirect("/admin/login");
    const requested = Number(searchParams?.days);
    const days = [7,30,90,365].includes(requested) ? requested : 7;
    let report: Report | null = null;
    try { report = await analyticsRpc<Report>("analytics_report", { p_days: days }); } catch { /* Show setup instructions, never credentials or raw DB errors. */ }
    const sum = (key: keyof Omit<Daily,"day">) => report?.daily.reduce((total, d) => total + d[key], 0) ?? 0;
    const cards = [
        ["Sayfa açma", n(sum("views"))], ["Günlük oturum toplamı", n(sum("sessions"))],
        ["Arama", n(sum("searches"))], ["Sonuçsuz arama", pct(sum("no_results"),sum("searches"))],
        ["Öneri tıklama", n(sum("recommendation_clicks"))], ["Görülen önerilerde tıklama", pct(sum("matched_clicks"),sum("impressions"))],
        ["Karıştırma sonucu", n(sum("blends"))], ["Fragman / JustWatch", `${n(sum("trailers"))} / ${n(sum("platforms"))}`],
    ];
    const filmLink = (id: number, title?: string) => <Link href={`/film/${id}`} className="text-teal-800 underline underline-offset-2">{title ?? `Film #${id}`}</Link>;
    return <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 text-slate-800 sm:px-8"><div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4"><div><Link href="/admin" className="text-sm text-slate-500">← Yönetim paneli</Link><h1 className="mt-2 text-3xl font-bold">Filminibul istatistikleri</h1><p className="mt-2 text-sm text-slate-500">Türkiye saati · bugün henüz tamamlanmadı · yalnızca takip etkinleştirildikten sonraki veriler</p></div><nav aria-label="Tarih aralığı" className="flex flex-wrap gap-2">{[7,30,90,365].map(d => <Link key={d} href={`/admin/analytics?days=${d}`} aria-current={days === d ? "page" : undefined} className={`rounded-full border px-4 py-2 text-sm ${days === d ? "border-teal-700 bg-teal-700 text-white" : "border-slate-200 bg-white"}`}>{d} gün</Link>)}</nav></header>
        {(process.env.ANALYTICS_ENABLED !== "true" || process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true") && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">Olay toplama kapalı. SQL kurulumu tamamlandıktan sonra ANALYTICS_ENABLED ve NEXT_PUBLIC_ANALYTICS_ENABLED değerlerini true yapıp yeniden deploy et.</p>}
        {!report ? <Panel title="İstatistikler okunamadı"><p className="text-sm">Supabase SQL Editor&apos;de <code>scripts/sql/analytics.sql</code> ve ardından pg_cron&apos;u etkinleştirerek <code>scripts/sql/analytics_cron.sql</code> dosyasını çalıştır. Supabase sunucu ortam değişkenlerini de kontrol et. Veritabanı bağlantısında geçici hata varsa sayfayı yenile.</p></Panel> : <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(([label,value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></div>)}</div>
            <p className="text-xs leading-relaxed text-slate-500">Oturum toplamı günlük tekil oturumların toplamıdır; aynı oturum gece yarısını geçerse iki güne sayılır. Kişi sayısı değildir. Öneri oranı: bir ziyarette en az 1 saniye %50 görünür olan kartlardan daha sonra tıklananların payı. Bu oran beğeni veya film izleme başarısı değildir. Bugünkü kayıt bütçesi: {n(report.budget_used)} / 5.000.</p>
            <Panel title="Günlük hareketler"><Trend daily={report.daily}/><details><summary className="cursor-pointer text-sm text-teal-800">Günlük değerleri aç</summary><Table headers={["Gün","Oturum","Sayfa","Arama","Öneri tıklama","Karıştırma"]} rows={[...report.daily].reverse().map(d => [d.day,n(d.sessions),n(d.views),n(d.searches),n(d.recommendation_clicks),n(d.blends)])}/></details></Panel>
            <p className="text-sm text-slate-500">Aşağıdaki ayrıntılar {report.raw_start} tarihinden itibaren tutulmuş ham kayıtlardan hesaplanır (en fazla 30 gün). Günlük grafik ve kartlar seçilen dönemin tamamını kapsar.</p>
            <Panel title="Geliş kaynağı ve özellik kullanımı"><Table headers={["Kaynak","Oturum","Sayfa","Öneriye geçen oturum","Karıştıran oturum"]} rows={report.sources.map(s => [labels[s.source] ?? s.source,n(s.sessions),n(s.views),`${n(s.recommendation_sessions)} (${pct(s.recommendation_sessions,s.sessions)})`,n(s.blend_sessions)])}/><p className="mt-3 text-xs text-slate-500">Kaynak referrer kategorisinden belirlenir; Google&apos;da yazılan arama kelimesi bu yolla öğrenilemez. Kaynak gizlenmişse doğrudan olarak görünür.</p></Panel>
            <div className="grid gap-6 lg:grid-cols-2"><Panel title="En çok arananlar"><Table headers={["Arama","Tür","Adet","Sonuçsuz","Filme geçiş"]} rows={report.queries.map(q => [q.query,labels[q.context],n(q.searches),n(q.no_results),q.context === "blend" ? "—" : pct(q.clicked,q.searches)])}/></Panel><Panel title="Sonuç bulunamayan aramalar"><Table headers={["Arama","Tür","Sonuçsuz"]} rows={report.no_result_queries.map(q => [q.query,labels[q.context],n(q.no_results)])}/></Panel></div>
            <p className="text-xs text-slate-500">Film adı aramaları sonuç geldikten sonra 1,2 saniye yazma durduğunda veya film seçildiğinde sayılır. Tarif aramaları sonuç sayfası açıldığında sayılır. Karıştırma seçimleri için filme geçiş oranı hesaplanmaz. Hassas görünen sorguların metni saklanmaz; adetleri genel toplamlara dahildir.</p>
            <div className="grid gap-6 lg:grid-cols-2"><Panel title="Öneri sırasına göre tıklama"><Table headers={["Sıra","Görülen kart","Tıklanan kart","Oran"]} rows={report.ranks.map(r => [r.rank,n(r.impressions),n(r.clicked),pct(r.clicked,r.impressions)])}/></Panel><Panel title="En çok açılan filmler"><Table headers={["Film","Açılma","Öneriden tıklama"]} rows={report.films.map(f => [filmLink(f.film_id,f.title),n(f.opens),n(f.recommendations)])}/></Panel></div>
            <div className="grid gap-6 lg:grid-cols-2"><Panel title="Giriş sayfaları"><Table headers={["İlk sayfa","Oturum","Öneriye geçen"]} rows={report.landings.map(l => [<Link key={l.path} href={l.path} className="text-teal-800 underline">{l.path}</Link>,n(l.sessions),`${n(l.recommendation_sessions)} (${pct(l.recommendation_sessions,l.sessions)})`])}/><p className="mt-3 text-xs text-slate-500">Seçilen ham veri aralığındaki ilk kaydedilmiş sayfa esas alınır.</p></Panel><Panel title="En çok kullanılan film bağlantıları"><Table headers={["Kaynak film","Seçilen film","Tıklama"]} rows={report.pairs.map(p => [filmLink(p.source_film_id),filmLink(p.film_id),n(p.clicks)])}/></Panel></div>
            <Panel title="Olay dökümü"><Table headers={["İşlem","Adet"]} rows={report.events.map(e => [labels[e.name] ?? e.name,n(e.count)])}/></Panel>
            <p className="text-xs text-slate-500">IP, tam yönlendirme adresi ve cihaz parmak izi kaydedilmez. Oturum kimliği sekme içinde rastgele üretilir; 30 dakika hareketsizlikte veya 24 saatte yenilenir. DNT/GPC, otomasyon tarayıcıları ve admin oturumları dışarıda bırakılır. Engelleyiciler ve temel bot filtresini aşan trafik ölçümü etkileyebilir.</p>
        </>}
    </div></main>;
}
