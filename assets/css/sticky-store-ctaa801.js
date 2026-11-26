(() => {
  const initStickyStoreCta = () => {
    const sourceWrap = document.querySelector(".page-left > section.download .download-btns");
    if (!sourceWrap || document.querySelector(".sticky-store-cta")) return;

    const sourceButtons = Array.from(
      sourceWrap.querySelectorAll("a.btn.enable"),
    ).filter((button) => button.getAttribute("href"));
    if (!sourceButtons.length) return;

    const sticky = document.createElement("div");
    sticky.className = "sticky-store-cta";
    sticky.setAttribute("aria-hidden", "true");
    sticky.style.setProperty("--sticky-store-count", String(sourceButtons.length));

    const inner = document.createElement("div");
    inner.className = "sticky-store-cta__inner";

    sourceButtons.forEach((sourceButton) => {
      const isPlayStore = sourceButton.classList.contains("btn-playstore");
      const isAppStore = sourceButton.classList.contains("btn-appstore");
      const link = document.createElement("a");
      link.className = [
        "sticky-store-cta__button",
        isPlayStore ? "sticky-store-cta__button--playstore" : "",
        isAppStore ? "sticky-store-cta__button--appstore" : "",
      ]
        .filter(Boolean)
        .join(" ");
      link.href = sourceButton.getAttribute("href");
      link.setAttribute(
        "aria-label",
        sourceButton.getAttribute("aria-label") ||
          (isPlayStore ? "Get it on Google Play" : "Download from App Store"),
      );

      const icon = document.createElement("span");
      icon.className = "sticky-store-cta__icon";
      icon.setAttribute("aria-hidden", "true");
      if (isPlayStore) {
        const img = document.createElement("img");
        img.src = "/assets/badges/google-play-mark.svg";
        img.alt = "";
        icon.appendChild(img);
      } else {
        icon.innerHTML = `
          <svg viewBox="0 0 1024 1024" focusable="false">
            <use xlink:href="#icon-ios"></use>
          </svg>
        `;
      }

      const text = document.createElement("span");
      text.className = "sticky-store-cta__text";
      text.textContent = isPlayStore ? "Google Play" : "App Store";

      link.append(icon, text);
      inner.appendChild(link);
    });

    sticky.appendChild(inner);
    document.body.appendChild(sticky);
    document.body.classList.add("has-sticky-store-cta");

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
      const rect = sourceWrap.getBoundingClientRect();
      footerVisible = isFooterVisible();
      document.body.classList.toggle("sticky-cta-footer-visible", footerVisible);
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
      observer.observe(sourceWrap);

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
    document.addEventListener("DOMContentLoaded", initStickyStoreCta, { once: true });
  } else {
    initStickyStoreCta();
  }
})();
