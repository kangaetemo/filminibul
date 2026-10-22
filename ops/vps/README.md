# Filminibul VPS işletimi

20 Ekim 2026'dan beri filminibul.com tamamen kendi sunucumuzda çalışıyor: Next.js sitesi (systemd + Caddy) ve
self-host Supabase (Docker Compose: Postgres + pgvector, PostgREST, Storage, pg_cron). Supabase bulutu ve Vercel artık
kullanılmıyor (kapanış adımları `yapilacaklar.md` → ALT-03). Sunucu 4 vCPU / 8 GB RAM / 60 GB NVMe, Ubuntu 24.04 LTS;
IP adresi ve erişim bilgisi bu herkese açık repoya yazılmaz.

```
İnternet ─► Caddy (80/443, Let's Encrypt)
              ├─ filminibul.com      ─► Next.js 127.0.0.1:3000 ─► Supabase API 127.0.0.1:8000
              ├─ www.filminibul.com  ─► 308 https://filminibul.com
              └─ api.filminibul.com  ─► yalnız /rest/v1, /storage/v1 ─► 127.0.0.1:8000  (GitHub Actions işleri)
Postgres (5432 / 6543) ve Supabase Studio dışarıya kapalı.
```

Bu klasör sunucudaki dosyaların kopyasıdır (gizli bilgi içermez). Sunucudaki asıl yerleri:

| Dosya | Sunucuda |
| --- | --- |
| `deploy.sh` | `/opt/filminibul/deploy.sh` — GitHub `main` → 2 dk'da bir derleme ve yayın, başarısızsa geri dönüş |
| `backup.sh` | `/opt/filminibul/backup.sh` — gece yedeği → Cloudflare R2 |
| `filminibul.service` | `/etc/systemd/system/` — Next.js (`/opt/filminibul/current`, 127.0.0.1:3000) |
| `filminibul-deploy.{service,timer}` | `/etc/systemd/system/` |
| `filminibul-backup.{service,timer}` | `/etc/systemd/system/` — her gün 04:15 (Europe/Istanbul) |
| `site.caddy`, `api.caddy` | `/etc/caddy/` — `/etc/caddy/Caddyfile` içinden `import` edilir |
| `db-yuk-teshis.sh` | elle çalıştırılır (salt okunur) — `supabase-db` CPU teşhisi: pahalı sorgular, komşu tablosu, bot dağılımı |
| `docker-compose.localports.yml` | `/opt/supabase/` — Supabase API ve Postgres yalnız 127.0.0.1'de |

Gizli dosyalar yalnız sunucuda: `/opt/filminibul/site.env` (uygulama ortamı), `/opt/supabase/.env` (Supabase anahtarları),
`/root/filminibul-r2.env` (R2 erişimi). Uygulama anahtarları (TMDB, OpenAI, Firebase, admin şifresi, GitHub token)
ayrıca kullanıcının şifre yöneticisinde tutulmalı.

Next.js veri önbelleği (fetch / `unstable_cache`) sürümler arasında ortak: `/opt/filminibul/shared/fetch-cache`
(her sürümün `.next/cache/fetch-cache` bağı oraya gider; `deploy.sh` kurar). Caddy erişim kaydı: `/var/log/caddy/filminibul.log`.
Kayıt dosyası `caddy:caddy` sahipli olmalı: `caddy validate` root olarak çalışınca dosyayı root sahipli açar ve sonraki
`systemctl reload caddy` başarısız olur (21 Ekim'de yaşandı) → `chown caddy:caddy /var/log/caddy/*.log`.

**Görsel önbelleği (22 Ekim):** afişler tarayıcıya `filminibul.com/img/<boyut>/<dosya>` adresinden gider. İlk istekte Next.js
görseli TMDB'den alıp `/var/cache/filminibul-img/img/...` altına yazar, sonrakileri Caddy diskten sunar (`site.caddy`,
`@img_diskte`). Klasör `filminibul` sahipli olmalı: `install -d -o filminibul -g filminibul -m 755 /var/cache/filminibul-img`.
Yedeğe girmez (gerekirse silinir, yeniden dolar). Boyutu: `du -sh /var/cache/filminibul-img`.

