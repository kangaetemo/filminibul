#!/bin/bash
# supabase-db CPU teşhisi — yalnız okur, hiçbir şeyi değiştirmez. Sunucuda root olarak: bash db-yuk-teshis.sh
# Çıktıdaki en pahalı sorgular, komşu tablosunun doluluğu ve (Caddy erişim kaydı açıksa) en çok istek atan
# tarayıcılar, yükün nereden geldiğini gösterir.
set -uo pipefail
psql() { docker exec -i supabase-db psql -U postgres -d postgres -X -P pager=off "$@"; }

echo "== Konteyner CPU / bellek =="
docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}' | sort -k2 -t$'\t' -rh | head -8

echo; echo "== Şu an çalışan sorgular (en uzun süren önce) =="
psql -c "select pid, now() - query_start as sure, state, left(regexp_replace(query, '\s+', ' ', 'g'), 140) as sorgu
         from pg_stat_activity where state <> 'idle' and pid <> pg_backend_pid() order by sure desc nulls last limit 15"

echo; echo "== Toplam süreye göre en pahalı 15 sorgu (pg_stat_statements, son sıfırlamadan beri) =="
psql -c "select calls, round(total_exec_time/1000) as toplam_sn, round(mean_exec_time::numeric, 1) as ort_ms,
                left(regexp_replace(query, '\s+', ' ', 'g'), 120) as sorgu
         from extensions.pg_stat_statements order by total_exec_time desc limit 15" 2>&1 \
  || echo "pg_stat_statements yok: create extension pg_stat_statements with schema extensions; (yazma işlemi, onayla)"

echo; echo "== Benzer film listesi olmayan katalog filmleri (bunlar her açılışta canlı HNSW'ye düşer) =="
psql -c "select count(*) as film, count(n.movie_id) as listesi_olan, count(*) - count(n.movie_id) as listesiz
         from public.film_embeddings_v3 f left join public.film_neighbors n using (movie_id)"

echo; echo "== Index'ler (HNSW ve film_neighbors var mı?) =="
psql -c "select indexrelname, pg_size_pretty(pg_relation_size(indexrelid)) as boyut, idx_scan
         from pg_stat_user_indexes where relname in ('film_embeddings_v3','film_neighbors','film_providers','film_person_credits')"

echo; echo "== Next.js veri önbelleği =="
for d in /opt/filminibul/current/.next/cache/fetch-cache /opt/filminibul/shared/fetch-cache; do
  [ -e "$d" ] && echo "$d → $(ls -ld "$d" | awk '{print $1}') $(find -L "$d" -type f | wc -l) dosya, $(du -shL "$d" | cut -f1)"
done

LOG=/var/log/caddy/filminibul.log
if [ -f "$LOG" ]; then
  echo; echo "== Caddy: son 50 bin istekte en çok istek atan User-Agent'lar ve yollar =="
  tail -n 50000 "$LOG" | python3 -c '
import json, sys, collections
ua, path, ip = collections.Counter(), collections.Counter(), collections.Counter()
for line in sys.stdin:
    try: r = json.loads(line)["request"]
    except Exception: continue
    ua[(r.get("headers", {}).get("User-Agent") or ["-"])[0][:110]] += 1
    path["/" + r["uri"].lstrip("/").split("/")[0].split("?")[0]] += 1
    ip[r.get("client_ip") or r.get("remote_ip")] += 1
for title, c in (("User-Agent", ua), ("Yol", path), ("IP", ip)):
    print(f"-- {title}")
    for k, n in c.most_common(12): print(f"{n:7d}  {k}")
'
else
  echo; echo "Caddy erişim kaydı yok ($LOG): ops/vps/site.caddy içindeki log bloğu eklenince bot dağılımı görülür."
fi
