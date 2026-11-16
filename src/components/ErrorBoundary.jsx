// 화면 오류 방어막
//  - 어느 화면에서 오류가 나도 앱 전체가 하얗게 멈추지 않게, 그 자리에 안내와 '새로고침' 버튼을 보여 준다.
//  - 새 버전을 올린 뒤 예전 화면을 그대로 쓰던 사람이 다른 메뉴를 열면, 예전 파일 조각이 서버에 없어서
//    불러오기에 실패한다. 이때는 한 번 자동으로 새로고침해서 새 버전을 받게 한다.
import React from 'react';
import { COLORS } from '../lib/colors';

const RELOAD_KEY = 'hssup_chunk_reload_at';

export const isChunkLoadError = (err) =>
  /Loading chunk|dynamically imported module|Importing a module script failed|error loading dynamically imported|Unable to preload CSS/i
    .test(String(err?.message || err || ''));

// 파일 조각을 못 불러왔을 때 한 번만 새로고침. 방금(10초 안) 새로고침했는데도 또 실패하면 그만둔다(무한 반복 방지).
export const reloadOnceForNewVersion = () => {
  let last = 0;
  try { last = Number(sessionStorage.getItem(RELOAD_KEY) || 0); } catch (e) { /* 무시 */ }
  if (Date.now() - last < 10000) return false;
  try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch (e) { /* 무시 */ }
  window.location.reload();
  return true;
};

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    if (isChunkLoadError(error)) reloadOnceForNewVersion();
  }

  // 다른 화면으로 옮기면(resetKey 가 바뀌면) 오류 안내를 걷고 새 화면을 그린다
  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const chunk = isChunkLoadError(error);
    const full = this.props.full;
    return (
      <div className="flex flex-col items-center justify-center text-center px-8"
        style={{ minHeight: full ? '100dvh' : '60vh', background: COLORS.cream }}>
        <h2 className="font-display text-2xl tracking-tight" style={{ color: COLORS.ink }}>
          {chunk ? '새 버전이 올라왔습니다' : '화면을 불러오지 못했습니다'}
        </h2>
        <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>
          {chunk
            ? '새로고침하면 최신 화면으로 열립니다.'
            : '잠시 후 다시 시도해 주세요. 계속되면 새로고침해 주세요.'}
        </p>
        <div className="flex gap-2 mt-6">
          <button onClick={() => window.location.reload()}
            className="font-heading text-sm px-6 py-3 rounded-full"
            style={{ background: COLORS.primary, color: COLORS.white }}>
            새로고침
          </button>
          {!full && this.props.onHome && (
            <button onClick={() => { this.setState({ error: null }); this.props.onHome(); }}
              className="font-heading text-sm px-6 py-3 rounded-full"
              style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
              홈으로
            </button>
          )}
        </div>
      </div>
    );
  }
}
