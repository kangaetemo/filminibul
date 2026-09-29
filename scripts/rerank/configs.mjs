// Değerlendirmede karşılaştırılan reranker konfigürasyonları (eval.mjs ve llm_judge.mjs ortak kullanır).

import { DEFAULT_CONFIG } from "./reranker.mjs";

export const withWeights = (weights, extra = {}) => ({
    ...DEFAULT_CONFIG,
    ...extra,
    weights: { ...DEFAULT_CONFIG.weights, ...weights },
});

const ZERO = { semantic: 0, keyword: 0, genre: 0, director: 0, cast: 0, year: 0, language: 0, quality: 0, tmdbRec: 0, collection: 0 };

// LLM eval (gpt-4.1, 50 seed, v3) 1. tur: saf semantic 0.80 nDCG, tüm ağır reranker'lar 0.77–0.78.
// Keyword kanalının eklediği adaylar ort. 0.95 puan; yönetmen sınırı auteur'leri (Wes Anderson) kesiyor;
// genre/quality/tmdbRec popüler-genel filmlere kaydırıyor. Aşağıdaki "light" ailesi bunu test eder.
export const CONFIGS = {
    // Önceki varsayılan: ağır hybrid (karşılaştırma için)
    heavy: withWeights(
        { semantic: 0.4, keyword: 0.25, genre: 0.12, director: 0.06, cast: 0.04, year: 0.03, language: 0.03, quality: 0.07, tmdbRec: 0.12, collection: 0.1 },
        { keywordChannel: true, diversity: { maxPerDirector: 5, maxPerCollection: 4 } }
    ),
    // Şu anki varsayılan (= lightNoRec)
    full: DEFAULT_CONFIG,
    // Saf semantic + sadece cezalar (yetişkin içerik, tür uyumsuzluğu, az oy) — cezaların tek başına etkisi
    semPen: withWeights({ ...ZERO, semantic: 1 }, { keywordChannel: false, diversity: { maxPerDirector: 10, maxPerCollection: 4 } }),
    // Semantic ana sinyal, diğerleri küçük düzeltme
    light: withWeights(
        { ...ZERO, semantic: 0.75, keyword: 0.05, genre: 0.04, director: 0.03, quality: 0.04, collection: 0.08, tmdbRec: 0.06 },
        { keywordChannel: false, recGate: true, diversity: { maxPerDirector: 10, maxPerCollection: 4 } }
    ),
    // light, TMDB bonusu yok (TMDB'nin katkısını ayırmak için)
    lightNoRec: withWeights(
        { ...ZERO, semantic: 0.75, keyword: 0.05, genre: 0.04, director: 0.03, quality: 0.04, collection: 0.08 },
        { keywordChannel: false, diversity: { maxPerDirector: 10, maxPerCollection: 4 } }
    ),
    // light, kalite ağırlığı daha yüksek (az bilinen/zayıf filmleri biraz daha bastırır)
    lightQ: withWeights(
        { ...ZERO, semantic: 0.7, keyword: 0.05, genre: 0.04, director: 0.03, quality: 0.1, collection: 0.08, tmdbRec: 0.06 },
        { keywordChannel: false, recGate: true, diversity: { maxPerDirector: 10, maxPerCollection: 4 } }
    ),
};
