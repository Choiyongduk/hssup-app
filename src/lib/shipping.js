// 택배 배송 조회 — 운영진이 적은 택배사 이름으로 조회 주소를 만든다

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
