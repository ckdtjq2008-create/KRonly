/*
 * 분류 기준과 카테고리
 * ------------------------------------------------------------
 * 식품: 원재료 원산지가 전부 한국인 제품만 노출
 * 생활용품: 제조국이 한국인 제품만 노출
 *
 * 카테고리를 추가하려면 아래 목록에 한 줄 넣으세요.
 * aliases: 시트에 이 이름으로 적어도 같은 카테고리로 인식
 */
window.GROUPS = {
  food: { name: "식품", rule: "원재료 100% 국산", emoji: "🍚", desc: "원재료 원산지가 모두 한국인 식품만 모았어요" },
  living: { name: "생활용품", rule: "국내 제조", emoji: "🧺", desc: "대한민국에서 만든 생활용품만 모았어요" },
};

window.CATEGORIES = [
  // 식품
  { id: "frozen", group: "food", name: "간편식·냉동", emoji: "🥟", aliases: ["간편식", "냉동", "냉동식품", "즉석식품", "만두"] },
  { id: "side", group: "food", name: "김치·반찬", emoji: "🥬", aliases: ["김치", "반찬", "두부"] },
  { id: "sauce", group: "food", name: "장·양념", emoji: "🫙", aliases: ["장", "양념", "소스", "조미료", "장류"] },
  { id: "grain", group: "food", name: "쌀·잡곡", emoji: "🌾", aliases: ["쌀", "잡곡", "곡물"] },
  { id: "produce", group: "food", name: "과일·채소", emoji: "🍎", aliases: ["과일", "채소", "견과", "농산물"] },
  { id: "meat", group: "food", name: "정육·계란", emoji: "🥩", aliases: ["정육", "고기", "계란", "육류"] },
  { id: "sea", group: "food", name: "수산·건어물", emoji: "🐟", aliases: ["수산", "건어물", "해산물", "김"] },
  { id: "snack", group: "food", name: "과자·간식", emoji: "🍪", aliases: ["과자", "간식", "디저트"] },
  { id: "drink", group: "food", name: "음료·차", emoji: "🥛", aliases: ["음료", "차", "커피", "유제품", "우유"] },
  { id: "baby", group: "food", name: "유아식", emoji: "🍼", aliases: ["아기", "이유식", "유아"] },
  { id: "healthfood", group: "food", name: "건강식품", emoji: "🌿", aliases: ["건강", "홍삼", "건강기능식품"] },
  // 생활용품
  { id: "kitchen", group: "living", name: "주방용품", emoji: "🍳", aliases: ["주방", "조리도구", "식기"] },
  { id: "clean", group: "living", name: "세제·청소", emoji: "🧽", aliases: ["세제", "청소", "세탁"] },
  { id: "bath", group: "living", name: "욕실·위생", emoji: "🧻", aliases: ["욕실", "위생", "화장지"] },
  { id: "beauty", group: "living", name: "뷰티·바디", emoji: "🧴", aliases: ["뷰티", "화장품", "바디", "샴푸", "헤어"] },
  { id: "stationery", group: "living", name: "문구·사무", emoji: "✏️", aliases: ["문구", "사무", "필기구"] },
  { id: "appliance", group: "living", name: "소형가전", emoji: "🔌", aliases: ["가전", "전자"] },
  { id: "home", group: "living", name: "침구·인테리어", emoji: "🛏️", aliases: ["침구", "인테리어", "가구"] },
];

/*
 * 시트 연결 전 보여줄 예시 상품 (시트와 같은 형식)
 * 실제 상품이 아니니 시트를 연결하면 사라집니다.
 */
window.EXAMPLE_CSV = `상품명,쿠팡링크,카테고리,원재료원산지,제조국,검수일,보관,수량,테마,추천,제품사진,원산지사진,브랜드,설명,태그
국산콩 두부 300g (예시),https://www.coupang.com/np/search?q=국산콩+두부,김치·반찬,한국,,2026-11-10,냉장,1,매일 장보기,O,,,,국산 콩으로 만든 두부,"두부, 국산콩"
국내산 배추 포기김치 1kg (예시),https://www.coupang.com/np/search?q=국산+포기김치,김치·반찬,한국,,2026-11-08,냉장,1,김장 준비,O,,,,배추·고춧가루·마늘 모두 국산,"김치, 포기김치"
국산 고춧가루 1kg (예시),https://www.coupang.com/np/search?q=국산+고춧가루,장·양념,한국,,2026-11-05,상온,1,김장 준비,,,,,,"고춧가루, 김장"
국산 천일염 3kg (예시),https://www.coupang.com/np/search?q=국산+천일염,장·양념,한국,,2026-11-05,상온,1,김장 준비,,,,,,"소금, 천일염"
우리밀 만두 1kg (예시),https://www.coupang.com/np/search?q=우리밀+만두,간편식·냉동,한국,,2026-10-30,냉동,1,"자주 찾는, 매일 장보기",O,,,,밀가루까지 국산 우리밀,"만두, 우리밀"
국산 쌀 10kg (예시),https://www.coupang.com/np/search?q=국산+쌀+10kg,쌀·잡곡,한국,,2026-10-28,상온,1,자주 찾는,,,,,,쌀
동결건조 딸기칩 (예시),https://www.coupang.com/np/search?q=국산+딸기칩,과자·간식,한국,,2026-11-02,상온,3,"원물 간식, 아이 간식",O,,,,원재료 딱 하나 딸기,"딸기, 원물간식"
국산콩 두유 190ml 24팩 (예시),https://www.coupang.com/np/search?q=국산콩+두유,음료·차,한국,,2026-11-12,상온,24,아이 간식,,,,,,"두유, 국산콩"
볶은 보리차 티백 (예시),https://www.coupang.com/np/search?q=국산+보리차,음료·차,한국,,2026-11-12,상온,1,매일 장보기,,,,,,"보리차, 차"
국산 멸치 500g (예시),https://www.coupang.com/np/search?q=국산+멸치,수산·건어물,한국,,2026-10-20,냉동,1,자주 찾는,,,,,,멸치
수입 원료 섞인 상품 (예시: 기준 미달로 숨김),https://www.coupang.com/np/search?q=예시,간편식·냉동,"한국, 미국",,2026-10-01,냉동,1,자주 찾는,,,,,,
김장용 고무장갑 (예시),https://www.coupang.com/np/search?q=국산+고무장갑,주방용품,,한국,2026-11-06,,3,김장 준비,,,,,,"고무장갑, 김장"
스테인리스 냄비 (예시),https://www.coupang.com/np/search?q=국산+스텐+냄비,주방용품,,한국,2026-10-25,,1,자주 찾는,O,,,,,냄비
빨래비누 (예시),https://www.coupang.com/np/search?q=국산+빨래비누,세제·청소,,한국,2026-10-25,,4,,,,,,,"비누, 세탁"
볼펜 세트 (예시),https://www.coupang.com/np/search?q=국산+볼펜,문구·사무,,한국,2026-10-18,,1,,,,,,,볼펜
`;
