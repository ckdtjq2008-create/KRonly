# 국산모아 — 국산 제품 큐레이션 + 쿠팡 파트너스

빌드가 필요 없는 정적 사이트입니다(HTML/CSS/JS). PC와 모바일 둘 다 지원합니다.

## 파일
- `index.html` : 페이지 뼈대, 쿠팡 파트너스 고지 문구
- `products.js` : **상품·카테고리 데이터 (여기만 고치면 됨)**
- `app.js` : 검색, 카테고리(#food 같은 URL 해시), 정렬, 상세 팝업
- `style.css` : 디자인 (모바일 2열 / 태블릿 3열 / PC 4열, 다크모드 지원)

## 상품 추가·수정
`products.js`의 `PRODUCTS` 배열에 항목을 추가합니다.

```js
{ id: 17, name: "상품명", brand: "브랜드", category: "kitchen", emoji: "🍳",
  origin: "대한민국", verified: true, pick: false,
  desc: "한 줄 설명", tags: ["태그"],
  image: "https://...jpg",                       // 선택
  coupangUrl: "https://link.coupang.com/a/XXXX" } // 쿠팡 파트너스 링크
```

1. 쿠팡 파트너스(partners.coupang.com) → 링크 생성 → 상품 검색 → **단축 URL** 복사 → `coupangUrl`에 붙여넣기
2. 쿠팡 상품 상세의 "제조국/원산지"를 확인하고 `verified: true`로 바꾸기
3. 지금 들어 있는 16개는 예시 데이터이고, 링크는 수수료가 적립되지 않는 쿠팡 검색 링크입니다.

## 로컬에서 보기
```bash
python3 -m http.server 8080
```
→ http://localhost:8080

## 배포 (무료)
- **Netlify / Vercel / Cloudflare Pages / GitHub Pages**: 폴더를 그대로 올리면 됩니다(빌드 명령 없음).
- 도메인 연결 후 쿠팡 파트너스에 사이트 URL을 등록하세요.

## 꼭 지킬 것
- 쿠팡 파트너스 고지 문구("이 사이트는 쿠팡 파트너스 활동의 일환으로…")는 지우지 마세요. 공정위 지침상 필수입니다. 이미 상단, 하단, 구매 버튼 아래에 들어가 있습니다.
- 외부 링크에는 `rel="sponsored nofollow"`가 붙어 있습니다.
