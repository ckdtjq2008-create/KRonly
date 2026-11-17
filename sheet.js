/*
 * 구글 시트(CSV) → 상품 목록 변환
 *
 * 필수 열: 상품명, 쿠팡링크, 카테고리
 *   식품이면 원재료원산지 필수 (전부 한국이어야 노출)
 *   생활용품이면 제조국 필수 (한국이어야 노출)
 * 선택 열: 구분, 검수일, 보관, 테마, 추천, 제품사진, 원산지사진, 브랜드, 설명, 태그, 이모지, 노출
 * 열 순서는 상관없고, 1행(헤더)의 이름으로 찾습니다.
 */
(() => {
  const HEADERS = {
    name: ["상품명", "제품명", "이름", "name"],
    coupangUrl: ["쿠팡링크", "파트너스링크", "링크", "url", "link"],
    group: ["구분", "대분류", "group"],
    category: ["카테고리", "분류", "category"],
    ingredients: ["원재료원산지", "원재료", "원료원산지", "원산지"],
    madeIn: ["제조국", "생산국", "제조"],
    checkedAt: ["검수일", "확인일", "검수"],
    storage: ["보관", "보관방법", "보관방식"],
    timestamp: ["타임스탬프", "timestamp"], // 구글 폼 응답 시트
    themes: ["테마", "기획전", "theme"],
    pick: ["추천", "pick"],
    image: ["제품사진", "상품사진", "이미지", "사진", "image"],
    imageNew: ["제품사진교체", "새제품사진"],
    originImageNew: ["원산지사진교체", "새원산지사진"],
    originImage: ["원산지사진", "표시사항사진", "원재료사진", "라벨사진", "국산표기사진", "표기사진"],
    brand: ["브랜드", "제조사", "brand"],
    desc: ["설명", "한줄설명", "desc"],
    tags: ["태그", "해시태그", "tags"],
    emoji: ["이모지", "emoji"],
    visible: ["노출", "표시", "visible"],
  };

  const norm = (s) => String(s || "").replace(/[\s·.\/_-]+/g, "").toLowerCase();
  const yes = (v) => ["o", "y", "yes", "true", "1", "✓", "v", "예", "추천"].includes(norm(v));
  const no = (v) => ["x", "n", "no", "false", "0", "숨김", "아니오"].includes(norm(v));
  const KOREA = ["한국", "국산", "국내산", "국내", "대한민국", "korea", "kr", "southkorea"];
  const splitList = (v) => String(v || "").split(/[,/、]|\s+및\s+/).map((t) => t.trim()).filter(Boolean);
  const isKorea = (c) => KOREA.includes(norm(c));

  // 구글 드라이브 공유 링크 → 이미지 주소
  function imageUrl(raw) {
    const u = String(raw || "").split(/[\s,]+/).find((x) => /^https?:\/\//i.test(x)) || String(raw || "").trim();
    if (!u) return "";
    const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=|thumbnail\?id=)([\w-]{10,})/);
    if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1200`;
    return u;
  }

  // 상품명으로 만든 고정 ID (공유 링크용)
  function idFor(name) {
    let h = 5381;
    for (const ch of name) h = ((h << 5) + h + ch.codePointAt(0)) >>> 0;
    return h.toString(36);
  }

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

  function rowsToCatalog(rows) {
    const warnings = [];   // 고치면 좋은 것 (노출은 됨)
    const excluded = [];   // 기준 미달·오류로 숨긴 것
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

    const categories = window.CATEGORIES.map((c) => ({ ...c }));
    const findCat = (label) => {
      const n = norm(label);
      return categories.find((c) => norm(c.name) === n || c.id === n || (c.aliases || []).some((a) => norm(a) === n));
    };

    const products = [];
    const seen = new Set();
    rows.slice(1).forEach((r, i) => {
      const line = i + 2;
      const get = (f) => (col[f] == null ? "" : String(r[col[f]] ?? "").trim());
      const name = get("name");
      const url = get("coupangUrl");
      if (!name && !url) return;
      if (no(get("visible"))) return;
      const skip = (why) => excluded.push({ line, name: name || "(이름 없음)", why });

      if (!name) return skip("상품명이 비어 있음");
      if (!/^https?:\/\//i.test(url)) return skip("쿠팡링크가 없거나 http로 시작하지 않음");

      // 카테고리 → 구분(식품/생활)
      const catLabel = get("category");
      let cat = catLabel ? findCat(catLabel) : null;
      const groupLabel = norm(get("group"));
      const groupGuess = /생활|living/.test(groupLabel) ? "living" : /식품|food/.test(groupLabel) ? "food" : null;
      let newCatWarning = "";
      if (!cat) {
        // 구분 칸이 없으면: 제조국만 적혀 있으면 생활용품, 아니면 식품으로 판단
        const group = groupGuess || (get("madeIn") && !get("ingredients") ? "living" : "food");
        const label = catLabel || (group === "food" ? "기타 식품" : "기타 생활용품");
        cat = categories.find((c) => c.name === label);
        if (!cat) {
          cat = { id: "x-" + idFor(label), group, name: label, emoji: "📦", aliases: [] };
          categories.push(cat);
          if (catLabel) newCatWarning = `새 카테고리 '${catLabel}'(${group === "food" ? "식품" : "생활용품"})로 등록됨 — 오타가 아닌지 확인`;
        }
      }
      const group = cat.group;

      // 기준 검사
      const ingredients = splitList(get("ingredients"));
      const madeIn = splitList(get("madeIn"));
      if (group === "food") {
        if (!ingredients.length) return skip("식품인데 '원재료원산지'가 비어 있음");
        const foreign = ingredients.filter((c) => !isKorea(c));
        if (foreign.length) return skip(`원재료에 국산이 아닌 원산지 포함 (${foreign.join(", ")}) — 식품 기준(원재료 100% 국산) 미달`);
      } else {
        if (!madeIn.length) return skip("생활용품인데 '제조국'이 비어 있음");
        const foreign = madeIn.filter((c) => !isKorea(c));
        if (foreign.length) return skip(`제조국이 한국이 아님 (${foreign.join(", ")}) — 생활용품 기준(국내 제조) 미달`);
      }

      if (newCatWarning) warnings.push({ line, name, why: newCatWarning });
      if (!/coupang\.com/i.test(url)) warnings.push({ line, name, why: `쿠팡 링크가 아닌 것 같음 (${url.slice(0, 40)})` });
      else if (!/link\.coupang\.com/i.test(url)) warnings.push({ line, name, why: "파트너스 단축링크(link.coupang.com)가 아니라 수수료가 적립되지 않을 수 있음" });

      for (const f of ["image", "originImage"]) {
        const v = get(f);
        if (/drive\.google\.com\/drive\/folders/.test(v)) warnings.push({ line, name, why: "사진 칸에 폴더 링크가 있음 — 사진 파일 하나의 링크를 넣어주세요" });
        else if (v && !/^https?:\/\//i.test(v)) warnings.push({ line, name, why: "사진 주소가 http로 시작하지 않음" });
      }
      if (group === "food" && !get("originImage") && !get("originImageNew")) warnings.push({ line, name, why: "원산지(표시사항) 사진이 없음 — 넣으면 신뢰도가 올라갑니다" });

      // 날짜: 2026-11-16 / 2026. 11. 16 / 2026/11/16 / 2026년 11월 16일 → 2026-11-16
      const dm = (get("checkedAt") || get("timestamp")).match(/(\d{4})\D{1,3}(\d{1,2})\D{1,3}(\d{1,2})/);
      const checkedAt = dm ? `${dm[1]}-${dm[2].padStart(2, "0")}-${dm[3].padStart(2, "0")}` : get("checkedAt") || get("timestamp");
      if (!checkedAt) warnings.push({ line, name, why: "검수일이 비어 있음" });

      let id = idFor(name);
      while (seen.has(id)) id += "x";
      seen.add(id);

      const storageRaw = norm(get("storage"));
      const storage = /냉동/.test(storageRaw) ? "냉동" : /냉장/.test(storageRaw) ? "냉장" : /상온|실온/.test(storageRaw) ? "상온" : "";

      products.push({
        id,
        line,
        name,
        coupangUrl: url,
        group,
        category: cat.id,
        ingredients: [...new Set(ingredients.map((c) => (isKorea(c) ? "한국" : c)))],
        madeIn: [...new Set(madeIn.map((c) => (isKorea(c) ? "한국" : c)))],
        checkedAt,
        storage,
        themes: splitList(get("themes")),
        pick: yes(get("pick")),
        // '사진 교체' 폼으로 바꾼 사진이 있으면 그걸 우선
        image: imageUrl(get("imageNew") || get("image")),
        originImage: imageUrl(get("originImageNew") || get("originImage")),
        brand: get("brand"),
        desc: get("desc"),
        tags: splitList(get("tags").replace(/#/g, ",")),
        emoji: get("emoji") || cat.emoji || "📦",
      });
    });

    // 테마: 시트에 처음 나온 순서대로
    const themes = [];
    for (const p of products) for (const t of p.themes) if (!themes.includes(t)) themes.push(t);

    const used = new Set(products.map((p) => p.category));
    return {
      categories: categories.filter((c) => used.has(c.id)),
      products,
      themes,
      warnings,
      excluded,
    };
  }

  const CACHE_KEY = "kukmade.sheet.v3";
  const cache = {
    get() { try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; } },
    set(v) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch {} },
    clear() { try { localStorage.removeItem(CACHE_KEY); } catch {} },
  };

  const example = () => ({ ...rowsToCatalog(parseCSV(window.EXAMPLE_CSV)), source: "example" });

  /*
   * 상품 목록을 불러옵니다. onData는 최대 2번 호출됩니다:
   * 저장된 캐시로 한 번(빠른 표시), 시트 최신본으로 한 번.
   */
  async function loadCatalog(onData, urlOverride) {
    const url = urlOverride ?? (window.SITE_CONFIG || {}).sheetCsvUrl;
    if (!url) { const d = example(); onData(d); return d; }

    const cached = cache.get();
    const hasCache = cached && cached.url === url;
    if (hasCache) onData({ ...cached.data, source: "cache" });

    try {
      const sep = url.includes("?") ? "&" : "?";
      const res = await fetch(url + sep + "_=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("시트를 불러오지 못했습니다 (HTTP " + res.status + ")");
      const text = await res.text();
      if (/^\s*</.test(text)) throw new Error("CSV가 아니라 웹페이지가 왔습니다. '웹에 게시'에서 형식을 CSV로 선택했는지 확인하세요.");
      const data = rowsToCatalog(parseCSV(text));
      cache.set({ url, data, at: Date.now() });
      const result = { ...data, source: "sheet" };
      onData(result);
      return result;
    } catch (err) {
      console.error("[시트 로딩 실패]", err);
      const result = hasCache ? { ...cached.data, source: "cache", error: err.message } : { ...example(), error: err.message };
      if (!hasCache) onData(result);
      return result;
    }
  }

  window.Sheet = { parseCSV, rowsToCatalog, loadCatalog, imageUrl, clearCache: cache.clear };
})();
