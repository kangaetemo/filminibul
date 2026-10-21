import { T } from "@/components/preferences/Preferences";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Gizlilik Politikası · Filminibul",
    description: "Google girişi, bulut film listeleri, veri saklama ve silme seçenekleri hakkında Filminibul gizlilik politikası.",
    alternates: { canonical: "/privacy" },
};

const sections = [
    {
        "id": "scope",
        "title": "Bu politikanın kapsamı",
        "paragraphs": [
            "Filminibul, filmleri keşfetmene ve kaydettiğin filmlere farklı cihazlarından ulaşmana yardımcı olur. Bu politika, filminibul.com üzerinde hangi bilgilerin işlendiğini, ne amaçla kullanıldığını, nerede saklandığını ve silme seçeneklerini açıklar. Film keşfi için hesap açman gerekmez."
        ]
    },
    {
        "id": "google-data",
        "title": "Google ile giriş ve hesap bilgileri",
        "paragraphs": [
            "Google ile giriş yaptığında adın, e-posta adresin, varsa profil resmi bağlantın ve Google hesabını tanımaya yarayan kimlik bilgileri Google Firebase Authentication tarafından işlenir. Firebase ayrıca uygulamaya ait bir kullanıcı kimliği ve giriş oturumu bilgileri oluşturur. Google şifreni almayız veya saklamayız.",
            "Bu bilgileri hesabını oluşturmak, girişini doğrulamak, hesabında adını ve e-posta adresini göstermek ve bulut film listeni doğru hesaba bağlamak için kullanırız. Gmail iletilerine, Google Drive dosyalarına, takvimine veya kişilerine erişim istemeyiz.",
            "Google'dan aldığımız hesap bilgilerini satmayız; reklam hedefleme veya yapay zekâ modeli eğitimi için kullanmayız. Uygulamamız bu bilgileri OpenAI arama isteklerine, AdSense reklam kişiselleştirme verilerine veya ürün kullanım istatistiklerine eklemez. Google kullanıcı verilerinin kullanımı ve aktarımı, Google API Services User Data Policy'nin ilgili kuralları ve uygulanabilir Limited Use şartlarıyla sınırlıdır."
        ]
    },
    {
        "id": "watchlist",
        "title": "Kaydettiğin filmler ve bulut listen",
        "paragraphs": [
            "Giriş yaptıktan sonra kaydettiğin filmler Supabase üzerinde özel bir alanda, hesabına bağlı olarak saklanır. Film numarası, başlık, yıl, puan, türler ve afiş bağlantısı tutulur. Afişlerin görüntü dosyalarını veya Google profil fotoğrafının görüntü dosyasını bu listeye kopyalamayız. Firebase profilindeki ad ve e-posta adresi Supabase film listesine ayrıca yazılmaz; liste, hesabını tanıyan bir kimlikle ilişkilidir.",
            "Sunucu giriş oturumunu doğrulayarak hesabına ait listeye erişim verir. Listeyi görüntülemek, kaydetmek, kaldırmak, cihazlar arasında eşitlemek ve “Senin için” alanında kişisel film önerileri üretmek için bu kayıtları kullanırız. Kaydetmek ilgi sinyalidir; filmi izlediğin veya beğendiğin varsayılmaz. Kişisel öneriler mevcut film kataloğu ve benzerlik verileriyle sunucuda hesaplanır; bu işlem için liste veya Google profilin OpenAI’ye gönderilmez. Öneri sonuçları ayrı bir kalıcı profil olarak saklanmaz; tekrar hesaplamayı azaltmak için hesabına, güncel listene ve film tercihlerine bağlı olarak sunucu belleğinde en fazla iki dakika tutulabilir. Eski tarayıcı listesini hesabına aktarmak isteğe bağlıdır. Giriş yapmadan kaydettiğin filmler kullandığın tarayıcıda kalır."
        ]
    },
    {
        "id": "film-preferences",
        "title": "İzleme ve beğeni tercihlerin",
        "paragraphs": ["“İzledim”, “Beğendim” ve “Bana göre değil” seçimlerini film numarasıyla, kaydetme listenden ayrı olarak hesabına bağlı özel Supabase alanında saklarız. İzlemek beğeni sayılmaz. Beğendiğin filmler önerilere yön verir; izlenmiş ve beğenilmemiş filmler kişisel önerilerden çıkarılır. Tercihler cihazlarında eşitlenir ve eşitleme için tarayıcı önbelleğinde de tutulabilir. Seçili düğmeye tekrar basarak tercihin etkisini geri alabilirsin; bunu yapmak Kaydet seçimini değiştirmez. Tercih sıfırlamalarına ait film numarası ve teknik sıfırlama kayıtları hesap verileri silinene kadar tutulabilir. Liste veya hesap silme talebinde bu kayıtları da silebiliriz. Bu tercihler OpenAI’ye, reklam kişiselleştirmesine veya anonim ürün istatistiklerine gönderilmez."]
    },
    {
        "id": "search",
        "title": "Film aramaları ve yapay zekâ",
        "paragraphs": [
            "Yazdığın film adı, sonuç bulmak için sunucumuza ve gerektiğinde TMDB'ye gönderilir. “Tarif et” ile yazdığın metin, nasıl bir film istediğini anlamak için OpenAI'ye gönderilir; metinden üretilen sayısal temsil Supabase film kataloğunda uygun sonuçları aramak için kullanılır. Uygulama bu isteklere Google profil bilgilerini eklemez. Tarif metnine kendi isteğinle kişisel bilgi yazarsan bu bilgi de metnin parçası olarak işlenebilir; bu nedenle kişisel veya hassas bilgi yazmamanı öneririz.",
            "Arama sonuçları hız ve tekrar kullanım için sunucu belleğinde en fazla altı saat önbelleğe alınabilir. Uygulamanın arama ve ürün istatistiği kayıtları üyelik hesabına bağlanmaz. Teknik bağlantı kayıtları ve üçüncü taraf hizmetlerin kendi işlemleri aşağıdaki bölümlerde ayrıca açıklanır."
        ]
    },
    {
        "id": "browser",
        "title": "Tarayıcında saklanan bilgiler",
        "paragraphs": [
            "Tema, dil ve platform filtresi tercihleri, giriş yapmadan kaydettiğin filmler, hesabına ait listenin önbelleği ve eşitlenmeyi bekleyen değişiklikler tarayıcı depolamasında tutulur. Hesap listelerinin önbelleği kullanıcıya göre ayrılır. Firebase giriş oturumu da tarayıcıda saklanabilir. Bu veriler, ilgili tercihi değiştirdiğinde, kayıtları kaldırdığında veya tarayıcı/site verilerini temizlediğinde kaldırılır ya da güncellenir; giriş oturumunu “Hesabım” sayfasından çıkış yaparak kapatabilirsin.",
            "Çıkış yapmak veya hesabın bulut kayıtlarının silinmesi, bu cihazdaki bütün eski önbellekleri otomatik olarak temizlemez. Paylaşılan cihazlarda yerel kopyaları da kaldırmak için filminibul.com site verilerini temizleyebilirsin. Henüz buluta ulaşmamış değişiklikleri temizlersen bu değişiklikler kaybolabilir."
        ]
    },
    {
        "id": "analytics",
        "title": "Ürün kullanım istatistikleri",
        "paragraphs": [
            "Etkin olduğunda film açma, arama, öneri kartlarının görünmesi ve seçilmesi, film karıştırma, mod seçimi, fragman açma ve JustWatch bağlantısı kullanımı gibi işlemleri hizmetimizi geliştirmek için kaydederiz. Arama metni, sonuç sayısı ve ilgili film numaraları bu kayıtlara dahil olabilir. E-posta, bağlantı veya telefon numarası gibi görünen arama metinlerini basit bir filtreyle ayıklarız; bu filtre tüm kişisel bilgileri tespit edemeyebilir.",
            "Sekmene ait rastgele bir oturum numarası tarayıcının oturum depolamasında tutulur; 30 dakika hareketsizlikte veya en fazla 24 saat sonra yenilenir. Bu numara hesabınla ilişkilendirilmez. Ürün istatistiklerimizde IP adresini, cihaz parmak izini ve tam yönlendirme adresini saklamayız; geliş kaynağını yalnızca Google, sosyal medya gibi kategorilerle tutarız. Ham kayıtlar son 30 takvim günü, kimlik ve arama metni içermeyen günlük özetler 365 gün saklanır. Tarayıcının Do Not Track veya Global Privacy Control sinyali açıksa bu ürün istatistikleri gönderilmez."
        ]
    },
    {
        "id": "technical",
        "title": "Teknik bağlantı verileri ve güvenlik",
        "paragraphs": [
            "Siteyi ve harici içerikleri yüklerken IP adresi, tarayıcı bilgisi, istek zamanı ve ziyaret edilen adres gibi teknik veriler barındırma ve ilgili hizmet sağlayıcıları tarafından işlenebilir. “Tarif et” aramasında aşırı kullanımı sınırlamak için IP adresi sunucu belleğinde kullanılır; bu kontrol üyelik profiline bağlanmaz. Ürün istatistikleri için belirtilen IP kaydetmeme kuralı, hizmet sağlayıcıların teknik bağlantı kayıtlarının hiç oluşmadığı anlamına gelmez.",
            "Siteyle iletişim HTTPS üzerinden sağlanır. Bulut listeleri herkese açık tutulmaz ve erişim sunucuda doğrulanan hesaba göre sınırlandırılır. Teknik destek veya silme talebini yerine getirmek için gerekli kayıtlara yalnızca hizmetin yetkili yöneticileri erişir. Hizmet sağlayıcıların teknik kayıt ve yedeklerinin saklanması kendi koşullarına bağlıdır."
        ]
    },
    {
        "id": "providers",
        "title": "Bilgileri işleyen hizmetler",
        "paragraphs": [
            "Google / Firebase Authentication: Google girişi, hesap kimliği ve oturumun yönetimi; Google'dan gelen temel profil bilgileri burada tutulur. Barındırma: site ve veritabanı, kiraladığımız bir sanal sunucuda (VDS) açık kaynak Supabase yazılımıyla kendimiz tarafından çalıştırılır; hesaba bağlı özel film listesi, tercihler ve ürün kullanım istatistikleri burada tutulur, sunucu sağlayıcısı teknik bağlantı verilerini işleyebilir. Bu hizmetler, ilgili işlevleri sağlayabilmek için kendilerine ulaşan verileri işler.",
            "OpenAI: “Tarif et” metni ve ondan türetilen arama içeriği. TMDB: film bilgileri, gerekirse film adı araması ve doğrudan yüklenen afişler. JustWatch (TMDB üzerinden): Türkiye'deki yayın platformu bilgileri. YouTube: fragman açıldığında youtube-nocookie.com üzerinden video yüklenmesi. Bu içeriklerle bağlantı kurulduğunda ilgili sağlayıcı teknik bağlantı bilgilerini işleyebilir.",
            "Google AdSense: sitede reklam kodu yüklenir; Google kendi reklam hizmeti kapsamında çerezler ve benzeri teknolojiler kullanabilir. Uygulamamız Google giriş profilini veya bulut film listeni reklam kişiselleştirmesi için AdSense'e göndermez. Ürün istatistikleri için uyguladığımız Do Not Track / Global Privacy Control tercihi, bütün üçüncü taraf hizmetlerin işlemlerini otomatik olarak durdurmaz. Bu hizmetlerin kendi gizlilik açıklamaları da geçerlidir."
        ]
    },
    {
        "id": "retention",
        "title": "Hesap ve liste verilerinin saklanması",
        "paragraphs": [
            "Firebase üyelik kaydı ve temel profil bilgileri hesabın var olduğu sürece saklanır. Bulut listendeki film kayıtları, ilgili filmi kaldırana veya liste/hesap silme talebin doğrulanıp yerine getirilene kadar tutulur. Hareketsiz hesaplar ve listeler için şu anda otomatik süreli silme uygulanmaz. Tarayıcı kopyalarının ve ürün istatistiklerinin süreleri yukarıda ayrıca belirtilmiştir."
        ]
    },
    {
        "id": "deletion",
        "title": "Verilerine erişim ve silme talebi",
        "paragraphs": [
            "Kaydettiğin filmleri “Kaydettiklerim” sayfasından görüntüleyebilir ve tek tek kaldırabilirsin. Bağlantı kesikken yaptığın kaldırma işlemi buluta ulaşana kadar cihazında bekler. Hesabındaki ad ve e-posta adresini “Hesabım” sayfasında görebilirsin.",
            "Hesabının, bulut film listesinin veya her ikisinin silinmesini ya da verilerin hakkında bilgi verilmesini admin@filminibul.com adresine yazarak isteyebilirsin. Talebin hangi hesaba ait olduğunu belirlemek için hesabında kullandığın e-posta adresinden yazmanı ve hesabı mı, listeyi mi yoksa ikisini de mi silmek istediğini belirtmeni rica ederiz. Hesap sahipliği doğrulandıktan sonra talebin yetkili yönetici tarafından işleme alınır; şifreni veya giriş kodlarını istemeyiz.",
            "Hesap ve liste birlikte silindiğinde Firebase üyelik kaydı ve hesaba bağlı aktif Supabase film kayıtları kaldırılır. Sadece listenin silinmesini istersen giriş hesabın korunur. Silme talebinin sonucunu sana bildiririz. Kendi cihazlarındaki yerel kopyaları ayrıca site verilerini temizleyerek kaldırabilirsin. Hesapla ilişkilendirilmeyen günlük istatistik özetleri, hesabın silinmesiyle belirli bir kullanıcıya göre ayrıştırılamaz.",
            "Google hesabındaki üçüncü taraf bağlantılarından Filminibul'un Google giriş bağlantısını kaldırabilirsin. Bu işlem Filminibul'da daha önce saklanan üyelik veya film listesi verilerini tek başına silmez; bunların silinmesi için yukarıdaki talep yolunu kullanabilirsin. Çıkış yapmak da hesap silme işlemi değildir."
        ]
    },
    {
        "id": "contact",
        "title": "İletişim ve güncellemeler",
        "paragraphs": [
            "Gizlilik soruları, hesap/veri silme ve verilerine erişim talepleri için iletişim adresimiz admin@filminibul.com'dur. Bu adresle yürütülen yazışmalardaki bilgiler yalnızca talebini değerlendirmek ve yanıtlamak için kullanılır. Politikamız hizmetin çalışma şekli değiştiğinde güncellenir; son güncelleme tarihi bu sayfada gösterilir."
        ]
    }
];

