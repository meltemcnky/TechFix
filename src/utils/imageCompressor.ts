const SUPPORTED = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
]);

async function imageKind(blob: Blob) {
  const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  if (header.length >= 12 && String.fromCharCode(...header.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...header.slice(8, 12)) === 'WEBP') return 'webp' as const;
  if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff)
    return 'jpeg' as const;
  return null;
}

function encode(canvas: HTMLCanvasElement, type: 'image/webp' | 'image/jpeg', quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function toWebp(
  file: File,
  options?: { maxDimension?: number; quality?: number; maxBytes?: number; maxInputBytes?: number },
) {
  const maxDimension = options?.maxDimension ?? 1600;
  const quality = options?.quality ?? 0.8;
  const maxBytes = options?.maxBytes ?? 5 * 1024 * 1024;
  const maxInputBytes = options?.maxInputBytes ?? 25 * 1024 * 1024;
  if (!SUPPORTED.has(file.type) || file.size === 0 || file.size > maxInputBytes) {
    throw new Error('Yalnız JPEG, PNG, WebP veya HEIC ve en fazla 25 MB dosya yüklenebilir.');
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Bu fotoğraf telefonda işlenemedi. Kamera biçimini JPEG olarak seçip tekrar deneyin.');
  }
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Fotoğraf işlenemedi.');
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // Safari versions without canvas WebP encoding silently return PNG. Check
  // the bytes and fall back to JPEG rather than relabeling PNG data as WebP.
  let blob = await encode(canvas, 'image/webp', quality);
  let kind = blob ? await imageKind(blob) : null;
  if (kind !== 'webp') {
    blob = await encode(canvas, 'image/jpeg', quality);
    kind = blob ? await imageKind(blob) : null;
  }
  if (!blob || !kind) throw new Error('Fotoğraf desteklenen bir formata dönüştürülemedi.');

  if (blob.size > maxBytes) {
    const mime = kind === 'webp' ? 'image/webp' : 'image/jpeg';
    for (const reducedQuality of [0.65, 0.5, 0.35]) {
      const candidate = await encode(canvas, mime, reducedQuality);
      if (candidate && await imageKind(candidate) === kind) {
        blob = candidate;
        if (blob.size <= maxBytes) break;
      }
    }
  }
  if (blob.size === 0 || blob.size > maxBytes)
    throw new Error('Fotoğraf sıkıştırıldıktan sonra 5 MB sınırını aşıyor.');

  const extension = kind === 'webp' ? 'webp' : 'jpg';
  const mime = kind === 'webp' ? 'image/webp' : 'image/jpeg';
  return new File([blob], `${crypto.randomUUID()}.${extension}`, { type: mime });
}
