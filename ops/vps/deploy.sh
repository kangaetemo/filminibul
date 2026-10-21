#!/bin/bash
# Filminibul otomatik yayın: GitHub main dalındaki yeni commit'i ayrı bir klasörde derler,
# başarılıysa /opt/filminibul/current bağını değiştirip servisi yeniden başlatır.
# Sağlık kontrolü geçmezse önceki sürüme geri döner. systemd zamanlayıcısıyla 2 dakikada bir çalışır.
# Elle kullanım: TARGET=<commit> /opt/filminibul/deploy.sh  (belirli bir commit'i yayına alır / geri döner)
#               FORCE=1 /opt/filminibul/deploy.sh            (belge-only atlamasını kapatır)
set -euo pipefail

BASE=/opt/filminibul
REPO_SLUG=kangaetemo/filminibul
REPO_URL="https://github.com/$REPO_SLUG.git"
RELEASES="$BASE/releases"
KEEP=3

exec 9>/run/filminibul-deploy.lock
flock -n 9 || exit 0

log() { echo "[deploy] $*"; }

NEW=${TARGET:-$(git ls-remote "$REPO_URL" refs/heads/main | cut -f1)}
HEALTH_URL=${HEALTH_URL:-http://127.0.0.1:3000/}
[ -n "$NEW" ] || { log "main okunamadı"; exit 1; }
# Yayındaki commit (belge-only commit'ler de buraya yazılır; klasör adı derlenen commit'tir).
CUR=$(cat "$BASE/deployed-sha" 2>/dev/null || true)
[ "$NEW" = "$CUR" ] && exit 0

# Yalnız belge değişikliği varsa (md / docs/) derleme yapma.
if [ -n "$CUR" ] && [ "${FORCE:-0}" != 1 ]; then
  files=$(curl -fsS --max-time 20 "https://api.github.com/repos/$REPO_SLUG/compare/$CUR...$NEW" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); print("\n".join(f["filename"] for f in d.get("files",[])) if d.get("status") in ("ahead",) and len(d.get("files",[]))<300 else "?")' 2>/dev/null || echo "?")
  if [ "$files" != "?" ] && [ -n "$files" ] && ! grep -vqE '(\.md$|^docs/)' <<<"$files"; then
    log "yalnız belge değişikliği ($CUR..$NEW), derleme atlandı"
    echo "$NEW" > "$BASE/deployed-sha"
    exit 0
  fi
fi

D="$RELEASES/$NEW"
LIVE_DIR=$(readlink -f "$BASE/current" 2>/dev/null || true)
if [ "$D" = "$LIVE_DIR" ]; then
  log "$NEW zaten yayında"; echo "$NEW" > "$BASE/deployed-sha"; exit 0
fi
# Önceki sürümlerden biri hâlâ duruyorsa yeniden derlemeden ona geç (hızlı geri dönüş).
if [ -f "$D/.next/BUILD_ID" ]; then
  log "$NEW önceden derlenmiş, yeniden derlenmeden yayına alınıyor"
else
log "yeni sürüm $NEW derleniyor (önceki: ${CUR:-yok})"
rm -rf "$D"
mkdir -p "$RELEASES"; chown filminibul:filminibul "$RELEASES"
runuser -u filminibul -- git clone -q "$REPO_URL" "$D"
runuser -u filminibul -- git -C "$D" checkout -q "$NEW"
ln -sf "$BASE/site.env" "$D/.env.production.local"
cd "$D"
if ! runuser -u filminibul -- npm ci --no-audit --no-fund --loglevel=error \
   || ! runuser -u filminibul -- env NEXT_TELEMETRY_DISABLED=1 npm run build; then
  log "derleme başarısız, yayın değişmedi"; rm -rf "$D"; exit 1
fi
fi

# Next.js veri önbelleği (fetch / unstable_cache) sürümler arasında ortak: her yayında boş başlayıp
# 26 bin film sayfasının (botlar tararken) veritabanına yeniden gitmesini önler. Derlemenin yazdığı
# girdiler ortak klasöre taşınır (tags-manifest.json hariç: eski revalidateTag kayıtları korunur).
SHARED_CACHE="$BASE/shared/fetch-cache"
FC="$D/.next/cache/fetch-cache"
mkdir -p "$SHARED_CACHE"; chown filminibul:filminibul "$BASE/shared" "$SHARED_CACHE"
if [ ! -L "$FC" ]; then
  mkdir -p "$D/.next/cache"
  if [ -d "$FC" ]; then
    find "$FC" -maxdepth 1 -type f ! -name tags-manifest.json -exec cp -a {} "$SHARED_CACHE/" \;
    rm -rf "$FC"
  fi
  ln -s "$SHARED_CACHE" "$FC"; chown -h filminibul:filminibul "$FC"
fi
# En uzun önbellek süresi 1 gün; 3 günden eski girdiler yalnız yer kaplar (21 Ekim: tek sürümün önbelleği 2,1 GB / 36 bin dosya).
find "$SHARED_CACHE" -maxdepth 1 -type f -mtime +3 ! -name tags-manifest.json -delete

PREV=$(readlink -f "$BASE/current" 2>/dev/null || true)
ln -sfn "$D" "$BASE/current.new" && mv -T "$BASE/current.new" "$BASE/current"
systemctl restart filminibul

ok=0
for i in $(seq 1 30); do
  sleep 2
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$HEALTH_URL" || true)
  [ "$code" = 200 ] && { ok=1; break; }
done
if [ "$ok" != 1 ]; then
  log "sağlık kontrolü başarısız (son kod: $code), geri dönülüyor"
  if [ -n "$PREV" ] && [ -d "$PREV" ]; then
    ln -sfn "$PREV" "$BASE/current.new" && mv -T "$BASE/current.new" "$BASE/current"
    systemctl restart filminibul
  fi
  exit 1
fi
echo "$NEW" > "$BASE/deployed-sha"
log "yayında: $NEW"

# Eski sürümleri temizle (son $KEEP kalır, yayındaki her zaman korunur).
LIVE=$(readlink -f "$BASE/current")
ls -1dt "$RELEASES"/*/ 2>/dev/null | sed 's#/$##' | tail -n +$((KEEP+1)) | while read -r old; do
  [ "$old" = "$LIVE" ] || rm -rf "$old"
done
