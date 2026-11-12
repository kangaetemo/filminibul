#!/bin/bash
# Filminibul önbellek temizliği: filminibul-cache-temizle.timer saatte bir çalıştırır.
# İkisi de yalnız önbellek: silinen dosya bir sonraki istekte yeniden oluşur, veri kaybı olmaz.
#
# 1) Next.js veri önbelleği (/opt/filminibul/shared/fetch-cache): koddaki en uzun önbellek süresi
#    1 gün, 25 saatten eski girdi bir daha okunmaz. 10 Kasım'da yalnız deploy'da (haftada bir)
#    temizlendiği için 11 GB birikmişti. 12 Kasım ölçümü: 25 saatte ~5 GB yazılıyor, bu yüzden
#    temizlik günde bir değil saatte bir çalışır (önbellek ~5 GB'ı geçmez).
# 2) TMDB görsel kopyaları (/var/cache/filminibul-img): hiç silinmiyordu, 10 Kasım'da 16 GB
#    (13 GB'ı w1280 arka planlar) ve disk doldu. IMG_MAX_DAYS gündür açılmayan görseller silinir;
#    toplam yine IMG_CAP_MB'yi aşarsa en uzun süredir açılmayanlardan başlanarak sınırın altına inilir.
#    "Açılma" zamanı dosyanın atime'ı: Caddy her sunuşta okur, relatime günde bir günceller.
set -euo pipefail

FETCH_CACHE=${FETCH_CACHE:-/opt/filminibul/shared/fetch-cache}
IMG_DIR=${IMG_DIR:-/var/cache/filminibul-img}
IMG_MAX_DAYS=${IMG_MAX_DAYS:-30}
IMG_CAP_MB=${IMG_CAP_MB:-8192}

log() { echo "[cache-temizle] $*"; }

exec 9>/run/filminibul-cache-temizle.lock
flock -n 9 || { log "başka bir temizlik çalışıyor"; exit 0; }

if [ -d "$FETCH_CACHE" ]; then
    n=$(find "$FETCH_CACHE" -maxdepth 1 -type f -mmin +1500 ! -name tags-manifest.json -print -delete | wc -l)
    log "veri önbelleği: $n eski girdi silindi, kalan $(du -sh "$FETCH_CACHE" | cut -f1)"
fi

if [ -d "$IMG_DIR" ]; then
    # Yarım kalmış geçici dosyalar (route.ts önce .tmp yazar, sonra yerine koyar)
    find "$IMG_DIR" -type f -name '*.tmp' -mmin +60 -delete
    n=$(find "$IMG_DIR" -type f -atime +"$IMG_MAX_DAYS" -print -delete | wc -l)
    log "görseller: $IMG_MAX_DAYS gündür açılmayan $n dosya silindi"

    # Boyutlar diskte kapladığı KB olarak (%k): du ve df ile aynı ölçü
    cap=$((IMG_CAP_MB * 1024))
    total=$(find "$IMG_DIR" -type f -printf '%k\n' | awk '{s+=$1} END {print s+0}')
    if [ "$total" -gt "$cap" ]; then
        # En eski atime önce; toplam sınırın altına inene kadar sil. awk erken çıkmaz, listenin
        # sonuna kadar okur: yoksa sort SIGPIPE alır ve pipefail betiği hatayla bitirir.
        find "$IMG_DIR" -type f -printf '%A@ %k %p\0' | sort -zn \
            | awk -v RS='\0' -v ORS='\0' -v over=$((total - cap)) \
                'freed < over { freed += $2; sub(/^[^ ]+ [^ ]+ /, ""); print }' \
            | xargs -0 -r rm -f --
        log "görseller: toplam $((total / 1024)) MB > sınır $IMG_CAP_MB MB, en uzun süredir açılmayanlar silindi"
    fi
    find "$IMG_DIR" -mindepth 2 -type d -empty -delete
    log "görseller: kalan $(du -sh "$IMG_DIR" | cut -f1)"
fi
