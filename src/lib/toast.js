// 아주 가벼운 전역 토스트 (pub/sub) — 어디서든 toast('메시지') 호출
let listeners = [];
let seq = 0;

export function toast(message, type = 'info') {
  const t = { id: ++seq, message: String(message ?? ''), type };
  listeners.forEach((fn) => fn(t));
  return t.id;
}

export function subscribeToast(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
}
