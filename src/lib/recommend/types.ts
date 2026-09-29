// Supabase film_embeddings_v3 satırı (embedding hariç) — similar_movies_v3 RPC'sinin döndürdüğü alanlar
export interface FilmRow {
    movie_id: number;
    title: string;
    original_title: string | null;
    tr_title: string | null;
    overview: string | null;
    tr_overview: string | null;
    year: number | null;
    genres: { id: number; name: string }[] | null;
    keywords: string[] | null;
    rating: number | null;
    vote_count: number | null;
    popularity: number | null;
    language: string | null;
    countries: string[] | null;
    poster_path: string | null;
    backdrop_path: string | null;
    director: string | null;
    cast_names: string[] | null;
    collection_id: number | null;
    collection_name: string | null;
}

export interface Candidate extends FilmRow {
    similarity: number;
}

// UI'a giden film: Türkçe varsa Türkçe, yoksa İngilizce/orijinal
export interface FilmDTO {
    id: number;
    title: string;
    originalTitle: string | null;
    overview: string | null;
    year: number | null;
    genres: string[];
    rating: number | null;
    voteCount: number | null;
    posterUrl: string | null;
    backdropUrl: string | null;
    director: string | null;
    cast: string[];
    collectionName: string | null;
    inCatalog: boolean;
}

export interface SimilarFilmDTO {
    film: FilmDTO;
    // Tek satırlık özet ("Yönetmen: … · Temalar: …")
    reason: string;
    // Aynı bilgi satır satır, önem sırasıyla (kartlarda ilk 2'si gösterilir)
    reasons: string[];
    score: number;
    // Sadece ?debug=1 ile
    debug?: {
        similarity: number;
        weighted: Record<string, number>;
        penalties: Record<string, number | undefined>;
    };
}
