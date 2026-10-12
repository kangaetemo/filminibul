"use client";
import { useState } from "react";
type Film = { id: number; title: string; tr_title: string | null; overview: string | null; tr_overview: string | null };
export default function ContentEditor() {
    const [q, setQ] = useState(""); const [results, setResults] = useState<Film[]>([]); const [film, setFilm] = useState<Film | null>(null);
    const [title, setTitle] = useState(""); const [overview, setOverview] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
    const pick = (value: Film) => { setFilm(value); setTitle(value.tr_title || ""); setOverview(value.tr_overview || ""); setMessage(""); };
    const act = async (action: () => Promise<void>) => { setBusy(true); setMessage(""); try { await action(); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } };
    const request = async (method: string) => { const r = await fetch("/api/admin/content", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: film?.id, tr_title: title, tr_overview: overview }) }); const data = await r.json(); if (!r.ok) throw new Error(data.error || "İşlem tamamlanamadı"); return data; };
    return <div className="mt-6 space-y-6">
        <form className="flex flex-wrap gap-3" onSubmit={e => { e.preventDefault(); void act(async () => { const r = await fetch(`/api/admin/content?${/^\d+$/.test(q.trim()) ? "id" : "q"}=${encodeURIComponent(q.trim())}`); const data = await r.json(); if (!r.ok) throw new Error(data.error); const values = data.film ? [data.film] : data.results || []; setResults(values); if (!values.length) setMessage("Film bulunamadı."); }); }}>
            <label className="sr-only" htmlFor="content-search">Film adı veya TMDB numarası</label><input id="content-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Film adı veya TMDB numarası" required minLength={1} maxLength={120} className="min-h-12 min-w-0 flex-1 rounded-lg border border-white/20 bg-card px-4 text-white" /><button disabled={busy} className="button-primary" type="submit">Ara</button>
        </form>
        {!!results.length && <ul className="space-y-2">{results.map(f => <li key={f.id}><button disabled={busy} onClick={() => pick(f)} className="min-h-11 text-left text-white underline underline-offset-4">{f.tr_title || f.title} · #{f.id}</button></li>)}</ul>}
        {film && <form onSubmit={e => { e.preventDefault(); void act(async () => { await request("PATCH"); setMessage("Kaydedildi. Film sayfası ve öneri önbelleği yenilendi."); }); }} className="space-y-5 rounded-xl border border-white/15 bg-card p-5">
            <h2 className="text-lg font-bold text-white">{film.title} · #{film.id}</h2>
            <details className="text-sm text-white/60"><summary className="cursor-pointer">İngilizce kaynak metni gör</summary><p className="mt-3 leading-relaxed">{film.overview || "Kaynak özet yok."}</p></details>
            <label className="block text-sm font-semibold text-white">Türkçe başlık<input value={title} onChange={e => setTitle(e.target.value)} maxLength={300} className="mt-2 min-h-12 w-full rounded-lg border border-white/20 bg-background px-3 text-white" /></label>
            <label className="block text-sm font-semibold text-white">Türkçe açıklama<textarea value={overview} onChange={e => setOverview(e.target.value)} maxLength={8000} rows={10} className="mt-2 w-full rounded-lg border border-white/20 bg-background p-3 text-white" /></label>
            <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy} className="button-primary">{busy ? "İşleniyor…" : "Değişiklikleri kaydet"}</button><button type="button" disabled={busy} onClick={() => void act(async () => { const data = await request("POST"); setTitle(data.tr_title); setOverview(data.tr_overview); setMessage("TMDB metni taslağa alındı. Kontrol edip kaydet."); })} className="min-h-12 rounded-lg border border-white/20 px-4 text-sm text-white">TMDB metnini taslağa al</button></div>
        </form>}
        {message && <p role="status" className="rounded-lg border border-white/15 p-4 text-sm text-white">{message}</p>}
    </div>;
}
