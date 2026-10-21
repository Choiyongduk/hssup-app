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
  pending:    { label: '접수 완료' },
  sent:       { label: '메디환경 전달' },
  contracted: { label: '계약 완료' },
  hold:       { label: '보류' },
};

// 회원 화면 문구 (사무적인 말투, ~다/~습니다). tips 의 **굵게** 는 화면에서 <b> 로 바뀐다.
export const WASTE_COPY = {
  bannerBody: '히썹아카데미는 의료폐기물 수집 운반 전문업체 메디환경산업과 제휴를 맺었습니다.\n반영구 샵의 의료폐기물 처리를 계약부터 수거까지 연결해 드립니다.',
  alertTitle: '반영구 시술 폐기물이 의료폐기물로 지정됩니다',
  alertBody: '내년부터 반영구 시술 과정에서 나오는 니들, 솜, 거즈 등은 일반 폐기물로 버릴 수 없습니다. 의료폐기물 기준에 따라 전용 용기에 보관한 뒤 허가받은 업체에 맡겨 처리해야 합니다. 시행 직전에는 신청이 몰릴 수 있으니 미리 계약하시기를 권장합니다.',
  guest: '히썹 회원은 샵 정보를 등록하시면\n아카데미에서 메디환경산업에 일괄 전달합니다.',
  sortTitle: '반영구 샵 폐기물 분류 기준',
  processTitle: '진행 절차',
  tips: [
    '시술이 끝나면 즉시 종류별 전용 용기에 넣어 보관합니다',
    '용기에 **사용 시작 날짜**를 반드시 적습니다 (적지 않으면 위반입니다)',
    '사용이 끝난 용기는 안쪽 봉투를 밀봉하고 뚜껑을 닫습니다. **재사용은 금지됩니다**',
    '정확한 분류는 메디환경산업 담당자의 안내를 따릅니다',
  ],
  areaNote: '그 외 지역은 신청하시면 확인 후 안내드립니다',
  agreeMissing: '정보 제공 동의에 체크해 주십시오',
  submitted: '신청이 접수되었습니다',
  edited: '수정되었습니다',
  cancelAsk: '수거 신청을 취소하시겠습니까?',
  cancelled: '신청이 취소되었습니다',
  status: {
    pending: '신청이 접수되었습니다. 확인 후 메디환경산업에 전달합니다.',
    sent: '메디환경산업에 전달되었습니다. 담당자가 연락드릴 예정입니다.',
    contracted: '계약이 완료되었습니다. 수거 일정은 메디환경산업과 협의해 주십시오.',
    hold: '자세한 사항은 아카데미로 문의해 주십시오.',
  },
};
