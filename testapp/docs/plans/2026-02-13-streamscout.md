# StreamScout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web app that enriches movie/TV data by combining TMDB, Streaming Availability, and OMDb APIs into a unified search experience.

**Architecture:** Next.js app with API routes that proxy external APIs, client-side React components for UI, in-memory caching to respect rate limits, no database required.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, TMDB API, Streaming Availability API, OMDb API

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `tailwind.config.ts`
- Create: `.env.local`
- Create: `.gitignore`

**Step 1: Initialize Next.js project**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

When prompted:
- Use TypeScript? Yes
- Use ESLint? Yes
- Use Tailwind CSS? Yes
- Use App Router? Yes
- Customize default import alias? No

Expected: Project scaffolding created

**Step 2: Create .env.local for API keys**

Create `.env.local`:
```bash
# TMDB API Key (get from https://www.themoviedb.org/settings/api)
TMDB_API_KEY=your_tmdb_key_here

# OMDb API Key (get from http://www.omdbapi.com/apikey.aspx)
OMDB_API_KEY=your_omdb_key_here

# Streaming Availability API Key (get from RapidAPI)
STREAMING_API_KEY=your_streaming_key_here
```

**Step 3: Update .gitignore**

Add to `.gitignore`:
```
# Environment variables
.env*.local

# Next.js
.next/
out/

# Dependencies
node_modules/

# Debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS files
.DS_Store
```

**Step 4: Install dependencies**

Run:
```bash
npm install
```

Expected: Dependencies installed successfully

**Step 5: Verify dev server works**

Run:
```bash
npm run dev
```

Open browser to http://localhost:3000
Expected: Next.js welcome page loads

**Step 6: Commit**

```bash
git add .
git commit -m "feat: initialize Next.js project with TypeScript and Tailwind"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `lib/types.ts`

**Step 1: Create types file**

Create `lib/types.ts`:
```typescript
// TMDB Types
export interface TMDBMovie {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  overview: string;
  vote_average: number;
  genre_ids: number[];
}

export interface TMDBSearchResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

export interface TMDBMovieDetails extends TMDBMovie {
  runtime: number;
  genres: { id: number; name: string }[];
  imdb_id: string;
  videos: {
    results: Array<{
      key: string;
      site: string;
      type: string;
      official: boolean;
    }>;
  };
}

// OMDb Types
export interface OMDbRating {
  Source: string;
  Value: string;
}

export interface OMDbResponse {
  Title: string;
  imdbRating: string;
  Ratings: OMDbRating[];
}

// Streaming Types
export interface StreamingOption {
  service: string;
  type: string;
  link: string;
}

export interface StreamingAvailabilityResponse {
  streamingOptions: {
    [country: string]: Array<{
      service: {
        id: string;
        name: string;
      };
      type: string;
      link: string;
    }>;
  };
}

// Enriched Types (our combined data)
export interface EnrichedMovie {
  id: number;
  title: string;
  year: string;
  poster: string;
  overview: string;
  rating: {
    imdb?: number;
    rottenTomatoes?: number;
    combined?: number;
  };
  streamingOptions: StreamingOption[];
  runtime?: number;
  genres: string[];
  trailerKey?: string;
}

export interface SearchResult {
  id: number;
  title: string;
  year: string;
  poster: string;
  rating?: number;
}
```

**Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add TypeScript types for APIs and enriched data"
```

---

## Task 3: TMDB API Client

**Files:**
- Create: `lib/tmdb.ts`
- Create: `lib/cache.ts`

**Step 1: Create cache utility**

Create `lib/cache.ts`:
```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private ttl = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > this.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const cache = new SimpleCache();
```

**Step 2: Create TMDB client**

Create `lib/tmdb.ts`:
```typescript
import { cache } from './cache';
import type { TMDBSearchResponse, TMDBMovieDetails } from './types';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;

if (!API_KEY) {
  throw new Error('TMDB_API_KEY is not set in environment variables');
}

export async function searchMovies(query: string): Promise<TMDBSearchResponse> {
  const cacheKey = `tmdb:search:${query}`;
  const cached = cache.get<TMDBSearchResponse>(cacheKey);
  if (cached) return cached;

  const url = `${TMDB_BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }

  const data = await response.json();
  cache.set(cacheKey, data);
  return data;
}

