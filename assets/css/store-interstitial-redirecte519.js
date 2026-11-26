(() => {
  "use strict";

  if (window.__APPCRATE_STORE_INTERSTITIAL_INITIALIZED__) return;
  window.__APPCRATE_STORE_INTERSTITIAL_INITIALIZED__ = true;

  const STORE_BUTTON_SELECTOR = [
    ".download-btns a.btn-playstore[href]",
    ".download-btns a.btn-appstore[href]",
    ".sticky-store-cta a[href]",
    "a[href*='play.google.com/store/apps/details']",
    "a[href*='apps.apple.com']",
  ].join(",");

  const STORE_BRIDGE_PATH = "/store-redirect/";
  const ALLOWED_STORE_HOSTS = new Set(["play.google.com", "apps.apple.com"]);

  const getStoreDestination = (link) => {
    if (!(link instanceof HTMLAnchorElement)) return null;

    const savedDestination = link.dataset.storeDestination;
    const candidate = savedDestination || link.getAttribute("href");
    if (!candidate) return null;

    try {
      const url = new URL(candidate, window.location.href);
      if (url.protocol !== "https:" || !ALLOWED_STORE_HOSTS.has(url.hostname.toLowerCase())) {
        return null;
      }
      // Accept Play Store details + search, and App Store app + search links.
      return url.href;
    } catch (_) {
      return null;
    }
  };

  const routeStoreLinkThroughBridge = (link) => {
    const destination = getStoreDestination(link);
    if (!destination) return;

    // Local mirrors have no /store-redirect/ bridge page — open the store directly.
    link.dataset.storeDestination = destination;
    link.href = destination;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  };

  const markStoreLinksEligible = (root = document) => {
    if (root instanceof HTMLAnchorElement && root.matches(STORE_BUTTON_SELECTOR)) {
      routeStoreLinkThroughBridge(root);
      root.removeAttribute("data-google-interstitial");
      root.removeAttribute("data-no-interstitial");
    }
    root.querySelectorAll?.(STORE_BUTTON_SELECTOR).forEach((link) => {
      routeStoreLinkThroughBridge(link);
      link.removeAttribute("data-google-interstitial");
      link.removeAttribute("data-no-interstitial");
    });
  };

  markStoreLinksEligible();

  if ("MutationObserver" in window && document.documentElement) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) markStoreLinksEligible(node);
        });
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  // Compatibility for a previously cached play launcher. Web interstitials are
  // now requested once by universal-gam-ads.js and managed by GPT on link clicks.
  window.AppcrateInterstitialGate = Object.freeze({
    isReady: () => window.AppcrateWebInterstitial?.getStatus?.() === "filled",
    preload: () => Promise.resolve(Boolean(window.AppcrateWebInterstitial?.isDefined?.())),
    run: (action) => {
      if (typeof action === "function") action();
      return Promise.resolve({ shown: false, status: "gpt-managed" });
    },
  });
})();
