import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Gizlilik Politikası - Filminibul",
    description: "Filminibul gizlilik politikası ve kullanım koşulları",
};

export default function PrivacyPolicy() {
    return (
        <main className="min-h-screen bg-background py-16 px-4">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-8">Gizlilik Politikası</h1>

                <div className="prose prose-invert prose-sm max-w-none space-y-6">
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">Veri Toplama</h2>
                        <p className="text-white/70 leading-relaxed">
                            Filminibul, kullanıcı deneyimini iyileştirmek için minimum düzeyde veri toplar:
                        </p>
                        <ul className="list-disc list-inside text-white/70 space-y-1 mt-2">
                            <li>Film tercihleri (beğeniler/geçişler) - yerel depolamada saklanır</li>
                            <li>İzleme listesi - yerel depolamada saklanır</li>
                            <li>Dil tercihi - yerel depolamada saklanır</li>
                            <li>Google hesap bilgileri (isteğe bağlı giriş için)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">Çerezler ve Yerel Depolama</h2>
                        <p className="text-white/70 leading-relaxed">
                            Uygulamamız, tercihlerinizi hatırlamak için tarayıcınızın yerel depolama özelliğini kullanır.
                            Bu veriler yalnızca cihazınızda saklanır ve sunucularımıza gönderilmez.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">Üçüncü Taraf Hizmetler</h2>
                        <p className="text-white/70 leading-relaxed">
                            Uygulamamız aşağıdaki üçüncü taraf hizmetleri kullanır:
                        </p>
                        <ul className="list-disc list-inside text-white/70 space-y-1 mt-2">
                            <li><strong>TMDB API</strong> - Film verileri ve görseller için</li>
                            <li><strong>YouTube</strong> - Fragmanlar için; video yalnızca &quot;Fragmanı izle&quot; düğmesine tıkladığında, gizlilik odaklı (youtube-nocookie.com) olarak yüklenir</li>
                            <li><strong>Google Firebase</strong> - İsteğe bağlı kimlik doğrulama için</li>
                            <li><strong>Google AdSense</strong> - Reklam gösterimi için (yakında)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">Veri Güvenliği</h2>
                        <p className="text-white/70 leading-relaxed">
                            Kişisel verilerinizin güvenliği bizim için önemlidir. Verilerinizi korumak için
                            endüstri standardı güvenlik önlemleri kullanıyoruz.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">İletişim</h2>
                        <p className="text-white/70 leading-relaxed">
                            Gizlilik politikamız hakkında sorularınız için bizimle iletişime geçebilirsiniz.
                        </p>
                    </section>

                    <p className="text-white/40 text-xs mt-8">
                        Son güncelleme: Aralık 2024
                    </p>
                </div>

                <a
                    href="/"
                    className="inline-flex items-center gap-2 mt-8 text-accent hover:text-accent-glow transition-colors"
                >
                    ← Ana Sayfaya Dön
                </a>
            </div>
        </main>
    );
}
