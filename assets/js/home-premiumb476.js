(function () {
  "use strict";

  const discovery = window.MitshuDiscovery;
  if (!discovery) return;

  const sectionConfigs = [
    { type: "apps", root: "[data-home-section=\"apps\"]", allLabel: "View All Apps", categoryNoun: "Apps" },
    { type: "playgames", root: "[data-home-section=\"playgames\"]", allLabel: "View All Play Games", categoryNoun: "Games" },
    { type: "topgames", root: "[data-home-section=\"topgames\"]", allLabel: "View All Store Games", categoryNoun: "Games" },
  ];
  const catalogGridQueries = [
    window.matchMedia("(min-width: 1280px)"),
    window.matchMedia("(min-width: 1024px)"),
    window.matchMedia("(min-width: 768px)"),
  ];

  function getCatalogLimit() {
    if (catalogGridQueries[0].matches) return 21;
    if (catalogGridQueries[1].matches) return 18;
    if (catalogGridQueries[2].matches) return 12;
    return 9;
  }

  function shuffleItems(items) {
    const shuffled = (items || []).slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      const current = shuffled[index];
      shuffled[index] = shuffled[randomIndex];
      shuffled[randomIndex] = current;
    }
    return shuffled;
  }

  function setMenuState(open) {
    const drawer = document.getElementById("mobileMenu");
    const toggle = document.getElementById("menuToggle");
    if (!drawer) return;
    drawer.classList.toggle("is-open", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    }
  }

  window.toggleMenu = function toggleMenu() {
    const drawer = document.getElementById("mobileMenu");
    setMenuState(!(drawer && drawer.classList.contains("is-open")));
  };

  function initializeHeader() {
    const header = document.querySelector(".mh-site-header");
    const drawer = document.getElementById("mobileMenu");
    const searchToggle = document.getElementById("headerSearchToggle");
    if (!header || !drawer) return;

    if (searchToggle) {
      searchToggle.addEventListener("click", function () {
        if (window.matchMedia("(max-width: 1000px)").matches) {
          setMenuState(true);
          const focusDrawerSearch = function () {
            const drawerInput = drawer.querySelector(".site-search__input");
            if (drawerInput) drawerInput.focus({ preventScroll: true });
          };
          window.requestAnimationFrame(focusDrawerSearch);
          window.setTimeout(focusDrawerSearch, 80);
          return;
        }

        const heroInput = document.querySelector(".mh-hero .site-search__input");
        if (heroInput) {
          heroInput.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
            block: "center",
          });
          heroInput.focus({ preventScroll: true });
        } else {
          window.location.href = "/search/";
        }
      });
    }

    drawer.addEventListener("click", function (event) {
      if (event.target.closest("a")) setMenuState(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && drawer.classList.contains("is-open")) setMenuState(false);
    });

    document.addEventListener("pointerdown", function (event) {
      if (drawer.classList.contains("is-open") && !header.contains(event.target)) setMenuState(false);
    });
  }

  initializeHeader();

  function initializeMobileViewAllPlacement() {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const entries = Array.from(document.querySelectorAll("[data-mobile-view-all-link]")).map(function (link) {
      const key = link.dataset.mobileViewAllLink;
      const target = document.querySelector('[data-mobile-view-all-target="' + key + '"]');
      if (!target || !link.parentNode) return null;
      const marker = document.createComment("view-all-origin-" + key);
      link.parentNode.insertBefore(marker, link.nextSibling);
      return { link: link, marker: marker, target: target };
    }).filter(Boolean);

    function syncPlacement() {
      entries.forEach(function (entry) {
        if (mobileQuery.matches) {
          entry.target.appendChild(entry.link);
        } else if (entry.marker.parentNode) {
          entry.marker.parentNode.insertBefore(entry.link, entry.marker);
        }
      });
    }

    syncPlacement();
    if (typeof mobileQuery.addEventListener === "function") {
      mobileQuery.addEventListener("change", syncPlacement);
    } else if (typeof mobileQuery.addListener === "function") {
      mobileQuery.addListener(syncPlacement);
    }
  }

  function createSkeletons(grid, count) {
    grid.replaceChildren();
    for (let index = 0; index < count; index += 1) {
      const skeleton = document.createElement("div");
      skeleton.className = "mh-card-skeleton";
      skeleton.setAttribute("aria-hidden", "true");
      skeleton.innerHTML = '<span class="mh-card-skeleton__media"></span><span></span><span></span>';
      grid.appendChild(skeleton);
    }
  }

  function createCard(item, index) {
    const link = document.createElement("a");
    link.className = "mh-content-card mh-content-card--" + item.type;
    link.href = item.url;
    link.setAttribute("aria-label", item.actionLabel + ": " + item.title);

    const media = document.createElement("span");
    media.className = "mh-content-card__media";
    const image = document.createElement("img");
    image.src = item.image || discovery.FALLBACK_IMAGE;
    image.alt = item.title;
    image.width = 320;
    image.height = 320;
    image.loading = item.type === "apps" && index < 5 ? "eager" : "lazy";
    image.decoding = "async";
    image.onerror = function () {
      image.onerror = null;
      image.src = discovery.FALLBACK_IMAGE;
    };
    media.appendChild(image);

    const body = document.createElement("span");
    body.className = "mh-content-card__body";
    const category = document.createElement("span");
    category.className = "mh-content-card__category";
    category.textContent = item.category || item.typeLabel;
    const title = document.createElement("span");
    title.className = "mh-content-card__title";
    title.textContent = item.title;
    if (item.type === "playgames" && item.description) {
      const description = document.createElement("span");
      description.className = "mh-content-card__description";
      description.textContent = item.description;
      body.appendChild(description);
    }
    const action = document.createElement("span");
    action.className = "mh-content-card__action";
    action.innerHTML = item.actionLabel + ' <span aria-hidden="true">&rarr;</span>';
    body.append(category, title, action);
    link.append(media, body);
    return link;
  }

  function renderEmpty(grid, resetButton) {
    const empty = document.createElement("div");
    empty.className = "mh-section-empty";
    const title = document.createElement("strong");
    title.textContent = "No items are available in this category yet.";
    const copy = document.createElement("span");
    copy.textContent = "Choose All to continue exploring the complete section.";
    const reset = document.createElement("button");
    reset.type = "button";
    reset.textContent = "Reset to All";
    reset.addEventListener("click", resetButton);
    empty.append(title, copy, reset);
    grid.replaceChildren(empty);
  }

  function renderError(grid, sectionPath) {
    const error = document.createElement("div");
    error.className = "mh-section-empty";
    const title = document.createElement("strong");
    title.textContent = "This section could not be loaded.";
    const link = document.createElement("a");
    link.href = sectionPath;
    link.textContent = "Open the complete section";
    error.append(title, link);
    grid.replaceChildren(error);
  }

  function initializeSection(config) {
    const root = document.querySelector(config.root);
    if (!root) return;
    const chips = root.querySelector("[data-category-chips]");
    const grid = root.querySelector("[data-home-grid]");
    const count = root.querySelector("[data-result-count]");
    const viewAll = root.querySelector("[data-view-all]");
    if (!chips || !grid || !viewAll) return;

    const state = { selected: "All", items: [], shuffledAll: [] };
    createSkeletons(grid, getCatalogLimit());

    function updateViewAll() {
      const label = state.selected === "All"
        ? config.allLabel
        : "View All " + state.selected + " " + config.categoryNoun;
      viewAll.textContent = label;
      viewAll.setAttribute("aria-label", label);

      if (state.selected === "All") {
        viewAll.href = discovery.SECTION_PATHS[config.type];
        return;
      }
      discovery.categoryUrl(config.type, state.selected).then(function (url) {
        if (state.selected !== "All") viewAll.href = url;
      });
    }

    function render() {
      const matches = state.selected === "All"
        ? state.shuffledAll
        : discovery.filterCategory(state.items, state.selected);
      const visible = matches.slice(0, getCatalogLimit());
      grid.classList.remove("is-updating");
      void grid.offsetWidth;
      grid.classList.add("is-updating");
      if (!visible.length) {
        renderEmpty(grid, function () { selectCategory("All"); });
      } else {
        grid.replaceChildren.apply(grid, visible.map(createCard));
      }
      if (count) {
        count.textContent = visible.length + (matches.length > visible.length ? " of " + matches.length : "") + " items";
      }
      updateViewAll();
    }

    function selectCategory(label) {
      state.selected = label;
      chips.querySelectorAll("button").forEach(function (button) {
        const selected = button.dataset.category === label;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      render();
    }

    function renderChips() {
      const categories = ["All"].concat(discovery.getCategories(state.items));
      chips.replaceChildren.apply(
        chips,
        categories.map(function (label) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "mh-category-chip" + (label === "All" ? " is-selected" : "");
          button.dataset.category = label;
          button.setAttribute("aria-pressed", String(label === "All"));
          button.textContent = label;
          button.addEventListener("click", function () { selectCategory(label); });
          return button;
        }),
      );
    }

    discovery.loadType(config.type)
      .then(function (items) {
        state.items = items;
        state.shuffledAll = shuffleItems(items);
        renderChips();
        render();
      })
      .catch(function () {
        renderError(grid, discovery.SECTION_PATHS[config.type]);
        chips.replaceChildren();
        if (count) count.textContent = "Unavailable";
      });

    catalogGridQueries.forEach(function (query) {
      if (typeof query.addEventListener === "function") {
        query.addEventListener("change", render);
      } else if (typeof query.addListener === "function") {
        query.addListener(render);
      }
    });
  }

  function createArticleCard(item, featured) {
    const link = document.createElement("a");
    link.href = item.url;
    link.className = featured ? "mh-article-feature" : "mh-article-card";
    link.setAttribute("aria-label", "Read article: " + item.title);
    const image = document.createElement("img");
    image.src = item.image || discovery.FALLBACK_IMAGE;
    image.alt = item.title;
    image.width = featured ? 760 : 360;
    image.height = featured ? 430 : 210;
    image.loading = "lazy";
    image.decoding = "async";
    image.onerror = function () {
      image.onerror = null;
      image.src = discovery.FALLBACK_IMAGE;
    };
    const copy = document.createElement("span");
    copy.className = "mh-article-card__copy";
    const category = document.createElement("span");
    category.className = "mh-article-card__category";
    category.textContent = item.category || "Article";
    const title = document.createElement(featured ? "h3" : "strong");
    title.textContent = item.title;
    const description = document.createElement("span");
    description.className = "mh-article-card__description";
    description.textContent = item.description || "Read this ZippyGamez guide for clear, useful information.";
    const action = document.createElement("span");
    action.className = "mh-article-card__action";
    action.innerHTML = 'Read Article <span aria-hidden="true">&rarr;</span>';
    copy.append(category, title, description, action);
    link.append(image, copy);
    return link;
  }

  function initializeArticles() {
    const layout = document.querySelector("[data-home-articles]");
    if (!layout) return;
    discovery.loadType("articles")
      .then(function (items) {
        if (!items.length) throw new Error("No articles");
        const feature = createArticleCard(items[0], true);
        const list = document.createElement("div");
        list.className = "mh-article-list";
        items.slice(1, 5).forEach(function (item) { list.appendChild(createArticleCard(item, false)); });
        layout.replaceChildren(feature, list);
      })
      .catch(function () {
        renderError(layout, "/article/");
      });
  }

  function initializeReveal() {
    const items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      items.forEach(function (item) { item.classList.add("is-visible"); });
      return;
    }
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "120px 0px", threshold: 0.04 });
    items.forEach(function (item) { observer.observe(item); });
  }

  function initialize() {
    initializeMobileViewAllPlacement();
    sectionConfigs.forEach(initializeSection);
    initializeReveal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
