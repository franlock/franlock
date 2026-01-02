import React, { useState, useRef } from 'react';
import { ProcessedImage, Region } from './types';
import { removeWatermark } from './services/geminiService';
import { fileToBase64, compositeImages } from './utils/imageUtils';
import ImageCard from './components/ImageCard';
import Settings from './components/Settings';
import EditModal from './components/EditModal';

function App() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  // Default region: Bottom Right 20% x 15%
  // x = 100 - 20 = 80, y = 100 - 15 = 85
  const [defaultRegion, setDefaultRegion] = useState<Region>({ x: 80, y: 85, width: 20, height: 15 });
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    
    const newImages: ProcessedImage[] = Array.from(fileList).map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      originalUrl: URL.createObjectURL(file),
      processedUrl: null,
      finalUrl: null,
      status: 'idle',
      region: { ...defaultRegion } // Copy current defaults
    }));

    setImages(prev => [...prev, ...newImages]);
  };

  const processImage = async (id: string, customRegion?: Region) => {
     let currentImg = images.find(img => img.id === id);
     if (!currentImg) return;

     if (customRegion) {
        setImages(prev => prev.map(p => p.id === id ? { ...p, region: customRegion, status: 'processing', error: undefined } : p));
        currentImg = { ...currentImg, region: customRegion }; 
     } else {
        setImages(prev => prev.map(p => p.id === id ? { ...p, status: 'processing', error: undefined } : p));
     }

     try {
        const base64 = await fileToBase64(currentImg.file);
        
        let processedBase64 = currentImg.processedUrl;
        
        // Always call API if region changed significantly or if never processed?
        // Optimization: If we just moved the box, we technically might need to re-generate if the AI hallucinated based on the previous box context?
        // However, we are sending the FULL image to Gemini. So processedUrl (the full clean image) *should* be reusable if the AI did a good job globally.
        // BUT, Gemini 2.5 Flash Image might optimize based on the prompt. If the prompt was "remove watermark", it probably removed it everywhere.
        // Let's assume we can reuse processedUrl if it exists.
        
        if (!processedBase64) {
             processedBase64 = await removeWatermark(base64, currentImg.file.type);
        }
        
        const regionToUse = customRegion || currentImg.region;
        const finalDataUrl = await compositeImages(currentImg.originalUrl, processedBase64!, regionToUse);

        setImages(prev => prev.map(p => p.id === id ? { 
            ...p, 
            status: 'completed', 
            processedUrl: processedBase64,
            finalUrl: finalDataUrl,
            region: regionToUse
        } : p));

     } catch (err: any) {
        setImages(prev => prev.map(p => p.id === id ? { ...p, status: 'error', error: err.message || "Processing failed" } : p));
     }
  };

  const processAll = async () => {
    setIsProcessing(true);
    const pendingImages = images.filter(i => i.status === 'idle' || i.status === 'error');
    const BATCH_SIZE = 3;
    for (let i = 0; i < pendingImages.length; i += BATCH_SIZE) {
        const batch = pendingImages.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(img => processImage(img.id)));
    }
    setIsProcessing(false);
  };

  const removeImage = (id: string) => {
    setImages(prev => {
        const target = prev.find(p => p.id === id);
        if (target) {
            URL.revokeObjectURL(target.originalUrl);
        }
        return prev.filter(p => p.id !== id);
    });
    if (selectedImageId === id) setSelectedImageId(null);
  };

  const downloadImage = (id: string) => {
    const img = images.find(i => i.id === id);
    if (img && img.finalUrl) {
        const link = document.createElement('a');
        link.href = img.finalUrl;
        link.download = `clean-${img.file.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  const downloadAll = () => {
      images.forEach(img => {
          if (img.status === 'completed') downloadImage(img.id);
      });
  };

  const selectedImage = images.find(i => i.id === selectedImageId);

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-600 rounded-lg p-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                </div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">Watermark Eraser <span className="text-slate-400 font-normal ml-1">AI</span></h1>
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
                >
                    + Add Images
                </button>
                <button 
                    onClick={processAll}
                    disabled={isProcessing || images.every(i => i.status === 'completed')}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isProcessing ? 'Processing...' : 'Process All'}
                </button>
            </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Settings region={defaultRegion} setRegion={setDefaultRegion} />

        {images.length === 0 && (
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer group"
            >
                <div className="w-16 h-16 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">Upload images to begin</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto">Drop your nano-banana files here. We support JPG, PNG and WebP.</p>
            </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map(img => (
                <ImageCard 
                    key={img.id} 
                    image={img} 
                    onRemove={removeImage} 
                    onDownload={downloadImage}
                    onEdit={() => setSelectedImageId(img.id)}
                />
            ))}
        </div>

        <input 
            type="file" 
            multiple 
            accept="image/*" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={(e) => handleFiles(e.target.files)} 
        />

        {images.some(i => i.status === 'completed') && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 flex justify-center z-20">
                <button 
                    onClick={downloadAll}
                    className="bg-slate-900 text-white px-6 py-3 rounded-full font-medium shadow-lg shadow-slate-300 hover:bg-slate-800 hover:scale-105 transition-all flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Completed ({images.filter(i => i.status === 'completed').length})
                </button>
            </div>
        )}

      </main>

      {selectedImage && (
        <EditModal 
            image={selectedImage}
            onClose={() => setSelectedImageId(null)}
            onProcess={processImage}
        />
      )}
    </div>
  );
}

export default App;
