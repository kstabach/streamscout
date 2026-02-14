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
