import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { COLORS } from '../lib/colors';
import { toast } from '../lib/toast';
import { confirmDialog } from '../lib/dialog';
import { compressImage, isYouTubeUrl, uploadPostVideo, deletePostVideo, deleteImageFromBucket, persistFormImages, getRowImages } from '../lib/images';
import { notifyAdminsOfStaffActivity } from '../lib/notifications';
import { useDraft } from '../hooks';
import {
  MultiImageField, SkeletonImage, Avatar, LevelCard, PageIntro,
} from '../components/common';
import { Bell, BookOpen, MessageCircle, FolderOpen, Sparkles, ShoppingBag, PlayCircle, Users, ChevronRight, Clock, Check, Plus, Edit3, Play, Upload, Trash2, ChevronLeft, Shield, UserCheck, UserPlus, CreditCard, AlertCircle, Camera, ArrowUpRight, Loader2, X, Search, Package, Truck } from 'lucide-react';

export function AdminImprovements({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [profiles, setProfiles] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('improvements')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(d => d.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_color, avatar_url')
        .in('id', userIds);

      const profileMap = {};
      (profilesData || []).forEach(p => { profileMap[p.id] = p; });
      setProfiles(profileMap);
    }

    setItems(data || []);
    setLoading(false);
  };

  const handleReply = async (item) => {
    if (!reply.trim()) return toast('답변을 입력해주세요');
    setSubmitting(true);
    const { error } = await supabase.from('improvements').update({
      admin_reply: reply.trim(),
      admin_replied_at: new Date().toISOString(),
      admin_replied_by: user.id,
      status: 'replied'
    }).eq('id', item.id);
    setSubmitting(false);
    if (error) {
      toast('답변 실패: ' + error.message);
    } else {
      // 알림은 실패해도 답변 자체는 완료되도록 try/catch로 격리
      try {
        await supabase.from('notifications').insert({
          user_id: item.user_id,
          type: 'improvement_reply',
          title: '개선 제안에 답변이 등록되었어요',
          message: reply.substring(0, 50) + (reply.length > 50 ? '...' : ''),
          link_type: 'improvements',
          is_read: false
        });
        await notifyAdminsOfStaffActivity(user, `개선 제안 답변`, reply.substring(0, 60));
      } catch (e) { console.error('알림 발송 실패:', e); }

      setReply('');
      setSelectedId(null);
      loadItems();
    }
  };

  const toggleAnonymous = async (item) => {
    if (!await confirmDialog(item.is_anonymous ? '실명으로 공개 변경할까요?' : '익명으로 변경할까요?')) return;
    const { error } = await supabase.from('improvements').update({
      is_anonymous: !item.is_anonymous
    }).eq('id', item.id);
    if (error) {
      toast('변경 실패: ' + error.message);
    } else {
      loadItems();
    }
  };

  const handleDelete = async (item) => {
    if (!await confirmDialog('정말 삭제할까요? (복구 불가)')) return;
    const { error } = await supabase.from('improvements').delete().eq('id', item.id);
    if (error) {
      toast('삭제 실패: ' + error.message);
    } else {
      loadItems();
    }
  };

  const toggleFilter = (status) => {
    setFilter(prev => prev === status ? 'all' : status);
  };

  const pending = items.filter(i => i.status === 'pending');
  const replied = items.filter(i => i.status === 'replied');
  const filtered = filter === 'all' ? items : filter === 'pending' ? pending : replied;

  return (
    <>
      <PageIntro ko="어플개선제안 관리" en="Improvements Admin" desc="학생들의 의견에 답변해주세요" />

      <div className="px-5 mb-4">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={() => toggleFilter('pending')}
            className={`rounded-2xl p-3 text-left transition-transform active:scale-95 ${filter === 'pending' ? 'glow-primary' : ''}`}
            style={{ background: COLORS.primary }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.white }}>답변 대기</p>
            <p className="font-display text-2xl mt-1" style={{ color: COLORS.white }}>{pending.length}</p>
          </button>
          <button onClick={() => toggleFilter('replied')}
            className={`rounded-2xl p-3 text-left transition-transform active:scale-95 ${filter === 'replied' ? 'glow-primary' : ''}`}
            style={{ background: COLORS.card, border: `1px solid ${COLORS.primary}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>답변 완료</p>
            <p className="font-display text-2xl mt-1" style={{ color: COLORS.ink }}>{replied.length}</p>
          </button>
        </div>

        {filter !== 'all' && (
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px]" style={{ color: COLORS.primary }}>
              <span className="font-bold">{filter === 'pending' ? '답변 대기' : '답변 완료'}</span> 만 보는 중
            </p>
            <button onClick={() => setFilter('all')} className="font-mono text-[10px] font-bold flex items-center gap-1" style={{ color: COLORS.stone }}>
              전체 보기 <X size={11} />
            </button>
          </div>
        )}
      </div>

      <div className="px-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>
            {filter === 'pending' ? '답변 대기 중인 제안이 없습니다' :
             filter === 'replied' ? '답변 완료된 제안이 없습니다' :
             '등록된 제안이 없습니다'}
          </p>
        ) : filtered.map(item => {
          const profile = profiles[item.user_id];
          return (
            <div key={item.id} className="rounded-2xl p-4"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded"
                    style={{ 
                      background: item.status === 'replied' ? COLORS.peach : COLORS.primary, 
                      color: item.status === 'replied' ? COLORS.primary : COLORS.white 
                    }}>
                    {item.status === 'replied' ? '완료' : '대기'}
                  </span>
                  <button onClick={() => toggleAnonymous(item)}
                    className="font-mono text-[9px] px-2 py-1 rounded transition-transform active:scale-95"
                    style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
                    {item.is_anonymous ? '익명' : '실명'} (변경)
                  </button>
                </div>
                <button onClick={() => handleDelete(item)} className="rounded p-1.5" style={{ background: COLORS.cardElev }}>
                  <Trash2 size={12} style={{ color: COLORS.muted }} />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: `1px solid ${COLORS.light}` }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center font-display text-xs font-bold"
                  style={{ background: profile?.avatar_color || COLORS.primary, color: COLORS.white }}>
                  {profile?.name?.[0] || '?'}
                </div>
                <div className="flex-1">
                  <p className="font-body text-xs font-bold" style={{ color: COLORS.ink }}>
                    {profile?.name || '(알 수 없음)'}
                    {item.is_anonymous && <span className="ml-2 font-mono text-[9px]" style={{ color: COLORS.stone }}>(학생에게는 익명 표시)</span>}
                  </p>
                  <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
                    {new Date(item.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>
              </div>

              <p className="font-body text-sm leading-relaxed mb-3" style={{ color: COLORS.ink, whiteSpace: 'pre-wrap' }}>
                {item.content}
              </p>

              {item.status === 'replied' && item.admin_reply ? (
                <div className="rounded-lg p-3" style={{ background: COLORS.cardElev, borderLeft: `3px solid ${COLORS.primary}` }}>
                  <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-1" style={{ color: COLORS.primary }}>━━ 답변</p>
                  <p className="font-body text-sm leading-relaxed" style={{ color: COLORS.ink, whiteSpace: 'pre-wrap' }}>
                    {item.admin_reply}
                  </p>
                </div>
              ) : selectedId === item.id ? (
                <div>
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)}
                    placeholder="답변을 작성해주세요..."
                    className="w-full rounded-xl p-3 font-body text-sm focus:outline-none"
                    rows={4}
                    style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => { setSelectedId(null); setReply(''); }}
                      className="flex-1 rounded-xl py-2 font-display text-sm font-bold"
                      style={{ background: COLORS.cardElev, color: COLORS.stone }}>
                      취소
                    </button>
                    <button onClick={() => handleReply(item)} disabled={submitting}
                      className="flex-1 rounded-xl py-2 font-display text-sm font-bold"
                      style={{ background: COLORS.primary, color: COLORS.white }}>
                      {submitting ? '전송...' : '답변 전송'}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setSelectedId(item.id)}
                  className="w-full rounded-xl py-2 font-display text-sm font-bold transition-transform active:scale-95"
                  style={{ background: COLORS.primary, color: COLORS.white }}>
                  답변하기
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export function AdminDashboard({ setCurrentPage, canViewRevenue }) {
  const newDays = 3;
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [stats, setStats] = useState({
    students: 0, 
    lectures: 0, 
    pendingQna: 0, 
    monthRevenue: 0,
    lastMonthRevenue: 0,
    newStudents: 0,
    monthOrders: 0,
    monthlyTrend: [],
  });

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        { count: students },
        { count: lectures },
        { count: pendingQna },
        { data: thisMonthOrders },
        { data: lastMonthOrders },
        { count: newStudents },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').neq('status', 'deleted'),
        supabase.from('lectures').select('*', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('questions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('amount').eq('status', 'paid').gte('paid_at', thisMonthStart),
        supabase.from('orders').select('amount').eq('status', 'paid').gte('paid_at', lastMonthStart).lt('paid_at', lastMonthEnd),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').neq('status', 'deleted').gte('created_at', thisMonthStart),
      ]);
      
      const monthRevenue = (thisMonthOrders || []).reduce((sum, o) => sum + Number(o.amount || 0), 0);
      const lastMonthRevenue = (lastMonthOrders || []).reduce((sum, o) => sum + Number(o.amount || 0), 0);

      // 📊 최근 6개월 매출 트렌드 로드
      const monthRanges = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mStart = date.toISOString();
        const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).toISOString();
        monthRanges.push({ date, mStart, mEnd });
      }
      const trendData = await Promise.all(
        monthRanges.map(({ mStart, mEnd }) =>
          supabase.from('orders').select('amount').eq('status', 'paid').gte('paid_at', mStart).lt('paid_at', mEnd)
        )
      );
      const monthlyTrend = monthRanges.map((range, i) => {
        const orders = trendData[i].data || [];
        const revenue = orders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
        return {
          label: `${range.date.getMonth() + 1}월`,
          revenue
        };
      });

      setStats({
        students: students || 0, 
        lectures: lectures || 0, 
        pendingQna: pendingQna || 0,
        monthRevenue,
        lastMonthRevenue,
        newStudents: newStudents || 0,
        monthOrders: thisMonthOrders?.length || 0,
        monthlyTrend,
      });
    };
    load();
  }, []);

  useEffect(() => {
    const loadUpdates = async () => {
      const since = new Date(Date.now() - newDays * 24 * 60 * 60 * 1000).toISOString();
      const [notices, trends, tips, lectures, library] = await Promise.all([
        supabase.from('notices').select('id, title, created_at').gte('created_at', since).order('created_at', { ascending: false }),
        supabase.from('trends').select('id, title, created_at').eq('is_active', true).gte('created_at', since).order('created_at', { ascending: false }),
        supabase.from('tips').select('id, title, created_at').eq('is_active', true).gte('created_at', since).order('created_at', { ascending: false }),
        supabase.from('lectures').select('id, title, created_at').eq('is_published', true).gte('created_at', since).order('created_at', { ascending: false }),
        supabase.from('library_files').select('id, name, created_at').gte('created_at', since).order('created_at', { ascending: false }),
      ]);
      const all = [
        ...(notices.data || []).map(x => ({ id: x.id, title: x.title, created_at: x.created_at, type: '공지', page: 'admin-notice' })),
        ...(trends.data || []).map(x => ({ id: x.id, title: x.title, created_at: x.created_at, type: '트렌드', page: 'admin-trends' })),
        ...(tips.data || []).map(x => ({ id: x.id, title: x.title, created_at: x.created_at, type: '꿀팁', page: 'admin-tips' })),
        ...(lectures.data || []).map(x => ({ id: x.id, title: x.title, created_at: x.created_at, type: '강의', page: 'admin-lectures' })),
        ...(library.data || []).map(x => ({ id: x.id, title: x.name, created_at: x.created_at, type: '자료', page: 'admin-library' })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecentUpdates(all);
    };
    loadUpdates();
  }, [newDays]);

  const formatRevenue = (n) => {
    if (!n || n === 0) return '0';
    if (n >= 10000) return (n / 10000).toFixed(0) + '만';
    return n.toLocaleString();
  };

  // 매출 변화율 계산
  const revenueChange = stats.lastMonthRevenue > 0 
    ? Math.round(((stats.monthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100)
    : null;

  const quickActions = [
    { id: 'admin-approvals',    label: 'APPROVE',  ko: '가입 승인',     icon: UserPlus },
    { id: 'admin-notice',       label: 'NOTICE',   ko: '학원공지',      icon: Bell },
    { id: 'admin-trends',       label: 'TRENDS',   ko: '트렌드',     icon: Sparkles },
    { id: 'admin-tips',         label: 'TIPS',     ko: '수업·꿀팁',     icon: Sparkles },
    { id: 'admin-students',     label: 'STUDENTS', ko: '수강생',        icon: UserCheck },
    { id: 'admin-qna',          label: 'Q&A',      ko: 'Q&A 답변',      icon: MessageCircle },
    { id: 'admin-improvements', label: 'FEEDBACK', ko: '어플개선제안',   icon: Edit3 },
    { id: 'admin-cases',        label: 'CASES',    ko: '1:1 피드백',    icon: Camera },
    { id: 'admin-lectures',     label: 'LECTURES', ko: '강의 관리',     icon: PlayCircle },
    { id: 'admin-products',     label: 'PRODUCTS', ko: '재료샵',        icon: ShoppingBag },
    { id: 'admin-library',      label: 'LIBRARY',  ko: '자료실',        icon: FolderOpen },
    { id: 'admin-courses',      label: 'COURSES',  ko: '클래스',        icon: BookOpen },
  ];

  return (
    <div className="pb-6">
      {/* 헤더 */}
      <section className="px-5 pt-5 pb-6">
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ Admin</p>
        <h2 className="font-display text-[42px] leading-[1] mt-3 tracking-tighter" style={{ color: COLORS.ink }}>
          Dashboard<span className="glow-text" style={{ color: COLORS.primary }}>.</span>
        </h2>
        <p className="font-serif-italic text-base mt-2" style={{ color: COLORS.stone }}>오늘의 운영 현황</p>
      </section>

      {/* 이번 달 매출 - 큰 강조 카드 (admin만) */}
      {canViewRevenue && (
      <section className="px-5 mb-3">
        <button onClick={() => setCurrentPage('admin-orders')} className="w-full rounded-3xl p-6 text-left relative overflow-hidden glow-primary" style={{ background: COLORS.primary }}>
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}></div>
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full" style={{ background: 'rgba(0,0,0,0.15)' }}></div>
          <div className="relative" style={{ color: COLORS.white }}>
            <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase opacity-80">━━ This Month Revenue</p>
            <p className="font-display text-5xl mt-2 leading-none tracking-tighter">
              {formatRevenue(stats.monthRevenue)}<span className="font-body text-2xl font-medium opacity-80">원</span>
            </p>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2 flex-wrap">
                {revenueChange !== null && (
                  <span className="font-mono text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.25)' }}>
                    {revenueChange > 0 ? '↑' : revenueChange < 0 ? '↓' : '→'} {Math.abs(revenueChange)}%
                  </span>
                )}
                <p className="font-body text-xs opacity-90">
                  {revenueChange === null ? '지난 달 데이터 없음' : 
                   revenueChange > 0 ? `지난 달보다 ${revenueChange}% 증가` :
                   revenueChange < 0 ? `지난 달보다 ${Math.abs(revenueChange)}% 감소` :
                   '지난 달과 동일'}
                </p>
              </div>
              <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 ml-2" style={{ background: COLORS.white }}>
                <ArrowUpRight size={16} strokeWidth={2.5} style={{ color: COLORS.primary }} />
              </div>
            </div>
          </div>
        </button>
      </section>
      )}

      {/* 매출 트렌드 - 최근 6개월 (admin만) */}
      {canViewRevenue && stats.monthlyTrend.length > 0 && (
        <section className="px-5 mb-3">
          <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase mb-2 px-1" style={{ color: COLORS.primary }}>━━ Revenue Trend (6M)</p>
          <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            {(() => {
              const maxRevenue = Math.max(...stats.monthlyTrend.map(m => m.revenue), 1);
              return (
                <div className="flex items-end justify-between gap-2" style={{ height: '140px' }}>
                  {stats.monthlyTrend.map((m, i) => {
                    const heightPercent = (m.revenue / maxRevenue) * 100;
                    const isCurrentMonth = i === stats.monthlyTrend.length - 1;
                    const formatVal = m.revenue >= 10000 ? `${(m.revenue / 10000).toFixed(0)}만` : m.revenue > 0 ? m.revenue.toLocaleString() : '-';
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <p className="font-mono text-[9px] font-bold" style={{ color: isCurrentMonth ? COLORS.primary : COLORS.stone }}>
                          {formatVal}
                        </p>
                        <div className="w-full rounded-t-lg" style={{ 
                          height: `${Math.max(heightPercent, 2)}%`,
                          background: isCurrentMonth ? COLORS.primary : 'rgba(255, 92, 31, 0.35)',
                          boxShadow: isCurrentMonth ? '0 0 16px rgba(255, 92, 31, 0.5)' : 'none',
                          transition: 'height 0.6s ease',
                          minHeight: '4px',
                        }}></div>
                        <p className="font-mono text-[10px] font-bold" style={{ color: isCurrentMonth ? COLORS.primary : COLORS.stone }}>
                          {m.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* 답변 대기 Q&A 알림 */}
      {stats.pendingQna > 0 && (
        <section className="px-5 mb-3">
          <button onClick={() => setCurrentPage('admin-qna')} className="w-full rounded-2xl p-4 text-left flex items-center gap-3 transition-transform active:scale-[0.98]" 
            style={{ background: COLORS.cardElev, border: `1px solid ${COLORS.primary}` }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 glow-primary" style={{ background: COLORS.primary }}>
              <MessageCircle size={20} style={{ color: COLORS.white }} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ Today's Mission</p>
              <p className="font-heading text-base mt-0.5" style={{ color: COLORS.ink }}>답변 기다리는 질문 {stats.pendingQna}건</p>
            </div>
            <ChevronRight size={20} style={{ color: COLORS.primary }} />
          </button>
        </section>
      )}

      {/* 최근 업데이트 (NEW) */}
      <section className="px-5 mb-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ NEW 업데이트</p>
          <span className="font-mono text-[9px]" style={{ color: COLORS.stone }}>최근 3일</span>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          {recentUpdates.length === 0 ? (
            <p className="font-body text-xs text-center py-6" style={{ color: COLORS.stone }}>최근 {newDays}일간 새 글이 없어요</p>
          ) : recentUpdates.slice(0, 10).map((u, i) => (
            <button key={`${u.type}-${u.id}`} onClick={() => setCurrentPage(u.page)}
              className="w-full text-left flex items-center gap-2.5 p-3 transition-transform active:scale-[0.98]"
              style={{ borderTop: i !== 0 ? `1px solid ${COLORS.light}` : 'none' }}>
              <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-1 rounded shrink-0" style={{ background: COLORS.peach, color: COLORS.deep }}>{u.type}</span>
              <p className="font-body text-xs flex-1 truncate" style={{ color: COLORS.ink }}>{u.title}</p>
              <span className="font-mono text-[9px] shrink-0" style={{ color: COLORS.stone }}>{new Date(u.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</span>
              <ChevronRight size={12} style={{ color: COLORS.stone }} />
            </button>
          ))}
        </div>
      </section>

      {/* 이번 달 통계 - 3개 카드 */}
      <section className="px-5 mb-3">
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase mb-2 px-1" style={{ color: COLORS.primary }}>━━ This Month</p>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => setCurrentPage('admin-approvals')} 
            className="rounded-2xl p-3 text-center transition-transform active:scale-95"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: 'rgba(255,92,31,0.12)' }}>
              <UserPlus size={18} style={{ color: COLORS.primary }} strokeWidth={2} />
            </div>
            <p className="font-display text-2xl tracking-tight" style={{ color: COLORS.ink }}>{stats.newStudents}</p>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase mt-1" style={{ color: COLORS.stone }}>신규</p>
          </button>
          <button onClick={() => setCurrentPage('admin-orders')}
            className="rounded-2xl p-3 text-center transition-transform active:scale-95"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: 'rgba(255,92,31,0.12)' }}>
              <CreditCard size={18} style={{ color: COLORS.primary }} strokeWidth={2} />
            </div>
            <p className="font-display text-2xl tracking-tight" style={{ color: COLORS.ink }}>{stats.monthOrders}</p>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase mt-1" style={{ color: COLORS.stone }}>결제</p>
          </button>
          <button onClick={() => setCurrentPage('admin-qna')}
            className="rounded-2xl p-3 text-center transition-transform active:scale-95"
            style={{ background: stats.pendingQna > 0 ? COLORS.peach : COLORS.card, border: `1px solid ${stats.pendingQna > 0 ? COLORS.primary : COLORS.light}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: stats.pendingQna > 0 ? 'rgba(255,92,31,0.2)' : 'rgba(255,92,31,0.12)' }}>
              <MessageCircle size={18} style={{ color: COLORS.primary }} strokeWidth={2} />
            </div>
            <p className="font-display text-2xl tracking-tight" style={{ color: stats.pendingQna > 0 ? COLORS.primary : COLORS.ink }}>{stats.pendingQna}</p>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase mt-1" style={{ color: COLORS.stone }}>답변대기</p>
          </button>
        </div>
      </section>

      {/* 전체 통계 - 2개 카드 */}
      <section className="px-5 mb-6">
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase mb-2 px-1" style={{ color: COLORS.primary }}>━━ All Time</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setCurrentPage('admin-students')}
            className="rounded-2xl p-4 text-left transition-transform active:scale-95"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>전체 수강생</p>
            <p className="font-display text-3xl mt-1 leading-none tracking-tight" style={{ color: COLORS.ink }}>{stats.students}<span className="font-body text-base font-medium" style={{ color: COLORS.stone }}>명</span></p>
          </button>
          <button onClick={() => setCurrentPage('online')}
            className="rounded-2xl p-4 text-left transition-transform active:scale-95"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>진행 강의</p>
            <p className="font-display text-3xl mt-1 leading-none tracking-tight" style={{ color: COLORS.ink }}>{stats.lectures}<span className="font-body text-base font-medium" style={{ color: COLORS.stone }}>개</span></p>
          </button>
        </div>
      </section>

      {/* Quick Action 3열 그리드 */}
      <section className="px-5">
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase mb-3 px-1" style={{ color: COLORS.primary }}>━━ Quick Action</p>
        <div className="grid grid-cols-3 gap-2">
          {quickActions.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setCurrentPage(item.id)}
                className="rounded-2xl p-3 flex flex-col items-center text-center transition-transform active:scale-95"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-2 glow-soft" style={{ background: 'rgba(255,92,31,0.1)', border: `1px solid rgba(255,92,31,0.25)` }}>
                  <Icon size={19} strokeWidth={1.8} style={{ color: COLORS.primary }} />
                </div>
                <p className="font-heading text-xs leading-tight" style={{ color: COLORS.ink }}>{item.ko}</p>
                <p className="font-mono text-[8px] mt-1 tracking-widest" style={{ color: COLORS.stone }}>{item.label}</p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function AdminTrends({ user }) {
  const [trends, setTrends] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState('전체');
  const [form, setForm, clearForm] = useDraft('trend_form', {
    category: '트렌드', title: '', content: '',
    link_url: '', video_url: '',
    image_urls: [], imageFiles: [], imagePreviews: [],
    is_active: true, sendPush: true,
  }, ['imageFiles', 'imagePreviews']);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from('trends').select('*').order('created_at', { ascending: false });
    setTrends(data || []);
  };

  // 이미지 선택/업로드/삭제는 MultiImageField + 공용 헬퍼(persistFormImages/deleteImageFromBucket)로 처리

  const resetForm = () => {
    form.imagePreviews?.forEach(p => URL.revokeObjectURL(p));
    clearForm();
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (trend) => {
    setForm({
      category: trend.category || '트렌드',
      title: trend.title || '',
      content: trend.content || '',
      link_url: trend.link_url || '',
      video_url: trend.video_url || '',
      image_urls: getRowImages(trend),
      imageFiles: [],
      imagePreviews: [],
      is_active: trend.is_active !== false,
      sendPush: false,
    });
    setEditingId(trend.id);
    setShowForm(true);
    setTimeout(() => document.querySelector('.admin-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const submit = async () => {
    if (!form.title.trim()) return toast('제목을 입력해주세요');
    setLoading(true);
    try {
      let imageUrls = form.image_urls || [];
      if ((form.imageFiles?.length || 0) > 0) {
        setUploading(true);
        imageUrls = await persistFormImages(form, 'trend-images');
        setUploading(false);
      }
      const trendData = {
        category: form.category,
        title: form.title.trim(),
        content: form.content.trim() || null,
        link_url: form.link_url.trim() || null,
        video_url: form.video_url.trim() || null,
        image_urls: imageUrls,
        image_url: imageUrls[0] || null,
        is_active: form.is_active,
      };
      if (editingId) {
        const { error } = await supabase.from('trends').update(trendData).eq('id', editingId);
        if (error) throw error;
      } else {
        trendData.created_by = user.id;
        const { error } = await supabase.from('trends').insert(trendData);
        if (error) throw error;

        // 푸시 알림 (신규 등록 + 체크 시)
        if (form.sendPush) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: `[${form.category}] 새 트렌드 속보!`,
                body: form.title,
                url: '/',
                targetRole: 'student',
              }),
            });
          } catch (e) { console.error('알림 발송 실패:', e); }
        }

        // 운영진이면 원장님께 별도 알림
        await notifyAdminsOfStaffActivity(user, `트렌드 속보 등록`, form.title);
      }
      resetForm();
      await load();
    } catch (err) {
      console.error(err);
      toast('저장 실패: ' + err.message);
    }
    setLoading(false);
    setUploading(false);
  };

  const remove = async (trend) => {
    if (!await confirmDialog('이 트렌드를 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('trends').delete().eq('id', trend.id);
    if (error) { toast('삭제 실패: ' + error.message); return; }
    for (const url of getRowImages(trend)) await deleteImageFromBucket(url, 'trend-images');
    await load();
  };

  const toggleActive = async (trend) => {
    const { error } = await supabase.from('trends').update({ is_active: !trend.is_active }).eq('id', trend.id);
    if (error) { toast('변경 실패: ' + error.message); return; }
    await load();
  };

  const categories = ['전체', '트렌드', '신상품', '시술기법', '업계소식', '마케팅팁'];
  const filtered = filter === '전체' ? trends : trends.filter(t => t.category === filter);

  return (
    <>
      <PageIntro ko="트렌드 속보 관리" en="Trends Admin" />
      <div className="px-5 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-3" style={{ background: COLORS.primary }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.white }}>공개 중</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.white }}>{trends.filter(t => t.is_active).length}</p>
          </div>
          <div className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>숨김</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>{trends.filter(t => !t.is_active).length}</p>
          </div>
        </div>

        {!showForm && (
          <button onClick={() => setShowForm(true)} className="w-full rounded-full py-3 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
            <Plus size={14} strokeWidth={2.5} />새 트렌드 속보
          </button>
        )}

        {showForm && (
          <div className="rounded-2xl p-4 space-y-3 animate-fade-in admin-edit-form" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base" style={{ color: COLORS.ink }}>{editingId ? '트렌드 수정' : '새 트렌드 속보'}</h3>
              <button onClick={resetForm}><X size={18} style={{ color: COLORS.stone }} /></button>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>카테고리 *</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }}>
                <option>트렌드</option><option>신상품</option><option>시술기법</option><option>업계소식</option><option>마케팅팁</option>
              </select>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>제목 *</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                placeholder="예: 일본에서 유행하는 신 엠보 기법"
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>

            <MultiImageField
              label="사진 (여러 장, 선택)"
              help="16:9 권장"
              value={form}
              onChange={(v) => setForm({ ...form, ...v })}
            />

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>내용</label>
              <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})}
                placeholder="자세한 설명 (선택)" rows={5}
                className="w-full font-body text-xs font-medium p-2 mt-1 outline-none resize-none rounded"
                style={{ background: COLORS.cream, color: COLORS.ink }} />
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>외부 링크 (선택)</label>
              <input type="url" value={form.link_url} onChange={e => setForm({...form, link_url: e.target.value})}
                placeholder="https://news.example.com/..."
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>뉴스 기사, 인스타 등 URL 붙여넣기</p>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>유튜브 URL (선택)</label>
              <input type="url" value={form.video_url} onChange={e => setForm({...form, video_url: e.target.value})}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>youtube.com, youtu.be, shorts 모두 가능</p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer p-2 rounded" style={{ background: COLORS.cream }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})}
                className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
              <span className="font-body text-xs" style={{ color: COLORS.ink }}>즉시 공개 (체크 해제 시 숨김)</span>
            </label>

            {!editingId && (
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded" style={{ background: COLORS.cream }}>
                <input type="checkbox" checked={form.sendPush} onChange={e => setForm({...form, sendPush: e.target.checked})}
                  className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
                <span className="font-body text-xs" style={{ color: COLORS.ink }}>푸시 알림 발송</span>
              </label>
            )}

            <button onClick={submit} disabled={loading || uploading}
              className="w-full font-heading text-sm py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: COLORS.cardElev, color: COLORS.white }}>
              {(loading || uploading) && <Loader2 size={14} className="animate-spin" />}
              {uploading ? '이미지 업로드 중...' : editingId ? '수정 저장' : '발행하기'}
            </button>
          </div>
        )}

        {/* 카테고리 필터 */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 py-1">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className="shrink-0 px-3 py-1.5 rounded-full font-body text-xs font-semibold"
              style={{
                background: filter === cat ? COLORS.primary : COLORS.card,
                color: filter === cat ? COLORS.white : COLORS.ink,
                border: `1px solid ${filter === cat ? COLORS.primary : COLORS.light}`,
              }}>
              {cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <Sparkles size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>등록된 트렌드가 없습니다</p>
          </div>
        ) : filtered.map(t => (
          <div key={t.id} onClick={() => startEdit(t)} className="rounded-2xl overflow-hidden cursor-pointer transition-transform active:scale-[0.98]" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}`, opacity: t.is_active ? 1 : 0.6 }}>
            {t.image_url && (
              <div className="aspect-video relative">
                <SkeletonImage src={t.image_url} alt={t.title} className="w-full h-full" />
                <span className="absolute top-2 left-2 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.card, color: COLORS.ink }}>{t.category}</span>
                {!t.is_active && (
                  <span className="absolute top-2 right-2 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.cardElev, color: COLORS.stone }}>숨김</span>
                )}
              </div>
            )}
            <div className="p-3">
              {getRowImages(t).length === 0 && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: COLORS.peach, color: COLORS.deep }}>{t.category}</span>
                  {!t.is_active && <span className="font-mono text-[8px] px-1.5 py-0.5 rounded" style={{ background: COLORS.cardElev, color: COLORS.stone }}>숨김</span>}
                </div>
              )}
              <h4 className="font-heading text-sm" style={{ color: COLORS.ink }}>{t.title}</h4>
              <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>{new Date(t.created_at).toLocaleDateString('ko-KR')}</p>
              {t.content && <p className="font-body text-xs mt-1.5 line-clamp-2" style={{ color: COLORS.stone }}>{t.content}</p>}
              <div onClick={e => e.stopPropagation()} className="flex gap-1 mt-3">
                <button onClick={() => toggleActive(t)} className="flex-1 font-heading text-[10px] py-1.5 rounded-full"
                  style={{ background: t.is_active ? COLORS.cream : COLORS.primary, color: t.is_active ? COLORS.stone : COLORS.white }}>
                  {t.is_active ? '숨김' : '공개'}
                </button>
                <button onClick={() => startEdit(t)} className="flex-1 font-heading text-[10px] py-1.5 rounded-full flex items-center justify-center gap-1"
                  style={{ background: COLORS.cardElev, color: COLORS.white }}>
                  <Edit3 size={10} />수정
                </button>
                <button onClick={() => remove(t)} className="px-2 py-1.5 rounded-full" style={{ background: COLORS.cream }}>
                  <Trash2 size={10} style={{ color: COLORS.deep }} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function AdminTips({ user }) {
  const [tips, setTips] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState('전체');
  const [form, setForm, clearForm] = useDraft('tip_form', {
    category: '수업노트', title: '', content: '',
    link_url: '', video_url: '',
    image_urls: [], imageFiles: [], imagePreviews: [],
    videoFile: null, videoPreview: null,
    is_active: true, sendPush: true,
  }, ['imageFiles', 'imagePreviews', 'videoFile', 'videoPreview']);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from('tips').select('*').order('created_at', { ascending: false });
    setTips(data || []);
  };

  // 이미지는 MultiImageField + 공용 헬퍼(persistFormImages/deleteImageFromBucket)로 처리

  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast('영상 파일은 50MB까지만 올릴 수 있어요.\n긴 영상은 유튜브에 올린 뒤 링크를 붙여넣어 주세요!\n(저장공간·데이터 절약)');
      return;
    }
    if (form.videoPreview) URL.revokeObjectURL(form.videoPreview);
    setForm({ ...form, videoFile: file, videoPreview: URL.createObjectURL(file), video_url: '' });
  };

  const removeVideo = () => {
    if (form.videoPreview) URL.revokeObjectURL(form.videoPreview);
    setForm({ ...form, videoFile: null, videoPreview: null });
  };

  const resetForm = () => {
    form.imagePreviews?.forEach(p => URL.revokeObjectURL(p));
    clearForm();
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (tip) => {
    setForm({
      category: tip.category || '수업노트',
      title: tip.title || '',
      content: tip.content || '',
      link_url: tip.link_url || '',
      video_url: tip.video_url || '',
      image_urls: getRowImages(tip),
      imageFiles: [],
      imagePreviews: [],
      videoFile: null,
      videoPreview: null,
      is_active: tip.is_active !== false,
      sendPush: false,
    });
    setEditingId(tip.id);
    setShowForm(true);
    setTimeout(() => document.querySelector('.admin-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const submit = async () => {
    if (!form.title.trim()) return toast('제목을 입력해주세요');
    setLoading(true);
    try {
      let imageUrls = form.image_urls || [];
      if ((form.imageFiles?.length || 0) > 0) {
        setUploading(true);
        imageUrls = await persistFormImages(form, 'tip-images');
        setUploading(false);
      }

      // 🎥 영상 처리 (유튜브 URL 또는 파일 업로드)
      let videoUrl = form.video_url;
      if (form.videoFile) {
        setUploading(true);
        if (editingId && form.video_url && !isYouTubeUrl(form.video_url)) await deletePostVideo(form.video_url);
        videoUrl = await uploadPostVideo(form.videoFile);
        setUploading(false);
      }

      const tipData = {
        category: form.category,
        title: form.title.trim(),
        content: form.content.trim() || null,
        link_url: form.link_url.trim() || null,
        video_url: (typeof videoUrl === 'string' ? videoUrl.trim() : videoUrl) || null,
        image_urls: imageUrls,
        image_url: imageUrls[0] || null,
        is_active: form.is_active,
      };
      if (editingId) {
        const { error } = await supabase.from('tips').update(tipData).eq('id', editingId);
        if (error) throw error;
      } else {
        tipData.created_by = user.id;
        const { error } = await supabase.from('tips').insert(tipData);
        if (error) throw error;

        if (form.sendPush) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: `[${form.category}] 새 꿀팁이 올라왔어요!`,
                body: form.title,
                url: '/',
                targetRole: 'student',
              }),
            });
          } catch (e) { console.error('알림 발송 실패:', e); }
        }

        await notifyAdminsOfStaffActivity(user, `수업·꿀팁 등록`, form.title);
      }
      resetForm();
      await load();
    } catch (err) {
      console.error(err);
      toast('저장 실패: ' + err.message);
    }
    setLoading(false);
    setUploading(false);
  };

  const remove = async (tip) => {
    if (!await confirmDialog('이 글을 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('tips').delete().eq('id', tip.id);
    if (error) { toast('삭제 실패: ' + error.message); return; }
    for (const url of getRowImages(tip)) await deleteImageFromBucket(url, 'tip-images');
    if (tip.video_url) await deletePostVideo(tip.video_url);
    await load();
  };

  const toggleActive = async (tip) => {
    const { error } = await supabase.from('tips').update({ is_active: !tip.is_active }).eq('id', tip.id);
    if (error) { toast('변경 실패: ' + error.message); return; }
    await load();
  };

  const categories = ['전체', '수업노트', '시술꿀팁', '운영꿀팁', '기타'];
  const filtered = filter === '전체' ? tips : tips.filter(t => t.category === filter);

  return (
    <>
      <PageIntro ko="수업·꿀팁 관리" en="Tips Admin" />
      <div className="px-5 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-3" style={{ background: COLORS.primary }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.white }}>공개 중</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.white }}>{tips.filter(t => t.is_active).length}</p>
          </div>
          <div className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>숨김</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>{tips.filter(t => !t.is_active).length}</p>
          </div>
        </div>

        {!showForm && (
          <button onClick={() => setShowForm(true)} className="w-full rounded-full py-3 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
            <Plus size={14} strokeWidth={2.5} />새 꿀팁 공유
          </button>
        )}

        {showForm && (
          <div className="rounded-2xl p-4 space-y-3 animate-fade-in admin-edit-form" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base" style={{ color: COLORS.ink }}>{editingId ? '꿀팁 수정' : '새 꿀팁 공유'}</h3>
              <button onClick={resetForm}><X size={18} style={{ color: COLORS.stone }} /></button>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>카테고리 *</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }}>
                <option>수업노트</option><option>시술꿀팁</option><option>운영꿀팁</option><option>기타</option>
              </select>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>제목 *</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                placeholder="예: 엠보 시술 시 통증 줄이는 꿀팁"
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>

            <MultiImageField
              label="사진 (여러 장, 선택)"
              help="16:9 권장"
              value={form}
              onChange={(v) => setForm({ ...form, ...v })}
            />

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>내용</label>
              <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})}
                placeholder="수업 내용이나 꿀팁을 자세히 적어주세요" rows={10}
                className="w-full font-body text-sm font-medium p-3 mt-1 outline-none resize-none rounded leading-relaxed"
                style={{ background: COLORS.cream, color: COLORS.ink }} />
            </div>

            {/* 동영상 (선택) - 파일 업로드 또는 유튜브 URL */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>동영상 (선택)</label>
              <div className="mt-2 space-y-2">
                {form.videoPreview ? (
                  <div className="relative w-full rounded-xl overflow-hidden" style={{ background: '#000' }}>
                    <video src={form.videoPreview} controls className="w-full max-h-64" />
                    <button onClick={removeVideo} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center z-10" style={{ background: 'rgba(0,0,0,0.7)' }}>
                      <X size={14} style={{ color: COLORS.white }} />
                    </button>
                  </div>
                ) : form.video_url && !isYouTubeUrl(form.video_url) ? (
                  <div className="relative w-full rounded-xl overflow-hidden" style={{ background: '#000' }}>
                    <video src={form.video_url} controls className="w-full max-h-64" />
                    <button onClick={() => setForm({ ...form, video_url: '' })} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center z-10" style={{ background: 'rgba(0,0,0,0.7)' }}>
                      <X size={14} style={{ color: COLORS.white }} />
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="w-full rounded-xl flex items-center justify-center gap-2 cursor-pointer py-3" style={{ background: COLORS.cream, border: `2px dashed ${COLORS.light}` }}>
                      <Upload size={18} style={{ color: COLORS.primary }} />
                      <span className="font-heading text-xs" style={{ color: COLORS.ink }}>영상 파일 올리기 (짧은 클립용)</span>
                      <input type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
                    </label>
                    <input type="url" value={isYouTubeUrl(form.video_url) ? form.video_url : ''} onChange={e => setForm({...form, video_url: e.target.value, videoFile: null, videoPreview: null})}
                      placeholder="또는 유튜브 주소 붙여넣기 (긴 영상용)"
                      className="w-full font-body text-sm font-medium border-b py-2 bg-transparent outline-none"
                      style={{ borderColor: COLORS.light, color: COLORS.ink }} />
                  </>
                )}
                <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>짧은 클립은 파일, 긴 영상은 유튜브를 추천해요</p>
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>외부 링크 (선택)</label>
              <input type="url" value={form.link_url} onChange={e => setForm({...form, link_url: e.target.value})}
                placeholder="https://..."
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>

            <label className="flex items-center gap-2 cursor-pointer p-2 rounded" style={{ background: COLORS.cream }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})}
                className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
              <span className="font-body text-xs" style={{ color: COLORS.ink }}>즉시 공개 (체크 해제 시 숨김)</span>
            </label>

            {!editingId && (
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded" style={{ background: COLORS.cream }}>
                <input type="checkbox" checked={form.sendPush} onChange={e => setForm({...form, sendPush: e.target.checked})}
                  className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
                <span className="font-body text-xs" style={{ color: COLORS.ink }}>푸시 알림 발송</span>
              </label>
            )}

            <button onClick={submit} disabled={loading || uploading}
              className="w-full font-heading text-sm py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: COLORS.cardElev, color: COLORS.white }}>
              {(loading || uploading) && <Loader2 size={14} className="animate-spin" />}
              {uploading ? '이미지 업로드 중...' : editingId ? '수정 저장' : '공유하기'}
            </button>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 py-1">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className="shrink-0 px-3 py-1.5 rounded-full font-body text-xs font-semibold"
              style={{
                background: filter === cat ? COLORS.primary : COLORS.card,
                color: filter === cat ? COLORS.white : COLORS.ink,
                border: `1px solid ${filter === cat ? COLORS.primary : COLORS.light}`,
              }}>
              {cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <Sparkles size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>공유된 꿀팁이 없습니다</p>
          </div>
        ) : filtered.map(t => (
          <div key={t.id} onClick={() => startEdit(t)} className="rounded-2xl overflow-hidden cursor-pointer transition-transform active:scale-[0.98]" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}`, opacity: t.is_active ? 1 : 0.6 }}>
            {t.image_url && (
              <div className="aspect-video relative">
                <SkeletonImage src={t.image_url} alt={t.title} className="w-full h-full" />
                <span className="absolute top-2 left-2 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.card, color: COLORS.ink }}>{t.category}</span>
                {!t.is_active && (
                  <span className="absolute top-2 right-2 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.cardElev, color: COLORS.stone }}>숨김</span>
                )}
              </div>
            )}
            <div className="p-3">
              {getRowImages(t).length === 0 && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: COLORS.peach, color: COLORS.deep }}>{t.category}</span>
                  {!t.is_active && <span className="font-mono text-[8px] px-1.5 py-0.5 rounded" style={{ background: COLORS.cardElev, color: COLORS.stone }}>숨김</span>}
                </div>
              )}
              <h4 className="font-heading text-sm" style={{ color: COLORS.ink }}>{t.title}</h4>
              <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>{new Date(t.created_at).toLocaleDateString('ko-KR')}</p>
              {t.content && <p className="font-body text-xs mt-1.5 line-clamp-2" style={{ color: COLORS.stone }}>{t.content}</p>}
              <div onClick={e => e.stopPropagation()} className="flex gap-1 mt-3">
                <button onClick={() => toggleActive(t)} className="flex-1 font-heading text-[10px] py-1.5 rounded-full"
                  style={{ background: t.is_active ? COLORS.cream : COLORS.primary, color: t.is_active ? COLORS.stone : COLORS.white }}>
                  {t.is_active ? '숨김' : '공개'}
                </button>
                <button onClick={() => startEdit(t)} className="flex-1 font-heading text-[10px] py-1.5 rounded-full flex items-center justify-center gap-1"
                  style={{ background: COLORS.cardElev, color: COLORS.white }}>
                  <Edit3 size={10} />수정
                </button>
                <button onClick={() => remove(t)} className="px-2 py-1.5 rounded-full" style={{ background: COLORS.cream }}>
                  <Trash2 size={10} style={{ color: COLORS.deep }} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function AdminNotice({ user, setCurrentPage, setSelectedNotice }) {
  const [notices, setNotices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm, clearForm] = useDraft('notice_form', { 
    title: '', content: '', tag: '안내', urgent: false, sendPush: true,
    image_urls: [], imageFiles: [], imagePreviews: [],
    video_url: '', videoFile: null, videoPreview: null,
  }, ['imageFiles', 'imagePreviews', 'videoFile', 'videoPreview']);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);

  useEffect(() => { 
    load(); 
    loadSubscriberCount();
  }, []);

  const load = async () => {
    const { data } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
    setNotices(data || []);
  };

  const loadSubscriberCount = async () => {
    const { count } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true });
    setSubscriberCount(count || 0);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setForm({ ...form,
      imageFiles: [...form.imageFiles, ...files],
      imagePreviews: [...form.imagePreviews, ...newPreviews],
    });
  };

  const removeNewImage = (i) => {
    if (form.imagePreviews[i]) URL.revokeObjectURL(form.imagePreviews[i]);
    setForm({ ...form,
      imageFiles: form.imageFiles.filter((_, idx) => idx !== i),
      imagePreviews: form.imagePreviews.filter((_, idx) => idx !== i),
    });
  };

  const removeExistingImage = (i) => {
    setForm({ ...form, image_urls: form.image_urls.filter((_, idx) => idx !== i) });
  };

  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast('영상 파일은 50MB까지만 올릴 수 있어요.\n긴 영상은 유튜브에 올린 뒤 링크를 붙여넣어 주세요!\n(저장공간·데이터 절약)');
      return;
    }
    if (form.videoPreview) URL.revokeObjectURL(form.videoPreview);
    setForm({ ...form, videoFile: file, videoPreview: URL.createObjectURL(file), video_url: '' });
  };

  const removeVideo = () => {
    if (form.videoPreview) URL.revokeObjectURL(form.videoPreview);
    setForm({ ...form, videoFile: null, videoPreview: null });
  };

  const uploadNoticeImage = async (file) => {
    const compressed = await compressImage(file, 1600, 0.85);
    const fileExt = compressed.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage.from('notice-images').upload(fileName, compressed);
    if (error) throw error;
    const { data } = supabase.storage.from('notice-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const deleteNoticeImage = async (imageUrl) => {
    if (!imageUrl) return;
    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/notice-images/');
      if (pathParts.length < 2) return;
      await supabase.storage.from('notice-images').remove([pathParts[1]]);
    } catch (e) { console.error('이미지 삭제 에러:', e); }
  };

  const resetForm = () => {
    form.imagePreviews?.forEach(p => URL.revokeObjectURL(p));
    clearForm();
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (notice) => {
    setForm({
      title: notice.title || '',
      content: notice.content || '',
      tag: notice.tag || '안내',
      urgent: notice.urgent || false,
      sendPush: false,
      image_urls: notice.image_urls && notice.image_urls.length ? notice.image_urls : (notice.image_url ? [notice.image_url] : []),
      imageFiles: [],
      imagePreviews: [],
      video_url: notice.video_url || '',
      videoFile: null,
      videoPreview: null,
    });
    setEditingId(notice.id);
    setShowForm(true);
    setTimeout(() => document.querySelector('.admin-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const submit = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      // 여러 이미지 업로드 (기존 유지된 것 + 새로 추가된 것)
      let imageUrls = [...form.image_urls];
      if (form.imageFiles.length > 0) {
        setUploading(true);
        for (const file of form.imageFiles) {
          const url = await uploadNoticeImage(file);
          imageUrls.push(url);
        }
        setUploading(false);
      }

      // 🎥 영상 처리 (유튜브 URL 또는 파일 업로드)
      let videoUrl = form.video_url;
      if (form.videoFile) {
        setUploading(true);
        if (editingId && form.video_url && !isYouTubeUrl(form.video_url)) await deletePostVideo(form.video_url);
        videoUrl = await uploadPostVideo(form.videoFile);
        setUploading(false);
      }

      const noticeData = {
        title: form.title,
        content: form.content,
        tag: form.tag,
        urgent: form.urgent,
        image_urls: imageUrls,
        image_url: imageUrls[0] || null,
        video_url: videoUrl || null,
      };

      if (editingId) {
        const { error } = await supabase.from('notices').update(noticeData).eq('id', editingId);
        if (error) throw error;
        toast('공지 수정 완료!');
      } else {
        noticeData.author_id = user.id;
        const { error: insertError } = await supabase.from('notices').insert(noticeData);
        if (insertError) throw insertError;

        await notifyAdminsOfStaffActivity(user, `공지 등록: ${form.title}`, form.content?.substring(0, 60) || '');

        if (form.sendPush && subscriberCount > 0) {
          const { data: { session } } = await supabase.auth.getSession();
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: `${form.urgent ? '' : ''}[${form.tag}] ${form.title}`,
                body: form.content.substring(0, 100) || '새 공지가 등록되었습니다',
                url: '/',
                targetRole: 'student',
                excludeUserId: user.id,
              }),
            }
          );
          const result = await response.json();
          if (result.sent > 0) {
            toast(`공지 등록 완료!\n${result.sent}명에게 알림 전송됨`);
          } else {
            toast('공지 등록 완료! (알림 전송 실패 또는 구독자 없음)');
          }
        } else {
          toast('공지 등록 완료!');
        }
      }

      resetForm();
      await load();
    } catch (err) {
      console.error(err);
      toast('저장 실패: ' + err.message);
    }
    setLoading(false);
    setUploading(false);
  };

  const remove = async (id, e) => {
    e?.stopPropagation();
    if (!await confirmDialog('정말 삭제하시겠습니까?')) return;
    const notice = notices.find(n => n.id === id);
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (error) { toast('삭제 실패: ' + error.message); return; }
    const imgs = notice?.image_urls && notice.image_urls.length ? notice.image_urls : (notice?.image_url ? [notice.image_url] : []);
    for (const u of imgs) await deleteNoticeImage(u);
    if (notice?.video_url) await deletePostVideo(notice.video_url);
    await load();
  };

  return (
    <>
      <PageIntro ko="학원공지 관리" en="Notice Admin" />
      <div className="px-5 space-y-3">
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="w-full rounded-full py-3 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
            <Plus size={14} strokeWidth={2.5} />새 공지
          </button>
        )}
        {showForm && (
          <div className="rounded-2xl p-4 space-y-3 animate-fade-in admin-edit-form" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base" style={{ color: COLORS.ink }}>{editingId ? '공지 수정' : '새 공지'}</h3>
              <button onClick={resetForm}><X size={18} style={{ color: COLORS.stone }} /></button>
            </div>

            <select value={form.tag} onChange={e => setForm({...form, tag: e.target.value})}
              className="w-full font-body text-xs font-medium border-b py-2 bg-transparent outline-none" style={{ borderColor: COLORS.light, color: COLORS.ink }}>
              <option>필독</option><option>안내</option><option>이벤트</option>
            </select>
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              placeholder="공지 제목" className="w-full font-body text-xs font-medium border-b py-2 bg-transparent outline-none" style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})}
              placeholder="공지 내용" rows={10} className="w-full font-body text-sm font-medium p-3 outline-none resize-none rounded leading-relaxed" style={{ background: COLORS.cream, color: COLORS.ink }} />

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>이미지 (선택, 여러 장 가능)</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {form.image_urls.map((url, i) => (
                  <div key={`ex-${i}`} className="relative aspect-square rounded-xl overflow-hidden" style={{ background: COLORS.cream }}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeExistingImage(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
                      <X size={12} style={{ color: COLORS.white }} />
                    </button>
                  </div>
                ))}
                {form.imagePreviews.map((url, i) => (
                  <div key={`new-${i}`} className="relative aspect-square rounded-xl overflow-hidden" style={{ background: COLORS.cream }}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeNewImage(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
                      <X size={12} style={{ color: COLORS.white }} />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer" style={{ background: COLORS.cream, border: `2px dashed ${COLORS.light}` }}>
                  <Upload size={20} style={{ color: COLORS.stone }} />
                  <span className="font-mono text-[9px] mt-1" style={{ color: COLORS.stone }}>추가</span>
                  <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
                </label>
              </div>
              <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>여러 장 선택 가능 (탭해서 계속 추가)</p>
            </div>

            {/* 동영상 (선택) - 파일 업로드 또는 유튜브 URL */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>동영상 (선택)</label>
              <div className="mt-2 space-y-2">
                {form.videoPreview ? (
                  <div className="relative w-full rounded-xl overflow-hidden" style={{ background: '#000' }}>
                    <video src={form.videoPreview} controls className="w-full max-h-64" />
                    <button onClick={removeVideo} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center z-10" style={{ background: 'rgba(0,0,0,0.7)' }}>
                      <X size={14} style={{ color: COLORS.white }} />
                    </button>
                  </div>
                ) : form.video_url && !isYouTubeUrl(form.video_url) ? (
                  <div className="relative w-full rounded-xl overflow-hidden" style={{ background: '#000' }}>
                    <video src={form.video_url} controls className="w-full max-h-64" />
                    <button onClick={() => setForm({ ...form, video_url: '' })} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center z-10" style={{ background: 'rgba(0,0,0,0.7)' }}>
                      <X size={14} style={{ color: COLORS.white }} />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* 파일 업로드 버튼 */}
                    <label className="w-full rounded-xl flex items-center justify-center gap-2 cursor-pointer py-3" style={{ background: COLORS.cream, border: `2px dashed ${COLORS.light}` }}>
                      <Upload size={18} style={{ color: COLORS.primary }} />
                      <span className="font-heading text-xs" style={{ color: COLORS.ink }}>영상 파일 올리기 (짧은 클립용)</span>
                      <input type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
                    </label>
                    {/* 유튜브 URL */}
                    <input type="url" value={isYouTubeUrl(form.video_url) ? form.video_url : ''} onChange={e => setForm({...form, video_url: e.target.value, videoFile: null, videoPreview: null})}
                      placeholder="또는 유튜브 주소 붙여넣기 (긴 영상용)"
                      className="w-full font-body text-xs font-medium border-b py-2 bg-transparent outline-none" style={{ borderColor: COLORS.light, color: COLORS.ink }} />
                  </>
                )}
                <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>짧은 클립은 파일, 긴 영상은 유튜브를 추천해요</p>
              </div>
            </div>

            <label className="flex items-center gap-2 font-body text-xs" style={{ color: COLORS.stone }}>
              <input type="checkbox" checked={form.urgent} onChange={e => setForm({...form, urgent: e.target.checked})} />
              긴급 공지로 표시
            </label>

            {!editingId && (
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: COLORS.cream }}>
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input type="checkbox" checked={form.sendPush}
                    onChange={e => setForm({...form, sendPush: e.target.checked})}
                    className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
                  <div>
                    <p className="font-heading text-xs flex items-center gap-1.5" style={{ color: COLORS.ink }}>
                      <Bell size={11} strokeWidth={2.5} />
                      푸시 알림 전송
                    </p>
                    <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>
                      {subscriberCount > 0 ? `${subscriberCount}명의 구독자에게 알림 발송` : '아직 구독자가 없습니다'}
                    </p>
                  </div>
                </label>
              </div>
            )}

            <button onClick={submit} disabled={loading || uploading} className="w-full font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-2" style={{ background: COLORS.cardElev, color: COLORS.white }}>
              {(loading || uploading) && <Loader2 size={12} className="animate-spin" />}
              {uploading ? '이미지 업로드 중...' : editingId ? '수정 저장' : '발행'}
            </button>
          </div>
        )}
        {notices.map(n => (
          <div key={n.id} onClick={() => startEdit(n)}
            className="rounded-2xl overflow-hidden cursor-pointer transition-transform active:scale-[0.98]"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            {n.image_url && (
              <div className="aspect-video relative overflow-hidden">
                <SkeletonImage src={n.image_url} alt={n.title} className="w-full h-full" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{
                  background: n.urgent ? COLORS.primary : COLORS.peach,
                  color: n.urgent ? COLORS.white : COLORS.deep
                }}>{n.tag}</span>
                <div onClick={e => e.stopPropagation()} className="flex gap-1">
                  <button onClick={() => startEdit(n)} className="p-1.5 rounded-full" style={{ background: COLORS.cardElev }}>
                    <Edit3 size={11} style={{ color: COLORS.white }} />
                  </button>
                  <button onClick={(e) => remove(n.id, e)} className="p-1.5 rounded-full" style={{ background: COLORS.cream }}>
                    <Trash2 size={12} style={{ color: COLORS.deep }} />
                  </button>
                </div>
              </div>
              <p className="font-heading text-sm" style={{ color: COLORS.ink }}>{n.title}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>{new Date(n.created_at).toLocaleDateString('ko-KR')}</p>
                <div className="flex items-center gap-1 font-mono text-[10px]" style={{ color: COLORS.primary }}>
                  탭해서 수정 <Edit3 size={10} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, profiles:user_id(name, email, phone, avatar_color, avatar_url, course)')
      .order('created_at', { ascending: false });
    if (error) console.error('orders load error:', error);
    setOrders(data || []);
    setLoading(false);
  };

  const moveMonth = (delta) => {
    setSelectedMonth(prev => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      return { year: y, month: m };
    });
  };

  // 선택된 월의 시작/끝
  const monthStart = new Date(selectedMonth.year, selectedMonth.month, 1);
  const monthEnd = new Date(selectedMonth.year, selectedMonth.month + 1, 1);

  const paidOrders = orders.filter(o => o.status === 'paid');
  
  // 선택 월의 주문
  const monthAllOrders = orders.filter(o => {
    const orderDate = new Date(o.paid_at || o.created_at);
    return orderDate >= monthStart && orderDate < monthEnd;
  });
  const monthPaidOrders = monthAllOrders.filter(o => o.status === 'paid');
  const monthCancelledOrders = monthAllOrders.filter(o => o.status === 'cancelled');
  const monthRevenue = monthPaidOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);

  // 이번 달인지 체크 (미래 월 못 가게)
  const now = new Date();
  const isCurrentMonth = selectedMonth.year === now.getFullYear() && selectedMonth.month === now.getMonth();

  // 누적 통계 (전체 기간)
  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
  const cancelledCount = orders.filter(o => o.status === 'cancelled').length;

  // 현재 필터 적용 (선택 월 내에서)
  const filtered = filter === 'all' ? monthAllOrders 
                  : filter === 'paid' ? monthPaidOrders 
                  : monthCancelledOrders;

  const formatPrice = (n) => Number(n || 0).toLocaleString('ko-KR') + '원';

  return (
    <>
      <PageIntro ko="결제 내역" en="Orders" desc="월별 매출을 한눈에" />
      
      <div className="px-5 space-y-3">
        {/* 월 선택 네비게이션 */}
        <div className="rounded-2xl p-3 flex items-center justify-between" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <button onClick={() => moveMonth(-1)} 
            className="w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-90" 
            style={{ background: COLORS.cardElev }}>
            <ChevronLeft size={16} style={{ color: COLORS.ink }} strokeWidth={2.5} />
          </button>
          <div className="text-center">
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>
              {isCurrentMonth ? '━━ THIS MONTH' : '━━ SELECTED'}
            </p>
            <p className="font-display text-lg mt-0.5 tracking-tight" style={{ color: COLORS.ink }}>
              {selectedMonth.year}년 {selectedMonth.month + 1}월
            </p>
          </div>
          <button onClick={() => moveMonth(1)} disabled={isCurrentMonth}
            className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 transition-all active:scale-90"
            style={{ background: COLORS.cardElev }}>
            <ChevronRight size={16} style={{ color: COLORS.ink }} strokeWidth={2.5} />
          </button>
        </div>

        {/* 선택 월 매출 - 강조 카드 */}
        <div className="rounded-2xl p-5 glow-primary" style={{ background: COLORS.primary }}>
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.white, opacity: 0.8 }}>
            {selectedMonth.year}년 {selectedMonth.month + 1}월 매출
          </p>
          <p className="font-display text-3xl mt-2 tracking-tight" style={{ color: COLORS.white }}>
            {formatPrice(monthRevenue)}
          </p>
          <p className="font-serif-italic text-sm mt-1" style={{ color: COLORS.white, opacity: 0.85 }}>{monthPaidOrders.length}건 결제됨</p>
        </div>

        {/* 누적 통계 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>누적 매출</p>
            <p className="font-display text-xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>{formatPrice(totalRevenue)}</p>
          </div>
          <div className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>전체 완료/취소</p>
            <p className="font-display text-xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>
              {paidOrders.length} <span style={{ color: COLORS.stone, fontSize: '14px' }}>/ {cancelledCount}</span>
            </p>
          </div>
        </div>

        {/* 필터 (선택 월 내에서) */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {[
            { id: 'all', label: `전체 ${monthAllOrders.length}` },
            { id: 'paid', label: `완료 ${monthPaidOrders.length}` },
            { id: 'cancelled', label: `취소 ${monthCancelledOrders.length}` },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="font-heading text-xs px-4 py-2 rounded-full whitespace-nowrap transition-transform active:scale-95"
              style={{
                background: filter === f.id ? COLORS.primary : COLORS.card,
                color: filter === f.id ? COLORS.white : COLORS.stone,
                border: filter === f.id ? 'none' : `1px solid ${COLORS.light}`,
                boxShadow: filter === f.id ? '0 0 16px rgba(255, 92, 31, 0.3)' : 'none'
              }}>{f.label}</button>
          ))}
        </div>

        {/* 결제 목록 - 선택 월만 표시 */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <ShoppingBag size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>
              {selectedMonth.year}년 {selectedMonth.month + 1}월에는 결제 내역이 없습니다
            </p>
            <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>← → 화살표로 다른 월을 확인해보세요</p>
          </div>
        ) : filtered.map(o => (
          <div key={o.id} className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            {/* 상단: 학생 + 금액 */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Avatar user={o.profiles || { name: o.buyer_name }} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-sm truncate" style={{ color: COLORS.ink }}>{o.profiles?.name || o.buyer_name || '익명'}</p>
                  <p className="font-mono text-[10px] truncate" style={{ color: COLORS.stone }}>{o.profiles?.email || o.buyer_email || ''}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display text-lg tracking-tight" style={{ 
                  color: o.status === 'paid' ? COLORS.primary : COLORS.stone, 
                  textDecoration: o.status === 'cancelled' ? 'line-through' : 'none' 
                }}>
                  {formatPrice(o.amount)}
                </p>
                <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{
                  background: o.status === 'paid' ? COLORS.primary : COLORS.cream,
                  color: o.status === 'paid' ? COLORS.white : COLORS.stone,
                  border: o.status === 'cancelled' ? `1px solid ${COLORS.muted}` : 'none'
                }}>{o.status === 'paid' ? '완료' : '취소'}</span>
              </div>
            </div>

            {/* 상품 정보 */}
            <div className="rounded-lg p-3" style={{ background: COLORS.cream }}>
              <div className="flex items-center gap-2">
                {o.item_type === 'product' ? (
                  <ShoppingBag size={14} style={{ color: COLORS.primary }} />
                ) : (
                  <BookOpen size={14} style={{ color: COLORS.primary }} />
                )}
                <p className="font-body text-sm flex-1 min-w-0 truncate" style={{ color: COLORS.ink }}>{o.course_title || '상품'}</p>
                <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded shrink-0" style={{ background: COLORS.peach, color: COLORS.deep }}>
                  {o.item_type === 'product' ? '재료샵' : '클래스'}
                </span>
              </div>
            </div>

            {/* 결제 정보 */}
            <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${COLORS.light}` }}>
              <div>
                <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
                  {o.payment_method || '카드'}{o.card_company ? ` · ${o.card_company}` : ''}
                </p>
                <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>
                  {new Date(o.paid_at || o.created_at).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {o.receipt_url && (
                <a href={o.receipt_url} target="_blank" rel="noopener noreferrer"
                  className="font-heading text-[10px] px-3 py-1.5 rounded-full shrink-0"
                  style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
                  영수증 →
                </a>
              )}
            </div>

            {/* 취소 사유 */}
            {o.status === 'cancelled' && o.cancel_reason && (
              <div className="mt-2 p-2 rounded" style={{ background: COLORS.cream }}>
                <p className="font-mono text-[9px]" style={{ color: COLORS.stone }}>취소 사유</p>
                <p className="font-body text-xs mt-0.5" style={{ color: COLORS.ink }}>{o.cancel_reason}</p>
              </div>
            )}

            {/* 연락처 */}
            {(o.profiles?.phone || o.buyer_phone) && (
              <p className="font-mono text-[10px] mt-2" style={{ color: COLORS.stone }}>{o.profiles?.phone || o.buyer_phone}</p>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export function AdminOrdersPage({ user, setCurrentPage }) {
  const PER_PAGE = 30;
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [displayCount, setDisplayCount] = useState(PER_PAGE);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('product-pending');

  const [shippingModal, setShippingModal] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingCompany, setTrackingCompany] = useState('');
  const [shipping, setShipping] = useState(false);
  const [cancelProcessing, setCancelProcessing] = useState(null);  // order_id 저장

  const isRealAdmin = user?.role === 'admin';

  useEffect(() => { setDisplayCount(PER_PAGE); }, [filter]);
  useEffect(() => { loadOrders(); }, [filter, displayCount]);

  const loadOrders = async () => {
    if (displayCount === PER_PAGE) setLoading(true);
    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('status', 'paid')
      .order('paid_at', { ascending: false })
      .range(0, displayCount - 1);

    if (filter === 'product-pending') {
      query = query.eq('item_type', 'product').eq('shipping_status', 'pending');
    } else if (filter === 'product-shipped') {
      query = query.eq('item_type', 'product').eq('shipping_status', 'shipped');
    } else if (filter === 'course') {
      query = query.eq('item_type', 'course');
    } else if (filter === 'cancel-requested') {
      query = query.eq('cancel_status', 'requested');
    } else if (!isRealAdmin) {
      // staff는 'all' 필터에서도 클래스 주문 제외 (배송만 신경)
      query = query.eq('item_type', 'product');
    }

    const { data, error, count } = await query;
    if (error) console.error('주문 로드 에러:', error);
    setOrders(data || []);
    setTotal(count || 0);
    setLoading(false);
  };

  // 취소 요청 승인 — nicepay-cancel Edge Function 호출
  const approveCancel = async (order) => {
    if (!await confirmDialog(`${order.course_title} 주문(₩${Number(order.amount).toLocaleString()})의 취소를 승인하시겠습니까?\n\n나이스페이 결제 취소 API가 호출되어 즉시 환불 처리됩니다.`)) return;
    setCancelProcessing(order.order_id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast('로그인 정보가 만료되었습니다. 다시 로그인해 주세요.');
        setCancelProcessing(null);
        return;
      }
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nicepay-cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.order_id,
          reason: order.cancel_reason_user || '고객 요청',
        }),
      });
      const result = resp.ok ? await resp.json().catch(() => ({})) : await resp.json().catch(() => ({}));
      if (!resp.ok || !result.success) {
        toast('취소 승인 실패: ' + (result.error || resp.statusText));
        setCancelProcessing(null);
        return;
      }
      toast('취소가 처리되었습니다');
    } catch (e) {
      toast('취소 승인 에러: ' + e.message);
    }
    setCancelProcessing(null);
    await loadOrders();
  };

  // 취소 요청 거절
  const rejectCancel = async (order) => {
    if (!await confirmDialog(`${order.course_title} 주문의 취소 요청을 거절하시겠습니까?`)) return;
    setCancelProcessing(order.order_id);
    const { data, error } = await supabase.from('orders').update({
      cancel_status: 'rejected',
    }).eq('order_id', order.order_id).select();
    setCancelProcessing(null);
    if (error) {
      toast('거절 실패: ' + error.message);
      return;
    }
    if (!data || data.length === 0) {
      toast('거절이 적용되지 않았어요. RLS 권한 확인 필요.');
      return;
    }
    toast('취소 요청을 거절했습니다');
    await loadOrders();
  };

  const openShippingModal = (order) => {
    setShippingModal(order);
    setTrackingNumber('');
    setTrackingCompany('');
  };

  const closeShippingModal = () => {
    setShippingModal(null);
    setTrackingNumber('');
    setTrackingCompany('');
  };

  const handleShip = async () => {
    if (!shippingModal) return;
    if (!trackingNumber.trim()) {
      toast('운송장 번호를 입력해주세요.');
      return;
    }
    setShipping(true);
    // 🍊 RLS가 admin/staff UPDATE를 막으면 에러 없이 0 rows로 실패하므로
    //    .select()를 붙여 실제로 영향받은 행이 있는지 검증
    const { data, error } = await supabase.from('orders').update({
      shipping_status: 'shipped',
      shipped_at: new Date().toISOString(),
      shipped_by: user.id,
      tracking_number: trackingNumber.trim(),
      tracking_company: trackingCompany.trim() || null,
    }).eq('order_id', shippingModal.order_id).select();
    setShipping(false);

    if (error) {
      toast('발송 처리 실패: ' + error.message);
      return;
    }
    if (!data || data.length === 0) {
      toast('발송 처리가 적용되지 않았어요.\n\norders 테이블의 RLS 권한(admin/staff UPDATE)을 확인해 주세요.\n(원장님께 orders-update-rls.sql 적용 요청)');
      return;
    }

    closeShippingModal();
    await loadOrders();
    toast('발송 처리 완료');
  };

  const formatPrice = (n) => '₩' + Number(n || 0).toLocaleString('ko-KR');
  const formatDate = (iso) => iso ? new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

  const filters = [
    { id: 'product-pending', label: '배송 대기' },
    { id: 'product-shipped', label: '발송 완료' },
    ...(isRealAdmin ? [{ id: 'course', label: '클래스' }] : []),
    ...(isRealAdmin ? [{ id: 'cancel-requested', label: '취소 요청' }] : []),
    { id: 'all', label: '전체' },
  ];

  return (
    <>
      <PageIntro ko="주문 관리" en="Orders" desc={isRealAdmin ? '결제 내역과 배송 상태를 관리해요' : '재료 배송을 처리해요'} />

      {/* 필터 탭 */}
      <div className="px-5 mb-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`shrink-0 px-4 py-2 rounded-full font-body text-xs font-semibold transition-transform active:scale-95 ${filter === f.id ? 'glow-soft' : ''}`}
              style={{
                background: filter === f.id ? COLORS.primary : COLORS.card,
                color: filter === f.id ? COLORS.white : COLORS.stone,
                border: `1px solid ${filter === f.id ? COLORS.primary : COLORS.light}`,
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 카운트 */}
      <div className="px-5 mb-4">
        <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>총 {total}건</p>
      </div>

      {/* 목록 */}
      <div className="px-5 space-y-3 pb-6">
        {loading ? (
          <div className="text-center py-10">
            <Loader2 size={20} className="animate-spin mx-auto" style={{ color: COLORS.primary }} />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-10">
            <Package size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>해당 조건의 주문이 없어요</p>
          </div>
        ) : orders.map(o => {
          const isProduct = o.item_type === 'product';
          const isShipped = o.shipping_status === 'shipped';
          const isDelivered = o.shipping_status === 'delivered';
          return (
            <div key={o.id} className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
              {/* 헤더: 타입 + 발송 상태 */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded inline-flex items-center gap-1"
                  style={{ background: COLORS.peach, color: COLORS.deep }}>
                  {isProduct ? <><Package size={10} />재료</> : <><BookOpen size={10} />클래스</>}
                </span>
                {isProduct && (
                  <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded"
                    style={{
                      background: isShipped || isDelivered ? COLORS.primary : COLORS.cardElev,
                      color: isShipped || isDelivered ? COLORS.white : COLORS.stone,
                    }}>
                    {isDelivered ? '배송 완료' : isShipped ? '발송 완료' : '배송 대기'}
                  </span>
                )}
              </div>

              {/* 상품명 + 주문번호 */}
              <div className="mb-3">
                <p className="font-heading text-sm" style={{ color: COLORS.ink }}>{o.course_title || '-'}</p>
                <p className="font-mono text-[10px] mt-1 truncate" style={{ color: COLORS.muted }}>
                  주문 {o.order_id?.substring(0, 20)}...
                </p>
              </div>

              {/* 구매자 정보 */}
              <div className="rounded-lg p-3 space-y-1.5" style={{ background: COLORS.cream }}>
                <div className="flex justify-between">
                  <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>구매자</span>
                  <span className="font-body text-xs font-semibold" style={{ color: COLORS.ink }}>{o.buyer_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>연락처</span>
                  <span className="font-body text-xs font-semibold" style={{ color: COLORS.ink }}>{o.buyer_phone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>결제일</span>
                  <span className="font-mono text-[10px]" style={{ color: COLORS.ink }}>{formatDate(o.paid_at || o.created_at)}</span>
                </div>
              </div>

              {/* 결제 정보 (admin만) */}
              {isRealAdmin && (
                <div className="rounded-lg p-3 mt-2 space-y-1.5" style={{ background: COLORS.cardElev, border: `1px solid ${COLORS.light}` }}>
                  <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ 결제 정보</p>
                  <div className="flex justify-between">
                    <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>금액</span>
                    <span className="font-body text-sm font-bold" style={{ color: COLORS.primary }}>{formatPrice(o.amount)}</span>
                  </div>
                  {(o.payment_method || o.card_company) && (
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>결제수단</span>
                      <span className="font-body text-xs" style={{ color: COLORS.ink }}>
                        {o.payment_method || '카드'}{o.card_company ? ` · ${o.card_company}` : ''}
                      </span>
                    </div>
                  )}
                  {o.receipt_url && (
                    <div className="pt-1">
                      <a href={o.receipt_url} target="_blank" rel="noopener noreferrer"
                        className="font-heading text-[10px] px-3 py-1.5 rounded-full inline-block"
                        style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
                        영수증 →
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* 배송 정보 (재료) */}
              {isProduct && (
                <div className="rounded-lg p-3 mt-2 space-y-1.5" style={{ background: COLORS.cardElev, border: `1px solid ${COLORS.light}` }}>
                  <p className="font-mono text-[10px] font-bold tracking-widest uppercase inline-flex items-center gap-1" style={{ color: COLORS.primary }}>
                    <Package size={10} />━━ 배송 정보
                  </p>
                  <div className="flex justify-between">
                    <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>받는분</span>
                    <span className="font-body text-xs font-semibold" style={{ color: COLORS.ink }}>{o.shipping_recipient_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>연락처</span>
                    <span className="font-body text-xs font-semibold" style={{ color: COLORS.ink }}>{o.shipping_recipient_phone || '-'}</span>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] mb-0.5" style={{ color: COLORS.stone }}>주소</p>
                    <p className="font-body text-xs" style={{ color: COLORS.ink }}>
                      {o.shipping_postal_code ? `(${o.shipping_postal_code}) ` : ''}{o.shipping_address || '-'}
                    </p>
                    {o.shipping_address_detail && (
                      <p className="font-body text-xs" style={{ color: COLORS.ink }}>{o.shipping_address_detail}</p>
                    )}
                  </div>
                  {o.shipping_memo && (
                    <div>
                      <p className="font-mono text-[10px] mb-0.5" style={{ color: COLORS.stone }}>배송 메모</p>
                      <p className="font-body text-xs" style={{ color: COLORS.ink, whiteSpace: 'pre-wrap' }}>{o.shipping_memo}</p>
                    </div>
                  )}

                  {/* 발송 정보 표시 (shipped/delivered) */}
                  {(isShipped || isDelivered) && (
                    <div className="pt-2 mt-2 space-y-1" style={{ borderTop: `1px solid ${COLORS.light}` }}>
                      <p className="font-mono text-[10px] font-bold tracking-widest uppercase inline-flex items-center gap-1" style={{ color: COLORS.primary }}>
                        <Truck size={10} />━━ 발송 정보
                      </p>
                      {o.tracking_company && (
                        <div className="flex justify-between">
                          <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>택배사</span>
                          <span className="font-body text-xs font-semibold" style={{ color: COLORS.ink }}>{o.tracking_company}</span>
                        </div>
                      )}
                      {o.tracking_number && (
                        <div className="flex justify-between">
                          <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>운송장</span>
                          <span className="font-mono text-xs" style={{ color: COLORS.ink }}>{o.tracking_number}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>발송일</span>
                        <span className="font-mono text-[10px]" style={{ color: COLORS.ink }}>{formatDate(o.shipped_at)}</span>
                      </div>
                    </div>
                  )}

                  {/* 발송 처리 버튼 (pending) */}
                  {o.shipping_status === 'pending' && (
                    <button onClick={() => openShippingModal(o)}
                      className="w-full mt-2 rounded-full py-3 font-heading text-xs flex items-center justify-center gap-2"
                      style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 16px rgba(255,92,31,0.35)' }}>
                      <Package size={14} strokeWidth={2.5} />발송 처리하기
                    </button>
                  )}
                </div>
              )}

              {/* 취소 요청 처리 (admin만, cancel_status='requested') */}
              {isRealAdmin && o.cancel_status === 'requested' && (
                <div className="rounded-lg p-3 mt-2 space-y-2" style={{ background: COLORS.peach, border: `1px solid ${COLORS.primary}` }}>
                  <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.deep }}>━━ 취소 요청</p>
                  <div>
                    <p className="font-mono text-[10px]" style={{ color: COLORS.deep, opacity: 0.7 }}>학생이 적은 사유</p>
                    <p className="font-body text-xs mt-1" style={{ color: COLORS.deep, whiteSpace: 'pre-wrap' }}>{o.cancel_reason_user || '-'}</p>
                  </div>
                  {o.cancel_requested_at && (
                    <p className="font-mono text-[10px]" style={{ color: COLORS.deep, opacity: 0.7 }}>요청 시각: {formatDate(o.cancel_requested_at)}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => rejectCancel(o)} disabled={cancelProcessing === o.order_id}
                      className="flex-1 rounded-full py-2.5 font-heading text-xs"
                      style={{ background: COLORS.card, color: COLORS.stone, border: `1px solid ${COLORS.light}` }}>
                      거절
                    </button>
                    <button onClick={() => approveCancel(o)} disabled={cancelProcessing === o.order_id}
                      className="flex-1 rounded-full py-2.5 font-heading text-xs flex items-center justify-center gap-1.5"
                      style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 12px rgba(255,92,31,0.4)' }}>
                      {cancelProcessing === o.order_id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />}
                      승인 (환불)
                    </button>
                  </div>
                </div>
              )}

              {/* 취소 거절됨 표시 */}
              {isRealAdmin && o.cancel_status === 'rejected' && (
                <div className="rounded-lg p-3 mt-2" style={{ background: COLORS.cardElev, border: `1px solid ${COLORS.light}` }}>
                  <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>━━ 취소 요청 거절됨</p>
                  {o.cancel_reason_user && (
                    <p className="font-body text-xs mt-1" style={{ color: COLORS.muted }}>학생 사유: {o.cancel_reason_user}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!loading && total > orders.length && (
          <button onClick={() => setDisplayCount(n => n + PER_PAGE)}
            className="w-full rounded-full py-3 font-heading text-xs flex items-center justify-center gap-2"
            style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
            더 보기 ({total - orders.length}건 남음) <ChevronRight size={12} />
          </button>
        )}
      </div>

      {/* 발송 처리 모달 — Portal + 풀스크린 + 스티키 푸터
          부모 <main>의 transform이 fixed containing block을 만들어 모달이 갇히는 문제 + 모바일 키보드가 떴을 때 푸터 버튼이 가려지는 문제를 동시에 해결. */}
      {shippingModal && createPortal(
        <div style={{
          position: 'fixed', inset: 0, background: COLORS.cream, zIndex: 9999,
          display: 'flex', flexDirection: 'column'
        }}>
          {/* 헤더 (고정) */}
          <div style={{
            flexShrink: 0, padding: '12px 16px',
            paddingTop: 'max(12px, env(safe-area-inset-top))',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: `1px solid ${COLORS.light}`, background: COLORS.card
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.ink, margin: 0, fontFamily: 'Pretendard, sans-serif' }}>발송 처리</h3>
            <button onClick={closeShippingModal}
              style={{ width: 36, height: 36, border: 'none', background: 'transparent', color: COLORS.stone, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} />
            </button>
          </div>

          {/* 본문 (스크롤) */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            <div className="rounded-lg p-3 mb-4" style={{ background: COLORS.cardElev, border: `1px solid ${COLORS.light}` }}>
              <p className="font-body text-xs" style={{ color: COLORS.ink }}>{shippingModal.course_title}</p>
              <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>
                받는분: {shippingModal.shipping_recipient_name || '-'} · {shippingModal.shipping_recipient_phone || '-'}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>택배사 (선택)</label>
                <input type="text" value={trackingCompany} onChange={(e) => setTrackingCompany(e.target.value)}
                  placeholder="예: CJ대한통운 / 롯데택배 / 한진택배"
                  className="w-full font-body text-sm p-3 mt-1 outline-none rounded"
                  style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>운송장 번호 *</label>
                <input type="text" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="운송장 번호 입력"
                  className="w-full font-body text-sm p-3 mt-1 outline-none rounded"
                  style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
              </div>
            </div>
          </div>

          {/* 푸터 (스티키) — safe-area-inset-bottom 반영해서 키보드/홈인디케이터와 충돌 방지 */}
          <div style={{
            flexShrink: 0, padding: 16,
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            borderTop: `1px solid ${COLORS.light}`, background: COLORS.card,
            display: 'flex', gap: 8
          }}>
            <button onClick={closeShippingModal} disabled={shipping}
              className="flex-1 rounded-full py-3 font-heading text-sm"
              style={{ background: COLORS.cardElev, color: COLORS.stone, border: `1px solid ${COLORS.light}` }}>
              취소
            </button>
            <button onClick={handleShip} disabled={shipping}
              className="flex-1 rounded-full py-3 font-heading text-sm flex items-center justify-center gap-2"
              style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 16px rgba(255,92,31,0.35)' }}>
              {shipping ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.5} />}
              발송 확정
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export function PracticeAdminPage({ user, setCurrentPage }) {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [slots, setSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('16:00');
  const [capacity, setCapacity] = useState(2);
  const [memo, setMemo] = useState('');
  const [adding, setAdding] = useState(false);

  const [bookersModal, setBookersModal] = useState(null);  // { slot, bookers }
  const [bookerCounts, setBookerCounts] = useState({});  // slot_id → count

  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtDate = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;

  const loadMonth = async () => {
    setLoading(true);
    const { year: y, month: m } = viewMonth;
    const first = fmtDate(y, m, 1);
    const last = fmtDate(y, m, new Date(y, m + 1, 0).getDate());
    const { data: s } = await supabase.from('practice_slots')
      .select('*')
      .gte('slot_date', first).lte('slot_date', last)
      .order('slot_date').order('start_time');
    setSlots(s || []);

    const slotIds = (s || []).map(x => x.id);
    if (slotIds.length) {
      const { data: bk } = await supabase.from('practice_bookings')
        .select('slot_id').eq('status', 'booked').in('slot_id', slotIds);
      const counts = {};
      (bk || []).forEach(b => { counts[b.slot_id] = (counts[b.slot_id] || 0) + 1; });
      setBookerCounts(counts);
    } else {
      setBookerCounts({});
    }
    setLoading(false);
  };

  useEffect(() => { loadMonth(); }, [viewMonth.year, viewMonth.month]);

  const moveMonth = (delta) => {
    setSelectedDate(null);
    setViewMonth(prev => {
      let m = prev.month + delta, y = prev.year;
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      return { year: y, month: m };
    });
  };

  const addSlot = async () => {
    if (!selectedDate) { toast('날짜를 선택해주세요'); return; }
    if (startTime >= endTime) { toast('종료 시간이 시작 시간보다 늦어야 합니다'); return; }
    const cap = Number(capacity);
    if (!cap || cap < 1) { toast('정원은 1명 이상이어야 합니다'); return; }
    setAdding(true);
    const { data, error } = await supabase.from('practice_slots').insert({
      slot_date: selectedDate,
      start_time: startTime,
      end_time: endTime,
      capacity: cap,
      memo: memo.trim() || null,
      created_by: user.id,
    }).select();
    setAdding(false);
    if (error) { toast('슬롯 추가 실패: ' + error.message); return; }
    if (!data || data.length === 0) {
      toast('슬롯 추가가 적용되지 않았어요. RLS(practice_slots manage 정책) 확인 필요.');
      return;
    }
    setShowAddModal(false);
    setMemo('');
    await loadMonth();
  };

  const deleteSlot = async (slot) => {
    const count = bookerCounts[slot.id] || 0;
    const msg = count > 0
      ? `이 슬롯에 예약자가 ${count}명 있어요.\n슬롯을 삭제하면 예약도 함께 삭제됩니다.\n그래도 삭제할까요?`
      : '이 슬롯을 삭제할까요?';
    if (!await confirmDialog(msg)) return;
    const { data, error } = await supabase.from('practice_slots').delete().eq('id', slot.id).select();
    if (error) { toast('삭제 실패: ' + error.message); return; }
    if (!data || data.length === 0) {
      toast('삭제가 적용되지 않았어요. RLS 확인 필요.');
      return;
    }
    await loadMonth();
  };

  const viewBookers = async (slot) => {
    const { data } = await supabase.from('practice_bookings')
      .select('user_id, created_at, profile:user_id(name, phone, avatar_color, avatar_url)')
      .eq('slot_id', slot.id).eq('status', 'booked')
      .order('created_at');
    setBookersModal({ slot, bookers: data || [] });
  };

  // 달력 그리드
  const { year: y, month: m } = viewMonth;
  const firstDayWeek = new Date(y, m, 1).getDay();  // 0=일
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const slotsByDate = {};
  slots.forEach(s => {
    if (!slotsByDate[s.slot_date]) slotsByDate[s.slot_date] = [];
    slotsByDate[s.slot_date].push(s);
  });
  const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];

  const daySlots = selectedDate ? (slotsByDate[selectedDate] || []) : [];

  return (
    <>
      <PageIntro ko="연습 베드 관리" en="Practice Admin" desc="연습 가능 시간을 열고 예약자를 관리하세요" />

      <div className="px-5 space-y-3 pb-6">
        {/* 월 네비게이션 */}
        <div className="rounded-2xl p-3 flex items-center justify-between" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <button onClick={() => moveMonth(-1)} className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90" style={{ background: COLORS.cardElev }}>
            <ChevronLeft size={16} style={{ color: COLORS.ink }} strokeWidth={2.5} />
          </button>
          <div className="text-center">
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ {y}</p>
            <p className="font-display text-lg mt-0.5 tracking-tight" style={{ color: COLORS.ink }}>{m + 1}월</p>
          </div>
          <button onClick={() => moveMonth(1)} className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90" style={{ background: COLORS.cardElev }}>
            <ChevronRight size={16} style={{ color: COLORS.ink }} strokeWidth={2.5} />
          </button>
        </div>

        {/* 달력 */}
        <div className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          {loading && <div className="text-center py-4"><Loader2 size={16} className="animate-spin mx-auto" style={{ color: COLORS.primary }} /></div>}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayLabels.map((d, i) => (
              <div key={d} className="text-center font-mono text-[10px] font-bold py-1.5" style={{ color: i === 0 ? COLORS.primary : i === 6 ? COLORS.stone : COLORS.muted }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayWeek }).map((_, i) => <div key={`b-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const dateStr = fmtDate(y, m, d);
              const hasSlots = !!slotsByDate[dateStr];
              const isSelected = selectedDate === dateStr;
              return (
                <button key={d} onClick={() => setSelectedDate(dateStr)}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center transition-transform active:scale-95"
                  style={{
                    background: isSelected ? COLORS.primary : hasSlots ? COLORS.cardElev : 'transparent',
                    border: isSelected ? `1px solid ${COLORS.primary}` : `1px solid ${COLORS.light}`,
                  }}>
                  <span className="font-body text-sm" style={{ color: isSelected ? COLORS.white : COLORS.ink, fontWeight: hasSlots ? 700 : 400 }}>{d}</span>
                  {hasSlots && (
                    <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: isSelected ? COLORS.white : COLORS.primary }}></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 선택 날짜 영역 */}
        {selectedDate && (
          <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ Selected</p>
                <p className="font-heading text-base mt-1" style={{ color: COLORS.ink }}>{selectedDate}</p>
              </div>
              <button onClick={() => setShowAddModal(true)}
                className="font-heading text-xs px-4 py-2 rounded-full inline-flex items-center gap-1.5"
                style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 16px rgba(255,92,31,0.35)' }}>
                <Plus size={12} strokeWidth={2.5} />연습 시간 추가
              </button>
            </div>

            {daySlots.length === 0 ? (
              <p className="font-body text-xs text-center py-6" style={{ color: COLORS.stone }}>등록된 슬롯이 없어요</p>
            ) : (
              <div className="space-y-2">
                {daySlots.map(s => {
                  const count = bookerCounts[s.id] || 0;
                  const full = count >= s.capacity;
                  return (
                    <div key={s.id} className="rounded-lg p-3" style={{ background: COLORS.cardElev, border: `1px solid ${COLORS.light}` }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-heading text-sm inline-flex items-center gap-1.5" style={{ color: COLORS.ink }}>
                            <Clock size={12} style={{ color: COLORS.primary }} />
                            {(s.start_time || '').substring(0, 5)} ~ {(s.end_time || '').substring(0, 5)}
                          </p>
                          <p className="font-mono text-[10px] mt-1" style={{ color: full ? COLORS.primary : COLORS.stone }}>
                            예약 {count}/{s.capacity}{full && ' · 마감'}
                          </p>
                          {s.memo && <p className="font-body text-xs mt-1" style={{ color: COLORS.stone }}>{s.memo}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2 pt-2" style={{ borderTop: `1px solid ${COLORS.light}` }}>
                        <button onClick={() => viewBookers(s)}
                          className="flex-1 font-heading text-[11px] py-2 rounded-full inline-flex items-center justify-center gap-1.5"
                          style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
                          <Users size={12} />예약자 {count}명
                        </button>
                        <button onClick={() => deleteSlot(s)}
                          className="font-heading text-[11px] px-4 py-2 rounded-full inline-flex items-center justify-center gap-1"
                          style={{ background: COLORS.card, color: COLORS.stone, border: `1px solid ${COLORS.light}` }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 슬롯 추가 모달 */}
      {showAddModal && createPortal(
        <div style={{
          position: 'fixed', inset: 0, background: COLORS.cream, zIndex: 9999,
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{
            flexShrink: 0, padding: '12px 16px',
            paddingTop: 'max(12px, env(safe-area-inset-top))',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: `1px solid ${COLORS.light}`, background: COLORS.card
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.ink, margin: 0, fontFamily: 'Pretendard, sans-serif' }}>연습 시간 추가</h3>
            <button onClick={() => setShowAddModal(false)}
              style={{ width: 36, height: 36, border: 'none', background: 'transparent', color: COLORS.stone, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            <div className="rounded-lg p-3 mb-4" style={{ background: COLORS.cardElev, border: `1px solid ${COLORS.light}` }}>
              <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>날짜</p>
              <p className="font-heading text-sm mt-1" style={{ color: COLORS.ink }}>{selectedDate}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>시작 시간</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="w-full font-body text-sm p-3 mt-1.5 outline-none rounded"
                  style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>종료 시간</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="w-full font-body text-sm p-3 mt-1.5 outline-none rounded"
                  style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
              </div>
            </div>
            <div className="mb-3">
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>정원 (명)</label>
              <input type="number" min="1" max="10" value={capacity} onChange={(e) => setCapacity(e.target.value)}
                className="w-full font-body text-sm p-3 mt-1.5 outline-none rounded"
                style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
            </div>
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>메모 (선택)</label>
              <textarea value={memo} onChange={(e) => setMemo(e.target.value)}
                placeholder="예: 1번 베드, 강의실 1"
                rows={3}
                className="w-full font-body text-sm p-3 mt-1.5 outline-none resize-none rounded"
                style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
            </div>
          </div>
          <div style={{
            flexShrink: 0, padding: 16,
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            borderTop: `1px solid ${COLORS.light}`, background: COLORS.card,
            display: 'flex', gap: 8
          }}>
            <button onClick={() => setShowAddModal(false)} disabled={adding}
              className="flex-1 rounded-full py-3 font-heading text-sm"
              style={{ background: COLORS.cardElev, color: COLORS.stone, border: `1px solid ${COLORS.light}` }}>
              취소
            </button>
            <button onClick={addSlot} disabled={adding}
              className="flex-1 rounded-full py-3 font-heading text-sm flex items-center justify-center gap-2"
              style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 16px rgba(255,92,31,0.35)' }}>
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={2.5} />}
              추가
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* 예약자 명단 모달 */}
      {bookersModal && createPortal(
        <div onClick={() => setBookersModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 480, maxHeight: '85vh', background: COLORS.card, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${COLORS.light}` }}>
              <div>
                <h3 className="font-heading text-base" style={{ color: COLORS.ink }}>예약자 명단</h3>
                <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>{bookersModal.slot.slot_date} · {(bookersModal.slot.start_time || '').substring(0, 5)} ~ {(bookersModal.slot.end_time || '').substring(0, 5)}</p>
              </div>
              <button onClick={() => setBookersModal(null)}><X size={18} style={{ color: COLORS.stone }} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {bookersModal.bookers.length === 0 ? (
                <p className="font-body text-sm text-center py-6" style={{ color: COLORS.stone }}>아직 예약자가 없어요</p>
              ) : (
                <div className="space-y-2">
                  {bookersModal.bookers.map((b, i) => (
                    <div key={b.user_id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: COLORS.cardElev }}>
                      <Avatar user={b.profile || { name: '?' }} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-heading text-sm truncate" style={{ color: COLORS.ink }}>{b.profile?.name || '익명'}</p>
                        {b.profile?.phone && <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>{b.profile.phone}</p>}
                      </div>
                      <span className="font-mono text-[10px]" style={{ color: COLORS.muted }}>#{i + 1}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export function AdminApprovals({ user }) {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setAllUsers(data || []);
    setLoading(false);
  };

  const approve = async (userId, asGraduate = false) => {
    const msg = asGraduate 
      ? '졸업생으로 승인하시겠습니까?\n온보딩 미션이 면제됩니다.' 
      : '이 회원을 일반 학생으로 승인하시겠습니까?\n온보딩 미션을 받게 됩니다.';
    if (!await confirmDialog(msg)) return;
    
    const updates = {
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      rejected_reason: null,
      is_graduate: asGraduate,
    };
    
    if (asGraduate) {
      // 졸업생 승인 = 영상 미션만 면제 (인사/후기는 작성해야 함)
      updates.onb_video = true;
      // onb_greeting, onb_review는 false 유지 (작성 필수)
    }
    
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) {
      toast('승인 실패: ' + error.message);
    } else {
      await load();
    }
  };

  const reject = async (userId) => {
    const reason = prompt('거절 사유를 입력하세요 (선택, 빈칸 가능):');
    if (reason === null) return;
    const { error } = await supabase.from('profiles').update({
      status: 'rejected',
      rejected_reason: reason || null,
    }).eq('id', userId);
    if (error) {
      toast('거절 실패: ' + error.message);
    } else {
      await load();
    }
  };

  const revoke = async (userId) => {
    if (!await confirmDialog('이 회원의 승인을 취소하시겠습니까?\n승인 대기 상태로 돌아갑니다.')) return;
    const { error } = await supabase.from('profiles').update({ status: 'pending' }).eq('id', userId);
    if (error) { toast('승인 취소 실패: ' + error.message); return; }
    await load();
  };

  const filtered = allUsers.filter(u => u.status === filter);
  const counts = {
    pending: allUsers.filter(u => u.status === 'pending').length,
    approved: allUsers.filter(u => u.status === 'approved').length,
    rejected: allUsers.filter(u => u.status === 'rejected').length,
  };

  return (
    <>
      <PageIntro ko="가입 승인" en="Approvals" desc="신규 회원을 검토하세요" />
      
      <div className="px-5 space-y-3">
        {/* 통계 + 필터 */}
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => setFilter('pending')} 
            className={`rounded-2xl p-3 text-left transition-transform active:scale-95 ${filter === 'pending' ? 'glow-primary' : ''}`}
            style={{ background: filter === 'pending' ? COLORS.primary : COLORS.card, border: filter === 'pending' ? 'none' : `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: filter === 'pending' ? COLORS.white : COLORS.stone }}>대기</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: filter === 'pending' ? COLORS.white : COLORS.ink }}>{counts.pending}</p>
          </button>
          <button onClick={() => setFilter('approved')}
            className="rounded-2xl p-3 text-left transition-transform active:scale-95"
            style={{ background: COLORS.card, border: `1px solid ${filter === 'approved' ? COLORS.primary : COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>승인</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>{counts.approved}</p>
          </button>
          <button onClick={() => setFilter('rejected')}
            className="rounded-2xl p-3 text-left transition-transform active:scale-95"
            style={{ background: COLORS.card, border: `1px solid ${filter === 'rejected' ? COLORS.primary : COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>거절</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>{counts.rejected}</p>
          </button>
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <UserCheck size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>
              {filter === 'pending' ? '대기 중인 가입 신청이 없습니다' : filter === 'approved' ? '승인된 회원이 없습니다' : '거절된 회원이 없습니다'}
            </p>
          </div>
        ) : filtered.map(u => (
          <div key={u.id} className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-start gap-3">
              <Avatar user={u} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-heading text-sm" style={{ color: COLORS.ink }}>{u.name}</p>
                  {u.role === 'admin' && (
                    <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: COLORS.primary, color: COLORS.white }}>ADMIN</span>
                  )}
                </div>
                <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>{u.email}</p>
                {u.phone && <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>{u.phone}</p>}
                <p className="font-body text-xs mt-1" style={{ color: COLORS.primary }}>{u.course}</p>
                <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>가입: {new Date(u.created_at).toLocaleDateString('ko-KR')}</p>
                
                {/* 졸업생 신청 표시 */}
                {u.is_graduate && u.status === 'pending' && (
                  <div className="mt-2 p-2 rounded flex items-center gap-2" style={{ background: 'rgba(255,92,31,0.1)', border: `1px solid ${COLORS.primary}` }}>
                    <span className="text-base"></span>
                    <p className="font-body text-xs font-semibold" style={{ color: COLORS.primary }}>
                      졸업생이라고 신청했어요!<br/>
                      <span className="font-mono text-[10px] font-normal" style={{ color: COLORS.deep }}>맞으면 "졸업생 승인" 눌러주세요</span>
                    </p>
                  </div>
                )}
                
                {/* 졸업생 표시 (승인 후) */}
                {u.is_graduate && u.status === 'approved' && (
                  <div className="mt-2 p-2 rounded flex items-center gap-2" style={{ background: 'rgba(255,92,31,0.08)' }}>
                    <span className="text-sm"></span>
                    <p className="font-mono text-[10px] font-bold" style={{ color: COLORS.primary }}>졸업생 (미션 면제)</p>
                  </div>
                )}
                
                {u.rejected_reason && (
                  <div className="mt-2 p-2 rounded" style={{ background: COLORS.cream }}>
                    <p className="font-mono text-[9px]" style={{ color: COLORS.stone }}>거절 사유</p>
                    <p className="font-body text-xs mt-0.5" style={{ color: COLORS.ink }}>{u.rejected_reason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex flex-col gap-2 mt-3">
              {u.status === 'pending' && (
                <>
                  <div className="flex gap-2">
                    <button onClick={() => approve(u.id, false)}
                      className="flex-1 font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-1"
                      style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 16px rgba(255, 92, 31, 0.4)' }}>
                      <Check size={12} strokeWidth={3} />일반 승인
                    </button>
                    <button onClick={() => reject(u.id)}
                      className="flex-1 font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-1"
                      style={{ background: COLORS.cream, color: COLORS.deep, border: `1px solid ${COLORS.light}` }}>
                      <X size={12} strokeWidth={3} />거절
                    </button>
                  </div>
                  {/* 졸업생 승인 (별도 버튼) */}
                  <button onClick={() => approve(u.id, true)}
                    className="w-full font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-1.5"
                    style={{ background: COLORS.cardElev, color: COLORS.primary, border: `1px solid ${COLORS.primary}` }}>
                    졸업생으로 승인 (미션 면제)
                  </button>
                </>
              )}
              {u.status === 'approved' && u.role !== 'admin' && (
                <button onClick={() => revoke(u.id)}
                  className="flex-1 font-heading text-xs py-2 rounded-full"
                  style={{ background: COLORS.cream, color: COLORS.stone, border: `1px solid ${COLORS.light}` }}>
                  승인 취소
                </button>
              )}
              {u.status === 'rejected' && (
                <button onClick={() => approve(u.id)}
                  className="flex-1 font-heading text-xs py-2 rounded-full flex items-center justify-center gap-1"
                  style={{ background: COLORS.cardElev, color: COLORS.white }}>
                  <Check size={12} strokeWidth={3} />다시 승인
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function AdminStudentDetail({ student, setCurrentPage, canViewRevenue }) {
  const [cases, setCases] = useState([]);
  const [posts, setPosts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const toggleSuspend = async () => {
    const isSuspended = student.status === 'suspended';
    const msg = isSuspended
      ? `${student.name}님의 정지를 해제하시겠습니까?`
      : `${student.name}님의 계정을 정지하시겠습니까?\n\n정지된 사용자는 로그인 시 정지 화면이 표시되어 앱을 사용할 수 없어요.`;
    
    if (!await confirmDialog(msg)) return;
    
    let reason = null;
    if (!isSuspended) {
      reason = prompt('정지 사유 (선택사항, 사용자에게 표시됨)');
      if (reason === null) return;
    }
    
    setUpdating(true);
    const { error } = await supabase.from('profiles').update({
      status: isSuspended ? 'approved' : 'suspended',
      suspended_reason: isSuspended ? null : (reason || null)
    }).eq('id', student.id);
    
    if (error) {
      toast('변경 실패: ' + error.message);
    } else {
      toast(isSuspended ? '정지가 해제되었습니다' : '계정이 정지되었습니다');
      setCurrentPage('admin-students');
    }
    setUpdating(false);
  };

  const toggleStaff = async () => {
    const newRole = student.role === 'staff' ? 'student' : 'staff';
    const msg = newRole === 'staff' 
      ? `${student.name}님을 운영진으로 임명하시겠습니까?\n\n운영진은 매출을 제외한 모든 관리 기능을 사용할 수 있어요.`
      : `${student.name}님의 운영진 권한을 해제하시겠습니까?\n\n다시 일반 수강생으로 돌아갑니다.`;
    
    if (!await confirmDialog(msg)) return;
    setUpdating(true);
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', student.id);
    if (error) {
      toast('변경 실패: ' + error.message);
    } else {
      // 📢 임명된 본인에게 알림
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: newRole === 'staff' ? '운영진으로 임명되었어요!' : '운영진 권한이 해제되었어요',
            body: newRole === 'staff' 
              ? '이제 관리자 메뉴를 사용할 수 있어요. 환영합니다!' 
              : '일반 수강생으로 돌아갔어요.',
            url: '/',
            targetUserId: student.id,
          }),
        });
      } catch (e) { console.error('알림 발송 실패:', e); }

      toast(newRole === 'staff' ? '운영진으로 임명되었습니다' : '운영진 권한이 해제되었습니다');
      setCurrentPage('admin-students');
    }
    setUpdating(false);
  };

  useEffect(() => {
    if (!student?.id) return;
    const load = async () => {
      const [c, p, o] = await Promise.all([
        supabase.from('cases').select('*').eq('user_id', student.id).order('created_at', { ascending: false }).limit(6),
        supabase.from('community_posts').select('*').eq('user_id', student.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('orders').select('*').eq('user_id', student.id).order('created_at', { ascending: false }).limit(10),
      ]);
      setCases(c.data || []);
      setPosts(p.data || []);
      setOrders(o.data || []);
      setLoading(false);
    };
    load();
  }, [student?.id]);

  if (!student) return (
    <div className="px-5 py-10 text-center">
      <p className="font-body text-sm" style={{ color: COLORS.stone }}>학생을 찾을 수 없습니다</p>
      <button onClick={() => setCurrentPage('admin-students')} className="mt-4 font-heading text-xs px-4 py-2 rounded-full" style={{ background: COLORS.primary, color: COLORS.white }}>
        수강생 목록으로
      </button>
    </div>
  );

  const formatPrice = (n) => Number(n || 0).toLocaleString('ko-KR') + '원';
  const paidOrders = orders.filter(o => o.status === 'paid');
  const totalSpent = paidOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);

  return (
    <div className="pb-6">
      <PageIntro ko={student.name} en="Student Detail" desc={student.course} />
      
      <div className="px-5 space-y-3">
        {/* 기본 정보 */}
        <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: COLORS.cardElev }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ background: `radial-gradient(circle, ${COLORS.primary}50, transparent 70%)` }}></div>
          <div className="relative flex items-center gap-4">
            <Avatar user={student} size="xxl" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-2xl tracking-tight" style={{ color: COLORS.white }}>{student.name}</h2>
                {student.status === 'pending' && <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded" style={{ background: COLORS.peach, color: COLORS.deep }}>승인 대기</span>}
                {student.status === 'rejected' && <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded" style={{ background: COLORS.cardElev, color: COLORS.stone }}>거절됨</span>}
              </div>
              <p className="font-mono text-[10px] mt-1 truncate" style={{ color: COLORS.ink, opacity: 0.7 }}>{student.email}</p>
              <p className="font-body text-sm mt-2" style={{ color: COLORS.primary }}>{student.course}</p>
            </div>
          </div>
        </div>

        {/* 운영진 임명/해제 (admin만 가능) */}
        {canViewRevenue && student.role !== 'admin' && (
          <div className="rounded-2xl p-4" style={{ 
            background: COLORS.card, 
            border: `1px solid ${student.role === 'staff' ? COLORS.primary : COLORS.light}`,
            boxShadow: student.role === 'staff' ? '0 0 16px rgba(255, 92, 31, 0.2)' : 'none'
          }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ Staff Role</p>
                {student.role === 'staff' ? (
                  <>
                    <p className="font-heading text-sm mt-1 flex items-center gap-1.5" style={{ color: COLORS.ink }}>
                      <Shield size={14} style={{ color: COLORS.primary }} strokeWidth={2.5} />
                      현재 운영진이에요
                    </p>
                    <p className="font-body text-xs mt-1" style={{ color: COLORS.stone }}>매출 외 모든 관리 기능 사용 가능</p>
                  </>
                ) : (
                  <>
                    <p className="font-heading text-sm mt-1" style={{ color: COLORS.ink }}>운영진으로 임명할까요?</p>
                    <p className="font-body text-xs mt-1" style={{ color: COLORS.stone }}>매출 외 모든 관리 기능 사용 가능</p>
                  </>
                )}
              </div>
              <button onClick={toggleStaff} disabled={updating}
                className="font-heading text-xs px-4 py-2.5 rounded-full flex items-center gap-1.5 shrink-0 disabled:opacity-60"
                style={{
                  background: student.role === 'staff' ? COLORS.cream : COLORS.primary,
                  color: student.role === 'staff' ? COLORS.deep : COLORS.white,
                  border: student.role === 'staff' ? `1px solid ${COLORS.light}` : 'none',
                  boxShadow: student.role === 'staff' ? 'none' : '0 0 16px rgba(255, 92, 31, 0.4)'
                }}>
                {updating ? <Loader2 size={12} className="animate-spin" /> : <Shield size={12} strokeWidth={2.5} />}
                {student.role === 'staff' ? '해제' : '임명'}
              </button>
            </div>
          </div>
        )}

        {/* 계정 정지/해제 (admin만 가능) */}
        {canViewRevenue && student.role !== 'admin' && (
          <div className="rounded-2xl p-4" style={{ 
            background: COLORS.card, 
            border: `1px solid ${student.status === 'suspended' ? '#FF4444' : COLORS.light}`,
            boxShadow: student.status === 'suspended' ? '0 0 16px rgba(255, 68, 68, 0.2)' : 'none'
          }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: student.status === 'suspended' ? '#FF4444' : COLORS.stone }}>━━ Account Status</p>
                {student.status === 'suspended' ? (
                  <>
                    <p className="font-heading text-sm mt-1 flex items-center gap-1.5" style={{ color: COLORS.ink }}>
                      <AlertCircle size={14} style={{ color: '#FF4444' }} strokeWidth={2.5} />
                      현재 정지됨
                    </p>
                    {student.suspended_reason && (
                      <p className="font-body text-xs mt-1" style={{ color: COLORS.stone }}>사유: {student.suspended_reason}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-heading text-sm mt-1" style={{ color: COLORS.ink }}>문제 발생 시 계정 정지</p>
                    <p className="font-body text-xs mt-1" style={{ color: COLORS.stone }}>정지된 사용자는 로그인 불가</p>
                  </>
                )}
              </div>
              <button onClick={toggleSuspend} disabled={updating}
                className="font-heading text-xs px-4 py-2.5 rounded-full flex items-center gap-1.5 shrink-0 disabled:opacity-60"
                style={{
                  background: student.status === 'suspended' ? COLORS.cream : '#FF4444',
                  color: student.status === 'suspended' ? COLORS.deep : COLORS.white,
                  border: student.status === 'suspended' ? `1px solid ${COLORS.light}` : 'none',
                }}>
                {updating ? <Loader2 size={12} className="animate-spin" /> : <AlertCircle size={12} strokeWidth={2.5} />}
                {student.status === 'suspended' ? '해제' : '정지'}
              </button>
            </div>
          </div>
        )}

        {/* 등급 카드 (재사용) */}
        <LevelCard userId={student.id} hideRevenue={!canViewRevenue} />

        {/* 계정 정보 */}
        <section className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase p-4 pb-2" style={{ color: COLORS.primary }}>━━ Account Info</p>
          {[
            { label: 'Email', value: student.email },
            { label: 'Phone', value: student.phone || '미등록' },
            { label: 'Joined', value: new Date(student.created_at).toLocaleDateString('ko-KR') },
            { label: 'Status', value: student.status === 'approved' ? '승인됨' : student.status === 'pending' ? '대기' : '거절' },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3" style={{ borderTop: `1px solid ${COLORS.light}` }}>
              <span className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>{row.label}</span>
              <span className="font-body text-xs font-semibold truncate ml-2" style={{ color: COLORS.ink }}>{row.value}</span>
            </div>
          ))}
        </section>

        {/* 최근 결제 (admin만) */}
        {canViewRevenue && orders.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between mb-2 px-1">
              <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ Recent Orders</p>
              <p className="font-mono text-[10px] font-bold" style={{ color: COLORS.primary }}>총 {formatPrice(totalSpent)}</p>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
              {orders.map((o, i) => (
                <div key={o.id} className="flex items-center justify-between p-3" style={{ borderTop: i !== 0 ? `1px solid ${COLORS.light}` : 'none' }}>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-body text-xs truncate" style={{ color: COLORS.ink }}>{o.course_title}</p>
                    <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>
                      {o.item_type === 'product' ? '재료샵' : '클래스'} · {new Date(o.paid_at || o.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-sm tracking-tight" style={{ 
                      color: o.status === 'paid' ? COLORS.primary : COLORS.stone,
                      textDecoration: o.status === 'cancelled' ? 'line-through' : 'none' 
                    }}>{formatPrice(o.amount)}</p>
                    <p className="font-mono text-[9px]" style={{ color: COLORS.stone }}>{o.status === 'paid' ? '완료' : '취소'}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 최근 케이스 */}
        {cases.length > 0 && (
          <section>
            <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2 px-1" style={{ color: COLORS.primary }}>━━ Portfolio ({cases.length})</p>
            <div className="grid grid-cols-3 gap-2">
              {cases.slice(0, 6).map(c => (
                <div key={c.id} className="aspect-square rounded-xl overflow-hidden relative" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                  {c.image_urls?.length > 0 ? (
                    <SkeletonImage src={c.image_urls[0]} alt={c.title} className="w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera size={20} style={{ color: COLORS.stone }} />
                    </div>
                  )}
                  {c.is_best && (
                    <span className="absolute top-1 right-1 font-mono text-[8px] font-bold tracking-widest uppercase px-1 py-0.5 rounded" style={{ background: COLORS.primary, color: COLORS.white }}>★</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 최근 게시글 */}
        {posts.length > 0 && (
          <section>
            <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2 px-1" style={{ color: COLORS.primary }}>━━ Recent Posts ({posts.length})</p>
            <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
              {posts.slice(0, 3).map((p, i) => (
                <div key={p.id} className="p-3" style={{ borderTop: i !== 0 ? `1px solid ${COLORS.light}` : 'none' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: COLORS.peach, color: COLORS.deep }}>{p.category || '자유'}</span>
                    <p className="font-mono text-[9px]" style={{ color: COLORS.stone }}>{new Date(p.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                  <p className="font-body text-xs line-clamp-2" style={{ color: COLORS.ink }}>{p.content}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 활동 없을 때 */}
        {!loading && cases.length === 0 && posts.length === 0 && orders.length === 0 && (
          <div className="text-center py-10">
            <p className="font-body text-sm" style={{ color: COLORS.stone }}>아직 활동 내역이 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminStudents({ setCurrentPage, setSelectedStudent }) {
  const PER_PAGE = 30;
  const [allUsers, setAllUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [displayCount, setDisplayCount] = useState(PER_PAGE);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [studentCount, setStudentCount] = useState(0);
  const [staffCount, setStaffCount] = useState(0);

  // 통계 카운트는 전체 기준으로 한 번만 (목록 페이지네이션과 별개)
  useEffect(() => {
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student').neq('status', 'deleted')
      .then(({ count }) => setStudentCount(count || 0));
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'staff').neq('status', 'deleted')
      .then(({ count }) => setStaffCount(count || 0));
  }, []);

  // 검색어 디바운스 (입력 멈춘 뒤 조회)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => { setDisplayCount(PER_PAGE); }, [debouncedQ]);
  // 🚀 서버 검색 + 페이지네이션 (전체 풀로딩 제거 → 대역폭 절약)
  useEffect(() => { load(); }, [debouncedQ, displayCount]);

  const load = async () => {
    if (displayCount === PER_PAGE) setLoading(true);
    let query = supabase.from('profiles').select('*', { count: 'exact' })
      .in('role', ['student', 'staff'])
      .neq('status', 'deleted')  // 탈퇴한 회원 제외
      .order('role', { ascending: false })  // staff 먼저
      .order('created_at', { ascending: false })
      .range(0, displayCount - 1);
    if (debouncedQ) {
      const q = debouncedQ.replace(/[%,()]/g, ' ');
      query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,course.ilike.%${q}%`);
    }
    const { data, count } = await query;
    setAllUsers(data || []);
    setTotal(count || 0);
    setLoading(false);
  };

  const openDetail = (s) => {
    setSelectedStudent(s);
    setCurrentPage('admin-student-detail');
  };

  return (
    <>
      <PageIntro ko="수강생 관리" en="Students" desc="수강생을 눌러서 상세 정보를 확인하세요" />
      <div className="px-5 space-y-3">
        {/* 통계 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-3 text-center" style={{ background: COLORS.primary }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.white }}>수강생</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.white }}>{studentCount}<span className="font-body text-base">명</span></p>
          </div>
          <div className="rounded-2xl p-3 text-center" style={{ background: COLORS.cardElev, border: `1px solid ${COLORS.primary}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>운영진</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>{staffCount}<span className="font-body text-base">명</span></p>
          </div>
        </div>

        {/* 검색바 */}
        <div className="relative">
          <Search size={16} style={{ color: COLORS.stone, position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="이름, 이메일, 연락처로 검색"
            className="w-full rounded-full pl-10 pr-10 py-3 font-body text-sm outline-none"
            style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: COLORS.cardElev }}>
              <X size={12} style={{ color: COLORS.stone }} />
            </button>
          )}
        </div>

        {searchQuery && (
          <p className="font-mono text-[10px] px-1" style={{ color: COLORS.stone }}>
            검색 결과: <span style={{ color: COLORS.primary, fontWeight: 'bold' }}>{total}명</span>
          </p>
        )}

        {/* 목록 */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
          </div>
        ) : allUsers.length === 0 ? (
          <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>
            {searchQuery ? '검색 결과가 없습니다' : '아직 등록된 수강생이 없습니다'}
          </p>
        ) : (
          <>
          {allUsers.map(s => (
          <button key={s.id} onClick={() => openDetail(s)} 
            className="w-full text-left rounded-2xl p-4 flex items-center gap-3 transition-transform active:scale-[0.98]" 
            style={{ 
              background: COLORS.card, 
              border: `1px solid ${s.role === 'staff' ? COLORS.primary : COLORS.light}`,
              boxShadow: s.role === 'staff' ? '0 0 16px rgba(255, 92, 31, 0.2)' : 'none'
            }}>
            <Avatar user={s} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-heading text-sm" style={{ color: COLORS.ink }}>{s.name}</p>
                {s.role === 'staff' && (
                  <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 8px rgba(255,92,31,0.5)' }}>
                    <Shield size={8} strokeWidth={3} />STAFF
                  </span>
                )}
                {s.status === 'pending' && <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: COLORS.peach, color: COLORS.deep }}>대기</span>}
                {s.status === 'rejected' && <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: COLORS.cardElev, color: COLORS.stone }}>거절</span>}
              </div>
              <p className="font-mono text-[10px] truncate" style={{ color: COLORS.stone }}>{s.email}</p>
              <p className="font-body text-xs mt-1" style={{ color: COLORS.primary }}>{s.course}</p>
            </div>
            <ChevronRight size={16} style={{ color: COLORS.stone }} />
          </button>
          ))}
          {total > allUsers.length && (
            <button onClick={() => setDisplayCount(n => n + PER_PAGE)}
              className="w-full rounded-full py-3 font-heading text-xs flex items-center justify-center gap-2"
              style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
              더 보기 ({total - allUsers.length}명 남음) <ChevronRight size={12} />
            </button>
          )}
          </>
        )}
      </div>
    </>
  );
}

export function AdminCases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('전체');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cases')
      .select('*, profiles(name, avatar_color, avatar_url, course)')
      .order('created_at', { ascending: false });
    setCases(data || []);
    setLoading(false);
  };

  const toggleBest = async (caseItem) => {
    const newValue = !caseItem.is_best;
    const { error } = await supabase
      .from('cases')
      .update({ is_best: newValue, best_badge: newValue ? 'TOP PICK' : null })
      .eq('id', caseItem.id);
    if (error) { toast('변경 실패: ' + error.message); return; }
    await load();
  };

  const filtered = filter === '전체' ? cases : filter === '베스트' ? cases.filter(c => c.is_best) : cases.filter(c => c.category === filter);
  const filters = ['전체', '베스트', '눈썹', '아이라인', '입술', '속눈썹', '헤어라인'];

  return (
    <>
      <PageIntro ko="1:1 피드백" en="Cases Admin" />

      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="shrink-0 px-4 py-2 rounded-full font-body text-xs font-semibold transition-transform active:scale-95"
              style={{
                background: filter === f ? COLORS.primary : COLORS.card,
                color: filter === f ? COLORS.white : COLORS.ink,
                border: `1px solid ${filter === f ? COLORS.primary : COLORS.light}`,
                boxShadow: filter === f ? '0 0 16px rgba(255, 92, 31, 0.3)' : 'none'
              }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-3">
        <div className="rounded-2xl p-3 text-center" style={{ background: COLORS.primary }}>
          <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.white }}>현재 베스트</p>
          <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.white }}>{cases.filter(c => c.is_best).length}개</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>케이스가 없습니다</p>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
              {c.image_urls?.length > 0 && (
                <div className="relative aspect-[4/3] overflow-hidden">
                  <SkeletonImage src={c.image_urls[0]} alt={c.title} className="w-full h-full" />
                  <span className="absolute top-3 left-3 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.card, color: COLORS.ink }}>{c.category}</span>
                  {c.is_best && (
                    <span className="absolute top-3 right-3 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>★ BEST</span>
                  )}
                </div>
              )}
              <div className="p-4">
                <h4 className="font-heading text-base" style={{ color: COLORS.ink }}>{c.title}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <Avatar user={c.profiles} size="xs" />
                  <p className="font-body text-xs font-semibold" style={{ color: COLORS.ink }}>{c.profiles?.name || '익명'}</p>
                  <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>· {new Date(c.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
                {c.memo && <p className="font-body text-xs mt-2 leading-relaxed" style={{ color: COLORS.stone }}>{c.memo}</p>}

                <button onClick={() => toggleBest(c)}
                  className="w-full mt-3 font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-1.5"
                  style={{
                    background: c.is_best ? COLORS.cream : COLORS.primary,
                    color: c.is_best ? COLORS.deep : COLORS.card,
                    border: c.is_best ? `1px solid ${COLORS.light}` : 'none'
                  }}>
                  {c.is_best ? (
                    <>베스트 해제</>
                  ) : (
                    <>★ 베스트로 지정</>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

export function AdminLectures({ user }) {
  const [lectures, setLectures] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', instructor: '', category: '기초', level: 'Basic',
    duration: '', video_url: '', description: '', is_published: true,
    is_orientation: false,
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase
      .from('lectures')
      .select('*')
      .order('created_at', { ascending: false });
    setLectures(data || []);
  };

  // YouTube URL에서 영상 ID 추출
  const getYouTubeId = (url) => {
    if (!url) return null;
    const patterns = [
      /youtube\.com\/watch\?v=([^&\s]+)/,
      /youtu\.be\/([^?\s]+)/,
      /youtube\.com\/embed\/([^?\s]+)/,
      /youtube\.com\/shorts\/([^?\s]+)/,
    ];
    for (const p of patterns) {
      const match = url.match(p);
      if (match) return match[1];
    }
    return null;
  };

  const resetForm = () => {
    setForm({
      title: '', instructor: '', category: '기초', level: 'Basic',
      duration: '', video_url: '', description: '', is_published: true,
      is_orientation: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (lecture) => {
    setForm({
      title: lecture.title || '',
      instructor: lecture.instructor || '',
      category: lecture.category || '기초',
      level: lecture.level || 'Basic',
      duration: lecture.duration || '',
      video_url: lecture.video_url || '',
      description: lecture.description || '',
      is_published: lecture.is_published !== false,
      is_orientation: lecture.is_orientation || false,
    });
    setEditingId(lecture.id);
    setShowForm(true);
    setTimeout(() => document.querySelector('.admin-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const submit = async () => {
    if (!form.title.trim()) return toast('제목을 입력해주세요');
    if (!form.instructor.trim()) return toast('강사명을 입력해주세요');
    if (!form.video_url.trim()) return toast('YouTube URL을 입력해주세요');

    const videoId = getYouTubeId(form.video_url);
    if (!videoId) return toast('올바른 YouTube URL이 아닙니다.\n예: https://youtube.com/watch?v=XXXXX');

    setLoading(true);
    const data = {
      ...form,
      thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('lectures').update(data).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('lectures').insert(data);
        if (error) throw error;
      }
      resetForm();
      await load();
    } catch (err) {
      console.error(err);
      toast('저장 실패: ' + err.message);
    }
    setLoading(false);
  };

  const remove = async (id) => {
    if (!await confirmDialog('이 강의를 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('lectures').delete().eq('id', id);
    if (error) { toast('삭제 실패: ' + error.message); return; }
    await load();
  };

  const togglePublish = async (lecture) => {
    const { error } = await supabase
      .from('lectures')
      .update({ is_published: !lecture.is_published })
      .eq('id', lecture.id);
    if (error) { toast('변경 실패: ' + error.message); return; }
    await load();
  };

  const previewId = getYouTubeId(form.video_url);

  return (
    <>
      <PageIntro ko="강의 관리" en="Lectures Admin" />
      <div className="px-5 space-y-3">

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-3" style={{ background: COLORS.primary }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.white }}>공개 중</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.white }}>
              {lectures.filter(l => l.is_published).length}
            </p>
          </div>
          <div className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>비공개</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>
              {lectures.filter(l => !l.is_published).length}
            </p>
          </div>
        </div>

        {/* + 새 강의 등록 버튼 */}
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="w-full rounded-full py-3 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
            <Plus size={14} strokeWidth={2.5} />새 강의 등록
          </button>
        )}

        {/* 등록/수정 폼 */}
        {showForm && (
          <div className="rounded-2xl p-4 space-y-3 animate-fade-in admin-edit-form" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base" style={{ color: COLORS.ink }}>
                {editingId ? '강의 수정' : '새 강의 등록'}
              </h3>
              <button onClick={resetForm}>
                <X size={18} style={{ color: COLORS.stone }} />
              </button>
            </div>

            {/* 제목 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>제목 *</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                placeholder="예: 엠보 브로우 기초"
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>

            {/* 강사명 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>강사명 *</label>
              <input type="text" value={form.instructor} onChange={e => setForm({...form, instructor: e.target.value})}
                placeholder="예: 최용덕 원장"
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>

            {/* 카테고리 + 레벨 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>카테고리</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }}>
                  <option>기초</option><option>심화</option><option>테크닉</option>
                </select>
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>레벨</label>
                <select value={form.level} onChange={e => setForm({...form, level: e.target.value})}
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }}>
                  <option>Basic</option><option>Intermediate</option><option>Advanced</option>
                </select>
              </div>
            </div>

            {/* 영상 시간 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>영상 시간</label>
              <input type="text" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})}
                placeholder="예: 12:30"
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>

            {/* YouTube URL */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>YouTube URL *</label>
              <input type="url" value={form.video_url} onChange={e => setForm({...form, video_url: e.target.value})}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              <p className="font-mono text-[10px] mt-1.5" style={{ color: COLORS.stone }}>
                youtube.com, youtu.be, shorts URL 모두 가능해요
              </p>
            </div>

            {/* 미리보기 */}
            {previewId && (
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${COLORS.light}` }}>
                <p className="font-mono text-[10px] font-bold tracking-widest uppercase px-3 py-2" style={{ color: COLORS.primary, background: COLORS.cardElev }}>━━ Preview</p>
                <div className="relative aspect-video">
                  <img src={`https://i.ytimg.com/vi/${previewId}/hqdefault.jpg`} alt="썸네일" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: COLORS.primary, boxShadow: '0 0 20px rgba(255, 92, 31, 0.6)' }}>
                      <Play size={20} fill={COLORS.white} style={{ color: COLORS.white }} className="ml-1" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 설명 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>설명</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                placeholder="강의 내용, 학습 포인트 등" rows={3}
                className="w-full font-body text-xs font-medium p-2 mt-1 outline-none resize-none rounded"
                style={{ background: COLORS.cream, color: COLORS.ink }} />
            </div>

            {/* 공개 여부 */}
            <label className="flex items-center gap-2 font-body text-xs cursor-pointer" style={{ color: COLORS.ink }}>
              <input type="checkbox" checked={form.is_published} onChange={e => setForm({...form, is_published: e.target.checked})}
                className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
              <span>즉시 공개 (체크 해제하면 비공개로 등록)</span>
            </label>

            {/* 오리엔테이션 영상 지정 */}
            <label className="flex items-center gap-2 font-body text-xs cursor-pointer p-2 rounded" style={{ color: COLORS.ink, background: 'rgba(255,92,31,0.08)' }}>
              <input type="checkbox" checked={form.is_orientation} onChange={e => setForm({...form, is_orientation: e.target.checked})}
                className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
              <span>오리엔테이션 영상으로 지정 (신규 학생 필수 시청)</span>
            </label>

            {/* 저장 버튼 */}
            <button onClick={submit} disabled={loading}
              className="w-full font-heading text-sm py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: COLORS.cardElev, color: COLORS.white }}>
              {loading && <Loader2 size={14} className="animate-spin" />}
              {editingId ? '수정 저장' : '등록하기'}
            </button>
          </div>
        )}

        {/* 강의 목록 */}
        {lectures.length === 0 ? (
          <div className="text-center py-10">
            <PlayCircle size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>등록된 강의가 없습니다</p>
            <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>첫 강의를 등록해보세요!</p>
          </div>
        ) : lectures.map(l => (
          <div key={l.id} onClick={() => startEdit(l)} className="rounded-2xl overflow-hidden cursor-pointer transition-transform active:scale-[0.98]" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}`, opacity: l.is_published ? 1 : 0.6 }}>
            <div className="relative aspect-video">
              {l.thumbnail_url ? (
                <SkeletonImage src={l.thumbnail_url} alt={l.title} className="w-full h-full" />
              ) : (
                <div className="w-full h-full" style={{ background: COLORS.cardElev }}></div>
              )}
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: COLORS.card }}>
                  <Play size={16} fill={COLORS.primary} style={{ color: COLORS.primary }} className="ml-0.5" />
                </div>
              </div>
              <span className="absolute top-3 left-3 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.card, color: COLORS.ink }}>
                {l.category || '기초'}
              </span>
              {!l.is_published && (
                <span className="absolute top-3 right-3 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.cardElev, color: COLORS.stone }}>
                  비공개
                </span>
              )}
              {l.duration && (
                <span className="absolute bottom-3 right-3 font-mono text-[10px] font-bold px-2 py-1 rounded" style={{ background: 'rgba(0,0,0,0.7)', color: COLORS.white }}>
                  {l.duration}
                </span>
              )}
            </div>

            <div className="p-4">
              <h4 className="font-heading text-sm" style={{ color: COLORS.ink }}>{l.title}</h4>
              <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>
                {l.instructor} · {l.level}
              </p>
              {l.description && (
                <p className="font-body text-xs mt-2 leading-relaxed line-clamp-2" style={{ color: COLORS.stone }}>
                  {l.description}
                </p>
              )}

              <div onClick={e => e.stopPropagation()} className="flex gap-2 mt-3">
                <button onClick={() => togglePublish(l)}
                  className="flex-1 font-heading text-[11px] py-2 rounded-full"
                  style={{
                    background: l.is_published ? COLORS.cream : COLORS.primary,
                    color: l.is_published ? COLORS.stone : COLORS.white,
                    border: l.is_published ? `1px solid ${COLORS.light}` : 'none',
                  }}>
                  {l.is_published ? '비공개로' : '공개'}
                </button>
                <button onClick={() => startEdit(l)}
                  className="flex-1 font-heading text-[11px] py-2 rounded-full flex items-center justify-center gap-1"
                  style={{ background: COLORS.cardElev, color: COLORS.white }}>
                  <Edit3 size={11} />수정
                </button>
                <button onClick={() => remove(l.id)}
                  className="px-3 py-2 rounded-full flex items-center justify-center"
                  style={{ background: COLORS.cream }}>
                  <Trash2 size={12} style={{ color: COLORS.deep }} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function AdminProducts({ user }) {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState('전체');
  const [form, setForm] = useState({
    name: '', brand: '', category: '색소', price: '', original_price: '',
    stock: 0, badge: '', description: '', is_active: true,
    image_urls: [], imageFiles: [], imagePreviews: [],
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    setProducts(data || []);
  };

  // 이미지는 MultiImageField + 공용 헬퍼(persistFormImages/deleteImageFromBucket)로 처리

  const resetForm = () => {
    form.imagePreviews?.forEach(p => URL.revokeObjectURL(p));
    setForm({
      name: '', brand: '', category: '색소', price: '', original_price: '',
      stock: 0, badge: '', description: '', is_active: true,
      image_urls: [], imageFiles: [], imagePreviews: [],
    });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (product) => {
    setForm({
      name: product.name || '',
      brand: product.brand || '',
      category: product.category || '색소',
      price: product.price || '',
      original_price: product.original_price || '',
      stock: product.stock || 0,
      badge: product.badge || '',
      description: product.description || '',
      is_active: product.is_active !== false,
      image_urls: getRowImages(product),
      imageFiles: [],
      imagePreviews: [],
    });
    setEditingId(product.id);
    setShowForm(true);
    setTimeout(() => document.querySelector('.admin-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const submit = async () => {
    if (!form.name.trim()) return toast('상품명을 입력해주세요');
    if (!form.price) return toast('판매가를 입력해주세요');

    setLoading(true);
    try {
      let imageUrls = form.image_urls || [];
      if ((form.imageFiles?.length || 0) > 0) {
        setUploading(true);
        imageUrls = await persistFormImages(form, 'product-images', 1200);
        setUploading(false);
      }

      const productData = {
        name: form.name,
        brand: form.brand,
        category: form.category,
        price: parseInt(form.price) || 0,
        original_price: form.original_price ? parseInt(form.original_price) : null,
        stock: parseInt(form.stock) || 0,
        badge: form.badge || null,
        description: form.description,
        image_urls: imageUrls,
        image_url: imageUrls[0] || null,
        is_active: form.is_active,
      };

      if (editingId) {
        const { error } = await supabase.from('products').update(productData).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(productData);
        if (error) throw error;
      }
      resetForm();
      await load();
    } catch (err) {
      console.error(err);
      toast('저장 실패: ' + err.message);
    }
    setLoading(false);
    setUploading(false);
  };

  const remove = async (product) => {
    // 🍊 1. 결제 내역 체크 (정보 제공용)
    const { count: orderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', product.id);
    
    const msg = orderCount > 0 
      ? `이 상품은 ${orderCount}건의 결제 내역이 있어요.\n\n삭제해도 결제 내역은 그대로 보존돼요\n   (회계/세무용으로 필요)\n상품명도 결제 내역에 저장돼 있어 추적 가능\n\n정말 삭제하시겠습니까?`
      : '이 상품을 삭제하시겠습니까?\n이미지도 함께 삭제됩니다.';
    
    if (!await confirmDialog(msg)) return;
    
    // 🍊 2. 이미지 삭제
    for (const url of getRowImages(product)) await deleteImageFromBucket(url, 'product-images');
    
    // 🍊 3. 상품 삭제 (order_items.product_id는 NULL, cart_items는 CASCADE — db/2026-06-14_product_delete_fk.sql)
    const { error } = await supabase.from('products').delete().eq('id', product.id);
    if (error) {
      if (error.code === '23503' || /foreign key/i.test(error.message)) {
        toast('주문/장바구니에 연결된 상품이라 바로 삭제할 수 없어요. 결제 내역은 보존하면서 숨기려면 "비활성"을 사용하세요.');
      } else {
        toast('삭제 실패: ' + error.message);
      }
      return;
    }
    
    toast('상품이 삭제되었습니다');
    await load();
  };

  const toggleActive = async (product) => {
    const { error } = await supabase
      .from('products')
      .update({ is_active: !product.is_active })
      .eq('id', product.id);
    if (error) { toast('변경 실패: ' + error.message); return; }
    await load();
  };

  const categories = ['전체', '색소', '니들/머신', '마취제', '도구', '기타'];
  const filtered = filter === '전체' ? products : products.filter(p => p.category === filter);

  return (
    <>
      <PageIntro ko="재료샵 관리" en="Products Admin" />
      <div className="px-5 space-y-3">
        {/* 통계 카드 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-3" style={{ background: COLORS.primary }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.white }}>판매 중</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.white }}>
              {products.filter(p => p.is_active).length}
            </p>
          </div>
          <div className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>비활성</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>
              {products.filter(p => !p.is_active).length}
            </p>
          </div>
        </div>

        {/* + 새 상품 등록 버튼 */}
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="w-full rounded-full py-3 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
            <Plus size={14} strokeWidth={2.5} />새 상품 등록
          </button>
        )}

        {/* 등록/수정 폼 */}
        {showForm && (
          <div className="rounded-2xl p-4 space-y-3 animate-fade-in admin-edit-form" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base" style={{ color: COLORS.ink }}>
                {editingId ? '상품 수정' : '새 상품 등록'}
              </h3>
              <button onClick={resetForm}>
                <X size={18} style={{ color: COLORS.stone }} />
              </button>
            </div>

            {/* 상품 이미지 (여러 장) */}
            <MultiImageField
              label="상품 이미지 (여러 장)"
              value={form}
              onChange={(v) => setForm({ ...form, ...v })}
            />

            {/* 상품명 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>상품명 *</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                placeholder="예: 마이크로피그먼트 누드 5ml"
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>

            {/* 브랜드 + 카테고리 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>브랜드</label>
                <input type="text" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})}
                  placeholder="BIOTEK"
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>카테고리</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }}>
                  <option>색소</option><option>니들/머신</option><option>마취제</option><option>도구</option><option>기타</option>
                </select>
              </div>
            </div>

            {/* 판매가 + 원가 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>판매가 *</label>
                <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                  placeholder="65000"
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>원가 (할인용)</label>
                <input type="number" value={form.original_price} onChange={e => setForm({...form, original_price: e.target.value})}
                  placeholder="80000"
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              </div>
            </div>

            {/* 재고 + 배지 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>재고</label>
                <input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})}
                  placeholder="10"
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>배지</label>
                <select value={form.badge} onChange={e => setForm({...form, badge: e.target.value})}
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }}>
                  <option value="">없음</option><option>BEST</option><option>NEW</option><option>SALE</option>
                </select>
              </div>
            </div>

            {/* 설명 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>상품 설명</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                placeholder="제품 특징, 사용법 등" rows={3}
                className="w-full font-body text-xs font-medium p-2 mt-1 outline-none resize-none rounded"
                style={{ background: COLORS.cream, color: COLORS.ink }} />
            </div>

            {/* 활성 여부 */}
            <label className="flex items-center gap-2 font-body text-xs cursor-pointer" style={{ color: COLORS.ink }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})}
                className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
              <span>판매 활성화 (체크 해제하면 학생에게 안 보임)</span>
            </label>

            {/* 저장 버튼 */}
            <button onClick={submit} disabled={loading || uploading}
              className="w-full font-heading text-sm py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: COLORS.cardElev, color: COLORS.white }}>
              {(loading || uploading) && <Loader2 size={14} className="animate-spin" />}
              {uploading ? '이미지 업로드 중...' : editingId ? '수정 저장' : '등록하기'}
            </button>
          </div>
        )}

        {/* 카테고리 필터 */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 py-1">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className="shrink-0 px-3 py-1.5 rounded-full font-body text-xs font-semibold"
              style={{
                background: filter === cat ? COLORS.primary : COLORS.card,
                color: filter === cat ? COLORS.white : COLORS.ink,
                border: `1px solid ${filter === cat ? COLORS.primary : COLORS.light}`,
              }}>
              {cat}
            </button>
          ))}
        </div>

        {/* 상품 목록 */}
        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <ShoppingBag size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>
              {filter === '전체' ? '등록된 상품이 없습니다' : `${filter} 카테고리 상품이 없습니다`}
            </p>
          </div>
        ) : filtered.map(p => (
          <div key={p.id} onClick={() => startEdit(p)} className="rounded-2xl overflow-hidden flex cursor-pointer transition-transform active:scale-[0.98]" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}`, opacity: p.is_active ? 1 : 0.55 }}>
            <div className="relative w-24 h-24 shrink-0">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: COLORS.cream }}>
                  <span className="text-3xl">{p.emoji || ''}</span>
                </div>
              )}
              {p.badge && (
                <span className="absolute top-1 left-1 font-mono text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded" style={{
                  background: p.badge === 'BEST' ? COLORS.ink : p.badge === 'NEW' ? COLORS.primary : COLORS.peach,
                  color: p.badge === 'BEST' ? COLORS.primary : p.badge === 'SALE' ? COLORS.deep : COLORS.white
                }}>{p.badge}</span>
              )}
            </div>
            <div className="flex-1 p-3 min-w-0">
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>
                {p.brand || '-'} · {p.category || '기타'}
              </p>
              <h4 className="font-heading text-xs mt-1 line-clamp-2 leading-tight" style={{ color: COLORS.ink }}>{p.name}</h4>
              <p className="font-display text-sm mt-1 tracking-tight" style={{ color: COLORS.ink }}>
                {p.price?.toLocaleString()}<span className="font-body text-[10px]" style={{ color: COLORS.stone }}>원</span>
                <span className="font-mono text-[10px] ml-2" style={{ color: COLORS.stone }}>재고 {p.stock || 0}</span>
              </p>
              <div onClick={e => e.stopPropagation()} className="flex gap-1 mt-2">
                <button onClick={() => toggleActive(p)}
                  className="flex-1 font-heading text-[10px] py-1.5 rounded-full"
                  style={{
                    background: p.is_active ? COLORS.cream : COLORS.primary,
                    color: p.is_active ? COLORS.stone : COLORS.white,
                  }}>
                  {p.is_active ? '비활성' : '활성'}
                </button>
                <button onClick={() => startEdit(p)}
                  className="flex-1 font-heading text-[10px] py-1.5 rounded-full flex items-center justify-center gap-1"
                  style={{ background: COLORS.cardElev, color: COLORS.white }}>
                  <Edit3 size={10} />수정
                </button>
                <button onClick={() => remove(p)}
                  className="px-2 py-1.5 rounded-full flex items-center justify-center"
                  style={{ background: COLORS.cream }}>
                  <Trash2 size={10} style={{ color: COLORS.deep }} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function AdminCourses({ user }) {
  const [courses, setCourses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '', en_title: '', level: 'BASIC', duration: '', price: '', original_price: '',
    show_price: false, description: '', features: '', badge: '',
    is_active: true, is_featured: false, hot: false, order_index: 0,
    category: 'PMU',
    image_urls: [], imageFiles: [], imagePreviews: [],
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from('courses').select('*').order('order_index', { ascending: true });
    setCourses(data || []);
  };

  // 이미지는 MultiImageField + 공용 헬퍼(persistFormImages/deleteImageFromBucket)로 처리

  const resetForm = () => {
    form.imagePreviews?.forEach(p => URL.revokeObjectURL(p));
    setForm({
      title: '', en_title: '', level: 'BASIC', duration: '', price: '', original_price: '',
      show_price: false, description: '', features: '', badge: '',
      is_active: true, is_featured: false, hot: false, order_index: 0,
      category: 'PMU',
      image_urls: [], imageFiles: [], imagePreviews: [],
    });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (course) => {
    setForm({
      title: course.title || '',
      en_title: course.en_title || '',
      level: course.level || 'BASIC',
      duration: course.duration || '',
      price: course.price || '',
      original_price: course.original_price || '',
      show_price: course.show_price !== false,
      description: course.description || '',
      features: course.features || '',
      badge: course.badge || '',
      is_active: course.is_active !== false,
      is_featured: course.is_featured || false,
      hot: course.hot || false,
      order_index: course.order_index || 0,
      category: course.category || 'PMU',
      image_urls: getRowImages(course),
      imageFiles: [],
      imagePreviews: [],
    });
    setEditingId(course.id);
    setShowForm(true);
    setTimeout(() => document.querySelector('.admin-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const submit = async () => {
    if (!form.title.trim()) return toast('클래스명을 입력해주세요');
    setLoading(true);
    try {
      let imageUrls = form.image_urls || [];
      if ((form.imageFiles?.length || 0) > 0) {
        setUploading(true);
        imageUrls = await persistFormImages(form, 'course-images');
        setUploading(false);
      }
      const courseData = {
        title: form.title, en_title: form.en_title, level: form.level, duration: form.duration,
        price: parseInt(form.price) || 0,
        original_price: form.original_price ? parseInt(form.original_price) : null,
        show_price: form.show_price, description: form.description, features: form.features,
        badge: form.badge || null, is_active: form.is_active, is_featured: form.is_featured,
        hot: form.hot, order_index: parseInt(form.order_index) || 0,
        category: form.category,
        image_urls: imageUrls, image_url: imageUrls[0] || null,
      };
      if (editingId) {
        const { error } = await supabase.from('courses').update(courseData).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('courses').insert(courseData);
        if (error) throw error;
      }
      resetForm();
      await load();
    } catch (err) {
      console.error(err);
      toast('저장 실패: ' + err.message);
    }
    setLoading(false);
    setUploading(false);
  };

  const remove = async (course) => {
    // 🍊 결제 내역 체크
    const { count: orderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', course.id);
    
    const msg = orderCount > 0 
      ? `이 클래스는 ${orderCount}건의 결제 내역이 있어요.\n\n삭제해도 결제 내역은 그대로 보존돼요\n클래스명도 결제 내역에 저장돼 있어 추적 가능\n\n정말 삭제하시겠습니까?`
      : '이 클래스를 삭제하시겠습니까?\n이미지도 함께 삭제됩니다.';
    
    if (!await confirmDialog(msg)) return;

    for (const url of getRowImages(course)) await deleteImageFromBucket(url, 'course-images');
    const { error } = await supabase.from('courses').delete().eq('id', course.id);
    if (error) {
      toast('삭제 실패: ' + error.message);
      return;
    }
    toast('클래스가 삭제되었습니다');
    await load();
  };

  const toggleActive = async (course) => {
    const { error } = await supabase.from('courses').update({ is_active: !course.is_active }).eq('id', course.id);
    if (error) { toast('변경 실패: ' + error.message); return; }
    await load();
  };

  const togglePrice = async (course) => {
    const { error } = await supabase.from('courses').update({ show_price: !course.show_price }).eq('id', course.id);
    if (error) { toast('변경 실패: ' + error.message); return; }
    await load();
  };

  return (
    <>
      <PageIntro ko="클래스 관리" en="Courses Admin" />
      <div className="px-5 space-y-3">
        {/* 통계 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-3" style={{ background: COLORS.primary }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.white }}>운영 중</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.white }}>{courses.filter(c => c.is_active).length}</p>
          </div>
          <div className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>비활성</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>{courses.filter(c => !c.is_active).length}</p>
          </div>
        </div>

        {!showForm && (
          <button onClick={() => setShowForm(true)} className="w-full rounded-full py-3 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
            <Plus size={14} strokeWidth={2.5} />새 클래스 등록
          </button>
        )}

        {/* 등록/수정 폼 */}
        {showForm && (
          <div className="rounded-2xl p-4 space-y-3 animate-fade-in admin-edit-form" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base" style={{ color: COLORS.ink }}>{editingId ? '클래스 수정' : '새 클래스 등록'}</h3>
              <button onClick={resetForm}><X size={18} style={{ color: COLORS.stone }} /></button>
            </div>

            {/* 클래스 이미지 (여러 장) */}
            <MultiImageField
              label="클래스 이미지 (여러 장, 선택)"
              help="16:9 권장"
              value={form}
              onChange={(v) => setForm({ ...form, ...v })}
            />

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>클래스명 *</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                placeholder="예: 눈썹 마스터 클래스"
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>영문명</label>
                <input type="text" value={form.en_title} onChange={e => setForm({...form, en_title: e.target.value})}
                  placeholder="Eyebrow Master"
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>레벨</label>
                <input type="text" value={form.level} onChange={e => setForm({...form, level: e.target.value})}
                  placeholder="MASTER"
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>카테고리 (클래스 탭)</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }}>
                <option value="PMU">PMU</option>
                <option value="원데이">원데이</option>
                <option value="SMP">SMP</option>
                <option value="속눈썹">속눈썹</option>
                <option value="기타">기타</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>기간</label>
                <input type="text" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})}
                  placeholder="10주"
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>정렬 순서</label>
                <input type="number" value={form.order_index} onChange={e => setForm({...form, order_index: e.target.value})}
                  placeholder="1"
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>판매가</label>
                <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                  placeholder="3200000"
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>원가 (할인용)</label>
                <input type="number" value={form.original_price} onChange={e => setForm({...form, original_price: e.target.value})}
                  placeholder="3500000"
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>배지</label>
              <select value={form.badge} onChange={e => setForm({...form, badge: e.target.value})}
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }}>
                <option value="">없음</option><option>BEST</option><option>NEW</option><option>SALE</option>
              </select>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>설명</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                placeholder="클래스 한 줄 설명" rows={2}
                className="w-full font-body text-xs font-medium p-2 mt-1 outline-none resize-none rounded"
                style={{ background: COLORS.cream, color: COLORS.ink }} />
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>특징 (줄바꿈으로 구분)</label>
              <textarea value={form.features} onChange={e => setForm({...form, features: e.target.value})}
                placeholder="1:1 케어&#10;실습 모델 5명&#10;수료 후 평생 AS" rows={3}
                className="w-full font-body text-xs font-medium p-2 mt-1 outline-none resize-none rounded"
                style={{ background: COLORS.cream, color: COLORS.ink }} />
            </div>

            {/* 토글 옵션들 */}
            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2 font-body text-xs cursor-pointer p-2 rounded" style={{ color: COLORS.ink, background: COLORS.cream }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})}
                  className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
                <span>운영 활성화 (학생에게 표시)</span>
              </label>
              <label className="flex items-center gap-2 font-body text-xs cursor-pointer p-2 rounded" style={{ color: COLORS.ink, background: COLORS.cream }}>
                <input type="checkbox" checked={form.show_price} onChange={e => setForm({...form, show_price: e.target.checked})}
                  className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
                <span>가격 공개 (체크 해제 시 "문의" 표시)</span>
              </label>
              <label className="flex items-center gap-2 font-body text-xs cursor-pointer p-2 rounded" style={{ color: COLORS.ink, background: COLORS.cream }}>
                <input type="checkbox" checked={form.is_featured} onChange={e => setForm({...form, is_featured: e.target.checked})}
                  className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
                <span>특별 강조 (검정 배경 + 글로우)</span>
              </label>
              <label className="flex items-center gap-2 font-body text-xs cursor-pointer p-2 rounded" style={{ color: COLORS.ink, background: COLORS.cream }}>
                <input type="checkbox" checked={form.hot} onChange={e => setForm({...form, hot: e.target.checked})}
                  className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
                <span>HOT 라벨 표시</span>
              </label>
            </div>

            <button onClick={submit} disabled={loading || uploading}
              className="w-full font-heading text-sm py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: COLORS.cardElev, color: COLORS.white }}>
              {(loading || uploading) && <Loader2 size={14} className="animate-spin" />}
              {uploading ? '이미지 업로드 중...' : editingId ? '수정 저장' : '등록하기'}
            </button>
          </div>
        )}

        {/* 목록 */}
        {courses.length === 0 ? (
          <div className="text-center py-10">
            <BookOpen size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>등록된 클래스가 없습니다</p>
          </div>
        ) : courses.map(c => (
          <div key={c.id} onClick={() => startEdit(c)} className="rounded-2xl overflow-hidden cursor-pointer transition-transform active:scale-[0.98]" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}`, opacity: c.is_active ? 1 : 0.55 }}>
            {c.image_url && (
              <div className="aspect-video relative overflow-hidden">
                <SkeletonImage src={c.image_url} alt={c.title} className="w-full h-full" />
              </div>
            )}
            <div className="p-3">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>{c.level}</span>
                {c.hot && <span className="font-mono text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: COLORS.primary, color: COLORS.white }}></span>}
                {c.is_featured && <span className="font-mono text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: COLORS.ink, color: COLORS.primary }}></span>}
                {!c.show_price && <span className="font-mono text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: COLORS.cardElev, color: COLORS.stone }}>가격숨김</span>}
              </div>
              <h4 className="font-heading text-sm" style={{ color: COLORS.ink }}>{c.title}</h4>
              <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>
                {c.duration} · {c.show_price ? `₩${(c.price / 10000).toFixed(0)}만` : '문의'}
              </p>
              {c.description && <p className="font-body text-xs mt-1.5 line-clamp-1" style={{ color: COLORS.stone }}>{c.description}</p>}

              <div onClick={e => e.stopPropagation()} className="flex gap-1 mt-3">
                <button onClick={() => toggleActive(c)}
                  style={{ background: c.is_active ? COLORS.cream : COLORS.primary, color: c.is_active ? COLORS.stone : COLORS.white }}>
                  {c.is_active ? '비활성' : '활성'}
                </button>
                <button onClick={() => togglePrice(c)} className="flex-1 font-heading text-[10px] py-1.5 rounded-full"
                  style={{ background: c.show_price ? COLORS.cream : COLORS.ink, color: c.show_price ? COLORS.stone : COLORS.primary }}>
                  {c.show_price ? '가격숨김' : '가격공개'}
                </button>
                <button onClick={() => startEdit(c)} className="flex-1 font-heading text-[10px] py-1.5 rounded-full flex items-center justify-center gap-1"
                  style={{ background: COLORS.cardElev, color: COLORS.white }}>
                  <Edit3 size={10} />수정
                </button>
                <button onClick={() => remove(c)} className="px-2 py-1.5 rounded-full flex items-center justify-center" style={{ background: COLORS.cream }}>
                  <Trash2 size={10} style={{ color: COLORS.deep }} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function AdminLibrary({ user }) {
  const [files, setFiles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [filter, setFilter] = useState('전체');
  const [form, setForm] = useState({
    name: '', category: '시술 가이드', description: '',
    file: null, file_type: '', file_size: '',
    image_urls: [], imageFiles: [], imagePreviews: [],
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase
      .from('library_files')
      .select('*')
      .order('created_at', { ascending: false });
    setFiles(data || []);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const setFileFromInput = (file) => {
    if (!file) return;
    setForm(prev => ({
      ...prev,
      file,
      name: prev.name || file.name.replace(/\.[^/.]+$/, ''),
      file_type: file.name.split('.').pop().toUpperCase(),
      file_size: formatFileSize(file.size),
    }));
  };

  const handleFileSelect = (e) => {
    setFileFromInput(e.target.files[0]);
  };

  // 🎯 드래그앤드롭 핸들러
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    setFileFromInput(e.dataTransfer.files[0]);
  };

  const uploadLibraryFile = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage
      .from('library-files')
      .upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('library-files').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const deleteLibraryFile = async (fileUrl) => {
    if (!fileUrl) return;
    try {
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/library-files/');
      if (pathParts.length < 2) return;
      await supabase.storage.from('library-files').remove([pathParts[1]]);
    } catch (e) { console.error('파일 삭제 에러:', e); }
  };

  const resetForm = () => {
    form.imagePreviews?.forEach(p => URL.revokeObjectURL(p));
    setForm({ name: '', category: '시술 가이드', description: '', file: null, file_type: '', file_size: '', image_urls: [], imageFiles: [], imagePreviews: [] });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (f) => {
    setForm({
      name: f.name || '',
      category: f.category || '시술 가이드',
      description: f.description || '',
      file: null,
      file_type: f.file_type || '',
      file_size: f.file_size || '',
      image_urls: Array.isArray(f.image_urls) ? f.image_urls : [],
      imageFiles: [],
      imagePreviews: [],
    });
    setEditingId(f.id);
    setShowForm(true);
    setTimeout(() => document.querySelector('.admin-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const submit = async () => {
    if (!form.name.trim()) return toast('자료명을 입력해주세요');

    setSubmitLoading(true);
    try {
      // 🖼️ 여러 장 이미지 업로드 (기존 유지분 + 새 파일)
      let imageUrls = form.image_urls || [];
      if ((form.imageFiles?.length || 0) > 0) {
        setUploading(true);
        imageUrls = await persistFormImages(form, 'library-files');
        setUploading(false);
      }

      if (editingId) {
        // 🍊 수정 모드
        const updateData = {
          name: form.name.trim(),
          category: form.category,
          description: form.description.trim(),
          image_urls: imageUrls,
        };
        // 새 파일 업로드한 경우만 파일 교체
        if (form.file) {
          setUploading(true);
          const oldFile = files.find(f => f.id === editingId);
          if (oldFile?.file_url) await deleteLibraryFile(oldFile.file_url);
          const fileUrl = await uploadLibraryFile(form.file);
          updateData.file_url = fileUrl;
          updateData.file_type = form.file_type;
          updateData.file_size = form.file_size;
          setUploading(false);
        }
        const { error } = await supabase.from('library_files').update(updateData).eq('id', editingId);
        if (error) throw error;
        toast('수정 완료!');
      } else {
        // 🍊 새 등록 (파일·이미지는 선택사항)
        const insertData = {
          name: form.name.trim(),
          category: form.category,
          description: form.description.trim(),
          image_urls: imageUrls,
        };
        if (form.file) {
          setUploading(true);
          const fileUrl = await uploadLibraryFile(form.file);
          insertData.file_url = fileUrl;
          insertData.file_type = form.file_type;
          insertData.file_size = form.file_size;
          setUploading(false);
        }
        const { error } = await supabase.from('library_files').insert(insertData);
        if (error) throw error;
        toast('등록 완료!');
      }
      resetForm();
      await load();
    } catch (err) {
      console.error(err);
      toast('저장 실패: ' + err.message);
    }
    setSubmitLoading(false);
    setUploading(false);
  };

  const remove = async (file) => {
    if (!await confirmDialog('이 자료를 삭제하시겠습니까?\n파일·사진도 함께 삭제됩니다.')) return;
    const { error } = await supabase.from('library_files').delete().eq('id', file.id);
    if (error) { toast('삭제 실패: ' + error.message); return; }
    if (file.file_url) await deleteLibraryFile(file.file_url);
    for (const url of (Array.isArray(file.image_urls) ? file.image_urls : [])) {
      await deleteImageFromBucket(url, 'library-files');
    }
    await load();
  };

  const categories = ['전체', '시술 가이드', '색소 차트', '매뉴얼', '템플릿', '기타'];
  const filtered = filter === '전체' ? files : files.filter(f => f.category === filter);

  return (
    <>
      <PageIntro ko="자료실 관리" en="Library Admin" />
      <div className="px-5 space-y-3">
        {/* 통계 카드 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-3" style={{ background: COLORS.primary }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.white }}>전체 자료</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.white }}>{files.length}</p>
          </div>
          <div className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>카테고리</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>{categories.length - 1}</p>
          </div>
        </div>

        {/* 새 자료 업로드 버튼 */}
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="w-full rounded-full py-3 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
            <Plus size={14} strokeWidth={2.5} />새 자료 업로드
          </button>
        )}

        {/* 업로드/수정 폼 */}
        {showForm && (
          <div className="rounded-2xl p-4 space-y-3 animate-fade-in admin-edit-form" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base" style={{ color: COLORS.ink }}>
                {editingId ? '자료 수정' : '새 자료 업로드'}
              </h3>
              <button onClick={resetForm}><X size={18} style={{ color: COLORS.stone }} /></button>
            </div>

            {/* 파일 선택 (드래그앤드롭 지원) */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>
                {editingId ? '파일 (선택, 새 파일이면 교체)' : '파일 *'}
              </label>
              {form.file ? (
                <div className="mt-2 flex items-center gap-3 p-3 rounded-xl" style={{ background: COLORS.cream }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.peach }}>
                    <FolderOpen size={18} style={{ color: COLORS.primary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-xs truncate" style={{ color: COLORS.ink }}>{form.file.name}</p>
                    <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>{form.file_type} · {form.file_size}</p>
                  </div>
                  <button onClick={() => setForm({ ...form, file: null, file_type: editingId ? form.file_type : '', file_size: editingId ? form.file_size : '' })}
                    className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: COLORS.cardElev }}>
                    <X size={12} style={{ color: COLORS.white }} />
                  </button>
                </div>
              ) : (
                <label
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className="mt-2 rounded-xl flex flex-col items-center justify-center cursor-pointer py-10 transition-all"
                  style={{
                    background: dragOver ? 'rgba(255,92,31,0.1)' : COLORS.cream,
                    border: `2px dashed ${dragOver ? COLORS.primary : COLORS.light}`,
                    transform: dragOver ? 'scale(1.02)' : 'scale(1)',
                  }}>
                  <Upload size={28} style={{ color: dragOver ? COLORS.primary : COLORS.stone }} />
                  <span className="font-heading text-sm mt-2" style={{ color: dragOver ? COLORS.primary : COLORS.ink }}>
                    {dragOver ? '여기에 놓으세요!' : '파일을 드래그하거나 클릭'}
                  </span>
                  <span className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>모든 파일 형식 가능</span>
                  <input type="file" onChange={handleFileSelect} className="hidden" />
                </label>
              )}
            </div>

            {/* 사진 (여러 장) */}
            <MultiImageField
              label="사진 (여러 장)"
              help="자료 미리보기용"
              value={form}
              onChange={(v) => setForm({ ...form, ...v })}
            />

            {/* 자료명 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>자료명 *</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                placeholder="예: 엠보 브로우 시술 가이드"
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>

            {/* 카테고리 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>카테고리</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }}>
                <option>시술 가이드</option><option>색소 차트</option><option>매뉴얼</option><option>템플릿</option><option>기타</option>
              </select>
            </div>

            {/* 설명 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>설명</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                placeholder="자료에 대한 간단한 설명" rows={2}
                className="w-full font-body text-xs font-medium p-2 mt-1 outline-none resize-none rounded"
                style={{ background: COLORS.cream, color: COLORS.ink }} />
            </div>

            <button onClick={submit} disabled={submitLoading || uploading}
              className="w-full font-heading text-sm py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: COLORS.cardElev, color: COLORS.white }}>
              {(submitLoading || uploading) && <Loader2 size={14} className="animate-spin" />}
              {uploading ? '업로드 중...' : editingId ? '수정 저장' : '등록하기'}
            </button>
          </div>
        )}

        {/* 카테고리 필터 */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 py-1">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className="shrink-0 px-3 py-1.5 rounded-full font-body text-xs font-semibold"
              style={{
                background: filter === cat ? COLORS.primary : COLORS.card,
                color: filter === cat ? COLORS.white : COLORS.ink,
                border: `1px solid ${filter === cat ? COLORS.primary : COLORS.light}`,
              }}>
              {cat}
            </button>
          ))}
        </div>

        {/* 자료 목록 */}
        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <FolderOpen size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>
              {filter === '전체' ? '등록된 자료가 없습니다' : `${filter} 카테고리 자료가 없습니다`}
            </p>
          </div>
        ) : filtered.map(f => (
          <div key={f.id} onClick={() => startEdit(f)} className="rounded-2xl p-3 flex items-center gap-3 cursor-pointer transition-transform active:scale-[0.98]" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl" style={{ background: COLORS.peach }}>
              <FolderOpen size={20} style={{ color: COLORS.primary }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>{f.category || '기타'}</p>
              <p className="font-heading text-xs mt-0.5 truncate" style={{ color: COLORS.ink }}>{f.name}</p>
              <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>{f.file_type} · {f.file_size}</p>
              {f.description && (
                <p className="font-body text-[11px] mt-1 line-clamp-1" style={{ color: COLORS.stone }}>{f.description}</p>
              )}
            </div>
            <div onClick={e => e.stopPropagation()} className="flex flex-col gap-1.5 shrink-0">
              <button onClick={() => startEdit(f)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: COLORS.cardElev }}>
                <Edit3 size={11} style={{ color: COLORS.white }} />
              </button>
              <button onClick={() => remove(f)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: COLORS.cream }}>
                <Trash2 size={12} style={{ color: COLORS.deep }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function AdminQna({ user }) {
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [qnaFilter, setQnaFilter] = useState('all'); // 'all' | 'pending' | 'answered'

  const toggleFilter = (status) => {
    setQnaFilter(prev => prev === status ? 'all' : status);
  };
 
  useEffect(() => { load(); }, []);
 
  const load = async () => {
    // 질문 먼저 가져오기 (조인 없이 안전하게)
    const { data: qData, error: qErr } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (qErr) {
      console.error('Q&A 로드 에러:', qErr);
      setQuestions([]);
      return;
    }
    if (!qData || qData.length === 0) {
      setQuestions([]);
      return;
    }

    // 작성자 프로필 별도로 가져오기
    const userIds = [...new Set(qData.map(q => q.user_id).filter(Boolean))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, name, avatar_color, avatar_url')
      .in('id', userIds);
    
    const profileMap = {};
    (profilesData || []).forEach(p => { profileMap[p.id] = p; });
    
    const enriched = qData.map(q => ({ ...q, profiles: profileMap[q.user_id] || { name: '알 수 없음' } }));
    setQuestions(enriched);
  };
 
  const submitAnswer = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    const { error: answerError } = await supabase.from('questions').update({
      answer, status: 'answered',
      answered_by: user.id, answered_at: new Date().toISOString()
    }).eq('id', selected.id);
    if (answerError) {
      toast('답변 저장 실패: ' + answerError.message);
      setLoading(false);
      return;
    }

    // 📢 질문자에게 알림
    if (selected.user_id && selected.user_id !== user.id) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: `원장님이 답변을 남겼어요!`,
            body: `Q. ${selected.title}`,
            url: '/',
            targetUserId: selected.user_id,
          }),
        });
      } catch (e) { console.error('알림 발송 실패:', e); }
    }

    // 🍊 운영진이면 원장님께 별도 알림
    await notifyAdminsOfStaffActivity(user, `Q&A 답변: ${selected.title}`, answer.substring(0, 60));

    setAnswer(''); setSelected(null);
    await load();
    setLoading(false);
  };

  const deleteAnswer = async () => {
    if (!await confirmDialog('답변을 삭제하시겠습니까?\n질문은 "답변 대기" 상태로 돌아갑니다.')) return;
    setLoading(true);
    const { error } = await supabase.from('questions').update({
      answer: null,
      status: 'pending',
      answered_by: null,
      answered_at: null,
    }).eq('id', selected.id);
    setLoading(false);
    if (error) {
      toast('삭제 실패: ' + error.message);
    } else {
      toast('답변이 삭제되었습니다');
      setAnswer('');
      setSelected(null);
      await load();
    }
  };
 
  if (selected) {
    return (
      <div className="px-5 py-5">
        <button onClick={() => setSelected(null)} className="font-body text-xs flex items-center gap-1 mb-4" style={{ color: COLORS.stone }}>
          <ChevronLeft size={14} />목록으로
        </button>
        <div className="rounded-2xl p-4 mb-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.cream, color: COLORS.stone }}>{selected.category}</span>
          <h3 className="font-heading text-base mt-2" style={{ color: COLORS.ink }}>{selected.title}</h3>
          <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>{selected.profiles?.name}</p>
          {selected.content && <p className="font-body text-xs mt-3 leading-relaxed" style={{ color: COLORS.stone }}>{selected.content}</p>}
        </div>
        <div className="rounded-2xl p-4 space-y-3" style={{ background: COLORS.peach }}>
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.deep }}>관리자 답변</p>
          <textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="답변을 작성해주세요" rows={6}
            className="w-full font-body text-xs p-3 outline-none resize-none rounded" style={{ background: COLORS.card, color: COLORS.ink }} />
          <button onClick={submitAnswer} disabled={loading} className="w-full font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-2" style={{ background: COLORS.cardElev, color: COLORS.white }}>
            {loading && <Loader2 size={12} className="animate-spin" />}{selected?.answer ? '답변 수정하기' : '답변 등록하기'}
          </button>
          
          {/* 답변 삭제 (답변 있을 때만 표시) */}
          {selected?.answer && (
            <button onClick={deleteAnswer} disabled={loading} className="w-full font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-2" style={{ background: COLORS.cream, color: COLORS.deep, border: `1px solid ${COLORS.light}` }}>
              <Trash2 size={11} strokeWidth={2.5} />답변 삭제하기
            </button>
          )}
        </div>
      </div>
    );
  }
 
  const pending = questions.filter(q => q.status === 'pending');
  const answered = questions.filter(q => q.status === 'answered');
  const filtered = qnaFilter === 'all' ? questions : qnaFilter === 'pending' ? pending : answered;
 
  return (
    <>
      <PageIntro ko="Q&A 답변" en="Q&A Admin" />
      <div className="px-5 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => toggleFilter('pending')}
            className={`rounded-2xl p-3 text-left transition-transform active:scale-95 ${qnaFilter === 'pending' ? 'glow-primary' : ''}`}
            style={{ background: COLORS.primary }}>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.white }}>답변 대기</p>
              {qnaFilter === 'pending' && <span className="text-[10px]" style={{ color: COLORS.white }}>●</span>}
            </div>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.white }}>{pending.length}</p>
          </button>
          <button onClick={() => toggleFilter('answered')}
            className={`rounded-2xl p-3 text-left transition-transform active:scale-95 ${qnaFilter === 'answered' ? 'glow-soft' : ''}`}
            style={{ background: COLORS.card, border: `1px solid ${qnaFilter === 'answered' ? COLORS.primary : COLORS.light}` }}>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: qnaFilter === 'answered' ? COLORS.primary : COLORS.stone }}>답변 완료</p>
              {qnaFilter === 'answered' && <span className="text-[10px]" style={{ color: COLORS.primary }}>●</span>}
            </div>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>{answered.length}</p>
          </button>
        </div>

        {/* 필터 활성 표시 */}
        {qnaFilter !== 'all' && (
          <div className="flex items-center justify-between px-1 -mt-1">
            <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
              <span style={{ color: COLORS.primary, fontWeight: 'bold' }}>{qnaFilter === 'pending' ? '답변 대기' : '답변 완료'}</span> 만 보는 중
            </p>
            <button onClick={() => setQnaFilter('all')} className="font-mono text-[10px] font-semibold flex items-center gap-1" style={{ color: COLORS.primary }}>
              전체 보기 <X size={10} strokeWidth={2.5} />
            </button>
          </div>
        )}
        {filtered.length === 0 ? (
          <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>
            {qnaFilter === 'pending' ? '답변 대기 중인 질문이 없습니다' :
             qnaFilter === 'answered' ? '답변 완료된 질문이 없습니다' :
             '등록된 질문이 없습니다'}
          </p>
        ) : filtered.map(q => (
          <button key={q.id} onClick={() => { setSelected(q); setAnswer(q.answer || ''); }} className="w-full text-left rounded-2xl p-4 transition-transform active:scale-[0.98]" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{
                background: q.status === 'answered' ? COLORS.ink : COLORS.primary,
                color: q.status === 'answered' ? COLORS.primary : COLORS.white
              }}>{q.status === 'answered' ? '완료' : '대기'}</span>
              <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.peach, color: COLORS.deep }}>{q.category}</span>
            </div>
            <p className="font-heading text-sm" style={{ color: COLORS.ink }}>{q.title}</p>
            <p className="font-mono text-[10px] mt-1.5" style={{ color: COLORS.stone }}>{q.profiles?.name} · {new Date(q.created_at).toLocaleDateString('ko-KR')}</p>
            {q.answer && (
              <div className="mt-2 pt-2 rounded-lg flex items-start gap-1.5" style={{ borderTop: `1px solid ${COLORS.light}` }}>
                <span className="font-mono text-[9px] font-bold tracking-widest uppercase shrink-0 mt-0.5" style={{ color: COLORS.primary }}>답변</span>
                <p className="font-body text-[11px] line-clamp-2 leading-relaxed" style={{ color: COLORS.stone }}>{q.answer}</p>
              </div>
            )}
          </button>
        ))}
      </div>
    </>
  );
}