export async function getMovieDetails(movieId: number): Promise<TMDBMovieDetails> {
  const cacheKey = `tmdb:movie:${movieId}`;
  const cached = cache.get<TMDBMovieDetails>(cacheKey);
  if (cached) return cached;

  const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${API_KEY}&append_to_response=videos`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }

  const data = await response.json();
  cache.set(cacheKey, data);
  return data;
}

export function getPosterUrl(posterPath: string | null, size: 'w200' | 'w500' = 'w500'): string {
  if (!posterPath) return '/placeholder-poster.jpg';
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}
```

**Step 3: Commit**

```bash
git add lib/cache.ts lib/tmdb.ts
git commit -m "feat: add TMDB API client with caching"
```

---

## Task 4: OMDb API Client

**Files:**
- Create: `lib/omdb.ts`

**Step 1: Create OMDb client**

Create `lib/omdb.ts`:
```typescript
import { cache } from './cache';
import type { OMDbResponse } from './types';

const OMDB_BASE_URL = 'http://www.omdbapi.com/';
const API_KEY = process.env.OMDB_API_KEY;

if (!API_KEY) {
  console.warn('OMDB_API_KEY is not set - ratings will be limited');
}

export async function getOMDbRatings(imdbId: string): Promise<OMDbResponse | null> {
  if (!API_KEY) return null;

  const cacheKey = `omdb:${imdbId}`;
  const cached = cache.get<OMDbResponse>(cacheKey);
  if (cached) return cached;

  const url = `${OMDB_BASE_URL}?apikey=${API_KEY}&i=${imdbId}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.Response === 'False') return null;

    cache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error('OMDb API error:', error);
    return null;
  }
}

export function parseRottenTomatoesScore(ratings: OMDbResponse['Ratings']): number | undefined {
  const rtRating = ratings.find(r => r.Source === 'Rotten Tomatoes');
  if (!rtRating) return undefined;

  const match = rtRating.Value.match(/(\d+)%/);
  return match ? parseInt(match[1], 10) : undefined;
}
```

**Step 2: Commit**

```bash
git add lib/omdb.ts
git commit -m "feat: add OMDb API client for ratings"
```

---

## Task 5: Streaming Availability API Client

**Files:**
- Create: `lib/streaming.ts`

**Step 1: Create streaming availability client**

Create `lib/streaming.ts`:
```typescript
import { cache } from './cache';
import type { StreamingAvailabilityResponse, StreamingOption } from './types';

const STREAMING_BASE_URL = 'https://streaming-availability.p.rapidapi.com';
const API_KEY = process.env.STREAMING_API_KEY;

if (!API_KEY) {
  console.warn('STREAMING_API_KEY is not set - streaming info will be unavailable');
}

