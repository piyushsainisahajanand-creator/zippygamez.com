(() => {
  "use strict";

  if (window.__APPCRATE_PLAY_DETAIL_INITIALIZED__) return;
  window.__APPCRATE_PLAY_DETAIL_INITIALIZED__ = true;

  const SOURCE_LIMIT = 500;
  const SIMILAR_LIMIT = 24;

  const $ = (selector) => document.querySelector(selector);

  const slugify = (text) =>
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const gameSlug = (game) => String(game?.slug || "").trim() || slugify(game?.name);

  const siteRoot = () => {
    if (typeof window.AppcrateSiteRoot === "function") return window.AppcrateSiteRoot();
    if (window.__APPCRATE_SITE_ROOT__) return window.__APPCRATE_SITE_ROOT__;
    const path = window.location.pathname || "/";
    const markers = ["/topgames/", "/playgames/", "/app/", "/article/", "/page/", "/assets/"];
    for (const marker of markers) {
      const index = path.indexOf(marker);
      if (index >= 0) {
        window.__APPCRATE_SITE_ROOT__ = path.slice(0, index + 1);
        return window.__APPCRATE_SITE_ROOT__;
      }
    }
    window.__APPCRATE_SITE_ROOT__ = path.replace(/[^/]+$/, "") || "/";
    return window.__APPCRATE_SITE_ROOT__;
  };

  const siteUrl = (path) => {
    if (typeof window.AppcrateSiteUrl === "function") return window.AppcrateSiteUrl(path);
    return siteRoot() + String(path || "").replace(/^\//, "");
  };

  const detailPath = (slug) => siteUrl(`playgames/${encodeURIComponent(slug)}/index.html`);

  const playPath = (slug) => siteUrl(`playgames/${encodeURIComponent(slug)}/play/index.html`);

  const defaultEmbedUrl = (slug) =>
    slug ? `https://play.gamepix.com/${encodeURIComponent(slug)}/embed?sid=TA72T` : "";

  const requestedSlugFromLocation = () => {
    const parts = window.location.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    const playgamesIndex = parts.indexOf("playgames");
    if (playgamesIndex >= 0 && parts[playgamesIndex + 1] && parts[playgamesIndex + 1] !== "play") {
      return slugify(parts[playgamesIndex + 1]);
    }
    return slugify(new URLSearchParams(window.location.search).get("name"));
  };

  const isPlayable = (game) =>
    Boolean(
      game?.name &&
        (/^https:\/\//i.test(String(game.embedUrl || "").trim()) || gameSlug(game)),
    );

  const ratingFor = (game) => {
    const rating = Number(game?.rating);
    return Number.isFinite(rating) ? rating.toFixed(1) : "N/A";
  };

  const cleanText = (value) =>
    String(value || "")
      .replace(/&amp;#x27;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\u00e2\u20ac\u2122/g, "'")
      .replace(/\u00e2\u20ac\u201c/g, "-")
      .replace(/\u00e2\u20ac\u201d/g, "-")
      .replace(/'/g, "'")
      .trim();

  const asArray = (items) => {
    if (!items) return [];
    if (Array.isArray(items)) return items.map(cleanText).filter(Boolean);
    return [cleanText(items)].filter(Boolean);
  };

  const formatInstructionText = (value) =>
    cleanText(value)
      .replace(/([.!?])(?=[A-Z0-9])/g, "$1 ")
      .replace(/\s+/g, " ")
      .trim();

  const instructionItems = (items) =>
    asArray(items).flatMap((item) => {
      const formatted = formatInstructionText(item);
      if (formatted.length <= 180) return [formatted];

      const sentences = formatted
        .replace(/([.!?])\s+(?=[A-Z0-9])/g, "$1\n")
        .split("\n")
        .map((sentence) => sentence.trim())
        .filter(Boolean);

      return sentences.reduce((groups, sentence) => {
        const lastIndex = groups.length - 1;
        const combined = lastIndex >= 0 ? `${groups[lastIndex]} ${sentence}` : sentence;
        if (lastIndex < 0 || combined.length > 170) groups.push(sentence);
        else groups[lastIndex] = combined;
        return groups;
      }, []);
    });

  const setText = (selector, value) => {
    const node = $(selector);
    if (!node) return;
    const nextValue = cleanText(value);
    if (node.textContent !== nextValue) node.textContent = nextValue;
  };

  const shortHeaderText = (game, category) => {
    const slug = gameSlug(game);
    if (slug.includes("2048")) return "Merge tiles and reach 2048.";
    const type = cleanText(category).toLowerCase() || "online";
    const text = `Quick ${type} game for instant play.`;
    return text.length > 58 ? "Quick online game for instant play." : text;
  };

  const hideEmptySection = (selector) => {
    const section = $(selector)?.closest(".play-section, .detail-block");
    if (section) section.hidden = true;
  };

  const renderList = (id, items) => {
    const node = document.getElementById(id);
    if (!node) return;
    const list = asArray(items);
    if (!list.length) {
      hideEmptySection(`#${id}`);
      return;
    }
    const current = Array.from(node.children, (child) => child.textContent.trim());
    if (current.length === list.length && current.every((item, index) => item === list[index])) {
      return;
    }
    node.replaceChildren(
      ...list.map((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        return li;
      }),
    );
  };

  const renderFaq = (items) => {
    const node = $("#faq");
    if (!node || !Array.isArray(items) || !items.length) {
      hideEmptySection("#faq");
      return;
    }
    const normalizedItems = items
      .filter((item) => item && item.q && item.a)
      .map((item) => ({ q: cleanText(item.q), a: cleanText(item.a) }));
    const currentItems = Array.from(node.querySelectorAll(":scope > .play-faq-item"), (card) => ({
      q: card.querySelector("h3")?.textContent.trim() || "",
      a: card.querySelector("p")?.textContent.trim() || "",
    }));
    if (
      currentItems.length === normalizedItems.length &&
      currentItems.every((item, index) =>
        item.q === normalizedItems[index].q && item.a === normalizedItems[index].a,
      )
    ) {
      return;
    }
    const children = normalizedItems
      .map((item) => {
        const card = document.createElement("article");
        card.className = "play-faq-item";
        const title = document.createElement("h3");
        title.textContent = item.q;
        const answer = document.createElement("p");
        answer.textContent = item.a;
        card.append(title, answer);
        return card;
      });
    if (!children.length) {
      hideEmptySection("#faq");
      return;
    }
    node.replaceChildren(...children);
  };

  const shuffle = (items) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const renderSimilar = (games, currentSlug) => {
    const node = $("#similarGames");
    if (!node) return;
    const similar = shuffle(
      games.filter((game) => isPlayable(game) && gameSlug(game) !== currentSlug),
    ).slice(0, SIMILAR_LIMIT);
    const cards = similar.map((game, index) => {
      const link = document.createElement("a");
      link.className = "game-item";
      link.href = detailPath(gameSlug(game));

      const icon = document.createElement("div");
      icon.className = "game-icon";

      const image = document.createElement("img");
      image.src = game.logo;
      image.alt = game.name || "Game";
      image.loading = "lazy";
      image.decoding = "async";
      icon.appendChild(image);

      const title = document.createElement("span");
      title.className = "game-title text-ellipsis-2";
      title.textContent = game.name || "Game";

      link.append(icon, title);
      return link;
    });
    node.replaceChildren(...cards);
  };

  const createStickyPlayCta = ({ sourceButton, href, text, kicker }) => {
    if (!sourceButton || document.querySelector(".sticky-online-game-cta")) return;

    const sticky = document.createElement("div");
    sticky.className = "sticky-download-cta sticky-online-game-cta";
    sticky.setAttribute("aria-hidden", "true");

    const link = document.createElement("a");
    link.className = "sticky-download-cta__button sticky-online-game-cta__button";
    link.href = href;
    link.dataset.pwaPlayCta = "true";
    link.setAttribute("aria-label", text);

    const label = document.createElement("span");
    label.className = "sticky-download-cta__label";

    const textNode = document.createElement("span");
    textNode.className = "sticky-download-cta__text";
    textNode.textContent = text;

    const icon = document.createElement("span");
    icon.className = "sticky-download-cta__icon sticky-online-game-cta__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = '<svg viewBox="0 0 24 24" focusable="false"><path d="M8 5v14l11-7z"></path></svg>';

    if (kicker) {
      const kickerNode = document.createElement("span");
      kickerNode.className = "sticky-download-cta__kicker";
      kickerNode.textContent = kicker;
      label.appendChild(kickerNode);
    }
    label.appendChild(textNode);
    link.append(label, icon);
    sticky.appendChild(link);
    document.body.appendChild(sticky);
    document.body.classList.add("has-sticky-online-game-cta");

    const footer = document.querySelector(".site-footer, footer");
    let footerVisible = false;

    const isFooterVisible = () => {
      if (!footer) return false;
      const rect = footer.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    };

    const setVisible = (visible) => {
      const shouldShow = visible && !footerVisible;
      sticky.classList.toggle("is-visible", shouldShow);
      sticky.setAttribute("aria-hidden", shouldShow ? "false" : "true");
    };

    const sync = () => {
      const rect = sourceButton.getBoundingClientRect();
      footerVisible = isFooterVisible();
      setVisible(rect.bottom < 0);
    };

    let ticking = false;
    const requestSync = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        sync();
      });
    };

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          setVisible(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
        },
        { threshold: 0 },
      );
      observer.observe(sourceButton);

      if (footer) {
        const footerObserver = new IntersectionObserver(
          (entries) => {
            footerVisible = entries.some((entry) => entry.isIntersecting);
            sync();
          },
          { threshold: 0 },
        );
        footerObserver.observe(footer);
      }
    } else {
      window.addEventListener("scroll", requestSync, { passive: true });
    }

    window.addEventListener("resize", requestSync);
    sync();
  };

  const applyGame = (game, index, games, slug) => {
    const category = game.category || "Online Game";
    const rating = ratingFor(game);
    const launchHref = playPath(slug);
    const controlsText = asArray(game.controls).join(" ");
    const controlLabel =
      cleanText(game.controlLabel) ||
      (/swipe|arrow|keyboard/i.test(controlsText) ? "Swipe + Arrow Keys" : "Touch + Keyboard");

    const pageTitle = `${game.name} - Play Online Game`;
    if (document.title !== pageTitle) document.title = pageTitle;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      const nextDescription = cleanText(game.description || game.longDescription).slice(0, 150);
      if (metaDesc.getAttribute("content") !== nextDescription) {
        metaDesc.setAttribute("content", nextDescription);
      }
    }

    const logo = $("#gameLogo");
    if (logo) {
      logo.dataset.localFallback = game.localLogo || logo.dataset.localFallback || "";
      logo.referrerPolicy = "no-referrer";
      logo.onerror = function () {
        logo.onerror = null;
        logo.removeAttribute("srcset");
        if (logo.dataset.localFallback) logo.src = logo.dataset.localFallback;
      };
      if (logo.getAttribute("src") !== game.logo) logo.src = game.logo;
      const nextAlt = game.name || "Game";
      if (logo.alt !== nextAlt) logo.alt = nextAlt;
    }

    setText("#gameTitle", game.name);
    setText("#gameCategory", `Game ${category}`);
    setText("#infoCategory", category);
    setText("#gameRating", rating);
    setText("#infoRating", rating);
    setText("#infoControls", controlLabel);
    setText(".play-stars", "\u2605\u2605\u2605\u2605\u2605");
    setText("#shortDesc", shortHeaderText(game, category));
    setText("#gameDesc", game.longDescription || game.description);
    setText("#gameplay", formatInstructionText(game.gameplay));
    setText("#whyPlay", game.whyPlay);
    setText("#whoIsFor", game.whoIsFor);

    if (!cleanText(game.longDescription || game.description)) hideEmptySection("#gameDesc");
    if (!cleanText(game.gameplay)) hideEmptySection("#gameplay");
    if (!cleanText(game.whyPlay)) hideEmptySection("#whyPlay");
    if (!cleanText(game.whoIsFor)) hideEmptySection("#whoIsFor");

    renderList("controls", instructionItems(game.controls));
    renderList("howToPlay", instructionItems(game.howToPlay));
    renderList("features", game.features);
    renderList("tips", game.tips);
    renderFaq(game.faq);
    renderSimilar(games, slug);

    if (window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    const playButton = $("#playBtn");
    if (playButton) {
      playButton.href = launchHref;
      playButton.dataset.pwaPlayCta = "true";
      createStickyPlayCta({
        sourceButton: playButton,
        href: launchHref,
        text: "Ready to Play",
      });
    }
  };

  const fetchFirstOk = async (urls) => {
    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (response.ok) return response;
      } catch (_error) {
        /* try next */
      }
    }
    return null;
  };

  const loadLiteCatalog = () => {
    if (typeof window.AppcrateLoadPlayableGamesLite === "function") {
      return window.AppcrateLoadPlayableGamesLite();
    }
    return fetchFirstOk([
      siteUrl("assets/data/playgames-lite.json?v=remote-first-20260811"),
      "/assets/data/playgames-lite.json?v=remote-first-20260811",
    ]).then((response) => {
      if (!response) throw new Error("Playable games unavailable");
      return response.json();
    });
  };

  const loadGame = async () => {
    const requestedSlug = requestedSlugFromLocation();

    try {
      const [detailResponse, source] = await Promise.all([
        fetchFirstOk([
          siteUrl(
            `assets/data/playgames-detail/${encodeURIComponent(requestedSlug)}.json?v=remote-first-20260811`,
          ),
          `/assets/data/playgames-detail/${encodeURIComponent(requestedSlug)}.json?v=remote-first-20260811`,
        ]),
        loadLiteCatalog(),
      ]);
      const detail = detailResponse ? await detailResponse.json() : null;
      const games = source.slice(0, SOURCE_LIMIT);
      const liteMatch = games.find((item) => gameSlug(item) === requestedSlug);
      const game = detail
        ? { ...liteMatch, ...detail }
        : {
            ...(liteMatch || {
              name: requestedSlug,
              slug: requestedSlug,
              category: "Online Game",
            }),
            embedUrl: defaultEmbedUrl(requestedSlug),
          };
      if (!game.embedUrl) game.embedUrl = defaultEmbedUrl(gameSlug(game) || requestedSlug);
      const index = games.findIndex((item) => gameSlug(item) === requestedSlug);
      if (!game) return;
      applyGame(game, index >= 0 ? index : 0, games, requestedSlug);
    } catch (error) {
      console.error("Online game detail load error:", error);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadGame, { once: true });
  } else {
    loadGame();
  }

})();
