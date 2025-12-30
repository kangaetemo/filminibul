# Upstash Vector Film Yükleyici
# ============================
# 
# Gerekli kütüphane kurulumları:
# pip install upstash-vector tqdm
#
# Kullanım:
# 1. UPSTASH_VECTOR_REST_URL ve UPSTASH_VECTOR_REST_TOKEN değerlerini ayarla
# 2. JSON dosyasının yolunu JSON_FILE_PATH değişkeninde belirt
# 3. python upload_to_upstash.py

import json
from tqdm import tqdm
from upstash_vector import Index

# =====================
# AYARLAR
# =====================

# Upstash Vector bağlantı bilgileri
UPSTASH_VECTOR_REST_URL = "https://sterling-kingfish-6017-eu1-vector.upstash.io"  # Upstash console'dan al
UPSTASH_VECTOR_REST_TOKEN = "ABoFMHN0ZXJsaW5nLWtpbmdmaXNoLTYwMTctZXUxYWRtaW5OR1ZpTVRSaE1Ea3ROV0ZsTkMwME1tRTFMVGt4TVdFdFpqRmpaRGd3TVdRNU1ERmo="  # Upstash console'dan al

# JSON dosya yolu
JSON_FILE_PATH = r"C:\Users\recepsamet.ucer\Desktop\projeler\filminibul\dev_dev_arsiv.json"

# Batch boyutu (Upstash'a aynı anda gönderilecek vektör sayısı)
# Upstash ücretsiz plan için genelde 100-1000 arası önerilir
BATCH_SIZE = 100

# =====================
# ANA FONKSİYONLAR
# =====================

def load_json_data(file_path: str) -> list:
    """JSON dosyasını yükler"""
    print(f"📂 JSON dosyası yükleniyor: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"✅ {len(data)} film yüklendi")
    return data

def create_upstash_index() -> Index:
    """Upstash Vector index'ine bağlanır"""
    print("🔗 Upstash Vector'a bağlanılıyor...")
    index = Index(
        url=UPSTASH_VECTOR_REST_URL,
        token=UPSTASH_VECTOR_REST_TOKEN
    )
    print("✅ Bağlantı başarılı")
    return index

def prepare_vectors(films: list) -> list:
    """Filmlerden vektör ve metadata'ları hazırlar"""
    vectors = []
    for film in films:
        vector_data = {
            "id": str(film["id"]),  # ID string olmalı
            "vector": film["vibe"],  # 384 boyutlu vektör
            "metadata": {
                "id": film["id"],
                "baslik": film["baslik"],
                "yil": film["yil"],
                "ozet": film["ozet"]
            }
        }
        vectors.append(vector_data)
    return vectors

def batch_upload(index: Index, vectors: list, batch_size: int):
    """Vektörleri batch halinde yükler"""
    total = len(vectors)
    print(f"\n🚀 Yükleme başlıyor... (Toplam: {total} film, Batch boyutu: {batch_size})")
    
    # Batch'lere böl ve yükle
    for i in tqdm(range(0, total, batch_size), desc="Batch yükleniyor"):
        batch = vectors[i:i + batch_size]
        
        # Upstash upsert formatına dönüştür
        upsert_data = []
        for v in batch:
            upsert_data.append((v["id"], v["vector"], v["metadata"]))
        
        # Yükle
        try:
            index.upsert(vectors=upsert_data)
        except Exception as e:
            print(f"\n❌ Hata (batch {i//batch_size + 1}): {e}")
            continue
    
    print(f"\n✅ Yükleme tamamlandı! {total} film başarıyla yüklendi.")

def verify_upload(index: Index, sample_id: str):
    """Yüklemeyi doğrulamak için rastgele bir kayıt sorgular"""
    print(f"\n🔍 Doğrulama: ID '{sample_id}' sorgulanıyor...")
    try:
        result = index.fetch(ids=[sample_id])
        if result:
            print(f"✅ Kayıt bulundu: {result[0].metadata.get('baslik', 'N/A')}")
        else:
            print("⚠️ Kayıt bulunamadı")
    except Exception as e:
        print(f"❌ Doğrulama hatası: {e}")

# =====================
# ANA PROGRAM
# =====================

def main():
    print("=" * 50)
    print("🎬 UPSTASH VECTOR FİLM YÜKLEYİCİ")
    print("=" * 50)
    
    # 1. JSON verilerini yükle
    films = load_json_data(JSON_FILE_PATH)
    
    # 2. Upstash'a bağlan
    index = create_upstash_index()
    
    # 3. Vektörleri hazırla
    print("\n📊 Vektörler hazırlanıyor...")
    vectors = prepare_vectors(films)
    print(f"✅ {len(vectors)} vektör hazırlandı")
    
    # 4. Batch halinde yükle
    batch_upload(index, vectors, BATCH_SIZE)
    
    # 5. Doğrulama (ilk filmi kontrol et)
    if vectors:
        verify_upload(index, vectors[0]["id"])
    
    print("\n" + "=" * 50)
    print("🎉 İşlem tamamlandı!")
    print("=" * 50)

if __name__ == "__main__":
    main()
