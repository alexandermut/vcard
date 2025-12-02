/**
 * Resizes an image file to a maximum dimension while maintaining aspect ratio.
 * Returns a Promise resolving to a Base64 string (data URL).
 */
export const resizeImage = (file: File, maxDimension: number = 1024, quality: number = 0.8): Promise<string> => {
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
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
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
          if (blob) resolve(blob);
          else reject(new Error("Canvas to Blob failed"));
        }, 'image/jpeg', 0.9);
      };
      backImg.onerror = reject;
      backImg.src = backBase64;
    };
    frontImg.onerror = reject;
    frontImg.src = frontBase64;
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