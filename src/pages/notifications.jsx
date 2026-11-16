// 🔔 알림함 — 푸시로 나간 알림을 앱 안에서 다시 본다 (user_notifications 표, send-push 가 기록)
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { COLORS } from '../lib/colors';
import { toast } from '../lib/toast';
import { inboxChanged, timeAgo } from '../lib/inbox';
import { subscribeToNotifications } from '../lib/notifications';
import { PageIntro } from '../components/common';
import { Bell, ChevronRight, Loader2 } from 'lucide-react';

const PAGE = 30;

export function NotificationsPage({ user, openUrl }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // 푸시를 켤 수 있는데 아직 안 켠 기기에만 안내를 띄운다
  const [canEnablePush, setCanEnablePush] = useState(
    () => typeof Notification !== 'undefined' && 'serviceWorker' in navigator && Notification.permission === 'default'
  );
  const [enabling, setEnabling] = useState(false);

  const fetchPage = async (from) => {
    const { data, error } = await supabase.from('user_notifications')
      .select('id, title, body, url, is_read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE);   // 한 개 더 받아서 다음 장이 있는지 본다
    if (error) return null;
    return data || [];
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const rows = await fetchPage(0);
      if (!alive) return;
      if (rows === null) { setFailed(true); setLoading(false); return; }
      setHasMore(rows.length > PAGE);
      setItems(rows.slice(0, PAGE));
      setLoading(false);
      // 알림함을 열면 모두 읽은 것으로 한다. 이번에 새로 온 것은 화면에 표시를 남겨 둔다(다음에 열면 사라짐).
      if (rows.some((r) => !r.is_read)) {
        await supabase.from('user_notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
        inboxChanged();
      }
    })();
    return () => { alive = false; };
  }, [user.id]);

  const loadMore = async () => {
    setLoadingMore(true);
    const rows = await fetchPage(items.length);
    setLoadingMore(false);
    if (rows === null) { toast('알림을 더 불러오지 못했습니다.'); return; }
    setHasMore(rows.length > PAGE);
    setItems((prev) => [...prev, ...rows.slice(0, PAGE)]);
  };

  const enablePush = async () => {
    setEnabling(true);
    const result = await subscribeToNotifications(user.id, { unmute: true });
    setEnabling(false);
    setCanEnablePush(false);
    toast(result.success ? '푸시 알림을 켰습니다.' : '푸시 알림을 켜지 못했습니다. 마이페이지에서 다시 켤 수 있습니다.');
  };

  return (
    <>
      <PageIntro ko="알림함" en="Notifications" />

      <div className="px-5 pb-6 space-y-3">
        {canEnablePush && (
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: COLORS.cardElev }}>
            <p className="font-body text-xs flex-1 leading-relaxed" style={{ color: COLORS.ink }}>
              푸시 알림을 켜면 앱을 닫아 두어도 바로 받을 수 있습니다.
            </p>
            <button onClick={enablePush} disabled={enabling}
              className="shrink-0 font-heading text-xs px-4 py-2 rounded-full flex items-center gap-1.5 disabled:opacity-60"
              style={{ background: COLORS.primary, color: COLORS.white }}>
              {enabling ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} strokeWidth={2.5} />}
              알림 켜기
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
          </div>
        ) : failed ? (
          <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>알림을 불러오지 못했습니다. 잠시 후 다시 열어 주세요.</p>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Bell size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>받은 알림이 없습니다</p>
            <p className="font-body text-xs mt-1" style={{ color: COLORS.muted }}>공지, 답변, 댓글, 주문 소식이 여기에 모입니다</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            {items.map((n, i) => (
              <button key={n.id} onClick={() => openUrl(n.url)}
                className="w-full text-left flex items-start gap-3 px-4 py-3.5 transition-transform active:scale-[0.99]"
                style={{ borderTop: i !== 0 ? `1px solid ${COLORS.light}` : 'none', background: n.is_read ? 'transparent' : COLORS.peach }}>
                <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: n.is_read ? 'transparent' : COLORS.primary }} />
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-sm break-words" style={{ color: COLORS.ink }}>{n.title}</p>
                  {n.body && (
                    <p className="font-body text-xs mt-1 leading-relaxed whitespace-pre-line break-words line-clamp-3" style={{ color: COLORS.stone }}>{n.body}</p>
                  )}
                  <p className="font-mono text-[10px] mt-1.5" style={{ color: COLORS.muted }}>{timeAgo(n.created_at)}</p>
                </div>
                <ChevronRight size={14} className="mt-1 shrink-0" style={{ color: COLORS.stone }} />
              </button>
            ))}
          </div>
        )}

        {hasMore && (
          <button onClick={loadMore} disabled={loadingMore}
            className="w-full rounded-full py-3 font-heading text-xs flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
            {loadingMore && <Loader2 size={12} className="animate-spin" />}
            더 보기
          </button>
        )}

        {!loading && !failed && items.length > 0 && (
          <p className="text-center font-body text-[11px]" style={{ color: COLORS.muted }}>알림은 60일 동안 보관됩니다</p>
        )}
      </div>
    </>
  );
}
