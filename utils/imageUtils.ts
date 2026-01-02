import { Region } from '../types';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = error => reject(error);
  });
};

export const compositeImages = (
  originalUrl: string,
  processedUrl: string,
  region: Region
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const original = new Image();
    const processed = new Image();
    
    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) {
        process();
      }
    };

    original.onload = checkLoaded;
    original.onerror = () => reject(new Error("Failed to load original image"));
    processed.onload = checkLoaded;
    processed.onerror = () => reject(new Error("Failed to load processed image"));

    original.src = originalUrl;
    processed.src = processedUrl;

    const process = () => {
      const canvas = document.createElement('canvas');
      canvas.width = original.width;
      canvas.height = original.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // 1. Draw original image fully
      ctx.drawImage(original, 0, 0);

      // 2. Calculate destination rect on ORIGINAL
      const destX = original.width * (region.x / 100);
      const destY = original.height * (region.y / 100);
      const destW = original.width * (region.width / 100);
      const destH = original.height * (region.height / 100);

      // 3. Calculate source rect on PROCESSED (handling AI resolution changes)
      const srcX = processed.width * (region.x / 100);
      const srcY = processed.height * (region.y / 100);
      const srcW = processed.width * (region.width / 100);
      const srcH = processed.height * (region.height / 100);

      // 4. Composite
      // We clip the drawing to the region to ensure clean edges if necessary, 
      // but drawImage handles rects fine.
      ctx.drawImage(
        processed, 
        srcX, srcY, srcW, srcH, 
        destX, destY, destW, destH
      );

      // 5. Return result
      resolve(canvas.toDataURL('image/png'));
    };
  });
};
