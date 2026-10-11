import Link from "next/link";
import { analyticsSearchHistory, SEARCH_PAGE_SIZE, type SearchHistoryFilters, type SearchHistory as History } from "@/lib/server/analytics";

const labels: Record<string, string> = { search: "Film adı", vibe: "Tarif", blend: "Karıştırma seçimi" };
const dateFormat = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "medium" });
const n = (value: number) => value.toLocaleString("tr-TR");
const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

export default async function SearchHistory({ rawStart, days, filters }: { rawStart: string; days: number; filters: SearchHistoryFilters }) {
    let history: History | undefined;
    try { history = await analyticsSearchHistory(rawStart, filters); } catch { /* Keep the rest of the dashboard usable. */ }
    const href = (page: number) => {
        const params = new URLSearchParams({ days: String(days), search_page: String(page) });
        if (filters.term) params.set("search_term", filters.term);
        if (filters.context) params.set("search_context", filters.context);
        if (filters.emptyOnly) params.set("search_empty", "1");
        return `/admin/analytics?${params}#tum-aramalar`;
    };
    const pages = history ? Math.max(1, Math.ceil(history.total / SEARCH_PAGE_SIZE)) : 1;
    return <section id="tum-aramalar" className="min-w-0 scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Tüm aramalar</h2>
        <p className="mt-2 text-sm text-slate-500">En yeniden eskiye, her arama ayrı kayıt olarak gösterilir. {rawStart} tarihinden başlayan kayıtlar; en fazla son 30 gün. Tek kez arananlar da dahildir.</p>
        <form key={JSON.stringify([days,filters.term,filters.context,filters.emptyOnly])} action="/admin/analytics#tum-aramalar" method="get" className="my-5 flex flex-wrap items-end gap-3">
            <input type="hidden" name="days" value={days}/>
            <label className="min-w-0 flex-1 basis-48 text-sm">Arama metni<input type="search" name="search_term" defaultValue={filters.term} maxLength={120} placeholder="Listede ara…" className={`mt-1 ${inputClass}`}/></label>
            <div className="text-sm"><label htmlFor="search-context">Tür</label><select id="search-context" name="search_context" defaultValue={filters.context} className={`mt-1 ${inputClass}`}><option value="">Tümü</option>{Object.entries(labels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <label className="flex items-center gap-2 py-2 text-sm"><input type="checkbox" name="search_empty" value="1" defaultChecked={filters.emptyOnly}/>Yalnızca sonuçsuz</label>
            <button className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white">Filtrele</button>
            <Link href={`/admin/analytics?days=${days}#tum-aramalar`} className="px-2 py-2 text-sm text-teal-800 underline">Sıfırla</Link>
        </form>
        {!history ? <p role="status" className="text-sm text-slate-500">Arama kayıtları şu an okunamadı. Sayfayı yenileyerek tekrar deneyebilirsin.</p> : <>
            <p className="mb-3 text-sm text-slate-500">{n(history.total)} kayıt{history.total > 0 && ` · ${n((history.page - 1) * SEARCH_PAGE_SIZE + 1)}–${n((history.page - 1) * SEARCH_PAGE_SIZE + history.rows.length)} gösteriliyor`}</p>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{["Tarih / saat", "Arama", "Tür", "Sonuç sayısı"].map(label => <th key={label} className="border-b border-slate-200 px-3 py-3 font-medium text-slate-500">{label}</th>)}</tr></thead><tbody>
                {history.rows.length ? history.rows.map((row,i) => <tr key={`${row.created_at}-${i}`}>
                    <td className="whitespace-nowrap border-b border-slate-100 px-3 py-3 align-top"><time dateTime={row.created_at}>{dateFormat.format(new Date(row.created_at))}</time></td>
                    <td className="min-w-40 max-w-xl break-words border-b border-slate-100 px-3 py-3 align-top">{row.query ?? <span className="text-slate-500">Metni gizlenen arama</span>}</td>
                    <td className="border-b border-slate-100 px-3 py-3 align-top">{labels[row.context] ?? row.context}</td>
                    <td className={`border-b border-slate-100 px-3 py-3 align-top tabular-nums ${row.result_count === "0" ? "text-orange-700" : ""}`}>{n(Number(row.result_count))}</td>
                </tr>) : <tr><td colSpan={4} className="p-5 text-slate-500">Bu aralıkta filtrelerle eşleşen arama yok.</td></tr>}
            </tbody></table></div>
            <nav aria-label="Arama kayıtları sayfaları" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>Sayfa {n(history.page)} / {n(pages)}</span>
                <div className="flex flex-wrap gap-3">{history.page > 1 && <Link prefetch={false} href={href(history.page - 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-teal-800">← Önceki</Link>}{history.page < pages && <Link prefetch={false} href={href(history.page + 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-teal-800">Sonraki →</Link>}</div>
            </nav>
            <p className="mt-3 text-xs text-slate-500">Her sayfada en fazla 50 kayıt. Hassas görünen aramaların metni gizlenir; işlem ve sonuç sayısı gösterilir.</p>
        </>}
    </section>;
}
