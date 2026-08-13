/**
 * Compress an uploaded image file on the client using HTML5 Canvas
 * Ensures image resolution and size are optimized for client-side storage
 */
export function compressImageFile(
  file: File, 
  maxWidth = 1280, 
  maxHeight = 1280, 
  quality = 0.75,
  maxFileSizeBytes = 5 * 1024 * 1024 // 5 MB Limit
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > maxFileSizeBytes) {
      reject(new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed limit of 5MB.`));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file format.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context.'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Output compressed JPEG Data URL
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
