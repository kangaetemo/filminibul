// Semantic mod tanımları ve kalite tabanı — TEK KAYNAK.
// Kullananlar: scripts/rerank/build_moods.mjs (yerel embedding) ve scripts/catalog/rebuild_static.mjs (haftalık iş, Supabase).

export const LIST_SIZE = 120; // her mod için saklanan film sayısı (sayfa bunun başından rastgele seçer)

// Modların uygulamadaki id'leri src/lib/recommend/moods.ts ile aynı olmalı
export const MOODS = {
    korku: {
        doc: `Genres: Horror
Themes: supernatural, ghost, demon, possession, haunted house, curse, evil spirit, exorcism, creature, slasher, dread, terror, jump scare, nightmare
Story: A terrifying horror film that builds unbearable dread and fear, with frightening supernatural or monstrous threats stalking its victims.`,
        excludeGenres: [16, 10751], // animasyon, aile
    },
    komedi: {
        doc: `Genres: Comedy
Themes: humor, slapstick, comedic misadventures, witty banter, satire, parody, absurd situations, buddy comedy, laugh out loud, feel-good
Story: A hilarious, light-hearted comedy full of funny situations, jokes and absurd misadventures that keeps you laughing.`,
    },
    duygusal: {
        doc: `Genres: Drama
Themes: grief, loss, death of a loved one, terminal illness, tragedy, sacrifice, heartbreak, tearjerker, family bond, farewell, redemption
Story: A deeply moving, emotional tearjerker about love, loss and sacrifice that leaves the audience in tears.`,
    },
    gerilim: {
        doc: `Genres: Thriller, Mystery
Themes: suspense, tension, cat and mouse, stalker, psychological thriller, conspiracy, paranoia, twist, hostage, ticking clock, danger, investigation
Story: A nail-biting, tense thriller full of suspense and danger where every moment keeps you on the edge of your seat.`,
        excludeGenres: [16, 10751],
    },
    macera: {
        doc: `Genres: Adventure, Science Fiction, Fantasy
Themes: epic journey, quest, exploration, space travel, treasure hunt, lost world, heroic adventure, expedition, spectacle, otherworldly creatures
Story: A grand, thrilling adventure that takes its heroes on an epic journey across spectacular, unknown worlds.`,
    },
    romantik: {
        doc: `Genres: Romance
Themes: love, falling in love, love story, romantic relationship, soulmates, first love, couple, chemistry, longing, romantic comedy
Story: A heartfelt romantic love story about two people falling for each other.`,
        excludeGenres: [16],
    },
    dusundurucu: {
        doc: `Genres: Mystery, Science Fiction, Drama
Themes: mind-bending, philosophy, existentialism, identity, memory, reality vs illusion, nonlinear timeline, moral dilemma, puzzle, twist ending, consciousness, time
Story: A thought-provoking, intelligent film that challenges the viewer with deep questions about reality, identity and morality.`,
    },
};

// Mod listeleri için kalite tabanı (çok az bilinen/zayıf filmler moda girmesin)
export const MIN_VOTES = 300;
export const MIN_RATING = 6.3;
export const ADULT = new Set(["softcore", "pink film", "erotic movie", "sexploitation", "roman porno"]);
