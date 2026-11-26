(() => {
  "use strict";

  if (window.__APPCRATE_UNIVERSAL_GAM_ADS_INITIALIZED__) return;
  window.__APPCRATE_UNIVERSAL_GAM_ADS_INITIALIZED__ = true;

  const GPT_SCRIPT_URL = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
    const CONVERSION_SEND_TO = ""; // previous shared Ads event is off on this domain
  const CONFIG = {
    native01: "/23330730517/zippygamez.com_d1",
    native02: "/23330730517/zippygamez.com_d2",
    native03: "/23330730517/zippygamez.com_d2",
    interstitial: "/23330730517/zippygamez.com_inter",
    refreshDelay: 30000,
    maximumRefreshes: 2,
    minimumViewability: 50,
  };

  const NATIVE_01_SIZES = [[336, 280], [300, 250], [320, 100], [250, 250], "fluid"];
  const NATIVE_LOWER_SIZES = [[336, 280], [300, 250], [320, 100], [320, 480], [250, 250], "fluid"];
  const nativeSlots = new Map();
  const refreshStates = new Map();
  let listenersAttached = false;
  let servicesEnabled = Boolean(window.__APPCRATE_GPT_SERVICES_ENABLED__);
  let webInterstitialSlot = null;
  let webInterstitialStatus = "idle";

  const setWebInterstitialStatus = (status) => {
    webInterstitialStatus = status;
    document.documentElement.dataset.gamInterstitialStatus = status;
  };

  window.AppcrateWebInterstitial = Object.freeze({
    getStatus: () => webInterstitialStatus,
    isDefined: () => Boolean(webInterstitialSlot),
  });

  const setContainerState = (container, state, inner = null) => {
    if (!(container instanceof HTMLElement)) return;
    container.dataset.gamState = state;
    container.dataset.gamFilled = state === "filled" ? "true" : "false";
    container.setAttribute("aria-busy", state === "loading" ? "true" : "false");
    if (inner) inner.style.display = state === "empty" ? "none" : "flex";
  };

  const isValidAdUnit = (value) => typeof value === "string" && /^\/\d+\/[^/].+/.test(value.trim());

  const INTERSTITIAL_EXCLUDED_PATH =
    /\/(privacy|privacy-policy|terms|terms-and-conditions|contact|support|help|login|logout|register|signup|account|profile|settings|refund|cancellation)(\/|$)/i;

  const isStoreDestination = (url) =>
    /(^|\.)play\.google\.com$/i.test(url.hostname) || /(^|\.)apps\.apple\.com$/i.test(url.hostname);

  const processInterstitialLink = (link) => {
    if (!(link instanceof HTMLAnchorElement)) return;
    if (link.hasAttribute("data-no-interstitial")) {
      link.setAttribute("data-google-interstitial", "false");
      return;
    }

    try {
      const url = new URL(link.href, window.location.href);
      const allowedExternal = isStoreDestination(url);
      const shouldExclude =
        (!allowedExternal && url.origin !== window.location.origin) ||
        INTERSTITIAL_EXCLUDED_PATH.test(url.pathname) ||
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        !["http:", "https:"].includes(url.protocol);
      if (shouldExclude) link.setAttribute("data-google-interstitial", "false");
    } catch (_) {
      link.setAttribute("data-google-interstitial", "false");
    }
  };

  const scanInterstitialLinks = (root = document) => {
    if (root instanceof HTMLAnchorElement) processInterstitialLink(root);
    root.querySelectorAll?.("a[href]").forEach(processInterstitialLink);
  };

  const observeInterstitialLinks = () => {
    if (!("MutationObserver" in window) || !document.documentElement) return;
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) scanInterstitialLinks(node);
        });
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  };

  const setSlotTargeting = (slot, targeting) => {
    if (!slot || !targeting) return;
    if (typeof slot.setConfig === "function") {
      slot.setConfig({ targeting });
      return;
    }
    Object.entries(targeting).forEach(([key, value]) => slot.setTargeting(key, String(value)));
  };

  const getUnitForPosition = (position) => {
    if (position === 1) return CONFIG.native01;
    if (position === 2) return CONFIG.native02;
    return isValidAdUnit(CONFIG.native03) ? CONFIG.native03 : CONFIG.native02;
  };

  const loadGptScript = () => {
    if (window.googletag?.apiReady) return Promise.resolve(true);
    if (window.__APPCRATE_GPT_SCRIPT_PROMISE__) return window.__APPCRATE_GPT_SCRIPT_PROMISE__;

    window.googletag = window.googletag || { cmd: [] };
    window.__APPCRATE_GPT_SCRIPT_PROMISE__ = new Promise((resolve) => {
      const existing = document.querySelector(`script[src*="${GPT_SCRIPT_URL}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve(true), { once: true });
        existing.addEventListener("error", () => resolve(false), { once: true });
        window.setTimeout(() => resolve(Boolean(window.googletag?.apiReady)), 2500);
        return;
      }

      const script = document.createElement("script");
      script.async = true;
      script.src = GPT_SCRIPT_URL;
      script.crossOrigin = "anonymous";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });

    return window.__APPCRATE_GPT_SCRIPT_PROMISE__;
  };

  const injectSupportStyles = () => {
    if (document.getElementById("appcrate-universal-gam-style")) return;
    const style = document.createElement("style");
    style.id = "appcrate-universal-gam-style";
    style.textContent = `
      .ad-slot .gam-native-inner {
        position: relative;
        z-index: 2;
        display: flex;
        width: 100%;
        max-width: 100%;
        min-height: 1px;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        text-align: center;
      }
      .ad-slot .gam-native-inner > div,
      .ad-slot .gam-native-inner iframe {
        max-width: 100% !important;
      }
      .ad-slot[data-gam-filled="true"]::after {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  };

  const makePageKey = () =>
    (window.location.pathname || "home")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "home";

  const getExistingNativeContainers = () =>
    Array.from(document.querySelectorAll(".ad-slot")).filter((container) => {
      if (!(container instanceof HTMLElement)) return false;
      if (container.dataset.gamNativeDefined === "true") return false;
      if (container.closest("[data-no-auto-ads], [data-no-gam-ads]")) return false;
      return true;
    });

  const ensureInnerSlot = (container, position) => {
    const pageKey = makePageKey();
    const inner = document.createElement("div");
    inner.className = `gam-native-inner gam-native-inner--${position}`;
    inner.id = `appcrate-gam-native-${pageKey}-${position}-${Math.random().toString(36).slice(2, 8)}`;
    container.dataset.gamNativeDefined = "true";
    container.dataset.gamNativePosition = String(position);
    container.appendChild(inner);
    return inner;
  };

  const buildNative01Mapping = () =>
    googletag
      .sizeMapping()
      .addSize([768, 0], NATIVE_01_SIZES)
      .addSize([336, 0], [[336, 280], [320, 100], [300, 250], [250, 250], "fluid"])
      .addSize([320, 0], [[320, 100], [300, 250], [250, 250], "fluid"])
      .addSize([300, 0], [[300, 250], [250, 250], "fluid"])
      .addSize([250, 0], [[250, 250], "fluid"])
      .addSize([0, 0], "fluid")
      .build();

  const buildNativeLowerMapping = () =>
    googletag
      .sizeMapping()
      .addSize([768, 0], NATIVE_LOWER_SIZES)
      .addSize([336, 0], [[336, 280], [320, 480], [320, 100], [300, 250], [250, 250], "fluid"])
      .addSize([320, 0], [[320, 480], [320, 100], [300, 250], [250, 250], "fluid"])
      .addSize([300, 0], [[300, 250], [250, 250], "fluid"])
      .addSize([250, 0], [[250, 250], "fluid"])
      .addSize([0, 0], "fluid")
      .build();


  const attachConversionTracking = () => {
    if (window.__APPCRATE_CONVERSION_LISTENER_ADDED__) return;
    if (!window.googletag?.pubads) return;
    window.__APPCRATE_CONVERSION_LISTENER_ADDED__ = true;

    const firedUnits = new Set();
    googletag.pubads().addEventListener("impressionViewable", (event) => {
      if (typeof window.gtag !== "function") return;
      let unit = "";
      try {
        unit = event.slot.getAdUnitPath();
      } catch (_) {
        return;
      }
      if (firedUnits.has(unit)) return;
      firedUnits.add(unit);
      if (CONVERSION_SEND_TO) window.gtag("event", "conversion", { send_to: CONVERSION_SEND_TO });
    });
  };
  
  const enableServicesOnce = () => {
    if (servicesEnabled || window.__APPCRATE_GPT_SERVICES_ENABLED__) return;
    googletag.enableServices();
        attachConversionTracking();
    servicesEnabled = true;
    window.__APPCRATE_GPT_SERVICES_ENABLED__ = true;
  };

  const clearRefreshTimer = (state) => {
    if (!state?.timer) return;
    window.clearTimeout(state.timer);
    state.timer = null;
  };

  const scheduleRefresh = (slot) => {
    const state = refreshStates.get(slot);
    if (
      !state ||
      state.timer ||
      state.isEmpty ||
      !state.viewable ||
      state.visibility < CONFIG.minimumViewability ||
      state.refreshes >= CONFIG.maximumRefreshes ||
      document.visibilityState !== "visible"
    ) {
      return;
    }

    state.timer = window.setTimeout(() => {
      state.timer = null;
      if (
        state.isEmpty ||
        !state.viewable ||
        state.visibility < CONFIG.minimumViewability ||
        state.refreshes >= CONFIG.maximumRefreshes ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      state.refreshes += 1;
      state.viewable = false;
      try {
        setSlotTargeting(slot, {
          position: `native_${String(Math.min(state.position, 3)).padStart(2, "0")}`,
          refresh: "true",
          refresh_count: String(state.refreshes),
        });
        googletag.pubads().refresh([slot]);
      } catch (_) {}
    }, CONFIG.refreshDelay);
  };

  const attachListeners = () => {
    if (listenersAttached || !window.googletag?.pubads) return;
    listenersAttached = true;
    const pubads = googletag.pubads();

    pubads.addEventListener("slotRenderEnded", (event) => {
      if (webInterstitialSlot && event.slot === webInterstitialSlot) {
        setWebInterstitialStatus(event.isEmpty ? "no-fill" : "filled");
        return;
      }
      const data = nativeSlots.get(event.slot);
      if (!data) return;
      const state = refreshStates.get(event.slot);
      if (state) {
        clearRefreshTimer(state);
        state.viewable = false;
        state.isEmpty = Boolean(event.isEmpty);
      }

      setContainerState(data.container, event.isEmpty ? "empty" : "filled", data.inner);
    });

    pubads.addEventListener("slotVisibilityChanged", (event) => {
      const state = refreshStates.get(event.slot);
      if (!state) return;
      state.visibility = event.inViewPercentage || 0;
      if (state.visibility < CONFIG.minimumViewability) {
        clearRefreshTimer(state);
        return;
      }
      scheduleRefresh(event.slot);
    });

    pubads.addEventListener("impressionViewable", (event) => {
      if (webInterstitialSlot && event.slot === webInterstitialSlot) {
        setWebInterstitialStatus("viewable");
        return;
      }
      const state = refreshStates.get(event.slot);
      if (!state || state.isEmpty) return;
      state.viewable = true;
      state.visibility = Math.max(state.visibility, CONFIG.minimumViewability);
      scheduleRefresh(event.slot);
    });

    document.addEventListener("visibilitychange", () => {
      refreshStates.forEach((state, slot) => {
        if (document.visibilityState !== "visible") {
          clearRefreshTimer(state);
          return;
        }
        scheduleRefresh(slot);
      });
    });
  };

  const initGamAds = () => {
    const containers = getExistingNativeContainers();
    const interstitialAllowed =
      isValidAdUnit(CONFIG.interstitial) && !INTERSTITIAL_EXCLUDED_PATH.test(window.location.pathname);
    scanInterstitialLinks();
    observeInterstitialLinks();
    if (!containers.length && !interstitialAllowed) return;
    if (containers.length) injectSupportStyles();

    loadGptScript().then((loaded) => {
      if (!loaded && !window.googletag?.apiReady) {
        containers.forEach((container) => setContainerState(container, "empty"));
        if (interstitialAllowed) setWebInterstitialStatus("script-unavailable");
        return;
      }
      window.googletag = window.googletag || { cmd: [] };
      window.googletag.cmd.push(() => {
        if (typeof googletag.defineSlot !== "function") return;
        try {
          if (typeof googletag.setConfig === "function") {
            googletag.setConfig({
              centering: true,
              singleRequest: false,
              lazyLoad: {
                fetchMarginPercent: 300,
                renderMarginPercent: 100,
                mobileScaling: 2,
              },
            });
          }
        } catch (_) {}

        attachListeners();
        const native01Mapping = buildNative01Mapping();
        const nativeLowerMapping = buildNativeLowerMapping();
        const defined = [];

        containers.forEach((container, index) => {
          const position = index + 1;
          const adUnit = getUnitForPosition(position);
          if (!isValidAdUnit(adUnit)) return;

          const inner = ensureInnerSlot(container, position);
          setContainerState(container, "loading", inner);
          const sizes = position === 1 ? NATIVE_01_SIZES : NATIVE_LOWER_SIZES;
          const mapping = position === 1 ? native01Mapping : nativeLowerMapping;
          const slot = googletag.defineSlot(adUnit, sizes, inner.id);
          if (!slot) {
            setContainerState(container, "empty", inner);
            return;
          }

          slot.defineSizeMapping(mapping);
          setSlotTargeting(slot, {
            position: `native_${String(Math.min(position, 3)).padStart(2, "0")}`,
            refresh: "false",
            refresh_count: "0",
          });
          slot.addService(googletag.pubads());
          nativeSlots.set(slot, { container, inner, divId: inner.id, position });
          refreshStates.set(slot, {
            timer: null,
            visibility: 0,
            viewable: false,
            refreshes: 0,
            isEmpty: false,
            position,
          });
          defined.push(inner.id);
        });

        if (
          interstitialAllowed &&
          typeof googletag.defineOutOfPageSlot === "function" &&
          googletag.enums?.OutOfPageFormat?.INTERSTITIAL
        ) {
          webInterstitialSlot = googletag.defineOutOfPageSlot(
            CONFIG.interstitial,
            googletag.enums.OutOfPageFormat.INTERSTITIAL,
          );
          if (webInterstitialSlot) {
            setWebInterstitialStatus("loading");
            if (typeof webInterstitialSlot.setConfig === "function") {
              webInterstitialSlot.setConfig({
                interstitial: {
                  requireStorageAccess: false,
                  triggers: {
                    navBar: false,
                    unhideWindow: false,
                    inactivity: false,
                    endOfArticle: false,
                  },
                },
                targeting: { position: "web_interstitial" },
              });
            } else {
              webInterstitialSlot.setTargeting("position", "web_interstitial");
            }
            webInterstitialSlot.addService(googletag.pubads());
          } else {
            setWebInterstitialStatus("unsupported");
          }
        } else if (interstitialAllowed) {
          setWebInterstitialStatus("unsupported");
        }

        if (!defined.length && !webInterstitialSlot) return;
        enableServicesOnce();
        defined.forEach((id) => {
          try {
            googletag.display(id);
          } catch (_) {}
        });
        if (webInterstitialSlot) {
          try {
            googletag.display(webInterstitialSlot);
          } catch (_) {
            setWebInterstitialStatus("display-error");
          }
        }
      });
    }).catch(() => {
      containers.forEach((container) => setContainerState(container, "empty"));
      if (interstitialAllowed) setWebInterstitialStatus("script-unavailable");
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGamAds, { once: true });
  } else {
    initGamAds();
  }
})();
