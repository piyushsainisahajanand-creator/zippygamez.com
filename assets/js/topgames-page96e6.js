(() => {
  "use strict";

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const constrainedConnection = Boolean(
    connection && (connection.saveData || /^(?:slow-2g|2g|3g)$/i.test(connection.effectiveType || "")),
  );
  const compactViewport = window.matchMedia("(max-width: 700px)").matches;
  const batchSize = 24;
  const firstViewCount = constrainedConnection ? 9 : compactViewport ? 12 : 21;
  const prefetchDistance = constrainedConnection ? 0 : 300;
  const placeholder =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  const catalogUrls = [
    "../games3399.json?v=remote-first-20260811",
    "../games.json?v=remote-first-20260811",
    "/games.json?v=remote-first-20260811",
  ];
  const rankingUrls = [
    "../assets/data/topgames-priority-ranking3f9b.tsv?v=numeric-targeting-20260803",
    "../assets/data/topgames-priority-ranking.tsv?v=numeric-targeting-20260803",
    "/assets/data/topgames-priority-ranking.tsv?v=numeric-targeting-20260803",
  ];

  const toLocalAsset = (path) =>
    typeof path === "string" && path.startsWith("/assets/")
      ? `..${path}`
      : path;

  const toLocalGameUrl = (url, slug) => {
    if (slug) return `${slug}/index.html`;
    const match = String(url || "").match(/\/topgames\/([^/?#]+)/i);
    return match ? `${match[1]}/index.html` : url;
  };

  const fetchFirstOk = async (urls, init) => {
    for (const url of urls) {
      try {
        const response = await fetch(url, init);
        if (response.ok) return response;
      } catch (_error) {
        /* try next candidate */
      }
    }
    return null;
  };

  const readCampaignGameNumber = () => {
    const value = window.location.search.slice(1).trim();
    if (!/^\d+$/.test(value)) return null;

    const gameNumber = Number(value);
    return Number.isSafeInteger(gameNumber) && gameNumber > 0
      ? gameNumber
      : null;
  };

  const normalizeTitle = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const parseRanking = (text) =>
    String(text || "")
      .split(/\r?\n/)
      .slice(1)
      .map((line) => {
        const separatorIndex = line.indexOf("\t");
        if (separatorIndex < 0) return null;

        const rank = Number(line.slice(0, separatorIndex).trim());
        const title = line.slice(separatorIndex + 1).trim();
        if (!Number.isInteger(rank) || rank < 1 || !title) return null;

        return { rank, title };
      })
      .filter(Boolean)
      .sort((left, right) => left.rank - right.rank);

  const hydrateCard = (link, game, { eager = false } = {}) => {
    const image = link.querySelector("img");
    const title = link.querySelector(".game-title");
    const category = link.querySelector(".game-category");

    link.href = toLocalGameUrl(game.url, game.slug);
    if (game.campaignNumber) {
      link.dataset.campaignNumber = String(game.campaignNumber);
    } else {
      delete link.dataset.campaignNumber;
    }
    if (image) {
      image.src = eager ? game.icon : placeholder;
      image.dataset.original = game.icon;
      image.dataset.localFallback =
        toLocalAsset(game.localIcon) ||
        toLocalAsset(`/assets/media/topgames/${game.slug}.webp`);
      image.onerror = function () {
        image.onerror = null;
        image.removeAttribute("srcset");
        image.src = image.dataset.localFallback;
      };
      const slug = game.slug || String(game.icon || "").split("/").pop().replace(/\.webp$/i, "");
      if (slug && String(game.icon || "").startsWith("/assets/")) {
        image.srcset = `${toLocalAsset(`/assets/media/topgames-128/${slug}.webp`)} 128w, ${toLocalAsset(`/assets/media/topgames-192/${slug}.webp`)} 192w, ${toLocalAsset(`/assets/media/topgames/${slug}.webp`)} 256w`;
        image.sizes = "(max-width: 700px) 33vw, 10vw";
        image.width = 256;
        image.height = 256;
      }
      image.alt = game.title || "Store game";
      image.loading = eager ? "eager" : "lazy";
      image.decoding = "async";
      image.fetchPriority = eager ? "high" : "low";
      if (eager) image.dataset.loaded = "true";
      else delete image.dataset.loaded;
    }
    if (title) title.textContent = game.title || "Store Game";
    if (category) {
      category.textContent = `Game ${game.category || ""}`.trim();
    }
    return link;
  };

  const createCard = (game) => {
    const link = document.createElement("a");
    const icon = document.createElement("div");
    const image = document.createElement("img");
    const title = document.createElement("span");
    const category = document.createElement("span");

    link.className = "game-item";
    icon.className = "game-icon";
    image.className = "lazy-img";
    icon.appendChild(image);
    title.className = "game-title text-ellipsis-2";
    category.className = "game-category";
    link.append(icon, title, category);

    return hydrateCard(link, game);
  };

  const preloadImage = (game) =>
    new Promise((resolve) => {
      const image = new Image();
      const finish = () => resolve();
      image.addEventListener("load", finish, { once: true });
      image.addEventListener("error", finish, { once: true });
      const slug = game.slug || String(game.icon || "").split("/").pop().replace(/\.webp$/i, "");
      if (slug && String(game.icon || "").startsWith("/assets/")) {
        image.srcset = `${toLocalAsset(`/assets/media/topgames-128/${slug}.webp`)} 128w, ${toLocalAsset(`/assets/media/topgames-192/${slug}.webp`)} 192w, ${toLocalAsset(`/assets/media/topgames/${slug}.webp`)} 256w`;
        image.sizes = "(max-width: 700px) 33vw, 10vw";
      }
      image.src = game.icon;
      if (image.complete) finish();
    });

  const preloadFirstView = (games) => {
    return Promise.race([
      Promise.all(games.map(preloadImage)),
      new Promise((resolve) => window.setTimeout(resolve, 1200)),
    ]);
  };

  const refreshGrid = () => {
    requestAnimationFrame(() => {
      if (typeof window.AppcrateTopgamesRefresh === "function") {
        window.AppcrateTopgamesRefresh();
      }
    });
  };

  const buildDisplayOrder = (catalog, ranking, campaignGameNumber) => {
    if (ranking.length !== catalog.length) return null;

    const gameByTitle = new Map();
    for (const game of catalog) {
      const key = normalizeTitle(game.title);
      if (!key || gameByTitle.has(key)) return null;
      gameByTitle.set(key, game);
    }

    const orderedGames = ranking.map(({ rank, title }) => {
      const game = gameByTitle.get(normalizeTitle(title));
      return game ? { ...game, campaignNumber: rank } : null;
    });
    if (orderedGames.some((game) => !game)) return null;

    const orderedSlugs = new Set(orderedGames.map((game) => game.slug));
    if (orderedSlugs.size !== catalog.length) return null;

    if (!campaignGameNumber) return orderedGames;

    const targetIndex = orderedGames.findIndex(
      (game) => game.campaignNumber === campaignGameNumber,
    );
    if (targetIndex <= 0) return orderedGames;

    return [
      orderedGames[targetIndex],
      ...orderedGames.slice(0, targetIndex),
      ...orderedGames.slice(targetIndex + 1),
    ];
  };

  const startProgressiveRender = async () => {
    const grid = document.querySelector(".game-list-2");
    if (!grid || grid.dataset.rankingReady === "true") return;

    const revealStaticFallback = () => {
      if (grid.hasAttribute("data-ranking-ready")) return;
      window.clearTimeout(window.AppcrateTopgamesRevealTimer);
      grid.dataset.rankingReady = "fallback";
      grid.setAttribute("aria-busy", "false");
    };

    let catalog;
    let ranking;
    try {
      const [catalogResponse, rankingResponse] = await Promise.all([
        fetchFirstOk(catalogUrls),
        fetchFirstOk(rankingUrls, { cache: "no-cache" }),
      ]);
      if (!catalogResponse || !rankingResponse) {
        revealStaticFallback();
        return;
      }
      catalog = await catalogResponse.json();
      ranking = parseRanking(await rankingResponse.text());
    } catch (_error) {
      revealStaticFallback();
      return;
    }

    if (grid.dataset.rankingReady === "true") return;
    if (!Array.isArray(catalog) || catalog.length < firstViewCount) {
      revealStaticFallback();
      return;
    }
    const requestedCampaignGameNumber = readCampaignGameNumber();
    const campaignGameNumber =
      requestedCampaignGameNumber &&
      requestedCampaignGameNumber <= ranking.length
        ? requestedCampaignGameNumber
        : null;
    const displayOrder = buildDisplayOrder(
      catalog,
      ranking,
      campaignGameNumber,
    );
    if (!displayOrder || displayOrder.length !== catalog.length) {
      revealStaticFallback();
      return;
    }

    const initialCards = Array.from(grid.children).filter((item) =>
      item.matches("a.game-item[href]"),
    );
    const firstViewGames = displayOrder.slice(0, firstViewCount);
    await preloadFirstView(firstViewGames);
    if (grid.dataset.rankingReady === "true") return;

    initialCards.forEach((card, index) => {
      const game = displayOrder[index];
      if (game) hydrateCard(card, game, { eager: index < firstViewCount });
    });
    window.clearTimeout(window.AppcrateTopgamesRevealTimer);
    grid.dataset.rankingReady = "true";
    grid.dataset.rankingOrder = campaignGameNumber
      ? "campaign-targeted"
      : "csv-fixed-1-500";
    if (campaignGameNumber) {
      grid.dataset.campaignGameNumber = String(campaignGameNumber);
    }
    grid.setAttribute("aria-busy", "false");
    refreshGrid();

    const remainingGames = displayOrder.slice(initialCards.length);
    if (!remainingGames.length) return;

    let cursor = 0;
    let loading = false;
    let observer = null;
    let scrollScheduled = false;

    const sentinel = document.createElement("div");
    sentinel.className = "topgames-loader-sentinel";
    sentinel.setAttribute("aria-hidden", "true");
    grid.insertAdjacentElement("afterend", sentinel);

    const appendBatch = () => {
      if (loading || cursor >= remainingGames.length) return false;
      loading = true;
      const fragment = document.createDocumentFragment();
      const nextCursor = Math.min(cursor + batchSize, remainingGames.length);

      for (; cursor < nextCursor; cursor += 1) {
        fragment.appendChild(createCard(remainingGames[cursor]));
      }

      grid.appendChild(fragment);
      loading = false;
      refreshGrid();
      return cursor < remainingGames.length;
    };

    const isNearEnd = () =>
      sentinel.getBoundingClientRect().top < window.innerHeight + prefetchDistance;

    const stopLoading = () => {
      if (observer) observer.disconnect();
      window.removeEventListener("scroll", onScrollNearEnd);
      sentinel.remove();
    };

    const loadMore = () => {
      let hasMore = true;
      let guard = 0;

      do {
        hasMore = appendBatch();
        guard += 1;
      } while (hasMore && isNearEnd() && guard < 5);

      if (!hasMore) stopLoading();
    };

    function onScrollNearEnd() {
      if (scrollScheduled) return;
      scrollScheduled = true;
      requestAnimationFrame(() => {
        scrollScheduled = false;
        if (isNearEnd()) loadMore();
      });
    }

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) loadMore();
        },
        { rootMargin: `${prefetchDistance}px 0px` },
      );
      observer.observe(sentinel);
    }

    window.addEventListener("scroll", onScrollNearEnd, { passive: true });
    onScrollNearEnd();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startProgressiveRender, {
      once: true,
    });
  } else {
    startProgressiveRender();
  }
})();
