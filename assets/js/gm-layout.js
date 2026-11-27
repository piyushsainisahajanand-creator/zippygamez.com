(() => {
  "use strict";
  if (window.__GM_LAYOUT__) return;
  window.__GM_LAYOUT__ = true;

  // ---- Which kind of page is this? (playgames detail/play, app, topgames) ----
  const path = location.pathname || "/";
  const KINDS = ["playgames", "app", "topgames"];
  let kind = "", marker = -1;
  for (const k of KINDS) {
    const i = path.indexOf("/" + k + "/");
    if (i >= 0) { kind = k; marker = i; break; }
  }
  if (!kind) return;
  const root = path.slice(0, marker + 1);
  const rest = path.slice(marker + kind.length + 2).split("/");
  const current = decodeURIComponent(rest[0] || "").toLowerCase();
  if (!current) return; // section index pages are left alone

  const detail = document.querySelector(".detail-page");
  if (!detail) return;
  document.body.classList.add("gm-layout", "gm-page");
  // The CSS keeps .detail-page invisible until "gm-ready" is set, so the old layout never flashes before the new one is built
  // (the CSS also reveals the page on its own after a few seconds, in case this script cannot finish).
  const ready = () => document.body.classList.add("gm-ready");
  setTimeout(ready, 3500);

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---- Catalogue per section, normalised to {slug,name,logo,local,cat,href} ----
  const SOURCES = {
    playgames: {
      url: "assets/data/playgames-lite.json?v=gm1",
      norm: (g) => g && g.slug && { slug: g.slug, name: g.name, logo: g.logo, local: g.localLogo, cat: g.category, href: root + "playgames/" + encodeURIComponent(g.slug) + "/index.html" },
    },
    app: {
      url: "assets/data/apps-lite.json?v=gm1",
      norm: (g) => {
        if (!g || !g.href) return null;
        const slug = decodeURIComponent(g.href.replace(/\/+$/, "").split("/").pop());
        return { slug, name: g.title, logo: g.icon, local: g.localIcon, cat: g.category, href: root + g.href.replace(/^\//, "") };
      },
    },
    topgames: {
      url: "games.json?v=gm1",
      norm: (g) => g && g.slug && { slug: g.slug, name: g.title, logo: g.icon, local: g.localIcon, cat: g.category, href: root + "topgames/" + encodeURIComponent(g.slug) + "/index.html" },
    },
  };
  const src = SOURCES[kind];
  const noun = kind === "app" ? "Apps" : "Games"; // section labels: "Trending Apps" on app pages

  const tile = (g) => {
    // Remote cover first, local copy only as the fallback: the local /assets/media/*.webp files are not on every server
    // (a missing local file would be a 404 on every tile before the fallback kicks in).
    const localSrc = g.local ? root + g.local.replace(/^\//, "") : "";
    const first = g.logo || localSrc;
    const fb = g.logo && localSrc ? ` onerror="this.onerror=null;this.src='${esc(localSrc)}'"` : "";
    return `<a href="${esc(g.href)}" title="${esc(g.name)}"><img src="${esc(first)}"${fb} alt="${esc(g.name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer"></a>`;
  };

  const DISCLAIMER = kind === "playgames"
    ? "Games on ZippyGamez are provided by third-party publishers through official HTML5 embeds and may show their own ads. ZippyGamez does not own or modify these games. All game names, logos and trademarks belong to their respective owners."
    : "Download buttons on ZippyGamez open the official Google Play or App Store listing. ZippyGamez does not host these apps and games, so please review the ratings, permissions and in-app purchases on the store page before installing. All names, logos and trademarks belong to their respective owners.";
  const WELCOME = "Welcome to ZippyGamez! Here you can browse a growing library of playable browser games, store game guides and app details, all gathered in one place and refreshed regularly so you spend less time searching. Playable games open through official HTML5 embeds, and every download button leads to an official store listing such as Google Play or the App Store. Not sure what to try next? Check our trending and editor's choice lists, which highlight popular, well-rated titles. Enjoy your time with us!";
  // Icon, then "Disclaimer:" and the text after it (same format in Details and at the page bottom)
  const STORE_TEXT = "The game and app download addresses on this page lead to the official app marketplaces, the Apple App Store and Google Play. ZippyGamez only links to these listings for your convenience and does not host the files, so please review the ratings and permissions on the store page before installing.";
  const disclaimerEl = (big, withStoreNote) => {
    const d = document.createElement("div");
    d.className = "gm-disclaimer" + (big ? " gm-disclaimer-box" : "");
    d.innerHTML = '<div class="gm-disc-row"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3zm-1.2 14.2-3.5-3.5 1.4-1.4 2.1 2.1 4.6-4.6 1.4 1.4-6 6z"/></svg>' +
      '<p class="gm-disc-text"><strong>Disclaimer:</strong> </p></div>';
    d.querySelector(".gm-disc-text").appendChild(document.createTextNode(withStoreNote ? STORE_TEXT : WELCOME));
    if (withStoreNote) {
      const pill = document.createElement("a");
      pill.className = "gm-disc-pill";
      pill.href = root + kind + "/index.html"; // the section's main page (app/, topgames/ or playgames/)
      pill.textContent = kind === "app" ? "App recommendations" : "Game recommendations";
      d.querySelector(".gm-disc-text").appendChild(document.createTextNode(" "));
      d.querySelector(".gm-disc-text").appendChild(pill);
    }
    return d;
  };

  // Text shown inside the footer's "ZippyGamez" About card
  const FOOTER_TAGLINE = "ZippyGamez helps users explore apps, playable browser games, store game details, and helpful articles in a clear, mobile-friendly layout.";

  // ---- Store buttons (Google Play / App Store) with QR codes ----
  const itemName = ((document.querySelector(".app-title .title, #gameTitle, h1") || {}).textContent || current).trim();
  const links = {
    play: "https://play.google.com/store/search?q=" + encodeURIComponent(itemName) + "&c=apps",
    // Default: the App Store's own search page for this name (apps.apple.com/us/iphone/search works; /us/search returns 404).
    // storeBlock() upgrades it to the exact app link when Apple's lookup finds an app with the same name.
    apple: "https://apps.apple.com/us/iphone/search?term=" + encodeURIComponent(itemName),
  };
  const qrReady = new Promise((resolve) => {
    if (window.qrcode) return resolve(true);
    const s = document.createElement("script");
    s.src = root + "assets/js/qrcode.min.js?v=1";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
  const renderQr = (img, url) => qrReady.then((ok) => {
    if (!ok || !window.qrcode) { delete img.dataset.ready; return; }
    const q = window.qrcode(0, "M");
    q.addData(url);
    q.make();
    img.src = q.createDataURL(6, 2);
    img.dataset.ready = "1";
  });
  function storeBlock() {
    const wrap = document.createElement("div");
    wrap.className = "gm-stores";
    const item = (key, label, glyph) =>
      '<div class="gm-store"><a class="gm-store-btn" data-store="' + key + '" target="_blank" rel="noopener" href="' + links[key] + '">' +
      '<span class="gm-store-ico">' + glyph + '</span><span>' + label + '</span></a>' +
      '<div class="gm-qr-pop"><img class="gm-qr" alt="QR code for ' + label + '" width="120" height="120"><span class="gm-qr-cap">Scan to open</span></div></div>';
    wrap.innerHTML = item("play", "Google Play", "&#9654;") + item("apple", "App Store", "A");
    const refresh = () => wrap.querySelectorAll(".gm-store").forEach((el) => {
      const a = el.querySelector("a");
      const url = links[a.dataset.store];
      if (!url) return;
      a.href = url;
      renderQr(el.querySelector("img"), url);
    });
    refresh();
    // App Store: ask Apple's public iTunes Search API for this exact app. The button appears only for a real match
    // (same name, or "Name: subtitle"); otherwise it stays hidden instead of sending visitors to unrelated search results.
    const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
    const wantLower = itemName.toLowerCase().trim();
    const sameApp = (trackName) => {
      const tn = String(trackName || "").toLowerCase().trim();
      return norm(tn) === norm(wantLower) ||
        (norm(wantLower).length >= 6 && [": ", " - ", " – ", " | "].some((sep) => tn.startsWith(wantLower + sep)));
    };
    fetch("https://itunes.apple.com/search?entity=software&limit=10&country=us&term=" + encodeURIComponent(itemName))
      .then((r) => r.json())
      .then((d) => {
        const hit = (d.results || []).find((x) => sameApp(x.trackName));
        if (hit && hit.trackViewUrl) {
          links.apple = hit.trackViewUrl.split("?")[0];
          refresh();
        }
      })
      .catch(() => {});
    // App/Store pages keep the real Google Play link on their download page: use it when found
    if (kind !== "playgames" && path.indexOf("/download") < 0) {
      fetch(new URL("download/index.html", location.href).href)
        .then((r) => (r.ok ? r.text() : ""))
        .then((t) => {
          const m = t.match(/https:\/\/play\.google\.com\/store\/apps\/details\?[^"'<\s]+/);
          if (m) { links.play = m[0].replace(/&amp;/g, "&"); refresh(); }
        })
        .catch(() => {});
    }
    return wrap;
  }

  // ---- Details: rebuild as plain elements (own classes only) ----
  const oldReview = document.querySelector(".review");
  const oldEntry = oldReview && oldReview.querySelector(".entry");
  let review = null;

  const inline = (from, to) => {
    from.childNodes.forEach((n) => {
      if (n.nodeType === 3) { to.appendChild(document.createTextNode(n.textContent)); return; }
      if (n.nodeType !== 1) return;
      const t = n.tagName;
      if (t === "STRONG" || t === "B") { const e = document.createElement("strong"); inline(n, e); to.appendChild(e); }
      else if (t === "EM" || t === "I") { const e = document.createElement("em"); inline(n, e); to.appendChild(e); }
      else if (t === "A" && /^(https?:|\/|\.)/.test(n.getAttribute("href") || "")) {
        const e = document.createElement("a"); e.href = n.getAttribute("href"); e.rel = "noopener"; inline(n, e); to.appendChild(e);
      } else if (t === "BR") to.appendChild(document.createElement("br"));
      else inline(n, to);
    });
  };
  const mk = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };

  if (oldReview && oldEntry) {
    review = mk("section", "gm-details gm-card gm-collapsible");
    review.innerHTML = '<h5 class="gm-title gm-details-title">Details</h5><div class="gm-details-body"></div>' +
      '<div class="gm-more-wrap"><button type="button" class="gm-more">SHOW MORE</button></div>';
    const body = review.querySelector(".gm-details-body");

    const nodes = [];
    Array.from(oldEntry.children).forEach((c) => {
      if (c.hidden) return;
      if (c.classList.contains("detail-block")) Array.from(c.children).forEach((x) => { if (!x.hidden) nodes.push(x); });
      else nodes.push(c);
    });
    let cur = null;
    const flush = () => { if (cur && cur.children.length) body.appendChild(cur); cur = null; };
    const ensure = () => cur || (cur = mk("div", "gm-d-block"));
    nodes.forEach((n) => {
      const t = n.tagName;
      if (t === "H1" || t === "H2" || t === "H3") {
        flush(); cur = mk("div", "gm-d-block");
        const h = mk("h3", "gm-d-h"); inline(n, h); cur.appendChild(h);
      } else if (t === "P") {
        if (!n.textContent.trim()) return;
        const p = mk("p", "gm-d-p"); inline(n, p); ensure().appendChild(p);
      } else if (t === "UL" || t === "OL") {
        const ul = mk("ul", "gm-d-ul");
        n.querySelectorAll(":scope > li").forEach((li) => { const l = document.createElement("li"); inline(li, l); ul.appendChild(l); });
        if (ul.children.length) ensure().appendChild(ul);
      } else if (n.classList && n.classList.contains("online-faq-list")) {
        n.querySelectorAll(".faq-item").forEach((f) => {
          const q = f.querySelector("h3, h4"), a = f.querySelector("p");
          if (q) { const h = mk("h4", "gm-d-q"); inline(q, h); ensure().appendChild(h); }
          if (a) { const p = mk("p", "gm-d-p"); inline(a, p); ensure().appendChild(p); }
        });
      } else if (n.textContent && n.textContent.trim()) {
        const p = mk("p", "gm-d-p gm-d-note"); inline(n, p); ensure().appendChild(p);
      }
    });
    flush();

    review.appendChild(storeBlock());
    review.appendChild(disclaimerEl(false, true));
    oldReview.parentNode.insertBefore(review, oldReview);
    oldReview.style.display = "none";
    review.querySelector(".gm-more").addEventListener("click", (e) => {
      const open = review.classList.toggle("gm-open");
      e.currentTarget.textContent = open ? "SHOW LESS" : "SHOW MORE";
    });
  }

  // ---- Side columns, strip, Similar, Editor's Choice ----
  const getCat = (k) => fetch(root + SOURCES[k].url).then((r) => r.json()).then((raw) => raw.map(SOURCES[k].norm).filter(Boolean)).catch(() => []);
  // Play-games pages also need the Store catalogue for the mixed Trending box; no other page type needs a second catalogue
  const keys = Array.from(new Set([kind].concat(kind === "playgames" ? ["topgames"] : [])));
  Promise.all(keys.map(getCat))
    .then((res) => {
      const cats = {};
      keys.forEach((k, i) => (cats[k] = res[i]));
      const all = cats[kind];

      // Image rescue: the page's own images point at a local mirror (img.gamepix.com/...) and then at /assets/media/*.webp.
      // If neither exists on this server, fall back to the game's remote cover from the catalogue (matched by name).
      const logoByName = new Map();
      Object.keys(cats).forEach((k) => (cats[k] || []).forEach((g) => { if (g && g.logo) logoByName.set(String(g.name).trim().toLowerCase(), g.logo); }));
      const rescueImg = (img) => {
        if (!img || img.dataset.gmRescued) return;
        if ((img.currentSrc || img.src || "").indexOf("/assets/media/") < 0) return;
        const remote = logoByName.get(String(img.alt || "").trim().toLowerCase());
        if (!remote) return;
        img.dataset.gmRescued = "1";
        img.removeAttribute("srcset");
        img.src = remote;
      };
      document.addEventListener("error", (e) => { if (e.target && e.target.tagName === "IMG") rescueImg(e.target); }, true);
      document.querySelectorAll("img").forEach((img) => { if (img.complete && img.naturalWidth === 0) rescueImg(img); });
      const me = all.find((g) => g.slug.toLowerCase() === current);
      const list = all.filter((g) => g.slug.toLowerCase() !== current);
      if (list.length < 8) return;

      const grid = (t, a) => `<section class="gm-card"><h5 class="gm-title">${t}</h5><div class="gm-grid">${a.map(tile).join("")}</div></section>`;

      // Trending: rotates in place every ROTATE_MS (wall-clock aligned)
      const ROTATE_MS = 3 * 60 * 1000; // use 5 * 60 * 1000 for 5 minutes
      const TREND_COUNT = 30;
      // Pinned trending names (matched against the Store catalogue); the rest rotate
      const TRENDING_NAMES = ["delta force", "once human", "pubg", "free fire", "call of duty", "first light", "horizon 3", "cyberpunk", "the elder scrolls", "forza horizon 6", "resident evil requiem", "fortnite", "minecraft", "war thunder", "resident evil 9", "god of war egypt", "red dead redemption 2", "elden ring", "the legend of zelda", "arknights endfield", "pokemon champions", "castlevania belmonts curse", "roblox", "asphalt 8", "subway surfers", "candy crush", "block blast", "angry birds", "ludo king", "my talking tom"];
      const nz = (s) => String(s).toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
      // Play-games pages mix two kinds of icons: half top store games (pinned names first), half our own playable games.
      // Apps pages use their own app list.
      const mixed = kind === "playgames"; // only the Trending box on Play-games pages mixes store + playable games
      const storeList = kind === "app" ? [] : (cats.topgames || []).filter((g) => !(kind === "topgames" && g.slug.toLowerCase() === current));
      const pinned = [];
      TRENDING_NAMES.forEach((q) => {
        const hit = storeList.find((g) => nz(g.name).includes(nz(q)) && !pinned.includes(g));
        if (hit) pinned.push(hit);
      });
      const fillers = (kind === "app" ? list : storeList).filter((g) => !pinned.includes(g)).slice(0, 120);
      const playablePool = (kind === "playgames" ? list : []).slice(0, 120);
      // Mixed Trending (Play games pages): store, playable, store, playable ... so every second icon is a game that really plays.
      const mixedAt = (t) => {
        const slot = Math.floor(t / ROTATE_MS);
        const HALF = Math.floor(TREND_COUNT / 2);
        const store = pinned.slice(0, HALF);
        const need = HALF - store.length;
        if (need > 0 && fillers.length) {
          const s = (slot * Math.max(need, 3)) % fillers.length;
          for (let i = 0; i < need; i++) store.push(fillers[(s + i) % fillers.length]);
        }
        const ps = (slot * HALF) % Math.max(playablePool.length, 1);
        const play = Array.from({ length: TREND_COUNT - HALF }, (_, i) => playablePool[(ps + i) % playablePool.length]).filter(Boolean);
        const out = [];
        for (let i = 0; i < TREND_COUNT; i++) {
          const idx = i >> 1;
          const g = i % 2 === 0 ? store[idx] : play[idx];
          if (g) out.push(i % 2 === 0 ? Object.assign({}, g, { isStore: true }) : g);
        }
        return out;
      };
      const trendingAt = (t) => {
        if (mixed) return mixedAt(t);
        const fixed = pinned.slice(0, TREND_COUNT);
        const need = TREND_COUNT - fixed.length;
        if (!fillers.length) return fixed;
        const start = (Math.floor(t / ROTATE_MS) * Math.max(need, 3)) % fillers.length;
        return fixed.concat(Array.from({ length: need }, (_, i) => fillers[(start + i) % fillers.length]));
      };
      const newest = list.slice(-30).reverse();
      const left = document.createElement("aside");
      left.className = "gm-side-left";
      // On Play-games pages: a playable icon opens that game's Play page, a store icon opens that store game's own page
      // (topgames/<game>/). Every other page type keeps each item's own link.
      const trendHref = (g) =>
        mixed && !g.isStore
          ? root + "playgames/" + encodeURIComponent(g.slug) + "/play/index.html"
          : g.href;
      const trendTiles = (arr) => arr.map((g) => Object.assign({}, g, { href: trendHref(g) }));
      left.innerHTML = grid("Trending " + noun, trendTiles(trendingAt(Date.now()))) + grid("Newest " + noun, newest);
      const pageLeft = detail.querySelector(".page-left");
      detail.insertBefore(left, pageLeft);

      const trendGrid = left.querySelector(".gm-grid");
      const swapTrending = () => {
        const next = trendingAt(Date.now());
        Array.from(trendGrid.children).forEach((a, i) => {
          const g = next[i];
          if (!g || (a.querySelector("img") || {}).alt === g.name) return; // same game already shown (links can be identical, so compare the game)
          a.style.transition = "opacity .4s";
          a.style.opacity = "0";
          setTimeout(() => {
            a.href = trendHref(g);
            a.title = g.name;
            const im = a.querySelector("img");
            im.alt = g.name;
            const localSrc = g.local ? root + g.local.replace(/^\//, "") : "";
            im.onerror = function () { this.onerror = null; if (localSrc) this.src = localSrc; };
            im.src = g.logo || localSrc;
            a.style.opacity = "1";
          }, 400 + i * 40);
        });
      };
      setTimeout(() => { swapTrending(); setInterval(swapTrending, ROTATE_MS); }, ROTATE_MS - (Date.now() % ROTATE_MS) + 50);

      // Top icon strip across the full width
      const strip = document.createElement("div");
      strip.className = "gm-strip";
      strip.innerHTML = list.slice(12, 24).map(tile).join("");
      detail.insertBefore(strip, left);

      // Right column: original boxes are hidden (their scripts may still fill them), ours are appended
      let h = 0;
      for (const c of current) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      const pool = list.slice(0, 120); // same section as the page: apps on app pages, games elsewhere
      const hashed = pool.length >= 8 ? Array.from({ length: 8 }, (_, i) => pool[(h + i * 13) % pool.length]) : [];
      // Games pages: the box shows trending games only (the trending list: Delta Force, PUBG, Free Fire, ...), 8 at a time.
      // The 8 change: every page starts at a different point of the list, and the set rotates every ROTATE_MS (see below).
      // Apps pages (and any page where fewer than 8 trending games exist in the catalogue) keep the per-page rotation.
      const adTrend = kind !== "app" && pinned.length >= 8 ? pinned : null;
      const adPicksAt = (t) => {
        const n = adTrend.length;
        const start = (h + Math.floor(t / ROTATE_MS) * 3) % n;
        return Array.from({ length: 8 }, (_, i) => adTrend[(start + i) % n]);
      };
      const picks = adTrend ? adPicksAt(Date.now()) : hashed;
      const right = detail.querySelector(".page-right");
      if (right) {
        Array.from(right.children).forEach((el) => { el.style.display = "none"; });
        const cat = me && me.cat;
        const same = list.filter((g) => g.cat === cat);
        const sim = same.concat(list.filter((g) => g.cat !== cat)).slice(0, 36);
        const wrap = document.createElement("div");
        wrap.innerHTML =
          (sim.length ? `<section class="gm-card gm-similar"><h5 class="gm-title">Similar ${noun}</h5><div class="gm-grid">${sim.map(tile).join("")}</div></section>` : "") +
          (picks.length ? `<section class="gm-card gm-ad-box"><p class="gm-ad-label">Advertisement</p><div class="gm-grid">${picks.map((g) => tile(Object.assign({}, g, { href: root + kind + "/index.html" }))).join("")}</div></section>` : "");
        while (wrap.firstChild) right.appendChild(wrap.firstChild);
      }

      // Advertisement box: swap the trending icons in place every ROTATE_MS (same wall-clock slots as the Trending box).
      // The click target of every tile stays the section's main page, so only the picture and name change.
      const adGrid = adTrend && right ? right.querySelector(".gm-ad-box .gm-grid") : null;
      if (adGrid) {
        const swapAd = () => {
          const next = adPicksAt(Date.now());
          Array.from(adGrid.children).forEach((a, i) => {
            const g = next[i];
            if (!g || (a.querySelector("img") || {}).alt === g.name) return;
            a.style.transition = "opacity .4s";
            a.style.opacity = "0";
            setTimeout(() => {
              a.title = g.name;
              const im = a.querySelector("img");
              const localSrc = g.local ? root + g.local.replace(/^\//, "") : "";
              im.alt = g.name;
              im.onerror = function () { this.onerror = null; if (localSrc) this.src = localSrc; };
              im.src = g.logo || localSrc;
              a.style.opacity = "1";
            }, 400 + i * 40);
          });
        };
        setTimeout(() => { swapAd(); setInterval(swapAd, ROTATE_MS); }, ROTATE_MS - (Date.now() % ROTATE_MS) + 50);
      }

      // Bottom: Similar section (moved full width) + Editor's Choice
      const choice = list.slice(24, 60);
      const editor = document.createElement("section");
      editor.className = "gm-editor gm-card";
      editor.innerHTML = `<h5 class="gm-title">Editor's Choice ${noun}</h5><div class="gm-grid">${choice.map(tile).join("")}</div>`;
      detail.parentNode.insertBefore(editor, detail.nextSibling);
      // Footer: the text lives inside the "ZippyGamez" About card (the bottom box is gone)
      const aboutP = document.querySelector(".site-footer .footer-v2-card p");
      if (aboutP) {
        aboutP.textContent = WELCOME;
        aboutP.classList.add("gm-foot-welcome");
        const tag = document.createElement("p");
        tag.className = "gm-foot-tagline";
        tag.textContent = FOOTER_TAGLINE;
        aboutP.after(tag);
      }

      const findSimilarSection = () => {
        const byId = document.querySelector("#similarGames, #moreGames");
        if (byId) return byId.closest("section");
        return Array.from(detail.querySelectorAll(".page-left > section")).find((s) => /^(similar|more)/i.test((s.querySelector("h5") || {}).textContent || "") && s.querySelector(".game-list")) || null;
      };
      const moveSimilar = () => {
        const sec = findSimilarSection();
        if (!sec || sec.classList.contains("gm-similar-wide")) return;
        sec.classList.add("gm-similar-wide");
        detail.parentNode.insertBefore(sec, editor);
      };
      // Move only once its own script has filled it (or after a timeout), so that script keeps working
      let tries = 0;
      const waitFill = () => {
        const sec = findSimilarSection();
        const gl = sec && sec.querySelector(".game-list");
        if ((gl && gl.children.length) || tries++ > 40) moveSimilar();
        else setTimeout(waitFill, 250);
      };
      waitFill();

      // Balance: trim side columns (whole rows) so they never exceed the middle column
      const midCol = detail.querySelector(".page-left");
      const wide = () => window.matchMedia("(min-width: 1220px)").matches;
      const kids = (col) => Array.from(col.children).filter((el) => el.style.display !== "none");
      const colH = (col) => {
        col.style.alignSelf = "flex-start";
        const k = kids(col);
        k.forEach((el) => (el.style.flex = "none"));
        return k.reduce((s, el) => s + el.offsetHeight, 0) + 10 * Math.max(0, k.length - 1);
      };
      const setCount = (g, n) => Array.from(g.children).forEach((el, i) => { el.style.display = i < n ? "" : "none"; });
      const balance = () => {
        const lg = Array.from(left.querySelectorAll(".gm-grid"));
        const rg = right ? Array.from(right.querySelectorAll(".gm-similar .gm-grid")) : [];
        lg.concat(rg).forEach((g) => setCount(g, g.children.length));
        if (!wide()) return;
        const target = midCol.offsetHeight;
        const trim = (col, grids) => {
          const counts = grids.map((g) => g.children.length);
          let guard = 200;
          while (colH(col) > target && guard-- > 0) {
            let k = 0;
            counts.forEach((n, i) => { if (n > counts[k]) k = i; });
            if (counts[k] <= 3) break;
            counts[k] -= 3;
            grids.forEach((g, i) => setCount(g, counts[i]));
          }
        };
        trim(left, lg);
        if (right && rg.length) trim(right, rg);
        [left, right].forEach((col) => { if (!col) return; col.style.alignSelf = ""; Array.from(col.children).forEach((el) => (el.style.flex = "")); });
      };
      balance();
      window.addEventListener("load", balance);
      let t;
      window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(balance, 150); });
      if (review) review.querySelector(".gm-more").addEventListener("click", () => setTimeout(balance, 60));
      if (window.ResizeObserver) new ResizeObserver(() => { clearTimeout(t); t = setTimeout(balance, 100); }).observe(midCol);
    })
    .catch(() => {})
    .then(() => requestAnimationFrame(ready));
})();
