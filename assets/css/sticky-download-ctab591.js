(() => {
  const initStickyDownloadCta = () => {
    const sourceButton = document.querySelector(
      ".page-left section.download .btn-down.enable, section.download .btn-down.enable",
    );
    if (!sourceButton || document.querySelector(".sticky-download-cta")) return;

    const sourceHref = sourceButton.getAttribute("href");
    if (!sourceHref) return;

    const sourceText =
      sourceButton.querySelector(".cta")?.textContent.trim() || "Download";

    const sticky = document.createElement("div");
    sticky.className = "sticky-download-cta";

    const link = document.createElement("a");
    link.className = "sticky-download-cta__button";
    link.href = sourceHref;
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
