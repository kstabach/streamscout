'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  return createPortal(
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
    </div>,
    document.body
  );
}