export async function getStreamingAvailability(tmdbId: number): Promise<StreamingOption[]> {
  if (!API_KEY) return [];

  const cacheKey = `streaming:${tmdbId}`;
  const cached = cache.get<StreamingOption[]>(cacheKey);
  if (cached) return cached;

  const url = `${STREAMING_BASE_URL}/get?tmdb_id=movie/${tmdbId}&country=us&output_language=en`;

  try {
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com',
      },
    });

    if (!response.ok) {
      console.error('Streaming API error:', response.status);
      return [];
    }

    const data: StreamingAvailabilityResponse = await response.json();

    const options: StreamingOption[] = [];
    const usOptions = data.streamingOptions?.us || [];

    for (const option of usOptions) {
      options.push({
        service: option.service.name,
        type: option.type,
        link: option.link,
      });
    }

    cache.set(cacheKey, options);
    return options;
  } catch (error) {
    console.error('Streaming availability error:', error);
    return [];
  }
}
```

**Step 2: Commit**

```bash
git add lib/streaming.ts
git commit -m "feat: add Streaming Availability API client"
```

---

## Task 6: Search API Route

**Files:**
- Create: `app/api/search/route.ts`

**Step 1: Create search API route**

Create `app/api/search/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { searchMovies, getPosterUrl } from '@/lib/tmdb';
import type { SearchResult } from '@/lib/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const tmdbResponse = await searchMovies(query);

    const results: SearchResult[] = tmdbResponse.results.map(movie => ({
      id: movie.id,
      title: movie.title,
      year: movie.release_date?.split('-')[0] || 'Unknown',
      poster: getPosterUrl(movie.poster_path, 'w200'),
      rating: movie.vote_average,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search movies' },
      { status: 500 }
    );
  }
}
```

**Step 2: Test search endpoint**

Run dev server:
```bash
npm run dev
```

Test endpoint:
```bash
curl "http://localhost:3000/api/search?query=inception"
```

Expected: JSON response with movie results

**Step 3: Commit**

```bash
git add app/api/search/route.ts
git commit -m "feat: add search API route"
```

---

## Task 7: Enrich API Route

**Files:**
- Create: `app/api/enrich/route.ts`

**Step 1: Create enrich API route**

Create `app/api/enrich/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getMovieDetails, getPosterUrl } from '@/lib/tmdb';
import { getOMDbRatings, parseRottenTomatoesScore } from '@/lib/omdb';
import { getStreamingAvailability } from '@/lib/streaming';
import type { EnrichedMovie } from '@/lib/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const movieId = searchParams.get('id');

  if (!movieId) {
    return NextResponse.json(
      { error: 'Movie ID is required' },
      { status: 400 }
    );
  }

  try {
    // Fetch all data in parallel
    const [tmdbData, streamingOptions] = await Promise.all([
      getMovieDetails(parseInt(movieId, 10)),
      getStreamingAvailability(parseInt(movieId, 10)),
    ]);

    // Fetch OMDb ratings if we have IMDb ID
    let omdbData = null;
    if (tmdbData.imdb_id) {
      omdbData = await getOMDbRatings(tmdbData.imdb_id);
    }

    // Find trailer
    const trailer = tmdbData.videos?.results.find(
      v => v.type === 'Trailer' && v.site === 'YouTube' && v.official
    ) || tmdbData.videos?.results.find(
      v => v.type === 'Trailer' && v.site === 'YouTube'
    );

    // Aggregate ratings
    const imdbRating = omdbData?.imdbRating ? parseFloat(omdbData.imdbRating) : undefined;
    const rtRating = omdbData ? parseRottenTomatoesScore(omdbData.Ratings) : undefined;

    let combinedRating: number | undefined;
    if (imdbRating && rtRating) {
      // Convert RT to 10 scale and average
      combinedRating = (imdbRating + (rtRating / 10)) / 2;
    } else if (imdbRating) {
      combinedRating = imdbRating;
    } else if (rtRating) {
      combinedRating = rtRating / 10;
    }

    const enrichedMovie: EnrichedMovie = {
      id: tmdbData.id,
      title: tmdbData.title,
      year: tmdbData.release_date?.split('-')[0] || 'Unknown',
      poster: getPosterUrl(tmdbData.poster_path),
      overview: tmdbData.overview,
      rating: {
        imdb: imdbRating,
        rottenTomatoes: rtRating,
        combined: combinedRating,
      },
      streamingOptions,
      runtime: tmdbData.runtime,
      genres: tmdbData.genres.map(g => g.name),
      trailerKey: trailer?.key,
    };

    return NextResponse.json(enrichedMovie);
  } catch (error) {
    console.error('Enrich error:', error);
    return NextResponse.json(
      { error: 'Failed to enrich movie data' },
      { status: 500 }
    );
  }
}
```

**Step 2: Test enrich endpoint**

Test with a known movie ID (Inception = 27205):
```bash
curl "http://localhost:3000/api/enrich?id=27205"
```

Expected: JSON response with enriched movie data including ratings and streaming options

**Step 3: Commit**

```bash
git add app/api/enrich/route.ts
git commit -m "feat: add enrich API route with parallel data fetching"
```

---

## Task 8: SearchBar Component

**Files:**
- Create: `components/SearchBar.tsx`

**Step 1: Create SearchBar component**

Create `components/SearchBar.tsx`:
```typescript
'use client';

import { useState, useCallback } from 'react';
import { debounce } from '@/lib/utils';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export default function SearchBar({ onSearch, isLoading = false }: SearchBarProps) {
  const [query, setQuery] = useState('');

  // Debounce search to avoid excessive API calls
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      if (value.trim().length >= 2) {
        onSearch(value);
      }
    }, 500),
    [onSearch]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search for movies..."
          className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
          disabled={isLoading}
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Create utils for debounce**

Create `lib/utils.ts`:
```typescript
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
```

**Step 3: Commit**

