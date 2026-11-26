// rightlist.js
// Load shuffled external H5 games into .right-list from the active Play Games catalog.
(function fixBrokenGamepixImages() {
  function toCdnUrl(src) {
    const value = String(src || "");
    if (/^https?:\/\//i.test(value)) return "";

    const assets = value.match(/(?:^|\/)games\.assets\.gamepix\.com\/(.+)$/i);
    if (assets) return "https://games.assets.gamepix.com/" + assets[1];

    const img = value.match(/(?:^|\/)img\.gamepix\.com\/(.+)$/i);
    if (!img) return "";

    const rest = img[1];
    const cover = rest.match(/^games\/([^/?#]+)\/cover\//i);
    if (cover) {
      const slug = cover[1];
      const query = rest.includes("?") ? rest.slice(rest.indexOf("?")) : "?w=256&ar=16%3A10";
      return "https://img.gamepix.com/games/" + slug + "/cover/" + slug + ".png" + query;
    }
    return "https://img.gamepix.com/" + rest.replace(/753c\.(jpe?g|png|webp)/i, ".png");
  }

  function fixImage(img) {
    const next = toCdnUrl(img.getAttribute("src") || img.src);
    if (next) img.src = next;
  }

  function scan(root) {
    (root.querySelectorAll ? root : document).querySelectorAll("img").forEach(fixImage);
  }

  scan(document);

  if (document.body) {
    new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName === "IMG") fixImage(node);
          else if (node.querySelectorAll) scan(node);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
})();

(function directPlayNow() {
  function gameSlug() {
    const parts = (location.pathname || "")
      .split("/")
      .filter(Boolean)
      .map((part) => {
        try { return decodeURIComponent(part); } catch (_) { return part; }
      });
    const index = parts.indexOf("playgames");
    if (index < 0 || !parts[index + 1]) return "";
    return parts[index + 1].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function startGame() {
    const slug = gameSlug();
    const frame = document.getElementById("gameFrame");
    const card = document.getElementById("playFrameCard");
    if (!slug || !frame || !card) return;

    frame.src = "https://play.gamepix.com/" + encodeURIComponent(slug) + "/embed?sid=TA72T";
    card.classList.add("is-active");
    card.classList.remove("is-inline");
    frame.scrollIntoView({ block: "center" });
  }

  document.addEventListener(
    "click",
    function (event) {
      const trigger = event.target.closest("#launchPlayBtn, .sticky-online-game-cta__button");
      if (!trigger) return;
      event.preventDefault();
      event.stopPropagation();
      startGame();
    },
    true
  );

  if (new URLSearchParams(location.search).get("launch") === "1") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startGame, { once: true });
    } else {
      startGame();
    }
  }
})();

const PLAYGAMES_SOURCE_LIMIT = 500;
const RIGHT_LIST_LIMIT = 14;

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
  const root = siteRoot();
  return root + String(path || "").replace(/^\//, "");
}

const PLAYABLE_GAMES_URLS = [
  () => siteUrl("assets/data/playgames-lite.json?v=remote-first-20260811"),
  () => "/assets/data/playgames-lite.json?v=remote-first-20260811",
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
  throw new Error("Playable games unavailable");
}

function loadPlayableGamesData() {
  if (!window.__APPCRATE_PLAYABLE_GAMES_PROMISE__) {
    window.__APPCRATE_PLAYABLE_GAMES_PROMISE__ = fetchFirstOk(PLAYABLE_GAMES_URLS).then(
      (response) => response.json(),
    );
  }
  return window.__APPCRATE_PLAYABLE_GAMES_PROMISE__;
}

window.AppcrateLoadPlayableGamesLite = loadPlayableGamesData;

async function loadRightSideGames() {
  try {
    const container = document.querySelector(".right-list");
    if (!container) return;
    const games = await loadPlayableGamesData();

    container.innerHTML = "";

    function slugify(text) {
      return String(text || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }

    function shuffled(items) {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }

    const playableGames = shuffled(games.slice(0, PLAYGAMES_SOURCE_LIMIT)).slice(
      0,
      RIGHT_LIST_LIMIT,
    );

    playableGames.forEach((game) => {
      const sourceRating = Number(game.rating);
      const rating = Number.isFinite(sourceRating) ? sourceRating.toFixed(1) : "N/A";
      const slug = game.slug || slugify(game.name);

      const item = document.createElement("a");
      item.className = "game-item-column h5-play-card";
      item.href = slug ? siteUrl(`playgames/${slug}/index.html`) : "#";

      const icon = document.createElement("div");
      icon.className = "app-icon";

      const image = document.createElement("img");
      image.src = game.logo;
      image.dataset.localFallback = game.localLogo
        ? siteUrl(String(game.localLogo).replace(/^\//, ""))
        : slug
          ? siteUrl(`assets/media/playgames/${slug}.webp`)
          : "";
      image.onerror = function () {
        image.onerror = null;
        image.removeAttribute("srcset");
        if (image.dataset.localFallback) image.src = image.dataset.localFallback;
      };
      if (slug && String(game.logo || "").startsWith("/assets/")) {
        image.srcset = `${siteUrl(`assets/media/playgames-128/${slug}.webp`)} 128w, ${siteUrl(`assets/media/playgames-192/${slug}.webp`)} 192w, ${siteUrl(`assets/media/playgames/${slug}.webp`)} 256w`;
        image.sizes = "(max-width: 700px) 33vw, 96px";
        image.width = 256;
        image.height = 256;
      }
      image.loading = "lazy";
      image.decoding = "async";
      image.alt = game.name || "Game";
      icon.appendChild(image);

      const info = document.createElement("div");
      info.className = "right-info";

      const title = document.createElement("h2");
      title.textContent = game.name || "Game";

      const score = document.createElement("div");
      score.className = "score";
      score.innerHTML = `
                <svg class="s-icon" fill="#FFAF14">
                    <use xlink:href="#icon-star"></use>
                </svg>
            `;

      const ratingText = document.createElement("span");
      ratingText.textContent = rating;
      score.appendChild(ratingText);

      info.appendChild(title);
      info.appendChild(score);

      const play = document.createElement("div");
      play.className = "download-icon";
      const playText = document.createElement("span");
      playText.textContent = "Play";
      play.appendChild(playText);

      item.appendChild(icon);
      item.appendChild(info);
      item.appendChild(play);

      container.appendChild(item);
    });
  } catch (_) {
    return;
  }
}

function bindRemoteImageFallbacks() {
  document.querySelectorAll("img[data-local-fallback]").forEach((image) => {
    if (image.dataset.remoteFallbackBound === "true") return;
    image.dataset.remoteFallbackBound = "true";
    image.addEventListener("error", () => {
      const fallback = image.dataset.localFallback;
      if (!fallback || image.dataset.localFallbackApplied === "true") return;
      image.dataset.localFallbackApplied = "true";
      image.removeAttribute("srcset");
      image.src = fallback;
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindRemoteImageFallbacks();
  loadRightSideGames();
});
