(() => {
  const preferAppleStore = () => {
    const ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua)) return true;
    return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  };

  const decodeHref = (value) => String(value || "").replace(/&amp;/g, "&");

  const resolveStoreUrlsFromDownloadPage = async () => {
    try {
      const response = await fetch(new URL("download/index.html", window.location.href));
      if (!response.ok) return null;
      const html = await response.text();
      const play = html.match(/https:\/\/play\.google\.com\/[^"'\\\s<>]+/);
      const apple = html.match(/https:\/\/apps\.apple\.com\/[^"'\\\s<>]+/);
      return {
        play: play ? decodeHref(play[0]) : null,
        apple: apple ? decodeHref(apple[0]) : null,
      };
    } catch (_error) {
      return null;
    }
  };

  const pickStoreUrl = (stores) => {
    if (!stores) return null;
    if (preferAppleStore()) return stores.apple || stores.play;
    return stores.play || stores.apple;
  };

  const wirePrimaryDownloadToStore = async (sourceButton) => {
    if (!(sourceButton instanceof HTMLAnchorElement)) return sourceButton.getAttribute("href");
    const href = sourceButton.getAttribute("href") || "";
    if (/play\.google\.com|apps\.apple\.com/i.test(href)) return href;
    if (!/download(?:\/index\.html)?$/i.test(href.replace(/\\/g, "/")) && !href.includes("download/")) {
      return href;
    }

    const stores = await resolveStoreUrlsFromDownloadPage();
    const target = pickStoreUrl(stores);
    if (!target) return href;

    sourceButton.href = target;
    sourceButton.target = "_blank";
    sourceButton.rel = "noopener noreferrer";
    sourceButton.dataset.storeDestination = target;
    return target;
  };

  const initStickyDownloadCta = async () => {
    const sourceButton = document.querySelector(
      ".page-left section.download .btn-down.enable, section.download .btn-down.enable",
    );
    if (!sourceButton || document.querySelector(".sticky-download-cta")) return;

    const sourceHref = await wirePrimaryDownloadToStore(sourceButton);
    if (!sourceHref) return;

    const sourceText =
      sourceButton.querySelector(".cta")?.textContent.trim() || "Download";

    const sticky = document.createElement("div");
    sticky.className = "sticky-download-cta";

    const link = document.createElement("a");
    link.className = "sticky-download-cta__button";
    link.href = sourceHref;
    if (/play\.google\.com|apps\.apple\.com/i.test(sourceHref)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    link.setAttribute("aria-label", sourceText);

    const label = document.createElement("span");
    label.className = "sticky-download-cta__label";

    const kicker = document.createElement("span");
    kicker.className = "sticky-download-cta__kicker";
    kicker.textContent = "Ready to install";

    const text = document.createElement("span");
    text.className = "sticky-download-cta__text";
    text.textContent = sourceText;

    const icon = document.createElement("span");
    icon.className = "sticky-download-cta__icon";
    icon.setAttribute("aria-hidden", "true");
    const customIconSrc = sourceButton.dataset.stickyIcon;

    if (customIconSrc) {
      const customIcon = document.createElement("img");
      customIcon.src = customIconSrc;
      customIcon.alt = "";
      customIcon.decoding = "async";
      icon.classList.add("sticky-download-cta__icon--app");
      icon.appendChild(customIcon);
    } else {
      icon.innerHTML = `
        <svg viewBox="0 0 1024 1024" focusable="false">
          <use xlink:href="#icon-download"></use>
        </svg>
      `;
    }

    label.append(kicker, text);
    link.append(label, icon);
    sticky.appendChild(link);

    document.body.appendChild(sticky);
    document.body.classList.add("has-sticky-download-cta");

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
      const hasPassedButton = rect.bottom < 0;
      footerVisible = isFooterVisible();
      document.body.classList.toggle("sticky-cta-footer-visible", footerVisible);
      setVisible(hasPassedButton);
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
            document.body.classList.toggle("sticky-cta-footer-visible", footerVisible);
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStickyDownloadCta, {
      once: true,
    });
  } else {
    initStickyDownloadCta();
  }
})();