```bash
git add components/SearchBar.tsx lib/utils.ts
git commit -m "feat: add SearchBar component with debounced input"
```

---

## Task 9: MovieCard Component

**Files:**
- Create: `components/MovieCard.tsx`

**Step 1: Create MovieCard component**

Create `components/MovieCard.tsx`:
```typescript
'use client';

import Image from 'next/image';
import type { SearchResult } from '@/lib/types';

interface MovieCardProps {
  movie: SearchResult;
  onClick: () => void;
}

export default function MovieCard({ movie, onClick }: MovieCardProps) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer group transition-transform hover:scale-105"
    >
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-200 shadow-md">
        <Image
          src={movie.poster}
          alt={movie.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
        />
        {movie.rating && (
          <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-sm font-semibold">
            ⭐ {movie.rating.toFixed(1)}
          </div>
        )}
      </div>
      <div className="mt-2">
        <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-blue-600">
          {movie.title}
        </h3>
        <p className="text-gray-500 text-xs mt-1">{movie.year}</p>
      </div>
    </div>
  );
}
```

**Step 2: Update next.config.js for external images**

Modify `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['image.tmdb.org'],
  },
};

module.exports = nextConfig;
```

**Step 3: Commit**

```bash
git add components/MovieCard.tsx next.config.js
git commit -m "feat: add MovieCard component with poster and rating"
```

---

## Task 10: DetailModal Component

**Files:**
- Create: `components/DetailModal.tsx`

**Step 1: Create DetailModal component**

Create `components/DetailModal.tsx`:
```typescript
'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import type { EnrichedMovie } from '@/lib/types';

interface DetailModalProps {
  movie: EnrichedMovie;
  onClose: () => void;
}

export default function DetailModal({ movie, onClose }: DetailModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          {/* Header with poster */}
          <div className="flex gap-6 p-6 border-b">
            <div className="relative w-48 aspect-[2/3] flex-shrink-0 rounded-lg overflow-hidden">
              <Image
                src={movie.poster}
                alt={movie.title}
                fill
                className="object-cover"
              />
            </div>

            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2">{movie.title}</h2>
              <p className="text-gray-600 mb-4">
                {movie.year} • {movie.runtime} min • {movie.genres.join(', ')}
              </p>

              {/* Ratings */}
              <div className="flex gap-4 mb-4">
                {movie.rating.imdb && (
                  <div className="bg-yellow-100 px-3 py-2 rounded">
                    <div className="text-xs text-gray-600">IMDb</div>
                    <div className="text-xl font-bold">{movie.rating.imdb.toFixed(1)}/10</div>
                  </div>
                )}
                {movie.rating.rottenTomatoes && (
                  <div className="bg-red-100 px-3 py-2 rounded">
                    <div className="text-xs text-gray-600">RT</div>
                    <div className="text-xl font-bold">{movie.rating.rottenTomatoes}%</div>
                  </div>
                )}
                {movie.rating.combined && (
                  <div className="bg-blue-100 px-3 py-2 rounded">
                    <div className="text-xs text-gray-600">Combined</div>
                    <div className="text-xl font-bold">{movie.rating.combined.toFixed(1)}/10</div>
                  </div>
                )}
              </div>

              {/* Streaming Options */}
              {movie.streamingOptions.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Watch Now:</h3>
                  <div className="flex flex-wrap gap-2">
                    {movie.streamingOptions.map((option, idx) => (
                      <a
                        key={idx}
                        href={option.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {option.service} ({option.type})
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {movie.streamingOptions.length === 0 && (
                <p className="text-gray-500 italic">Not currently available on streaming services</p>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Overview */}
          <div className="p-6 border-b">
            <h3 className="font-semibold text-lg mb-2">Overview</h3>
            <p className="text-gray-700">{movie.overview}</p>
          </div>

          {/* Trailer */}
          {movie.trailerKey && (
            <div className="p-6">
              <h3 className="font-semibold text-lg mb-4">Trailer</h3>
              <div className="aspect-video">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${movie.trailerKey}`}
                  title="Movie trailer"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="rounded-lg"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/DetailModal.tsx
git commit -m "feat: add DetailModal with streaming options and trailer"
```

---

## Task 11: Main Page

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`

**Step 1: Update layout**

