(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let cats = [];
  let products = [];
  let catName = {};

  const state = { cat: "all", q: "", sort: "default" };

  // URL 해시로 카테고리 공유 (#food, #beauty ...)
  const fromHash = () => {
    const h = decodeURIComponent(location.hash.slice(1));
    state.cat = cats.some((c) => c.id === h) ? h : "all";
  };

  // 사진을 못 불러오면 사진만 지우고 아래 이모지가 보이게 함
  const img = (src, alt, cls = "") =>
    `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" />`;

  const thumb = (p) => `
    <div class="thumb">
      <span class="thumb-emoji" aria-hidden="true">${p.emoji || "📦"}</span>
      ${p.image ? img(p.image, p.name, "thumb-img") : ""}
      <span class="badge ${p.verified ? "ok" : ""}">${p.verified ? "✓ 원산지 확인" : "🇰🇷 국산"}</span>
      ${p.originImage ? `<span class="label-inset">${img(p.originImage, p.name + " 국산 표기")}<em>국산 표기</em></span>` : ""}
    </div>`;

  const card = (p) => `
    <button class="card" type="button" data-id="${p.id}">
      ${thumb(p)}
      <div class="card-body">
        <span class="brand">${esc(p.brand)}</span>
        <span class="name">${esc(p.name)}</span>
        <span class="buy">쿠팡에서 보기 →</span>
      </div>
    </button>`;

  function renderCats() {
    $("#cats").innerHTML = cats
      .map((c) => `<button class="chip" type="button" data-cat="${c.id}" aria-pressed="${c.id === state.cat}">${c.emoji} ${esc(c.name)}</button>`)
      .join("");
  }

  function filtered() {
    const q = state.q.trim().toLowerCase();
    let list = products.filter((p) => state.cat === "all" || p.category === state.cat);
    if (q) {
      list = list.filter((p) =>
        [p.name, p.brand, p.desc, catName[p.category], ...(p.tags || [])].join(" ").toLowerCase().includes(q)
      );
    }
    if (state.sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "ko"));
    if (state.sort === "brand") list = [...list].sort((a, b) => a.brand.localeCompare(b.brand, "ko"));
    return list;
  }

  function render() {
    renderCats();
    const browsingHome = state.cat === "all" && !state.q;
    $("#hero").hidden = !browsingHome;
    $("#picks-section").hidden = !browsingHome || !products.some((p) => p.pick);
    $("#picks").innerHTML = products.filter((p) => p.pick).map(card).join("");

    const list = filtered();
    $("#list-title").textContent = state.q
      ? `'${state.q}' 검색 결과 ${list.length}개`
      : `${state.cat === "all" ? "전체 상품" : catName[state.cat]} ${list.length}개`;
    $("#grid").innerHTML = list.map(card).join("");
    $("#empty").hidden = list.length > 0;
  }

  function openDetail(id) {
    const p = products.find((x) => String(x.id) === String(id));
    if (!p) return;
    const link = (inner, cls) =>
      `<a class="${cls}" href="${esc(p.coupangUrl)}" target="_blank" rel="sponsored nofollow noopener">${inner}</a>`;
    $("#detail-body").innerHTML = `
      ${link(thumb({ ...p, originImage: "" }), "photo-link")}
      ${p.originImage ? `
        <div class="origin-photo">
          <p class="origin-title">📋 국산 원재료·원산지 표기</p>
          ${link(img(p.originImage, p.name + " 원산지 표기"), "photo-link origin-link")}
        </div>` : ""}
      <div class="detail-info">
        <span class="brand">${esc(p.brand)}</span>
        <h3>${esc(p.name)}</h3>
        ${p.desc ? `<p>${esc(p.desc)}</p>` : ""}
        <div class="meta">
          <span>제조국 ${esc(p.origin)}</span>
          <span>${esc(catName[p.category])}</span>
          ${(p.tags || []).map((t) => `<span>#${esc(t)}</span>`).join("")}
        </div>
      </div>
      <div class="cta-bar">
        ${link("쿠팡에서 가격 보기", "cta")}
        <p class="fine">이 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p>
      </div>`;
    $("#detail").showModal();
  }

  document.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-cat]");
    if (chip) {
      e.preventDefault();
      state.q = "";
      $("#q").value = "";
      const id = chip.dataset.cat;
      history.replaceState(null, "", id === "all" ? location.pathname : "#" + id);
      state.cat = id;
      render();
      return;
    }
    const c = e.target.closest(".card");
    if (c) openDetail(c.dataset.id);
  });

  // 바깥(배경) 클릭 시 상세 닫기
  $("#detail").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });

  let t;
  $("#q").addEventListener("input", (e) => {
    clearTimeout(t);
    t = setTimeout(() => { state.q = e.target.value; render(); }, 120);
  });
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
  window.addEventListener("hashchange", () => { fromHash(); render(); });

  // 시트(또는 예시 데이터)를 불러와서 표시
  window.Sheet.loadCatalog((data) => {
    cats = data.categories;
    products = data.products;
    catName = Object.fromEntries(cats.map((c) => [c.id, c.name]));
    fromHash();
    render();
    document.body.dataset.source = data.source;
  });
})();
