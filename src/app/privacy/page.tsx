import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Gizlilik Politikası - Filminibul",
    description: "Filminibul gizlilik politikası",
};

export default function PrivacyPolicy() {
    return (
        <main className="min-h-screen bg-background py-16 px-5">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-ink mb-8">Gizlilik Politikası</h1>

                <div className="prose prose-sm max-w-none space-y-6">
                    <section>
                        <h2 className="text-xl font-semibold text-ink mb-3">Hesap ve kişisel veri</h2>
                        <p className="text-ink/80 leading-relaxed">
                            Filminibul&apos;u kullanmak için hesap açman gerekmez. Ad, e-posta gibi kişisel bilgileri hesap kaydı için istemiyoruz. Arama kutularına kişisel bilgi yazmamanı öneririz.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-ink mb-3">Aramaların</h2>
                        <ul className="list-disc list-inside text-ink/80 space-y-1 mt-2">
                            <li>Yazdığın film adı, sonuç bulmak için sunucumuza ve TMDB&apos;ye gönderilir.</li>
                            <li>
                                &quot;Tarif et&quot; ile yazdığın metin, anlamına göre film bulabilmek için <strong>OpenAI</strong>&apos;ye gönderilir. Bu metne kişisel
                                bilgi yazmamanı öneririz.
                            </li>
                            <li>Aramalar bir hesapla ya da kimliğinle ilişkilendirilmez.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-ink mb-3">Tarayıcında saklananlar</h2>
                        <p className="text-ink/80 leading-relaxed">
                            &quot;Nerede izlenir?&quot; filtresinde seçtiğin platformlar, bir dahaki ziyaretinde hatırlanması için tarayıcının yerel depolamasında
                            tutulur. Kaydettiğin filmler de yalnızca kullandığın tarayıcıda saklanır. Bu bilgi sunucularımıza gönderilmez; tarayıcı verilerini silerek kaldırabilirsin.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-ink mb-3">Ürün kullanım istatistikleri</h2>
                        <p className="text-ink/80 leading-relaxed">
                            Etkin olduğunda film açma, arama, öneri kartlarının görünmesi ve seçilmesi, film karıştırma, mod seçimi,
                            fragman açma ve JustWatch bağlantısı kullanımı gibi işlemleri hizmetimizi geliştirmek için kaydederiz.
                            Arama metni, sonuç sayısı ve ilgili film numaraları bu kayıtlara dahil olabilir. E-posta, bağlantı veya
                            telefon numarası gibi görünen arama metinlerini basit bir filtreyle ayıklarız; bu filtre tüm kişisel bilgileri tespit edemeyebilir.
                        </p>
                        <p className="text-ink/80 leading-relaxed mt-2">
                            Sekmene ait rastgele bir oturum numarası tarayıcının oturum depolamasında tutulur; 30 dakika hareketsizlikte
                            veya en fazla 24 saat sonra yenilenir. Bu numara hesabınla ilişkilendirilmez. Ürün istatistiklerimizde IP adresini,
                            cihaz parmak izini ve tam yönlendirme adresini saklamayız; geliş kaynağını yalnızca Google, sosyal medya gibi kategorilerle tutarız.
                            Ham kayıtlar son 30 takvim günü, kimlik ve arama metni içermeyen günlük özetler 365 gün saklanır.
                            Tarayıcının Do Not Track veya Global Privacy Control sinyali açıksa bu ürün istatistikleri gönderilmez.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-ink mb-3">Üçüncü taraf hizmetler</h2>
                        <ul className="list-disc list-inside text-ink/80 space-y-1 mt-2">
                            <li>
                                <strong>TMDB</strong>: film bilgileri ve afişler. Afişler doğrudan TMDB&apos;nin sunucularından yüklenir.
                            </li>
                            <li>
                                <strong>JustWatch</strong> (TMDB üzerinden): Türkiye&apos;deki yayın platformu bilgisi.
                            </li>
                            <li>
                                <strong>OpenAI</strong>: &quot;Tarif et&quot; aramalarının metni (yukarıda).
                            </li>
                            <li>
                                <strong>YouTube</strong>: fragmanlar; video yalnızca &quot;Fragmanı izle&quot; düğmesine tıkladığında, gizlilik odaklı (youtube-nocookie.com)
                                olarak yüklenir.
                            </li>
                            <li>
                                <strong>Vercel</strong>: sitenin barındırılması ve çerez kullanmayan, anonim ziyaret istatistikleri (Vercel Analytics).
                            </li>
                            <li>
                                <strong>Supabase</strong>: ürün kullanım istatistiklerinin veritabanında saklanması.
                            </li>
                            <li>
                                <strong>Google AdSense</strong>: reklam gösterimi. Google, reklamlar için kendi çerezlerini kullanabilir; ayrıntılar Google&apos;ın
                                gizlilik politikasındadır.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-ink mb-3">İletişim</h2>
                        <p className="text-ink/80 leading-relaxed">Gizlilik politikamız hakkında sorularınız için bizimle iletişime geçebilirsiniz.</p>
                    </section>

                    <p className="text-muted text-xs mt-8">Son güncelleme: Ekim 2026</p>
                </div>

                <a href="/" className="inline-flex items-center gap-2 mt-8 text-accent-ink hover:text-ink transition-colors">
                    ← Ana Sayfaya Dön
                </a>
            </div>
        </main>
    );
}
