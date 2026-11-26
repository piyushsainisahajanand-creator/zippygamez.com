(() => {
  "use strict";

  const page = document.body && document.body.dataset.page;
  const grid = page === "apps"
    ? document.querySelector('body[data-page="apps"] .game-list-2')
    : page === "playgames"
      ? document.getElementById("offlinegames")
      : null;
  if (!grid || grid.dataset.progressiveCatalog === "true") return;

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const constrained = Boolean(
    connection && (connection.saveData || /^(?:slow-2g|2g|3g)$/i.test(connection.effectiveType || "")),
  );
  const compact = window.matchMedia("(max-width: 700px)").matches;
  const lowEndDevice =
    constrained ||
    (Number.isFinite(navigator.deviceMemory) && navigator.deviceMemory <= 4) ||
    (Number.isFinite(navigator.hardwareConcurrency) && navigator.hardwareConcurrency <= 4);

  if (lowEndDevice) document.documentElement.dataset.reducedEffects = "true";

  const cards = Array.from(grid.children).filter((item) => item.matches("a.game-item[href]"));
  const initialCount = constrained ? 24 : compact ? 45 : 144;
  const batchSize = constrained ? 18 : compact ? 36 : 72;
  if (cards.length <= initialCount) return;

  const pending = cards.slice(initialCount);
  pending.forEach((card) => card.remove());
  grid.dataset.progressiveCatalog = "true";
  grid.dataset.totalCards = String(cards.length);
  grid.dataset.renderedCards = String(initialCount);

  const sentinel = document.createElement("div");
  sentinel.className = "catalog-loader-sentinel";
  sentinel.setAttribute("aria-hidden", "true");
  grid.insertAdjacentElement("afterend", sentinel);

  let scheduled = false;
  let observer = null;

  const refreshPage = () => {
    if (page === "apps" && typeof window.AppcrateAppsRefresh === "function") {
      window.AppcrateAppsRefresh();
    }
    if (page === "playgames") {
      if (typeof window.AppcratePlaygamesRefresh === "function") {
        window.AppcratePlaygamesRefresh();
      }
      if (typeof window.AppcratePlaygamesHydrateImages === "function") {
        window.AppcratePlaygamesHydrateImages(grid);
      }
    }
    window.dispatchEvent(new CustomEvent("catalog:batch-appended", {
      detail: { page, rendered: cards.length - pending.length, total: cards.length },
    }));
  };

  const cleanup = () => {
    if (observer) observer.disconnect();
    window.removeEventListener("scroll", checkNearEnd);
    window.removeEventListener("resize", checkNearEnd);
    sentinel.remove();
    grid.dataset.progressiveComplete = "true";
  };

  const appendBatch = () => {
    scheduled = false;
    if (!pending.length) {
      cleanup();
      return;
    }

    const fragment = document.createDocumentFragment();
    pending.splice(0, batchSize).forEach((card) => fragment.appendChild(card));
    grid.appendChild(fragment);
    grid.dataset.renderedCards = String(cards.length - pending.length);
    requestAnimationFrame(refreshPage);
    if (!pending.length) cleanup();
  };

  const scheduleBatch = () => {
    if (scheduled || !pending.length) return;
    scheduled = true;
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(appendBatch, { timeout: 240 });
    } else {
      requestAnimationFrame(appendBatch);
    }
  };

  function checkNearEnd() {
    if (!sentinel.isConnected || !pending.length) return;
    const prefetchDistance = constrained ? 0 : 180;
    if (sentinel.getBoundingClientRect().top < window.innerHeight + prefetchDistance) {
      scheduleBatch();
    }
  }

  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) scheduleBatch();
      },
      { rootMargin: constrained ? "0px" : "180px 0px" },
    );
    observer.observe(sentinel);
  }

  window.addEventListener("scroll", checkNearEnd, { passive: true });
  window.addEventListener("resize", checkNearEnd, { passive: true });

  let scrollTimer = 0;
  window.addEventListener("scroll", () => {
    document.documentElement.classList.add("is-scrolling");
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      document.documentElement.classList.remove("is-scrolling");
    }, 140);
  }, { passive: true });

  requestAnimationFrame(() => {
    refreshPage();
    checkNearEnd();
  });
})();
