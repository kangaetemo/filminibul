import { notFound } from "next/navigation";
import HomeView, { homeMetadata } from "@/app/_home/HomeView";
import { HERO_FRAMES } from "@/lib/heroFrames";

// Ana sayfanın kare başına bir kopyası. Ziyaretçi bu adresi görmez: "/" middleware'de rastgele bir kareye
// yönlendirilir (src/middleware.ts), doğrudan gelen istek "/" adresine döner. Her kopya derlemede üretilir ve
// saatte bir tazelenir; veritabanı yükü kare sayısıyla değil önbellekle sınırlıdır (okumalar 1 gün önbellekte).
export const revalidate = 3600;
export const dynamicParams = false;
export const metadata = homeMetadata;

export function generateStaticParams() {
    return HERO_FRAMES.map((_, i) => ({ kare: String(i) }));
}

export default function HomeFramePage({ params }: { params: { kare: string } }) {
    const index = Number(params.kare);
    if (!Number.isInteger(index) || !HERO_FRAMES[index]) notFound();
    return <HomeView initial={index} />;
}
