import { NextRequest, NextResponse } from "next/server";
import { Index } from "@upstash/vector";

// Upstash Vector client
const index = new Index({
    url: process.env.UPSTASH_VECTOR_REST_URL!,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

// Film metadata tipi
interface FilmMetadata {
    id: number;
    baslik: string;
    yil: number;
    ozet: string;
}

// Request body tipi
interface RecommendationRequest {
    likedIds: number[];
}

export async function POST(request: NextRequest) {
    try {
        // Request body'yi parse et
        const body: RecommendationRequest = await request.json();
        const { likedIds } = body;

        // Validasyon
        if (!likedIds || !Array.isArray(likedIds) || likedIds.length === 0) {
            return NextResponse.json(
                { error: "likedIds dizisi gerekli" },
                { status: 400 }
            );
        }

        // Son beğenilen filmin ID'sini al
        const lastLikedId = likedIds[likedIds.length - 1];

        // Upstash'ten son beğenilen filmin vektörünü çek
        const lastLikedMovie = await index.fetch([lastLikedId.toString()], {
            includeMetadata: true,
            includeVectors: true,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const movieData = lastLikedMovie as any[];

        if (!movieData || movieData.length === 0 || !movieData[0]?.vector) {
            return NextResponse.json(
                { error: "Son beğenilen film bulunamadı" },
                { status: 404 }
            );
        }

        // Benzer filmleri query et (15 tane, beğenilenleri filtrelemek için fazla çekiyoruz)
        const queryResult = await index.query({
            vector: movieData[0].vector as number[],
            topK: 15,
            includeMetadata: true,
        });

        // Beğenilen filmleri set'e çevir (hızlı lookup için)
        const likedIdsSet = new Set(likedIds.map(id => id.toString()));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = queryResult as any[];

        // Beğenilenleri filtrele ve ilk 10'u al
        const recommendations = results
            .filter(result => !likedIdsSet.has(String(result.id)))
            .slice(0, 10)
            .map(result => ({
                id: Number(result.id),
                baslik: result.metadata?.baslik || "Bilinmiyor",
                yil: result.metadata?.yil || 0,
                ozet: result.metadata?.ozet || "",
                score: result.score || 0,
            }));

        return NextResponse.json({
            recommendations,
            basedOn: {
                id: lastLikedId,
                baslik: movieData[0].metadata?.baslik || "Bilinmiyor",
            },
        });

    } catch (error) {
        console.error("Öneri API hatası:", error);
        return NextResponse.json(
            { error: "Sunucu hatası" },
            { status: 500 }
        );
    }
}
