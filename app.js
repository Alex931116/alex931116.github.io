/* ============================================================
   TRAVELLA — Shared app helpers
   Card/row builders, formatters, nav shells, fetchers
   ============================================================ */
(function () {
  "use strict";

  const API = "https://tourandtravels-nine.vercel.app/api/get";
  const FALLBACK_IMG = "https://images.unsplash.com/photo-1548013146-72479768bada?w=900";

  /* ---------- tiny utilities ---------- */
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const qs = (sel, root) => (root || document).querySelector(sel);
  const qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const fmtPrice = (n) => {
    n = Number(n);
    if (!n) return "Free";
    return "₹" + n.toLocaleString("en-IN");
  };

  /* 24h "09:30" / "00:00" -> "9:30 AM" ; empty -> "" ; midnight pair -> 24h */
  const fmtTime = (t) => {
    if (t == null || String(t).trim() === "") return "";
    const m = String(t).trim().match(/^(\d{1,2}):(\d{2})/);
    if (!m) return String(t);
    let h = +m[1]; const mm = m[2];
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${mm} ${ampm}`;
  };

  const timeRange = (open, close) => {
    const o = fmtTime(open), c = fmtTime(close);
    if (!o && !c) return "Open 24 Hours";
    if (o === c) return "Open 24 Hours";
    return `${o} — ${c}`;
  };

  /* deterministic pseudo rating so numbers are stable across reloads */
  const ratingFor = (id) => {
    const s = String(id || 1);
    let h = 7;
    for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 997;
    return { rating: (4.1 + (h % 9) / 10).toFixed(1), reviews: 340 + ((h * 37) % 6300) };
  };

  const dotsHtml = (r) => {
    let out = '<span class="dots">';
    for (let i = 1; i <= 5; i++) out += `<span class="dot ${i <= Math.round(+r) ? "" : "muted"}"></span>`;
    out += "</span>";
    return out;
  };

  const tagsOf = (item) => {
    let t = item.category || item.tag || [];
    if (typeof t === "string") t = [t];
    return t.map((x) => String(x).trim()).filter(Boolean);
  };

  const shortLoc = (item) => {
    const loc = String(item.location || "").trim();
    if (!loc) return "India";
    const parts = loc.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 1) return parts[0];
    return parts.slice(-2).join(", ");
  };

  const shortTitle = (title) => String(title || "").replace(/^[^\w\s]{1,4}\s*/, "").trim() || "Destination";

  const daysCount = (item) => (Array.isArray(item.opening_days) ? item.opening_days.length : 0);

  const imagesOf = (item, max) => {
    const arr = [item.thumbnail, ...(Array.isArray(item.videourl) ? item.videourl : [])].filter(Boolean);
    return max ? arr.slice(0, max) : arr;
  };

  /* All media for a place: images first (capped), then every real video —
     videos are never cut off even when the gallery is large. */
  const mediaOf = (item, maxImgs) => {
    const all = [item.thumbnail, ...(Array.isArray(item.videourl) ? item.videourl : [])].filter(Boolean);
    const imgs = all.filter((u) => !isVideoUrl(u));
    const vids = all.filter(isVideoUrl);
    return [...imgs.slice(0, maxImgs || 12), ...vids];
  };

  /* ---------- media / text helpers ---------- */
  const isVideoUrl = (u) => {
    if (!u) return false;
    const s = String(u).toLowerCase();
    if (/\.(mp4|webm|mov|m4v|ogv|ogg|m3u8)(\?|#|$)/.test(s)) return true;
    return /\/video(s)?\//.test(s) && !/\.(jpg|jpeg|png|webp|gif|avif)(\?|#|$)/.test(s);
  };
  const slideOf = (src) => ({ src, video: isVideoUrl(src) });
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const excerpt = (md, n) =>
    String(md || "")
      .replace(/[#>*_`\-\[\]()!]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, n || 140);

  /* ---------- card / row builders ---------- */
  function cardHTML(item) {
    const { rating, reviews } = ratingFor(item.id);
    const price = fmtPrice(item.ticket_prices && item.ticket_prices.indian);
    const tag = (tagsOf(item)[1] || tagsOf(item)[0] || "Heritage").slice(0, 16);
    const days = daysCount(item);
    return `
    <a class="dcard" href="details.html?id=${encodeURIComponent(item.id)}" data-title="${esc(item.title)}">
      <div class="media">
        <img src="${esc(item.thumbnail)}" alt="${esc(item.title)}" loading="lazy" decoding="async"
             onerror="this.onerror=null;this.src='${FALLBACK_IMG}';">
        <span class="cat-badge">${esc(tag)}</span>
        <span class="heart" role="button" aria-label="Save" onclick="event.preventDefault();this.classList.toggle('on');this.querySelector('i').classList.toggle('fa-solid');">
          <i class="fa-regular fa-heart"></i>
        </span>
        <span class="price-badge ${Number(item.ticket_prices?.indian) ? "" : "free"}">${esc(price)}</span>
      </div>
      <div class="dbody">
        <h3 class="dtitle">${esc(item.title)}</h3>
        <div class="dloc"><i class="fa-solid fa-location-dot"></i><span>${esc(shortLoc(item))}</span></div>
        <div class="dmeta">
          <span class="rating-num">${rating}</span>
          ${dotsHtml(rating)}
          <span class="revs">(${reviews.toLocaleString("en-IN")})</span>
          <span class="meta-spacer"></span>
          ${days ? `<span class="days-tag">${days} days</span>` : ""}
        </div>
      </div>
    </a>`;
  }

  function rowHTML(item) {
    const { rating, reviews } = ratingFor(item.id);
    const price = fmtPrice(item.ticket_prices && item.ticket_prices.indian);
    return `
    <a class="rrow" href="details.html?id=${encodeURIComponent(item.id)}">
      <img class="thumb" src="${esc(item.thumbnail)}" alt="${esc(item.title)}" loading="lazy" decoding="async"
           onerror="this.onerror=null;this.src='${FALLBACK_IMG}';">
      <div class="rbody">
        <div class="rtitle">${esc(item.title)}</div>
        <div class="rloc"><i class="fa-solid fa-location-dot"></i>${esc(shortLoc(item))}</div>
        <div class="dmeta">
          <span class="rating-num">${rating}</span>${dotsHtml(rating)}
          <span class="revs">(${reviews.toLocaleString("en-IN")})</span>
        </div>
      </div>
      <div class="rprice">${esc(price)}</div>
    </a>`;
  }

  /* Bento media card — used by "Recent collection" (image-first, scrim + overlay text) */
  function bentoHTML(item) {
    const { rating } = ratingFor(item.id);
    const price = fmtPrice(item.ticket_prices && item.ticket_prices.indian);
    return `
    <a class="b-item" href="details.html?id=${encodeURIComponent(item.id)}" data-title="${esc(item.title)}">
      <img src="${esc(item.thumbnail)}" alt="${esc(item.title)}" loading="lazy" decoding="async"
           onerror="this.onerror=null;this.src='${FALLBACK_IMG}';">
      <span class="b-scrim"></span>
      <span class="b-price ${Number(item.ticket_prices?.indian) ? "" : "free"}">${esc(price)}</span>
      <span class="b-rate"><i class="fa-solid fa-star"></i>${rating}</span>
      <div class="b-meta">
        <h3 class="b-title">${esc(item.title)}</h3>
        <div class="b-loc"><i class="fa-solid fa-location-dot"></i>${esc(shortLoc(item))}</div>
      </div>
    </a>`;
  }

  /* ---------- skeleton builders ---------- */
  const skCard = () => `
    <div class="sk-card">
      <div class="sk sk-img"></div>
      <div class="sk" style="height:12px;width:82%;"></div>
      <div class="sk" style="height:10px;width:58%;"></div>
      <div class="sk" style="height:10px;width:70%;"></div>
    </div>`;
  const skCards = (n) => Array.from({ length: n }, skCard).join("");

  const skRow = () => `
    <div class="sk-row">
      <div class="sk" style="width:76px;height:76px;border-radius:14px;flex:none;"></div>
      <div style="flex:1">
        <div class="sk" style="height:12px;width:70%;margin-bottom:8px;"></div>
        <div class="sk" style="height:10px;width:45%;"></div>
      </div>
      <div class="sk" style="width:52px;height:14px;border-radius:20px;"></div>
    </div>`;
  const skRows = (n) => Array.from({ length: n }, skRow).join("");

  /* bento placeholders keep the exact final layout (no layout shift) */
  const skBento = (n) => Array.from({ length: n }, () => `
    <div class="b-item">
      <div class="sk" style="position:absolute;inset:0;border-radius:0;"></div>
    </div>`).join("");

  /* ---------- nav shells ---------- */
  const NAV_ITEMS = [
    { id: "home", label: "Home", href: "index.html" },
    { id: "explore", label: "Explore", href: "search.html?query=Uttar%20Pradesh" },
    { id: "tours", label: "Tours", href: "page2.html" },
    { id: "all", label: "Destinations", href: "all.html" },
  ];

  function topNav(active, opts) {
    opts = opts || {};
    const links = NAV_ITEMS
      .map((n) => `<a href="${n.href}" class="${n.id === active ? "active" : ""}">${n.label}</a>`)
      .join("");
    const back = opts.back ? `
      <a class="icon-btn" href="javascript:history.length>1?history.back():location.href='index.html'" aria-label="Back">
        <i class="fa-solid fa-arrow-left"></i>
      </a>` : "";
    const searchBox = opts.searchBox ? `
      <div class="topnav-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input id="topSearch" placeholder="Search destinations, cities, temples…">
      </div>` : "";
    return `
    <header class="topnav">
      <div class="container topnav-inner">
        <div class="d-flex" style="display:flex;align-items:center;gap:10px;">
          ${back}
          <a class="brand" href="index.html">
            <span class="brand-logo"><i class="fa-solid fa-compass"></i></span>
            <span>Travella</span>
          </a>
        </div>
        <nav class="nav-links">${links}</nav>
        ${searchBox}
        <div class="d-flex" style="display:flex;align-items:center;gap:8px;">
          <a class="icon-btn" href="search.html?focus=1" data-search-nav aria-label="Search"><i class="fa-solid fa-magnifying-glass"></i></a>
          <a class="icon-btn ${active === "profile" ? "active" : ""}" href="profile.html" aria-label="Profile"><i class="fa-regular fa-circle-user"></i></a>
        </div>
      </div>
    </header>`;
  }

  function bottomDock(active) {
    return `
    <nav class="dock" aria-label="Main navigation">
      <a href="index.html" class="${active === "home" ? "active" : ""}" aria-label="Home"><i class="fa-solid fa-house"></i></a>
      <a href="search.html?query=Uttar%20Pradesh" class="${active === "explore" ? "active" : ""}" aria-label="Explore"><i class="fa-regular fa-compass"></i></a>
      <a href="page2.html" class="dock-cta ${active === "tours" ? "active" : ""}" aria-label="Tours"><i class="fa-solid fa-plus"></i></a>
      <a href="all.html" class="${active === "all" ? "active" : ""}" aria-label="Destinations"><i class="fa-regular fa-heart"></i></a>
      <a href="profile.html" class="${active === "profile" ? "active" : ""}" aria-label="Profile"><i class="fa-regular fa-circle-user"></i></a>
    </nav>`;
  }

  function renderShell(active, opts) {
    opts = opts || {};
    document.body.insertAdjacentHTML("afterbegin", topNav(active, opts));
    document.body.insertAdjacentHTML("beforeend", bottomDock(active));
    document.body.classList.add("has-dock");
    wireTopSearch();
    wireSearchIcon();
  }

  function wireTopSearch() {
    const input = document.getElementById("topSearch");
    if (!input) return;
    const go = () => {
      const v = input.value.trim();
      if (v) window.location.href = `search.html?query=${encodeURIComponent(v)}`;
    };
    input.addEventListener("keydown", (e) => e.key === "Enter" && go());
  }

  /* One search behaviour everywhere:
     - pages with a nav search box → focus it
     - pages without one → go to the search hub (no fake query) */
  function wireSearchIcon() {
    qsa("[data-search-nav]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const input = document.getElementById("topSearch");
        if (input) {
          input.focus();
          input.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          window.location.href = "search.html?focus=1";
        }
      });
    });
  }

  /* ---------- data fetchers (with 5-min in-tab cache for faster loads) ---------- */
  const cacheGet = (key) => {
    try {
      const raw = sessionStorage.getItem("tv_cache:" + key);
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (Date.now() - o.t > 5 * 60 * 1000) return null;
      return o.d;
    } catch (e) { return null; }
  };
  const cacheSet = (key, data) => {
    try { sessionStorage.setItem("tv_cache:" + key, JSON.stringify({ t: Date.now(), d: data })); } catch (e) {}
  };

  async function fetchList(category, page) {
    const key = `list:${category}:${page || 1}`;
    const hit = cacheGet(key);
    if (hit) return hit;
    const res = await fetch(`${API}/sundarikanya1?category=${encodeURIComponent(category)}&page=${page || 1}`);
    const json = await res.json();
    const data = json.data || [];
    cacheSet(key, data);
    return data;
  }

  async function fetchSearch(query, limit) {
    const key = `search:${query}:${limit || 36}`;
    const hit = cacheGet(key);
    if (hit) return hit;
    const res = await fetch(`${API}/search?query=${encodeURIComponent(query)}&page=1&limit=${limit || 36}`);
    const json = await res.json();
    const data = json.data || [];
    cacheSet(key, data);
    return data;
  }

  async function fetchPlace(id) {
    const key = `place:${id}`;
    const hit = cacheGet(key);
    if (hit) return hit;
    const json = await (await fetch(`${API}/sundarikanya?id=${encodeURIComponent(id)}`)).json();
    cacheSet(key, json);
    return json;
  }

  /* ---------- social: Firestore-backed with localStorage fallback ----------
     Data model (see firestore.rules):
       likes/{itemId}/likes/{uid}  → { uid, itemId, at }   (each user only their own)
       users/{uid}                 → { name, mobile, email, avatar, updatedAt }
     firebase.js provides window.FB. When Firebase is unavailable or the
     visitor is signed out we fall back to localStorage so the UI keeps
     working everywhere. Return shapes stay the same as before:
       get(id)    → { liked: boolean, count: number }
       toggle(id) → { liked: boolean, count: number }      */
  const LS_LIKES = "tv_likes_v1";
  const LS_LC = "tv_likes_count_v1";
  const hashNum = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
  const likeBase = (id) => 120 + (hashNum(String(id)) % 380);
  const countCache = (() => { try { return JSON.parse(localStorage.getItem(LS_LC) || "{}"); } catch (e) { return {}; } })();
  const saveCountCache = () => { try { localStorage.setItem(LS_LC, JSON.stringify(countCache)); } catch (e) {} };

  const localLikes = {
    get(itemId) {
      const set = JSON.parse(localStorage.getItem(LS_LIKES) || "[]");
      return { liked: set.includes(String(itemId)), count: countCache[itemId] || likeBase(itemId) };
    },
    toggle(itemId) {
      const set = JSON.parse(localStorage.getItem(LS_LIKES) || "[]");
      const key = String(itemId);
      const liked = !set.includes(key);
      localStorage.setItem(LS_LIKES, JSON.stringify(liked ? [...set, key] : set.filter((x) => x !== key)));
      countCache[key] = (countCache[key] || likeBase(itemId)) + (liked ? 1 : -1);
      saveCountCache();
      return { liked, count: countCache[key] };
    },
  };

  async function fbLikeState(itemId, uid) {
    const { db, fs } = await FB.ready;
    const [me, cnt] = await Promise.all([
      fs.getDoc(fs.doc(db, "likes", String(itemId), "likes", uid)),
      fs.getCountFromServer(fs.collection(db, "likes", String(itemId), "likes")),
    ]);
    countCache[itemId] = cnt.data().count;
    saveCountCache();
    return { liked: me.exists(), count: cnt.data().count };
  }

  const likeAPI = {
    async get(itemId) {
      const u = FB.currentUser();
      if (u && FB.db) {
        try { return await fbLikeState(itemId, u.uid); }
        catch (e) { console.warn("like get fell back to local:", e); }
      }
      return localLikes.get(itemId);
    },
    async toggle(itemId) {
      const u = FB.currentUser();
      if (u && FB.db && FB.fs) {
        try {
          const { db, fs } = await FB.ready;
          const ref = fs.doc(db, "likes", String(itemId), "likes", u.uid);
          const me = await fs.getDoc(ref);
          if (me.exists()) await fs.deleteDoc(ref);
          else await fs.setDoc(ref, { uid: u.uid, itemId: String(itemId), at: fs.serverTimestamp() });
          try { return await fbLikeState(itemId, u.uid); }
          catch (e) {
            const liked = !me.exists();
            countCache[itemId] = (countCache[itemId] || likeBase(itemId)) + (liked ? 1 : -1);
            saveCountCache();
            return { liked, count: countCache[itemId] };
          }
        } catch (e) { console.warn("like toggle fell back to local:", e); }
      }
      return localLikes.toggle(itemId);
    },
  };

  /* ---------- profile: Firestore users/{uid} + localStorage mirror ----------
     profileAPI.get(uid)  → { name, mobile, email, avatar, ... } | null
     profileAPI.save(p, uid) → persisted profile object
     Firestore wins when available; localStorage mirrors it for offline use
     and doubles as a migration path for profiles saved before Firestore. */
  const profileAPI = {
    KEY: "tv_profile_v1",
    keyFor(uid) { return uid ? this.KEY + ":" + uid : this.KEY; },
    localGet(uid) {
      try { const raw = localStorage.getItem(this.keyFor(uid)); return raw ? JSON.parse(raw) : null; }
      catch (e) { return null; }
    },
    async get(uid) {
      const local = this.localGet(uid);
      if (!uid || !FB.currentUser() || !FB.db) return local;
      try {
        const { db, fs } = await FB.ready;
        const snap = await fs.getDoc(fs.doc(db, "users", uid));
        if (snap.exists()) return Object.assign({}, local, snap.data());
      } catch (e) { console.warn("profile get fell back to local:", e); }
      return local;
    },
    async save(p, uid) {
      const safe = { name: String(p.name || ""), mobile: String(p.mobile || ""), email: String(p.email || ""), avatar: Number(p.avatar) || 0, uid: String(uid || "") };
      try { localStorage.setItem(this.keyFor(uid), JSON.stringify(safe)); } catch (e) {}
      if (uid && FB.currentUser() && FB.db) {
        try {
          const { db, fs } = await FB.ready;
          await fs.setDoc(fs.doc(db, "users", uid), Object.assign({}, safe, { updatedAt: fs.serverTimestamp() }), { merge: true });
        } catch (e) { console.warn("profile save stayed local only:", e); }
      }
      return safe;
    },
  };

  /* ---------- reveal on scroll ---------- */
  function initReveal() {
    const els = qsa(".reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.08 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- sliding carousel (images + videos) ----------
     host: an empty element that fills its parent (e.g. .carousel-fill)
     slides: array of {src, video} or plain URL strings */
  function createCarousel(host, slides, opts) {
    opts = Object.assign(
      { counter: true, counterPos: "bottom-right", dots: true, autoplay: true, interval: 4500 },
      opts || {}
    );
    const list = slides.map((s) => (typeof s === "string" ? slideOf(s) : s));
    if (!list.length) return null;
    let idx = 0, timer = null, startX = null, startY = null, dx = 0, dy = 0;

    host.classList.add("carousel");
    host.innerHTML = `
      <div class="carousel-track"></div>
      ${opts.dots ? '<div class="carousel-dots"></div>' : ""}
      <button class="carousel-arrow prev" aria-label="Previous"><i class="fa-solid fa-chevron-left"></i></button>
      <button class="carousel-arrow next" aria-label="Next"><i class="fa-solid fa-chevron-right"></i></button>
      ${opts.counter ? `<div class="carousel-counter ${opts.counterPos}"><i class="fa-regular fa-images"></i> <b>1</b> / ${list.length}</div>` : ""}
    `;
    const track = host.querySelector(".carousel-track");
    const dotsEl = host.querySelector(".carousel-dots");
    const counterEl = host.querySelector(".carousel-counter b");
    const prevBtn = host.querySelector(".carousel-arrow.prev");
    const nextBtn = host.querySelector(".carousel-arrow.next");

    track.innerHTML = list
      .map((s, i) => `
        <div class="carousel-slide ${s.video ? "is-video" : ""}" role="group" aria-label="Slide ${i + 1}">
          ${s.video
            ? `<video src="${esc(s.src)}" controls playsinline preload="metadata" muted loop></video>`
            : `<img src="${esc(s.src)}" alt="" loading="${i === 0 ? "eager" : "lazy"}" decoding="async" onerror="this.onerror=null;this.src='${FALLBACK_IMG}';"></img>`}
        </div>`)
      .join("");

    /* video error fallback + autoplay wiring */
    track.querySelectorAll("video").forEach((v) => {
      v.addEventListener("error", () => {
        const slide = v.closest(".carousel-slide");
        if (slide) slide.innerHTML = `<img src="${FALLBACK_IMG}" alt="">`;
      });
      v.addEventListener("play", stop);
      v.addEventListener("pause", play);
      v.addEventListener("ended", () => goTo(idx + 1));
    });

    const dots = [];
    if (dotsEl) {
      list.forEach((_, i) => {
        const b = document.createElement("button");
        b.className = "dot-nav" + (i === 0 ? " active" : "");
        b.setAttribute("aria-label", "Go to slide " + (i + 1));
        b.addEventListener("click", () => goTo(i));
        dotsEl.appendChild(b);
        dots.push(b);
      });
    }

    function goTo(i, instant) {
      if (!list.length) return;
      idx = (i + list.length) % list.length;
      track.style.transition = instant ? "none" : "";
      track.style.transform = `translateX(-${idx * 100}%)`;
      if (counterEl) counterEl.textContent = idx + 1;
      dots.forEach((d, k) => d.classList.toggle("active", k === idx));
      const cur = track.children[idx];
      const curVideo = cur ? cur.querySelector("video") : null;
      track.querySelectorAll("video").forEach((v) => { if (v !== curVideo) v.pause(); });
      if (curVideo) {
        stop(); // no slideshow timer while a video is playing
        curVideo.muted = true; // autoplay with sound is blocked by browsers
        curVideo.play().catch(() => {});
      } else {
        play();
      }
      if (opts.onchange) opts.onchange(idx, list);
    }

    function play() {
      stop();
      if (!opts.autoplay || list.length < 2) return;
      const cur = track.children[idx];
      if (cur && cur.querySelector("video")) return;
      timer = setInterval(() => goTo(idx + 1), opts.interval);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    prevBtn.addEventListener("click", () => goTo(idx - 1));
    nextBtn.addEventListener("click", () => goTo(idx + 1));

    /* swipe / drag (works for touch & mouse) */
    const onDown = (e) => { startX = e.clientX; startY = e.clientY; dx = 0; dy = 0; stop(); };
    const onMove = (e) => {
      if (startX == null) return;
      dx = e.clientX - startX;
      dy = e.clientY - startY;
      if (Math.abs(dx) > Math.abs(dy)) {
        track.style.transform = `translateX(calc(${-idx * 100}% + ${dx}px))`;
        track.style.transition = "none";
      }
    };
    const onUp = () => {
      if (startX == null) return;
      track.style.transition = "";
      if (Math.abs(dx) > 45) goTo(idx + (dx < 0 ? 1 : -1));
      else goTo(idx);
      startX = null;
    };
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);

    host.addEventListener("mouseenter", stop);
    host.addEventListener("mouseleave", play);
    host.setAttribute("tabindex", "0");
    host.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") goTo(idx - 1);
      if (e.key === "ArrowRight") goTo(idx + 1);
    });
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : play()));

    goTo(0, true);
    play();
    return { goTo, next: () => goTo(idx + 1), prev: () => goTo(idx - 1), count: list.length, current: () => idx };
  }

  /* stagger children of an element for a smooth cascade */
  function stagger(el) {
    if (!el) return;
    Array.from(el.children).forEach((c, i) => {
      c.style.animation = `fadeUp 0.55s ${0.04 * i + 0.05}s var(--ease) both`;
    });
  }

  /* ---------- export ---------- */
  window.Travel = {
    API, FALLBACK_IMG,
    esc, qs, qsa,
    fmtPrice, fmtTime, timeRange, ratingFor, dotsHtml,
    tagsOf, shortLoc, shortTitle, daysCount, imagesOf, mediaOf,
    isVideoUrl, slideOf, shuffle, excerpt,
    cardHTML, rowHTML, bentoHTML, skCards, skRows, skBento,
    topNav, bottomDock, renderShell, wireTopSearch, wireSearchIcon,
    createCarousel, stagger,
    fetchList, fetchSearch, fetchPlace,
    likeAPI, profileAPI,
    initReveal,
  };
})();
