(() => {
  "use strict";

  if (window.__APPCRATE_REWARDED_PWA_FLOW_INITIALIZED__) return;
  window.__APPCRATE_REWARDED_PWA_FLOW_INITIALIZED__ = true;
  window.__APPCRATE_REWARDED_DOWNLOAD_FLOW_INITIALIZED__ = true;

  const DOWNLOAD_READY_TEXT = "Download";
  const PLAY_READY_TEXT = "Ready to Play";
  const LOADING_TEXT = "Loading...";
  const RETRY_TEXT = "Try Again";
  const POLICY_NOTE_TEXT = "A short ad may appear before the content opens.";
  const INSTALL_BRIDGE_TEXT = "Install & Continue";
  const CONTINUE_BRIDGE_TEXT = "Continue";
  const INSTALL_BRIDGE_TIMEOUT_MS = 5000;
  const PWA_PROMPT_WAIT_MS = 400;
  const REWARDED_RETRY_TIMEOUT_MS = 1800;
  const REWARDED_AVAILABILITY_TIMEOUT_MS = 2000;
  const REWARDED_SHOW_TIMEOUT_MS = 120000;
  const REWARDED_CLOSE_EVENT_GRACE_MS = 1200;
  const REWARDED_EARLY_CLOSE_THRESHOLD_MS = 2500;
  const REWARDED_SLOT_CLEANUP_DELAY_MS = 300;
  const REWARDED_WARMUP_RETRY_MS = 2600;
  const REWARDED_WARMUP_MAX_ATTEMPTS = 3;
  const PWA_MANIFEST_VERSION = "pwa-portrait-20260713";
  const GPT_REWARDED_AD_UNIT = "/23330730517/zippygamez.com_reward";
  const PRIMARY_CTA_SELECTOR = "section.download .btn-down.enable, #playBtn";
  const CONVERSION_SEND_TO = ""; // previous shared Ads event is off on this domain
  const CTA_SELECTOR =
    "section.download .btn-down.enable, #playBtn, [data-pwa-play-cta=\"true\"], .sticky-download-cta__button";
  const DEBUG = Boolean(window.APPCRATE_REWARDED_PWA_DEBUG);

  let deferredInstallPrompt = null;
  let pwaServiceWorkerPromise = null;
  let flowInProgress = false;
  let currentFlowState = null;
  let gptScriptPromise = window.__APPCRATE_GPT_SCRIPT_PROMISE__ || null;
  let rewardedLoadPromise = null;
  let rewardedSlot = null;
  let rewardedReadyEvent = null;
  let rewardedGranted = false;
  let rewardedVideoCompleted = false;
  let rewardedVisibleAt = 0;
  let rewardedClosedAt = 0;
  let rewardedClosePending = false;
  let rewardedCloseTimer = 0;
  let rewardedShowResolver = null;
  let rewardedReadyResolver = null;
  let rewardedListenersAttached = false;
  let gptServicesEnabled = Boolean(window.__APPCRATE_GPT_SERVICES_ENABLED__);
  let rewardedLastStatus = "idle";
  let rewardedWarmupTimer = 0;
  let rewardedWarmupAttempts = 0;
  let rewardedLoadGeneration = 0;

  const debug = (...args) => {
    if (DEBUG) console.log("[RewardedPWA]", ...args);
  };

  const recordRewardedResult = (result) => {
    window.__APPCRATE_REWARDED_LAST_RESULT__ = {
      ...result,
      timestamp: Date.now(),
    };
    debug("rewarded lifecycle result", window.__APPCRATE_REWARDED_LAST_RESULT__);
  };

  const normalizePath = (href) => {
    try {
      return new URL(href, window.location.href).pathname.replace(/\/+$/, "") || "/";
    } catch (_) {
      return "";
    }
  };

  const getActiveManifestHref = () => {
    const link = document.querySelector('link[rel="manifest"]');
    return link ? normalizePath(link.href) : "";
  };

  const routeItemFromPath = () => {
    const parts = window.location.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    if (parts[0] === "app" && parts[1]) {
      return { itemType: "app", itemSlug: parts[1], itemManifestUrl: `/app/${parts[1]}/manifest.webmanifest` };
    }
    if (parts[0] === "topgames" && parts[1]) {
      return {
        itemType: "topgame",
        itemSlug: parts[1],
        itemManifestUrl: `/topgames/${parts[1]}/manifest.webmanifest`,
      };
    }
    if (parts[0] === "playgames" && parts[1] && parts[2] !== "play") {
      return {
        itemType: "playgame",
        itemSlug: parts[1],
        itemManifestUrl: `/playgames/${parts[1]}/manifest.webmanifest`,
      };
    }
    return null;
  };

  const getPageItemName = () => {
    const titleNode = document.querySelector(
      "#gameTitle, .app-header .title, .game-d-banner .title, .game-info .title, .game-d-banner h1, h1, .game-title",
    );
    const raw = titleNode?.textContent || document.title || "";
    return raw.replace(/\s+-\s+.*$/, "").trim();
  };

  const getPageItemIcon = () => {
    const image = document.querySelector(
      "#gameLogo, .game-d-banner img, .game-logo img, .app-logo img, section.game-info img, img[alt]",
    );
    return image?.currentSrc || image?.src || "";
  };

  const getCurrentFlowState = (targetUrl = "") => {
    const routeItem = routeItemFromPath();
    if (!routeItem) return null;
    const itemManifestUrl = normalizePath(routeItem.itemManifestUrl);
    return {
      ...routeItem,
      itemManifestUrl,
      itemName: getPageItemName(),
      itemIcon: getPageItemIcon(),
      targetUrl,
      rewardedDone: false,
      pwaDone: false,
      navigated: false,
    };
  };

  const getPromptState = () => window.__pwaInstallState || null;

  const clearStalePwaPrompt = () => {
    deferredInstallPrompt = null;
    window.__deferredPwaPrompt = null;
    window.__pwaPromptAvailable = false;
    if (window.__pwaInstallState) {
      window.__pwaInstallState.deferredPrompt = null;
      window.__pwaInstallState.promptAvailable = false;
    }
  };

  const saveInstallPrompt = (event) => {
    event.preventDefault();
    const item = getCurrentFlowState();
    const promptState = {
      deferredPrompt: event,
      manifestHref: getActiveManifestHref(),
      itemType: item?.itemType || null,
      itemSlug: item?.itemSlug || null,
      itemName: item?.itemName || null,
      itemIcon: item?.itemIcon || null,
      promptAvailable: Boolean(item),
    };
    window.__pwaInstallState = promptState;
    window.__deferredPwaPrompt = event;
    window.__pwaPromptAvailable = Boolean(item);
    deferredInstallPrompt = event;
    debug("beforeinstallprompt captured for item:", promptState.itemType, promptState.itemSlug);
  };

  const isSamePwaItem = (promptState, flowState) => {
    if (!promptState?.deferredPrompt || !flowState) return false;
    if (!flowState.itemName || !flowState.itemManifestUrl) return false;
    if (promptState.itemType !== flowState.itemType) return false;
    if (promptState.itemSlug !== flowState.itemSlug) return false;
    if (normalizePath(promptState.manifestHref) !== normalizePath(flowState.itemManifestUrl)) return false;
    if (getActiveManifestHref() !== normalizePath(flowState.itemManifestUrl)) return false;
    return true;
  };

  const canShowItemPwaPrompt = (flowState) => {
    if (isStandalonePwa()) return false;
    const promptState = getPromptState();
    if (isSamePwaItem(promptState, flowState)) return true;
    if (promptState?.deferredPrompt) {
      debug("stale/global prompt ignored", {
        expected: flowState?.itemManifestUrl,
        captured: promptState.manifestHref,
        type: promptState.itemType,
        slug: promptState.itemSlug,
      });
      clearStalePwaPrompt();
    }
    return false;
  };

  const setItemManifest = (flowState) => {
    if (!flowState?.itemManifestUrl) return false;
    let link = document.querySelector('link[rel="manifest"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    const versionedManifestUrl = `${flowState.itemManifestUrl}?v=${PWA_MANIFEST_VERSION}`;
    if (link.href !== new URL(versionedManifestUrl, window.location.href).href) {
      link.href = versionedManifestUrl;
      debug("active item manifest set:", versionedManifestUrl);
    }
    return true;
  };

  const isStandalonePwa = () => {
    if (window.navigator.standalone === true) return true;
    if (!window.matchMedia) return false;
    const appModes = ["standalone", "minimal-ui", "fullscreen", "window-controls-overlay"];
    if (appModes.some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches)) return true;
    return false;
  };

  const sameOriginHref = (href) => {
    try {
      const url = new URL(href, window.location.href);
      return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : url.href;
    } catch (_) {
      return href;
    }
  };

  const readyTextFor = (flowState = getCurrentFlowState()) =>
    flowState?.itemType === "playgame" ? PLAY_READY_TEXT : DOWNLOAD_READY_TEXT;

  const ensureSitePwaTags = () => {
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifest = document.createElement("link");
      manifest.rel = "manifest";
      manifest.href = `/manifest.webmanifest?v=${PWA_MANIFEST_VERSION}`;
      document.head.appendChild(manifest);
    }

    if (!document.querySelector('meta[name="theme-color"]')) {
      const theme = document.createElement("meta");
      theme.name = "theme-color";
      theme.content = "#eef8f9";
      document.head.appendChild(theme);
    }
  };

  const registerPwaWorker = () => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
      return Promise.resolve(null);
    }
    if (!pwaServiceWorkerPromise) {
      pwaServiceWorkerPromise = navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((error) => {
          console.warn("PWA service worker registration failed:", error);
          return null;
        });
    }
    return pwaServiceWorkerPromise;
  };

  const setCtaText = (button, text) => {
    const textNode = button.querySelector(".cta, .sticky-download-cta__text");
    if (textNode) {
      textNode.textContent = text;
    }
    button.setAttribute("aria-label", text);
  };

  const setAllCtaState = ({ href, text = readyTextFor(), loading = false } = {}) => {
    document.querySelectorAll(CTA_SELECTOR).forEach((button) => {
      if (href && sameOriginHref(button.getAttribute("href")) !== sameOriginHref(href)) return;
      setCtaText(button, text);
      button.classList.toggle("is-loading", loading);
      button.setAttribute("aria-busy", loading ? "true" : "false");
    });
  };

  const protectRewardedCtasFromWebInterstitial = (root = document) => {
    if (root instanceof Element && root.matches(CTA_SELECTOR)) {
      root.setAttribute("data-google-interstitial", "false");
    }
    root.querySelectorAll?.(CTA_SELECTOR).forEach((button) => {
      button.setAttribute("data-google-interstitial", "false");
    });
  };

  const observeRewardedCtas = () => {
    if (!("MutationObserver" in window) || !document.documentElement) return;
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) protectRewardedCtasFromWebInterstitial(node);
        });
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  };

  const ensurePolicyNote = (button) => {
    const isPlayGame = routeItemFromPath()?.itemType === "playgame";
    const holder = isPlayGame
      ? button.closest(".online-play-section > div") || button.parentElement
      : button.parentElement;
    const noteClass = isPlayGame ? "rewarded-policy-note" : "rewarded-download-note";
    if (!holder || holder.querySelector(`.${noteClass}`)) return;

    const note = document.createElement("p");
    note.className = noteClass;
    note.textContent = POLICY_NOTE_TEXT;
    holder.appendChild(note);
  };

  const loadGptScript = () => {
    if (isStandalonePwa()) {
      rewardedLastStatus = "standalone-skip";
      return Promise.resolve(null);
    }
    if (window.googletag?.apiReady) return Promise.resolve(true);
    if (window.__APPCRATE_GPT_SCRIPT_PROMISE__) {
      const sharedPromise = window.__APPCRATE_GPT_SCRIPT_PROMISE__;
      gptScriptPromise = sharedPromise;
      return Promise.resolve(sharedPromise)
        .then((loaded) => {
          if (loaded || window.googletag?.apiReady) return true;

          if (window.__APPCRATE_GPT_SCRIPT_PROMISE__ === sharedPromise) {
            window.__APPCRATE_GPT_SCRIPT_PROMISE__ = null;
          }
          if (gptScriptPromise === sharedPromise) gptScriptPromise = null;
          const failedScript = document.querySelector(
            'script[src*="securepubads.g.doubleclick.net/tag/js/gpt.js"]',
          );
          if (failedScript && !window.googletag?.apiReady) failedScript.remove();
          return loadGptScript();
        })
        .catch((error) => {
          console.warn("Google rewarded ad failed to load:", error);
          if (window.__APPCRATE_GPT_SCRIPT_PROMISE__ === sharedPromise) {
            window.__APPCRATE_GPT_SCRIPT_PROMISE__ = null;
          }
          if (gptScriptPromise === sharedPromise) gptScriptPromise = null;
          const failedScript = document.querySelector(
            'script[src*="securepubads.g.doubleclick.net/tag/js/gpt.js"]',
          );
          if (failedScript && !window.googletag?.apiReady) failedScript.remove();
          return loadGptScript();
        });
    }
    if (gptScriptPromise) return gptScriptPromise;

    window.googletag = window.googletag || { cmd: [] };
    gptScriptPromise = new Promise((resolve) => {
      const existing = document.querySelector('script[src*="securepubads.g.doubleclick.net/tag/js/gpt.js"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(true), { once: true });
        existing.addEventListener("error", () => resolve(false), { once: true });
        window.setTimeout(() => resolve(Boolean(window.googletag?.apiReady)), REWARDED_AVAILABILITY_TIMEOUT_MS);
        return;
      }

      const script = document.createElement("script");
      script.async = true;
      script.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
      script.crossOrigin = "anonymous";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    }).catch((error) => {
      console.warn("Google rewarded ad failed to load:", error);
      return false;
    });

    window.__APPCRATE_GPT_SCRIPT_PROMISE__ = gptScriptPromise;
    return gptScriptPromise;
  };

  const resetRewardedSlot = () => {
    rewardedLoadGeneration += 1;
    if (rewardedCloseTimer) window.clearTimeout(rewardedCloseTimer);
    rewardedCloseTimer = 0;
    rewardedLoadPromise = null;
    rewardedReadyEvent = null;
    rewardedGranted = false;
    rewardedVideoCompleted = false;
    rewardedVisibleAt = 0;
    rewardedClosedAt = 0;
    rewardedClosePending = false;
    rewardedReadyResolver = null;
    if (rewardedSlot && window.googletag?.apiReady) {
      try {
        window.googletag.destroySlots([rewardedSlot]);
      } catch (error) {
        console.warn("Google rewarded slot cleanup failed:", error);
      }
    }
    rewardedSlot = null;
  };

  const finishRewardedShow = (fallbackStatus = "closed", { detectEarlyClose = true } = {}) => {
    const resolver = rewardedShowResolver;
    if (!resolver) return;

    rewardedShowResolver = null;
    if (rewardedCloseTimer) window.clearTimeout(rewardedCloseTimer);
    rewardedCloseTimer = 0;

    const lifecycleEnd = rewardedClosedAt || Date.now();
    const durationMs = rewardedVisibleAt ? Math.max(0, lifecycleEnd - rewardedVisibleAt) : 0;
    let status = fallbackStatus;
    if (rewardedGranted) {
      status = "granted";
    } else if (rewardedVideoCompleted) {
      status = "completed";
    } else if (
      detectEarlyClose &&
      rewardedClosePending &&
      durationMs < REWARDED_EARLY_CLOSE_THRESHOLD_MS
    ) {
      status = "early-closed";
    }

    rewardedLastStatus = status;
    const result = {
      status,
      granted: rewardedGranted,
      videoCompleted: rewardedVideoCompleted,
      durationMs,
    };
    recordRewardedResult({ ...result, shown: true });
    resolver(result);
    window.setTimeout(resetRewardedSlot, REWARDED_SLOT_CLEANUP_DELAY_MS);
  };
  // Shared with universal-gam-ads.js via a window flag so only one listener is
  // ever registered on the common pubads instance.
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
  
  const attachRewardedListeners = () => {
    if (rewardedListenersAttached || !window.googletag?.pubads) return;
    rewardedListenersAttached = true;

    googletag.pubads().addEventListener("rewardedSlotReady", (event) => {
      if (!rewardedSlot || event.slot !== rewardedSlot) return;
      rewardedReadyEvent = event;
      rewardedLastStatus = "ready";
      if (rewardedReadyResolver) {
        const resolveReady = rewardedReadyResolver;
        rewardedReadyResolver = null;
        resolveReady(true);
      }
    });

    googletag.pubads().addEventListener("rewardedSlotGranted", (event) => {
      if (!rewardedSlot || event.slot !== rewardedSlot) return;
      rewardedGranted = true;
      rewardedLastStatus = "granted";
      if (rewardedClosePending) finishRewardedShow("closed");
    });

    googletag.pubads().addEventListener("rewardedSlotVideoCompleted", (event) => {
      if (!rewardedSlot || event.slot !== rewardedSlot) return;
      rewardedVideoCompleted = true;
      rewardedLastStatus = "video-completed";
    });

    googletag.pubads().addEventListener("rewardedSlotClosed", (event) => {
      if (!rewardedSlot || event.slot !== rewardedSlot) return;
      rewardedLastStatus = "closed";
      rewardedClosePending = true;
      rewardedClosedAt = Date.now();

      // Continue to the PWA prompt immediately for every rewarded close.
      finishRewardedShow("closed", { detectEarlyClose: false });
    });

    googletag.pubads().addEventListener("slotRenderEnded", (event) => {
      if (!rewardedSlot || event.slot !== rewardedSlot || !event.isEmpty) return;
      rewardedLastStatus = "no-fill";
      const resolveReady = rewardedReadyResolver;
      rewardedReadyResolver = null;
      if (resolveReady) resolveReady(false);
      window.setTimeout(resetRewardedSlot, 0);
    });
  };

  const prepareRewarded = ({ forceNew = false, timeoutMs = REWARDED_AVAILABILITY_TIMEOUT_MS } = {}) => {
    if (isStandalonePwa()) {
      rewardedLastStatus = "standalone-skip";
      return Promise.resolve(false);
    }
    if (!forceNew && rewardedReadyEvent) return Promise.resolve(true);
    if (!forceNew && rewardedLoadPromise) return rewardedLoadPromise;
    if (forceNew) resetRewardedSlot();

    const generation = ++rewardedLoadGeneration;
    rewardedLastStatus = "loading";
    const loadPromise = new Promise((resolve) => {
      let settled = false;
      const settle = (ready) => {
        if (settled) return;
        settled = true;
        if (generation !== rewardedLoadGeneration) {
          resolve(false);
          return;
        }
        if (!ready) {
          rewardedLoadPromise = null;
          rewardedReadyResolver = null;
        }
        resolve(Boolean(ready));
      };

      loadGptScript()
        .then((loaded) => {
          if (generation !== rewardedLoadGeneration) {
            settle(false);
            return;
          }
          if (!loaded && !window.googletag?.apiReady) {
            rewardedLastStatus = "script-unavailable";
            settle(false);
            return;
          }

          window.googletag = window.googletag || { cmd: [] };
          window.googletag.cmd.push(() => {
            if (generation !== rewardedLoadGeneration) {
              settle(false);
              return;
            }
            if (rewardedSlot || rewardedReadyEvent) {
              settle(true);
              return;
            }

            const rewardedFormat = googletag.enums?.OutOfPageFormat?.REWARDED;
            if (!rewardedFormat || typeof googletag.defineOutOfPageSlot !== "function") {
              rewardedLastStatus = "unsupported";
              settle(false);
              return;
            }

            rewardedSlot = googletag.defineOutOfPageSlot(
              GPT_REWARDED_AD_UNIT,
              rewardedFormat,
            );

            if (!rewardedSlot) {
              rewardedLastStatus = "unsupported";
              settle(false);
              return;
            }

            attachRewardedListeners();
            rewardedSlot.addService(googletag.pubads());
            if (!gptServicesEnabled && !window.__APPCRATE_GPT_SERVICES_ENABLED__) {
              googletag.enableServices();
              attachConversionTracking();

              gptServicesEnabled = true;
              window.__APPCRATE_GPT_SERVICES_ENABLED__ = true;
            }
            gptServicesEnabled = true;
            rewardedReadyResolver = settle;
            googletag.display(rewardedSlot);
          });
        })
        .catch(() => {
          if (generation !== rewardedLoadGeneration) {
            settle(false);
            return;
          }
          rewardedLastStatus = "failed";
          settle(false);
        });

      window.setTimeout(() => {
        if (generation === rewardedLoadGeneration && rewardedLastStatus === "loading") {
          rewardedLastStatus = "timeout";
        }
        settle(false);
      }, timeoutMs);
    });

    rewardedLoadPromise = loadPromise;
    return loadPromise;
  };

  const scheduleRewardedWarmup = (delayMs = 0) => {
    if (
      isStandalonePwa() ||
      flowInProgress ||
      rewardedReadyEvent ||
      rewardedLoadPromise ||
      rewardedWarmupTimer ||
      rewardedWarmupAttempts >= REWARDED_WARMUP_MAX_ATTEMPTS
    ) {
      return;
    }

    rewardedWarmupTimer = window.setTimeout(() => {
      rewardedWarmupTimer = 0;
      rewardedWarmupAttempts += 1;
      prepareRewarded({ forceNew: true, timeoutMs: REWARDED_AVAILABILITY_TIMEOUT_MS }).then((ready) => {
        if (ready) {
          rewardedWarmupAttempts = 0;
          return;
        }
        if (document.visibilityState !== "hidden") {
          scheduleRewardedWarmup(REWARDED_WARMUP_RETRY_MS);
        }
      });
    }, delayMs);
  };

  const showRewarded = async () => {
    if (isStandalonePwa()) return { status: "standalone-skip", shown: false };
    if (!rewardedReadyEvent) return { status: "unavailable", shown: false };

    rewardedGranted = false;
    rewardedVideoCompleted = false;
    rewardedClosePending = false;
    rewardedVisibleAt = 0;
    rewardedClosedAt = 0;
    rewardedLastStatus = "showing";
    return new Promise((resolve) => {
      rewardedShowResolver = (result) => resolve({ ...result, shown: true });
      try {
        rewardedVisibleAt = Date.now();
        const displayed = rewardedReadyEvent.makeRewardedVisible();
        if (!displayed) {
          rewardedShowResolver = null;
          rewardedVisibleAt = 0;
          rewardedLastStatus = "display-rejected";
          const result = { status: "display-rejected", shown: false };
          recordRewardedResult(result);
          window.setTimeout(resetRewardedSlot, REWARDED_SLOT_CLEANUP_DELAY_MS);
          resolve(result);
          return;
        }
      } catch (error) {
        rewardedShowResolver = null;
        rewardedVisibleAt = 0;
        rewardedLastStatus = "failed";
        const result = { status: "failed", shown: false, error };
        recordRewardedResult({ status: result.status, shown: result.shown });
        window.setTimeout(resetRewardedSlot, REWARDED_SLOT_CLEANUP_DELAY_MS);
        resolve(result);
      }

      window.setTimeout(() => {
        if (!rewardedShowResolver) return;
        rewardedShowResolver = null;
        rewardedLastStatus = "show-timeout";
        const result = {
          status: "show-timeout",
          shown: Boolean(rewardedVisibleAt),
          granted: rewardedGranted,
          videoCompleted: rewardedVideoCompleted,
          durationMs: rewardedVisibleAt ? Math.max(0, Date.now() - rewardedVisibleAt) : 0,
        };
        recordRewardedResult(result);
        window.setTimeout(resetRewardedSlot, REWARDED_SLOT_CLEANUP_DELAY_MS);
        resolve(result);
      }, REWARDED_SHOW_TIMEOUT_MS);
    });
  };

  const runRewardedFlow = async (onLoading) => {
    if (isStandalonePwa()) return { status: "standalone-skip", shown: false };

    const wasReady = Boolean(rewardedReadyEvent);
    if (!wasReady) {
      if (typeof onLoading === "function") onLoading();
      const pendingAttempt =
        rewardedLoadPromise ||
        prepareRewarded({
          forceNew: true,
          timeoutMs: REWARDED_RETRY_TIMEOUT_MS,
        });
      const attemptGeneration = rewardedLoadGeneration;
      const attemptResult = await new Promise((resolve) => {
        let settled = false;
        const finish = (ready, timedOut = false) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          resolve({ ready: Boolean(ready), timedOut });
        };
        const timer = window.setTimeout(
          () => finish(false, true),
          REWARDED_RETRY_TIMEOUT_MS,
        );
        Promise.resolve(pendingAttempt)
          .then((ready) => finish(ready))
          .catch(() => finish(false));
      });

      if (!attemptResult.ready || !rewardedReadyEvent) {
        const status = attemptResult.timedOut ? "timeout" : rewardedLastStatus || "unavailable";
        if (attemptGeneration === rewardedLoadGeneration && !rewardedReadyEvent) {
          if (attemptResult.timedOut) rewardedLastStatus = "timeout";
          resetRewardedSlot();
        }
        return { status, shown: false };
      }
    }

    return showRewarded();
  };

  const waitForInstallPrompt = (timeoutMs = PWA_PROMPT_WAIT_MS) =>
    new Promise((resolve) => {
      if (deferredInstallPrompt || getPromptState()?.deferredPrompt) {
        resolve(true);
        return;
      }

      const complete = (event) => {
        saveInstallPrompt(event);
        window.clearTimeout(timer);
        resolve(true);
      };
      const timer = window.setTimeout(() => {
        window.removeEventListener("beforeinstallprompt", complete);
        resolve(false);
      }, timeoutMs);

      window.addEventListener("beforeinstallprompt", complete, { once: true });
    });

  const removeInstallBridge = () => {
    document.querySelector(".pwa-install-bridge")?.remove();
    document.body.classList.remove("has-pwa-install-bridge");
  };

  const showInstallBridge = ({ promptEvent, flowState }) =>
    new Promise((resolve) => {
      if (!promptEvent || !canShowItemPwaPrompt(flowState)) {
        resolve({ status: "unavailable" });
        return;
      }

      removeInstallBridge();

      const bridge = document.createElement("div");
      bridge.className = "pwa-install-bridge";
      bridge.setAttribute("role", "dialog");
      bridge.setAttribute("aria-modal", "true");
      bridge.setAttribute("aria-label", "Continue install");

      const card = document.createElement("div");
      card.className = "pwa-install-bridge__card";

      const copy = document.createElement("p");
      copy.className = "pwa-install-bridge__copy";
      copy.textContent = `Install ${flowState.itemName || "this item"} to continue, or continue without installing.`;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "pwa-install-bridge__button";
      button.textContent = INSTALL_BRIDGE_TEXT;

      const continueButton = document.createElement("button");
      continueButton.type = "button";
      continueButton.className = "pwa-install-bridge__button pwa-install-bridge__button--secondary";
      continueButton.textContent = CONTINUE_BRIDGE_TEXT;

      card.append(copy, button, continueButton);
      bridge.appendChild(card);
      document.body.appendChild(bridge);
      document.body.classList.add("has-pwa-install-bridge");

      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        removeInstallBridge();
        resolve(result);
      };

      button.focus({ preventScroll: true });
      button.addEventListener(
        "click",
        async () => {
          button.disabled = true;
          button.textContent = LOADING_TEXT;

          try {
            const choicePromise = promptEvent.userChoice;
            await promptEvent.prompt();
            clearStalePwaPrompt();
            const choice = choicePromise ? await choicePromise : null;
            finish({ status: choice?.outcome || "dismissed" });
          } catch (error) {
            clearStalePwaPrompt();
            finish({ status: "failed", error });
          }
        },
        { once: true },
      );

      continueButton.addEventListener(
        "click",
        () => {
          finish({ status: "continued" });
        },
        { once: true },
      );

      const timer = window.setTimeout(() => {
        finish({ status: "timeout" });
      }, INSTALL_BRIDGE_TIMEOUT_MS);
    });

  const requestPwaInstall = async (flowState) => {
    if (isStandalonePwa()) return { status: "installed" };
    if (!flowState) return { status: "unavailable" };
    setItemManifest(flowState);

    if (!canShowItemPwaPrompt(flowState)) {
      await registerPwaWorker();
      await waitForInstallPrompt();
      if (!canShowItemPwaPrompt(flowState)) {
        debug("item PWA prompt unavailable", flowState.itemType, flowState.itemSlug);
        return { status: "unavailable" };
      }
    }

    const promptState = getPromptState();
    const promptEvent = promptState?.deferredPrompt || deferredInstallPrompt;

    try {
      debug("item PWA prompt shown:", flowState.itemType, flowState.itemSlug, flowState.itemName);
      const choicePromise = promptEvent.userChoice;
      await promptEvent.prompt();
      clearStalePwaPrompt();
      const choice = choicePromise ? await choicePromise : null;
      debug("item PWA prompt outcome", choice?.outcome || "dismissed");
      return { status: choice?.outcome || "dismissed" };
    } catch (error) {
      debug("item PWA prompt failed", error?.name || error);
      return showInstallBridge({ promptEvent, flowState });
    }
  };

  const safeNavigate = (href) => {
    if (!href || href === "#") return;
    if (window.__rewardedPwaFlowNavigated) return;
    window.__rewardedPwaFlowNavigated = true;
    debug("navigating to:", href);
    window.location.href = href;
  };

  const runRewardedPwaFlow = async ({ button, href, event }) => {
    event.preventDefault();
    if (flowInProgress || !href) return;

    flowInProgress = true;
    window.__rewardedPwaFlowNavigated = false;
    currentFlowState = getCurrentFlowState(href);
    if (currentFlowState) setItemManifest(currentFlowState);
    document.body.classList.add("rewarded-pwa-active");
    let retryRequired = false;

    try {
      const rewardedResult = await runRewardedFlow(() => {
        setAllCtaState({ href, text: LOADING_TEXT, loading: true });
      });
      if (rewardedResult.status === "early-closed") {
        retryRequired = true;
        return;
      }
      await requestPwaInstall(currentFlowState);
      safeNavigate(href);
    } catch (error) {
      console.warn("Rewarded PWA flow failed:", error);
      safeNavigate(href);
    } finally {
      setAllCtaState({
        href,
        text: retryRequired ? RETRY_TEXT : button.dataset.originalCtaText || readyTextFor(currentFlowState),
        loading: false,
      });
      document.body.classList.remove("rewarded-pwa-active");
      flowInProgress = false;
      currentFlowState = null;
      scheduleRewardedWarmup(retryRequired ? REWARDED_SLOT_CLEANUP_DELAY_MS + 100 : 400);
    }
  };

  const init = () => {
    const routeItem = routeItemFromPath();
    if (!routeItem) return;
    const sourceButtons = Array.from(document.querySelectorAll(PRIMARY_CTA_SELECTOR));
    if (!sourceButtons.length) return;

    document.body.classList.add("rewarded-pwa-flow");
    if (routeItem.itemType !== "playgame") document.body.classList.add("rewarded-download-flow");
    const currentItem = getCurrentFlowState();
    if (currentItem) setItemManifest(currentItem);
    ensureSitePwaTags();
    registerPwaWorker();

    sourceButtons.forEach((button) => {
      button.setAttribute("data-google-interstitial", "false");
      const originalText =
        button.querySelector(".cta, .sticky-download-cta__text")?.textContent?.trim() ||
        readyTextFor(currentItem);
      button.dataset.originalCtaText = originalText;
      if (routeItem.itemType === "playgame") button.dataset.pwaPlayCta = "true";
      ensurePolicyNote(button);
    });

    protectRewardedCtasFromWebInterstitial();
    observeRewardedCtas();

    document.addEventListener("click", (event) => {
      const button = event.target.closest(CTA_SELECTOR);
      if (!button) return;
      const href = button.getAttribute("href");
      if (!href) return;

      const sourceText =
        button.dataset.originalCtaText ||
        button.querySelector(".cta, .sticky-download-cta__text")?.textContent?.trim() ||
        readyTextFor(getCurrentFlowState(href));
      button.dataset.originalCtaText =
        sourceText === LOADING_TEXT ? readyTextFor(getCurrentFlowState(href)) : sourceText;
      runRewardedPwaFlow({ button, href, event });
    });

    scheduleRewardedWarmup();
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    saveInstallPrompt(event);
  });

  window.addEventListener("appinstalled", () => {
    const promptState = getPromptState();
    if (promptState?.itemType && promptState?.itemSlug) {
      try {
        localStorage.setItem(`installed-pwa-${promptState.itemType}-${promptState.itemSlug}`, "1");
      } catch (_) {}
    }
    clearStalePwaPrompt();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      scheduleRewardedWarmup(400);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
