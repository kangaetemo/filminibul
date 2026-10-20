# Filminibul VPS işletimi

Sunucudaki dosyaların kopyası (gizli bilgi içermez). Sunucudaki asıl yerleri:

| Dosya | Sunucuda |
| --- | --- |
| `deploy.sh` | `/opt/filminibul/deploy.sh` — GitHub `main` → 2 dk'da bir derleme ve yayın, başarısızsa geri dönüş |
| `backup.sh` | `/opt/filminibul/backup.sh` — gece yedeği → Cloudflare R2 |
| `filminibul.service` | `/etc/systemd/system/` — Next.js (`/opt/filminibul/current`, 127.0.0.1:3000) |
| `filminibul-deploy.{service,timer}` | `/etc/systemd/system/` |
| `filminibul-backup.{service,timer}` | `/etc/systemd/system/` — her gün 04:15 (Europe/Istanbul) |
| `site.caddy`, `api.caddy` | `/etc/caddy/` — `/etc/caddy/Caddyfile` içinden `import` edilir |
| `docker-compose.localports.yml` | `/opt/supabase/` — Supabase API ve Postgres yalnız 127.0.0.1'de |

Gizli dosyalar yalnız sunucuda: `/opt/filminibul/site.env` (uygulama ortamı), `/opt/supabase/.env` (Supabase anahtarları),
`/root/filminibul-r2.env` (R2 erişimi). Uygulama anahtarları (TMDB, OpenAI, Firebase, admin şifresi, GitHub token)
ayrıca kullanıcının şifre yöneticisinde tutulmalı.

**Uyarı:** sunucuda başka bir site daha var. `/etc/caddy/Caddyfile` asla baştan yazılmaz, yalnız satır eklenir;
her değişiklikten sonra `caddy validate` → `systemctl reload caddy` ve iki sitenin de açıldığı kontrol edilir.
Port kullanmadan önce `ss -tlnp` ile boş olduğu doğrulanır (127.0.0.1:3001 diğer siteye ait).

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

20 Ekim 2026'da ilk yedek (`gunluk/2026-10-20T1419Z`) R2'den indirilip ayrı bir veritabanına (3. adım) geri yüklendi:
film tablolarının veri özetleri, fonksiyon / index sayıları ve `similar_movies_v4(603)` sonucu canlıyla aynıydı.
