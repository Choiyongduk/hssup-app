// 이미지·영상 업로드/삭제/압축 공용 헬퍼
import { supabase } from './supabase';

// 🍊 이미지 압축 헬퍼 함수 (Canvas API 사용)
export const compressImage = (file, maxWidth = 1200, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    // 이미지 아니거나 SVG/GIF는 압축 X (애니메이션 깨짐)
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // 너비 기준 리사이즈 (비율 유지)
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('이미지 압축 실패'));
              return;
            }
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, '.jpg'),
              { type: 'image/jpeg', lastModified: Date.now() }
            );
            // 원본이 더 작으면 원본 사용 (불필요한 변환 방지)
            resolve(compressedFile.size > file.size ? file : compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('이미지 로드 실패'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsDataURL(file);
  });
};

// 이미지 업로드 헬퍼 함수 (개별피드백 케이스, bucket: 'case-images')
export const uploadCaseImage = async (file, userId) => {
  // 🍊 압축 먼저
  const compressed = await compressImage(file, 1200, 0.85);

  // 파일 이름 생성 (timestamp + random)
  const fileExt = compressed.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  // Supabase Storage에 업로드
  const { error: uploadError } = await supabase.storage
    .from('case-images')
    .upload(filePath, compressed);

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw uploadError;
  }

  // Public URL 가져오기
  const { data } = supabase.storage
    .from('case-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

// 이미지 삭제 헬퍼 함수
export const deleteCaseImage = async (imageUrl) => {
  // URL에서 파일 경로 추출
  const url = new URL(imageUrl);
  const pathParts = url.pathname.split('/case-images/');
  if (pathParts.length < 2) return;
  const filePath = pathParts[1];

  const { error } = await supabase.storage
    .from('case-images')
    .remove([filePath]);

  if (error) console.error('Delete error:', error);
};

// 🎥 유튜브 URL 판별
export const isYouTubeUrl = (url) => !!url && (url.includes('youtube.com') || url.includes('youtu.be'));

// 🎥 영상 파일 업로드 (공지·꿀팁 공용, bucket: 'post-videos')
export const uploadPostVideo = async (file, bucket = 'post-videos') => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const { error } = await supabase.storage.from(bucket).upload(fileName, file, {
    contentType: file.type || 'video/mp4',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
};

// 🎥 영상 파일 삭제 (유튜브 URL이면 스킵)
export const deletePostVideo = async (videoUrl, bucket = 'post-videos') => {
  if (!videoUrl || isYouTubeUrl(videoUrl)) return;
  try {
    const url = new URL(videoUrl);
    const pathParts = url.pathname.split(`/${bucket}/`);
    if (pathParts.length < 2) return;
    await supabase.storage.from(bucket).remove([pathParts[1]]);
  } catch (e) { console.error('영상 삭제 에러:', e); }
};

// ============================================
// 🖼️ 여러 장 이미지 공용 헬퍼 (admin 업로드 공통)
// ============================================

// 단일 파일을 압축 후 지정 버킷에 업로드하고 publicUrl 반환
export const uploadImageToBucket = async (file, bucket, maxWidth = 1600) => {
  const compressed = await compressImage(file, maxWidth, 0.85);
  const fileExt = compressed.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const { error } = await supabase.storage.from(bucket).upload(fileName, compressed);
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
};

// 버킷에서 이미지 1장 삭제 (publicUrl 기반)
export const deleteImageFromBucket = async (imageUrl, bucket) => {
  if (!imageUrl) return;
  try {
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split(`/${bucket}/`);
    if (pathParts.length < 2) return;
    await supabase.storage.from(bucket).remove([pathParts[1]]);
  } catch (e) { console.error('이미지 삭제 에러:', e); }
};

// 폼의 (유지된 기존 URL + 새 파일) 을 모두 반영해 최종 image_urls 배열 반환
export const persistFormImages = async (value, bucket, maxWidth = 1600) => {
  const urls = [...(value?.image_urls || [])];
  for (const file of (value?.imageFiles || [])) {
    urls.push(await uploadImageToBucket(file, bucket, maxWidth));
  }
  return urls;
};

// DB row 에서 표시용 이미지 배열을 정규화 (image_urls 우선, 없으면 image_url 하위호환)
export const getRowImages = (row) => {
  if (!row) return [];
  if (Array.isArray(row.image_urls) && row.image_urls.length) return row.image_urls.filter(Boolean);
  if (row.image_url) return [row.image_url];
  return [];
};