**Envoy sağlık kontrolü (21 Ekim, PF-03):** Supabase'in `volumes/api/envoy/cds.yaml` dosyası `rest` kümesini 5 sn'de bir
`GET /` ile kontrol ediyordu; PostgREST bu adreste her seferinde OpenAPI belgesini üretiyor (iki ağır şema sorgusu, ~1,3 sn,
~1,3 MB). Veritabanı CPU'sunun ve `supabase-rest` üzerinden geçen ~24 GB trafiğin asıl kaynağı buydu. `rest` kümesinde
`path: /__saglik` + `expected_statuses: 200–404` yapıldı (PostgREST bilinmeyen tabloya şema önbelleğinden, veritabanına
gitmeden 404 döner; çökerse / şema yüklenemezse 503 → sağlıksız). Yedek `cds.yaml.bak-<zaman>`. **Supabase güncellenince
bu dosya eski hâline dönebilir**; güncellemeden sonra `grep -n -A3 http_health_check volumes/api/envoy/cds.yaml` ile kontrol et.

**Uyarı:** sunucuda başka bir site daha var. `/etc/caddy/Caddyfile` asla baştan yazılmaz, yalnız satır eklenir;
her değişiklikten sonra `caddy validate` → `systemctl reload caddy` ve iki sitenin de açıldığı kontrol edilir.
Port kullanmadan önce `ss -tlnp` ile boş olduğu doğrulanır (127.0.0.1:3001 diğer siteye ait).

## Yayın (GitHub `main` → sunucu)

`filminibul-deploy.timer` her 2 dakikada `deploy.sh`'yi çalıştırır. `main`'de yeni commit varsa
`/opt/filminibul/releases/<commit>` klasörüne klonlar, `npm ci` + `next build` yapar (bu sırada eski sürüm yayında kalır),
`/opt/filminibul/current` bağını çevirip `filminibul` servisini yeniden başlatır. 60 sn içinde `http://127.0.0.1:3000/`
200 vermezse önceki sürüme döner. Yalnız `*.md` / `docs/` değişen commit'ler derlenmez. Son 3 sürüm saklanır.
Haftalık katalog işinin `src/data` commit'leri de aynı yolla yayına çıkar. Ön izleme (preview) yayını yoktur.

```sh
systemctl status filminibul filminibul-deploy.timer   # servis ve zamanlayıcı
journalctl -u filminibul-deploy -n 50                 # son yayın denemeleri
journalctl -u filminibul -f                           # site logu
cat /opt/filminibul/deployed-sha                      # yayındaki commit
TARGET=<tam commit> /opt/filminibul/deploy.sh         # belirli commit'e geç / geri dön (derlenmişse hemen)
FORCE=1 /opt/filminibul/deploy.sh                     # belge-only atlamasını kapat
systemctl stop filminibul-deploy.timer                # bir sürümde kalmak için (yoksa main'e geri ilerler)
```

Ortam değişkenleri `/opt/filminibul/site.env` dosyasındadır (her sürüme `.env.production.local` olarak bağlanır).
Yalnız sunucu tarafı değişkenler (ör. `ADMIN_PASSWORD`, `OPENAI_API_KEY`) için `systemctl restart filminibul` yeter;
`NEXT_PUBLIC_*` değerleri derlemeye gömüldüğü için değişince yeni bir derleme gerekir (main'e gelen bir sonraki kod commit'i
ya da yeni commit'e `TARGET=`).

GitHub Actions iş akışları veritabanına `api.filminibul.com` üzerinden bağlanır; repodaki sırlar `SUPABASE_URL`
(`https://api.filminibul.com`), `SUPABASE_SERVICE_ROLE_KEY` (self-host anahtarı), `TMDB_API_KEY`, `OPENAI_API_KEY`.

## Veritabanına SQL uygulama

Studio dışarı açık olmadığından `scripts/sql/` dosyaları sunucuda `psql` ile uygulanır (repo sunucuda
`/opt/filminibul/current` altında da var):

```sh
docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < scripts/sql/<dosya>.sql
docker exec -it supabase-db psql -U postgres -d postgres     # etkileşimli
```

Supabase servisleri: `cd /opt/supabase && docker compose ps` (yeniden başlatma `sh run.sh start` /
`docker compose restart <servis>`). Veritabanı payı 5 GB (admin panelindeki doluluk ve `add_missing.mjs` buna göre).

## Yedek

R2 bucket'ında `gunluk/<UTC zaman>/` (8 gün) ve pazar günleri `haftalik/<UTC zaman>/` (35 gün):

- `db-public.dump` — `public` + `supabase_migrations` (pg_dump -Fc)
- `storage-meta.dump` — `storage.buckets` + `storage.objects` satırları
- `storage-files.tgz` — Storage dosya arka ucu (`/opt/supabase/volumes/storage`)
- `manifest.txt` — yayındaki commit, satır sayıları, boyut ve SHA-256

Elle çalıştırma: `systemctl start filminibul-backup` · Log: `journalctl -u filminibul-backup` ·
Son başarılı yedek: `/opt/filminibul/backup-last-ok`.

## Geri yükleme (sıfırdan sunucu)

1. Ubuntu + Docker; resmî Supabase `docker/` klasörü `/opt/supabase`'e, yeni anahtarlar (`utils/generate-keys.sh`,
   `utils/add-new-auth-keys.sh`), `docker-compose.localports.yml` + `sh run.sh config add docker-compose.localports.yml`,
   `sh run.sh start`.
