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
