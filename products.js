/*
 * 상품 데이터
 * ------------------------------------------------------------
 * - coupangUrl: 쿠팡 파트너스에서 발급받은 단축 링크(https://link.coupang.com/a/xxxx)로 교체하세요.
 *   지금 들어 있는 검색 링크는 수수료가 적립되지 않는 임시 링크입니다.
 * - origin: 제조국 표기. 게시 전 상품 상세페이지의 "제조국/원산지"를 직접 확인하세요.
 *   (같은 브랜드라도 모델·시기에 따라 해외 생산인 경우가 있습니다.)
 * - verified: 원산지를 직접 확인했으면 true → 카드에 "원산지 확인" 배지가 붙습니다.
 * - image: 상품 이미지 URL(쿠팡 파트너스 상품 이미지 등). 비워두면 이모지 썸네일이 표시됩니다.
 */
window.CATEGORIES = [
  { id: "all", name: "전체", emoji: "🇰🇷" },
  { id: "food", name: "식품", emoji: "🍚" },
  { id: "kitchen", name: "주방", emoji: "🍳" },
  { id: "living", name: "생활용품", emoji: "🧺" },
  { id: "beauty", name: "뷰티", emoji: "🧴" },
  { id: "health", name: "건강", emoji: "💪" },
  { id: "stationery", name: "문구", emoji: "✏️" },
];

const q = (s) => "https://www.coupang.com/np/search?q=" + encodeURIComponent(s);

window.PRODUCTS = [
  { id: 1, name: "신라면 멀티팩", brand: "농심", category: "food", emoji: "🍜", origin: "대한민국", verified: false, pick: true,
    desc: "얼큰한 국물의 대표 라면. 자취·캠핑 필수템.", tags: ["라면", "간편식"], coupangUrl: q("농심 신라면 멀티팩") },
  { id: 2, name: "불닭볶음면 멀티팩", brand: "삼양", category: "food", emoji: "🔥", origin: "대한민국", verified: false, pick: true,
    desc: "매운맛 마니아를 위한 볶음면.", tags: ["라면", "매운맛"], coupangUrl: q("삼양 불닭볶음면 멀티팩") },
  { id: 3, name: "맥심 모카골드 커피믹스", brand: "동서", category: "food", emoji: "☕", origin: "대한민국", verified: false,
    desc: "사무실 탕비실 단골 커피믹스.", tags: ["커피", "믹스커피"], coupangUrl: q("맥심 모카골드 커피믹스") },
  { id: 4, name: "홍삼정 에브리타임", brand: "정관장", category: "health", emoji: "🌿", origin: "대한민국", verified: false, pick: true,
    desc: "스틱형으로 간편하게 챙기는 홍삼.", tags: ["홍삼", "선물"], coupangUrl: q("정관장 홍삼정 에브리타임") },
  { id: 5, name: "IH 전기압력밥솥 6인용", brand: "쿠쿠", category: "kitchen", emoji: "🍚", origin: "대한민국", verified: false, pick: true,
    desc: "찰진 밥맛의 IH 압력밥솥.", tags: ["밥솥", "가전"], coupangUrl: q("쿠쿠 IH 전기압력밥솥 6인용") },
  { id: 6, name: "스텐 압력솥", brand: "풍년", category: "kitchen", emoji: "🥘", origin: "대한민국", verified: false,
    desc: "오래 쓰는 스테인리스 압력솥.", tags: ["압력솥", "냄비"], coupangUrl: q("풍년 스텐 압력솥") },
  { id: 7, name: "크린랩 위생백·랩 세트", brand: "크린랲", category: "kitchen", emoji: "🧻", origin: "대한민국", verified: false,
    desc: "주방 소모품 한 번에 장만.", tags: ["랩", "위생백"], coupangUrl: q("크린랲 크린랩") },
  { id: 8, name: "유한락스 레귤러", brand: "유한크로락스", category: "living", emoji: "🧴", origin: "대한민국", verified: false,
    desc: "욕실·주방 살균 표백제.", tags: ["세제", "청소"], coupangUrl: q("유한락스 레귤러") },
  { id: 9, name: "무궁화 빨래비누", brand: "무궁화", category: "living", emoji: "🧼", origin: "대한민국", verified: false,
    desc: "찌든 때 손빨래용 비누.", tags: ["비누", "세탁"], coupangUrl: q("무궁화 빨래비누") },
  { id: 10, name: "자양윤모 샴푸", brand: "려", category: "beauty", emoji: "💆", origin: "대한민국", verified: false,
    desc: "한방 성분 탈모증상 완화 샴푸.", tags: ["샴푸", "헤어"], coupangUrl: q("려 자양윤모 샴푸") },
  { id: 11, name: "독도 토너", brand: "라운드랩", category: "beauty", emoji: "💧", origin: "대한민국", verified: false, pick: true,
    desc: "순한 데일리 각질 케어 토너.", tags: ["토너", "스킨케어"], coupangUrl: q("라운드랩 독도 토너") },
  { id: 12, name: "153 볼펜 세트", brand: "모나미", category: "stationery", emoji: "🖊️", origin: "대한민국", verified: false,
    desc: "60년 넘게 쓰인 국민 볼펜.", tags: ["볼펜", "필기구"], coupangUrl: q("모나미 153 볼펜") },
  { id: 13, name: "종가 포기김치", brand: "종가", category: "food", emoji: "🥬", origin: "대한민국", verified: false,
    desc: "국산 배추·고춧가루로 담근 포기김치.", tags: ["김치", "반찬"], coupangUrl: q("종가 포기김치") },
  { id: 14, name: "비비고 왕교자", brand: "CJ제일제당", category: "food", emoji: "🥟", origin: "대한민국", verified: false,
    desc: "냉동실 상비 만두.", tags: ["만두", "냉동"], coupangUrl: q("비비고 왕교자") },
  { id: 15, name: "고려은단 비타민C 1000", brand: "고려은단", category: "health", emoji: "🍋", origin: "대한민국", verified: false,
    desc: "하루 한 알 비타민C.", tags: ["비타민", "영양제"], coupangUrl: q("고려은단 비타민C 1000") },
  { id: 16, name: "온수매트", brand: "경동나비엔", category: "living", emoji: "🛏️", origin: "대한민국", verified: false,
    desc: "겨울철 따뜻한 숙면용 온수매트.", tags: ["매트", "겨울"], coupangUrl: q("경동나비엔 온수매트") },
];
