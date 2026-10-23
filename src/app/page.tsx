import HomeView, { homeMetadata } from "@/app/_home/HomeView";
import { heroFrameIndex } from "@/lib/heroFrames";

// Normalde "/" middleware'de rastgele bir /ana-sayfa/<n> sayfasına yönlendirilir (src/middleware.ts); bu sayfa
// yalnız o yönlendirme çalışmazsa açılır ve eskisi gibi saatin karesini gösterir.
export const revalidate = 3600;
export const metadata = homeMetadata;

export default function HomePage() {
    return <HomeView initial={heroFrameIndex()} />;
}
