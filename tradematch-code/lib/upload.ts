import { supabase } from './supabase';

export async function uploadGoodsImage(file: File): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `goods/${fileName}`;

  const { error } = await supabase.storage
    .from('goods-images')
    .upload(filePath, file);

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  // 公開URLを取得
  const { data } = supabase.storage
    .from('goods-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
}
