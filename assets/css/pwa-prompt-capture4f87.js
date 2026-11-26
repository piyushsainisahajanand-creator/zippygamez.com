(() => {
  "use strict";

  if (window.__appcratePwaPromptCaptureReady) return;
  window.__appcratePwaPromptCaptureReady = true;

  const enforcePortraitOrientation = () => {
    const standalone =
      window.navigator.standalone === true ||
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.matchMedia?.("(display-mode: fullscreen)").matches;
    if (!standalone || typeof window.screen?.orientation?.lock !== "function") return;
    window.screen.orientation.lock("portrait").catch(() => {});
  };

  const normalizePath = (href) => {
    try {
      return new URL(href, window.location.href).pathname.replace(/\/+$/, "") || "/";
    } catch (_) {
      return "";
    }
  };

  const routeItemFromPath = () => {
    const parts = window.location.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    if (parts[0] === "app" && parts[1]) {
      return {
        itemType: "app",
        itemSlug: parts[1],
        itemManifestUrl: `/app/${parts[1]}/manifest.webmanifest`,
      };
    }
    if (parts[0] === "topgames" && parts[1]) {
      return {
        itemType: "topgame",
        itemSlug: parts[1],
        itemManifestUrl: `/topgames/${parts[1]}/manifest.webmanifest`,
      };
    }
    if (parts[0] === "playgames" && parts[1]) {
      return {
        itemType: "playgame",
        itemSlug: parts[1],
        itemManifestUrl: `/playgames/${parts[1]}/manifest.webmanifest`,
      };
    }
    return null;
  };

  const getActiveManifestHref = (fallback = "") => {
    const link = document.querySelector('link[rel="manifest"]');
    return normalizePath(link?.href || fallback);
  };

  const getPageItemName = () => {
    const node = document.querySelector("#gameTitle, .game-d-banner h1, h1, .game-title");
    const raw = node?.textContent || document.title || "";
    return raw.replace(/\s+-\s+.*$/, "").trim();
  };

  const getPageItemIcon = () => {
    const image = document.querySelector(
      "#gameLogo, .game-d-banner img, .game-logo img, .app-logo img, section.game-info img, img[alt]",
    );
    return image?.currentSrc || image?.src || "";
  };

  const clearPrompt = () => {
    window.__deferredPwaPrompt = null;
    window.__pwaPromptAvailable = false;
    if (window.__pwaInstallState) {
      window.__pwaInstallState.deferredPrompt = null;
      window.__pwaInstallState.promptAvailable = false;
    }
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    const item = routeItemFromPath();
    const manifestHref = getActiveManifestHref(item?.itemManifestUrl);

    window.__deferredPwaPrompt = event;
    window.__pwaPromptAvailable = Boolean(item);
    window.__pwaInstallState = {
      deferredPrompt: event,
      manifestHref,
      itemType: item?.itemType || null,
      itemSlug: item?.itemSlug || null,
      itemName: getPageItemName(),
      itemIcon: getPageItemIcon(),
      promptAvailable: Boolean(item),
      earlyCaptured: true,
      capturedAt: Date.now(),
    };
  });

  window.addEventListener("appinstalled", clearPrompt);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enforcePortraitOrientation, { once: true });
  } else {
    enforcePortraitOrientation();
  }
})();
