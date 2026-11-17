(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cfg = window.SITE_CONFIG || {};
  const GROUPS = window.GROUPS;

  let data = { categories: [], products: [], themes: [] };
  let catById = {};
  const state = { group: "food", view: "home", value: "", q: "", sort: "default" };

  /* ---------- 설정 링크 (비어 있으면 숨김) ---------- */
  document.querySelectorAll("[data-cfg]").forEach((a) => {
    const url = cfg[a.dataset.cfg];
    if (url) a.href = url.replace("{name}", "");
    else a.hidden = true;
  });

  /* ---------- 조각 ---------- */
  const img = (src, alt, cls = "") =>
    `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" />`;

  const originText = (p) =>
    p.group === "food" ? `<b>원재료</b> ${esc(p.ingredients.join(", "))}` : `<b>제조국</b> ${esc(p.madeIn.join(", "))}`;

  const storageBadge = (p) =>
    p.storage === "냉동" ? `<span class="store frozen" title="냉동 보관">❄<small>냉동</small></span>`
    : p.storage === "냉장" ? `<span class="store chilled" title="냉장 보관">💧<small>냉장</small></span>` : "";

  const card = (p) => `
    <button class="card" type="button" data-id="${p.id}">
      <div class="thumb">
        <span class="thumb-emoji" aria-hidden="true">${p.emoji}</span>
        ${p.image || p.originImage ? img(p.image || p.originImage, p.name, "thumb-img") : ""}
        ${storageBadge(p)}
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span>${p.checkedAt ? "검수 " + esc(p.checkedAt) : "&nbsp;"}</span>
          ${p.pick ? `<span class="pick">추천</span>` : ""}
        </div>
        <span class="name">${esc(p.name)}</span>
        <span class="origin">${originText(p)}</span>
      </div>
    </button>`;

  const row = (title, list, href) => `
    <section class="row">
      <div class="row-head">
        <h2 class="section-title">${esc(title)}</h2>
        ${href ? `<a class="more" href="${href}">더보기 ›</a>` : ""}
      </div>
      <div class="rail-wrap">
        <div class="rail">${list.map(card).join("")}</div>
        <button class="rail-btn prev" type="button" aria-label="이전">‹</button>
        <button class="rail-btn next" type="button" aria-label="다음">›</button>
      </div>
    </section>`;

  /* ---------- 정렬·필터 ---------- */
  const sorted = (list) => {
    if (state.sort === "recent") return [...list].sort((a, b) => (b.checkedAt || "").localeCompare(a.checkedAt || ""));
    if (state.sort === "name") return [...list].sort((a, b) => a.name.localeCompare(b.name, "ko"));
    return [...list].sort((a, b) => (b.pick ? 1 : 0) - (a.pick ? 1 : 0)); // 추천 먼저, 나머지는 시트 순서
  };
  const inGroup = (g) => data.products.filter((p) => p.group === g);

  function search(q) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return data.products.filter((p) => {
      const hay = [p.name, p.brand, p.desc, catById[p.category]?.name, ...p.tags, ...p.themes].join(" ").toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }

  /* ---------- 홈 ---------- */
  function renderHome() {
    const g = state.group;
    const items = inGroup(g);

    // 빠른 검색어: 많이 쓰인 태그
    const tagCount = {};
    data.products.forEach((p) => p.tags.forEach((t) => (tagCount[t] = (tagCount[t] || 0) + 1)));
    const quick = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
    $("#quick").innerHTML = quick.map((t) => `<button type="button" class="quick-chip" data-q="${esc(t)}">#${esc(t)}</button>`).join("");

    $("#group-tabs").innerHTML = Object.entries(GROUPS).map(([id, G]) => `
      <button type="button" role="tab" class="group-tab" data-group="${id}" aria-selected="${id === g}">
        <span class="gt-emoji">${G.emoji}</span>
        <span><b>${G.name}</b><small>${G.rule}</small></span>
      </button>`).join("");
    $("#group-desc").textContent = GROUPS[g].desc;

    $("#tiles").innerHTML = data.categories.filter((c) => c.group === g).map((c) => `
      <a class="tile" href="#cat=${encodeURIComponent(c.id)}">
        <span class="tile-emoji">${c.emoji}</span><span>${esc(c.name)}</span>
      </a>`).join("") || `<p class="empty">아직 등록된 상품이 없어요.</p>`;

    // 테마 줄: 이 구분의 상품이 있는 테마만
    const rows = [];
    const picks = items.filter((p) => p.pick);
    if (picks.length) rows.push(row("에디터 추천", picks, ""));
    for (const t of data.themes) {
      const list = items.filter((p) => p.themes.includes(t));
      if (list.length) rows.push(row(t, list, `#theme=${encodeURIComponent(t)}`));
    }
    $("#themes").innerHTML = rows.join("");
    setupRails();

    $("#all-title").textContent = `${GROUPS[g].name} 전체 ${items.length}개`;
    $("#all-more").href = `#group=${g}&all=1`;
    $("#all-more").hidden = items.length <= 8;
    $("#home-grid").innerHTML = sorted(items).slice(0, 8).map(card).join("") || `<p class="empty">아직 등록된 상품이 없어요.</p>`;
  }

  // 가로 줄 좌우 버튼
  function setupRails() {
    document.querySelectorAll(".rail-wrap").forEach((w) => {
      const rail = $(".rail", w);
      const update = () => {
        $(".prev", w).hidden = rail.scrollLeft < 8;
        $(".next", w).hidden = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 8;
      };
      rail.addEventListener("scroll", update, { passive: true });
      $(".prev", w).onclick = () => rail.scrollBy({ left: -rail.clientWidth * 0.9, behavior: "smooth" });
      $(".next", w).onclick = () => rail.scrollBy({ left: rail.clientWidth * 0.9, behavior: "smooth" });
      update();
    });
  }

  /* ---------- 목록 ---------- */
  function renderList() {
    let list, title;
    if (state.view === "search") {
      list = search(state.q);
      title = `'${state.q}' 검색 결과 ${list.length}개`;
    } else if (state.view === "cat") {
      const c = catById[state.value];
      list = data.products.filter((p) => p.category === state.value);
      title = `${c ? c.emoji + " " + c.name : "카테고리"} ${list.length}개`;
    } else if (state.view === "theme") {
      list = data.products.filter((p) => p.themes.includes(state.value));
      title = `${state.value} ${list.length}개`;
    } else {
      list = inGroup(state.group);
      title = `${GROUPS[state.group].name} 전체 ${list.length}개`;
    }
    $("#list-title").textContent = title;
    $("#grid").innerHTML = sorted(list).map(card).join("");
    $("#empty").hidden = list.length > 0;
  }

  function render() {
    const home = state.view === "home";
    $("#home").hidden = !home;
    $("#list").hidden = home;
    home ? renderHome() : renderList();
  }

  /* ---------- 주소(#) ↔ 상태 ---------- */
  // 주소 예: #cat=side  #theme=김장%20준비  #q=두부  #group=living&all=1  (&p=상품ID 는 상세 열기)
  const params = () => new URLSearchParams(location.hash === "#about" ? "" : location.hash.slice(1));

  function fromHash() {
    const h = params();
    if (h.get("group") in GROUPS) state.group = h.get("group");
    if (h.get("cat")) {
      state.view = "cat"; state.value = h.get("cat");
      const c = catById[state.value]; if (c) state.group = c.group;
    } else if (h.get("theme")) { state.view = "theme"; state.value = h.get("theme"); }
    else if (h.get("all")) state.view = "all";
    else if (h.get("q")) { state.view = "search"; state.q = h.get("q"); $("#q").value = state.q; }
    else state.view = "home";
    if (state.view !== "search") { state.q = ""; $("#q").value = ""; }
    return h.get("p");
  }

  function setHash(h, push) {
    const s = h.toString();
    const url = location.pathname + location.search + (s ? "#" + s : "");
    push ? history.pushState(null, "", url) : history.replaceState(null, "", url);
  }

  function go(hash) {
    history.pushState(null, "", hash || location.pathname + location.search);
    fromHash(); render();
    window.scrollTo(0, 0);
  }

  /* ---------- 상세 ---------- */
  function openDetail(id) {
    const p = data.products.find((x) => x.id === id);
    if (!p) return;
    const link = (inner, cls, label = "") =>
      `<a class="${cls}" href="${esc(p.coupangUrl)}" target="_blank" rel="sponsored nofollow noopener" ${label ? `aria-label="${esc(label)}"` : ""}>${inner}</a>`;
    const photos = [
      p.originImage && { src: p.originImage, label: p.group === "food" ? "원재료 표시사항" : "제조국 표시" },
      p.image && { src: p.image, label: "제품 사진" },
    ].filter(Boolean);
    const cat = catById[p.category];
    const reportUrl = cfg.reportFormUrl ? cfg.reportFormUrl.replace("{name}", encodeURIComponent(p.name)) : "";

    $("#detail-body").innerHTML = `
      <div class="d-head">
        <h3 id="detail-title">${esc(p.name)}</h3>
        <button class="close" type="button" aria-label="닫기">✕</button>
      </div>
      <div class="d-scroll">
        ${photos.length > 1 ? `<div class="d-tabs">${photos.map((ph, i) => `<button type="button" data-photo="${i}" aria-pressed="${i === 0}">${ph.label}</button>`).join("")}</div>` : ""}
        <div class="d-photos">
          ${photos.length
            ? photos.map((ph, i) => link(img(ph.src, `${p.name} ${ph.label}`), "d-photo" + (i ? " hide" : ""), ph.label + " — 쿠팡에서 보기")).join("")
            : link(`<span class="thumb-emoji">${p.emoji}</span>`, "d-photo d-emoji", "쿠팡에서 보기")}
        </div>
        <dl class="d-info">
          <div><dt>${p.group === "food" ? "원재료 원산지" : "제조국"}</dt><dd class="ok">${esc((p.group === "food" ? p.ingredients : p.madeIn).join(", "))} <span class="rule-badge">${GROUPS[p.group].rule}</span></dd></div>
          ${p.checkedAt ? `<div><dt>검수일</dt><dd>${esc(p.checkedAt)}</dd></div>` : ""}
          ${p.storage ? `<div><dt>보관</dt><dd>${esc(p.storage)}</dd></div>` : ""}
          ${p.brand ? `<div><dt>브랜드</dt><dd>${esc(p.brand)}</dd></div>` : ""}
          ${cat ? `<div><dt>카테고리</dt><dd><a href="#cat=${encodeURIComponent(cat.id)}" class="d-cat">${esc(cat.name)}</a></dd></div>` : ""}
        </dl>
        ${p.desc ? `<p class="d-desc">${esc(p.desc)}</p>` : ""}
        ${p.tags.length ? `<div class="d-tags">${p.tags.map((t) => `<button type="button" data-q="${esc(t)}">#${esc(t)}</button>`).join("")}</div>` : ""}
      </div>
      <div class="cta-bar">
        <div class="cta-row">
          ${link(`<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM5.2 4l.6 2H21l-2.4 8.4a2 2 0 0 1-1.9 1.6H8.2a2 2 0 0 1-1.9-1.5L3.7 4H1V2h4.2l.6 2Z"/></svg>쿠팡에서 구매하기`, "cta")}
          <button class="icon-btn" type="button" data-share="${p.id}" aria-label="공유하기" title="공유하기">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.4a3 3 0 0 0 0-1.6l6.7-3.4A3 3 0 1 0 15 7l-6.7 3.4a3 3 0 1 0 0 3.2L15 17a3 3 0 1 0 3-1Z"/></svg>
          </button>
          ${reportUrl ? `<a class="icon-btn" href="${esc(reportUrl)}" target="_blank" rel="noopener" aria-label="정보 오류 제보" title="정보 오류 제보">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M5 21V4h9l.4 2H20v10h-7l-.4-2H7v7H5Z"/></svg>
          </a>` : ""}
        </div>
        <p class="fine">이 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p>
      </div>`;
    const d = $("#detail");
    if (!d.open) d.showModal();
    $(".d-scroll", d).scrollTop = 0;
    const h = params(); h.set("p", id); setHash(h);
  }

  function toast(msg) {
    const t = $("#toast");
    (detail.open ? detail : document.body).appendChild(t); // 상세 창 위에도 보이게
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove("show"), 2000);
  }

  async function share(id) {
    const p = data.products.find((x) => x.id === id);
    const url = location.origin + location.pathname + "#p=" + id;
    try {
      if (navigator.share) await navigator.share({ title: p.name, text: `${p.name} — ${GROUPS[p.group].rule}`, url });
      else { await navigator.clipboard.writeText(url); toast("링크를 복사했어요"); }
    } catch (e) {
      if (e.name !== "AbortError") prompt("이 링크를 복사하세요", url);
    }
  }

  /* ---------- 이벤트 ---------- */
  const detail = $("#detail");
  document.addEventListener("click", (e) => {
    const t = e.target;
    const tab = t.closest("[data-group]");
    if (tab) { state.group = tab.dataset.group; render(); return; }

    const qBtn = t.closest("[data-q]");
    if (qBtn) { detail.close(); go("#q=" + encodeURIComponent(qBtn.dataset.q)); return; }

    const ph = t.closest("[data-photo]");
    if (ph) {
      const i = +ph.dataset.photo;
      document.querySelectorAll(".d-tabs button").forEach((b, j) => b.setAttribute("aria-pressed", i === j));
      document.querySelectorAll(".d-photo").forEach((a, j) => a.classList.toggle("hide", i !== j));
      return;
    }
    const sh = t.closest("[data-share]");
    if (sh) { share(sh.dataset.share); return; }
    if (t.closest(".close")) { detail.close(); return; }

    // 페이지 안 이동 링크(#cat=…, #theme=… 등)
    const a = t.closest('a[href^="#"]');
    if (a && a.getAttribute("href") !== "#about") {
      e.preventDefault();
      if (detail.open) detail.close();
      go(a.getAttribute("href") === "#" ? "" : a.getAttribute("href"));
      return;
    }

    const c = t.closest(".card");
    if (c) openDetail(c.dataset.id);
  });

  // 상세 닫히면 주소에서 p= 제거
  detail.addEventListener("close", () => { const h = params(); h.delete("p"); setHash(h); });
  detail.addEventListener("click", (e) => { if (e.target === e.currentTarget) detail.close(); });

  $("#back").addEventListener("click", () => {
    if (history.length > 1 && history.state !== "entry") history.back();
    else go("");
  });

  let typing;
  $("#q").addEventListener("input", (e) => {
    clearTimeout(typing);
    typing = setTimeout(() => {
      const v = e.target.value.trim();
      history.replaceState(null, "", v ? "#q=" + encodeURIComponent(v) : location.pathname + location.search);
      fromHash(); render();
    }, 150);
  });
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });

  const menuBtn = $("#menu-btn");
  menuBtn.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    menuBtn.setAttribute("aria-expanded", open);
  });
  $("#nav").addEventListener("click", () => document.body.classList.remove("menu-open"));

  // 뒤로가기·앞으로가기
  window.addEventListener("popstate", () => {
    const pid = fromHash();
    render();
    if (pid) openDetail(pid);
    else if (detail.open) detail.close();
  });

  /* ---------- 시작 ---------- */
  history.replaceState("entry", "");
  let first = true;
  window.Sheet.loadCatalog((d) => {
    data = d;
    catById = Object.fromEntries(d.categories.map((c) => [c.id, c]));
    const pid = fromHash();
    render();
    if (first && pid) openDetail(pid);
    first = false;
    document.body.dataset.source = d.source;
  });
})();
