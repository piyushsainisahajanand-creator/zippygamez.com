(function () {
  "use strict";

  if (window.MitshuDiscovery) return;

  const TYPE_ORDER = ["apps", "playgames", "topgames", "articles"];
  const TYPE_LABELS = {
    apps: "Apps",
    playgames: "Play Games",
    topgames: "Top Store Games",
    articles: "Articles",
  };
  const discoveryScript = document.querySelector('script[src*="site-discovery"]');
  const SITE_ROOT = new URL("../../", discoveryScript ? discoveryScript.src : window.location.href).pathname;
  const SECTION_PATHS = {
    apps: SITE_ROOT + "app/",
    playgames: SITE_ROOT + "playgames/",
    topgames: SITE_ROOT + "topgames/",
    articles: SITE_ROOT + "article/",
  };
  const ACTION_LABELS = {
    apps: "View App",
    playgames: "Play Game",
    topgames: "View Details",
    articles: "Read Article",
  };
  const FALLBACK_IMAGE = SITE_ROOT + "assets/icons/zippygamez-com-pwa-192.png";
  const promises = Object.create(null);
  let routeMapPromise = null;

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function categorySlug(value) {
    return normalizeText(value).replace(/\s+/g, "-").replace(/-+/g, "-");
  }

  function cleanCategory(value, fallback) {
    const text = String(value || "").trim().replace(/^(App|Game)\s+/i, "").trim();
    return text || fallback;
  }

  function canonicalPath(value, fallback) {
    try {
      const path = new URL(value || fallback || SITE_ROOT, window.location.origin + SITE_ROOT).pathname;
      return /\.[a-z0-9]{2,5}$/i.test(path) ? path : path.replace(/\/+$/, "") + "/";
    } catch (error) {
      return fallback || SITE_ROOT;
    }
  }

  function localAppIcon(url) {
    return canonicalPath(url, "/app/") + "pwa-icon-192.png";
  }

  function textFrom(root, selector) {
    const element = root && root.querySelector(selector);
    return element ? element.textContent.trim().replace(/\s+/g, " ") : "";
  }

  function imageFrom(root) {
    const image = root && root.querySelector("img");
    return image
      ? image.getAttribute("data-original") || image.getAttribute("src") || FALLBACK_IMAGE
      : FALLBACK_IMAGE;
  }

  function dedupe(items) {
    const seen = new Set();
    return items.filter(function (item) {
      if (!item || !item.url || !item.title) return false;
      const key = canonicalPath(item.url).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      item.url = canonicalPath(item.url);
      return true;
    });
  }

  function fetchText(url) {
    return fetch(url, { cache: "no-cache" }).then(function (response) {
      if (!response.ok) throw new Error(url + " returned " + response.status);
      return response.text();
    });
  }

  function fetchJSON(url) {
    return fetch(url).then(function (response) {
      if (!response.ok) throw new Error(url + " returned " + response.status);
      return response.json();
    });
  }

  function parseApps(html) {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    return dedupe(
      Array.from(documentNode.querySelectorAll('body[data-page="apps"] .game-list-2 .game-item')).map(
        function (card) {
          const url = canonicalPath(card.getAttribute("href"), "/app/");
          return {
            id: "app:" + url.toLowerCase(),
            type: "apps",
            typeLabel: TYPE_LABELS.apps,
            title: textFrom(card, ".game-title"),
            category: cleanCategory(textFrom(card, ".game-category"), "App"),
            description: "",
            tags: [],
            developer: "",
            image: localAppIcon(url),
            url: url,
            actionLabel: ACTION_LABELS.apps,
          };
        },
      ),
    );
  }

  function parseArticles(html) {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    const cards = Array.from(
      documentNode.querySelectorAll("[data-feature-slide], .article-card, .article-pick"),
    );
    return dedupe(
      cards.map(function (card) {
        const url = canonicalPath(card.getAttribute("href"), "/article/");
        return {
          id: "article:" + url.toLowerCase(),
          type: "articles",
          typeLabel: TYPE_LABELS.articles,
          title: textFrom(card, "h2, h3"),
          category: cleanCategory(textFrom(card, ".article-chip, .content-kind"), "Article"),
          description: textFrom(card, "p"),
          tags: [],
          author: "ZippyGamez",
          image: imageFrom(card),
          url: url,
          actionLabel: ACTION_LABELS.articles,
        };
      }),
    );
  }

  function loadApps() {
    return fetchJSON(SITE_ROOT + "assets/data/apps-lite.json?v=remote-first-20260811").then(function (records) {
      return dedupe((Array.isArray(records) ? records : []).map(function (record) {
        const url = canonicalPath(record.href, "/app/");
        return {
          id: "app:" + url.toLowerCase(),
          type: "apps",
          typeLabel: TYPE_LABELS.apps,
          title: String(record.title || "").trim(),
          category: cleanCategory(record.category, "App"),
          description: "",
          tags: [],
          developer: "",
          image: record.icon || localAppIcon(url),
          localImage: record.localIcon || localAppIcon(url),
          url: url,
          actionLabel: ACTION_LABELS.apps,
        };
      }));
    });
  }

  function loadPlayGames() {
    return fetchJSON(SITE_ROOT + "assets/data/playgames-lite.json?v=playgames-catalog-fix-20260822").then(function (data) {
      if (!Array.isArray(data)) throw new Error("Invalid Play Games catalog");
      return dedupe(
        data.map(function (game) {
          const slug = game.slug || categorySlug(game.name);
          return {
            id: "play:" + slug,
            type: "playgames",
            typeLabel: TYPE_LABELS.playgames,
            title: String(game.name || "").trim(),
            category: cleanCategory(game.category, "Arcade"),
            description: String(
              game.description ||
              game.shortDescription ||
              "Play " + String(game.name || "this game").trim() + " online in the " + cleanCategory(game.category, "Arcade") + " category. Open the game details to see controls and start playing.",
            ).trim(),
            tags: Array.isArray(game.tags) ? game.tags.filter(Boolean) : [],
            developer: String(game.developer || game.provider || "").trim(),
            image: game.logo || FALLBACK_IMAGE,
            localImage: game.localLogo || FALLBACK_IMAGE,
            url: SECTION_PATHS.playgames + slug + "/",
            actionLabel: ACTION_LABELS.playgames,
            rating: Number.isFinite(Number(game.rating)) ? Number(game.rating) : null,
          };
        }),
      );
    });
  }

  function loadTopGames() {
    return fetchJSON(SITE_ROOT + "games.json?v=remote-first-20260811").then(function (data) {
      if (!Array.isArray(data)) throw new Error("Invalid Top Games catalog");
      return dedupe(
        data.map(function (game) {
          const slug = game.slug || categorySlug(game.title);
          return {
            id: "store:" + slug,
            type: "topgames",
            typeLabel: TYPE_LABELS.topgames,
            title: String(game.title || "").trim(),
            category: cleanCategory(game.category, "Game"),
            description: String(game.description || "").trim(),
            tags: Array.isArray(game.tags) ? game.tags.filter(Boolean) : [],
            developer: String(game.developer || "").trim(),
            image: game.icon || FALLBACK_IMAGE,
            localImage: game.localIcon || FALLBACK_IMAGE,
            url: game.url || SECTION_PATHS.topgames + slug + "/",
            actionLabel: ACTION_LABELS.topgames,
            rating: Number.isFinite(Number(game.rating)) ? Number(game.rating) : null,
          };
        }),
      );
    });
  }

  function loadArticles() {
    return fetchText(SITE_ROOT + "article/?v=route-audit-20260711").then(parseArticles);
  }

  function loadType(type) {
    if (promises[type]) return promises[type];
    const loaders = {
      apps: loadApps,
      playgames: loadPlayGames,
      topgames: loadTopGames,
      articles: loadArticles,
    };
    if (!loaders[type]) return Promise.resolve([]);
    promises[type] = loaders[type]().catch(function (error) {
      delete promises[type];
      throw error;
    });
    return promises[type];
  }

  function loadAll() {
    return Promise.all(TYPE_ORDER.map(loadType)).then(function (groups) {
      return dedupe([].concat.apply([], groups));
    });
  }

  function getCategories(items) {
    const categories = new Map();
    (items || []).forEach(function (item) {
      const label = cleanCategory(item.category, "Other");
      const key = normalizeText(label);
      if (!key) return;
      if (categories.has(key)) {
        categories.get(key).count += 1;
      } else {
        categories.set(key, { label: label, count: 1 });
      }
    });
    return Array.from(categories.values())
      .sort(function (left, right) {
        return right.count - left.count || left.label.localeCompare(right.label, undefined, { sensitivity: "base" });
      })
      .map(function (category) { return category.label; });
  }

  function filterCategory(items, category) {
    const wanted = normalizeText(category);
    if (!wanted || wanted === "all") return (items || []).slice();
    return (items || []).filter(function (item) {
      return normalizeText(item.category) === wanted;
    });
  }

  function loadCategoryRoutes() {
    if (!routeMapPromise) {
      routeMapPromise = fetchJSON(SITE_ROOT + "assets/data/category-routes.json?v=apps-only-category-order-20260710");
    }
    return routeMapPromise;
  }

  function findCategoryRoute(routes, section, value, bySlug) {
    const entries = routes && Array.isArray(routes[section]) ? routes[section] : [];
    const wanted = normalizeText(value);
    return entries.find(function (entry) {
      return normalizeText(bySlug ? entry.slug : entry.label) === wanted;
    });
  }

  function categoryUrl(section, label) {
    return loadCategoryRoutes()
      .then(function (routes) {
        const entry = findCategoryRoute(routes, section, label, false);
        return entry ? SECTION_PATHS[section] + entry.slug + "/" : SECTION_PATHS[section];
      })
      .catch(function () {
        return SECTION_PATHS[section] + categorySlug(label) + "/";
      });
  }

  function resolveCategory(section, slug) {
    return loadCategoryRoutes().then(function (routes) {
      return findCategoryRoute(routes, section, slug, true) || null;
    });
  }

  function scoreItem(item, normalizedQuery) {
    const title = normalizeText(item.title);
    const category = normalizeText(item.category);
    const tags = normalizeText((item.tags || []).join(" "));
    const description = normalizeText(item.description);
    const developer = normalizeText(item.developer || item.author);
    const haystack = [title, category, tags, description, developer].join(" ");
    const terms = normalizedQuery.split(" ").filter(Boolean);
    if (!terms.every(function (term) { return haystack.includes(term); })) return -1;

    let score = 0;
    if (title === normalizedQuery) score += 1000;
    else if (title.startsWith(normalizedQuery)) score += 800;
    else if (title.includes(normalizedQuery)) score += 600;
    if (category === normalizedQuery) score += 420;
    else if (category.includes(normalizedQuery)) score += 320;
    if (tags.includes(normalizedQuery)) score += 280;
    if (developer.includes(normalizedQuery)) score += 220;
    if (description.includes(normalizedQuery)) score += 160;
    score += terms.reduce(function (total, term) {
      return total + (title.includes(term) ? 45 : 0) + (category.includes(term) ? 20 : 0);
    }, 0);
    score += Math.max(0, 40 - TYPE_ORDER.indexOf(item.type) * 5);
    return score;
  }

  function search(items, query, type) {
    const normalizedQuery = normalizeText(query);
    if (normalizedQuery.length < 2) return [];
    return (items || [])
      .filter(function (item) { return !type || type === "all" || item.type === type; })
      .map(function (item) { return { item: item, score: scoreItem(item, normalizedQuery) }; })
      .filter(function (entry) { return entry.score >= 0; })
      .sort(function (left, right) {
        return right.score - left.score ||
          left.item.title.localeCompare(right.item.title, undefined, { sensitivity: "base" }) ||
          left.item.url.localeCompare(right.item.url);
      })
      .map(function (entry) { return entry.item; });
  }

  window.MitshuDiscovery = {
    ACTION_LABELS: ACTION_LABELS,
    FALLBACK_IMAGE: FALLBACK_IMAGE,
    SECTION_PATHS: SECTION_PATHS,
    TYPE_LABELS: TYPE_LABELS,
    TYPE_ORDER: TYPE_ORDER,
    categorySlug: categorySlug,
    categoryUrl: categoryUrl,
    filterCategory: filterCategory,
    getCategories: getCategories,
    loadAll: loadAll,
    loadCategoryRoutes: loadCategoryRoutes,
    loadType: loadType,
    normalizeText: normalizeText,
    resolveCategory: resolveCategory,
    search: search,
  };

  window.dispatchEvent(new CustomEvent("mitshu:discovery-ready"));
})();
