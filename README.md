# Filminibul 🎬

A Tinder-style movie discovery app built with Next.js 14. Swipe through personalized recommendations and build your watchlist.

![Filminibul Demo](https://github.com/user-attachments/assets/preview.png)

## Features

- 🔍 **Search-based Discovery** - Find movies by name, get 20 similar recommendations
- ✨ **Surprise Me** - Discover hidden gems with IMDB 7+ ratings
- 👆 **Swipe Interface** - Drag cards left (pass) or right (like)
- 📋 **Watchlist** - Saved movies persist in LocalStorage
- 🔄 **More Like This** - Get recommendations from watchlist items
- 🇹🇷 **Turkish Streaming** - Shows Netflix, Prime, Disney+ availability
- 🔐 **Google Sign-In** - Optional Firebase authentication
- 🎨 **Dark Mode** - Premium neon aesthetic

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **API**: TMDB (The Movie Database)
- **Auth**: Firebase (optional)

## Quick Start

```bash
# Clone the repo
git clone https://github.com/yourusername/filminibul.git
cd filminibul

# Install dependencies
npm install

# Add your API keys
cp .env.example .env.local
# Edit .env.local with your TMDB API key

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create a `.env.local` file:

```env
# Required - Get from https://www.themoviedb.org/settings/api
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key

# Optional - Firebase Auth
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/filminibul&env=NEXT_PUBLIC_TMDB_API_KEY)

1. Click the button above or go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Add environment variables in Vercel dashboard
4. Deploy!

## Project Structure

```
src/
├── app/
│   ├── page.tsx        # Main app with state management
│   ├── layout.tsx      # Root layout with AuthProvider
│   └── globals.css     # Dark theme & animations
├── components/
│   ├── LandingScreen   # Search input & Surprise Me
│   ├── CardStack       # Swipe stack manager
│   ├── SwipeCard       # Individual movie card
│   ├── Watchlist       # Slide-out watchlist panel
│   └── PageTransition  # Smooth horizontal slides
├── contexts/
│   └── AuthContext     # Firebase auth state
├── hooks/
│   └── useWatchlist    # LocalStorage persistence
└── lib/
    ├── tmdb.ts         # TMDB API service
    └── firebase.ts     # Firebase configuration
```

## License

MIT
