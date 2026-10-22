import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

// Kendi alan adımızdan TMDB görseli (/img/w342/abc.jpg): diskte varsa oradan, yoksa TMDB'den alıp diske yazarak.
// Canlıda diskteki dosyaları Caddy Next.js'e hiç uğramadan sunar (ops/vps/site.caddy); bu rota yalnız ilk istekte çalışır.
// Klasör yazılamıyorsa (yerel geliştirme) görsel yine sunulur, sadece saklanmaz.
export const dynamic = "force-dynamic";

const DIR = process.env.IMG_CACHE_DIR ?? "/var/cache/filminibul-img";
const SIZE = /^w(45|92|154|185|300|342|500|780|1280)$/;
// svg bilerek yok: kendi alan adımızdan sunulan svg içindeki betik çalışabilir
const FILE = /^[A-Za-z0-9_-]+\.(jpg|png)$/;
const TYPES = { jpg: "image/jpeg", png: "image/png" } as const;
const notFound = (status = 404) => new Response("Not found", { status, headers: { "Cache-Control": "public, max-age=300" } });

let warned = false;

export async function GET(_req: Request, { params }: { params: { size: string; file: string } }) {
    const { size, file } = params;
    const ext = FILE.exec(file)?.[1] as keyof typeof TYPES | undefined;
    if (!SIZE.test(size) || !ext) return notFound();
    const headers = { "Content-Type": TYPES[ext], "Cache-Control": "public, max-age=31536000, immutable" };
    const target = path.join(DIR, "img", size, file);

    try {
        return new Response(await readFile(target), { headers });
    } catch { /* diskte yok: TMDB'den al */ }

    // no-store: Next'in fetch önbelleğine görsel yazılmasın (o önbellek sayfa verisi için)
    const res = await fetch(`https://image.tmdb.org/t/p/${size}/${file}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) }).catch(() => null);
    if (!res?.ok) return notFound(res?.status === 404 ? 404 : 502);
    const body = Buffer.from(await res.arrayBuffer());

    try {
        await mkdir(path.dirname(target), { recursive: true });
        // Yarım dosya sunulmasın: önce geçici adla yaz, sonra tek adımda yerine koy
        const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
        await writeFile(tmp, body);
        await rename(tmp, target);
    } catch (e) {
        if (!warned) { warned = true; console.warn("[img] görsel diske yazılamadı:", (e as Error).message); }
    }
    return new Response(body, { headers });
}
