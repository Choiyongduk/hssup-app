import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { COLORS } from '../lib/colors';
import { toast } from '../lib/toast';
import { confirmDialog } from '../lib/dialog';
import { MEDIACE, MEDIACE_LINKS, MEDIACE_STEPS, WASTE_GUIDE, WASTE_AMOUNTS, WASTE_STATUS } from '../lib/mediace';
import { PageIntro } from '../components/common';
import { Check, X, AlertCircle, Loader2, ExternalLink, ArrowUpRight, Phone } from 'lucide-react';

// =============================================================
// ♻️ MedicalWastePage - 의료폐기물 (제휴: 메디환경산업)
//   반영구 폐기물도 의료폐기물 기준으로 버려야 해서, 처리 기준 안내 + 수거 신청을 받는다.
//   guest: 로그인 안 한 사람(메디환경 담당자 등)에게 보여주는 소개 화면. 신청 폼 대신 로그인 안내.
// =============================================================
const EMPTY_WASTE_FORM = { shop_name: '', owner_name: '', phone: '', address: '', biz_no: '', waste_amount: '', note: '', agree_share: false };

// 회원 신청 + 운영진 직접 추가에서 같이 쓰는 폼 (운영진은 requireAgree=false: 전화로 동의받고 넣는다)
export function WasteShopForm({ initial, submitting, onSubmit, onCancel, submitLabel = '신청하기', requireAgree = true }) {
  const [form, setForm] = useState({ ...EMPTY_WASTE_FORM, ...(initial || {}) });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const inputStyle = { background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` };
  const field = (k, label, placeholder, props = {}) => (
    <label className="block mb-3">
      <span className="font-body text-xs font-bold" style={{ color: COLORS.stone }}>{label}</span>
      <input value={form[k] || ''} onChange={set(k)} placeholder={placeholder} {...props}
        className="w-full mt-1 rounded-xl px-3 py-3 font-body text-sm focus:outline-none" style={inputStyle} />
    </label>
  );

  const handleSubmit = () => {
    if (!form.shop_name.trim()) return toast('샵 이름을 입력해주세요');
    if (!form.owner_name.trim()) return toast('대표자 이름을 입력해주세요');
    if (!form.phone.trim()) return toast('연락처를 입력해주세요');
    if (!form.address.trim()) return toast('샵 주소를 입력해주세요');
    if (requireAgree && !form.agree_share) return toast('메디환경산업 정보 제공에 동의해주세요');
    onSubmit({
      shop_name: form.shop_name.trim(), owner_name: form.owner_name.trim(), phone: form.phone.trim(),
      address: form.address.trim(), biz_no: (form.biz_no || '').trim() || null, waste_amount: form.waste_amount || null,
      note: (form.note || '').trim() || null, agree_share: requireAgree ? form.agree_share : true,
    });
  };

  return (
    <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
      {field('shop_name', '샵 이름 *', '예) 히썹 브로우')}
      {field('owner_name', '대표자 이름 *', '사업자등록증의 대표자')}
      {field('phone', '연락처 *', '010-0000-0000', { type: 'tel', inputMode: 'tel' })}
      {field('address', '샵 주소 *', '수거하러 갈 주소 (동, 호수까지)')}
      {field('biz_no', '사업자등록번호', '000-00-00000 (모르면 비워두세요)', { inputMode: 'numeric' })}

      <span className="font-body text-xs font-bold" style={{ color: COLORS.stone }}>시술량</span>
      <div className="grid grid-cols-1 gap-2 mt-1 mb-3">
        {WASTE_AMOUNTS.map(a => {
          const on = form.waste_amount === a;
          return (
            <button key={a} type="button" onClick={() => setForm(f => ({ ...f, waste_amount: on ? '' : a }))}
              className="rounded-xl px-3 py-2.5 text-left font-body text-sm transition-all"
              style={{ background: on ? COLORS.peach : COLORS.cardElev, color: on ? COLORS.primary : COLORS.ink, border: `1px solid ${on ? COLORS.primary : COLORS.light}` }}>
              {a}
            </button>
          );
        })}
      </div>

      <label className="block mb-3">
        <span className="font-body text-xs font-bold" style={{ color: COLORS.stone }}>요청사항</span>
        <textarea value={form.note || ''} onChange={set('note')} rows={3}
          placeholder="연락받기 편한 시간, 이미 다른 업체와 계약 중인지 등"
          className="w-full mt-1 rounded-xl p-3 font-body text-sm focus:outline-none" style={inputStyle} />
      </label>

      {requireAgree && (
        <button type="button" onClick={() => setForm(f => ({ ...f, agree_share: !f.agree_share }))}
          className="w-full rounded-xl p-3 flex items-start gap-2 text-left transition-all"
          style={{ background: form.agree_share ? COLORS.peach : COLORS.cardElev, border: `1px solid ${form.agree_share ? COLORS.primary : COLORS.light}` }}>
          <div className="w-5 h-5 mt-0.5 shrink-0 rounded border-2 flex items-center justify-center"
            style={{ borderColor: form.agree_share ? COLORS.primary : COLORS.stone, background: form.agree_share ? COLORS.primary : 'transparent' }}>
            {form.agree_share && <Check size={12} style={{ color: COLORS.white }} />}
          </div>
          <span className="font-body text-xs leading-relaxed" style={{ color: COLORS.ink }}>
            <b>(필수)</b> 수거 계약 상담을 위해 위 정보(샵 이름, 대표자, 연락처, 주소, 사업자번호)를
            {' '}<b>{MEDIACE.name}</b>에 제공하는 것에 동의해요. 언제든 삭제를 요청할 수 있어요.
          </span>
        </button>
      )}

      <div className="flex gap-2 mt-4">
        {onCancel && (
          <button onClick={onCancel} className="flex-1 rounded-xl py-3 font-display text-sm font-bold transition-transform active:scale-95"
            style={{ background: COLORS.cardElev, color: COLORS.stone }}>취소</button>
        )}
        <button onClick={handleSubmit} disabled={submitting} className="flex-1 rounded-xl py-3 font-display text-sm font-bold transition-transform active:scale-95"
          style={{ background: COLORS.primary, color: COLORS.white, opacity: submitting ? 0.6 : 1 }}>
          {submitting ? '보내는 중...' : submitLabel}
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ en, ko }) {
  return (
    <div className="mt-8 mb-3">
      <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ {en}</p>
      <h2 className="font-display text-xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>{ko}</h2>
    </div>
  );
}

export function MedicalWastePage({ user, guest = false, onLogin }) {
  const [mine, setMine] = useState(null);
  const [loading, setLoading] = useState(!guest);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (guest || !user?.id) return;
    supabase.from('waste_shops').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('의료폐기물 신청 조회 에러:', error);
        setMine(data || null);
        setLoading(false);
      });
  }, [guest, user?.id]);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    const req = mine
      ? supabase.from('waste_shops').update({ ...values, updated_at: new Date().toISOString() }).eq('id', mine.id).select().single()
      : supabase.from('waste_shops').insert({ ...values, user_id: user.id, status: 'pending' }).select().single();
    const { data, error } = await req;
    setSubmitting(false);
    if (error) return toast('신청 실패: ' + error.message);
    setMine(data);
    setEditing(false);
    toast(mine ? '신청 내용을 고쳤어요' : '신청됐어요! 원장님이 메디환경산업에 전달할게요');
  };

  const handleCancel = async () => {
    if (!(await confirmDialog('수거 신청을 취소할까요?'))) return;
    const { error } = await supabase.from('waste_shops').delete().eq('id', mine.id);
    if (error) return toast('취소 실패: ' + error.message);
    setMine(null);
    toast('신청을 취소했어요');
  };

  const status = mine && (WASTE_STATUS[mine.status] || WASTE_STATUS.pending);

  return (
    <>
      <PageIntro ko="의료폐기물" en="Medical Waste" />

      <div className="px-5">
        {/* 제휴 배너 */}
        <div className="rounded-3xl p-5 relative overflow-hidden" style={{ background: COLORS.ink, color: COLORS.white }}>
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full" style={{ background: COLORS.primaryGlow, filter: 'blur(20px)' }} />
          <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase relative" style={{ color: COLORS.deep }}>Official Partner</p>
          <div className="flex items-center gap-2 mt-2 relative">
            <span className="font-display text-xl">HSSUP</span>
            <X size={14} style={{ opacity: 0.6 }} />
            <span className="font-display text-xl">{MEDIACE.name}</span>
          </div>
          <p className="font-body text-sm mt-3 leading-relaxed relative" style={{ opacity: 0.85 }}>
            히썹은 의료폐기물 수집 운반 전문업체 <b>{MEDIACE.name}</b>와 제휴했어요.
            반영구 샵의 의료폐기물 처리를 계약부터 수거까지 연결해 드려요.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-4 relative">
            {['계약 대행', '올바로 등록 대행', '전용 용기 안내', `${MEDIACE.area} 수거`].map(t => (
              <span key={t} className="font-body text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>{t}</span>
            ))}
          </div>
        </div>

        {/* 왜 해야 하나 */}
        <div className="rounded-2xl p-4 mt-4 flex gap-3" style={{ background: COLORS.peach, border: `1px solid ${COLORS.primary}` }}>
          <AlertCircle size={20} className="shrink-0 mt-0.5" style={{ color: COLORS.primary }} />
          <div>
            <p className="font-heading text-sm" style={{ color: COLORS.ink }}>반영구 폐기물도 이제 의료폐기물이에요</p>
            <p className="font-body text-xs mt-1 leading-relaxed" style={{ color: COLORS.stone }}>
              내년부터 반영구 시술에서 나온 니들, 솜, 거즈 등은 일반 쓰레기로 버리면 안 되고,
              의료폐기물 기준에 따라 전용 용기에 보관해 허가받은 업체에 맡겨야 해요.
              미리 계약해 두면 시행 직전에 몰려서 늦어지는 걸 피할 수 있어요.
            </p>
          </div>
        </div>

        {/* 신청 */}
        <SectionLabel en="Apply" ko="우리 샵 수거 신청" />
        {guest ? (
          <div className="rounded-2xl p-5 text-center" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-body text-sm leading-relaxed" style={{ color: COLORS.ink }}>
              히썹 회원은 앱에서 샵 정보만 남기면<br />원장님이 {MEDIACE.name}에 한 번에 전달해요.
            </p>
            <button onClick={onLogin} className="mt-4 rounded-full px-6 py-3 font-heading text-sm transition-transform active:scale-95"
              style={{ background: COLORS.primary, color: COLORS.white }}>
              히썹 로그인하고 신청하기
            </button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} /></div>
        ) : mine && !editing ? (
          <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold tracking-widest px-2 py-1 rounded"
                style={{ background: mine.status === 'hold' ? COLORS.cardElev : COLORS.peach, color: mine.status === 'hold' ? COLORS.stone : COLORS.primary }}>
                {mine.status === 'contracted' ? '✓ ' : ''}{status.label}
              </span>
              <span className="font-mono text-[10px]" style={{ color: COLORS.muted }}>{new Date(mine.created_at).toLocaleDateString('ko-KR')} 신청</span>
            </div>
            <p className="font-heading text-base mt-3" style={{ color: COLORS.ink }}>{mine.shop_name}</p>
            <p className="font-body text-xs mt-1" style={{ color: COLORS.stone }}>{mine.owner_name} / {mine.phone}</p>
            <p className="font-body text-xs mt-0.5" style={{ color: COLORS.stone }}>{mine.address}</p>
            <p className="font-body text-xs mt-3 p-3 rounded-xl" style={{ background: COLORS.cardElev, color: COLORS.ink }}>{status.desc}</p>
            {mine.status === 'pending' && (
              <div className="flex gap-2 mt-3">
                <button onClick={handleCancel} className="flex-1 rounded-xl py-2.5 font-heading text-xs" style={{ background: COLORS.cardElev, color: COLORS.stone }}>신청 취소</button>
                <button onClick={() => setEditing(true)} className="flex-1 rounded-xl py-2.5 font-heading text-xs" style={{ background: COLORS.ink, color: COLORS.white }}>내용 고치기</button>
              </div>
            )}
          </div>
        ) : (
          <WasteShopForm initial={mine || { owner_name: user?.name || '', phone: user?.phone || '' }}
            submitting={submitting} onSubmit={handleSubmit} submitLabel={mine ? '고친 내용 저장' : '신청하기'}
            onCancel={editing ? () => setEditing(false) : null} />
        )}

        {/* 분리 기준 */}
        <SectionLabel en="How to sort" ko="반영구 샵 폐기물, 이렇게 나눠요" />
        <div className="space-y-2">
          {WASTE_GUIDE.map(g => (
            <div key={g.kind} className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-heading text-sm" style={{ color: COLORS.ink }}>{g.kind}</p>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ background: COLORS.primary, color: COLORS.white }}>최대 {g.days}일 보관</span>
              </div>
              <p className="font-body text-xs mt-1.5" style={{ color: COLORS.stone }}>{g.items}</p>
              <p className="font-body text-xs mt-2" style={{ color: COLORS.ink }}>
                <span style={{ color: '#E0B000' }}>●</span> {g.box}, 도형 {g.color}
              </p>
            </div>
          ))}
        </div>
        <ul className="mt-3 rounded-2xl p-4 space-y-1.5 font-body text-xs" style={{ background: COLORS.cardElev, color: COLORS.ink }}>
          <li>시술이 끝난 그때부터 종류별로 전용 용기에 바로 넣어요</li>
          <li>용기에 <b>사용 시작한 날짜</b>를 꼭 적어요 (안 적으면 위반이에요)</li>
          <li>다 쓴 용기는 안쪽 주머니를 묶고 뚜껑을 닫아요. <b>재사용 금지</b></li>
          <li>정확한 분류는 {MEDIACE.name} 담당자 안내를 따라주세요</li>
        </ul>

        {/* 계약 절차 */}
        <SectionLabel en="Process" ko="신청하면 이렇게 진행돼요" />
        <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          {MEDIACE_STEPS.map((s, i) => (
            <div key={s.title} className="flex gap-3 py-2">
              <div className="flex flex-col items-center">
                <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold"
                  style={{ background: i === MEDIACE_STEPS.length - 1 ? COLORS.primary : COLORS.ink, color: COLORS.white }}>{i + 1}</span>
                {i < MEDIACE_STEPS.length - 1 && <span className="w-px flex-1 mt-1" style={{ background: COLORS.border }} />}
              </div>
              <div className="pb-1">
                <p className="font-heading text-sm" style={{ color: COLORS.ink }}>{s.title}</p>
                <p className="font-body text-xs mt-0.5" style={{ color: COLORS.stone }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 메디환경 바로가기 */}
        <SectionLabel en="Partner" ko={MEDIACE.name} />
        <div className="rounded-2xl p-4 mb-6" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <div className="grid grid-cols-2 gap-2">
            <a href={`tel:${MEDIACE.tel}`} className="rounded-xl py-3 flex items-center justify-center gap-1.5 font-heading text-sm"
              style={{ background: COLORS.primary, color: COLORS.white }}><Phone size={14} /> 전화 상담</a>
            <a href={MEDIACE.site} target="_blank" rel="noopener noreferrer" className="rounded-xl py-3 flex items-center justify-center gap-1.5 font-heading text-sm"
              style={{ background: COLORS.ink, color: COLORS.white }}>홈페이지 <ExternalLink size={13} /></a>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {MEDIACE_LINKS.map(l => (
              <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
                className="font-body text-xs px-3 py-1.5 rounded-full flex items-center gap-1"
                style={{ background: COLORS.cardElev, color: COLORS.ink }}>
                {l.label} <ArrowUpRight size={11} />
              </a>
            ))}
          </div>
          <div className="mt-4 pt-3 space-y-1 font-body text-[11px]" style={{ borderTop: `1px solid ${COLORS.light}`, color: COLORS.stone }}>
            <p>Tel {MEDIACE.tel} ({MEDIACE.telHours}) / Fax {MEDIACE.fax}</p>
            <p>{MEDIACE.email}</p>
            <p>{MEDIACE.address} / 대표 {MEDIACE.ceo}</p>
            <p>담당 지역: {MEDIACE.area} (다른 지역도 신청하면 확인 후 안내드려요)</p>
          </div>
        </div>
      </div>
    </>
  );
}

// =============================================================
// ♻️ AdminWasteShops - 의료폐기물 수거 신청 관리 (원장님, 운영진)
//   목록 확인 → 상태 변경 → 엑셀(CSV)로 내려받아 메디환경산업에 전달
// =============================================================
const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

export function AdminWasteShops() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [memos, setMemos] = useState({});

  useEffect(() => {
    supabase.from('waste_shops').select('*').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) toast('신청 목록을 불러오지 못했어요: ' + error.message);
        setItems(data || []);
        setLoading(false);
      });
  }, []);

  const shown = filter === 'all' ? items : items.filter(i => i.status === filter);
  const count = (s) => items.filter(i => i.status === s).length;

  const updateRow = async (id, patch, msg) => {
    const { error } = await supabase.from('waste_shops').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return toast('저장 실패: ' + error.message);
    setItems(list => list.map(i => (i.id === id ? { ...i, ...patch } : i)));
    if (msg) toast(msg);
  };

  const handleAdd = async (values) => {
    setSubmitting(true);
    const { data, error } = await supabase.from('waste_shops').insert({ ...values, status: 'pending' }).select().single();
    setSubmitting(false);
    if (error) return toast('추가 실패: ' + error.message);
    setItems(list => [data, ...list]);
    setAdding(false);
    toast('샵을 추가했어요');
  };

  const handleDelete = async (item) => {
    if (!(await confirmDialog(`'${item.shop_name}' 신청을 삭제할까요?`))) return;
    const { error } = await supabase.from('waste_shops').delete().eq('id', item.id);
    if (error) return toast('삭제 실패: ' + error.message);
    setItems(list => list.filter(i => i.id !== item.id));
  };

  // 엑셀에서 한글이 안 깨지게 BOM 을 붙인다
  const downloadCsv = () => {
    if (shown.length === 0) return toast('내려받을 샵이 없어요');
    const head = ['번호', '샵 이름', '대표자', '연락처', '주소', '사업자등록번호', '시술량', '요청사항', '신청일', '상태'];
    const rows = shown.map((i, n) => [
      n + 1, i.shop_name, i.owner_name, i.phone, i.address, i.biz_no, i.waste_amount, i.note,
      new Date(i.created_at).toLocaleDateString('ko-KR'), (WASTE_STATUS[i.status] || {}).label,
    ]);
    const csv = '﻿' + [head, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `메디환경_반영구샵_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const markPendingSent = async () => {
    const ids = items.filter(i => i.status === 'pending').map(i => i.id);
    if (ids.length === 0) return toast('접수 상태인 샵이 없어요');
    if (!(await confirmDialog(`접수 ${ids.length}곳을 '메디환경 전달'로 바꿀까요?`))) return;
    const { error } = await supabase.from('waste_shops').update({ status: 'sent', updated_at: new Date().toISOString() }).in('id', ids);
    if (error) return toast('변경 실패: ' + error.message);
    setItems(list => list.map(i => (ids.includes(i.id) ? { ...i, status: 'sent' } : i)));
    toast(`${ids.length}곳을 전달 완료로 표시했어요`);
  };

  const FILTERS = [['all', '전체', items.length], ...Object.entries(WASTE_STATUS).map(([k, v]) => [k, v.label, count(k)])];

  return (
    <>
      <PageIntro ko="의료폐기물 신청" en="Medical Waste" />
      <div className="px-5">
        <div className="grid grid-cols-3 gap-2">
          {[['전체 샵', items.length], ['전달 대기', count('pending')], ['계약 완료', count('contracted')]].map(([l, n]) => (
            <div key={l} className="rounded-2xl p-3 text-center" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
              <p className="font-display text-2xl" style={{ color: COLORS.ink }}>{n}</p>
              <p className="font-body text-[11px]" style={{ color: COLORS.stone }}>{l}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <button onClick={downloadCsv} className="rounded-xl py-3 font-heading text-xs" style={{ background: COLORS.ink, color: COLORS.white }}>
            엑셀(CSV) 내려받기
          </button>
          <button onClick={markPendingSent} className="rounded-xl py-3 font-heading text-xs" style={{ background: COLORS.cardElev, color: COLORS.ink }}>
            접수 → 전달 완료로
          </button>
        </div>
        <p className="font-body text-[11px] mt-2" style={{ color: COLORS.muted }}>
          지금 보고 있는 목록이 그대로 내려받아져요. 메일({MEDIACE.email})이나 팩스로 보내면 돼요.
        </p>

        {adding ? (
          <div className="mt-4">
            <WasteShopForm requireAgree={false} submitting={submitting} onSubmit={handleAdd} onCancel={() => setAdding(false)} submitLabel="추가하기" />
            <p className="font-body text-[11px] mt-2" style={{ color: COLORS.muted }}>전화로 받은 샵은 메디환경 정보 제공 동의를 받은 뒤 넣어주세요.</p>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="w-full mt-4 rounded-2xl py-3.5 font-display text-sm font-bold transition-transform active:scale-95"
            style={{ background: COLORS.primary, color: COLORS.white }}>
            + 샵 직접 추가
          </button>
        )}

        <div className="flex gap-1.5 mt-5 overflow-x-auto scrollbar-hide">
          {FILTERS.map(([k, l, n]) => (
            <button key={k} onClick={() => setFilter(k)} className="shrink-0 rounded-full px-3 py-1.5 font-heading text-xs"
              style={{ background: filter === k ? COLORS.primary : COLORS.cardElev, color: filter === k ? COLORS.white : COLORS.ink }}>
              {l} {n}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} /></div>
        ) : shown.length === 0 ? (
          <p className="text-center font-body text-sm py-10" style={{ color: COLORS.stone }}>아직 신청한 샵이 없어요</p>
        ) : (
          <div className="space-y-2 mt-3">
            {shown.map(i => {
              const open = openId === i.id;
              return (
                <div key={i.id} className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                  <button onClick={() => setOpenId(open ? null : i.id)} className="w-full text-left">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-heading text-sm truncate" style={{ color: COLORS.ink }}>{i.shop_name}</p>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
                        style={{ background: i.status === 'pending' ? COLORS.peach : COLORS.cardElev, color: i.status === 'pending' ? COLORS.primary : COLORS.stone }}>
                        {(WASTE_STATUS[i.status] || {}).label}
                      </span>
                    </div>
                    <p className="font-body text-xs mt-1" style={{ color: COLORS.stone }}>{i.owner_name} / {i.phone}{!i.user_id && ' / 직접 추가'}</p>
                    <p className="font-body text-xs mt-0.5 truncate" style={{ color: COLORS.stone }}>{i.address}</p>
                  </button>
                  {open && (
                    <div className="mt-3 pt-3 space-y-2" style={{ borderTop: `1px solid ${COLORS.light}` }}>
                      <div className="font-body text-xs space-y-0.5" style={{ color: COLORS.ink }}>
                        {i.biz_no && <p>사업자번호 {i.biz_no}</p>}
                        {i.waste_amount && <p>시술량 {i.waste_amount}</p>}
                        {i.note && <p>요청 {i.note}</p>}
                        <p style={{ color: COLORS.muted }}>{new Date(i.created_at).toLocaleString('ko-KR')} 신청</p>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {Object.entries(WASTE_STATUS).map(([k, v]) => (
                          <button key={k} onClick={() => updateRow(i.id, { status: k })} className="rounded-lg py-2 font-heading text-[11px]"
                            style={{ background: i.status === k ? COLORS.ink : COLORS.cardElev, color: i.status === k ? COLORS.white : COLORS.ink }}>
                            {v.label}
                          </button>
                        ))}
                      </div>
                      <textarea value={memos[i.id] ?? i.admin_memo ?? ''} onChange={(e) => setMemos(m => ({ ...m, [i.id]: e.target.value }))}
                        rows={2} placeholder="운영진 메모 (회원 화면에는 안 나와요)"
                        className="w-full rounded-xl p-3 font-body text-xs focus:outline-none"
                        style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
                      <div className="flex gap-2">
                        <a href={`tel:${i.phone}`} className="flex-1 rounded-xl py-2.5 text-center font-heading text-xs" style={{ background: COLORS.cardElev, color: COLORS.ink }}>전화</a>
                        <button onClick={() => handleDelete(i)} className="flex-1 rounded-xl py-2.5 font-heading text-xs" style={{ background: COLORS.cardElev, color: '#FF4444' }}>삭제</button>
                        <button onClick={() => updateRow(i.id, { admin_memo: (memos[i.id] ?? i.admin_memo ?? '').trim() || null }, '메모를 저장했어요')}
                          className="flex-1 rounded-xl py-2.5 font-heading text-xs" style={{ background: COLORS.primary, color: COLORS.white }}>메모 저장</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
