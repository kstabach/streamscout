# StreamScout

A web application that enriches movie data by combining multiple APIs (TMDB, Streaming Availability, OMDb) to show where to watch movies with aggregated ratings.

## Features

- 🔍 Search for movies and TV shows
- 🎬 See where content is available to stream
- ⭐ Aggregated ratings from IMDb and Rotten Tomatoes
- 📺 Watch trailers directly
- 📱 Responsive mobile-first design

## Tech Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **APIs:** TMDB, Streaming Availability (RapidAPI), OMDb
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+ installed
- API keys from:
  - [TMDB](https://www.themoviedb.org/settings/api)
  - [OMDb](http://www.omdbapi.com/apikey.aspx)
  - [Streaming Availability](https://rapidapi.com/movie-of-the-night-movie-of-the-night-default/api/streaming-availability) (RapidAPI)

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd streamscout
```

2. Install dependencies
```bash
npm install
```

3. Create `.env.local` file with your API keys
```bash
TMDB_API_KEY=your_tmdb_key
OMDB_API_KEY=your_omdb_key
STREAMING_API_KEY=your_rapidapi_key
```

4. Run development server
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
streamscout/
├── app/
│   ├── api/              # API routes
│   │   ├── search/       # Movie search endpoint
│   │   └── enrich/       # Data enrichment endpoint
│   ├── page.tsx          # Main page
│   └── layout.tsx        # Root layout
├── components/
│   ├── SearchBar.tsx     # Search input component
│   ├── MovieCard.tsx     # Movie result card
│   └── DetailModal.tsx   # Movie details modal
├── lib/
│   ├── types.ts          # TypeScript types
│   ├── cache.ts          # Caching utility
│   ├── tmdb.ts           # TMDB API client
│   ├── omdb.ts           # OMDb API client
│   ├── streaming.ts      # Streaming API client
│   └── utils.ts          # Utility functions
└── public/               # Static assets
```

## API Endpoints

### GET /api/search
Search for movies by title.

**Query Params:**
- `query` - Search query string

**Response:**
```json
{
  "results": [
    {
      "id": 27205,
      "title": "Inception",
      "year": "2010",
      "poster": "https://...",
      "rating": 8.8
    }
  ]
}
```

### GET /api/enrich
Get enriched movie details.

**Query Params:**
- `id` - TMDB movie ID

**Response:**
```json
{
  "id": 27205,
  "title": "Inception",
  "year": "2010",
  "poster": "https://...",
  "overview": "...",
  "rating": {
    "imdb": 8.8,
    "rottenTomatoes": 87,
    "combined": 8.75
  },
  "streamingOptions": [
    {
      "service": "Netflix",
      "type": "subscription",
      "link": "https://..."
    }
  ],
  "runtime": 148,
  "genres": ["Action", "Sci-Fi"],
  "trailerKey": "YoHD9XEInc0"
}
```

## Deployment

Deploy to Vercel:

```bash
npm install -g vercel
vercel
```

Add environment variables in Vercel dashboard.

## License

MIT
