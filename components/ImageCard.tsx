import React, { useState } from 'react';
import { ProcessedImage } from '../types';

interface ImageCardProps {
  image: ProcessedImage;
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
  onEdit: (image: ProcessedImage) => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ image, onRemove, onDownload, onEdit }) => {
  const [showOriginal, setShowOriginal] = useState(false);

  // Use the image's specific region
  const region = image.region;

  // Calculate overlay style based on x/y/w/h
  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${region.x}%`,
    top: `${region.y}%`,
    width: `${region.width}%`,
    height: `${region.height}%`,
    border: '2px dashed rgba(239, 68, 68, 0.8)', // Red dashed line
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    pointerEvents: 'none',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all hover:shadow-md">
      <div 
        className="relative aspect-square bg-slate-100 group cursor-pointer overflow-hidden"
        onClick={() => onEdit(image)}
      >
        {image.status === 'processing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-20 backdrop-blur-[1px]">
             <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
                <span className="text-xs font-medium text-indigo-700 bg-white/80 px-2 py-1 rounded-full">Processing...</span>
             </div>
          </div>
        )}
        
        {image.status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-20">
            <div className="text-center p-4">
              <p className="text-red-500 font-medium text-sm mb-1">Failed</p>
              <p className="text-red-400 text-xs">{image.error || 'Unknown error'}</p>
            </div>
          </div>
        )}

        {/* Hover Overlay for Edit */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 z-10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
             <div className="bg-white/90 rounded-full p-2 shadow-lg backdrop-blur-sm transform scale-90 group-hover:scale-100 transition-transform">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
             </div>
        </div>

        <div className="w-full h-full relative">
            {image.finalUrl ? (
                // If processed, show Toggle view
                <div 
                    className="w-full h-full relative"
                    onMouseEnter={() => setShowOriginal(true)}
                    onMouseLeave={() => setShowOriginal(false)}
                >
                    <img 
                        src={showOriginal ? image.originalUrl : image.finalUrl} 
                        alt="Result" 
                        className="w-full h-full object-contain"
                    />
                    {/* Label */}
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none z-10">
                        {showOriginal ? 'ORIGINAL' : 'CLEANED'}
                    </div>
                    {/* Show region overlay only when showing original */}
                    {showOriginal && <div style={overlayStyle} />}
                </div>
            ) : (
                // If not processed yet, show original with overlay guide
                <div className="w-full h-full relative">
                    <img src={image.originalUrl} alt="Original" className="w-full h-full object-contain" />
                    <div style={overlayStyle} />
                     <div className="absolute top-2 left-2 bg-slate-200/80 text-slate-600 text-[10px] px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none z-10">
                        PENDING
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="p-3 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div className="truncate text-xs text-slate-500 font-medium max-w-[120px]" title={image.file.name}>
          {image.file.name}
        </div>
        <div className="flex gap-2">
            {image.status === 'completed' && (
                <button 
                    onClick={() => onDownload(image.id)}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                    title="Download"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </button>
            )}
            <button 
                onClick={() => onRemove(image.id)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                title="Remove"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCard;