2. Yedeği indir (rclone, R2 anahtarıyla) ve SHA-256'ları `manifest.txt` ile karşılaştır.
3. Veritabanı:
   ```sh
   docker cp db-public.dump supabase-db:/tmp/db.dump
   docker exec supabase-db psql -U postgres -c "create extension if not exists vector with schema public"
   docker exec supabase-db sh -c 'pg_restore -l /tmp/db.dump | grep -vE "SCHEMA - public|SCHEMA public|DEFAULT ACL" > /tmp/db.list && pg_restore -U postgres -d postgres --exit-on-error -L /tmp/db.list /tmp/db.dump'
   docker exec supabase-db psql -U postgres -c "create extension if not exists pg_cron" \
     -c "select cron.schedule('filminibul-analytics-retention', '15 0 * * *', 'select public.analytics_maintain();')"
   ```
   Not: yeni veritabanının varsayılan yetkileri anon / authenticated'a fazladan yetki verebilir; geri yüklemeden sonra
   tablo ve fonksiyon yetkileri eski kurulumla karşılaştırılmalı (20 Ekim taşımasında `revoke all … from anon, authenticated`
   gerekti, ayrıntı `yapilanlar.md`).
4. Storage: Supabase'i durdurup `storage-files.tgz`'yi `/opt/supabase/volumes/storage` içine aç, sonra
   `pg_restore -U postgres -d postgres --data-only storage-meta.dump` (bucket ve nesne satırları), Supabase'i başlat.
5. Site: Node 22, `filminibul` kullanıcısı, `site.env` (yeni Supabase anahtarıyla), `deploy.sh` + birimler, Caddy blokları.
   GitHub Actions sırları (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) yeni anahtara güncellenir.
6. DNS: `filminibul.com`, `www` ve `api` A kayıtları yeni sunucuya; Caddy sertifikaları kendisi alır. Ardından site,
   `/api/similar/603`, admin girişi, üye listesi yazımı ve bir GitHub Actions doğrulama işi (ör. `verify-blend`) denenir.

20 Ekim 2026'da ilk yedek (`gunluk/2026-10-20T1419Z`) R2'den indirilip ayrı bir veritabanına (3. adım) geri yüklendi:
film tablolarının veri özetleri, fonksiyon / index sayıları ve `similar_movies_v4(603)` sonucu canlıyla aynıydı.
Storage'ın (4. adım) ve sıfırdan sunucu kurulumunun tamamı henüz denenmedi.

## Bilinen açıklar

Dışarıdan erişilebilirlik kontrolü GitHub Actions'ta (`.github/workflows/uptime.yml`, 15 dk'da bir; hata olursa "Kesinti"
issue'su açılır). Disk / bellek / CPU uyarısı ve yedek başarısızlığı bildirimi henüz yok (`backup-last-ok` elle bakılır). Sunucuda başka bir site de çalıştığı için yük ikisinin toplamıdır. Açık maddeler:
`yapilacaklar.md` → ALT-03, ALT-06.
