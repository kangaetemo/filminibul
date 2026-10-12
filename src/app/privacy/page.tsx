import { T } from "@/components/preferences/Preferences";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Gizlilik Politikası - Filminibul",
    description: "Filminibul gizlilik politikası",
};

export default function PrivacyPolicy() {
    return (
        <main className="min-h-screen bg-background py-16 px-5">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-ink mb-8"><T text={"Gizlilik Politikası"} /></h1>

                <div className="prose prose-sm max-w-none space-y-6">
                    <section>
                        <h2 className="text-xl font-semibold text-ink mb-3"><T text={"Hesap ve kişisel veri"} /></h2>
                        <p className="text-ink/80 leading-relaxed"> <T text={"Filminibul'u kullanmak için hesap açman gerekmez. İsteğe bağlı üyelikte e-posta adresin ve varsa adın Google Firebase Authentication tarafından hesap oluşturma ve giriş amacıyla işlenir. Google ile girişte Google hesabından ad, e-posta ve profil resmi paylaşılabilir. Şifren bizim uygulama veritabanımızda tutulmaz. Üyelik bilgilerini ürün istatistiklerindeki oturumlarla eşleştirmeyiz."} /> </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-ink mb-3"><T text={"Aramaların"} /></h2>
                        <ul className="list-disc list-inside text-ink/80 space-y-1 mt-2">
                            <li><T text={"Yazdığın film adı, sonuç bulmak için sunucumuza ve TMDB'ye gönderilir."} /></li>
                            <li> <T text={"\"Tarif et\" ile yazdığın metin, anlamına göre film bulabilmek için"} /> <strong><T text={"OpenAI"} /></strong><T text={"'ye gönderilir. Bu metne kişisel bilgi yazmamanı öneririz."} /> </li>
                            <li><T text={"Aramalar bir hesapla ya da kimliğinle ilişkilendirilmez."} /></li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-ink mb-3"><T text={"Tarayıcında saklananlar"} /></h2>
                        <p className="text-ink/80 leading-relaxed"> <T text={"\"Nerede izlenir?\" filtresinde seçtiğin platformlar, bir dahaki ziyaretinde hatırlanması için tarayıcının yerel depolamasında tutulur. Kaydettiğin filmler de yalnızca kullandığın tarayıcıda saklanır. Tema ve dil tercihin de tarayıcında saklanır. Bu tercihleri tarayıcı verilerini silerek kaldırabilirsin."} /> </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-ink mb-3"><T text={"Ürün kullanım istatistikleri"} /></h2>
                        <p className="text-ink/80 leading-relaxed"> <T text={"Etkin olduğunda film açma, arama, öneri kartlarının görünmesi ve seçilmesi, film karıştırma, mod seçimi, fragman açma ve JustWatch bağlantısı kullanımı gibi işlemleri hizmetimizi geliştirmek için kaydederiz. Arama metni, sonuç sayısı ve ilgili film numaraları bu kayıtlara dahil olabilir. E-posta, bağlantı veya telefon numarası gibi görünen arama metinlerini basit bir filtreyle ayıklarız; bu filtre tüm kişisel bilgileri tespit edemeyebilir."} /> </p>
                        <p className="text-ink/80 leading-relaxed mt-2"> <T text={"Sekmene ait rastgele bir oturum numarası tarayıcının oturum depolamasında tutulur; 30 dakika hareketsizlikte veya en fazla 24 saat sonra yenilenir. Bu numara hesabınla ilişkilendirilmez. Ürün istatistiklerimizde IP adresini, cihaz parmak izini ve tam yönlendirme adresini saklamayız; geliş kaynağını yalnızca Google, sosyal medya gibi kategorilerle tutarız. Ham kayıtlar son 30 takvim günü, kimlik ve arama metni içermeyen günlük özetler 365 gün saklanır. Tarayıcının Do Not Track veya Global Privacy Control sinyali açıksa bu ürün istatistikleri gönderilmez."} /> </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-ink mb-3"><T text={"Üçüncü taraf hizmetler"} /></h2>
                        <ul className="list-disc list-inside text-ink/80 space-y-1 mt-2">
                            <li>
                                <strong><T text={"TMDB"} /></strong><T text={": film bilgileri ve afişler. Afişler doğrudan TMDB'nin sunucularından yüklenir."} /> </li>
                            <li>
                                <strong><T text={"JustWatch"} /></strong> <T text={"(TMDB üzerinden): Türkiye'deki yayın platformu bilgisi."} /> </li>
                            <li>
                                <strong><T text={"OpenAI"} /></strong><T text={": \"Tarif et\" aramalarının metni (yukarıda)."} /> </li>
                            <li>
                                <strong><T text={"YouTube"} /></strong><T text={": fragmanlar; video yalnızca \"Fragmanı izle\" düğmesine tıkladığında, gizlilik odaklı (youtube-nocookie.com) olarak yüklenir."} /> </li>
                            <li>
                                <strong><T text={"Vercel"} /></strong><T text={": sitenin barındırılması ve çerez kullanmayan, anonim ziyaret istatistikleri (Vercel Analytics)."} /> </li>
                            <li>
                                <strong><T text={"Supabase"} /></strong><T text={": ürün kullanım istatistiklerinin veritabanında saklanması."} /> </li>
                            <li>
                                <strong><T text={"Google AdSense"} /></strong><T text={": reklam gösterimi. Google, reklamlar için kendi çerezlerini kullanabilir; ayrıntılar Google'ın gizlilik politikasındadır."} /> </li>
                        </ul>
                    </section>

                    <section><h2 className="text-xl font-semibold text-ink mb-3"><T text={"Üyelik hizmeti"} /></h2><p className="text-ink/80 leading-relaxed"><T text={"Google Firebase Authentication: hesap kaydı, Google girişi, e-posta doğrulama ve şifre sıfırlama. Giriş oturumun tarayıcı depolamasında saklanabilir; çıkış yaparak oturumu kapatabilirsin."} /></p></section>
                    <section>
                        <h2 className="text-xl font-semibold text-ink mb-3"><T text={"İletişim"} /></h2>
                        <p className="text-ink/80 leading-relaxed"><T text={"Gizlilik politikamız hakkında sorularınız için bizimle iletişime geçebilirsiniz."} /></p>
                    </section>

                    <p className="text-muted text-xs mt-8"><T text={"Son güncelleme: Ekim 2026"} /></p>
                </div>

                <a href="/" className="inline-flex items-center gap-2 mt-8 text-accent-ink hover:text-ink transition-colors"> <T text={"← Ana Sayfaya Dön"} /> </a>
            </div>
        </main>
    );
}
