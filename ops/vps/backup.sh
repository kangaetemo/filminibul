#!/bin/bash
# Filminibul gece yedeği → Cloudflare R2 (bucket: /root/filminibul-r2.env içindeki R2_BUCKET).
#
# İçerik (gizli anahtarlar yedeğe GİRMEZ):
#   db-public.dump      public + supabase_migrations şemaları (pg_dump -Fc; tablolar, fonksiyonlar, index'ler, veri)
#   storage-meta.dump   storage.buckets + storage.objects satırları (pg_dump -Fc --data-only)
#   storage-files.tgz   Storage dosya arka ucu (üye listeleri ve sinyaller)
#   manifest.txt        zaman, yayındaki commit, satır sayıları, boyut ve SHA-256 değerleri
# Yerleşim: gunluk/<UTC zaman>/ (8 gün saklanır), pazar günleri ayrıca haftalik/<UTC zaman>/ (35 gün).
# Yükleme R2'de boyut + özet karşılaştırmasıyla doğrulanmadan eski yedekler silinmez.
# Son başarılı yedeğin zamanı: /opt/filminibul/backup-last-ok
set -euo pipefail

RCLONE_IMAGE=rclone/rclone:1.71.2
ENV_FILE=/root/filminibul-r2.env
LAST_OK=/opt/filminibul/backup-last-ok

log() { echo "[yedek] $*"; }
fail() { log "HATA: $*"; exit 1; }

exec 9>/run/filminibul-backup.lock
flock -n 9 || fail "başka bir yedek çalışıyor"

set -a; . "$ENV_FILE"; set +a
: "${R2_ENDPOINT:?}" "${R2_ACCESS_KEY_ID:?}" "${R2_SECRET_ACCESS_KEY:?}" "${R2_BUCKET:?}"
export RCLONE_CONFIG_FR2_TYPE=s3 RCLONE_CONFIG_FR2_PROVIDER=Cloudflare RCLONE_CONFIG_FR2_NO_CHECK_BUCKET=true
export RCLONE_CONFIG_FR2_ENDPOINT="$R2_ENDPOINT" RCLONE_CONFIG_FR2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" RCLONE_CONFIG_FR2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"

STAMP=$(date -u +%Y-%m-%dT%H%MZ)
WORK=$(mktemp -d /var/tmp/filminibul-yedek.XXXXXX)
chmod 700 "$WORK"
trap 'rm -rf "$WORK"; docker exec supabase-db rm -f /tmp/fb-db.dump /tmp/fb-storage.dump >/dev/null 2>&1 || true' EXIT

rc() {
    docker run --rm -e RCLONE_CONFIG_FR2_TYPE -e RCLONE_CONFIG_FR2_PROVIDER -e RCLONE_CONFIG_FR2_NO_CHECK_BUCKET \
        -e RCLONE_CONFIG_FR2_ENDPOINT -e RCLONE_CONFIG_FR2_ACCESS_KEY_ID -e RCLONE_CONFIG_FR2_SECRET_ACCESS_KEY \
        -e RCLONE_CONFIG=/dev/null -v "$WORK":/data:ro "$RCLONE_IMAGE" "$@"
}
psql_live() { docker exec -i supabase-db psql -U postgres -d postgres -XtA -v ON_ERROR_STOP=1 "$@"; }

# 1) Veritabanı
log "veritabanı dökümü alınıyor"
docker exec supabase-db pg_dump -U postgres -d postgres -Fc -n public -n supabase_migrations -f /tmp/fb-db.dump
docker cp -q supabase-db:/tmp/fb-db.dump "$WORK/db-public.dump"
docker exec supabase-db pg_restore -l /tmp/fb-db.dump | grep -q "TABLE DATA public film_embeddings_v3" || fail "dökümde film_embeddings_v3 verisi yok"

# 2) Storage meta verisi ve dosyaları
docker exec supabase-db pg_dump -U postgres -d postgres -Fc --data-only -t storage.buckets -t storage.objects -f /tmp/fb-storage.dump
docker cp -q supabase-db:/tmp/fb-storage.dump "$WORK/storage-meta.dump"
STORAGE_DIR=$(docker inspect supabase-storage --format '{{range .Mounts}}{{if eq .Destination "/var/lib/storage"}}{{.Source}}{{end}}{{end}}')
[ -n "$STORAGE_DIR" ] && [ -d "$STORAGE_DIR" ] || fail "Storage dosya dizini bulunamadı"
tar -C "$STORAGE_DIR" -czf "$WORK/storage-files.tgz" .
FILE_COUNT=$(tar -tzf "$WORK/storage-files.tgz" | grep -vc '/$' || true)

# 3) Manifest
{
    echo "zaman_utc=$STAMP"
    echo "yayindaki_commit=$(cat /opt/filminibul/deployed-sha 2>/dev/null || echo -)"
    psql_live -c "select 'film_embeddings_v3='||count(*) from public.film_embeddings_v3" \
              -c "select 'analytics_events='||count(*) from public.analytics_events" \
              -c "select 'storage_objects='||count(*) from storage.objects where bucket_id='member-watchlists'"
    echo "storage_dosyalari=$FILE_COUNT"
    (cd "$WORK" && for f in db-public.dump storage-meta.dump storage-files.tgz; do echo "$f $(stat -c %s "$f") $(sha256sum "$f" | cut -d' ' -f1)"; done)
} > "$WORK/manifest.txt"
log "hazır: $(du -sh "$WORK" | cut -f1) ($(grep -E '^(film_embeddings_v3|storage_objects)=' "$WORK/manifest.txt" | tr '\n' ' '))"

# 4) Yükle ve doğrula
DEST="fr2:$R2_BUCKET/gunluk/$STAMP"
rc copy /data "$DEST" --s3-upload-concurrency 4 -q
rc check /data "$DEST" --one-way -q || fail "R2'deki kopya yerel dosyalarla uyuşmuyor"
log "yüklendi ve doğrulandı: gunluk/$STAMP"
if [ "$(date +%u)" = 7 ]; then
    rc copy "$DEST" "fr2:$R2_BUCKET/haftalik/$STAMP" -q
    log "haftalık kopya: haftalik/$STAMP"
fi

# 5) Saklama (yalnız bugünkü yedek doğrulandıktan sonra)
rc delete "fr2:$R2_BUCKET/gunluk" --min-age 8d -q || log "uyarı: eski günlük yedekler silinemedi"
rc delete "fr2:$R2_BUCKET/haftalik" --min-age 35d -q || log "uyarı: eski haftalık yedekler silinemedi"

date -Is > "$LAST_OK"
log "tamam"
