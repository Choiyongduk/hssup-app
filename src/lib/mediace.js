// ♻️ 제휴 의료폐기물 업체 — 메디환경산업 (mediace.co.kr)
//   그쪽 홈페이지는 API 가 없어서, 연동 = 해당 페이지 바로가기 + 앱에서 모은 샵 목록 전달.

const SITE = 'http://www.mediace.co.kr';

export const MEDIACE = {
  name: '메디환경산업',
  ceo: '하경승',
  tel: '031-217-2400',
  telHours: '평일 10:00 - 17:00',
  fax: '031-227-2401',
  email: 'medi2401@naver.com',
  address: '경기도 화성시 매송면 매송북길 21',
  area: '충청권',
  site: SITE,
};

export const MEDIACE_LINKS = [
  { label: '계약 절차', url: SITE + '/cust/?p_url=cust_1' },
  { label: '보관 및 처리 기준', url: SITE + '/law/?p_url=law_2' },
  { label: '위반 사례', url: SITE + '/law/?p_url=law_3' },
  { label: '전용 용기', url: SITE + '/tag/?p_url=tag_2' },
  { label: '관리대장 출력방법', url: SITE + '/cust/?p_url=cust_3' },
  { label: '올바로시스템', url: 'https://www.allbaro.or.kr' },
];

// 메디환경 '계약절차' 페이지 기준
export const MEDIACE_STEPS = [
  { title: '전화 상담', desc: '사업자등록증 전달, 폐기물 종류와 양 확인' },
  { title: '담당 직원 방문', desc: '위탁 계약서 작성, 보관 표지판 부착, 보관 방법 안내' },
  { title: '처리계획 접수 대행', desc: '관계기관 접수 (1~2주 정도 걸려요)' },
  { title: '확인증명서 발송', desc: '의료폐기물 처리계획 확인증명서' },
  { title: '올바로 등록 대행', desc: '의료폐기물 관리시스템 아이디 생성' },
  { title: '수거 시작', desc: '배출자 인증카드, 회원 가입증 전달' },
];

// 반영구 샵에서 나오는 폐기물 (메디환경 '보관 & 처리기준' 표 기준)
export const WASTE_GUIDE = [
  {
    kind: '손상성 폐기물', code: '10-12-03',
    items: '니들, 카트리지, 면도날, 란셋 등 찔리거나 베일 수 있는 것',
    box: '합성수지 상자형 용기', color: '노란색', days: 30,
  },
  {
    kind: '혈액오염 폐기물', code: '10-12-05',
    items: '피나 진물이 묻은 솜, 거즈, 면봉, 장갑, 랩',
    box: '봉투형(검정) 또는 골판지 상자형', color: '노란색', days: 15,
  },
  {
    kind: '일반의료폐기물', code: '10-12-05',
    items: '시술에 쓴 일회용 장갑, 마스크, 패드 등',
    box: '봉투형(검정) 또는 골판지 상자형', color: '노란색', days: 15,
  },
];

export const WASTE_AMOUNTS = ['적음 (주 1~2명 시술)', '보통 (하루 1~3명)', '많음 (하루 4명 이상)'];

export const WASTE_STATUS = {
  pending:    { label: '접수 완료',      desc: '원장님이 확인하고 메디환경산업에 전달할 거예요' },
  sent:       { label: '메디환경 전달',  desc: '메디환경산업 담당자가 연락드릴 거예요' },
  contracted: { label: '계약 완료',      desc: '수거 일정은 메디환경산업과 맞춰주세요' },
  hold:       { label: '보류',          desc: '자세한 내용은 원장님께 문의해주세요' },
};
