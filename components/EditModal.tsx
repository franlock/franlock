import React, { useState, useEffect, useRef } from 'react';
import { ProcessedImage, Region } from '../types';

interface EditModalProps {
  image: ProcessedImage;
  onClose: () => void;
  onProcess: (id: string, newRegion: Region) => void;
}

const EditModal: React.FC<EditModalProps> = ({ image, onClose, onProcess }) => {
  const [region, setRegion] = useState<Region>(image.region);
  const [showOriginal, setShowOriginal] = useState(false);
  const [mode, setMode] = useState<'box' | 'brush'>('box');
  const [isAdjusting, setIsAdjusting] = useState(image.status !== 'completed');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Dragging state
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const startRegion = useRef<Region>({ x: 0, y: 0, width: 0, height: 0 });
  const activeHandle = useRef<string | null>(null);

  // Brush state
  const isPainting = useRef(false);

  useEffect(() => {
    setRegion(image.region);
    setIsAdjusting(image.status !== 'completed');
    if (image.status === 'completed') setMode('box'); // Default to box view for completed
  }, [image]);

  useEffect(() => {
    // Setup canvas when entering brush mode
    if (mode === 'brush' && canvasRef.current && imgRef.current) {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        canvas.width = img.clientWidth;
        canvas.height = img.clientHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Optional: Draw current box as starting hint? No, clean slate is better for "Manual Smear"
        }
    }
  }, [mode]);

  // --- Box Logic ---

  const getClientCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, handle: string | null) => {
    if (mode !== 'box') return;
    e.preventDefault();
    e.stopPropagation();
    
    isDragging.current = true;
    activeHandle.current = handle;
    const coords = getClientCoordinates(e);
    dragStart.current = coords;
    startRegion.current = { ...region };
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging.current || mode !== 'box') return;
    
    const coords = getClientCoordinates(e);
    const deltaXPx = coords.x - dragStart.current.x;
    const deltaYPx = coords.y - dragStart.current.y;

    if (!containerRef.current) return;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;

    // Convert pixel delta to percentage delta
    const deltaX = (deltaXPx / containerW) * 100;
    const deltaY = (deltaYPx / containerH) * 100;

    let newRegion = { ...startRegion.current };

    if (activeHandle.current === 'move') {
        newRegion.x = Math.max(0, Math.min(100 - newRegion.width, newRegion.x + deltaX));
        newRegion.y = Math.max(0, Math.min(100 - newRegion.height, newRegion.y + deltaY));
    } else if (activeHandle.current === 'se') {
        newRegion.width = Math.max(5, Math.min(100 - newRegion.x, newRegion.width + deltaX));
        newRegion.height = Math.max(5, Math.min(100 - newRegion.y, newRegion.height + deltaY));
    } else if (activeHandle.current === 'sw') {
        // Change x and width
        const maxX = startRegion.current.x + startRegion.current.width - 5; 
        const attemptedX = Math.max(0, Math.min(maxX, startRegion.current.x + deltaX));
        const diff = startRegion.current.x - attemptedX;
        newRegion.x = attemptedX;
        newRegion.width = startRegion.current.width + diff;
        newRegion.height = Math.max(5, Math.min(100 - newRegion.y, newRegion.height + deltaY));
    } else if (activeHandle.current === 'nw') {
         // Change x, y, width, height
        const maxX = startRegion.current.x + startRegion.current.width - 5;
        const maxY = startRegion.current.y + startRegion.current.height - 5;
        
        const attemptedX = Math.max(0, Math.min(maxX, startRegion.current.x + deltaX));
        const attemptedY = Math.max(0, Math.min(maxY, startRegion.current.y + deltaY));

        const diffX = startRegion.current.x - attemptedX;
        const diffY = startRegion.current.y - attemptedY;

        newRegion.x = attemptedX;
        newRegion.y = attemptedY;
        newRegion.width = startRegion.current.width + diffX;
        newRegion.height = startRegion.current.height + diffY;
    } else if (activeHandle.current === 'ne') {
        // Change y, width, height
        const maxY = startRegion.current.y + startRegion.current.height - 5;
        const attemptedY = Math.max(0, Math.min(maxY, startRegion.current.y + deltaY));
        const diffY = startRegion.current.y - attemptedY;
        
        newRegion.y = attemptedY;
        newRegion.height = startRegion.current.height + diffY;
        newRegion.width = Math.max(5, Math.min(100 - newRegion.x, newRegion.width + deltaX));
    }

    setRegion(newRegion);
  };

  const handleDragEnd = () => {
    isDragging.current = false;
    activeHandle.current = null;
  };

  // --- Brush Logic ---
  
  const handlePaintStart = (e: React.MouseEvent | React.TouchEvent) => {
      if (mode !== 'brush' || !canvasRef.current) return;
      isPainting.current = true;
      const coords = getRelativeCoords(e);
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
          ctx.beginPath();
          ctx.moveTo(coords.x, coords.y);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'; // Red semi-transparent
          ctx.lineWidth = 20;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
      }
  };

  const handlePaintMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isPainting.current || mode !== 'brush' || !canvasRef.current) return;
      e.preventDefault(); // Prevent scroll on touch
      const coords = getRelativeCoords(e);
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
          ctx.lineTo(coords.x, coords.y);
          ctx.stroke();
      }
  };

  const handlePaintEnd = () => {
      if (!isPainting.current) return;
      isPainting.current = false;
      calculateBoxFromCanvas();
  };

  const getRelativeCoords = (e: React.MouseEvent | React.TouchEvent) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      return {
          x: clientX - rect.left,
          y: clientY - rect.top
      };
  };

  const calculateBoxFromCanvas = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      // Get image data
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      let minX = w, minY = h, maxX = 0, maxY = 0;
      let found = false;

      for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
              const alpha = data[(y * w + x) * 4 + 3];
              if (alpha > 0) {
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                  found = true;
              }
          }
      }

      if (found) {
          // Add padding
          const padding = 10;
          minX = Math.max(0, minX - padding);
          minY = Math.max(0, minY - padding);
          maxX = Math.min(w, maxX + padding);
          maxY = Math.min(h, maxY + padding);

          const newRegion: Region = {
              x: (minX / w) * 100,
              y: (minY / h) * 100,
              width: ((maxX - minX) / w) * 100,
              height: ((maxY - minY) / h) * 100
          };
          setRegion(newRegion);
          // Wait a moment then switch back to box mode to show result
          setTimeout(() => setMode('box'), 200);
      }
  };

  // --- Render Helpers ---

  const handleProcess = () => {
    onProcess(image.id, region);
    onClose(); 
  };

  const isCompleted = image.status === 'completed';
  const showResult = isCompleted && !isAdjusting && !showOriginal;

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
        onMouseMove={handleDragMove}
        onTouchMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onTouchEnd={handleDragEnd}
    >
      <div className="relative w-full max-w-5xl h-[90vh] flex flex-col bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700">
            <h3 className="text-white font-medium truncate max-w-md">{image.file.name}</h3>
            <div className="flex gap-2">
                 {/* Mode Toggles */}
                 {(isAdjusting || !isCompleted) && (
                     <div className="flex bg-slate-700 rounded-lg p-1 mr-4">
                        <button 
                            onClick={() => setMode('box')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'box' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
                        >
                            Select Box
                        </button>
                        <button 
                             onClick={() => setMode('brush')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'brush' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
                        >
                            Manual Brush
                        </button>
                     </div>
                 )}

                <button 
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 relative bg-black flex items-center justify-center p-4 overflow-hidden select-none">
             {/* Image Container */}
             <div 
                ref={containerRef} 
                className="relative inline-block max-w-full max-h-full"
             >
                <img 
                    ref={imgRef}
                    src={showResult ? image.finalUrl! : image.originalUrl} 
                    alt="Preview" 
                    className="max-w-full max-h-[calc(80vh-100px)] object-contain rounded-sm select-none pointer-events-none" 
                    // pointer-events-none ensures drag events go to overlay/canvas
                />

                {/* Box Editor Overlay */}
                {mode === 'box' && (isAdjusting || !isCompleted) && (
                    <div 
                        className="absolute cursor-move group"
                        style={{
                            left: `${region.x}%`,
                            top: `${region.y}%`,
                            width: `${region.width}%`,
                            height: `${region.height}%`,
                            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                        }}
                        onMouseDown={(e) => handleDragStart(e, 'move')}
                        onTouchStart={(e) => handleDragStart(e, 'move')}
                    >
                        {/* Border */}
                        <div className="absolute inset-0 border-2 border-indigo-500 bg-indigo-500/10 pointer-events-none"></div>
                        
                        {/* Size Label */}
                        <div className="absolute -top-7 left-0 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono shadow-sm">
                            {Math.round(region.width)}% x {Math.round(region.height)}%
                        </div>

                        {/* Handles */}
                        <div className="absolute top-0 left-0 w-4 h-4 -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-indigo-500 rounded-full cursor-nw-resize hover:scale-125 transition-transform"
                             onMouseDown={(e) => handleDragStart(e, 'nw')} onTouchStart={(e) => handleDragStart(e, 'nw')} />
                        <div className="absolute top-0 right-0 w-4 h-4 translate-x-1/2 -translate-y-1/2 bg-white border-2 border-indigo-500 rounded-full cursor-ne-resize hover:scale-125 transition-transform"
                             onMouseDown={(e) => handleDragStart(e, 'ne')} onTouchStart={(e) => handleDragStart(e, 'ne')} />
                        <div className="absolute bottom-0 left-0 w-4 h-4 -translate-x-1/2 translate-y-1/2 bg-white border-2 border-indigo-500 rounded-full cursor-sw-resize hover:scale-125 transition-transform"
                             onMouseDown={(e) => handleDragStart(e, 'sw')} onTouchStart={(e) => handleDragStart(e, 'sw')} />
                        <div className="absolute bottom-0 right-0 w-4 h-4 translate-x-1/2 translate-y-1/2 bg-white border-2 border-indigo-500 rounded-full cursor-se-resize hover:scale-125 transition-transform"
                             onMouseDown={(e) => handleDragStart(e, 'se')} onTouchStart={(e) => handleDragStart(e, 'se')} />
                    </div>
                )}

                {/* Brush Canvas Overlay */}
                {mode === 'brush' && (
                    <canvas 
                        ref={canvasRef}
                        className="absolute inset-0 z-20 cursor-crosshair touch-none"
                        onMouseDown={handlePaintStart}
                        onMouseMove={handlePaintMove}
                        onMouseUp={handlePaintEnd}
                        onMouseLeave={handlePaintEnd}
                        onTouchStart={handlePaintStart}
                        onTouchMove={handlePaintMove}
                        onTouchEnd={handlePaintEnd}
                    />
                )}

                {/* Compare Tooltip (Only when viewing result) */}
                {isCompleted && !isAdjusting && (
                     <div 
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium border border-white/20 select-none cursor-pointer hover:bg-white/20 active:scale-95 transition-all z-10"
                        onMouseDown={() => setShowOriginal(true)}
                        onMouseUp={() => setShowOriginal(false)}
                        onMouseLeave={() => setShowOriginal(false)}
                        onTouchStart={() => setShowOriginal(true)}
                        onTouchEnd={() => setShowOriginal(false)}
                     >
                        Hold to Compare
                     </div>
                )}
             </div>
        </div>

        {/* Footer Controls */}
        <div className="bg-slate-800 border-t border-slate-700 p-6">
            
            {/* Action Buttons */}
            {(isAdjusting || !isCompleted) ? (
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 max-w-4xl mx-auto w-full">
                    <div className="text-slate-400 text-sm">
                        {mode === 'box' ? 
                            "Drag the box to position. Drag corners to resize." : 
                            "Paint over the watermark. The AI box will automatically adjust."}
                    </div>
                    
                    <div className="flex gap-3 pt-2 md:pt-0">
                         {isCompleted && (
                            <button 
                                onClick={() => setIsAdjusting(false)}
                                className="px-6 py-2.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                         )}
                         <button 
                            onClick={handleProcess}
                            className="px-8 py-2.5 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/30 transition-all hover:scale-105 active:scale-95"
                         >
                            {isCompleted ? 'Reprocess Image' : 'Process Image'}
                         </button>
                    </div>
                </div>
            ) : (
                /* Completed State Controls */
                <div className="flex items-center justify-between max-w-3xl mx-auto w-full">
                     <div className="flex gap-4">
                        <button 
                            onClick={() => { setIsAdjusting(true); setMode('box'); }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white bg-slate-700 hover:bg-slate-600 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                            Adjust Region
                        </button>
                     </div>
                     <div className="flex gap-3">
                         <a 
                            href={image.finalUrl!}
                            download={`clean-${image.file.name}`}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-slate-900 bg-white hover:bg-indigo-50 transition-colors shadow-lg"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                         </a>
                     </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default EditModal;
