/***********************
 *  LAZY LOAD ENGINE
 ************************/
class LazyLoad {
  constructor() {
    this.windowHeight = window.innerHeight;
    this.loaded = new WeakSet();
    this.images = [];
    this.addImage = null;
  }

  init(className = "lazy-img") {
    this.images = Array.from(document.getElementsByClassName(className));

    if ("IntersectionObserver" in window) {
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.load(entry.target);
              obs.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "200px" },
      );

      this.images.forEach((img) => obs.observe(img));

      this.addImage = (img) => obs.observe(img);
    } else {
      this.images.forEach((img) => this.load(img));
      this.addImage = (img) => this.load(img);
    }

    return this;
  }

  load(img) {
    if (this.loaded.has(img)) return;

    const src = img.dataset.original;
    const fallback = img.dataset.fallback;
    if (!src) return;

    img.onload = () => img.classList.add("loaded");
    img.onerror = () => {
      if (fallback && img.src !== fallback) {
        img.src = fallback;
        return;
      }
      img.classList.add("loaded");
    };

    img.src = src;
    this.loaded.add(img);
  }
}

window.lazyLoader = null;

/******************************
 *  SIMILAR GAMES SCRIPT
 ******************************/
(function () {
  const TRANSPARENT_PLACEHOLDER =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

  function siteRoot() {
    if (window.__APPCRATE_SITE_ROOT__) return window.__APPCRATE_SITE_ROOT__;
    const path = window.location.pathname || "/";
    const markers = [
      "/topgames/",
      "/playgames/",
      "/app/",
      "/article/",
      "/page/",
      "/assets/",
    ];
    for (const marker of markers) {
      const index = path.indexOf(marker);
      if (index >= 0) {
        window.__APPCRATE_SITE_ROOT__ = path.slice(0, index + 1);
        return window.__APPCRATE_SITE_ROOT__;
      }
    }
    window.__APPCRATE_SITE_ROOT__ = path.replace(/[^/]+$/, "") || "/";
    return window.__APPCRATE_SITE_ROOT__;
  }

  function siteUrl(path) {
    const root = siteRoot();
    const clean = String(path || "").replace(/^\//, "");
    return root + clean;
  }

  const catalogUrls = [
    () => siteUrl("games3399.json?v=remote-first-20260811"),
    () => siteUrl("games.json?v=remote-first-20260811"),
    () => "/games.json?v=remote-first-20260811",
  ];

  async function fetchFirstOk(urlFns) {
    for (const urlFn of urlFns) {
      try {
        const response = await fetch(urlFn());
        if (response.ok) return response;
      } catch (_error) {
        /* try next */
      }
    }
    throw new Error("Store games unavailable");
  }

  function loadStoreGames() {
    if (!window.__APPCRATE_STORE_GAMES_PROMISE__) {
      window.__APPCRATE_STORE_GAMES_PROMISE__ = fetchFirstOk(catalogUrls).then((response) =>
        response.json(),
      );
    }
    return window.__APPCRATE_STORE_GAMES_PROMISE__;
  }

  window.AppcrateLoadStoreGames = loadStoreGames;
  window.AppcrateSiteRoot = siteRoot;
  window.AppcrateSiteUrl = siteUrl;

  function slugFromUrl(url) {
    const match = String(url || "").match(/\/topgames\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function iconFor(game) {
    const slug = game.slug || slugFromUrl(game.url);
    return game.icon || (slug ? siteUrl(`assets/media/topgames/${slug}.webp`) : "");
  }

  function localGameUrl(game) {
    const slug = game.slug || slugFromUrl(game.url);
    return slug ? siteUrl(`topgames/${slug}/index.html`) : game.url || "#";
  }

  function shuffle(arr) {
    arr = arr.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function pickRandom(arr, n) {
    return shuffle(arr).slice(0, n);
  }

  function createGameItem(game) {
    const a = document.createElement("a");
    a.className = "game-item";
    a.href = localGameUrl(game);

    const iconWrap = document.createElement("div");
    iconWrap.className = "game-icon";

    const img = document.createElement("img");
    img.className = "lazy-img";
    img.src = TRANSPARENT_PLACEHOLDER;
    const icon = iconFor(game);
    if (icon) img.setAttribute("data-original", icon);
    const slug = game.slug || slugFromUrl(game.url);
    if (slug && String(icon || "").includes("/assets/media/topgames")) {
      img.srcset = `${siteUrl(`assets/media/topgames-128/${slug}.webp`)} 128w, ${siteUrl(`assets/media/topgames-192/${slug}.webp`)} 192w, ${siteUrl(`assets/media/topgames/${slug}.webp`)} 256w`;
      img.sizes = "(max-width: 700px) 33vw, 10vw";
      img.width = 256;
      img.height = 256;
    }
    const fallback = game.localIcon
      ? siteUrl(String(game.localIcon).replace(/^\//, ""))
      : "";
    if (fallback && fallback !== icon) img.setAttribute("data-fallback", fallback);
    img.referrerPolicy = "no-referrer";

    iconWrap.appendChild(img);

    const title = document.createElement("span");
    title.className = "game-title text-ellipsis-2";
    title.textContent = game.title || "Game";

    a.appendChild(iconWrap);
    a.appendChild(title);

    return a;
  }

  function findSimilarGamesList() {
    const headings = [...document.querySelectorAll("h5")];
    const h = headings.find(
      (e) => e.textContent.trim().toLowerCase() === "similar games",
    );
    if (!h) return null;

    let box = h.closest(".detail-games-box") || h.parentElement;
    return box.querySelector(".game-list");
  }

  function initSimilar() {
    const listEl = findSimilarGamesList();
    if (!listEl) return;

    loadStoreGames()
      .then((games) => {
        const selected = pickRandom(games, 24);

        listEl.innerHTML = "";
        selected.forEach((g) => {
          const item = createGameItem(g);
          listEl.appendChild(item);
        });

        // Attach to lazyloader
        if (window.lazyLoader && window.lazyLoader.addImage) {
          document.querySelectorAll(".lazy-img").forEach((img) => {
            window.lazyLoader.addImage(img);
          });
        }
      })
      .catch(() => {});
  }

  function start() {
    // 1️⃣ Start LazyLoad first
    window.lazyLoader = new LazyLoad().init("lazy-img");

    // 2️⃣ Then populate Similar Games
    if ("requestIdleCallback" in window) {
      requestIdleCallback(initSimilar, { timeout: 1200 });
    } else {
      window.setTimeout(initSimilar, 120);
    }
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();
})();
