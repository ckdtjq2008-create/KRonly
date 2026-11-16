/*
 * 구글 시트(CSV) → 상품 목록 변환
 *
 * 필수 열: 상품명, 쿠팡링크
 * 선택 열: 브랜드, 카테고리, 제품사진, 원산지사진, 설명, 태그(쉼표 구분), 추천(O/X), 원산지확인(O/X), 이모지, 노출(X면 숨김)
 * 열 순서는 상관없고, 1행(헤더)의 이름으로 찾습니다.
 */
(() => {
  // 헤더 이름 → 내부 필드 (여러 표기 허용)
  const HEADERS = {
    name: ["상품명", "제품명", "이름", "name"],
    coupangUrl: ["쿠팡링크", "쿠팡 링크", "파트너스링크", "파트너스 링크", "링크", "url", "link", "coupangurl"],
    brand: ["브랜드", "제조사", "brand"],
    category: ["카테고리", "분류", "category"],
    image: ["제품사진", "상품사진", "이미지", "이미지url", "사진", "image"],
    originImage: ["원산지사진", "국산표기사진", "원산지표기사진", "표기사진", "원재료사진", "라벨사진", "originimage"],
    desc: ["설명", "한줄설명", "desc", "description"],
    tags: ["태그", "tags"],
    pick: ["추천", "pick"],
    verified: ["원산지확인", "확인", "verified"],
    emoji: ["이모지", "emoji"],
    visible: ["노출", "표시", "visible"],
  };

  /*
   * 사진 주소 정리: 구글 드라이브 공유 링크를 그대로 붙여넣어도 이미지로 보이게 변환
   *   https://drive.google.com/file/d/<ID>/view?usp=sharing
   *   https://drive.google.com/open?id=<ID>
   *   https://drive.google.com/uc?id=<ID>
   * → https://drive.google.com/thumbnail?id=<ID>&sz=w1200
   * (드라이브 파일은 "링크가 있는 모든 사용자 - 뷰어"로 공유되어 있어야 합니다)
   */
  function imageUrl(raw) {
    const u = String(raw || "").trim();
    if (!u) return "";
    const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=|thumbnail\?id=)([\w-]{10,})/);
    if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1200`;
    return u;
  }

  const norm = (s) => String(s || "").replace(/\s+/g, "").toLowerCase();
  const yes = (v) => ["o", "y", "yes", "true", "1", "✓", "v", "예", "추천"].includes(norm(v));
  const no = (v) => ["x", "n", "no", "false", "0", "숨김", "아니오"].includes(norm(v));

  // 따옴표·줄바꿈이 들어간 셀까지 처리하는 CSV 파서
  function parseCSV(text) {
    const rows = [];
    let row = [], cell = "", i = 0, quoted = false;
    text = text.replace(/^﻿/, "");
    while (i < text.length) {
      const c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
        } else cell += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += c;
      i++;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((v) => v.trim() !== ""));
  }

  function rowsToCatalog(rows, baseCategories) {
    const warnings = [];
    if (!rows.length) throw new Error("시트가 비어 있습니다.");

    const header = rows[0].map(norm);
    const col = {};
    for (const [field, names] of Object.entries(HEADERS)) {
      const idx = header.findIndex((h) => names.map(norm).includes(h));
      if (idx >= 0) col[field] = idx;
    }
    if (col.name == null || col.coupangUrl == null) {
      throw new Error("1행에 '상품명'과 '쿠팡링크' 열이 있어야 합니다. 현재 헤더: " + rows[0].join(", "));
    }

    // 기본 카테고리(이름 → id). 시트에 새 카테고리가 나오면 자동 추가.
    const categories = baseCategories.map((c) => ({ ...c }));
    const byName = Object.fromEntries(categories.map((c) => [norm(c.name), c]));
    const defaultEmoji = Object.fromEntries(categories.map((c) => [c.id, c.emoji]));

    const products = [];
    rows.slice(1).forEach((r, i) => {
      const line = i + 2; // 시트 행 번호
      const get = (f) => (col[f] == null ? "" : String(r[col[f]] ?? "").trim());
      const name = get("name");
      const url = get("coupangUrl");
      if (!name && !url) return;
      if (no(get("visible"))) return;
      if (!name) { warnings.push(`${line}행: 상품명이 비어 있어 건너뜀`); return; }
      if (!/^https?:\/\//i.test(url)) { warnings.push(`${line}행 '${name}': 쿠팡링크가 없거나 http로 시작하지 않아 건너뜀`); return; }
      for (const f of ["image", "originImage"]) {
        const v = get(f);
        if (/drive\.google\.com\/drive\/folders/.test(v)) warnings.push(`${line}행 '${name}': 사진 칸에 폴더 링크가 들어 있습니다. 사진 파일 하나의 공유 링크를 넣어주세요`);
        else if (v && !/^https?:\/\//i.test(v)) warnings.push(`${line}행 '${name}': 사진 주소가 http로 시작하지 않습니다 (${v.slice(0, 30)})`);
      }
      if (!/coupang\.com/i.test(url)) warnings.push(`${line}행 '${name}': 쿠팡 링크가 아닌 것 같습니다 (${url})`);
      else if (!/link\.coupang\.com/i.test(url)) warnings.push(`${line}행 '${name}': 파트너스 단축링크(link.coupang.com)가 아니면 수수료가 적립되지 않을 수 있습니다`);

      const catLabel = get("category");
      let cat = null;
      if (catLabel) {
        cat = byName[norm(catLabel)];
        if (!cat) {
          cat = { id: catLabel, name: catLabel, emoji: "📦" };
          categories.push(cat);
          byName[norm(catLabel)] = cat;
        }
      }
      const catId = cat ? cat.id : "etc";
      if (!cat && !byName[norm("기타")]) {
        const etc = { id: "etc", name: "기타", emoji: "📦" };
        categories.push(etc);
        byName[norm("기타")] = etc;
      }

      products.push({
        id: "s" + line,
        name,
        coupangUrl: url,
        brand: get("brand"),
        category: catId,
        image: imageUrl(get("image")),
        originImage: imageUrl(get("originImage")),
        desc: get("desc"),
        tags: get("tags").split(/[,#]/).map((t) => t.trim()).filter(Boolean),
        pick: yes(get("pick")),
        verified: yes(get("verified")),
        emoji: get("emoji") || defaultEmoji[catId] || "📦",
        origin: "대한민국",
      });
    });

    // 상품이 하나도 없는 카테고리는 숨김 ("전체"는 유지)
    const used = new Set(products.map((p) => p.category));
    return {
      categories: categories.filter((c) => c.id === "all" || used.has(c.id)),
      products,
      warnings,
    };
  }

  const CACHE_KEY = "kukmade.sheet.v2";
  const cache = {
    get() { try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; } },
    set(v) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch {} },
  };

  /*
   * 상품 목록을 불러옵니다.
   * onData는 최대 2번 호출됩니다: 저장된 캐시로 한 번(빠른 표시), 시트 최신본으로 한 번.
   */
  async function loadCatalog(onData) {
    const fallback = { categories: window.CATEGORIES, products: window.PRODUCTS, warnings: [], source: "example" };
    const url = (window.SITE_CONFIG || {}).sheetCsvUrl;
    if (!url) { onData(fallback); return fallback; }

    const cached = cache.get();
    if (cached && cached.url === url) onData({ ...cached.data, source: "cache" });

    try {
      const sep = url.includes("?") ? "&" : "?";
      const res = await fetch(url + sep + "_=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("시트를 불러오지 못했습니다 (HTTP " + res.status + ")");
      const text = await res.text();
      if (/^\s*</.test(text)) throw new Error("CSV가 아니라 웹페이지가 왔습니다. '웹에 게시'에서 형식을 CSV로 선택했는지 확인하세요.");
      const data = rowsToCatalog(parseCSV(text), window.CATEGORIES);
      cache.set({ url, data, at: Date.now() });
      const result = { ...data, source: "sheet" };
      onData(result);
      return result;
    } catch (err) {
      console.error("[국산모아] 시트 로딩 실패:", err);
      const result = cached && cached.url === url
        ? { ...cached.data, source: "cache", error: err.message }
        : { ...fallback, error: err.message };
      if (!cached || cached.url !== url) onData(result);
      return result;
    }
  }

  window.Sheet = { parseCSV, rowsToCatalog, loadCatalog, imageUrl };
})();
