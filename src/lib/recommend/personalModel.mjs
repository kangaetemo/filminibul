// Saved means interest, not a watched/liked rating. Keep inference reproducible.
export const MAX_PERSONAL_SEEDS = 8;

export function selectPersonalSeeds(rows, orderedIds, limit = MAX_PERSONAL_SEEDS, likedIds = []) {
    const liked = new Set(likedIds);
    const byId = new Map(rows.map(row => [row.movie_id, row]));
    const remaining = [...new Set(orderedIds)].map(id => byId.get(id)).filter(Boolean);
    const chosen = [], genres = new Set(), collections = new Set(), directors = new Set();
    while (remaining.length && chosen.length < limit) {
        // Recent saves break ties; breadth prevents one franchise dominating.
        let best = 0, bestValue = -Infinity;
        remaining.forEach((row, index) => {
            const freshGenres = (row.genres || []).filter(g => !genres.has(g.id)).length;
            const value = (liked.has(row.movie_id) ? 2 : 0) + freshGenres * 2 - (row.collection_id != null && collections.has(row.collection_id) ? 4 : 0)
                - (row.director && directors.has(row.director) ? 1 : 0) - index / (remaining.length + 1);
            if (value > bestValue) { best = index; bestValue = value; }
        });
        const [row] = remaining.splice(best, 1); chosen.push(row);
        for (const g of row.genres || []) genres.add(g.id);
        if (row.collection_id != null) collections.add(row.collection_id);
        if (row.director) directors.add(row.director);
    }
    return chosen;
}

export function rankPersonalCandidates(pools, savedIds, limit = 20, likedIds = []) {
    const liked = new Set(likedIds);
    const excluded = new Set(savedIds), merged = new Map();
    for (const { seed, ranked } of pools) {
        for (const [rank, scored] of ranked.filter(scored => !excluded.has(scored.film.movie_id)).slice(0, 60).entries()) {
            const id = scored.film.movie_id;
            if (excluded.has(id)) continue;
            let entry = merged.get(id);
            if (!entry) { entry = { film: scored.film, sources: [] }; merged.set(id, entry); }
            if (!entry.sources.some(source => source.seed.movie_id === seed.movie_id)) {
                entry.sources.push({ seed, scored, strength: (liked.has(seed.movie_id) ? 1.15 : 1) / (1 + rank / 10) });
            }
        }
    }
    const candidates = [...merged.values()].map(entry => {
        entry.sources.sort((a, b) => b.strength - a.strength || a.seed.movie_id - b.seed.movie_id);
        // Agreement helps, but weak overlap cannot swamp a strong single interest.
        entry.score = entry.sources[0].strength + Math.min(0.2, entry.sources.slice(1).reduce((sum, s) => sum + s.strength * 0.12, 0));
        return entry;
    }).sort((a, b) => b.score - a.score || a.film.movie_id - b.film.movie_id);
    const top = [], directors = new Map(), collections = new Map();
    for (const entry of candidates) {
        const { director, collection_id: collection } = entry.film;
        if (director && (directors.get(director) || 0) >= 3) continue;
        if (collection != null && (collections.get(collection) || 0) >= 2) continue;
        top.push(entry);
        if (director) directors.set(director, (directors.get(director) || 0) + 1);
        if (collection != null) collections.set(collection, (collections.get(collection) || 0) + 1);
        if (top.length >= limit) break;
    }
    return top;
}
