import React, { useState } from 'react';
import { Dumbbell, Eye } from 'lucide-react';

interface ExerciseThumbnailProps {
  exercise?: {
    id?: string;
    rawId?: string;
    name: string;
    muscle?: string;
  };
  rawId?: string;
  exerciseName?: string;
  muscle?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  allowZoom?: boolean;
  showTapToEnlarge?: boolean;
}

export const getExerciseImageUrl = (item: { id?: string; rawId?: string }) => {
  const raw = item.rawId || (item.id && item.id.startsWith('og_') ? item.id.replace('og_', '') : null);
  if (!raw) return null;
  return `https://raw.githubusercontent.com/DuarteSantos8/openGym/main/catalogue/media/still/${raw}.webp`;
};

export const ExerciseThumbnail: React.FC<ExerciseThumbnailProps> = ({
  exercise,
  rawId,
  exerciseName,
  muscle,
  size = 'md',
  className = '',
  onClick,
  allowZoom = false,
  showTapToEnlarge = false
}) => {
  const [imageError, setImageError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const effectiveRawId = rawId || exercise?.rawId || (exercise?.id && exercise.id.startsWith('og_') ? exercise.id.replace('og_', '') : undefined);
  const effectiveName = exerciseName || exercise?.name || 'Exercise';
  const shouldAllowZoom = allowZoom || showTapToEnlarge;

  const imageUrl = effectiveRawId
    ? `https://raw.githubusercontent.com/DuarteSantos8/openGym/main/catalogue/media/still/${effectiveRawId}.webp`
    : exercise
    ? getExerciseImageUrl(exercise)
    : null;

  const sizeClasses = {
    sm: 'w-10 h-10 min-w-10 rounded-xl',
    md: 'w-12 h-12 min-w-12 rounded-xl',
    lg: 'w-20 h-20 min-w-20 rounded-2xl'
  }[size];

  const handleContainerClick = (e: React.MouseEvent) => {
    if (shouldAllowZoom && !imageError && imageUrl) {
      e.stopPropagation();
      setIsZoomed(true);
    } else if (onClick) {
      onClick(e);
    }
  };

  return (
    <>
      <div
        onClick={handleContainerClick}
        className={`relative bg-[#09090b] border border-[#27272a] overflow-hidden flex items-center justify-center shrink-0 ${sizeClasses} ${
          shouldAllowZoom && imageUrl && !imageError ? 'cursor-pointer group hover:border-emerald-500/50' : ''
        } ${className}`}
        title={shouldAllowZoom ? 'Click to inspect exercise picture' : effectiveName}
      >
        {imageUrl && !imageError ? (
          <>
            <img
              src={imageUrl}
              alt={effectiveName}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-full h-full object-contain p-1 rounded-xl transition duration-150 group-hover:scale-105"
            />
            {shouldAllowZoom && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Eye className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 bg-zinc-900/60 p-1">
            <Dumbbell className="w-4 h-4 text-zinc-500 stroke-[1.75]" />
          </div>
        )}
      </div>

      {/* Zoom Picture Modal */}
      {isZoomed && imageUrl && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomed(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 max-w-xs w-full text-center shadow-2xl relative"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#27272a]">
              <span className="text-xs font-bold text-white truncate max-w-[200px]">
                {effectiveName}
              </span>
              <button
                onClick={() => setIsZoomed(false)}
                className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded bg-zinc-800"
              >
                Close
              </button>
            </div>

            <div className="bg-[#09090b] rounded-xl p-3 border border-[#27272a] mb-2 flex items-center justify-center min-h-[190px]">
              <img
                src={imageUrl}
                alt={effectiveName}
                loading="eager"
                referrerPolicy="no-referrer"
                className="w-44 h-44 object-contain rounded-lg"
              />
            </div>

            <p className="text-[11px] text-zinc-400 font-mono">
              Still illustration · Zero animation/video overhead
            </p>
          </div>
        </div>
      )}
    </>
  );
};