const policyLinks = [
    ["Google gizlilik politikası", "https://policies.google.com/privacy"],
    ["OpenAI gizlilik politikası", "https://openai.com/policies/privacy-policy/"],
];

export default function PrivacyPolicy() {
    return <>
        <SiteHeader />
        <main className="page-width py-10 sm:py-16">
            <article className="mx-auto max-w-2xl">
                <h1 className="font-display text-3xl text-ink sm:text-4xl"><T text="Gizlilik Politikası" /></h1>
                <p className="mt-3 text-xs text-muted"><T text="Son güncelleme: 21 Ekim 2026" /></p>
                <a href="mailto:admin@filminibul.com" className="mt-4 inline-flex min-h-11 items-center break-all text-sm text-accent-ink underline underline-offset-4">admin@filminibul.com</a>
                <div className="mt-8 space-y-8">
                    {sections.map(section => <section key={section.id} id={section.id} className="scroll-mt-6" aria-labelledby={`${section.id}-heading`}>
                        <h2 id={`${section.id}-heading`} className="mb-3 text-xl font-semibold text-ink"><T text={section.title} /></h2>
                        <div className="space-y-3 text-sm leading-7 text-ink/80">
                            {section.paragraphs.map(text => <p key={text}><T text={text} /></p>)}
                        </div>
                        {section.id === "google-data" && <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm text-accent-ink underline underline-offset-4"><T text="Google kullanıcı verileri politikası" /></a>}
                        {section.id === "providers" && <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-accent-ink">{policyLinks.map(([label, href]) => <li key={href}><a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-4"><T text={label} /></a></li>)}</ul>}
                        {section.id === "deletion" && <a href="https://myaccount.google.com/connections" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm text-accent-ink underline underline-offset-4"><T text="Google hesabındaki üçüncü taraf bağlantıları" /></a>}
                        {section.id === "contact" && <a href="mailto:admin@filminibul.com" className="mt-3 inline-flex min-h-11 items-center text-sm text-accent-ink underline underline-offset-4"><T text="Gizlilik sorusu veya silme talebi gönder" /></a>}
                    </section>)}
                </div>
                <a href="/" className="mt-10 inline-flex min-h-11 items-center text-sm text-accent-ink underline underline-offset-4"><T text="← Ana Sayfaya Dön" /></a>
            </article>
        </main>
        <Footer />
    </>;
}
