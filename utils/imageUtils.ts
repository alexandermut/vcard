import imageCompression from 'browser-image-compression';

/**
 * Resizes and compresses an image file using professional compression.
 * Uses browser-image-compression for superior quality/size ratio.
 * Returns a Promise resolving to a Base64 string (data URL).
 */
export const resizeImage = async (
  file: File,
  maxDimension: number = 800,  // Reduced from 1024 for batch operations
  quality: number = 0.7         // Not used with compression lib, but kept for compatibility
): Promise<string> => {
  try {
    // Use professional compression library with WebWorker support
    const options = {
      maxSizeMB: 0.3,              // Max 300KB per image - 70% reduction!
      maxWidthOrHeight: maxDimension,
      useWebWorker: true,          // Offload to worker - no UI freeze
      fileType: 'image/jpeg' as const,
      initialQuality: 0.7
    };

    const compressed = await imageCompression(file, options);
    const dataUrl = await imageCompression.getDataUrlFromFile(compressed);

    return dataUrl;
  } catch (error) {
    console.error('Image compression failed, falling back to manual method:', error);

    // Fallback to old method if compression library fails
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Convert to JPEG Base64
          const dataUrl = canvas.toDataURL('image/jpeg', quality);

          // Cleanup
          canvas.width = 0;
          canvas.height = 0;
          img.src = '';

          resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);

      // Timeout
      setTimeout(() => reject(new Error("Image resize timed out")), 10000);
    });
  }
};

/**
 * Combines two Base64 images vertically into one Blob (JPEG).
 * Useful for exporting front/back scans as a single file.
 */
export const combineImages = (frontBase64: string, backBase64: string | undefined | null): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const frontImg = new Image();

    frontImg.onload = () => {
      if (!backBase64) {
        // Only front image
        fetch(frontBase64).then(res => res.blob()).then(resolve).catch(reject);
        return;
      }

      const backImg = new Image();
      backImg.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        // Determine dimensions (max width wins)
        const width = Math.max(frontImg.width, backImg.width);
        const height = frontImg.height + backImg.height + 20; // 20px spacing

        canvas.width = width;
        canvas.height = height;

        // Fill white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Draw Front (Centered horizontally)
        const frontX = (width - frontImg.width) / 2;
        ctx.drawImage(frontImg, frontX, 0);

        // Draw Back (Centered horizontally)
        const backX = (width - backImg.width) / 2;
        ctx.drawImage(backImg, backX, frontImg.height + 20);

        canvas.toBlob((blob) => {
          // Cleanup
          canvas.width = 0;
          canvas.height = 0;
          frontImg.src = '';
          backImg.src = '';

          if (blob) resolve(blob);
          else reject(new Error("Canvas to Blob failed"));
        }, 'image/jpeg', 0.9);
      };
      backImg.onerror = reject;
      backImg.src = backBase64;
    };
    frontImg.onerror = reject;
    frontImg.src = frontBase64;
    // Timeout
    setTimeout(() => reject(new Error("Image combination timed out")), 10000);
  });
};

/**
 * Converts a Base64 string to a Blob.
 */
export const base64ToBlob = (base64: string): Blob => {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }


  return new Blob([uInt8Array], { type: contentType });
};

/**
 * Converts a Blob to a Base64 string.
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};