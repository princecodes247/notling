/**
 * Client-side Media & Image Optimization Utility
 * Automatically compresses, resizes, and converts large uploaded images (JPEG, PNG, WebP)
 * to WebP format before transmitting payloads over the network.
 */

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface OptimizedImageResult {
  file: File;
  dataUrl: string;
  originalSize: number;
  optimizedSize: number;
  savedPercentage: number;
  isOptimized: boolean;
}

const DEFAULT_MAX_WIDTH = 2048;
const DEFAULT_MAX_HEIGHT = 2048;
const DEFAULT_QUALITY = 0.82;

/**
 * Checks if a file is a compressible image (e.g. JPEG, PNG, WebP, BMP).
 * Animated GIFs are preserved to prevent losing animation frames.
 */
export function isCompressibleImage(file: File | { type: string; name: string }): boolean {
  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();

  if (mime === 'image/gif' || name.endsWith('.gif')) {
    return false;
  }

  if (mime === 'image/svg+xml' || name.endsWith('.svg')) {
    return false;
  }

  return (
    mime.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|bmp|tiff)$/i.test(name)
  );
}

/**
 * Optimizes an image File using HTML5 Canvas.
 * Resizes dimensions down to fit within maxWidth / maxHeight,
 * converts format to image/webp at specified quality factor,
 * and returns the optimized File object + Base64 dataUrl.
 */
export async function optimizeImageFile(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  const originalSize = file.size;

  // Skip optimization if not a compressible image or if file is under 80 KB
  if (!isCompressibleImage(file) || file.size < 80 * 1024) {
    const dataUrl = await readFileAsDataURL(file);
    return {
      file,
      dataUrl,
      originalSize,
      optimizedSize: originalSize,
      savedPercentage: 0,
      isOptimized: false,
    };
  }

  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
  const maxHeight = options.maxHeight ?? DEFAULT_MAX_HEIGHT;
  const quality = options.quality ?? DEFAULT_QUALITY;

  try {
    const img = await loadImageFromFile(file);

    let { width, height } = img;

    // Calculate scaled dimensions keeping aspect ratio
    if (width > maxWidth || height > maxHeight) {
      if (width / height > maxWidth / maxHeight) {
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
      throw new Error('Canvas 2D context creation failed');
    }

    // High quality scaling settings
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    // Determine target format (prefer WebP)
    const targetMime = 'image/webp';
    const newFileName = replaceExtension(file.name, '.webp');

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), targetMime, quality);
    });

    if (!blob) {
      throw new Error('Canvas blob export failed');
    }

    // If optimized blob is larger than original (rare, e.g. already compressed tiny webp), fallback to original
    if (blob.size >= originalSize && width === img.width && height === img.height) {
      const dataUrl = await readFileAsDataURL(file);
      return {
        file,
        dataUrl,
        originalSize,
        optimizedSize: originalSize,
        savedPercentage: 0,
        isOptimized: false,
      };
    }

    const optimizedFile = new File([blob], newFileName, {
      type: targetMime,
      lastModified: Date.now(),
    });

    const dataUrl = canvas.toDataURL(targetMime, quality);
    const optimizedSize = blob.size;
    const savedBytes = Math.max(0, originalSize - optimizedSize);
    const savedPercentage = Math.round((savedBytes / originalSize) * 100);

    return {
      file: optimizedFile,
      dataUrl,
      originalSize,
      optimizedSize,
      savedPercentage,
      isOptimized: true,
    };
  } catch (err) {
    console.warn('Image optimization fallback to original file:', err);
    const dataUrl = await readFileAsDataURL(file);
    return {
      file,
      dataUrl,
      originalSize,
      optimizedSize: originalSize,
      savedPercentage: 0,
      isOptimized: false,
    };
  }
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || '');
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

function replaceExtension(fileName: string, newExt: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return `${fileName}${newExt}`;
  return `${fileName.substring(0, lastDot)}${newExt}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
