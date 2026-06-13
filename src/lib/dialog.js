// 전역 확인 모달 (async) — const ok = await confirmDialog('정말?')
let listener = null;
let seq = 0;

export function confirmDialog(message, opts = {}) {
  return new Promise((resolve) => {
    // Host가 아직 없으면 네이티브로 폴백
    if (!listener) { resolve(typeof window !== 'undefined' ? window.confirm(message) : true); return; }
    listener({
      id: ++seq,
      message: String(message ?? ''),
      confirmText: opts.confirmText || '확인',
      cancelText: opts.cancelText || '취소',
      resolve,
    });
  });
}

export function subscribeConfirm(fn) {
  listener = fn;
  return () => { if (listener === fn) listener = null; };
}
