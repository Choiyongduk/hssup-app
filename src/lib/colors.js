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

export const COLORS = {
  // 시그니처 컬러
  primary: '#FF5C1F',                        // 메인 오렌지
  deep: '#FF7A47',                           // 밝은 오렌지 (강조)
  primaryGlow: 'rgba(255, 92, 31, 0.35)',   // 글로우 효과용
  peach: 'rgba(255, 92, 31, 0.15)',         // 오렌지 배경

  // 다크 테마 베이스
  cream: '#0A0A0A',                          // 메인 배경
  card: '#161616',                           // 카드 배경
  cardElev: '#1F1F1F',                       // 들어올린 카드

  // 텍스트
  ink: '#FFFFFF',                            // 메인 텍스트 (흰색!)
  stone: '#A0A0A0',                          // 보조 텍스트
  muted: '#6B6B6B',                          // 흐린 텍스트

  // 경계선
  light: 'rgba(255, 255, 255, 0.08)',       // 미묘한 경계선
  border: 'rgba(255, 255, 255, 0.15)',      // 진한 경계선

  // 진짜 흰색 (버튼 위 텍스트용)
  white: '#FFFFFF',
};
