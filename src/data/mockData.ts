export interface Movie {
    id: number;
    title: string;
    posterUrl: string;
    overview: string;
    rating: number;
    releaseYear: number;
    genres: string[];
}

export const mockMovies: Movie[] = [
    {
        id: 1,
        title: "Inception",
        posterUrl: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Ber.jpg",
        overview: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O., but his tragic past may doom the project and his team to disaster.",
        rating: 8.8,
        releaseYear: 2010,
        genres: ["Action", "Sci-Fi", "Thriller"]
    },
    {
        id: 2,
        title: "The Matrix",
        posterUrl: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
        overview: "When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth--the life he knows is the elaborate deception of an evil cyber-intelligence.",
        rating: 8.7,
        releaseYear: 1999,
        genres: ["Action", "Sci-Fi"]
    },
    {
        id: 3,
        title: "Interstellar",
        posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
        overview: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival. As they traverse the vast distances of space, they must grapple with the relative nature of time.",
        rating: 8.6,
        releaseYear: 2014,
        genres: ["Adventure", "Drama", "Sci-Fi"]
    },
    {
        id: 4,
        title: "The Dark Knight",
        posterUrl: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
        overview: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
        rating: 9.0,
        releaseYear: 2008,
        genres: ["Action", "Crime", "Drama"]
    },
    {
        id: 5,
        title: "Pulp Fiction",
        posterUrl: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
        overview: "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
        rating: 8.9,
        releaseYear: 1994,
        genres: ["Crime", "Drama"]
    }
];
