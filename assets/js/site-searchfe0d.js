(function () {
  "use strict";

  const discovery = window.MitshuDiscovery;
  if (!discovery || window.__mitshuSearchReady) return;
  window.__mitshuSearchReady = true;

  const componentRegistry = [];
  let componentId = 0;

  function ensureStylesheet() {
    if (document.querySelector('link[data-site-search-style]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/assets/css/site-search.css?v=search-layer-fix-20260711";
    link.dataset.siteSearchStyle = "true";
    document.head.appendChild(link);
  }

  function closeDrawer() {
    const drawer = document.getElementById("mobileMenu");
    const toggle = document.getElementById("menuToggle");
    if (drawer) {
      drawer.classList.remove("is-open");
      if (drawer.style.display) drawer.style.display = "none";
    }
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("menu-open");
    document.body.classList.remove("menu-open", "no-scroll");
    document.documentElement.style.removeProperty("overflow");
    document.body.style.removeProperty("overflow");
  }

  function navigate(url, insideDrawer) {
    if (insideDrawer) closeDrawer();
    window.location.href = url;
  }

  function createSearchMarkup(host) {
    const variant = host.dataset.searchVariant || (host.closest("#mobileMenu") ? "drawer" : "default");
    const id = "site-search-" + (++componentId);
    const label = variant === "drawer" ? "Search ZippyGamez" : "Search apps, games, and articles";
    host.classList.add("site-search", "site-search--" + variant);
    host.innerHTML =
      '<form class="site-search__form" role="search" action="/search/" method="get" novalidate>' +
        '<label class="site-search__label sr-only" for="' + id + '">' + label + '</label>' +
        '<div class="site-search__control">' +
          '<span class="site-search__icon" aria-hidden="true"></span>' +
          '<input id="' + id + '" class="site-search__input" type="search" name="q" ' +
            'placeholder="Search apps, games and articles..." autocomplete="off" spellcheck="false" ' +
            'role="combobox" aria-autocomplete="list" aria-expanded="false" ' +
            'aria-controls="' + id + '-list" aria-haspopup="listbox" />' +
          '<span class="site-search__loader" aria-hidden="true" hidden></span>' +
          '<button class="site-search__clear" type="button" aria-label="Clear search" hidden>&times;</button>' +
        '</div>' +
        '<div class="site-search__panel" hidden>' +
          '<div id="' + id + '-list" class="site-search__list" role="listbox" aria-label="Search suggestions"></div>' +
          '<a class="site-search__all" href="/search/">View All Results <span aria-hidden="true">&rarr;</span></a>' +
        '</div>' +
        '<span class="site-search__status sr-only" aria-live="polite"></span>' +
      '</form>';
    return host;
  }

  function buildSuggestion(item, optionId) {
    const link = document.createElement("a");
    link.className = "site-search__option";
    link.id = optionId;
    link.href = item.url;
    link.setAttribute("role", "option");
    link.setAttribute("aria-selected", "false");

    const image = document.createElement("img");
    image.src = item.image || discovery.FALLBACK_IMAGE;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.width = 48;
    image.height = 48;
    image.onerror = function () {
      image.onerror = null;
      image.src = discovery.FALLBACK_IMAGE;
    };

    const copy = document.createElement("span");
    copy.className = "site-search__option-copy";
    const title = document.createElement("strong");
    title.textContent = item.title;
    const meta = document.createElement("span");
    meta.textContent = item.typeLabel + (item.category ? " - " + item.category : "");
    copy.append(title, meta);

    const arrow = document.createElement("span");
    arrow.className = "site-search__option-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.innerHTML = "&rsaquo;";
    link.append(image, copy, arrow);
    return link;
  }

  function initSearch(host) {
    if (host.dataset.searchReady === "true") return;
    host.dataset.searchReady = "true";
    createSearchMarkup(host);

    const form = host.querySelector(".site-search__form");
    const input = host.querySelector(".site-search__input");
    const clearButton = host.querySelector(".site-search__clear");
    const loader = host.querySelector(".site-search__loader");
    const panel = host.querySelector(".site-search__panel");
    const list = host.querySelector(".site-search__list");
    const viewAll = host.querySelector(".site-search__all");
    const status = host.querySelector(".site-search__status");
    const insideDrawer = Boolean(host.closest("#mobileMenu"));
    const layerParent = host.closest(".mh-hero, .search-page-hero");
    let debounceTimer = 0;
    let requestSequence = 0;
    let options = [];
    let activeIndex = -1;

    function setPanelLayer(open) {
      host.classList.toggle("is-open", open);
      if (layerParent) layerParent.classList.toggle("has-open-search", open);
    }

    function setLoading(loading) {
      loader.hidden = !loading;
      host.classList.toggle("is-loading", loading);
      input.setAttribute("aria-busy", String(loading));
    }

    function closePanel() {
      panel.hidden = true;
      setPanelLayer(false);
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      options.forEach(function (option) {
        option.classList.remove("is-active");
        option.setAttribute("aria-selected", "false");
      });
      activeIndex = -1;
    }

    function openPanel() {
      panel.hidden = false;
      setPanelLayer(true);
      input.setAttribute("aria-expanded", "true");
    }

    function setActive(index) {
      if (!options.length) return;
      activeIndex = (index + options.length) % options.length;
      options.forEach(function (option, optionIndex) {
        const active = optionIndex === activeIndex;
        option.classList.toggle("is-active", active);
        option.setAttribute("aria-selected", String(active));
      });
      const active = options[activeIndex];
      input.setAttribute("aria-activedescendant", active.id);
      active.scrollIntoView({ block: "nearest" });
    }

    function renderEmpty(query) {
      list.replaceChildren();
      const empty = document.createElement("div");
      empty.className = "site-search__empty";
      empty.textContent = 'No results matched "' + query + '".';
      list.appendChild(empty);
      options = [];
      activeIndex = -1;
      status.textContent = "No search suggestions found";
      openPanel();
    }

    function renderError() {
      list.replaceChildren();
      const error = document.createElement("div");
      error.className = "site-search__empty";
      error.textContent = "Search is temporarily unavailable. You can still browse each section.";
      list.appendChild(error);
      options = [];
      activeIndex = -1;
      status.textContent = "Search temporarily unavailable";
      openPanel();
    }

    function renderSuggestions(results, query) {
      list.replaceChildren();
      const grouped = new Map();
      discovery.TYPE_ORDER.forEach(function (type) { grouped.set(type, []); });
      results.forEach(function (item) {
        const group = grouped.get(item.type);
        if (group && group.length < 3) group.push(item);
      });

      let resultCount = 0;
      grouped.forEach(function (items, type) {
        if (!items.length || resultCount >= 12) return;
        const heading = document.createElement("div");
        heading.className = "site-search__group-label";
        heading.textContent = discovery.TYPE_LABELS[type];
        list.appendChild(heading);
        items.slice(0, 12 - resultCount).forEach(function (item) {
          const option = buildSuggestion(item, input.id + "-option-" + resultCount);
          option.addEventListener("click", function (event) {
            event.preventDefault();
            closePanel();
            navigate(item.url, insideDrawer);
          });
          list.appendChild(option);
          resultCount += 1;
        });
      });

      options = Array.from(list.querySelectorAll('[role="option"]'));
      activeIndex = -1;
      if (!options.length) {
        renderEmpty(query);
        return;
      }
      status.textContent = options.length + " search suggestions available";
      openPanel();
    }

    function runSearch(rawQuery) {
      const query = rawQuery.trim().replace(/\s+/g, " ");
      const sequence = ++requestSequence;
      clearButton.hidden = !rawQuery;
      viewAll.href = "/search/?q=" + encodeURIComponent(query);
      if (discovery.normalizeText(query).length < 2) {
        setLoading(false);
        closePanel();
        return;
      }

      setLoading(true);
      discovery.loadAll()
        .then(function (catalog) {
          if (sequence !== requestSequence) return;
          setLoading(false);
          renderSuggestions(discovery.search(catalog, query).slice(0, 60), query);
        })
        .catch(function () {
          if (sequence !== requestSequence) return;
          setLoading(false);
          renderError();
        });
    }

    input.addEventListener("input", function () {
      window.clearTimeout(debounceTimer);
      const value = input.value;
      clearButton.hidden = !value;
      debounceTimer = window.setTimeout(function () { runSearch(value); }, 200);
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown" && options.length) {
        event.preventDefault();
        openPanel();
        setActive(activeIndex + 1);
      } else if (event.key === "ArrowUp" && options.length) {
        event.preventDefault();
        openPanel();
        setActive(activeIndex <= 0 ? options.length - 1 : activeIndex - 1);
      } else if (event.key === "Enter" && activeIndex >= 0 && options[activeIndex]) {
        event.preventDefault();
        navigate(options[activeIndex].href, insideDrawer);
      } else if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
      } else if (event.key === "Tab") {
        window.setTimeout(closePanel, 0);
      }
    });

    input.addEventListener("focus", function () {
      if (options.length && discovery.normalizeText(input.value).length >= 2) openPanel();
    });

    clearButton.addEventListener("click", function () {
      requestSequence += 1;
      window.clearTimeout(debounceTimer);
      input.value = "";
      clearButton.hidden = true;
      setLoading(false);
      closePanel();
      input.focus();
    });

    form.addEventListener("submit", function (event) {
      const query = input.value.trim().replace(/\s+/g, " ");
      if (!query) {
        event.preventDefault();
        closePanel();
        return;
      }
      event.preventDefault();
      navigate("/search/?q=" + encodeURIComponent(query), insideDrawer);
    });

    viewAll.addEventListener("click", function () {
      closePanel();
      if (insideDrawer) closeDrawer();
    });

    componentRegistry.push({ host: host, close: closePanel });
  }

  function injectDrawerSearch() {
    const drawer = document.getElementById("mobileMenu");
    if (!drawer || drawer.querySelector("[data-site-search]")) return;
    const host = document.createElement("div");
    host.dataset.siteSearch = "true";
    host.dataset.searchVariant = "drawer";
    drawer.insertBefore(host, drawer.firstChild);
  }

  function initialize() {
    ensureStylesheet();
    injectDrawerSearch();
    document.querySelectorAll("[data-site-search]").forEach(initSearch);
    document.addEventListener("pointerdown", function (event) {
      componentRegistry.forEach(function (component) {
        if (!component.host.contains(event.target)) component.close();
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
