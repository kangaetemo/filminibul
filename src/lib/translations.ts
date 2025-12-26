export type Language = "tr" | "en";

export const translations = {
    tr: {
        // Header
        "app.name": "filminibul",
        "app.tagline": "Bir sonraki favorini keşfet",
        "header.watchlist": "İzleme Listesi",
        "header.stats": "İstatistikler",
        "header.newSearch": "Yeni Arama",
        "header.signIn": "Giriş Yap",
        "header.signOut": "Çıkış Yap",

        // Landing Screen
        "landing.title": "Hangi filmi beğendin?",
        "landing.placeholder": "örn: Başlangıç, Matrix...",
        "landing.search": "Ara",
        "landing.or": "veya",
        "landing.surpriseMe": "Şansımı Dene!",
        "landing.hiddenGems": "Gizli hazineleri keşfet (IMDB 7+)",
        "landing.welcome": "Tekrar hoş geldin",

        // Card Stack
        "cards.basedOn": "filmini sevdiğine göre",
        "cards.allDone": "Hepsi Bitti!",
        "cards.seenAll": "Tüm önerileri gördün",
        "cards.findMore": "Daha Fazla Film Bul",
        "cards.searchAgain": "Tekrar Ara",
        "cards.swipeHint": "Beğenmek için sağa kaydır • Detaylar için dokun",

        // Swipe Labels
        "swipe.like": "BEĞENDİM",
        "swipe.nope": "GEÇ",

        // Watchlist
        "watchlist.title": "İzleme Listem",
        "watchlist.count": "film kaydedildi",
        "watchlist.empty": "Henüz film yok",
        "watchlist.emptyHint": "Beğendiğin filmleri sağa kaydırarak izleme listene ekle",
        "watchlist.clear": "Listeyi Temizle",
        "watchlist.findSimilar": "Benzerleri Bul",
        "watchlist.hoverHint": "Benzer filmleri bulmak için ✨ simgesine tıkla",

        // Movie Details
        "movie.rating": "Puan",
        "movie.year": "Yıl",
        "movie.overview": "Özet",
        "movie.streamIn": "Türkiye'de İzle",
        "movie.notStreaming": "Türkiye'de yayın yok",
        "movie.loading": "Yükleniyor...",
        "movie.tapToFlip": "Geri çevirmek için dokun",

        // Stats
        "stats.title": "İstatistiklerim",
        "stats.likedGenres": "En Beğenilen Türler",
        "stats.passedGenres": "Geçilen Türler",
        "stats.totalLiked": "Beğenilen",
        "stats.totalPassed": "Geçilen",
        "stats.noData": "Henüz veri yok",
        "stats.startSwiping": "Film kaydırmaya başla!",

        // Ads
        "ad.placeholder": "Reklam Alanı",

        // General
        "general.loading": "Yükleniyor...",
        "general.error": "Bir hata oluştu",
    },
    en: {
        // Header
        "app.name": "filminibul",
        "app.tagline": "Discover your next favorite",
        "header.watchlist": "Watchlist",
        "header.stats": "Stats",
        "header.newSearch": "New Search",
        "header.signIn": "Sign In",
        "header.signOut": "Sign Out",

        // Landing Screen
        "landing.title": "Which movie did you like?",
        "landing.placeholder": "e.g., Inception, The Matrix...",
        "landing.search": "Search",
        "landing.or": "or",
        "landing.surpriseMe": "Surprise Me!",
        "landing.hiddenGems": "Discover hidden gems (IMDB 7+)",
        "landing.welcome": "Welcome back",

        // Card Stack
        "cards.basedOn": "Based on your love for",
        "cards.allDone": "All Done!",
        "cards.seenAll": "You've seen all recommendations",
        "cards.findMore": "Find More Movies",
        "cards.searchAgain": "Search Again",
        "cards.swipeHint": "Swipe right to add to watchlist • Tap card to see details",

        // Swipe Labels
        "swipe.like": "LIKE",
        "swipe.nope": "NOPE",

        // Watchlist
        "watchlist.title": "My Watchlist",
        "watchlist.count": "movies saved",
        "watchlist.empty": "No movies yet",
        "watchlist.emptyHint": "Swipe right on movies you like to add them to your watchlist",
        "watchlist.clear": "Clear Watchlist",
        "watchlist.findSimilar": "Find Similar",
        "watchlist.hoverHint": "Hover a movie and click ✨ to find similar",

        // Movie Details
        "movie.rating": "Rating",
        "movie.year": "Year",
        "movie.overview": "Overview",
        "movie.streamIn": "Stream in Turkey",
        "movie.notStreaming": "Not streaming in Turkey",
        "movie.loading": "Loading...",
        "movie.tapToFlip": "Tap to flip back",

        // Stats
        "stats.title": "My Stats",
        "stats.likedGenres": "Most Liked Genres",
        "stats.passedGenres": "Passed Genres",
        "stats.totalLiked": "Liked",
        "stats.totalPassed": "Passed",
        "stats.noData": "No data yet",
        "stats.startSwiping": "Start swiping movies!",

        // Ads
        "ad.placeholder": "Advertisement",

        // General
        "general.loading": "Loading...",
        "general.error": "An error occurred",
    },
} as const;

export type TranslationKey = keyof typeof translations.en;
