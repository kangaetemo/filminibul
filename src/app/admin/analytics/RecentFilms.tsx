import Link from "next/link";
import { recentFilmViews } from "@/lib/server/analytics";
import { supabaseSelect } from "@/lib/server/supabase";
import { displayTitle } from "@/lib/recommend/similar";
import { filmPath } from "@/lib/filmUrl";

export default async function RecentFilms({ rawStart, days, page }: { rawStart: string; days: number; page: number }) {
    try {
        const { rows, more } = await recentFilmViews(rawStart, page);
        const ids = Array.from(new Set(rows.map(r => Number(r.film_id)).filter(id => Number.isSafeInteger(id) && id > 0)));
        const films = ids.length ? await supabaseSelect<{ movie_id: number; tr_title: string | null; original_title: string | null; title: string; language: string | null }[]>(`film_embeddings_v3?select=movie_id,tr_title,title,original_title,language&movie_id=in.(${ids.join(",")})`) : [];
        const titles = new Map(films.map(f => [f.movie_id, displayTitle(f)]));
        return <section id="recent-films" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-lg font-semibold">En son bakılan filmler</h2>
            <p className="mb-4 mt-1 text-xs text-slate-500">Son açılan film sayfaları · Türkiye saati · yeni kayıtlar üstte · kişi bilgisi içermez</p>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="border-b border-slate-200 p-3">Tarih / Saat</th><th className="border-b border-slate-200 p-3">Film</th></tr></thead><tbody>
                {rows.map((row, i) => { const id = Number(row.film_id); const title = titles.get(id) || `Film #${id}`; return <tr key={`${row.created_at}:${i}`}><td className="whitespace-nowrap border-b border-slate-100 p-3"><time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "medium", timeStyle: "medium" })}</time></td><td className="border-b border-slate-100 p-3"><Link href={filmPath(id, title)} className="text-teal-800 underline underline-offset-2">{title}</Link></td></tr>; })}
                {!rows.length && <tr><td colSpan={2} className="p-4 text-slate-500">Bu aralıkta görüntüleme kaydı yok.</td></tr>}
            </tbody></table></div>
            <nav aria-label="Film görüntüleme sayfaları" className="mt-4 flex min-h-11 items-center justify-between text-sm">
                {page > 1 ? <Link href={`?days=${days}&film_page=${page - 1}#recent-films`} className="underline">← Daha yeni</Link> : <span />}
                <span className="text-slate-500">Sayfa {page}</span>
                {more ? <Link href={`?days=${days}&film_page=${page + 1}#recent-films`} className="underline">Daha eski →</Link> : <span />}
            </nav>
        </section>;
    } catch {
        return <section id="recent-films" className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-semibold">En son bakılan filmler</h2><p className="mt-2 text-sm text-slate-500">Görüntüleme geçmişi okunamadı. Sayfayı yenileyerek tekrar dene.</p></section>;
    }
}
