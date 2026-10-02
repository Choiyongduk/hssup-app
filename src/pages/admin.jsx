import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { COLORS } from '../lib/colors';
import { toast } from '../lib/toast';
import { confirmDialog } from '../lib/dialog';
import { compressImage, isYouTubeUrl, uploadPostVideo, deletePostVideo, deleteImageFromBucket, persistFormImages, getRowImages } from '../lib/images';
import { notifyAdminsOfStaffActivity, notifyEveryone, notifyUsers } from '../lib/notifications';
import { useDraft } from '../hooks';
import { PROMPT_GROUPS } from '../lib/chatgptPrompts';
import {
  MultiImageField, SkeletonImage, Avatar, LevelCard, PageIntro, Pagination,
} from '../components/common';
import { Bell, BookOpen, MessageCircle, FolderOpen, Sparkles, ShoppingBag, PlayCircle, Users, BarChart3, FileText, ChevronRight, Clock, Check, Plus, Edit3, Play, Upload, Trash2, ChevronLeft, Shield, UserCheck, UserPlus, CreditCard, AlertCircle, Camera, ArrowUpRight, Loader2, X, Search, Package, Truck, Mic, Paperclip, Copy, Palette } from 'lucide-react';

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
    const { data, error } = await supabase
      .from('improvements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('개선 제안 로드 에러:', error); toast('개선 제안 목록을 불러오지 못했어요: ' + error.message); }

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

              <p className="font-body text-sm leading-relaxed mb-3 break-words" style={{ color: COLORS.ink, whiteSpace: 'pre-wrap' }}>
                {item.content}
              </p>

              {item.status === 'replied' && item.admin_reply ? (
                <div className="rounded-lg p-3" style={{ background: COLORS.cardElev, borderLeft: `3px solid ${COLORS.primary}` }}>
                  <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-1" style={{ color: COLORS.primary }}>━━ 답변</p>
                  <p className="font-body text-sm leading-relaxed break-words" style={{ color: COLORS.ink, whiteSpace: 'pre-wrap' }}>
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
    pendingQna: 0,
    monthRevenue: 0,
    lastMonthRevenue: 0,
    newStudents: 0,
    monthOrders: 0,
    monthlyTrend: [],
    awaitingApprovals: 0,
  });

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        { count: pendingQna },
        { data: thisMonthOrders },
        { data: lastMonthOrders },
        { count: newStudents },
      ] = await Promise.all([
        supabase.from('questions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('amount').eq('status', 'paid').gte('paid_at', thisMonthStart),
        supabase.from('orders').select('amount').eq('status', 'paid').gte('paid_at', lastMonthStart).lt('paid_at', lastMonthEnd),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').neq('status', 'deleted').gte('created_at', thisMonthStart),
      ]);

      // AI 오피스 타일에 띄울 숫자. 원장님만 보는 화면이라 여기서 같이 읽는다.
      const { count: awaitingApprovals } = await supabase
        .from('ai_approvals').select('*', { count: 'exact', head: true }).eq('status', 'awaiting');
      
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
        pendingQna: pendingQna || 0,
        monthRevenue,
        lastMonthRevenue,
        newStudents: newStudents || 0,
        monthOrders: thisMonthOrders?.length || 0,
        monthlyTrend,
        awaitingApprovals: awaitingApprovals || 0,
      });
    };
    load();
  }, []);

  useEffect(() => {
    const loadUpdates = async () => {
      const since = new Date(Date.now() - newDays * 24 * 60 * 60 * 1000).toISOString();
      const [notices, trends, tips, lectures, library, posts, questions] = await Promise.all([
        supabase.from('notices').select('id, title, created_at').gte('created_at', since).order('created_at', { ascending: false }),
        supabase.from('trends').select('id, title, created_at').eq('is_active', true).gte('created_at', since).order('created_at', { ascending: false }),
        supabase.from('tips').select('id, title, created_at').eq('is_active', true).gte('created_at', since).order('created_at', { ascending: false }),
        supabase.from('lectures').select('id, title, created_at').eq('is_published', true).gte('created_at', since).order('created_at', { ascending: false }),
        supabase.from('library_files').select('id, name, created_at').gte('created_at', since).order('created_at', { ascending: false }),
        // 👥 회원이 쓴 커뮤니티 글 + Q&A 도 새 글로 표시
        supabase.from('community_posts').select('id, content, category, created_at').gte('created_at', since).order('created_at', { ascending: false }),
        supabase.from('questions').select('id, title, created_at').gte('created_at', since).order('created_at', { ascending: false }),
      ]);
      const catType = { '자유': '자유', '인사': '가입인사', '후기': '수강후기' };
      const all = [
        ...(notices.data || []).map(x => ({ id: x.id, title: x.title, created_at: x.created_at, type: '공지', page: 'admin-notice' })),
        ...(trends.data || []).map(x => ({ id: x.id, title: x.title, created_at: x.created_at, type: '트렌드', page: 'admin-trends' })),
        ...(tips.data || []).map(x => ({ id: x.id, title: x.title, created_at: x.created_at, type: '꿀팁', page: 'admin-tips' })),
        ...(lectures.data || []).map(x => ({ id: x.id, title: x.title, created_at: x.created_at, type: '강의', page: 'admin-lectures' })),
        ...(library.data || []).map(x => ({ id: x.id, title: x.name, created_at: x.created_at, type: '자료', page: 'admin-library' })),
        ...(posts.data || []).map(x => ({ id: x.id, title: (x.content || '').trim().slice(0, 40) || '(사진)', created_at: x.created_at, type: catType[x.category] || '게시글', page: 'post-detail' })),
        ...(questions.data || []).map(x => ({ id: x.id, title: x.title, created_at: x.created_at, type: 'Q&A', page: 'admin-qna' })),
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
    ...(canViewRevenue ? [{ id: 'admin-ai', label: 'AI OFFICE', ko: 'AI 오피스', icon: BarChart3 }] : []),
    { id: 'admin-approvals',    label: 'APPROVE',  ko: '가입 승인',     icon: UserPlus },
    { id: 'admin-notice',       label: 'NOTICE',   ko: '학원공지',      icon: Bell },
    { id: 'admin-trends',       label: 'TRENDS',   ko: '트렌드',     icon: Sparkles },
    { id: 'admin-tips',         label: 'TIPS',     ko: '수업 꿀팁',     icon: Sparkles },
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

      {/* 이번 달 매출 + AI 오피스 (admin만).
          AI 오피스가 햄버거 메뉴 안에만 있으면 잘 안 들어가게 돼서
          매출 카드를 반으로 줄이고 옆에 나란히 뒀다. */}
      {canViewRevenue && (
      <section className="px-5 mb-3 grid grid-cols-2 gap-2 items-stretch">
        <button onClick={() => setCurrentPage('admin-orders')} className="rounded-3xl p-5 text-left relative overflow-hidden glow-primary" style={{ background: COLORS.primary }}>
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}></div>
          <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full" style={{ background: 'rgba(0,0,0,0.15)' }}></div>
          <div className="relative flex flex-col h-full" style={{ color: COLORS.white }}>
            <p className="font-mono text-[9px] font-bold tracking-[0.2em] uppercase opacity-80">━━ This Month</p>
            <p className="font-display text-3xl mt-2 leading-none tracking-tighter">
              {formatRevenue(stats.monthRevenue)}<span className="font-body text-base font-medium opacity-80">원</span>
            </p>
            <div className="mt-auto pt-4 flex items-end justify-between gap-2">
              <div className="min-w-0">
                {revenueChange !== null && (
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block" style={{ background: 'rgba(0,0,0,0.25)' }}>
                    {revenueChange > 0 ? '↑' : revenueChange < 0 ? '↓' : '→'} {Math.abs(revenueChange)}%
                  </span>
                )}
                <p className="font-body text-[10px] opacity-90 mt-1 leading-tight">
                  {revenueChange === null ? '지난 달 데이터 없음' :
                   revenueChange > 0 ? `지난 달보다 ${revenueChange}% 증가` :
                   revenueChange < 0 ? `지난 달보다 ${Math.abs(revenueChange)}% 감소` :
                   '지난 달과 동일'}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: COLORS.white }}>
                <ArrowUpRight size={14} strokeWidth={2.5} style={{ color: COLORS.primary }} />
              </div>
            </div>
          </div>
        </button>

        <button onClick={() => setCurrentPage('admin-ai')} className="rounded-3xl p-5 text-left relative overflow-hidden" style={{ background: COLORS.ink }}>
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full" style={{ background: 'rgba(255,92,31,0.18)' }}></div>
          <div className="relative flex flex-col h-full" style={{ color: COLORS.white }}>
            <p className="font-mono text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: COLORS.primary }}>━━ AI Office</p>
            <p className="font-display text-3xl mt-2 leading-none tracking-tighter">
              {stats.awaitingApprovals}<span className="font-body text-base font-medium opacity-70">건</span>
            </p>
            <div className="mt-auto pt-4 flex items-end justify-between gap-2">
              <p className="font-body text-[10px] opacity-80 leading-tight min-w-0">
                {stats.awaitingApprovals > 0 ? '승인 기다리는 중' : '승인할 것 없음'}
              </p>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: COLORS.primary }}>
                <ArrowUpRight size={14} strokeWidth={2.5} style={{ color: COLORS.white }} />
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
            <button key={`${u.type}-${u.id}`} onClick={() => setCurrentPage(u.page, u.id)}
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

      {/* Quick Action 4열 그리드 */}
      <section className="px-5">
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase mb-3 px-1" style={{ color: COLORS.primary }}>━━ Quick Action</p>
        <div className="grid grid-cols-4 gap-2">
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
    const { data, error } = await supabase.from('trends').select('*').order('created_at', { ascending: false });
    if (error) { console.error('트렌드 로드 에러:', error); toast('트렌드 목록을 불러오지 못했어요: ' + error.message); }
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
        const { data: inserted, error } = await supabase.from('trends').insert(trendData).select('id').single();
        if (error) throw error;
        const trendUrl = inserted?.id ? `/trend/${inserted.id}` : '/';

        // 📢 원장님 글 → 전원(수강생+운영진) 강제 알림 / 운영진 글 → 체크 시 수강생에게만
        if (user.role === 'admin') {
          await notifyEveryone({
            title: `[${form.category}] 새 트렌드 속보!`,
            body: form.title,
            url: trendUrl,
            excludeUserId: user.id,
          });
        } else if (form.sendPush) {
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
                url: trendUrl,
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
              style={{ background: COLORS.cardElev, color: COLORS.ink }}>
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
              {t.content && <p className="font-body text-xs mt-1.5 line-clamp-2 break-words" style={{ color: COLORS.stone }}>{t.content}</p>}
              <div onClick={e => e.stopPropagation()} className="flex gap-1 mt-3">
                <button onClick={() => toggleActive(t)} className="flex-1 font-heading text-[10px] py-1.5 rounded-full"
                  style={{ background: t.is_active ? COLORS.cream : COLORS.primary, color: t.is_active ? COLORS.stone : COLORS.white }}>
                  {t.is_active ? '숨김' : '공개'}
                </button>
                <button onClick={() => startEdit(t)} className="flex-1 font-heading text-[10px] py-1.5 rounded-full flex items-center justify-center gap-1"
                  style={{ background: COLORS.cardElev, color: COLORS.ink }}>
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
    const { data, error } = await supabase.from('tips').select('*').order('created_at', { ascending: false });
    if (error) { console.error('꿀팁 로드 에러:', error); toast('꿀팁 목록을 불러오지 못했어요: ' + error.message); }
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
        const { data: inserted, error } = await supabase.from('tips').insert(tipData).select('id').single();
        if (error) throw error;
        const tipUrl = inserted?.id ? `/tip/${inserted.id}` : '/';

        // 📢 원장님 글 → 전원(수강생+운영진) 강제 알림 / 운영진 글 → 체크 시 수강생에게만
        if (user.role === 'admin') {
          await notifyEveryone({
            title: `[${form.category}] 새 꿀팁이 올라왔어요!`,
            body: form.title,
            url: tipUrl,
            excludeUserId: user.id,
          });
        } else if (form.sendPush) {
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
                url: tipUrl,
                targetRole: 'student',
              }),
            });
          } catch (e) { console.error('알림 발송 실패:', e); }
        }

        await notifyAdminsOfStaffActivity(user, `수업 꿀팁 등록`, form.title);
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
      <PageIntro ko="수업 꿀팁 관리" en="Tips Admin" />
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
              style={{ background: COLORS.cardElev, color: COLORS.ink }}>
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
              {t.content && <p className="font-body text-xs mt-1.5 line-clamp-2 break-words" style={{ color: COLORS.stone }}>{t.content}</p>}
              <div onClick={e => e.stopPropagation()} className="flex gap-1 mt-3">
                <button onClick={() => toggleActive(t)} className="flex-1 font-heading text-[10px] py-1.5 rounded-full"
                  style={{ background: t.is_active ? COLORS.cream : COLORS.primary, color: t.is_active ? COLORS.stone : COLORS.white }}>
                  {t.is_active ? '숨김' : '공개'}
                </button>
                <button onClick={() => startEdit(t)} className="flex-1 font-heading text-[10px] py-1.5 rounded-full flex items-center justify-center gap-1"
                  style={{ background: COLORS.cardElev, color: COLORS.ink }}>
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
    const { data, error } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
    if (error) { console.error('공지 로드 에러:', error); toast('공지 목록을 불러오지 못했어요: ' + error.message); }
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
        const { data: insertedNotice, error: insertError } = await supabase.from('notices').insert(noticeData).select('id').single();
        if (insertError) throw insertError;
        const noticeUrl = insertedNotice?.id ? `/notice/${insertedNotice.id}` : '/';

        await notifyAdminsOfStaffActivity(user, `공지 등록: ${form.title}`, form.content?.substring(0, 60) || '');

        // 📢 원장님 공지 → 전원(수강생+운영진) 강제 알림 / 운영진 공지 → 체크 시 수강생에게만
        if (user.role === 'admin') {
          await notifyEveryone({
            title: `[${form.tag}] ${form.title}`,
            body: form.content.substring(0, 100) || '새 공지가 등록되었습니다',
            url: noticeUrl,
            excludeUserId: user.id,
          });
          toast('공지 등록 완료!\n전원에게 알림을 보냈어요.');
        } else if (form.sendPush && subscriberCount > 0) {
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
                title: `[${form.tag}] ${form.title}`,
                body: form.content.substring(0, 100) || '새 공지가 등록되었습니다',
                url: noticeUrl,
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

            <button onClick={submit} disabled={loading || uploading} className="w-full font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-2" style={{ background: COLORS.cardElev, color: COLORS.ink }}>
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
                    <Edit3 size={11} style={{ color: COLORS.ink }} />
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
  const [allTime, setAllTime] = useState({ totalRevenue: 0, paidCount: 0, cancelledCount: 0 });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // 누적 통계(전체 기간)는 가벼운 컬럼만 한 번 조회 — join 없이 amount/status만
  useEffect(() => {
    supabase.from('orders').select('amount, status').then(({ data }) => {
      const rows = data || [];
      setAllTime({
        totalRevenue: rows.filter(o => o.status === 'paid').reduce((sum, o) => sum + Number(o.amount || 0), 0),
        paidCount: rows.filter(o => o.status === 'paid').length,
        cancelledCount: rows.filter(o => o.status === 'cancelled').length,
      });
    });
  }, []);

  // 선택된 월의 시작/끝
  const monthStart = new Date(selectedMonth.year, selectedMonth.month, 1);
  const monthEnd = new Date(selectedMonth.year, selectedMonth.month + 1, 1);

  // 목록은 선택된 월만 서버에서 필터링해서 조회 (전체 주문 내역을 매번 다 불러오지 않음)
  useEffect(() => { load(); }, [selectedMonth]);

  const load = async () => {
    setLoading(true);
    // 화면 표시 기준(paid_at 있으면 paid_at, 없으면 created_at)과 동일하게 월 범위를 매칭
    const startISO = monthStart.toISOString();
    const endISO = monthEnd.toISOString();
    const { data, error } = await supabase
      .from('orders')
      .select('*, profiles:user_id(name, email, phone, avatar_color, avatar_url, course)')
      .or(`and(paid_at.gte.${startISO},paid_at.lt.${endISO}),and(paid_at.is.null,created_at.gte.${startISO},created_at.lt.${endISO})`)
      .order('created_at', { ascending: false });
    if (error) { console.error('orders load error:', error); toast('주문 내역을 불러오지 못했어요: ' + error.message); }
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

  // 선택 월의 주문 (이미 서버에서 월 단위로 필터링됨)
  const monthAllOrders = orders;
  const monthPaidOrders = monthAllOrders.filter(o => o.status === 'paid');
  const monthCancelledOrders = monthAllOrders.filter(o => o.status === 'cancelled');
  const monthRevenue = monthPaidOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);

  // 이번 달인지 체크 (미래 월 못 가게)
  const now = new Date();
  const isCurrentMonth = selectedMonth.year === now.getFullYear() && selectedMonth.month === now.getMonth();

  // 누적 통계 (전체 기간)
  const totalRevenue = allTime.totalRevenue;
  const cancelledCount = allTime.cancelledCount;

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
              {allTime.paidCount} <span style={{ color: COLORS.stone, fontSize: '14px' }}>/ {cancelledCount}</span>
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
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('product-pending');

  const [shippingModal, setShippingModal] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingCompany, setTrackingCompany] = useState('');
  const [shipping, setShipping] = useState(false);
  const [cancelProcessing, setCancelProcessing] = useState(null);  // order_id 저장

  const isRealAdmin = user?.role === 'admin';

  useEffect(() => { setPage(1); }, [filter]);
  useEffect(() => { loadOrders(); }, [filter, page]);

  const loadOrders = async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('status', 'paid')
      .order('paid_at', { ascending: false })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

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
    if (error) { console.error('주문 로드 에러:', error); toast('주문 목록을 불러오지 못했어요: ' + error.message); }
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
                      <p className="font-body text-xs break-words" style={{ color: COLORS.ink, whiteSpace: 'pre-wrap' }}>{o.shipping_memo}</p>
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
                    <p className="font-body text-xs mt-1 break-words" style={{ color: COLORS.deep, whiteSpace: 'pre-wrap' }}>{o.cancel_reason_user || '-'}</p>
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
        {!loading && (
          <Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />
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

// 2시간 단위 프리셋 시간대 (10~20시, 5타임)
const PRACTICE_PRESETS = [
  { start: '10:00', end: '12:00' },
  { start: '12:00', end: '14:00' },
  { start: '14:00', end: '16:00' },
  { start: '16:00', end: '18:00' },
  { start: '18:00', end: '20:00' },
];

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
  const [selectedPresets, setSelectedPresets] = useState([]);  // 체크된 프리셋 인덱스

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

  const togglePreset = (i) => {
    setSelectedPresets(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const addPresetSlots = async () => {
    if (!selectedDate) { toast('날짜를 선택해주세요'); return; }
    if (selectedPresets.length === 0) { toast('추가할 시간대를 선택해주세요'); return; }
    const cap = Number(capacity);
    if (!cap || cap < 1) { toast('정원은 1명 이상이어야 합니다'); return; }

    // 이미 등록된 시간대는 건너뛰기 (중복 슬롯 방지)
    const existingStarts = new Set(daySlots.map(s => (s.start_time || '').slice(0, 5)));
    const rows = selectedPresets
      .map(i => PRACTICE_PRESETS[i])
      .filter(p => !existingStarts.has(p.start))
      .map(p => ({
        slot_date: selectedDate,
        start_time: p.start,
        end_time: p.end,
        capacity: cap,
        memo: memo.trim() || null,
        created_by: user.id,
      }));
    const skipped = selectedPresets.length - rows.length;
    if (rows.length === 0) { toast('선택한 시간대가 이미 모두 등록되어 있어요'); return; }

    setAdding(true);
    const { data, error } = await supabase.from('practice_slots').insert(rows).select();
    setAdding(false);
    if (error) { toast('슬롯 추가 실패: ' + error.message); return; }
    if (!data || data.length === 0) {
      toast('슬롯 추가가 적용되지 않았어요. RLS(practice_slots manage 정책) 확인 필요.');
      return;
    }
    toast(skipped > 0 ? `${data.length}개 추가 (이미 있던 ${skipped}개는 제외)` : `${data.length}개 시간대 추가 완료`);
    setShowAddModal(false);
    setSelectedPresets([]);
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

  // 날짜별 예약 현황 색상 (초록: 여유, 주황: 일부 예약, 빨강: 마감)
  const dateStatusColor = (dateStr) => {
    const ds = slotsByDate[dateStr];
    if (!ds || ds.length === 0) return null;
    const totalCap = ds.reduce((sum, s) => sum + (s.capacity || 0), 0);
    const totalBooked = ds.reduce((sum, s) => sum + (bookerCounts[s.id] || 0), 0);
    if (totalBooked === 0) return '#22C55E';
    if (totalBooked >= totalCap) return '#EF4444';
    return '#F59E0B';
  };

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
              const statusColor = dateStatusColor(dateStr);
              const hasSlots = !!statusColor;
              const isSelected = selectedDate === dateStr;
              return (
                <button key={d} onClick={() => setSelectedDate(dateStr)}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center transition-transform active:scale-95"
                  style={{
                    background: isSelected ? COLORS.primary : hasSlots ? COLORS.cardElev : 'transparent',
                    border: isSelected ? `1px solid ${COLORS.primary}` : hasSlots ? `1px solid ${statusColor}55` : `1px solid ${COLORS.light}`,
                  }}>
                  <span className="font-body text-sm" style={{ color: isSelected ? COLORS.white : COLORS.ink, fontWeight: hasSlots ? 700 : 400 }}>{d}</span>
                  {hasSlots && (
                    <span className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: isSelected ? COLORS.white : statusColor }}></span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-3 mt-3 pt-3" style={{ borderTop: `1px solid ${COLORS.light}` }}>
            {[['#22C55E', '여유'], ['#F59E0B', '일부 예약'], ['#EF4444', '마감']].map(([c, label]) => (
              <span key={c} className="font-mono text-[9px] inline-flex items-center gap-1" style={{ color: COLORS.stone }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }}></span>{label}
              </span>
            ))}
          </div>
        </div>

        {/* 이번 달 예약 현황 (한눈에 보기) */}
        <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: COLORS.primary }}>━━ 이번 달 예약 현황</p>
          {Object.keys(slotsByDate).length === 0 ? (
            <p className="font-body text-xs text-center py-4" style={{ color: COLORS.stone }}>등록된 슬롯이 없어요</p>
          ) : (
            <div className="space-y-3">
              {Object.keys(slotsByDate).sort().map(dateStr => {
                const [yy, mm, dd] = dateStr.split('-').map(Number);
                const weekday = dayLabels[new Date(yy, mm - 1, dd).getDay()];
                return (
                  <div key={dateStr}>
                    <button onClick={() => setSelectedDate(dateStr)}
                      className="font-heading text-xs mb-1.5 inline-flex items-center gap-1"
                      style={{ color: selectedDate === dateStr ? COLORS.primary : COLORS.ink }}>
                      {mm}/{dd} ({weekday})
                    </button>
                    <div className="space-y-1.5">
                      {slotsByDate[dateStr].map(s => {
                        const count = bookerCounts[s.id] || 0;
                        const full = count >= s.capacity;
                        const statusColor = count === 0 ? '#22C55E' : full ? '#EF4444' : '#F59E0B';
                        return (
                          <button key={s.id} onClick={() => viewBookers(s)}
                            className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 active:scale-[0.98] transition-transform"
                            style={{ background: COLORS.cardElev, border: `1px solid ${COLORS.light}` }}>
                            <span className="font-body text-xs inline-flex items-center gap-1.5" style={{ color: COLORS.ink }}>
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusColor }}></span>
                              {(s.start_time || '').substring(0, 5)}~{(s.end_time || '').substring(0, 5)}
                            </span>
                            <span className="font-mono text-[10px] flex-shrink-0" style={{ color: statusColor }}>
                              {count}/{s.capacity}{full && ' · 마감'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 선택 날짜 영역 */}
        {selectedDate && (
          <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ Selected</p>
                <p className="font-heading text-base mt-1" style={{ color: COLORS.ink }}>{selectedDate}</p>
              </div>
              <button onClick={() => { setSelectedPresets([]); setShowAddModal(true); }}
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
                          {s.memo && <p className="font-body text-xs mt-1 break-words" style={{ color: COLORS.stone }}>{s.memo}</p>}
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
            <button onClick={() => { setShowAddModal(false); setSelectedPresets([]); }}
              style={{ width: 36, height: 36, border: 'none', background: 'transparent', color: COLORS.stone, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: 16 }}>
            <div className="rounded-lg p-3 mb-4" style={{ background: COLORS.cardElev, border: `1px solid ${COLORS.light}` }}>
              <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>날짜</p>
              <p className="font-heading text-sm mt-1" style={{ color: COLORS.ink }}>{selectedDate}</p>
            </div>

            <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-1.5" style={{ color: COLORS.stone }}>빠른 추가 (2시간 단위)</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {PRACTICE_PRESETS.map((p, i) => {
                const already = daySlots.some(s => (s.start_time || '').slice(0, 5) === p.start);
                const checked = selectedPresets.includes(i);
                return (
                  <button key={p.start} type="button" disabled={already}
                    onClick={() => togglePreset(i)}
                    className="rounded-lg py-2.5 font-heading text-sm flex items-center justify-center gap-1.5 disabled:opacity-40"
                    style={{
                      background: checked ? COLORS.primary : COLORS.card,
                      color: checked ? COLORS.white : COLORS.ink,
                      border: `1px solid ${checked ? COLORS.primary : COLORS.light}`,
                      minWidth: 0,
                    }}>
                    {checked && <Check size={13} strokeWidth={2.5} />}
                    {p.start} ~ {p.end}{already ? ' (등록됨)' : ''}
                  </button>
                );
              })}
            </div>

            <div className="mb-4">
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>정원 (명) · 선택한 시간대 공통 적용</label>
              <input type="number" min="1" max="10" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value)}
                className="w-full font-body text-sm p-3 mt-1.5 outline-none rounded"
                style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
            </div>
            <div className="mb-4">
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>메모 (선택)</label>
              <textarea value={memo} onChange={(e) => setMemo(e.target.value)}
                placeholder="예: 1번 베드, 강의실 1"
                rows={2}
                className="w-full font-body text-sm p-3 mt-1.5 outline-none resize-none rounded"
                style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
            </div>

            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-px" style={{ background: COLORS.light }} />
              <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.muted }}>또는 직접 입력</p>
              <div className="flex-1 h-px" style={{ background: COLORS.light }} />
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div style={{ minWidth: 0 }}>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>시작 시간</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="w-full font-body text-sm p-3 mt-1.5 outline-none rounded"
                  style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}`, minWidth: 0, maxWidth: '100%' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>종료 시간</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="w-full font-body text-sm p-3 mt-1.5 outline-none rounded"
                  style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}`, minWidth: 0, maxWidth: '100%' }} />
              </div>
            </div>
            <button onClick={addSlot} disabled={adding}
              className="w-full rounded-full py-2.5 font-heading text-xs flex items-center justify-center gap-1.5"
              style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
              {adding && selectedPresets.length === 0 ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={2.5} />}
              이 시간대만 추가
            </button>
          </div>
          <div style={{
            flexShrink: 0, padding: 16,
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            borderTop: `1px solid ${COLORS.light}`, background: COLORS.card,
            display: 'flex', gap: 8
          }}>
            <button onClick={() => { setShowAddModal(false); setSelectedPresets([]); }} disabled={adding}
              className="flex-1 rounded-full py-3 font-heading text-sm"
              style={{ background: COLORS.cardElev, color: COLORS.stone, border: `1px solid ${COLORS.light}` }}>
              취소
            </button>
            <button onClick={addPresetSlots} disabled={adding || selectedPresets.length === 0}
              className="flex-1 rounded-full py-3 font-heading text-sm flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 16px rgba(255,92,31,0.35)' }}>
              {adding && selectedPresets.length > 0 ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={2.5} />}
              선택한 시간대 추가{selectedPresets.length > 0 ? ` (${selectedPresets.length})` : ''}
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
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: 16 }}>
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
  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selected, setSelected] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { loadCounts(); }, []);
  useEffect(() => { setSelected(new Set()); load(); }, [filter]);

  // 상태별 카운트(대기/승인/거절 배지)는 전체 기준으로 별도 조회 — 목록은 현재 탭만 불러옴
  const loadCounts = async () => {
    const [p, a, r] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
    ]);
    setCounts({ pending: p.count || 0, approved: a.count || 0, rejected: r.count || 0 });
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').eq('status', filter)
      .order('created_at', { ascending: false }).limit(200);
    if (error) { console.error('가입 승인 목록 로드 에러:', error); toast('목록을 불러오지 못했어요: ' + error.message); }
    setUsers(data || []);
    setLoading(false);
  };

  const refresh = async () => { await Promise.all([load(), loadCounts()]); };

  const approve = async (userId, asGraduate = false) => {
    // 신입생/졸업생 온보딩은 동일(가입인사 필수). 졸업생 여부는 구분 라벨일 뿐.
    const msg = asGraduate
      ? '졸업생으로 승인하시겠습니까?'
      : '수강생으로 승인하시겠습니까?';
    if (!await confirmDialog(msg)) return;

    const { error } = await supabase.from('profiles').update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      rejected_reason: null,
      is_graduate: asGraduate,
    }).eq('id', userId);
    if (error) {
      toast('승인 실패: ' + error.message);
    } else {
      notifyUsers({ title: '가입이 승인됐어요!', body: '이제 히썹 아카데미 앱을 자유롭게 이용하실 수 있어요', url: '/', userIds: userId });
      await refresh();
    }
  };

  const toggleSelect = (userId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const bulkApprove = async () => {
    if (selected.size === 0) return;
    if (!await confirmDialog(`선택한 ${selected.size}명을 일괄 승인하시겠습니까?\n(일반 수강생으로 승인됩니다)`)) return;
    setBulkLoading(true);
    const { error } = await supabase.from('profiles').update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      rejected_reason: null,
      is_graduate: false,
    }).in('id', [...selected]);
    setBulkLoading(false);
    if (error) {
      toast('일괄 승인 실패: ' + error.message);
    } else {
      notifyUsers({ title: '가입이 승인됐어요!', body: '이제 히썹 아카데미 앱을 자유롭게 이용하실 수 있어요', url: '/', userIds: [...selected] });
      toast(`${selected.size}명 일괄 승인 완료!`);
      setSelected(new Set());
      await refresh();
    }
  };

  const reject = async (userId) => {
    const { error } = await supabase.from('profiles').update({
      status: 'rejected',
      rejected_reason: rejectReason.trim() || null,
    }).eq('id', userId);
    if (error) {
      toast('거절 실패: ' + error.message);
    } else {
      setRejectingId(null);
      setRejectReason('');
      await refresh();
    }
  };

  const revoke = async (userId) => {
    if (!await confirmDialog('이 회원의 승인을 취소하시겠습니까?\n승인 대기 상태로 돌아갑니다.')) return;
    const { error } = await supabase.from('profiles').update({ status: 'pending' }).eq('id', userId);
    if (error) { toast('승인 취소 실패: ' + error.message); return; }
    await refresh();
  };

  const filtered = users;

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

        {/* 일괄 승인 바 (대기 탭 · 항목 있을 때만) */}
        {filter === 'pending' && !loading && filtered.length > 0 && (
          <div className="rounded-2xl p-3 flex items-center gap-3" style={{ background: COLORS.cardElev, border: `1px solid ${COLORS.light}` }}>
            <button onClick={() => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(u => u.id)))}
              className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{
                background: selected.size === filtered.length ? COLORS.primary : COLORS.card,
                border: `1.5px solid ${selected.size === filtered.length ? COLORS.primary : COLORS.light}`,
              }}>
                {selected.size === filtered.length && <Check size={12} strokeWidth={3} style={{ color: COLORS.white }} />}
              </div>
              <span className="font-body text-xs font-semibold" style={{ color: COLORS.ink }}>전체 선택</span>
            </button>
            <div className="flex-1" />
            {selected.size > 0 && (
              <>
                <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>{selected.size}명 선택</span>
                <button onClick={bulkApprove} disabled={bulkLoading}
                  className="font-heading text-xs px-3 py-2 rounded-full flex items-center gap-1"
                  style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 16px rgba(255, 92, 31, 0.4)' }}>
                  {bulkLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={3} />}
                  일괄 승인
                </button>
              </>
            )}
          </div>
        )}

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
              {filter === 'pending' && (
                <button onClick={() => toggleSelect(u.id)} className="shrink-0 mt-1">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{
                    background: selected.has(u.id) ? COLORS.primary : COLORS.card,
                    border: `1.5px solid ${selected.has(u.id) ? COLORS.primary : COLORS.light}`,
                  }}>
                    {selected.has(u.id) && <Check size={12} strokeWidth={3} style={{ color: COLORS.white }} />}
                  </div>
                </button>
              )}
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
                    <p className="font-mono text-[10px] font-bold" style={{ color: COLORS.primary }}>졸업생</p>
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
              {u.status === 'pending' && rejectingId === u.id && (
                <div className="rounded-xl p-3" style={{ background: COLORS.cream }}>
                  <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-1.5" style={{ color: COLORS.stone }}>거절 사유 (선택, 비워도 됨)</p>
                  <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                    placeholder="예: 정보 확인 불가, 중복 가입 등" rows={2}
                    className="w-full font-body text-xs p-2 outline-none resize-none rounded"
                    style={{ background: COLORS.card, color: COLORS.ink }} />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => { setRejectingId(null); setRejectReason(''); }}
                      className="flex-1 font-heading text-xs py-2 rounded-full"
                      style={{ background: COLORS.card, color: COLORS.stone, border: `1px solid ${COLORS.light}` }}>
                      취소
                    </button>
                    <button onClick={() => reject(u.id)}
                      className="flex-1 font-heading text-xs py-2 rounded-full"
                      style={{ background: COLORS.deep, color: COLORS.white }}>
                      거절 확정
                    </button>
                  </div>
                </div>
              )}
              {u.status === 'pending' && rejectingId !== u.id && (
                <>
                  <div className="flex gap-2">
                    <button onClick={() => approve(u.id, false)}
                      className="flex-1 font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-1"
                      style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 16px rgba(255, 92, 31, 0.4)' }}>
                      <Check size={12} strokeWidth={3} />일반 승인
                    </button>
                    <button onClick={() => { setRejectingId(u.id); setRejectReason(''); }}
                      className="flex-1 font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-1"
                      style={{ background: COLORS.cream, color: COLORS.deep, border: `1px solid ${COLORS.light}` }}>
                      <X size={12} strokeWidth={3} />거절
                    </button>
                  </div>
                  {/* 졸업생 승인 (별도 버튼) */}
                  <button onClick={() => approve(u.id, true)}
                    className="w-full font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-1.5"
                    style={{ background: COLORS.cardElev, color: COLORS.primary, border: `1px solid ${COLORS.primary}` }}>
                    졸업생으로 승인
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
                  style={{ background: COLORS.cardElev, color: COLORS.ink }}>
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

  const toggleGraduate = async () => {
    const makeGrad = !student.is_graduate;
    if (!await confirmDialog(makeGrad
      ? `${student.name}님을 졸업생으로 변경하시겠습니까?`
      : `${student.name}님을 수강생으로 변경하시겠습니까?`)) return;
    setUpdating(true);
    const { error } = await supabase.from('profiles').update({ is_graduate: makeGrad }).eq('id', student.id);
    if (error) {
      toast('변경 실패: ' + error.message);
    } else {
      toast(makeGrad ? '졸업생으로 변경되었습니다' : '수강생으로 변경되었습니다');
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
                <h2 className="font-display text-2xl tracking-tight" style={{ color: COLORS.ink }}>{student.name}</h2>
                {student.status === 'pending' && <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded" style={{ background: COLORS.peach, color: COLORS.deep }}>승인 대기</span>}
                {student.status === 'rejected' && <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded" style={{ background: COLORS.cardElev, color: COLORS.stone }}>거절됨</span>}
              </div>
              <p className="font-mono text-[10px] mt-1 truncate" style={{ color: COLORS.ink, opacity: 0.7 }}>{student.email}</p>
              <p className="font-body text-sm mt-2" style={{ color: COLORS.primary }}>{student.course}</p>
            </div>
          </div>
        </div>

        {/* 졸업생/수강생 구분 (라벨 — 졸업하면 전환) */}
        {student.role !== 'admin' && (
          <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ Student Type</p>
                <p className="font-heading text-sm mt-1" style={{ color: COLORS.ink }}>
                  현재 {student.is_graduate ? '졸업생' : '수강생'}
                </p>
                <p className="font-body text-xs mt-1" style={{ color: COLORS.stone }}>수강생이 졸업하면 졸업생으로 변경하세요</p>
              </div>
              <button onClick={toggleGraduate} disabled={updating}
                className="font-heading text-xs px-4 py-2.5 rounded-full flex items-center gap-1.5 shrink-0 disabled:opacity-60"
                style={{ background: COLORS.cream, color: COLORS.deep, border: `1px solid ${COLORS.light}` }}>
                {updating ? <Loader2 size={12} className="animate-spin" /> : null}
                {student.is_graduate ? '수강생으로' : '졸업생으로'}
              </button>
            </div>
          </div>
        )}

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
                  <p className="font-body text-xs line-clamp-2 break-words" style={{ color: COLORS.ink }}>{p.content}</p>
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
  const [page, setPage] = useState(1);
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

  useEffect(() => { setPage(1); }, [debouncedQ]);
  // 🚀 서버 검색 + 페이지네이션 (전체 풀로딩 제거 → 대역폭 절약)
  useEffect(() => { load(); }, [debouncedQ, page]);

  const load = async () => {
    setLoading(true);
    let query = supabase.from('profiles').select('*', { count: 'exact' })
      .in('role', ['student', 'staff'])
      .neq('status', 'deleted')  // 탈퇴한 회원 제외
      .order('role', { ascending: false })  // staff 먼저
      .order('created_at', { ascending: false })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
    if (debouncedQ) {
      const q = debouncedQ.replace(/[%,()]/g, ' ');
      query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,course.ilike.%${q}%`);
    }
    const { data, count, error } = await query;
    if (error) { console.error('수강생 로드 에러:', error); toast('수강생 목록을 불러오지 못했어요: ' + error.message); }
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
          <Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />
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
    const { data, error } = await supabase
      .from('cases')
      .select('*, profiles(name, avatar_color, avatar_url, course)')
      .order('created_at', { ascending: false });
    if (error) { console.error('케이스 로드 에러:', error); toast('케이스 목록을 불러오지 못했어요: ' + error.message); }
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
                {c.memo && <p className="font-body text-xs mt-2 leading-relaxed break-words" style={{ color: COLORS.stone }}>{c.memo}</p>}

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

  // 🍊 "오픈 예정" 안내 배너 문구 — 학생 화면(온라인 강의) 상단에 그대로 노출됨
  const [banner, setBanner] = useState({ title: '', body: '' });
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [bannerSaving, setBannerSaving] = useState(false);

  useEffect(() => {
    load();
    supabase.from('site_content').select('title, body').eq('key', 'online_lecture_banner').maybeSingle()
      .then(({ data }) => { if (data) setBanner(data); });
  }, []);

  const saveBanner = async () => {
    setBannerSaving(true);
    const { error } = await supabase.from('site_content')
      .upsert({ key: 'online_lecture_banner', title: banner.title, body: banner.body, updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: 'key' });
    setBannerSaving(false);
    if (error) { toast('배너 저장 실패: ' + error.message); return; }
    toast('배너 문구가 저장됐어요');
    setShowBannerForm(false);
  };

  const load = async () => {
    const { data, error } = await supabase
      .from('lectures')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('강의 로드 에러:', error); toast('강의 목록을 불러오지 못했어요: ' + error.message); }
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

        {/* 오픈 예정 안내 배너 문구 (학생 화면 상단에 노출) */}
        <div className="rounded-2xl p-4" style={{ background: COLORS.peach, border: `1px solid ${COLORS.primary}` }}>
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.deep }}>온라인 강의 안내 배너</p>
            {!showBannerForm && (
              <button onClick={() => setShowBannerForm(true)} className="font-heading text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1"
                style={{ background: COLORS.primary, color: COLORS.white }}>
                <Edit3 size={10} strokeWidth={2.5} />수정
              </button>
            )}
          </div>
          {showBannerForm ? (
            <div className="mt-3 space-y-2">
              <input value={banner.title} onChange={e => setBanner({ ...banner, title: e.target.value })}
                placeholder="제목 (예: 온라인 강의 11월 오픈 예정)"
                className="w-full font-body text-sm font-medium p-2.5 rounded outline-none" style={{ background: COLORS.card, color: COLORS.ink }} />
              <textarea value={banner.body} onChange={e => setBanner({ ...banner, body: e.target.value })}
                placeholder="본문" rows={2}
                className="w-full font-body text-xs p-2.5 rounded outline-none resize-none" style={{ background: COLORS.card, color: COLORS.ink }} />
              <div className="flex gap-2">
                <button onClick={() => setShowBannerForm(false)} disabled={bannerSaving}
                  className="flex-1 font-heading text-xs py-2 rounded-full" style={{ background: COLORS.card, color: COLORS.stone }}>취소</button>
                <button onClick={saveBanner} disabled={bannerSaving}
                  className="flex-1 font-heading text-xs py-2 rounded-full flex items-center justify-center gap-1.5" style={{ background: COLORS.primary, color: COLORS.white }}>
                  {bannerSaving && <Loader2 size={12} className="animate-spin" />}저장
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="font-heading text-sm mt-2" style={{ color: COLORS.deep }}>{banner.title || '(제목 없음)'}</p>
              <p className="font-body text-xs mt-1 leading-relaxed" style={{ color: COLORS.ink }}>{banner.body || '(본문 없음)'}</p>
            </>
          )}
        </div>

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
              style={{ background: COLORS.cardElev, color: COLORS.ink }}>
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
                <p className="font-body text-xs mt-2 leading-relaxed line-clamp-2 break-words" style={{ color: COLORS.stone }}>
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
                  style={{ background: COLORS.cardElev, color: COLORS.ink }}>
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
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('상품 로드 에러:', error); toast('상품 목록을 불러오지 못했어요: ' + error.message); }
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
              style={{ background: COLORS.cardElev, color: COLORS.ink }}>
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
              <h4 className="font-heading text-xs mt-1 line-clamp-2 leading-tight break-words" style={{ color: COLORS.ink }}>{p.name}</h4>
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
                  style={{ background: COLORS.cardElev, color: COLORS.ink }}>
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
    const { data, error } = await supabase.from('courses').select('*').order('order_index', { ascending: true });
    if (error) { console.error('클래스 로드 에러:', error); toast('클래스 목록을 불러오지 못했어요: ' + error.message); }
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
              style={{ background: COLORS.cardElev, color: COLORS.ink }}>
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
              {c.description && <p className="font-body text-xs mt-1.5 line-clamp-1 break-words" style={{ color: COLORS.stone }}>{c.description}</p>}

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
                  style={{ background: COLORS.cardElev, color: COLORS.ink }}>
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
    const { data, error } = await supabase
      .from('library_files')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('자료 로드 에러:', error); toast('자료 목록을 불러오지 못했어요: ' + error.message); }
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
                    <X size={12} style={{ color: COLORS.ink }} />
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
                  <span className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>PDF·이미지 권장 (모바일에서 바로 보임)</span>
                  <span className="font-mono text-[9px] mt-0.5 text-center px-6" style={{ color: COLORS.muted }}>HWP 등은 폰에서 미리보기가 안 돼요</span>
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
              style={{ background: COLORS.cardElev, color: COLORS.ink }}>
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
                <p className="font-body text-[11px] mt-1 line-clamp-1 break-words" style={{ color: COLORS.stone }}>{f.description}</p>
              )}
            </div>
            <div onClick={e => e.stopPropagation()} className="flex flex-col gap-1.5 shrink-0">
              <button onClick={() => startEdit(f)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: COLORS.cardElev }}>
                <Edit3 size={11} style={{ color: COLORS.ink }} />
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
  const PER_PAGE = 20;
  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pendingCount, setPendingCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [qnaFilter, setQnaFilter] = useState('all'); // 'all' | 'pending' | 'answered'

  const toggleFilter = (status) => {
    setQnaFilter(prev => prev === status ? 'all' : status);
  };

  // 대기/완료 배지 카운트는 전체 기준으로 한 번 (목록 페이지네이션과 별개)
  useEffect(() => {
    supabase.from('questions').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      .then(({ count }) => setPendingCount(count || 0));
    supabase.from('questions').select('id', { count: 'exact', head: true }).eq('status', 'answered')
      .then(({ count }) => setAnsweredCount(count || 0));
  }, []);

  useEffect(() => { setPage(1); }, [qnaFilter]);
  // 🚀 서버 필터 + 페이지네이션 (전체 풀로딩 제거)
  useEffect(() => { load(); }, [qnaFilter, page]);

  const load = async () => {
    setLoading(true);
    // 질문 먼저 가져오기 (조인 없이 안전하게)
    let query = supabase.from('questions').select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
    if (qnaFilter !== 'all') query = query.eq('status', qnaFilter);
    const { data: qData, count, error: qErr } = await query;

    if (qErr) {
      console.error('Q&A 로드 에러:', qErr);
      toast('Q&A 목록을 불러오지 못했어요: ' + qErr.message);
      setQuestions([]);
      setLoading(false);
      return;
    }
    if (!qData || qData.length === 0) {
      setQuestions([]);
      setTotal(count || 0);
      setLoading(false);
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
    setTotal(count || 0);
    setLoading(false);
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
            url: `/qna/${selected.id}`,
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
          {selected.content && <p className="font-body text-xs mt-3 leading-relaxed break-words" style={{ color: COLORS.stone }}>{selected.content}</p>}
        </div>
        <div className="rounded-2xl p-4 space-y-3" style={{ background: COLORS.peach }}>
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.deep }}>관리자 답변</p>
          <textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="답변을 작성해주세요" rows={6}
            className="w-full font-body text-xs p-3 outline-none resize-none rounded" style={{ background: COLORS.card, color: COLORS.ink }} />
          <button onClick={submitAnswer} disabled={loading} className="w-full font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-2" style={{ background: COLORS.cardElev, color: COLORS.ink }}>
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
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.white }}>{pendingCount}</p>
          </button>
          <button onClick={() => toggleFilter('answered')}
            className={`rounded-2xl p-3 text-left transition-transform active:scale-95 ${qnaFilter === 'answered' ? 'glow-soft' : ''}`}
            style={{ background: COLORS.card, border: `1px solid ${qnaFilter === 'answered' ? COLORS.primary : COLORS.light}` }}>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: qnaFilter === 'answered' ? COLORS.primary : COLORS.stone }}>답변 완료</p>
              {qnaFilter === 'answered' && <span className="text-[10px]" style={{ color: COLORS.primary }}>●</span>}
            </div>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>{answeredCount}</p>
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
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
          </div>
        ) : questions.length === 0 ? (
          <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>
            {qnaFilter === 'pending' ? '답변 대기 중인 질문이 없습니다' :
             qnaFilter === 'answered' ? '답변 완료된 질문이 없습니다' :
             '등록된 질문이 없습니다'}
          </p>
        ) : <>{questions.map(q => (
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
                <p className="font-body text-[11px] line-clamp-2 leading-relaxed break-words" style={{ color: COLORS.stone }}>{q.answer}</p>
              </div>
            )}
          </button>
        ))}
        <Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />
        </>}
      </div>
    </>
  );
}

// 🤖 AI OFFICE — 자동화(hssup-cardnews)가 만든 분석 리포트를 읽는 화면.
// 직원 계정 분석처럼 민감한 내용이 들어가므로 원장(admin)만 볼 수 있다. (RLS로도 막혀 있음)
const REPORT_KINDS = {
  brief: { ko: '아침 보고', icon: Bell },
  meeting: { ko: '회의록', icon: FileText },
  request: { ko: '요청 기획', icon: Sparkles },
  plan: { ko: '콘텐츠 기획', icon: Sparkles },
  ideas: { ko: '오늘 아이디어', icon: Sparkles },
  feed: { ko: '피드 분석', icon: BarChart3 },
  timing: { ko: '올리기 좋은 시간', icon: Clock },
  staff: { ko: '직원 계정', icon: Users },
};

// 리포트는 마크다운으로 저장된다. 마크다운 라이브러리를 새로 넣지 않고
// 실제로 쓰는 문법(제목, 굵게, 목록)만 최소한으로 그린다.
function ReportBody({ text }) {
  const inline = (s) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i} style={{ color: COLORS.ink }}>{part.slice(2, -2)}</strong>
        : <React.Fragment key={i}>{part}</React.Fragment>
    );

  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        const t = line.trim();
        if (!t) return <div key={i} className="h-2" />;
        if (t.startsWith('## ')) {
          return (
            <h3 key={i} className="font-heading text-base mt-5 mb-1" style={{ color: COLORS.primary }}>
              {t.slice(3)}
            </h3>
          );
        }
        if (t.startsWith('# ')) {
          return (
            <h2 key={i} className="font-display text-xl mt-3 tracking-tight" style={{ color: COLORS.ink }}>
              {t.slice(2)}
            </h2>
          );
        }
        if (/^[-*]\s/.test(t)) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span style={{ color: COLORS.primary }}>·</span>
              <p className="font-body text-sm leading-relaxed flex-1" style={{ color: COLORS.stone }}>{inline(t.slice(2))}</p>
            </div>
          );
        }
        const numbered = t.match(/^(\d+)\.\s+(.*)$/);
        if (numbered) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="font-mono text-xs mt-0.5" style={{ color: COLORS.primary }}>{numbered[1]}.</span>
              <p className="font-body text-sm leading-relaxed flex-1" style={{ color: COLORS.stone }}>{inline(numbered[2])}</p>
            </div>
          );
        }
        return (
          <p key={i} className="font-body text-sm leading-relaxed" style={{ color: COLORS.stone }}>{inline(t)}</p>
        );
      })}
    </div>
  );
}

const isVideoUrl = (url) => /\.(mp4|mov|webm)(\?|$)/i.test(url || '');

// 미디어 전체보기. 사진은 크게, 영상은 재생할 수 있게 띄운다.
// 시안을 크게 보는 창. 카드뉴스는 여러 장이라 좌우로 넘길 수 있어야 한다.
// 키보드 좌우키, 화면 좌우 절반 터치, 옆으로 쓸기 셋 다 받는다.
// 아이폰 사파리는 영상을 재생하기 전엔 첫 장면을 그리지 않아 썸네일이 비어 보인다.
// 주소 끝에 #t=초 를 붙이면 그 순간의 장면을 미리 그린다(컴퓨터 브라우저에도 해가 없다).
// 3초로 둔다. 카드뉴스 릴스는 첫 장면이 비어 있다가 글이 떠올라, 0.1초면 하얗게만 보였다
// (인스타 표지도 같은 3초 장면, 히썹인스타자동 engine/reel.py COVER_FRAME). 3초보다 짧은 영상은 마지막 장면.
const thumbSrc = (url) => (url && !url.includes('#') ? `${url}#t=3` : url);

function MediaViewer({ urls, index = 0, onClose }) {
  const list = Array.isArray(urls) ? urls : [urls];
  const [at, setAt] = useState(Math.min(Math.max(index, 0), list.length - 1));
  const touchX = React.useRef(null);

  const go = React.useCallback((step) => {
    setAt(i => Math.min(Math.max(i + step, 0), list.length - 1));
  }, [list.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  const url = list[at];
  const many = list.length > 1;

  return createPortal(
    <div
      onTouchStart={e => { touchX.current = e.changedTouches[0].clientX; }}
      onTouchEnd={e => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        touchAction: 'pan-y',
      }}>
      <button onClick={onClose} aria-label="닫기"
        style={{
          position: 'absolute', top: 'max(12px, env(safe-area-inset-top))', right: 12,
          width: 40, height: 40, border: 'none', borderRadius: 20, zIndex: 2,
          background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        <X size={20} />
      </button>

      {isVideoUrl(url) ? (
        <video key={url} src={url} controls autoPlay playsInline onClick={e => e.stopPropagation()}
          style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12 }} />
      ) : (
        <img key={url} src={url} alt="" onClick={e => e.stopPropagation()}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12 }} />
      )}

      {many && (
        <>
          {/* 화면 좌우 절반을 눌러도 넘어간다. 폰에서는 이게 제일 편하다. */}
          <button onClick={() => go(-1)} aria-label="이전 장" disabled={at === 0}
            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '32%',
                     border: 'none', background: 'transparent', cursor: at === 0 ? 'default' : 'pointer' }} />
          <button onClick={() => go(1)} aria-label="다음 장" disabled={at === list.length - 1}
            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '32%',
                     border: 'none', background: 'transparent', cursor: at === list.length - 1 ? 'default' : 'pointer' }} />

          <div style={{
            position: 'absolute', bottom: 'max(20px, env(safe-area-inset-bottom))',
            left: 0, right: 0, display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center',
          }}>
            {list.map((_, i) => (
              <span key={i} style={{
                width: i === at ? 18 : 6, height: 6, borderRadius: 3,
                background: i === at ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'width 0.2s',
              }} />
            ))}
          </div>

          <p style={{
            position: 'absolute', top: 'max(20px, env(safe-area-inset-top))', left: 16,
            color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'monospace', margin: 0,
          }}>{at + 1} / {list.length}</p>
        </>
      )}
    </div>,
    document.body
  );
}

// 말하면 글자로 바꿔주는 기능. 브라우저에 들어 있어서 서버도 키도 필요 없다.
// 다만 아이폰 사파리에서는 되다 안 되다 하고, 홈 화면에 추가한 앱에서는
// 아예 안 되는 경우가 있다. 그럴 때는 키보드 마이크를 쓰시라고 안내한다.
function useDictation(onText) {
  const Recognition = typeof window !== 'undefined'
    && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const [listening, setListening] = useState(false);
  const ref = React.useRef(null);
  // 받아쓰는 동안 바깥 함수가 바뀔 수 있어 최신 것을 들고 있는다.
  const onTextRef = React.useRef(onText);
  useEffect(() => { onTextRef.current = onText; }, [onText]);

  const stop = React.useCallback(() => {
    try { ref.current?.stop(); } catch { /* 이미 멈춘 경우 */ }
    setListening(false);
  }, []);

  const start = React.useCallback(() => {
    if (!Recognition) {
      toast('이 브라우저는 앱 안에서 받아쓰기가 안 돼요. 키보드의 마이크를 눌러 말씀해 주세요');
      return;
    }
    let rec;
    try {
      rec = new Recognition();
    } catch {
      toast('받아쓰기를 켜지 못했어요. 키보드의 마이크를 눌러 말씀해 주세요');
      return;
    }
    rec.lang = 'ko-KR';
    rec.interimResults = true;
    rec.continuous = false;

    let finalText = '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += chunk;
        else interim += chunk;
      }
      onTextRef.current?.(finalText + interim);
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === 'not-allowed') toast('마이크 사용을 허용해 주세요');
      else if (e.error !== 'aborted' && e.error !== 'no-speech') {
        toast('잘 못 들었어요. 키보드의 마이크를 눌러 말씀해 주셔도 됩니다');
      }
    };
    rec.onend = () => setListening(false);

    ref.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [Recognition]);

  useEffect(() => () => { try { ref.current?.abort(); } catch { /* 정리 */ } }, []);

  return { supported: !!Recognition, listening, start, stop };
}

// 말하기 버튼. 누르면 듣고, 다시 누르면 멈춘다.
function MicButton({ onText, value }) {
  const base = React.useRef('');
  const dictation = useDictation((text) => onText(`${base.current}${text}`));

  const toggle = () => {
    if (dictation.listening) {
      dictation.stop();
      return;
    }
    // 이미 적어둔 글 뒤에 이어 붙인다. 말하다 지워지면 곤란하다.
    base.current = value ? `${value.trim()} ` : '';
    dictation.start();
  };

  return (
    <button onClick={toggle} aria-label={dictation.listening ? '그만 듣기' : '말로 적기'}
      className="px-3 rounded-xl shrink-0 flex items-center justify-center"
      style={dictation.listening
        ? { background: COLORS.primary, color: COLORS.card, minHeight: 44 }
        : { background: COLORS.card, color: COLORS.stone, border: `1px solid ${COLORS.light}`, minHeight: 44 }}>
      <Mic size={16} strokeWidth={1.8}
        style={dictation.listening ? { animation: 'pulse 1.2s infinite' } : undefined} />
    </button>
  );
}

// 대화에 나오는 담당자들. 자동화 쪽 engine/staff.py 와 같은 사람들이다.
const CHAT_STAFF = {
  editor:   { name: '김주훈', role: '콘텐츠 편집', color: 'mocha' },
  designer: { name: '차은우', role: '디자인', color: 'nude' },
  planner:  { name: '박서준', role: '콘텐츠 기획', color: 'orange' },
};
const staffOf = (key) => CHAT_STAFF[key] || CHAT_STAFF.editor;

// 📎 대화에 붙이는 참고 사진. "이 사진처럼 해줘" 는 말로만 설명하기 어렵다.
// 담당자(클로드)가 열 수 있는 형식만 받는다. 아이폰 HEIC 는 압축하면서 jpg 로 바뀐다.
// 게시용 원본과 섞이지 않게 content-media 버킷의 chat/ 아래에 둔다.
const CHAT_PHOTO_MAX = 5;
const CHAT_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

async function uploadChatPhotos(files) {
  const urls = [];
  for (const picked of files) {
    let file = picked;
    try {
      file = await compressImage(picked, 1440, 0.85);
    } catch {
      file = picked;
    }
    if (!CHAT_PHOTO_TYPES.includes(file.type)) {
      throw new Error(`${picked.name} 은 담당자가 열 수 없는 형식이에요. 스크린샷이나 jpg 로 보내주세요`);
    }
    const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
    const path = `chat/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(UPLOAD_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    urls.push(supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

// 사진이 있을 때만 attachments 를 넣는다. 글만 보내는 건 DB 설정 전에도 그대로 되게.
async function insertWithPhotos(table, row, files) {
  const attachments = files.length ? await uploadChatPhotos(files) : [];
  const { error } = await supabase.from(table).insert(attachments.length ? { ...row, attachments } : row);
  if (error) {
    if (error.message.includes('attachments')) throw new Error('사진 보내기 준비(DB 설정)가 아직 안 됐어요');
    throw error;
  }
}

function useChatPhotos() {
  const [files, setFiles] = useState([]);
  const previews = React.useMemo(() => files.map(f => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach(u => URL.revokeObjectURL(u)), [previews]);

  const add = (picked) => {
    const next = [...files, ...picked];
    if (next.length > CHAT_PHOTO_MAX) toast(`사진은 한 번에 ${CHAT_PHOTO_MAX}장까지예요`);
    setFiles(next.slice(0, CHAT_PHOTO_MAX));
  };
  const remove = (i) => setFiles(prev => prev.filter((_, j) => j !== i));
  const clear = () => setFiles([]);
  return { files, previews, add, remove, clear };
}

function AttachButton({ photos, disabled }) {
  return (
    <label aria-label="사진 붙이기"
      className={`px-3 rounded-xl shrink-0 flex items-center justify-center cursor-pointer ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
      style={{ background: COLORS.card, color: COLORS.stone, border: `1px solid ${COLORS.light}`, minHeight: 44 }}>
      <input type="file" accept="image/*,.heic,.heif,.HEIC,.HEIF" multiple className="hidden"
        onChange={e => {
          photos.add([...(e.target.files || [])]);
          e.target.value = '';  // 같은 사진을 다시 골라도 반응하게
        }} />
      <Paperclip size={16} strokeWidth={1.8} />
    </label>
  );
}

// 보내기 전에 붙인 사진을 보여주고 뺄 수 있게 한다.
function AttachPreview({ photos }) {
  if (!photos.files.length) return null;
  return (
    <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
      {photos.previews.map((src, i) => (
        <div key={src} className="relative shrink-0">
          <img src={src} alt="" className="w-14 h-14 rounded-lg object-cover" />
          <button onClick={() => photos.remove(i)} aria-label={`${i + 1}번째 사진 빼기`}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: COLORS.ink, color: COLORS.card }}>
            <X size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}

// 말풍선 안의 사진. 누르면 크게 본다.
// 담당자가 시안을 고치면 [고치기 전, 고친 후] 두 장이 붙어 온다(revise_post._before_after).
function MessagePhotos({ urls, staff = false }) {
  const [viewing, setViewing] = useState(null);
  if (!Array.isArray(urls) || !urls.length) return null;
  const compare = staff && urls.length === 2;
  const labels = compare ? ['고치기 전', '고친 후'] : [];
  return (
    <>
      <div className={`flex flex-wrap gap-1.5 ${staff ? 'justify-start' : 'justify-end'}`}>
        {urls.map((url, i) => (
          <button key={url} onClick={() => setViewing(i)}
            className={`${compare ? 'w-32 h-40' : urls.length === 1 ? 'w-44 h-44' : 'w-20 h-20'} rounded-xl overflow-hidden relative`}
            style={{ background: COLORS.cardElev, opacity: compare && i === 0 ? 0.75 : 1,
              border: compare && i === 1 ? `2px solid ${COLORS.primary}` : 'none' }}>
            {isVideoUrl(url)
              ? <video src={thumbSrc(url)} muted playsInline preload="metadata" className="w-full h-full object-cover" />
              : <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />}
            {labels[i] && (
              <span className="absolute top-1 left-1 rounded px-1.5 font-mono text-[9px]"
                style={{ background: i === 1 ? COLORS.primary : 'rgba(0,0,0,0.6)', color: '#fff' }}>{labels[i]}</span>
            )}
          </button>
        ))}
      </div>
      {viewing !== null && <MediaViewer urls={urls} index={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

// 승인 대기 게시물에 대고 "이렇게 바꿔줘" 라고 말하는 자리.
// 캡션만 고치는 요청은 금방 오고, 그림까지 다시 만드는 요청은 조금 더 걸린다.
function ApprovalThread({ approvalId, onRevised }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('ai_approval_messages').select('*')
        .eq('approval_id', approvalId).order('created_at', { ascending: true });
      setMessages(prev => {
        const last = (data || [])[(data || []).length - 1];
        const prevLast = prev[prev.length - 1];
        if (last && last.role === 'staff' && prevLast && last.id !== prevLast.id) onRevised?.();
        return data || [];
      });
    })();
  }, [approvalId, reloadKey, onRevised]);

  const waiting = messages.length > 0
    && messages[messages.length - 1].role === 'owner'
    && !messages[messages.length - 1].answered;

  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => setReloadKey(k => k + 1), 15000);
    return () => clearInterval(timer);
  }, [waiting]);

  const photos = useChatPhotos();

  const send = async () => {
    const body = draft.trim();
    if (!body && !photos.files.length) return;
    setSending(true);
    try {
      await insertWithPhotos('ai_approval_messages', { approval_id: approvalId, role: 'owner', body }, photos.files);
    } catch (e) {
      toast('보내지 못했어요: ' + (e.message || e));
      setSending(false);
      return;
    }
    setSending(false);
    setDraft('');
    photos.clear();
    setReloadKey(k => k + 1);
    toast('전달했어요. 잠시 후 반영됩니다');
  };

  return (
    <div className="mt-4 pt-1" style={{ borderTop: `1px solid ${COLORS.light}` }}>
      {messages.map((m, i) => {
        const mine = m.role === 'owner';
        const who = mine ? null : staffOf(m.staff);
        // 같은 사람이 연달아 말하면 이름과 얼굴을 한 번만 보여준다.
        const prev = messages[i - 1];
        const samePerson = prev && prev.role === m.role && (mine || prev.staff === m.staff);
        const time = new Date(m.created_at).toLocaleTimeString('ko-KR', {
          hour: '2-digit', minute: '2-digit',
        });

        if (mine) {
          return (
            <div key={m.id} className={`flex justify-end ${samePerson ? 'mt-1' : 'mt-4'}`}>
              <div className="flex items-end gap-1.5 max-w-[88%]">
                <span className="font-mono text-[9px] pb-1 shrink-0" style={{ color: COLORS.muted }}>{time}</span>
                <div className="flex flex-col items-end gap-1 min-w-0">
                  <MessagePhotos urls={m.attachments} />
                  {m.body && (
                    <div className="rounded-2xl rounded-br-md px-3.5 py-2.5"
                      style={{ background: COLORS.primary, color: COLORS.card }}>
                      <p className="font-body text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        return (
          <div key={m.id} className={`flex gap-2 ${samePerson ? 'mt-1' : 'mt-4'}`}>
            <div className="w-7 shrink-0">
              {!samePerson && <Avatar user={{ name: who.name, avatar_color: who.color }} size="xs" />}
            </div>
            <div className="min-w-0 max-w-[88%]">
              {!samePerson && (
                <p className="font-heading text-[11px] mb-1" style={{ color: COLORS.stone }}>
                  {who.name} 팀장
                  <span className="font-mono text-[9px] ml-1.5" style={{ color: COLORS.muted }}>{who.role}</span>
                </p>
              )}
              {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                <div className="mb-1"><MessagePhotos urls={m.attachments} staff /></div>
              )}
              <div className="flex items-end gap-1.5">
                <div className="rounded-2xl rounded-bl-md px-3.5 py-2.5"
                  style={{ background: COLORS.card, border: `1px solid ${COLORS.light}`, color: COLORS.ink }}>
                  <p className="font-body text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
                </div>
                <span className="font-mono text-[9px] pb-1 shrink-0" style={{ color: COLORS.muted }}>{time}</span>
              </div>
            </div>
          </div>
        );
      })}

      {waiting && (
        <div className="flex gap-2 mt-4 items-center">
          <div className="w-7 shrink-0" />
          <div className="rounded-2xl rounded-bl-md px-3.5 py-2.5 flex gap-1"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            {[0, 1, 2].map(i => (
              <span key={i} className="w-1.5 h-1.5 rounded-full"
                style={{ background: COLORS.muted, animation: `pulse 1.2s ${i * 0.2}s infinite` }} />
            ))}
          </div>
          <p className="font-body text-[11px]" style={{ color: COLORS.muted }}>담당자가 보고 있어요</p>
        </div>
      )}

      <AttachPreview photos={photos} />
      <div className="flex gap-2 mt-2">
        <AttachButton photos={photos} disabled={sending} />
        <input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={photos.files.length ? '사진에 대해 말씀해 주세요' : '말로 하시거나 적어주세요'}
          className="flex-1 min-w-0 rounded-xl px-3 font-body text-sm"
          style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}`, minHeight: 44 }} />
        <MicButton onText={setDraft} value={draft} />
        <button onClick={send} disabled={sending || (!draft.trim() && !photos.files.length)}
          className="px-4 rounded-xl font-heading text-xs disabled:opacity-40 shrink-0"
          style={{ background: COLORS.ink, color: COLORS.card, minHeight: 44 }}>
          {sending ? <Loader2 size={14} className="animate-spin" /> : '보내기'}
        </button>
      </div>
    </div>
  );
}

// 승인 대기 카드. 지금은 인스타그램 게시만 올라온다.
// (DM 자동응대는 인스타 기본 자동응답을 쓰기로 해서 자동화에서 뺐다.)
function ApprovalCard({ row, onDecide, onSaveBody, onRevised, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.body || '');
  const [viewing, setViewing] = useState(null);   // 몇 번째 장을 크게 보는 중인지
  const media = Array.isArray(row.image_urls) ? row.image_urls : [];
  const hasVideo = media.some(isVideoUrl);

  const decide = async (status) => {
    setBusy(true);
    const ok = await onDecide(row, status);
    if (!ok) setBusy(false);
  };

  const save = async () => {
    setBusy(true);
    const ok = await onSaveBody(row, draft);
    setBusy(false);
    if (ok) setEditing(false);
  };

  const firstLine = (row.body || '').split('\n').find(l => l.trim()) || '내용 없음';

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
      <button onClick={() => setOpen(v => !v)} className="w-full p-4 flex items-center gap-3 text-left">
        {/* 접힌 상태에서도 시안이 보여야 한다. 아이콘만 있으면 열어보기 전엔 뭔지 모른다. */}
        <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center shrink-0 relative"
          style={{ background: COLORS.peach, border: `1px solid rgba(255,92,31,0.25)` }}>
          {media.length === 0 ? (
            <Camera size={17} strokeWidth={1.8} style={{ color: COLORS.primary }} />
          ) : isVideoUrl(media[0]) ? (
            <>
              <video src={thumbSrc(media[0])} muted playsInline preload="metadata" className="w-full h-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <Play size={16} style={{ color: '#fff' }} />
              </span>
            </>
          ) : (
            <img src={media[0]} alt="" loading="lazy" className="w-full h-full object-cover" />
          )}
          {media.length > 1 && (
            <span className="absolute bottom-0 right-0 px-1 font-mono text-[9px]"
              style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>{media.length}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-sm truncate" style={{ color: COLORS.ink }}>{firstLine}</p>
          <p className="font-mono text-[10px] mt-1 tracking-wider" style={{ color: COLORS.muted }}>
            {new Date(row.created_at).toLocaleString('ko-KR', {
              month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })} · {row.channel} · {hasVideo ? '영상' : `사진 ${media.length}장`}
          </p>
        </div>
        <ChevronRight size={17} strokeWidth={1.8}
          style={{ color: COLORS.muted, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <>
          <div className="px-4 pb-4" style={{ borderTop: `1px solid ${COLORS.light}` }}>
            {media.length > 0 && (
              <div className="flex gap-2 overflow-x-auto my-3 -mx-1 px-1">
                {media.map((url, i) => (
                  <button key={i} onClick={() => setViewing(i)}
                    className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0"
                    style={{ border: `1px solid ${COLORS.light}`, background: COLORS.cardElev }}>
                    {isVideoUrl(url) ? (
                      <>
                        <video src={thumbSrc(url)} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                        <span className="absolute inset-0 flex items-center justify-center"
                          style={{ background: 'rgba(0,0,0,0.3)' }}>
                          <Play size={20} style={{ color: '#fff' }} />
                        </span>
                      </>
                    ) : (
                      <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {editing ? (
              <>
                <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={10}
                  className="w-full rounded-xl p-3 font-body text-sm leading-relaxed"
                  style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}`, resize: 'vertical' }} />
                <div className="flex gap-2 mt-2">
                  <button onClick={save} disabled={busy}
                    className="px-4 py-2 rounded-xl font-heading text-xs disabled:opacity-50"
                    style={{ background: COLORS.ink, color: COLORS.card }}>저장</button>
                  <button onClick={() => { setDraft(row.body || ''); setEditing(false); }} disabled={busy}
                    className="px-4 py-2 rounded-xl font-heading text-xs"
                    style={{ background: COLORS.card, color: COLORS.stone, border: `1px solid ${COLORS.light}` }}>취소</button>
                </div>
              </>
            ) : (
              <>
                <p className="font-body text-sm leading-relaxed whitespace-pre-wrap" style={{ color: COLORS.stone }}>{row.body}</p>
                <button onClick={() => setEditing(true)}
                  className="mt-3 inline-flex items-center gap-1 font-heading text-xs"
                  style={{ color: COLORS.primary }}>
                  <Edit3 size={13} /> 직접 고치기
                </button>
                <ApprovalThread approvalId={row.id} onRevised={onRevised} />
              </>
            )}
          </div>

          {!editing && (
            <div className="flex gap-2 p-3" style={{ borderTop: `1px solid ${COLORS.light}` }}>
              <button onClick={() => decide('approved')} disabled={busy}
                className="flex-1 py-3 rounded-xl font-heading text-sm transition-transform active:scale-95 disabled:opacity-50"
                style={{ background: COLORS.primary, color: COLORS.card }}>
                {busy ? '처리 중…' : '게시'}
              </button>
              <button onClick={() => decide('skipped')} disabled={busy}
                className="px-5 py-3 rounded-xl font-heading text-sm transition-transform active:scale-95 disabled:opacity-50"
                style={{ background: COLORS.card, color: COLORS.stone, border: `1px solid ${COLORS.light}` }}>
                건너뛰기
              </button>
            </div>
          )}
        </>
      )}

      {viewing !== null && (
        <MediaViewer urls={media} index={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}

// 리포트에 달린 대화. 원장이 피드백을 남기면 담당 직원이 읽고 답한다.
// 답변은 자동화가 주기적으로 돌면서 만들기 때문에 바로 오지는 않는다.
function ReportThread({ reportId, reportBody, onStaffReplied, onCollapse }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });
      if (error) console.error('대화 로드 에러:', error);
      setMessages(prev => {
        const last = (data || [])[(data || []).length - 1];
        const prevLast = prev[prev.length - 1];
        // 새 답변이 왔으면 결과물도 고쳐졌을 수 있으니 부모에게 알린다.
        if (last && last.role === 'staff' && last.id !== prevLast?.id && prevLast) {
          onStaffReplied?.();
        }
        return data || [];
      });
      setLoading(false);
    })();
  }, [reportId, reloadKey, onStaffReplied]);

  // 답변은 자동화가 주기적으로 만들기 때문에, 기다리는 동안에만 짧게 다시 확인한다.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'owner' || last.answered) return;
    const timer = setInterval(() => setReloadKey(k => k + 1), 15000);
    return () => clearInterval(timer);
  }, [messages]);

  const photos = useChatPhotos();

  const send = async () => {
    const body = draft.trim();
    if (!body && !photos.files.length) return;
    setSending(true);
    try {
      await insertWithPhotos('ai_messages', { report_id: reportId, role: 'owner', body }, photos.files);
    } catch (e) {
      toast('보내지 못했어요: ' + (e.message || e));
      setSending(false);
      return;
    }
    setSending(false);
    setDraft('');
    photos.clear();
    toast('전달했어요. 잠시 후 답이 옵니다');
    setReloadKey(k => k + 1);
  };

  const waiting = messages.length > 0
    && messages[messages.length - 1].role === 'owner'
    && !messages[messages.length - 1].answered;

  return (
    // 이 div 가 카드 본문 전체를 감싼다. 입력창의 sticky 는 부모 박스 안에서만
    // 움직이므로, 리포트 본문까지 여기 들어와야 읽는 내내 하단에 붙어 있는다.
    <div className="px-4 pb-4 pt-1" style={{ borderTop: `1px solid ${COLORS.light}` }}>
      <ReportBody text={reportBody} />

      <p className="font-mono text-[9px] mb-3 mt-6 pt-4 tracking-widest"
        style={{ color: COLORS.muted, borderTop: `1px solid ${COLORS.light}` }}>담당 직원과 대화</p>

      {!loading && messages.map(m => (
        <div key={m.id} className={`mb-3 flex flex-col ${m.role === 'owner' ? 'items-end' : 'items-start'}`}>
          {m.role === 'owner' && <div className="mb-1 max-w-[85%]"><MessagePhotos urls={m.attachments} /></div>}
          {(m.body || m.role === 'staff') && <div className="max-w-[85%] rounded-2xl px-3 py-2"
            style={m.role === 'owner'
              ? { background: COLORS.primary, color: COLORS.card }
              : { background: COLORS.cardElev, color: COLORS.ink }}>
            {/* 직원 답변에는 고친 결과물이 마크다운으로 들어온다. 원장 메시지는 직접 친 글이라 그대로 둔다. */}
            {m.role === 'staff'
              ? <ReportBody text={m.body} />
              : <p className="font-body text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>}
          </div>}
          <p className="font-mono text-[9px] mt-1 px-1" style={{ color: COLORS.muted }}>
            {m.role === 'owner' ? '' : '담당 직원 · '}
            {new Date(m.created_at).toLocaleString('ko-KR', {
              month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
      ))}

      {waiting && (
        <p className="font-body text-xs mb-2" style={{ color: COLORS.muted }}>답변을 준비하고 있어요…</p>
      )}

      <div className="pb-1" style={{ position: 'sticky', bottom: 0, background: COLORS.card, zIndex: 5 }}>
        <AttachPreview photos={photos} />
        <div className="flex gap-2 pt-3">
          <button onClick={onCollapse} aria-label="접기"
            className="px-3 rounded-xl font-heading text-xs shrink-0"
            style={{ background: COLORS.cardElev, color: COLORS.stone, minHeight: 44 }}>
            접기
          </button>
          <AttachButton photos={photos} disabled={sending} />
          <input value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={photos.files.length ? '사진에 대해 말씀해 주세요' : '고쳤으면 하는 점을 알려주세요'}
            className="flex-1 min-w-0 rounded-xl px-3 font-body text-sm"
            style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}`, minHeight: 44 }} />
          <button onClick={send} disabled={sending || (!draft.trim() && !photos.files.length)}
            className="px-4 rounded-xl font-heading text-xs disabled:opacity-40 shrink-0"
            style={{ background: COLORS.ink, color: COLORS.card, minHeight: 44 }}>
            {sending ? <Loader2 size={14} className="animate-spin" /> : '보내기'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 🧑‍💼 AI 직원 명단.
// 픽셀 캐릭터가 아니라 실제로 돌고 있는 자동화다. 각자 담당 업무와 마지막 근무 기록이 진짜다.
const AI_STAFF = [
  {
    id: 'plan',
    person: '박서준',
    title: '팀장',
    role: '콘텐츠 기획',
    color: 'orange',
    job: '매일 아침 아이디어 5개, 월요일 주간 기획, 콘텐츠 요청 기획안',
    icon: Sparkles,
    filter: 'plan',
    lastOf: (d) => d.reports.find(r => ['ideas', 'plan', 'request', 'brief'].includes(r.kind)),
  },
  {
    id: 'designer',
    person: '차은우',
    title: '디자인',
    role: '디자인',
    color: 'nude',
    job: '틀 없이 새로 그리기, 일러스트 그리기, 저장 디자인, 카드뉴스 디자인',
    icon: Palette,
    filter: 'awaiting',
    lastOf: (d) => d.approvals.find(a => ['design', 'carousel'].includes(a.payload?.media_type)),
  },
  {
    id: 'feed',
    person: '변우석',
    title: '분석',
    role: '피드 분석',
    color: 'charcoal',
    job: '메인 계정 성과를 보고 무엇이 통했는지 정리',
    icon: BarChart3,
    filter: 'feed',
    lastOf: (d) => d.reports.find(r => r.kind === 'feed'),
  },
  {
    id: 'staff',
    person: '전정국',
    title: '인사',
    role: '직원 관리',
    color: 'brown',
    job: '직원 계정을 비교하고 회의 안건을 정리',
    icon: Users,
    filter: 'staff',
    lastOf: (d) => d.reports.find(r => r.kind === 'staff'),
  },
  {
    id: 'editor',
    person: '김주훈',
    title: '편집',
    role: '콘텐츠 편집',
    color: 'mocha',
    job: '사진과 영상에 로고와 제목을 입히고 캡션 작성, 캡션 수정',
    icon: Edit3,
    filter: 'awaiting',
    lastOf: (d) => d.approvals[0],
  },
  {
    id: 'publisher',
    person: '나나',
    title: '게시',
    role: '게시 담당',
    color: 'coral',
    job: '승인된 콘텐츠를 인스타그램에 게시',
    icon: Upload,
    filter: 'decided',
    lastOf: (d) => d.approvals.find(a => a.status === 'sent'),
  },
];

const sinceText = (iso, now) => {
  if (!iso) return '아직 기록 없음';
  const diff = now - new Date(iso).getTime();
  const hour = diff / 3600000;
  if (hour < 1) return '방금 전';
  if (hour < 24) return `${Math.floor(hour)}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
};

function StaffRoster({ data, onPick, now }) {
  const [showChart, setShowChart] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setOpen(v => !v)} className="w-full p-4 flex items-center gap-3 text-left">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: COLORS.peach, border: `1px solid rgba(255,92,31,0.25)` }}>
          <Users size={16} strokeWidth={1.8} style={{ color: COLORS.primary }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-sm" style={{ color: COLORS.ink }}>우리 팀</p>
          <p className="font-body text-xs mt-1" style={{ color: COLORS.muted }}>
            {AI_STAFF.length}명이 맡아서 하고 있습니다
          </p>
        </div>
        <ChevronRight size={17} strokeWidth={1.8}
          style={{ color: COLORS.muted, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {!open ? null : (
      <div className="px-4 pb-4" style={{ borderTop: `1px solid ${COLORS.light}` }}>
      <div className="flex items-center justify-end my-3">
        <button onClick={() => setShowChart(v => !v)}
          className="font-heading text-xs" style={{ color: COLORS.primary }}>
          {showChart ? '명단 보기' : '조직도 보기'}
        </button>
      </div>

      {showChart ? (
        <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <div className="flex flex-col items-center">
            <div className="rounded-xl px-5 py-2.5 text-center"
              style={{ background: COLORS.primary, color: COLORS.card }}>
              <p className="font-heading text-sm">원장님</p>
              <p className="font-mono text-[9px] opacity-80">CEO</p>
            </div>
            <div style={{ width: 1, height: 18, background: COLORS.light }} />
            <div style={{ height: 1, width: '90%', background: COLORS.light }} />

            <div className="grid grid-cols-2 gap-2 w-full mt-4">
              {AI_STAFF.map(m => (
                <div key={m.id} className="rounded-xl px-3 py-2.5 flex items-center gap-2"
                  style={{ background: COLORS.cardElev, border: `1px solid ${COLORS.light}` }}>
                  <Avatar user={{ name: m.person, avatar_color: m.color }} size="xs" />
                  <div className="min-w-0">
                    <p className="font-heading text-xs truncate" style={{ color: COLORS.ink }}>{m.person} 팀장</p>
                    <p className="font-mono text-[9px]" style={{ color: COLORS.muted }}>{m.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="font-body text-[11px] text-center mt-4" style={{ color: COLORS.muted }}>
            전원 팀장입니다. 팀원은 없습니다
          </p>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {AI_STAFF.map(member => {
            const last = member.lastOf(data);
            const when = last?.created_at;
            const active = when && (now - new Date(when).getTime()) < 8 * 24 * 3600000;
            return (
              <button key={member.id} onClick={() => onPick(member.filter)}
                className="rounded-2xl p-3 text-center shrink-0 transition-transform active:scale-95"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.light}`, width: 96 }}>
                <div className="relative inline-block">
                  <Avatar user={{ name: member.person, avatar_color: member.color }} size="sm" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                    style={{ background: active ? '#22A05A' : COLORS.muted, border: `2px solid ${COLORS.card}` }} />
                </div>
                <p className="font-heading text-[11px] mt-1.5 truncate" style={{ color: COLORS.ink }}>{member.person}</p>
                <p className="font-mono text-[9px] truncate" style={{ color: COLORS.muted }}>{member.role}</p>
                <p className="font-mono text-[9px] mt-1 truncate" style={{ color: COLORS.muted }}>{sinceText(when, now)}</p>
              </button>
            );
          })}
        </div>
      )}
      </div>
      )}
    </div>
  );
}

// 눌렀을 때 화면을 덮고 올라오는 창.
// 첫 화면에 다 늘어놓으면 뭘 해야 할지 안 보여서, 자주 쓰는 것만 밖에 두고
// 나머지는 여기로 넣는다.
function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998, background: COLORS.cream,
      display: 'flex', flexDirection: 'column',
    }}>
      <div className="flex items-center gap-3 px-5"
        style={{
          paddingTop: 'max(16px, env(safe-area-inset-top))', paddingBottom: 14,
          background: COLORS.cream, borderBottom: `1px solid ${COLORS.light}`,
        }}>
        <h2 className="flex-1 font-heading text-base" style={{ color: COLORS.ink }}>{title}</h2>
        <button onClick={onClose} aria-label="닫기"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.light}`, color: COLORS.stone }}>
          <X size={17} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5"
        style={{ paddingBottom: 'max(40px, env(safe-area-inset-bottom))' }}>
        {children}
      </div>
    </div>,
    document.body
  );
}

// 두 카드가 이름만 봐서는 헷갈려서, 언제 뭘 쓰는지 접었다 펼 수 있게 둔다.
function OfficeGuide({ row = false }) {
  const [open, setOpen] = useState(false);

  const ROWS = [
    ['언제', '사진·영상이 이미 있을 때', '아이디어만 있고 찍은 게 없을 때'],
    ['넣는 것', '사진 최대 10장 또는 영상 + 설명', '글로 된 요청'],
    ['나오는 것', '게시할 게시물', '기획안 (뭘 어떻게 찍을지)'],
    ['그다음', '승인 요청 확인 → 게시 누르면 올라감', '기획안 보고 촬영 → 소재 올리기로'],
  ];

  return (
    <div className={row ? '' : 'rounded-2xl mb-3'}
      style={row ? undefined : { background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
      <button onClick={() => setOpen(v => !v)} className="w-full px-4 py-3 flex items-center gap-2 text-left">
        <AlertCircle size={15} strokeWidth={1.8} style={{ color: COLORS.muted }} />
        <p className="flex-1 font-body text-xs" style={{ color: COLORS.stone }}>
          소재 올리기와 콘텐츠 요청, 뭐가 다른가요?
        </p>
        <ChevronRight size={15} strokeWidth={1.8}
          style={{ color: COLORS.muted, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div className="px-4 pb-4" style={{ borderTop: `1px solid ${COLORS.light}` }}>
          <p className="font-body text-sm mt-3 mb-3" style={{ color: COLORS.ink }}>
            소재 올리기는 <strong>이거 올려줘</strong>, 콘텐츠 요청은 <strong>뭘 만들지 알려줘</strong> 입니다.
          </p>

          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${COLORS.light}` }}>
            <div className="grid grid-cols-[64px_1fr_1fr]">
              <div className="px-2 py-2" style={{ background: COLORS.cardElev }}></div>
              <div className="px-2 py-2 font-heading text-[11px]"
                style={{ background: COLORS.cardElev, color: COLORS.ink }}>소재 올리기</div>
              <div className="px-2 py-2 font-heading text-[11px]"
                style={{ background: COLORS.cardElev, color: COLORS.ink }}>콘텐츠 요청</div>

              {ROWS.map(([label, a, b]) => (
                <React.Fragment key={label}>
                  <div className="px-2 py-2 font-mono text-[10px]"
                    style={{ color: COLORS.muted, borderTop: `1px solid ${COLORS.light}` }}>{label}</div>
                  <div className="px-2 py-2 font-body text-[11px] leading-snug"
                    style={{ color: COLORS.stone, borderTop: `1px solid ${COLORS.light}` }}>{a}</div>
                  <div className="px-2 py-2 font-body text-[11px] leading-snug"
                    style={{ color: COLORS.stone, borderTop: `1px solid ${COLORS.light}` }}>{b}</div>
                </React.Fragment>
              ))}
            </div>
          </div>

          <p className="font-body text-[11px] mt-3" style={{ color: COLORS.muted }}>
            실습 사진을 찍어두셨으면 소재 올리기로 올리시면 됩니다.
            &quot;비포애프터 같은 걸 만들고 싶은데 어떻게 찍지?&quot; 싶으면 콘텐츠 요청을 하시고,
            나온 기획안대로 찍어서 다시 소재 올리기로 올리시면 돼요.
          </p>
        </div>
      )}
    </div>
  );
}

// 📤 소재 올리기. 사진이나 영상을 올리면 대기열에 들어가고,
// 정해진 시간에 캡션과 브랜드 오버레이가 붙어 승인 요청으로 온다.
// 원본은 Supabase 에 임시로만 두고 처리가 끝나면 자동화가 지운다.
const UPLOAD_BUCKET = 'content-media';

const MAX_FILES = 10;  // 인스타 캐러셀 한 게시물 최대 장수

// 디자인 칸의 "완성본 그대로". ChatGPT 로 다 만든 이미지를 글씨 얹지 않고 올린다.
// 이미지는 원장님 ChatGPT Plus 안에서 만들어지니 따로 드는 돈이 없다.
const AS_IS = 'as_is';

// ChatGPT 에 매번 히썹 느낌을 설명하지 않아도 되게 붙여넣을 요청문.
async function copyChatGptPrompt(channel) {
  const who = channel === 'hssup-artmake' ? '히썹 아트메이크(반영구 시술)' : '히썹 아카데미(반영구 교육)';
  const text = `${who} 인스타그램 게시물 이미지를 만들어 주세요.

[규격]
- 세로형 4:5 비율 (1080×1350)
- 한글은 맞춤법 그대로, 글자가 깨지거나 뭉개지지 않게

[히썹 브랜드]
- 메인 색은 주황 #FF5C1F, 나머지는 검정과 흰색, 베이지 위주
- 굵고 깔끔한 고딕체
- 로고 자리에 "HSSUP ACADEMY" 문구
- 깔끔하고 고급스럽게, 과한 장식 없이

[내용]
(여기에 이미지에 넣을 내용과 원하는 느낌을 적어 주세요)`;
  try {
    await navigator.clipboard.writeText(text);
    toast('복사했어요. ChatGPT에 붙여넣고 [내용]만 채우세요');
  } catch {
    toast('복사하지 못했어요. 브라우저가 막았을 수 있어요');
  }
}

// ChatGPT 사진 보정 요청문 모음. 누르면 복사, 제목을 누르면 전문을 펼친다.
function ChatGptPrompts() {
  const [open, setOpen] = useState(null);
  const copy = async (it) => {
    try {
      await navigator.clipboard.writeText(it.text);
      toast(it.text.includes('[') ? '복사했어요. [대괄호] 칸만 바꿔서 쓰세요' : '복사했어요. ChatGPT에 사진과 함께 붙여넣으세요');
    } catch {
      toast('복사하지 못했어요. 브라우저가 막았을 수 있어요');
    }
  };
  return (
    <div>
      <p className="font-body text-xs mb-4 leading-relaxed" style={{ color: COLORS.muted }}>
        ChatGPT에 사진을 올리고 요청문을 붙여넣으세요. 시술 부위는 바꾸지 말라는 말이 모두 들어 있어요.
      </p>
      {PROMPT_GROUPS.map(g => (
        <div key={g.title} className="mb-5">
          <p className="font-heading text-sm mb-2" style={{ color: COLORS.ink }}>
            {g.title} <span className="font-body text-[11px]" style={{ color: COLORS.muted }}>{g.hint}</span>
          </p>
          <div className="space-y-2">
            {g.items.map(it => {
              const key = `${g.title}/${it.name}`;
              return (
                <div key={key} className="rounded-xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                  <div className="flex items-center gap-2 p-3">
                    <button onClick={() => setOpen(open === key ? null : key)} className="flex-1 text-left min-w-0">
                      <p className="font-heading text-xs" style={{ color: COLORS.ink }}>{it.name}</p>
                      <p className="font-body text-[11px] mt-0.5" style={{ color: COLORS.muted }}>{it.use}</p>
                    </button>
                    <button onClick={() => copy(it)}
                      className="shrink-0 rounded-lg px-3 font-heading text-[11px] flex items-center gap-1"
                      style={{ background: COLORS.primary, color: COLORS.white, minHeight: 36 }}>
                      <Copy size={12} /> 복사
                    </button>
                  </div>
                  {open === key && (
                    <p className="font-body text-[11px] leading-relaxed whitespace-pre-wrap px-3 pb-3"
                      style={{ color: COLORS.stone }}>{it.text}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// 💡 오늘의 콘텐츠 아이디어. 자동화(daily_ideas.py)가 매일 아침 정해진 모양의 마크다운으로 쓴다.
//   ## 1. 제목
//   - **계정**: 아카데미 / - **형식**: … / - **왜 지금**: … / - **사진**: … / - **요청문**: …
function parseIdeas(body) {
  return (body || '').split(/^## /m).slice(1).map(chunk => {
    const [first, ...rest] = chunk.split('\n');
    const field = (name) => {
      const line = rest.find(l => l.startsWith(`- **${name}**:`));
      return line ? line.slice(`- **${name}**:`.length).trim() : '';
    };
    const photo = field('사진');
    return {
      title: first.replace(/^\d+\.\s*/, '').trim(),
      channel: field('계정') === '아트메이크' ? 'hssup-artmake' : 'hssup-academy',
      channelKo: field('계정') || '아카데미',
      format: field('형식'),
      why: field('왜 지금'),
      needsPhoto: photo.startsWith('찍어야'),
      shoot: photo.replace(/^찍어야 함\s*—\s*/, ''),
      request: field('요청문'),
    };
  }).filter(i => i.title);
}

// 첫 "## " 앞은 박서준 팀장의 아침 인사.
const ideasGreeting = (body) => (body || '').split(/^## /m)[0].trim();

function IdeaCard({ idea, userId, onShoot }) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  // 사진 없이 만들 수 있는 건 바로 "사진 없이 만들기" 로 맡긴다(바로 작업).
  const make = async () => {
    setBusy(true);
    const { error } = await supabase.from('ai_media_queue').insert({
      channel: idea.channel,
      media_type: 'design',
      group_key: `i${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      urgency: 'now',
      user_caption: `${idea.title}\n\n${idea.request}`,
      ref_urls: [],
      created_by: userId || null,
    });
    setBusy(false);
    if (error) { toast('맡기지 못했어요: ' + error.message); return; }
    setSent(true);
    toast('맡겼어요. 소재 올리기에서 진행 상황을 볼 수 있어요');
  };

  return (
    <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
      <p className="font-mono text-[10px] tracking-wider" style={{ color: COLORS.muted }}>
        {idea.channelKo} · {idea.format}
      </p>
      <h3 className="font-heading text-sm mt-1 leading-snug" style={{ color: COLORS.ink }}>{idea.title}</h3>
      <p className="font-body text-xs mt-2 leading-relaxed" style={{ color: COLORS.stone }}>{idea.why}</p>
      {idea.needsPhoto && (
        <p className="font-body text-xs mt-2 leading-relaxed rounded-lg p-2" style={{ background: COLORS.cardElev, color: COLORS.ink }}>
          📷 {idea.shoot}
        </p>
      )}
      <details className="mt-2">
        <summary className="font-body text-[11px] cursor-pointer" style={{ color: COLORS.muted }}>디자인 요청문 보기</summary>
        <p className="font-body text-[11px] mt-1 leading-relaxed" style={{ color: COLORS.stone }}>{idea.request}</p>
      </details>
      <div className="mt-3">
        {idea.needsPhoto ? (
          <button onClick={() => onShoot(idea)}
            className="w-full rounded-xl font-heading text-xs" style={{ background: COLORS.ink, color: COLORS.card, minHeight: 40 }}>
            찍어서 올리기
          </button>
        ) : (
          <button onClick={make} disabled={busy || sent}
            className="w-full rounded-xl font-heading text-xs disabled:opacity-60 flex items-center justify-center gap-1.5"
            style={{ background: sent ? COLORS.cardElev : COLORS.primary, color: sent ? COLORS.stone : COLORS.card, minHeight: 40 }}>
            {busy && <Loader2 size={13} className="animate-spin" />}
            {sent ? '맡겼어요 ✓' : '이걸로 만들어줘'}
          </button>
        )}
      </div>
    </div>
  );
}

// 소재 하나가 지금 어디까지 왔는지. 자동화(process_queue)가 ai_media_queue.status 에 적는다.
const QUEUE_STATE = {
  queued:  { ko: '대기 중',   tone: COLORS.muted,   hint: '정해진 시간(낮 12:30 / 저녁 8시)에 하나씩 만들어요. 기다리기 싫으면 바로 작업으로 바꾸세요.' },
  soon:    { ko: '곧 시작',   tone: COLORS.primary, hint: '5분 안에 만들기 시작해요.' },
  working: { ko: '만드는 중', tone: COLORS.primary, hint: '보통 2~3분, 새로 그리는 디자인은 5분쯤 걸려요. 다 되면 시안으로 올라와요.' },
  failed:  { ko: '실패',     tone: COLORS.deep,    hint: '만들다 멈췄어요. 다시 맡기거나 빼 주세요.' },
  shown:   { ko: '시안 나옴', tone: COLORS.primary, hint: '시안이 올라왔어요. 확인하고 게시를 누르시면 인스타에 올라가요.' },
  done:    { ko: '처리됨',   tone: COLORS.muted,   hint: '시안으로 올라갔거나, 이미 게시 또는 건너뛰기 한 거예요.' },
};

// 같은 묶음(group_key)은 한 게시물이라 한 줄로. 승인 요청과 짝지어 "시안 나옴" 을 가린다.
function groupQueue(rows, approvals) {
  const map = new Map();
  for (const row of rows) {
    const key = row.group_key || `id${row.id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return [...map.entries()].map(([key, list]) => {
    list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.id - b.id);
    const ids = list.map(r => r.id);
    const approval = approvals.find(a => {
      const pl = a.payload || {};
      if ((pl.app_queue_ids || []).some(id => ids.includes(id))) return true;
      const paths = pl.storage_paths || (pl.storage_path ? [pl.storage_path] : []);
      return paths.some(p => list.some(r => r.storage_path === p));
    });
    const has = (s) => list.some(r => r.status === s);
    const state = has('failed') ? 'failed'
      : has('working') ? 'working'
      : has('queued') ? (list[0].urgency === 'now' ? 'soon' : 'queued')
      : approval ? 'shown' : 'done';
    return { key, rows: list, state, approval };
  });
}

// 대기열 한 줄. 누르면 펼쳐서 무엇을 맡겼는지, 지금 어떤 상태인지, 할 수 있는 일을 보여준다.
function QueueItem({ group, onRemove, onChanged, onOpenDraft }) {
  const { rows, state, approval } = group;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const head = rows[0];
  const info = QUEUE_STATE[state];
  const note = rows.find(r => r.user_caption)?.user_caption;
  const error = rows.find(r => r.error)?.error;
  const refs = Array.isArray(head.ref_urls) ? head.ref_urls : [];
  const kind = head.media_type === 'design' ? '사진 없이 디자인'
    : head.media_type === 'video' ? '영상' : (rows.length > 1 ? `사진 ${rows.length}장` : '사진');

  const update = async (patch, done) => {
    setBusy(true);
    const { error: err } = await supabase.from('ai_media_queue').update(patch).in('id', rows.map(r => r.id));
    setBusy(false);
    if (err) { toast('바꾸지 못했어요: ' + err.message); return; }
    toast(done);
    onChanged();
  };

  return (
    <div className="rounded-xl" style={{ background: COLORS.cardElev }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-2 p-2 text-left">
        <div className="relative shrink-0">
          {head.media_type === 'design'
            ? <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: COLORS.peach }}>
                <Sparkles size={16} strokeWidth={1.8} style={{ color: COLORS.primary }} />
              </div>
            : head.media_type === 'video'
            ? <video src={thumbSrc(head.media_url)} muted playsInline preload="metadata" className="w-12 h-12 rounded-lg object-cover" />
            : <img src={head.media_url} alt="" className="w-12 h-12 rounded-lg object-cover" />}
          {rows.length > 1 && (
            <span className="absolute -top-1 -right-1 rounded-full px-1.5 font-mono text-[9px]"
              style={{ background: COLORS.ink, color: COLORS.card }}>{rows.length}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] flex items-center gap-1" style={{ color: COLORS.muted }}>
            <span className="rounded px-1 flex items-center gap-1" style={{ background: COLORS.peach, color: info.tone }}>
              {(state === 'working' || state === 'soon') && <Loader2 size={9} className="animate-spin" />}
              {info.ko}
            </span>
            <span className="truncate">
              {head.channel === 'hssup-academy' ? '아카데미' : '아트메이크'} · {kind}
              {head.urgency === 'now' ? ' · 바로' : ''}{head.as_is ? ' · 완성본' : ''}
            </span>
          </p>
          <p className="font-body text-xs truncate" style={{ color: COLORS.stone }}>{note || '설명 없음'}</p>
        </div>
        <ChevronRight size={15} strokeWidth={1.8} className="shrink-0"
          style={{ color: COLORS.muted, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div className="px-3 pb-3">
          <p className="font-body text-[11px] leading-relaxed" style={{ color: info.tone }}>{info.hint}</p>
          {state === 'failed' && error && (
            <p className="font-body text-[11px] mt-1 leading-relaxed" style={{ color: COLORS.stone }}>이유: {error}</p>
          )}
          <p className="font-mono text-[10px] mt-2" style={{ color: COLORS.muted }}>
            {new Date(head.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}에 맡김
          </p>
          {note && (
            <p className="font-body text-xs mt-2 whitespace-pre-wrap leading-relaxed" style={{ color: COLORS.ink }}>{note}</p>
          )}
          {(rows.some(r => r.media_url) || refs.length > 0) && (
            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
              {rows.filter(r => r.media_url && r.media_type !== 'video').map(r => (
                <img key={r.id} src={r.media_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
              ))}
              {refs.map(u => (
                <div key={u} className="relative shrink-0">
                  <img src={u} alt="" className="w-14 h-14 rounded-lg object-cover" />
                  <span className="absolute bottom-0 left-0 right-0 rounded-b-lg text-center font-mono text-[8px] py-0.5"
                    style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>참고</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            {state === 'shown' && approval && (
              <button onClick={() => onOpenDraft?.(approval.id)}
                className="px-3 rounded-xl font-heading text-xs" style={{ background: COLORS.primary, color: COLORS.card, minHeight: 36 }}>
                시안 보러 가기
              </button>
            )}
            {state === 'queued' && (
              <button disabled={busy} onClick={() => update({ urgency: 'now' }, '바로 작업으로 바꿨어요. 5분 안에 시작해요')}
                className="px-3 rounded-xl font-heading text-xs disabled:opacity-50" style={{ background: COLORS.ink, color: COLORS.card, minHeight: 36 }}>
                바로 작업으로 바꾸기
              </button>
            )}
            {state === 'failed' && (
              <button disabled={busy} onClick={() => update({ status: 'queued', error: null, urgency: 'now' }, '다시 맡겼어요. 5분 안에 시작해요')}
                className="px-3 rounded-xl font-heading text-xs disabled:opacity-50" style={{ background: COLORS.ink, color: COLORS.card, minHeight: 36 }}>
                다시 맡기기
              </button>
            )}
            {['queued', 'soon', 'failed'].includes(state) && (
              <button disabled={busy} onClick={() => onRemove(rows)}
                className="px-3 rounded-xl font-heading text-xs disabled:opacity-50"
                style={{ background: COLORS.card, color: COLORS.stone, border: `1px solid ${COLORS.light}`, minHeight: 36 }}>
                빼기
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MediaUpload({ userId, approvals = [], row = false, bare = false, onOpenDraft, onRefreshApprovals, prefill }) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState([]);
  // 오늘 아이디어에서 "찍어서 올리기" 로 오면 계정과 설명이 채워진 채 열린다.
  const [caption, setCaption] = useState(prefill?.caption || '');
  const [channel, setChannel] = useState(prefill?.channel || 'hssup-academy');
  const [urgency, setUrgency] = useState('scheduled');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [queued, setQueued] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  // 저장한 디자인. 시안 대화에서 "앞으로 후기는 이걸로" 하면 자동화가 여기에 넣는다.
  const [styles, setStyles] = useState([]);
  const [styleId, setStyleId] = useState(null);   // null = 기본 틀

  useEffect(() => {
    (async () => {
      // 표가 아직 없으면(SQL 실행 전) 조용히 빈 목록. 기본 틀로만 올라간다.
      const { data } = await supabase.from('ai_styles')
        .select('id,channel,name,preview_url').order('created_at', { ascending: true });
      setStyles(data || []);
    })();
  }, [open, bare]);

  const channelStyles = styles.filter(s => s.channel === channel);
  const pickedStyle = channelStyles.find(s => s.id === styleId) || null;

  // 처리가 끝난 것도 잠깐은 남겨둔다. 올리자마자 목록에서 사라지면
  // 내가 뭘 올렸는지, 지금 어디까지 갔는지 알 길이 없다.
  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('ai_media_queue').select('*')
        .in('status', ['queued', 'working', 'failed', 'done'])
        .gte('created_at', since)
        .order('created_at', { ascending: true });
      setQueued(data || []);
    })();
  }, [reloadKey]);

  const previews = React.useMemo(
    () => files.map(f => (f.type.startsWith('video/') ? null : URL.createObjectURL(f))),
    [files],
  );
  useEffect(() => () => previews.forEach(u => u && URL.revokeObjectURL(u)), [previews]);

  const groups = React.useMemo(() => groupQueue(queued, approvals), [queued, approvals]);
  const activeCount = groups.filter(g => ['queued', 'soon', 'working'].includes(g.state)).length;

  // 만드는 중인 게 있으면 15초마다 다시 본다. 시안이 나오면 승인 목록도 새로 받아 "시안 나옴" 으로 짝을 맞춘다.
  const busyQueue = groups.some(g => g.state === 'soon' || g.state === 'working'
    || (g.state === 'done' && Date.now() - new Date(g.rows[0].done_at || 0).getTime() < 10 * 60 * 1000));
  useEffect(() => {
    if (!busyQueue) return;
    const timer = setInterval(() => {
      setReloadKey(k => k + 1);
      onRefreshApprovals?.();
    }, 15000);
    return () => clearInterval(timer);
  }, [busyQueue, onRefreshApprovals]);

  // 한 번에 고른 사진들은 같은 묶음 = 한 게시물(캐러셀)로 올라간다.
  // 영상은 인스타에서 사진과 같이 묶을 수 없어서 각자 따로 간다.
  // 사진 없이 글로만 요청. 디자인 담당이 새 그림까지 그려 한 장을 만든다.
  // 고른 사진은 게시물이 아니라 "이런 느낌으로" 참고 사진으로 간다.
  const [fromText, setFromText] = useState(false);
  const refs = useChatPhotos();

  const submitDesign = async () => {
    const text = caption.trim();
    if (!text) return;
    setBusy(true);
    try {
      const refUrls = refs.files.length ? await uploadChatPhotos(refs.files) : [];
      const { error } = await supabase.from('ai_media_queue').insert({
        channel,
        media_type: 'design',
        group_key: `d${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        urgency,
        user_caption: text,
        ref_urls: refUrls,
        created_by: userId || null,
      });
      if (error) {
        if (/ref_urls|media_url|storage_path/.test(error.message)) throw new Error('사진 없이 만들기 준비(DB 설정)가 아직 안 됐어요');
        throw error;
      }
      setCaption('');
      refs.clear();
      setReloadKey(k => k + 1);
      toast(urgency === 'now'
        ? '디자인을 맡겼어요. 몇 분 안에 승인 요청이 올라와요'
        : '디자인을 맡겼어요. 다음 처리 시간에 승인 요청이 올라와요');
    } catch (e) {
      toast('맡기지 못했어요: ' + (e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (fromText) return submitDesign();
    if (!files.length) return;
    setBusy(true);
    const photoGroup = `g${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const rows = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const picked = files[i];
        const isVideo = picked.type.startsWith('video/');
        // 압축은 용량을 줄이려는 것뿐이다. 실패해도 원본으로 올린다.
        let toUpload = picked;
        if (!isVideo) {
          try {
            toUpload = await compressImage(picked, 1440, 0.9);
          } catch {
            toUpload = picked;
          }
        }
        const ext = toUpload.name.split('.').pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: upErr } = await supabase.storage.from(UPLOAD_BUCKET)
          .upload(path, toUpload, { contentType: toUpload.type, upsert: false });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(path);
        rows.push({
          channel,
          media_url: pub.publicUrl,
          storage_path: path,
          media_type: isVideo ? 'video' : 'image',
          group_key: isVideo ? `${photoGroup}-v${i}` : photoGroup,
          sort_order: i,
          urgency,
          // 설명은 묶음의 첫 장에만 달면 자동화가 찾아 쓴다.
          user_caption: i === 0 ? (caption.trim() || null) : null,
          created_by: userId || null,
          // 디자인을 골랐을 때만 넣는다. 기본 틀은 칸 자체를 건드리지 않는다(SQL 실행 전에도 올라가게).
          ...(pickedStyle && !isVideo ? { style_id: pickedStyle.id } : {}),
          ...(styleId === AS_IS && !isVideo ? { as_is: true } : {}),
        });
        setProgress(i + 1);
      }

      const { error } = await supabase.from('ai_media_queue').insert(rows);
      if (error) {
        if (error.message.includes('as_is')) throw new Error('완성본 올리기 준비(DB 설정)가 아직 안 됐어요');
        throw error;
      }

      setFiles([]);
      setCaption('');
      setReloadKey(k => k + 1);
      const what = files.length > 1 ? `${files.length}장을 한 게시물로` : '소재를';
      toast(urgency === 'now'
        ? `${what} 올렸어요. 몇 분 안에 승인 요청이 올라와요`
        : `${what} 올렸어요. 다음 처리 시간에 승인 요청이 올라와요`);
    } catch (e) {
      toast('올리지 못했어요: ' + (e.message || e));
    } finally {
      setProgress(0);
      setBusy(false);
    }
  };

  // 묶음은 한 게시물이라 통째로 뺀다. 몇 장만 빼면 나머지가 어중간해진다.
  // 사진 원본까지 지우고 되돌릴 수 없어서 반드시 한 번 물어본다.
  const removeGroup = async (rows) => {
    const what = rows.length > 1 ? `사진 ${rows.length}장을` : '이 소재를';
    if (!await confirmDialog(`${what} 대기열에서 빼고 원본도 지울까요?\n지우면 되돌릴 수 없어요.`)) return;
    const paths = rows.map(r => r.storage_path).filter(Boolean);  // 사진 없이 만든 요청은 원본이 없다
    if (paths.length) await supabase.storage.from(UPLOAD_BUCKET).remove(paths);
    const { error } = await supabase.from('ai_media_queue').delete().in('id', rows.map(r => r.id));
    if (error) {
      toast('취소하지 못했어요: ' + error.message);
      return;
    }
    setReloadKey(k => k + 1);
  };

  const CHANNELS = [['hssup-academy', '아카데미'], ['hssup-artmake', '아트메이크']];

  return (
    <div className={row ? '' : 'rounded-2xl mb-3'}
      style={row ? undefined : { background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
      {!bare && (
        <button onClick={() => setOpen(v => !v)} className="w-full p-4 flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: COLORS.peach, border: `1px solid rgba(255,92,31,0.25)` }}>
            <Upload size={16} strokeWidth={1.8} style={{ color: COLORS.primary }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading text-sm" style={{ color: COLORS.ink }}>소재 올리기</p>
            <p className="font-body text-xs mt-1" style={{ color: queued.length ? COLORS.stone : COLORS.muted }}>
              {activeCount ? `진행 중 ${activeCount}건` : '찍어둔 사진·영상을 게시물로'}
            </p>
          </div>
          <ChevronRight size={17} strokeWidth={1.8}
            style={{ color: COLORS.muted, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      )}

      {(open || bare) && (
        <div className="px-4 pb-4" style={bare ? undefined : { borderTop: `1px solid ${COLORS.light}` }}>
          {groups.length > 0 && (
            <div className="my-3">
              <p className="font-mono text-[10px] mb-1.5 tracking-wider" style={{ color: COLORS.muted }}>
                맡긴 것 · 눌러서 진행 상황 보기
              </p>
              <div className="space-y-2">
                {groups.map(g => (
                  <QueueItem key={g.key} group={g} onRemove={removeGroup}
                    onChanged={() => setReloadKey(k => k + 1)} onOpenDraft={onOpenDraft} />
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            {CHANNELS.map(([key, label]) => (
              <button key={key} onClick={() => { setChannel(key); setStyleId(null); }}
                className="px-3 rounded-xl font-heading text-xs"
                style={channel === key
                  ? { background: COLORS.ink, color: COLORS.card, minHeight: 44 }
                  : { background: COLORS.card, color: COLORS.stone, border: `1px solid ${COLORS.light}`, minHeight: 44 }}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mt-2">
            {[[false, '사진으로 올리기'], [true, '사진 없이 만들기']].map(([key, label]) => (
              <button key={label} onClick={() => setFromText(key)}
                className="flex-1 rounded-xl font-heading text-xs"
                style={fromText === key
                  ? { background: COLORS.ink, color: COLORS.card, minHeight: 40 }
                  : { background: COLORS.card, color: COLORS.stone, border: `1px solid ${COLORS.light}`, minHeight: 40 }}>
                {label}
              </button>
            ))}
          </div>

          {fromText && (
            <div className="mt-3">
              <div className="flex items-end justify-between gap-2">
                <p className="font-heading text-xs" style={{ color: COLORS.ink }}>어떤 이미지를 만들까요?</p>
                <MicButton onText={setCaption} value={caption} />
              </div>
              <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={4}
                placeholder="예: 단풍 수채화 일러스트 배경에 '10월 정규반 모집' 크게, 주황 포인트"
                className="w-full rounded-xl p-3 mt-2 font-body text-sm leading-relaxed"
                style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}`, resize: 'vertical' }} />
              <AttachPreview photos={refs} />
              <div className="flex items-center gap-2 mt-2">
                <AttachButton photos={refs} disabled={busy} />
                <p className="font-body text-[11px] leading-snug" style={{ color: COLORS.muted }}>
                  &quot;이런 느낌으로&quot; 참고 사진 (선택)
                </p>
              </div>
              <p className="font-body text-[11px] mt-2 leading-relaxed" style={{ color: COLORS.muted }}>
                필요하면 그림(일러스트, 배경)도 새로 그려서 한 장으로 만들어요.
              </p>
            </div>
          )}

          {!fromText && (<>
          <label className="block mt-2 rounded-xl p-4 text-center cursor-pointer"
            style={{ background: COLORS.cardElev, border: `1px dashed ${COLORS.light}` }}>
            {/* 윈도우 파일 창이 image/* 만 보면 아이폰 사진(HEIC)을 회색으로 감추는 일이 있다.
                확장자를 직접 적어 목록에 뜨게 한다. */}
            <input type="file" accept="image/*,video/*,.heic,.heif,.HEIC,.HEIF" multiple className="hidden"
              onChange={e => {
                const picked = [...(e.target.files || [])];
                if (picked.length > MAX_FILES) toast(`한 게시물에 ${MAX_FILES}장까지예요. 앞 ${MAX_FILES}장만 담았어요`);
                setFiles(picked.slice(0, MAX_FILES));
                e.target.value = '';  // 같은 파일을 다시 골라도 반응하게
              }} />
            <p className="font-body text-sm" style={{ color: files.length ? COLORS.ink : COLORS.muted }}>
              {files.length
                ? (files.length > 1 ? `${files.length}장 선택됨` : files[0].name)
                : `사진 또는 영상 선택 (최대 ${MAX_FILES}장)`}
            </p>
          </label>

          {files.length > 1 && (
            <>
              <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="relative shrink-0">
                    {f.type.startsWith('video/')
                      ? <div className="w-14 h-14 rounded-lg flex items-center justify-center"
                          style={{ background: COLORS.cardElev }}>
                          <PlayCircle size={16} strokeWidth={1.8} style={{ color: COLORS.muted }} />
                        </div>
                      : <img src={previews[i]} alt="" className="w-14 h-14 rounded-lg object-cover" />}
                    <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                      aria-label={`${i + 1}번째 빼기`}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: COLORS.ink, color: COLORS.card }}>
                      <X size={11} />
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-0 left-0 right-0 rounded-b-lg text-center font-mono text-[8px] py-0.5"
                        style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>표지</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="font-body text-[11px] mt-1" style={{ color: COLORS.muted }}>
                맨 앞이 표지입니다. 헤드라인은 표지에만 얹혀요.
              </p>
            </>
          )}

          <div className="mt-2">
              <p className="font-mono text-[10px] mb-1.5 tracking-wider" style={{ color: COLORS.muted }}>디자인</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[{ id: null, name: '기본' }, { id: AS_IS, name: '완성본 그대로' }, ...channelStyles].map(s => (
                  <button key={s.id ?? 'base'} onClick={() => setStyleId(s.id)}
                    className="px-3 rounded-xl font-heading text-xs shrink-0 flex items-center gap-1.5"
                    style={styleId === s.id
                      ? { background: COLORS.ink, color: COLORS.card, minHeight: 40 }
                      : { background: COLORS.card, color: COLORS.stone, border: `1px solid ${COLORS.light}`, minHeight: 40 }}>
                    {s.preview_url && <img src={s.preview_url} alt="" className="w-6 h-7 rounded object-cover" />}
                    {s.name}
                  </button>
                ))}
              </div>
              {pickedStyle && (
                <div className="flex items-center gap-2 mt-1">
                  <p className="font-body text-[11px] flex-1" style={{ color: COLORS.muted }}>
                    「{pickedStyle.name}」 디자인에 제목만 바꿔 얹어요. 영상에는 쓰이지 않아요.
                  </p>
                  <button onClick={async () => {
                    if (!await confirmDialog(`「${pickedStyle.name}」 디자인을 지울까요?`)) return;
                    const { error } = await supabase.from('ai_styles').delete().eq('id', pickedStyle.id);
                    if (error) { toast('지우지 못했어요: ' + error.message); return; }
                    setStyles(prev => prev.filter(x => x.id !== pickedStyle.id));
                    setStyleId(null);
                  }} className="font-body text-[11px] underline shrink-0" style={{ color: COLORS.muted }}>
                    지우기
                  </button>
                </div>
              )}
              {styleId === AS_IS && (
                <div className="mt-1 rounded-xl p-3" style={{ background: COLORS.cardElev }}>
                  <p className="font-body text-[11px] leading-relaxed" style={{ color: COLORS.stone }}>
                    ChatGPT 등으로 다 만든 이미지를 <strong>글씨를 얹지 않고</strong> 그대로 올려요. 담당자는 캡션만 써요.
                    세로가 너무 긴 이미지는 인스타 비율(4:5)에 맞게 양옆에 여백을 붙여요.
                  </p>
                  <button onClick={() => copyChatGptPrompt(channel)}
                    className="w-full mt-2 rounded-xl font-heading text-xs flex items-center justify-center gap-1.5"
                    style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}`, minHeight: 40 }}>
                    <Copy size={13} /> ChatGPT에 붙여넣을 요청문 복사
                  </button>
                </div>
              )}
            </div>

          <div className="flex items-end justify-between gap-2 mt-3">
            <p className="font-heading text-xs" style={{ color: COLORS.ink }}>어떤 내용인가요? <span style={{ color: COLORS.muted }}>(캡션 쓸 때 참고)</span></p>
            <MicButton onText={setCaption} value={caption} />
          </div>
          <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={3}
            placeholder="말하거나 적어주세요"
            className="w-full rounded-xl p-3 mt-2 font-body text-sm leading-relaxed"
            style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}`, resize: 'vertical' }} />
          </>)}

          <div className="flex gap-2 mt-2">
            {[
              ['scheduled', '정해진 시간에', '낮 12:30 / 저녁 8시'],
              ['now', '바로 작업', '몇 분 안에 승인 요청'],
            ].map(([key, label, hint]) => (
              <button key={key} onClick={() => setUrgency(key)}
                className="flex-1 rounded-xl px-2 py-2"
                style={urgency === key
                  ? { background: COLORS.ink, color: COLORS.card }
                  : { background: COLORS.card, color: COLORS.stone, border: `1px solid ${COLORS.light}` }}>
                <p className="font-heading text-xs">{label}</p>
                <p className="font-mono text-[9px] mt-0.5" style={{ opacity: 0.7 }}>{hint}</p>
              </button>
            ))}
          </div>

          <button onClick={submit} disabled={busy || (fromText ? !caption.trim() : !files.length)}
            className="w-full mt-2 rounded-xl font-heading text-sm disabled:opacity-40"
            style={{ background: COLORS.primary, color: COLORS.card, minHeight: 44 }}>
            {busy
              ? (files.length > 1 ? `올리는 중… ${progress}/${files.length}` : '올리는 중…')
              : fromText ? '디자인 맡기기' : (urgency === 'now' ? '바로 작업 맡기기' : '대기열에 올리기')}
          </button>

          {/* 여기서 올리면 바로 게시되는 줄 알기 쉬워서 버튼 밑에 붙여 둔다. */}
          <div className="flex items-start gap-2 mt-2 rounded-xl p-3" style={{ background: COLORS.cardElev }}>
            <AlertCircle size={14} strokeWidth={1.8} className="shrink-0 mt-0.5" style={{ color: COLORS.primary }} />
            <p className="font-body text-[11px] leading-relaxed" style={{ color: COLORS.stone }}>
              올려도 인스타에 바로 게시되지 않아요.
              캡션과 로고가 붙은 완성본이 <strong>승인 요청</strong>으로 올라오면,
              거기서 <strong>게시</strong>를 누르셔야 올라갑니다.
            </p>
          </div>

          <p className="font-body text-[11px] mt-3" style={{ color: COLORS.muted }}>
            사진을 여러 장 고르면 한 게시물(넘겨보는 형태)로 올라갑니다. 영상은 한 편씩 따로예요.
          </p>
        </div>
      )}
    </div>
  );
}

// 📌 콘텐츠 요청. 떠오른 아이디어를 적어두는 자리.
// "지금" 은 몇 분 안에 기획안이 나오고, "주간" 은 월요일 기획에 반영된다.
function ContentRequest({ userId, row = false, bare = false }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [urgency, setUrgency] = useState('now');
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('ai_requests').select('*').eq('status', 'open').order('created_at', { ascending: true });
      setItems(data || []);
    })();
  }, [reloadKey]);

  const photos = useChatPhotos();

  const submit = async () => {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    try {
      await insertWithPhotos('ai_requests', { body: text, urgency, created_by: userId || null }, photos.files);
    } catch (e) {
      toast('보내지 못했어요: ' + (e.message || e));
      setBusy(false);
      return;
    }
    setBusy(false);
    setBody('');
    photos.clear();
    setReloadKey(k => k + 1);
    toast(urgency === 'now' ? '곧 기획안이 올라옵니다' : '월요일 기획에 반영됩니다');
  };

  const remove = async (id) => {
    const { error } = await supabase.from('ai_requests').delete().eq('id', id);
    if (error) {
      toast('취소하지 못했어요: ' + error.message);
      return;
    }
    setReloadKey(k => k + 1);
  };

  return (
    <div className={row ? '' : 'rounded-2xl mb-3'}
      style={row ? undefined : { background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
      {!bare && (
        <button onClick={() => setOpen(v => !v)} className="w-full p-4 flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: COLORS.peach, border: `1px solid rgba(255,92,31,0.25)` }}>
            <Plus size={16} strokeWidth={1.8} style={{ color: COLORS.primary }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading text-sm" style={{ color: COLORS.ink }}>콘텐츠 요청</p>
            <p className="font-body text-xs mt-1" style={{ color: items.length ? COLORS.stone : COLORS.muted }}>
              {items.length ? `대기 중 ${items.length}건` : '뭘 만들지 아이디어만 있을 때'}
            </p>
          </div>
          <ChevronRight size={17} strokeWidth={1.8}
            style={{ color: COLORS.muted, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      )}

      {(open || bare) && (
        <div className="px-4 pb-4" style={bare ? undefined : { borderTop: `1px solid ${COLORS.light}` }}>
          {items.length > 0 && (
            <div className="space-y-2 my-3">
              {items.map(it => (
                <div key={it.id} className="flex items-start gap-2 rounded-xl p-3" style={{ background: COLORS.cardElev }}>
                  <span className="font-mono text-[9px] px-2 py-1 rounded-full shrink-0"
                    style={it.urgency === 'now'
                      ? { background: COLORS.primary, color: COLORS.card }
                      : { background: COLORS.card, color: COLORS.stone }}>
                    {it.urgency === 'now' ? '지금' : '주간'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm" style={{ color: COLORS.ink }}>{it.body}</p>
                    {Array.isArray(it.attachments) && it.attachments.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {it.attachments.map(url => (
                          <img key={url} src={url} alt="" loading="lazy" className="w-10 h-10 rounded-md object-cover" />
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => remove(it.id)} aria-label="요청 취소"
                    className="shrink-0" style={{ color: COLORS.muted }}>
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea value={body} onChange={e => setBody(e.target.value)} rows={3}
            placeholder="말로 하시거나 적어주세요. 예: 리커버 브로우 비포애프터를 릴스로"
            className="w-full rounded-xl p-3 mt-3 font-body text-sm leading-relaxed"
            style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}`, resize: 'vertical' }} />

          <AttachPreview photos={photos} />
          <div className="flex gap-2 mt-2">
            <AttachButton photos={photos} disabled={busy} />
            {[['now', '지금 만들기'], ['weekly', '월요일 기획에']].map(([key, label]) => (
              <button key={key} onClick={() => setUrgency(key)}
                className="px-3 rounded-xl font-heading text-xs"
                style={urgency === key
                  ? { background: COLORS.ink, color: COLORS.card, minHeight: 44 }
                  : { background: COLORS.card, color: COLORS.stone, border: `1px solid ${COLORS.light}`, minHeight: 44 }}>
                {label}
              </button>
            ))}
            <button onClick={submit} disabled={busy || !body.trim()}
              className="flex-1 rounded-xl font-heading text-sm disabled:opacity-40"
              style={{ background: COLORS.primary, color: COLORS.card, minHeight: 44 }}>
              {busy ? '보내는 중…' : '요청'}
            </button>
          </div>

          <p className="font-body text-[11px] mt-3" style={{ color: COLORS.muted }}>
            지금 만들기는 몇 분 안에 기획안이 올라옵니다. 월요일 기획에는 주간 기획안에 함께 반영됩니다.
            📎 로 "이런 느낌으로" 참고 사진을 붙일 수 있어요.
          </p>
        </div>
      )}
    </div>
  );
}

// 🗒️ 사업 상황 메모. 숫자로는 알 수 없는 사정(모집 시기, 신제품, 이번 분기 목표)을
// 여기 적어두면 기획자가 매번 읽고 반영한다. 대화로 알려주면 그 주에만 반영되고 끝난다.
function BusinessContext({ userId, row = false, bare = false }) {
  const [notes, setNotes] = useState([]);
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('ai_notes').select('*').eq('key', 'business').order('created_at', { ascending: false });
      setNotes(data || []);
    })();
  }, [reloadKey]);

  const add = async () => {
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    const { error } = await supabase.from('ai_notes')
      .insert({ key: 'business', body, created_by: userId || null });
    setBusy(false);
    if (error) {
      toast('저장하지 못했어요: ' + error.message);
      return;
    }
    setDraft('');
    setReloadKey(k => k + 1);
    toast('다음 기획부터 반영됩니다');
  };

  const remove = async (note) => {
    if (!await confirmDialog('이 메모를 지울까요?')) return;
    const { error } = await supabase.from('ai_notes').delete().eq('id', note.id);
    if (error) {
      toast('지우지 못했어요: ' + error.message);
      return;
    }
    setReloadKey(k => k + 1);
  };

  const preview = notes.length
    ? (notes[0].body.split('\n').find(l => l.trim()) || '')
    : '아직 비어 있습니다';

  return (
    <div className={row ? '' : 'rounded-2xl mb-6 overflow-hidden'}
      style={row ? undefined : { background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
      {!bare && (
        <button onClick={() => setOpen(v => !v)} className="w-full p-4 flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: COLORS.peach, border: `1px solid rgba(255,92,31,0.25)` }}>
            <FileText size={16} strokeWidth={1.8} style={{ color: COLORS.primary }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading text-sm" style={{ color: COLORS.ink }}>
              사업 상황 메모{notes.length > 0 ? ` ${notes.length}장` : ''}
            </p>
            <p className="font-body text-xs mt-1 truncate" style={{ color: notes.length ? COLORS.stone : COLORS.muted }}>{preview}</p>
          </div>
          <ChevronRight size={17} strokeWidth={1.8}
            style={{ color: COLORS.muted, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      )}

      {(open || bare) && (
        <div className="px-4 pb-4" style={bare ? undefined : { borderTop: `1px solid ${COLORS.light}` }}>
          <p className="font-body text-xs my-3" style={{ color: COLORS.muted }}>
            숫자로는 알 수 없는 것을 한 장에 하나씩 적어주세요. 기획할 때마다 전부 읽고 반영합니다.
            지난 일이 되면 지우시면 됩니다.
          </p>

          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={3}
            placeholder="예: 10월부터 창업반 모집, 색소 판매 시작, 당분간 촬영 여력 부족"
            className="w-full rounded-xl p-3 font-body text-sm leading-relaxed"
            style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}`, resize: 'vertical' }} />
          <button onClick={add} disabled={busy || !draft.trim()}
            className="w-full mt-2 rounded-xl font-heading text-sm disabled:opacity-40"
            style={{ background: COLORS.primary, color: COLORS.card, minHeight: 44 }}>
            {busy ? '저장 중…' : '메모 추가'}
          </button>

          {notes.length > 0 && (
            <div className="space-y-2 mt-4">
              {notes.map(n => (
                <div key={n.id} className="flex items-start gap-2 rounded-xl p-3" style={{ background: COLORS.cardElev }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm leading-relaxed whitespace-pre-wrap" style={{ color: COLORS.ink }}>{n.body}</p>
                    <p className="font-mono text-[9px] mt-1.5" style={{ color: COLORS.muted }}>
                      {new Date(n.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                    </p>
                  </div>
                  <button onClick={() => remove(n)} aria-label="메모 지우기" className="shrink-0 mt-0.5" style={{ color: COLORS.muted }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const APPROVAL_STATUS_LABEL = {
  approved: { ko: '처리 중', tone: 'wait' },
  sent: { ko: '게시됨', tone: 'ok' },
  skipped: { ko: '건너뜀', tone: 'muted' },
  failed: { ko: '실패', tone: 'bad' },
};

// 이미 결정된 건은 버튼 없이 결과만 보여준다. 제목만 먼저 보이고 눌러야 내용이 열린다.
function DecidedCard({ row }) {
  const [open, setOpen] = useState(false);
  const meta = APPROVAL_STATUS_LABEL[row.status] || { ko: row.status, tone: 'muted' };
  const tone = {
    ok: { bg: 'rgba(34,160,90,0.12)', fg: '#22A05A' },
    wait: { bg: COLORS.peach, fg: COLORS.primary },
    bad: { bg: 'rgba(220,60,60,0.12)', fg: '#DC3C3C' },
    muted: { bg: COLORS.cardElev, fg: COLORS.muted },
  }[meta.tone];
  const firstLine = (row.body || '').split('\n').find(l => l.trim()) || '내용 없음';

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
      <button onClick={() => setOpen(v => !v)} className="w-full p-4 flex items-center gap-3 text-left">
        <span className="font-mono text-[9px] px-2 py-1 rounded-full tracking-widest shrink-0"
          style={{ background: tone.bg, color: tone.fg }}>{meta.ko}</span>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-sm truncate" style={{ color: COLORS.ink }}>{firstLine}</p>
          <p className="font-mono text-[10px] mt-1 tracking-wider" style={{ color: COLORS.muted }}>
            {row.channel} · {new Date(row.decided_at || row.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <ChevronRight size={17} strokeWidth={1.8}
          style={{ color: COLORS.muted, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3" style={{ borderTop: `1px solid ${COLORS.light}` }}>
          <p className="font-body text-sm leading-relaxed whitespace-pre-wrap" style={{ color: COLORS.stone }}>{row.body}</p>
          {row.error && <p className="font-body text-xs mt-2" style={{ color: '#DC3C3C' }}>{row.error}</p>}
        </div>
      )}
    </div>
  );
}

export function AdminAIOffice({ user }) {
  const [reports, setReports] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [filter, setFilter] = useState('all');
  // 지금 덮고 올라와 있는 창.
  // 다른 앱 잠깐 쓰고 돌아왔을 때 보던 자리로 돌아오게 기억해 둔다.
  // 오래된 건 쓰지 않는다 — 어제 열어둔 대화가 다시 뜨면 그것대로 이상하다.
  const [sheet, setSheet] = useState(() => {
    try {
      const raw = localStorage.getItem('hssup_ai_sheet');
      if (!raw) return null;
      const saved = JSON.parse(raw);
      if (Date.now() - (saved.ts || 0) > 6 * 60 * 60 * 1000) {
        localStorage.removeItem('hssup_ai_sheet');
        return null;
      }
      return saved.sheet || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (sheet) localStorage.setItem('hssup_ai_sheet', JSON.stringify({ sheet, ts: Date.now() }));
      else localStorage.removeItem('hssup_ai_sheet');
    } catch { /* 저장이 막혀 있어도 그냥 넘어간다 */ }
  }, [sheet]);

  const [loadedAt, setLoadedAt] = useState(0);
  const cardRefs = React.useRef({});

  useEffect(() => {
    (async () => {
      const [rep, app] = await Promise.all([
        supabase.from('ai_reports').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('ai_approvals').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      if (rep.error) {
        console.error('리포트 로드 에러:', rep.error);
        toast('리포트를 불러오지 못했어요: ' + rep.error.message);
      }
      if (app.error) console.error('승인 목록 로드 에러:', app.error);
      setReports(rep.data || []);
      setApprovals(app.data || []);
      setLoadedAt(Date.now());
      setLoading(false);
    })();
  }, []);

  // 편집자가 캡션이나 그림을 고치면 카드도 새로 읽어와야 한다.
  const refreshApprovals = React.useCallback(async () => {
    const { data } = await supabase
      .from('ai_approvals').select('*').order('created_at', { ascending: false }).limit(50);
    if (data) setApprovals(data);
  }, []);

  // 담당자가 피드백을 반영해 결과물을 다시 쓰면 화면도 새로 읽어와야 한다.
  const refreshReports = React.useCallback(async () => {
    const { data } = await supabase
      .from('ai_reports').select('*').order('created_at', { ascending: false }).limit(50);
    if (data) setReports(data);
  }, []);

  // 원장이 캡션을 고치면 자동화가 게시할 때 이 내용을 쓴다.
  const saveBody = async (row, body) => {
    const { error } = await supabase.from('ai_approvals').update({ body }).eq('id', row.id);
    if (error) {
      toast('저장하지 못했어요: ' + error.message);
      return false;
    }
    setApprovals(prev => prev.map(r => (r.id === row.id ? { ...r, body } : r)));
    toast('수정했어요');
    return true;
  };

  // 승인만 기록한다. 실제 게시는 자동화가 이 상태를 보고 처리한다.
  const decide = async (row, status) => {
    const decidedAt = new Date().toISOString();
    const { error } = await supabase
      .from('ai_approvals')
      .update({ status, decided_at: decidedAt, decided_by: user?.id || null })
      .eq('id', row.id);
    if (error) {
      toast('처리하지 못했어요: ' + error.message);
      return false;
    }
    setApprovals(prev => prev.map(r => (r.id === row.id ? { ...r, status, decided_at: decidedAt } : r)));
    toast(status === 'approved' ? '곧 게시됩니다' : '건너뛰었어요');
    return true;
  };

  // 긴 리포트를 접었다 펴면 위치가 튀어서, 펼친 카드를 화면 위로 끌어온다.
  const toggleReport = (id) => {
    const next = openId === id ? null : id;
    setOpenId(next);
    if (next) {
      requestAnimationFrame(() => {
        cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  // 오늘 날짜로 올라온 아침 보고. 있으면 맨 위에 띄운다.
  const todayBrief = (() => {
    const today = new Date().toDateString();
    return reports.find(r => r.kind === 'brief' && new Date(r.created_at).toDateString() === today);
  })();
  const todayIdeas = (() => {
    const today = new Date().toDateString();
    return reports.find(r => r.kind === 'ideas' && new Date(r.created_at).toDateString() === today);
  })();
  const briefSummary = (() => {
    if (!todayBrief) return '';
    const line = (todayBrief.body || '').split('\n')
      .map(l => l.replace(/^[-*#\s]+/, '').replace(/\*\*/g, '').trim())
      .filter(Boolean)
      .find(l => !l.startsWith('20') && l.length > 6);
    return line || '열어서 확인하세요';
  })();

  const awaiting = approvals.filter(r => r.status === 'awaiting');
  const decided = approvals.filter(r => r.status !== 'awaiting');

  const TABS = [
    { key: 'all', label: '전체' },
    { key: 'request', label: '요청 기획' },
    { key: 'plan', label: '콘텐츠 기획' },
    { key: 'feed', label: '피드 분석' },
    { key: 'staff', label: '직원 계정' },
    { key: 'meeting', label: '회의록' },
    { key: 'decided', label: '승인 완료' },
  ];

  // 종류를 섞어 한 줄로 세우고 최신순으로 정렬한다.
  // (승인 대기와 리포트를 따로 쌓아두면 뭐가 새로 온 건지 한눈에 안 보인다.)
  // 승인 대기는 맨 위 "시안 확인" 에서 보여주므로 여기서는 뺀다.
  const items = (() => {
    if (filter === 'decided') return decided.map(r => ({ type: 'decided', row: r }));
    if (['request', 'plan', 'feed', 'staff', 'meeting'].includes(filter)) {
      return reports.filter(r => r.kind === filter).map(r => ({ type: 'report', row: r }));
    }
    return reports
      .map(r => ({ type: 'report', row: r }))
      .sort((a, b) => new Date(b.row.created_at) - new Date(a.row.created_at));
  })();

  const fmtDate = (v) => new Date(v).toLocaleString('ko-KR', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const nothing = !loading && items.length === 0;

  return (
    <>
      <PageIntro ko="AI 오피스" en="AI Office" />
      <div className="px-5 pb-10">
        {loading ? (
          <p className="font-body text-sm py-10 text-center" style={{ color: COLORS.muted }}>불러오는 중…</p>
        ) : (
          <>
            {todayBrief && (
              <button onClick={() => setSheet({ kind: 'brief' })}
                className="w-full rounded-2xl p-4 mb-4 text-left flex items-start gap-3"
                style={{ background: COLORS.ink }}>
                <Bell size={16} strokeWidth={1.8} className="shrink-0 mt-0.5" style={{ color: COLORS.primary }} />
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-xs" style={{ color: COLORS.white }}>오늘 아침 보고</p>
                  <p className="font-body text-[11px] mt-1 line-clamp-2" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    {briefSummary}
                  </p>
                </div>
                <ChevronRight size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            )}

            {todayIdeas && (
              <button onClick={() => setSheet({ kind: 'ideas' })}
                className="w-full rounded-2xl p-4 mb-4 text-left flex items-start gap-3"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                <Sparkles size={16} strokeWidth={1.8} className="shrink-0 mt-0.5" style={{ color: COLORS.primary }} />
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-xs" style={{ color: COLORS.ink }}>
                    오늘 아이디어 {parseIdeas(todayIdeas.body).length}개
                  </p>
                  <p className="font-body text-[11px] mt-1 line-clamp-2" style={{ color: COLORS.muted }}>
                    {ideasGreeting(todayIdeas.body) || parseIdeas(todayIdeas.body).map(i => i.title).join(' / ')}
                  </p>
                </div>
                <ChevronRight size={15} style={{ color: COLORS.muted }} />
              </button>
            )}

            {/* 기다리는 시안 — 목록이 아니라 그림으로 보여준다 */}
            {awaiting.length > 0 ? (
              <div className="mb-4">
                <div className="flex items-baseline gap-2 mb-3">
                  <h2 className="font-display text-2xl tracking-tight" style={{ color: COLORS.ink }}>
                    시안 {awaiting.length}건
                  </h2>
                  <p className="font-body text-xs" style={{ color: COLORS.muted }}>확인해 주세요</p>
                </div>
                <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-2">
                  {awaiting.map(r => {
                    const imgs = Array.isArray(r.image_urls) ? r.image_urls : [];
                    const cover = imgs[0];
                    return (
                      <button key={r.id} onClick={() => setSheet({ kind: 'draft', id: r.id })}
                        className="shrink-0 rounded-2xl overflow-hidden text-left transition-transform active:scale-95"
                        style={{ width: 168, background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                        <div style={{ width: '100%', aspectRatio: '4 / 5', background: COLORS.cardElev, position: 'relative' }}>
                          {cover && (isVideoUrl(cover)
                            ? <video src={thumbSrc(cover)} muted playsInline preload="metadata"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <img src={cover} alt="" loading="lazy"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />)}
                          {imgs.length > 1 && (
                            <span className="absolute top-2 right-2 rounded-full px-2 py-0.5 font-mono text-[10px]"
                              style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>{imgs.length}</span>
                          )}
                        </div>
                        <p className="font-body text-xs leading-snug px-3 py-2.5 line-clamp-2"
                          style={{ color: COLORS.stone }}>
                          {(r.body || '').split('\n').find(l => l.trim()) || '내용 없음'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-5 mb-4 text-center"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                <p className="font-heading text-sm" style={{ color: COLORS.ink }}>확인할 시안이 없어요</p>
                <p className="font-body text-xs mt-1.5" style={{ color: COLORS.muted }}>
                  사진을 올리시면 게시물로 만들어 여기에 올려드립니다
                </p>
              </div>
            )}

            {/* 만들기 — 매일 누르는 두 가지만 크게 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={() => setSheet({ kind: 'upload' })}
                className="rounded-2xl p-5 text-left relative overflow-hidden transition-transform active:scale-95"
                style={{ background: COLORS.ink, minHeight: 148 }}>
                <div className="absolute -top-14 -right-14 w-28 h-28 rounded-full"
                  style={{ background: COLORS.primary }} />
                <div className="relative flex flex-col h-full" style={{ color: COLORS.white }}>
                  <Upload size={22} strokeWidth={1.8} style={{ color: COLORS.primary }} />
                  <p className="font-heading text-base mt-auto">소재 올리기</p>
                  <p className="font-body text-[11px] mt-1" style={{ opacity: 0.65 }}>사진·영상을 게시물로</p>
                </div>
              </button>

              <button onClick={() => setSheet({ kind: 'request' })}
                className="rounded-2xl p-5 text-left relative overflow-hidden transition-transform active:scale-95"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.light}`, minHeight: 148 }}>
                <div className="flex flex-col h-full">
                  <Sparkles size={22} strokeWidth={1.8} style={{ color: COLORS.primary }} />
                  <p className="font-heading text-base mt-auto" style={{ color: COLORS.ink }}>콘텐츠 요청</p>
                  <p className="font-body text-[11px] mt-1" style={{ color: COLORS.muted }}>아이디어만 있을 때</p>
                </div>
              </button>
            </div>

            {/* 나머지는 한 줄로 접어 둔다 */}
            <div className="flex gap-2">
              {/* 사업 상황 메모는 기획 담당이 매일 읽는다. 참고 안에 묻혀 있으면 적으러 가기 번거로워서 밖으로 꺼냈다. */}
              <button onClick={() => setSheet({ kind: 'memo' })}
                className="flex-1 rounded-xl px-3 py-3 flex items-center justify-between"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                <span className="font-heading text-xs" style={{ color: COLORS.ink }}>사업 메모</span>
                <Edit3 size={13} style={{ color: COLORS.primary }} />
              </button>
              <button onClick={() => setSheet({ kind: 'prompts' })}
                className="flex-1 rounded-xl px-3 py-3 flex items-center justify-between"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                <span className="font-heading text-xs" style={{ color: COLORS.ink }}>사진 보정</span>
                <Copy size={13} style={{ color: COLORS.primary }} />
              </button>
              <button onClick={() => setSheet({ kind: 'log' })}
                className="flex-1 rounded-xl px-3 py-3 flex items-center justify-between"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                <span className="font-heading text-xs" style={{ color: COLORS.ink }}>기록</span>
                <span className="font-mono text-[10px]" style={{ color: COLORS.muted }}>{reports.length + decided.length}</span>
              </button>
              <button onClick={() => setSheet({ kind: 'ref' })}
                className="flex-1 rounded-xl px-3 py-3 flex items-center justify-between"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                <span className="font-heading text-xs" style={{ color: COLORS.ink }}>참고</span>
                <ChevronRight size={14} style={{ color: COLORS.muted }} />
              </button>
            </div>
          </>
        )}

        {sheet?.kind === 'upload' && (
          <Sheet title="소재 올리기" onClose={() => setSheet(null)}>
            <MediaUpload userId={user?.id} approvals={approvals} bare prefill={sheet.prefill}
              onRefreshApprovals={refreshApprovals}
              onOpenDraft={(id) => setSheet({ kind: 'draft', id })} />
          </Sheet>
        )}

        {sheet?.kind === 'request' && (
          <Sheet title="콘텐츠 요청" onClose={() => setSheet(null)}>
            <ContentRequest userId={user?.id} bare />
          </Sheet>
        )}

        {sheet?.kind === 'draft' && (
          <Sheet title="시안 확인" onClose={() => setSheet(null)}>
            <p className="font-body text-xs mb-3" style={{ color: COLORS.muted }}>
              고칠 게 있으면 말로 적어 주세요.
              <strong style={{ color: COLORS.stone }}> 게시</strong>를 누르셔야 인스타에 올라갑니다.
            </p>
            <div className="space-y-2">
              {awaiting.map(r => (
                <ApprovalCard key={`s${r.id}`} row={r} onDecide={decide} onSaveBody={saveBody}
                  onRevised={refreshApprovals} defaultOpen={r.id === sheet.id} />
              ))}
            </div>
          </Sheet>
        )}

        {sheet?.kind === 'ideas' && todayIdeas && (
          <Sheet title={todayIdeas.title} onClose={() => setSheet(null)}>
            {ideasGreeting(todayIdeas.body) && (
              <div className="flex gap-2 mb-3">
                <Avatar user={{ name: '박서준', avatar_color: 'orange' }} size="xs" />
                <div className="rounded-2xl rounded-tl-md px-3.5 py-2.5 flex-1"
                  style={{ background: COLORS.peach, color: COLORS.ink }}>
                  <p className="font-heading text-[11px] mb-1" style={{ color: COLORS.primary }}>박서준 팀장</p>
                  <p className="font-body text-sm leading-relaxed whitespace-pre-wrap">{ideasGreeting(todayIdeas.body)}</p>
                </div>
              </div>
            )}
            <p className="font-body text-[11px] mb-3 leading-relaxed" style={{ color: COLORS.muted }}>
              사진 없이 되는 건 <strong style={{ color: COLORS.stone }}>이걸로 만들어줘</strong>, 찍어야 하는 건 <strong style={{ color: COLORS.stone }}>찍어서 올리기</strong>
            </p>
            <div className="space-y-3">
              {parseIdeas(todayIdeas.body).map((idea, i) => (
                <IdeaCard key={i} idea={idea} userId={user?.id}
                  onShoot={(it) => setSheet({ kind: 'upload', prefill: { channel: it.channel, caption: `${it.title}\n\n${it.request}` } })} />
              ))}
            </div>
          </Sheet>
        )}

        {sheet?.kind === 'brief' && todayBrief && (
          <Sheet title={todayBrief.title} onClose={() => setSheet(null)}>
            <div className="rounded-2xl p-4"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
              <ReportBody text={todayBrief.body} />
            </div>
          </Sheet>
        )}

        {sheet?.kind === 'prompts' && (
          <Sheet title="ChatGPT 사진 보정 요청문" onClose={() => setSheet(null)}>
            <ChatGptPrompts />
          </Sheet>
        )}

        {sheet?.kind === 'memo' && (
          <Sheet title="사업 상황 메모" onClose={() => setSheet(null)}>
            <p className="font-body text-xs mb-3 leading-relaxed" style={{ color: COLORS.muted }}>
              모집 시기, 이벤트, 이번 달 목표처럼 숫자로는 알 수 없는 사정을 적어 두세요.
              기획 담당이 매일 아침 아이디어와 주간 기획을 낼 때 읽어요.
            </p>
            <div className="rounded-2xl overflow-hidden"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
              <BusinessContext userId={user?.id} row bare />
            </div>
          </Sheet>
        )}

        {sheet?.kind === 'ref' && (
          <Sheet title="참고" onClose={() => setSheet(null)}>
            <div className="rounded-2xl overflow-hidden"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
              <StaffRoster data={{ reports, approvals }} onPick={() => {}} now={loadedAt} />
              <div style={{ height: 1, background: COLORS.light }} />
              <OfficeGuide row />
            </div>
          </Sheet>
        )}

        {sheet?.kind === 'log' && (
          <Sheet title="기록" onClose={() => setSheet(null)}>
        <div className="flex gap-2 mb-5 overflow-x-auto -mx-5 px-5 pb-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className="px-4 py-2 rounded-full font-heading text-xs whitespace-nowrap flex items-center gap-1.5"
              style={filter === t.key
                ? { background: COLORS.primary, color: COLORS.card }
                : { background: COLORS.card, color: COLORS.stone, border: `1px solid ${COLORS.light}` }}>
              {t.label}
              {t.count > 0 && (
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full"
                  style={filter === t.key
                    ? { background: 'rgba(255,255,255,0.25)' }
                    : { background: COLORS.primary, color: COLORS.card }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="font-body text-sm py-10 text-center" style={{ color: COLORS.muted }}>불러오는 중…</p>
        ) : nothing ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-heading text-sm" style={{ color: COLORS.ink }}>아직 아무것도 없습니다</p>
            <p className="font-body text-xs mt-2" style={{ color: COLORS.muted }}>
              자동화가 돌면 여기에 쌓입니다.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => {
              const r = item.row;
              if (item.type === 'approval') {
                return <ApprovalCard key={`a${r.id}`} row={r} onDecide={decide} onSaveBody={saveBody} onRevised={refreshApprovals} />;
              }
              if (item.type === 'decided') {
                return <DecidedCard key={`d${r.id}`} row={r} />;
              }
              const meta = REPORT_KINDS[r.kind] || { ko: r.kind, icon: BarChart3 };
              const Icon = meta.icon;
              const open = openId === r.id;
              return (
                // overflow-hidden 을 주면 안 된다. 안에 있는 대화 입력창의
                // position: sticky 가 조상의 overflow 때문에 동작하지 않는다.
                <div key={`r${r.id}`} ref={el => { cardRefs.current[r.id] = el; }}
                  className="rounded-2xl"
                  style={{ background: COLORS.card, border: `1px solid ${COLORS.light}`, scrollMarginTop: 16 }}>
                  <button onClick={() => toggleReport(r.id)}
                    className="w-full p-4 flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: COLORS.peach, border: `1px solid rgba(255,92,31,0.25)` }}>
                      <Icon size={17} strokeWidth={1.8} style={{ color: COLORS.primary }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-heading text-sm truncate" style={{ color: COLORS.ink }}>{r.title}</p>
                      <p className="font-mono text-[10px] mt-1 tracking-wider" style={{ color: COLORS.muted }}>
                        {meta.ko} · {fmtDate(r.created_at)}
                        {r.period_days ? ` · 최근 ${r.period_days}일` : ''}
                      </p>
                    </div>
                    <ChevronRight size={17} strokeWidth={1.8}
                      style={{ color: COLORS.muted, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>
                  {open && (
                    <ReportThread reportId={r.id} reportBody={r.body}
                      onStaffReplied={refreshReports}
                      onCollapse={() => toggleReport(r.id)} />
                  )}
                </div>
              );
            })}
          </div>
        )}
          </Sheet>
        )}
      </div>
    </>
  );
}
