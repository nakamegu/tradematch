import { supabase } from './supabase';

const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const QUALITY = 0.8;

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        },
        'image/webp',
        QUALITY,
      );
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = URL.createObjectURL(file);
  });
}

export async function uploadGoodsImage(file: File): Promise<string | null> {
  try {
    const compressed = await compressImage(file);
    const fileName = `${Math.random()}.webp`;
    const filePath = `goods/${fileName}`;

    const { error } = await supabase.storage
      .from('goods-images')
      .upload(filePath, compressed, { contentType: 'image/webp' });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data } = supabase.storage
      .from('goods-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error('Image processing error:', err);
    return null;
  }
}