Modify `app/layout.tsx`:
```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'StreamScout - Find Where to Watch',
  description: 'Search movies and find where to stream them with ratings',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

**Step 2: Create main page**

Modify `app/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import SearchBar from '@/components/SearchBar';
import MovieCard from '@/components/MovieCard';
import DetailModal from '@/components/DetailModal';
import type { SearchResult, EnrichedMovie } from '@/lib/types';

export default function Home() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<EnrichedMovie | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMovieClick = async (movie: SearchResult) => {
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`/api/enrich?id=${movie.id}`);
      const enriched = await response.json();
      setSelectedMovie(enriched);
    } catch (error) {
      console.error('Failed to load movie details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            StreamScout
          </h1>
          <p className="text-gray-600 text-lg">
            Find where to watch any movie with ratings from multiple sources
          </p>
        </div>

        {/* Search */}
        <div className="mb-12">
          <SearchBar onSearch={handleSearch} isLoading={isSearching} />
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {results.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onClick={() => handleMovieClick(movie)}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isSearching && results.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-xl">Search for a movie to get started</p>
          </div>
        )}

        {/* Loading details overlay */}
        {isLoadingDetails && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-700">Loading movie details...</p>
            </div>
          </div>
        )}

        {/* Detail modal */}
        {selectedMovie && (
          <DetailModal
            movie={selectedMovie}
            onClose={() => setSelectedMovie(null)}
          />
        )}
      </div>
    </main>
  );
}
```

**Step 3: Test the full app**

Run:
```bash
npm run dev
```

Open http://localhost:3000 and:
1. Search for "Inception"
2. Click on a result
3. Verify detail modal shows with streaming options and ratings

**Step 4: Commit**

```bash
git add app/page.tsx app/layout.tsx
git commit -m "feat: add main page with search and detail modal"
```

---

## Task 12: Error Handling & Polish

**Files:**
- Modify: `app/page.tsx`
- Create: `public/placeholder-poster.jpg`

**Step 1: Add error state to main page**

Update `app/page.tsx` to add error handling:
```typescript
// Add after other state declarations
const [error, setError] = useState<string | null>(null);

// Update handleSearch
const handleSearch = async (query: string) => {
  setIsSearching(true);
  setError(null);
  try {
    const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Search failed');
    const data = await response.json();
    setResults(data.results || []);
  } catch (error) {
    console.error('Search failed:', error);
    setError('Failed to search movies. Please try again.');
    setResults([]);
  } finally {
    setIsSearching(false);
  }
};

// Add error display after search bar
{error && (
  <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
    {error}
  </div>
)}
```

**Step 2: Add placeholder poster**

Create a simple placeholder or download one:
```bash
# Create a simple gray placeholder
convert -size 300x450 xc:gray -pointsize 30 -draw "text 100,225 'No Poster'" public/placeholder-poster.jpg
```

Or manually add a placeholder image to `public/placeholder-poster.jpg`

**Step 3: Commit**

```bash
git add app/page.tsx public/placeholder-poster.jpg
git commit -m "feat: add error handling and placeholder poster"
```

---

## Task 13: README & Documentation

**Files:**
- Create: `README.md`

**Step 1: Create README**

Create `README.md`:
```markdown
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
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add comprehensive README"
```

---

## Task 14: Production Build & Testing

**Files:**
- None (testing only)

**Step 1: Run production build**

Run:
```bash
npm run build
```

Expected: Build completes without errors

**Step 2: Test production build**

Run:
```bash
npm start
```

Open http://localhost:3000 and verify:
- Search works
- Results display
- Detail modal loads
- Streaming options appear
- Ratings show correctly

**Step 3: Final commit**

```bash
git add .
git commit -m "chore: verify production build"
```

---

## Implementation Complete

The StreamScout app is now complete with:
- ✅ Movie search functionality
- ✅ Data enrichment from 3 APIs
- ✅ Aggregated ratings display
- ✅ Streaming availability
- ✅ Responsive UI
- ✅ Error handling
- ✅ Caching for API efficiency
- ✅ Production-ready build

## Next Steps (Optional Enhancements)

1. Add filtering by streaming service
2. Add sorting options (by rating, year, etc.)
3. Implement user watchlist with localStorage
4. Add dark mode toggle
5. Implement infinite scroll for results
6. Add unit tests with Jest
7. Add E2E tests with Playwright
