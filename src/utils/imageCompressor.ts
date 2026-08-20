const SUPPORTED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function toWebp(file: File, options?: { maxDimension?: number; quality?: number; maxBytes?: number }) {
  const maxDimension = options?.maxDimension ?? 1600;
  const quality = options?.quality ?? 0.8;
  const maxBytes = options?.maxBytes ?? 5 * 1024 * 1024;
  if (!SUPPORTED.has(file.type) || file.size === 0 || file.size > maxBytes) {
    throw new Error('Yalnız JPEG, PNG veya WebP ve en fazla 5 MB dosya yüklenebilir.');
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Fotoğraf işlenemedi.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
  if (!blob) throw new Error('Fotoğraf WebP formatına dönüştürülemedi.');
  return new File([blob], `${crypto.randomUUID()}.webp`, { type: 'image/webp' });
}
