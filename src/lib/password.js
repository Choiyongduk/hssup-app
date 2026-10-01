import { supabase } from './supabase';

// 🔑 비밀번호 관련 공용 로직 — 마이페이지 변경 / 찾기(인증번호·링크) 재설정이 같이 씀

// Supabase 인증 에러 메시지를 회원이 알아볼 수 있는 한국어로
export function authErrorKo(message = '') {
  const m = message.toLowerCase();
  if (m.includes('different from the old password')) return '지금 쓰는 비밀번호와 다른 비밀번호를 입력해주세요';
  if (m.includes('at least')) return '비밀번호는 6자 이상이어야 합니다';
  if (m.includes('expired') || m.includes('invalid')) return '인증번호가 틀렸거나 만료되었어요. 다시 확인해주세요';
  if (m.includes('security purposes') || m.includes('rate limit')) return '잠시 후 다시 시도해주세요 (1분에 한 번만 보낼 수 있어요)';
  if (m.includes('session')) return '로그인이 만료되었어요. 비밀번호 찾기를 처음부터 다시 해주세요';
  return message;
}

// 새 비밀번호 저장. 성공하면 null, 실패하면 보여줄 에러 문구를 돌려준다.
export async function updatePassword(password, confirm) {
  if (!password) return '새 비밀번호를 입력해주세요';
  if (password.length < 6) return '비밀번호는 6자 이상이어야 합니다';
  if (password !== confirm) return '비밀번호가 일치하지 않습니다';
  const { error } = await supabase.auth.updateUser({ password });
  return error ? authErrorKo(error.message) : null;
}
