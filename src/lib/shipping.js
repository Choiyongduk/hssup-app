// 택배 배송 조회 — 운영진이 적은 택배사 이름으로 조회 주소를 만든다

// 배송비 — 서버(supabase/functions/nicepay-return)에도 같은 숫자가 있으니 바꿀 때 둘 다 바꿔야 결제가 된다
export const SHIPPING_FEE = 3000;
export const FREE_SHIPPING_MIN = 30000;

// 재료 주문 배송비: 샵 수령은 무료, 택배는 상품 합계가 FREE_SHIPPING_MIN 이상이면 무료
export function shippingFeeFor(subtotal, fulfillment) {
  if (fulfillment === 'pickup') return 0;
  return Number(subtotal || 0) >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE;
}

// 발송 처리 화면에서 한 번에 고르는 택배사 (이름을 통일해야 조회 링크가 정확히 걸린다)
export const CARRIER_PRESETS = ['CJ대한통운', '한진택배', '롯데택배', '우체국택배', '로젠택배'];

const CARRIERS = [
  { match: /cj|대한통운|씨제이/i, url: (n) => `https://trace.cjlogistics.com/next/tracking.html?wblNo=${n}` },
  { match: /한진|hanjin/i, url: (n) => `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=${n}` },
  { match: /롯데|lotte/i, url: (n) => `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${n}` },
  { match: /우체국|우편|epost/i, url: (n) => `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${n}&displayHeader=N` },
  { match: /로젠|logen/i, url: (n) => `https://www.ilogen.com/web/personal/trace/${n}` },
];

// 운송장 번호에서 숫자만 (하이픈, 띄어쓰기를 넣어 적는 경우가 많다)
export const cleanTrackingNumber = (number) => String(number || '').replace(/[^0-9a-zA-Z]/g, '');

// 배송 조회 주소. 아는 택배사면 그 회사 조회 화면, 모르면 네이버 검색(택배 조회 상자가 뜬다).
export function trackingUrl(company, number) {
  const no = cleanTrackingNumber(number);
  if (!no) return null;
  const carrier = CARRIERS.find((c) => c.match.test(company || ''));
  if (carrier) return carrier.url(encodeURIComponent(no));
  const query = `${(company || '택배').trim()} ${no} 배송조회`;
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`;
}
