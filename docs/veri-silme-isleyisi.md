# Filminibul — manuel veri erişimi ve silme talepleri

13 Ekim 2026. Yayımlanan `/privacy` metnindeki `admin@filminibul.com` talep yolunun işletim notu. Bu dosya herhangi bir gerçek hesabı silmez; otomatik bir silme sistemi veya çalışma süresi garantisi değildir.

## Talebi doğrulama

- Talebin hesap, bulut listesi veya ikisini birlikte kapsadığını netleştir. Firebase Authentication'daki ilgili kaydın e-posta adresi ve UID'siyle eşleştir; aynı isimli kullanıcıları adla eşleştirme.
- Yalnızca görünen gönderici adına güvenme. Gerekirse kayıtlı e-posta adresine kapsamı teyit eden bir yanıt gönderip hesap sahipliğini doğrula. Şifre, oturum tokenı veya tek kullanımlık giriş kodu isteme.
- Kapsam doğrulanana kadar veri silme. Kişisel bilgileri GitHub'a, bu işletim dosyasına veya genel loglara yazma.

## Veri erişimi talebi

Firebase üyelikteki temel profil ile Supabase'de yalnızca doğrulanmış hesabın listesine ait kayıtları incele. Başka kullanıcı kayıtlarını veya kimlik bilgisi / servis anahtarını çıktı dosyasına ekleme. İstenen bilgi kapsamıyla sınırlı yanıt ver; mevcut yetkili yönetim konsollarını kullan.

## Yalnızca bulut listesinin silinmesi

Firebase üyelik kaydını koru. `member-watchlists` özel bucket'ında yalnızca ilgili hesabın SHA-256 UID önekindeki film JSON nesnelerini Storage arayüzü veya Storage API'siyle kaldır. Kullanıcıya, yerel bekleyen işlemler / önbelleğin kendi cihazlarında site verileri temizlenerek ayrıca kaldırılabileceğini ve hesabıyla yeni kayıt yapabileceğini anlat. Kullanıcı sadece tek film kaldırmak istiyorsa mevcut Kaydettiklerim arayüzünü kullanabilir.

Önek, mevcut `src/lib/server/watchlistStorage.mjs` dosyasındaki `ownerPrefix(uid)` ile belirlenir. UID'yi kullanıcıdan token olarak isteme; yetkili Firebase kaydından al. Bütün bucket'ı veya başka hesapların klasörlerini temizleme. SQL ile yalnızca `storage.objects` metadata satırını silmek, nesnenin kendisini silme yöntemi değildir; Storage arayüzü / API kullanılmalıdır.

## Hesap ve bulut listesinin birlikte silinmesi

1. UID ve doğru özel Storage önekini Firebase kaydı kaldırılmadan önce belirle; kişisel bilgileri genel kayıtlara taşımadan talebi yürüt.
2. Yetkili Firebase Authentication konsolunda yalnızca doğrulanmış üyelik kaydını kaldır. Bu işlem kullanıcının Google hesabını silmez. Uygulamada yeni Google girişi daha sonra yeni bir Firebase üyeliği oluşturabilir.
3. Sunucu şu anda ID token imza / proje / süre doğrulaması yapar; kullanıcı silinme veya token iptali durumunu her istekte Firebase'e sormaz. Firebase ID tokenları bir saat geçerli olabilir. Eski geçerli oturumlarla kayıtların yeniden oluşturulmaması için Firebase üyeliği kaldırıldıktan sonra mevcut tokenların geçerlilik penceresinin dolmasını bekle; bu aşama bitmeden talebi tamamlandı olarak bildirme.
4. Geçerlilik penceresi dolduktan sonra yalnızca eski UID'ye ait özel Storage nesnelerini kaldır. İlgili önekte aktif nesne kalmadığını Storage arayüzü / API ile kontrol et; varsa başarısız silmeleri tekrar ele al. Aynı e-posta ile sonradan açılan yeni bir hesabı ayrı yeni talepsiz silme.
5. Talebin sonucunu bildir. Tarayıcıdaki eski yerel kopyaların ayrıca kullanıcı tarafından temizlenmesi gerektiğini açıkla. Sağlayıcı teknik kayıtları / yedekleri için doğrudan kontrolümüzde olmayan süreler hakkında anlık kalıcı silme sözü verme.

Ürün istatistikleri üyelik UID'siyle ilişkilendirilmez; günlük özetlerden belirli bir hesabın verisi ayrıştırılamaz. Mevcut ham / özet saklama süreci 30 / 365 gündür. E-postayla alınan bir silme talebi Google OAuth marka doğrulamasını otomatik başlatmaz.

Kaynaklar: [Firebase oturumları ve ID token ömrü](https://firebase.google.com/docs/auth/admin/manage-sessions), [Google bağlantısını kaldırmak uygulama verisini silmez](https://support.google.com/accounts/answer/13533235), [Supabase Storage şeması](https://supabase.com/docs/guides/storage/schema/design).
