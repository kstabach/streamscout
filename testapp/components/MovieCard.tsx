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
