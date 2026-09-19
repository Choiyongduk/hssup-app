// 디자인 토큰 (컬러) + 아바타 헬퍼

// 아바타 그라데이션 컬러 (반영구 시술 무드)
export const AVATAR_COLORS = {
  orange:  { name: '시그니처 오렌지', gradient: 'linear-gradient(135deg, #FF5C1F 0%, #FF9580 100%)' },
  brown:   { name: '딥 브라운',        gradient: 'linear-gradient(135deg, #5C463A 0%, #8B6F5C 100%)' },
  coral:   { name: '코랄',              gradient: 'linear-gradient(135deg, #FF7556 0%, #FFB39E 100%)' },
  mocha:   { name: '모카',              gradient: 'linear-gradient(135deg, #8B6F5C 0%, #C9B89C 100%)' },
  nude:    { name: '누드',              gradient: 'linear-gradient(135deg, #D4A593 0%, #F5DDD8 100%)' },
  charcoal:{ name: '차콜',              gradient: 'linear-gradient(135deg, #2D2520 0%, #6B6661 100%)' },
};

// 이름에서 이니셜 추출
export const getInitial = (name) => {
  if (!name) return '?';
  const trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase();
};

// 운영진/원장님 여부 & 표시 라벨 (일반 회원에게 실명 대신 노출)
export const isOperatorRole = (role) => role === 'admin' || role === 'staff';
export const operatorLabel = (role) => (role === 'admin' ? '원장님' : '운영진');

// 작성자 프로필을 "보는 사람" 기준으로 표시용 프로필로 변환.
//  - 뷰어가 운영진(admin/staff): 실명 그대로 (누가 썼는지 확인 가능)
//  - 그 외 일반 회원: 원장님 → '원장님', 운영진 → '운영진' 으로 이름 치환 (아바타 이니셜도 원/운)
export const maskAuthor = (author, viewer) => {
  if (!author || !isOperatorRole(author.role)) return author;
  if (isOperatorRole(viewer?.role)) return author;
  return { ...author, name: operatorLabel(author.role) };
};

export const COLORS = {
  // 시그니처 컬러
  primary: '#FF5C1F',                        // 메인 오렌지
  deep: '#FF7A47',                           // 밝은 오렌지 (강조)
  primaryGlow: 'rgba(255, 92, 31, 0.35)',   // 글로우 효과용
  peach: 'rgba(255, 92, 31, 0.1)',          // 오렌지 배경

  // 화이트 캠페인 테마 베이스
  cream: '#FAF8F5',                          // 메인 배경
  card: '#FFFFFF',                           // 카드 배경
  cardElev: '#F3EFE9',                       // 들어올린 카드

  // 텍스트
  ink: '#0B0B0B',                            // 메인 텍스트 (거의 블랙)
  stone: '#615B55',                          // 보조 텍스트
  muted: '#9A928A',                          // 흐린 텍스트

  // 경계선
  light: 'rgba(10, 10, 10, 0.08)',          // 미묘한 경계선
  border: 'rgba(10, 10, 10, 0.15)',         // 진한 경계선

  // 진짜 흰색 (오렌지 배경 위 텍스트용)
  white: '#FFFFFF',
};
