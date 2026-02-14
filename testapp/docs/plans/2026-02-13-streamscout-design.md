# StreamScout - What to Watch Tonight

**Date:** 2026-02-13
**Type:** Web Application - Data Enrichment
**Status:** Approved Design

## Overview

StreamScout is a web application that solves the "where can I watch this?" problem by combining data from multiple free APIs to show movies and TV shows with their streaming availability and aggregated ratings in one view.

## Problem Statement

Users face fragmentation when researching what to watch:
- Movie databases show titles but not where to stream them
- Streaming services don't show aggregated ratings
- Rating sites don't show streaming availability
- Users end up opening 3+ browser tabs to get complete information

StreamScout enriches movie/TV data by combining these sources into a single, actionable view.

## API Sources

### TMDB API (The Movie Database)
- **Usage:** Movie/TV search, details, posters, trailers
- **Free Tier:** 3,000 requests/day
- **Endpoint:** `https://api.themoviedb.org/3/`

### Streaming Availability API
- **Usage:** Which streaming services have each title
- **Free Tier:** 100 requests/day (RapidAPI alternative: 500/month)
- **Returns:** Service names + deep links

### OMDb API (Open Movie Database)
- **Usage:** IMDb ratings, Rotten Tomatoes scores
- **Free Tier:** 1,000 requests/day
- **Endpoint:** `http://www.omdbapi.com/`

## Architecture

### Tech Stack
- **Frontend:** Next.js (React framework)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel (free tier)
- **No Database:** Real-time API aggregation with in-memory caching

### Architecture Pattern
```
User Browser → Next.js Frontend → Next.js API Routes → External APIs
                    ↑__________________________|
                    (Returns enriched data)
```

**Why Next.js?**
API routes allow us to proxy third-party APIs (keeping keys secure) without a separate backend. Single codebase, simple deployment.

## Components

### SearchBar
- Auto-complete search for movies/TV shows
- Debounced search (avoid excessive API calls)
- Separate tabs for Movies vs TV Shows
- Shows suggestions as user types

### StreamingCard
- Movie/show poster image
- Title, year, genre tags
- Aggregate rating (IMDb + RT combined)
- Streaming service logos
- Click to expand full details

### DetailModal
- Full synopsis, cast, runtime
- All available streaming options with direct links
- Rating breakdown (IMDb, Rotten Tomatoes, Metacritic)
- Embedded trailer from TMDB
- Similar titles section

### FilterPanel
- Filter by streaming service
- Filter by minimum rating
- Sort options: rating, release date, title

## Data Flow

### Search Flow
1. User types query in SearchBar
2. Frontend calls `/api/search?query={query}&type={movie|tv}`
3. API route calls TMDB search endpoint
4. Returns list of matches with basic info
5. Frontend displays results in grid

### Enrichment Flow
1. User clicks on a search result
2. Frontend calls `/api/enrich?tmdbId={id}&type={movie|tv}`
3. API route makes 3 parallel calls:
   - TMDB: Full details + trailer
   - Streaming Availability: Where to watch
   - OMDb: IMDb/RT ratings
4. API route combines responses into enriched object:
```json
{
  "title": "Inception",
  "poster": "https://...",
  "rating": {
    "imdb": 8.8,
    "rottenTomatoes": 87,
    "combined": 8.75
  },
  "streamingOptions": [
    { "service": "Netflix", "link": "https://..." },
    { "service": "Hulu", "link": "https://..." }
  ],
  "details": { "synopsis": "...", "cast": [...], "runtime": 148 }
}
```
5. Frontend displays enriched DetailModal

## Error Handling

### API Failures
- Graceful degradation: if one API fails, show partial data
- Toast notifications for errors
- Fallback to placeholders for missing images

### Rate Limits
- In-memory LRU cache with 5-minute TTL
- Track API usage per session
- Friendly message when daily limit reached
- Prioritize popular searches for limited APIs

### Missing Data
- Handle titles without RT scores (show only IMDb)
- Show "Not currently streaming" when no options available
- Null-safe rendering throughout

## User Experience

### Homepage
- Hero section with prominent search bar
- Trending movies/shows from TMDB
- Quick filter pills: "On Netflix", "Highly Rated", "New Releases"

### Search Results
- Responsive grid (1/3/4 columns based on screen size)
- Skeleton loaders during fetch
- Infinite scroll or "Load More" button

### Detail View
- Modal overlay (preserves search context)
- Prominent "Watch Now" buttons per service
- Collapsible sections for Cast, Reviews, Similar Titles

### Mobile-First Design
- Touch-friendly tap targets
- Swipeable modals
- Optimized images, lazy loading

## Testing Strategy

### Unit Tests
- API data transformation functions
- Rating aggregation logic
- Filter/sort utilities

### Integration Tests
- Mock API responses
- Test enrichment flow
- Error handling scenarios for each API

### E2E Tests (Playwright)
- Complete search flow
- Modal interactions
- Filter functionality
- Mobile responsiveness

### Manual Testing
- Various title types (popular, obscure, old, new)
- Verify streaming links work
- Rate limit behavior

## Implementation Phases

### Phase 1: MVP
- Basic search (TMDB only)
- Display results grid with posters
- Simple detail view

### Phase 2: Enrichment
- Integrate Streaming Availability API
- Add OMDb ratings
- Combine data in detail modal

### Phase 3: Polish
- Add filters and sorting
- Implement caching layer
- Error handling improvements
- Mobile optimization

### Phase 4: Nice-to-Haves
- User preferences for favorite services
- Watchlist (localStorage)
- Share functionality
- Dark mode toggle

## File Structure

```
/streamscout
├── app/
│   ├── page.tsx              # Homepage
│   ├── layout.tsx            # Root layout
│   └── api/
│       ├── search/
│       │   └── route.ts      # Search endpoint
│       └── enrich/
│           └── route.ts      # Enrichment endpoint
├── components/
│   ├── SearchBar.tsx
│   ├── StreamingCard.tsx
│   ├── DetailModal.tsx
│   └── FilterPanel.tsx
├── lib/
│   ├── tmdb.ts               # TMDB API client
│   ├── streaming.ts          # Streaming API client
│   ├── omdb.ts               # OMDb API client
│   ├── cache.ts              # Caching utility
│   └── types.ts              # TypeScript types
├── .env.local                # API keys (gitignored)
├── .gitignore
├── package.json
└── README.md
```

## Success Criteria

- User can search for any movie/TV show
- Results show streaming availability within 2 seconds
- Aggregated ratings visible at a glance
- Works seamlessly on mobile devices
- Handles API failures gracefully
- Free tier API limits sufficient for demo usage

## Future Enhancements

- User accounts with watchlist sync
- Price comparison (rent/buy options)
- Notification when title becomes available on user's services
- Integration with more streaming services
- Personalized recommendations based on watch history
