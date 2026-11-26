(function () {
  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var constrainedConnection = Boolean(
    connection && (connection.saveData || /^(?:slow-2g|2g|3g)$/i.test(connection.effectiveType || ""))
  );

  function classify(ratio) {
    if (!Number.isFinite(ratio) || ratio <= 0) return "";
    if (ratio < 0.82) return "portrait";
    if (ratio > 1.18) return "landscape";
    return "square";
  }

  function fitImage(img) {
    if (!img || !img.naturalWidth || !img.naturalHeight) return;
    var slide = img.closest(".screen .slide");
    if (!slide) return;

    var ratio = img.naturalWidth / img.naturalHeight;
    slide.style.setProperty("--shot-ratio", ratio.toFixed(4));
    slide.dataset.shotLoaded = "true";
    slide.dataset.shotOrientation = classify(ratio);
  }

  function fallbackIcon() {
    var path = window.location.pathname || "";
    var appMatch = path.match(/^\/app\/([^/]+)\//i);
    if (appMatch) return "/assets/media/apps/" + appMatch[1] + ".webp";

    var gameMatch = path.match(/^\/topgames\/([^/]+)\//i);
    if (gameMatch) return "/assets/media/topgames/" + gameMatch[1] + ".webp";

    return "/assets/icons/zippygamez-com-pwa-192.png";
  }

  function applyFallback(img) {
    var slide = img.closest(".screen .slide");
    var fallback = img.dataset.shotFallbackSrc || fallbackIcon();

    if (img.dataset.shotFallbackApplied === "true") {
      if (img.src.indexOf("/assets/icons/zippygamez-com-pwa-192.png") === -1) {
        img.src = "/assets/icons/zippygamez-com-pwa-192.png";
      }
      return;
    }

    img.dataset.shotFallbackApplied = "true";
    img.dataset.shotFallbackSrc = fallback;

    if (slide) {
      slide.hidden = false;
      slide.dataset.shotLoaded = "true";
      slide.dataset.shotFallback = "true";
      slide.dataset.shotOrientation = "square";
      slide.style.setProperty("--shot-ratio", "1");
    }

    img.src = fallback;
  }

  function bind(img) {
    if (!img || img.dataset.shotFitBound === "true") return;
    img.dataset.shotFitBound = "true";
    img.addEventListener("error", function () {
      applyFallback(img);
    }, { passive: true });
    img.addEventListener("load", function () {
      fitImage(img);
    }, { passive: true });
    img.loading = "lazy";
    img.decoding = "async";
    img.fetchPriority = "low";
    if (img.complete) fitImage(img);
  }

  function loadImage(img, highPriority) {
    if (!img || img.dataset.loaded === "true") return;
    var source = img.dataset.original;
    if (!source) return;
    if (highPriority) {
      img.loading = "eager";
      img.fetchPriority = "high";
    }
    img.src = source;
    img.dataset.loaded = "true";
  }

  function bindRemoteFallbacks() {
    document.querySelectorAll("img[data-local-fallback]").forEach(function (img) {
      if (img.dataset.remoteFallbackBound === "true") return;
      img.dataset.remoteFallbackBound = "true";
      img.addEventListener("error", function () {
        var fallback = img.dataset.localFallback;
        if (!fallback || img.dataset.localFallbackApplied === "true") return;
        img.dataset.localFallbackApplied = "true";
        img.removeAttribute("srcset");
        img.src = fallback;
      });
    });
  }

  function hydrateVisible(scroller, images) {
    if (!scroller || !images.length) return;
    var viewport = scroller.getBoundingClientRect();
    var visibleIndexes = [];

    images.forEach(function (img, index) {
      var slide = img.closest(".slide");
      if (!slide) return;
      var bounds = slide.getBoundingClientRect();
      if (bounds.right >= viewport.left - 8 && bounds.left <= viewport.right + 8) {
        visibleIndexes.push(index);
        loadImage(img, index === 0);
      }
    });

    // On normal connections preload one neighbour for smooth arrow/swipe use.
    // Save-Data/2G/3G loads only what the user can currently see.
    if (!constrainedConnection && visibleIndexes.length) {
      var next = Math.min(images.length - 1, visibleIndexes[visibleIndexes.length - 1] + 1);
      loadImage(images[next], false);
    }
  }

  function init() {
    bindRemoteFallbacks();
    var images = Array.from(document.querySelectorAll(".screen .slide-pic"));
    images.forEach(bind);

    var scroller = document.querySelector(".screen .thumb-slides");
    if (scroller && images.length) {
      var queued = false;
      var requestHydration = function () {
        if (queued) return;
        queued = true;
        requestAnimationFrame(function () {
          queued = false;
          hydrateVisible(scroller, images);
        });
      };
      requestHydration();
      scroller.addEventListener("scroll", requestHydration, { passive: true });
      window.addEventListener("resize", requestHydration, { passive: true });
    }

    if (!images.length || !("MutationObserver" in window)) return;
    var observer = new MutationObserver(function (records) {
      records.forEach(function (record) {
        if (record.type === "attributes" && record.attributeName === "src") {
          fitImage(record.target);
        }
      });
    });

    images.forEach(function (img) {
      observer.observe(img, { attributes: true, attributeFilter: ["src"] });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
