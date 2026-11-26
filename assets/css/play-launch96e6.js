(() => {
  const SOURCE_LIMIT = 500;
  const MORE_GAMES_LIMIT = 24;
  let currentGamePath = "";
  let currentGameName = "Online Game";
  let hasStartedGame = false;
  let playerOriginalParent = null;
  let playerOriginalNextSibling = null;
  let cssFullscreenActive = false;
  let cssFullscreenHistoryPushed = false;

  const AUTO_LAUNCH_PARAM = "launch";
  const autoLaunchRequested =
    new URLSearchParams(window.location.search).get(AUTO_LAUNCH_PARAM) === "1";

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

  const requestedSlugFromLocation = () => {
    const parts = window.location.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    const playgamesIndex = parts.indexOf("playgames");
    if (playgamesIndex >= 0 && parts[playgamesIndex + 1]) {
      return slugify(parts[playgamesIndex + 1]);
    }
    return slugify(new URLSearchParams(window.location.search).get("name"));
  };

  const defaultEmbedUrl = (slug) =>
    slug ? `https://play.gamepix.com/${encodeURIComponent(slug)}/embed?sid=TA72T` : "";

  const gameLaunchUrl = (game) => {
    const embedUrl = String(game?.embedUrl || "").trim();
    if (/^https:\/\//i.test(embedUrl)) return embedUrl;
    return defaultEmbedUrl(gameSlug(game));
  };

  const isPlayable = (game) => Boolean(game?.name && gameLaunchUrl(game));

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

  const asArray = (items) => {
    if (!items) return [];
    if (Array.isArray(items)) return items.map(cleanText).filter(Boolean);
    return [cleanText(items)].filter(Boolean);
  };

  const ratingFor = (game) => {
    const rating = Number(game?.rating);
    return Number.isFinite(rating) ? rating.toFixed(1) : "N/A";
  };
  let lockedScrollY = 0;

  const shuffle = (items) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const renderMoreGames = (games, currentSlug) => {
    const node = $("#moreGames");
    if (!node) return;

    const moreGames = shuffle(
      games.filter((game) => isPlayable(game) && gameSlug(game) !== currentSlug),
    ).slice(0, MORE_GAMES_LIMIT);

    setText("#moreGamesCount", `${moreGames.length} Games`);

    const cards = moreGames.map((game, index) => {
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

  const createStickyPlayCta = ({ sourceButton, text, kicker, href }) => {
    if (!sourceButton || document.querySelector(".sticky-online-game-cta")) return;

    const sticky = document.createElement("div");
    sticky.className = "sticky-download-cta sticky-online-game-cta";
    sticky.setAttribute("aria-hidden", "true");

    const button = document.createElement("a");
    button.className = "sticky-download-cta__button sticky-online-game-cta__button";
    button.href = href;
    button.setAttribute("aria-label", text);

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
    button.append(label, icon);
    sticky.appendChild(button);
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
      const shouldShow =
        visible &&
        !footerVisible &&
        !document.body.classList.contains("online-game-fullscreen-open");
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
    window.addEventListener("online-game-sticky-sync", requestSync);
    sync();
  };

  const setFullscreenOpen = (open) => {
    document.documentElement.classList.toggle("online-game-fullscreen-open", open);
    document.body.classList.toggle("online-game-fullscreen-open", open);
  };

  const lockPageScroll = () => {
    lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    setFullscreenOpen(true);
  };

  const unlockPageScroll = () => {
    setFullscreenOpen(false);
    window.scrollTo(0, lockedScrollY);
  };

  const requestNativeFullscreen = async (target) => {
    if (!target) return false;
    const activeFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    if (activeFullscreen === target) return true;

    if (target.requestFullscreen) {
      try {
        await target.requestFullscreen({ navigationUI: "hide" });
        return true;
      } catch (_optionsError) {
        try {
          await target.requestFullscreen();
          return true;
        } catch (_requestError) {
          return false;
        }
      }
    }

    try {
      if (target.webkitRequestFullscreen) {
        target.webkitRequestFullscreen();
        return true;
      }
    } catch (_webkitError) {
      return false;
    }

    return false;
  };

  const mountPlayerAtRoot = (card) => {
    if (!card || card.parentElement === document.body) return;
    playerOriginalParent = card.parentElement;
    playerOriginalNextSibling = card.nextSibling;
    document.body.appendChild(card);
  };

  const restorePlayerMount = (card) => {
    if (!card || !playerOriginalParent) return;
    if (playerOriginalNextSibling && playerOriginalNextSibling.parentNode === playerOriginalParent) {
      playerOriginalParent.insertBefore(card, playerOriginalNextSibling);
    } else {
      playerOriginalParent.appendChild(card);
    }
    playerOriginalParent = null;
    playerOriginalNextSibling = null;
  };

  const keepGameInline = () => {
    const card = $("#playFrameCard");
    if (!card || !hasStartedGame) return;

    cssFullscreenActive = false;
    card.classList.remove("is-css-fullscreen");
    restorePlayerMount(card);
    card.classList.add("is-active", "is-inline");
    unlockPageScroll();
    window.dispatchEvent(new CustomEvent("online-game-sticky-sync"));
  };

  const enterCssFullscreen = (card) => {
    if (!card) return;

    cssFullscreenActive = true;
    mountPlayerAtRoot(card);
    card.classList.add("is-active", "is-css-fullscreen");
    card.classList.remove("is-inline");
    setFullscreenOpen(true);

    if (!cssFullscreenHistoryPushed) {
      try {
        const previousState =
          history.state && typeof history.state === "object" ? history.state : {};
        history.pushState({ ...previousState, __onlineGameFullscreen: true }, "", location.href);
        cssFullscreenHistoryPushed = true;
      } catch (_historyError) {
        cssFullscreenHistoryPushed = false;
      }
    }

    window.dispatchEvent(new CustomEvent("online-game-sticky-sync"));
  };

  const exitCssFullscreen = (consumeHistory = false) => {
    if (!cssFullscreenActive) return;
    const shouldGoBack = consumeHistory && cssFullscreenHistoryPushed;
    cssFullscreenHistoryPushed = false;
    keepGameInline();
    if (shouldGoBack) history.back();
  };

  const startGame = () => {
    if (!currentGamePath) return;
    const frame = $("#gameFrame");
    const card = $("#playFrameCard");
    const frameWrap = $("#playFrameWrap");
    if (!frame || !card || !frameWrap) return;

    hasStartedGame = true;
    frame.allowFullscreen = true;
    if (frame.getAttribute("src") !== currentGamePath) {
      frame.src = currentGamePath;
    }

    card.classList.add("is-active");
    card.classList.remove("is-inline");
    lockPageScroll();
    window.dispatchEvent(new CustomEvent("online-game-sticky-sync"));

    requestNativeFullscreen(frameWrap).then((opened) => {
      const activeFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
      if (!opened && !activeFullscreen) enterCssFullscreen(card);
    });
  };

  const ensurePlayAnchor = (node) => {
    if (!node) return null;
    const href = `${window.location.pathname}?${AUTO_LAUNCH_PARAM}=1`;
    if (node instanceof HTMLAnchorElement) {
      node.href = href;
      return node;
    }

    const anchor = document.createElement("a");
    Array.from(node.attributes).forEach((attribute) => {
      if (attribute.name !== "type") anchor.setAttribute(attribute.name, attribute.value);
    });
    anchor.href = href;
    anchor.innerHTML = node.innerHTML;
    node.replaceWith(anchor);
    return anchor;
  };

  const applyGame = (game, games, index) => {
    const slug = gameSlug(game);
    currentGameName = game.name || "Online Game";
    currentGamePath = gameLaunchUrl(game);
    const category = game.category || "Online Game";
    const controls = asArray(game.controls);
    const controlsText = controls.join(" ");
    const controlLabel =
      cleanText(game.controlLabel) ||
      (/swipe|arrow|keyboard/i.test(controlsText) ? "Swipe + Arrow Keys" : "Touch + Keyboard");
    const highlights = [
      controlLabel,
      game.category ? `${game.category} gameplay` : "Instant online gameplay",
      "No app install required",
    ];

    const pageTitle = `${currentGameName} - Play Online`;
    if (document.title !== pageTitle) document.title = pageTitle;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      const nextDescription = cleanText(game.description || game.longDescription).slice(0, 150);
      if (metaDesc.getAttribute("content") !== nextDescription) {
        metaDesc.setAttribute("content", nextDescription);
      }
    }

    const logo = $("#launchLogo");
    if (logo) {
      logo.dataset.localFallback = game.localLogo || logo.dataset.localFallback || "";
      logo.referrerPolicy = "no-referrer";
      logo.onerror = function () {
        logo.onerror = null;
        logo.removeAttribute("srcset");
        if (logo.dataset.localFallback) logo.src = logo.dataset.localFallback;
      };
      if (logo.getAttribute("src") !== game.logo) logo.src = game.logo;
      if (logo.alt !== currentGameName) logo.alt = currentGameName;
    }

    setText("#launchCategory", game.category ? `Game ${game.category}` : "Online Game");
    setText("#launchTitle", currentGameName);
    setText("#launchDesc", shortHeaderText(game, category));
    setText("#frameTitle", currentGameName);
    setText("#playInfoCategory", category);
    setText("#playInfoScore", ratingFor(game));
    setText("#launchRating", ratingFor(game));
    setText("#playInfoControls", controlLabel);
    setText("#playContextTitle", `Before You Play ${currentGameName}`);
    setText(
      "#playContextDesc",
      game.gameplay ||
        game.whyPlay ||
        `${currentGameName} opens directly in your browser. Press Play when you are ready and use fullscreen for the cleanest experience.`,
    );
    setText(
      "#launchGameplay",
      game.gameplay ||
        game.description ||
        `${currentGameName} is built for quick browser play with simple controls and a smooth HTML5 experience.`,
    );
    setText(
      "#launchWhyPlay",
      game.whyPlay ||
        `${currentGameName} is a good pick when you want a fast game that opens instantly and works across phones, tablets, and desktop browsers.`,
    );

    const contextList = $("#playContextList");
    if (contextList) {
      const normalizedHighlights = highlights.map(cleanText);
      const currentHighlights = Array.from(
        contextList.children,
        (item) => item.textContent.trim(),
      );
      if (
        currentHighlights.length !== normalizedHighlights.length ||
        !currentHighlights.every((item, highlightIndex) =>
          item === normalizedHighlights[highlightIndex],
        )
      ) {
        contextList.replaceChildren(
          ...normalizedHighlights.map((item) => {
            const li = document.createElement("li");
            li.textContent = item;
            return li;
          }),
        );
      }
    }

    renderMoreGames(games, slug);

    if (window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
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

  const loadGameDetail = async (requestedSlug) => {
    const response = await fetchFirstOk([
      siteUrl(
        `assets/data/playgames-detail/${encodeURIComponent(requestedSlug)}.json?v=remote-first-20260811`,
      ),
      `/assets/data/playgames-detail/${encodeURIComponent(requestedSlug)}.json?v=remote-first-20260811`,
    ]);
    if (response) return response.json();
    return null;
  };

  const loadGame = async () => {
    const requestedSlug = requestedSlugFromLocation();

    try {
      const [detail, source] = await Promise.all([
        loadGameDetail(requestedSlug),
        loadLiteCatalog(),
      ]);
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
      const index = Math.max(0, games.findIndex((item) => gameSlug(item) === requestedSlug));
      if (game) {
        applyGame(game, games, index);
        if (autoLaunchRequested) window.requestAnimationFrame(startGame);
      }
    } catch (error) {
      console.error("Online game launch load error:", error);
    }
  };

  const initActions = () => {
    const playButton = ensurePlayAnchor($("#launchPlayBtn"));
    if (playButton) {
      createStickyPlayCta({
        sourceButton: playButton,
        text: "Play Now",
        href: playButton.href,
      });
    }

    const restartButton = $("#restartGameBtn");
    if (restartButton) {
      restartButton.addEventListener("click", () => {
        const frame = $("#gameFrame");
        if (!frame || !currentGamePath) return;
        frame.src = "about:blank";
        requestAnimationFrame(() => {
          frame.src = currentGamePath;
        });
      });
    }

    const fullscreenButton = $("#fullscreenGameBtn");
    if (fullscreenButton) {
      fullscreenButton.addEventListener("click", () => {
        const frameWrap = $("#playFrameWrap");
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else {
          lockPageScroll();
          requestNativeFullscreen(frameWrap).then((opened) => {
            const activeFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
            if (!opened && !activeFullscreen) enterCssFullscreen($("#playFrameCard"));
          });
        }
      });
    }

    const onFullscreenChange = () => {
      const frameWrap = $("#playFrameWrap");
      const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;

      if (fullscreenElement === frameWrap) {
        setFullscreenOpen(true);
        return;
      }

      if (!fullscreenElement && hasStartedGame) {
        if (cssFullscreenActive) {
          exitCssFullscreen(true);
        } else {
          keepGameInline();
        }
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && cssFullscreenActive) exitCssFullscreen(true);
    });
    window.addEventListener("popstate", () => {
      if (!cssFullscreenActive) return;
      cssFullscreenHistoryPushed = false;
      keepGameInline();
    });
  };

  const init = () => {
    initActions();
    loadGame();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
