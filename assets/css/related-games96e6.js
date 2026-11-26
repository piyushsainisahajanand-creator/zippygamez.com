(function () {
  const TRANSPARENT_PLACEHOLDER =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

  function siteRoot() {
    if (typeof window.AppcrateSiteRoot === "function") return window.AppcrateSiteRoot();
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
    if (typeof window.AppcrateSiteUrl === "function") return window.AppcrateSiteUrl(path);
    return siteRoot() + String(path || "").replace(/^\//, "");
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

  function loadStoreGames() {
    if (typeof window.AppcrateLoadStoreGames === "function") {
      return window.AppcrateLoadStoreGames();
    }
    if (!window.__APPCRATE_STORE_GAMES_PROMISE__) {
      window.__APPCRATE_STORE_GAMES_PROMISE__ = fetchFirstOk(catalogUrls).then((response) =>
        response.json(),
      );
    }
    return window.__APPCRATE_STORE_GAMES_PROMISE__;
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

  function createItem(game) {
    const a = document.createElement("a");
    a.className = "game-item";
    a.href = localGameUrl(game);

    const wrap = document.createElement("div");
    wrap.className = "game-icon";

    const img = document.createElement("img");
    img.className = "lazy-img";
    img.src = TRANSPARENT_PLACEHOLDER;

    const icon = iconFor(game);
    if (icon) {
      img.setAttribute("data-original", icon);
    }
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
    if (fallback && fallback !== icon) {
      img.setAttribute("data-fallback", fallback);
    }
    img.referrerPolicy = "no-referrer";

    wrap.appendChild(img);

    const title = document.createElement("span");
    title.className = "game-title";
    title.textContent = game.title || "Game";

    a.appendChild(wrap);
    a.appendChild(title);

    return a;
  }

  function findRelatedList() {
    return document.querySelector(".game-list-3");
  }

  function loadRelated() {
    const container = findRelatedList();
    if (!container) return;

    loadStoreGames()
      .then((games) => {
        const selected = pickRandom(games, 50);

        container.innerHTML = "";

        selected.forEach((game) => {
          const item = createItem(game);
          container.appendChild(item);

          if (window.lazyLoader && window.lazyLoader.addImage) {
            const img = item.querySelector("img.lazy-img");
            window.lazyLoader.addImage(img);
          }
        });
      })
      .catch(() => {});
  }

  function start() {
    loadRelated();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();
})();
