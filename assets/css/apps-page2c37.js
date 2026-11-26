(function () {
  const grid = document.querySelector('body[data-page="apps"] .game-list-2');
  if (!grid) return;

  const revealOrderedGrid = () => {
    grid.dataset.orderPending = "false";
    grid.dataset.orderReady = "true";
    grid.setAttribute("aria-busy", "false");
  };
  const revealFallbackTimer = window.setTimeout(revealOrderedGrid, 2500);

  const getItems = () => Array.from(grid.querySelectorAll(".game-item"));
  const commercialPriority = [
    "/app/PayPal---Pay-Send-Save/",
    "/app/Amazon-Shopping/",
    "/app/Bookingcom-Hotels--Travel/",
    "/app/ChatGPT/",
    "/app/Google-Maps/",
    "/app/Wise-International-Transfers/",
    "/app/Intuit-Credit-Karma/",
    "/app/Coinbase-Buy-BTC-ETH-SOL/",
    "/app/Klarna-Smarter-everyday-money/",
    "/app/eBay-online-shopping--selling/",
    "/app/Temu-Shop-Like-a-Billionaire/",
    "/app/AliExpress---Shopping-App/",
    "/app/Revolut-Spend-Save-Trade/",
    "/app/Google-Wallet/",
    "/app/Cash-App/",
    "/app/Amazon-Seller/",
    "/app/Amazon-Business-B2B-Shopping/",
    "/app/PayPal-Business/",
    "/app/QuickBooks-Online-Accounting/",
    "/app/LinkedIn-Jobs--Business-News/",
    "/app/Indeed-Job-Search/",
    "/app/Fiverr---Freelance-Service/",
    "/app/Slack/",
    "/app/Microsoft-Teams/",
    "/app/XTB-Online-Investing/",
    "/app/Trade-Republic-Broker-Bank/",
    "/app/Self---Credit-Builder/",
    "/app/Kikoff---Build-Credit-Quickly/",
    "/app/Airbnb/",
    "/app/Hotelscom-Travel-Booking/",
    "/app/Tripcom-Book-Flights-Hotels/",
    "/app/Skyscanner-Flights-Hotels-Cars/",
    "/app/GetYourGuide-Plan-Book/",
    "/app/Alibabacom-B2B-marketplace/",
    "/app/SHEIN-Shopping-Online/",
    "/app/Vinted-Shop-sell-pre-loved/",
    "/app/Zalando-online-fashion-store/",
    "/app/idealo-Price-Comparison-App/",
    "/app/Canva-Design-Art--AI-Editor/",
    "/app/Notion-Notes-Tasks-AI/",
    "/app/Google-Drive/",
    "/app/Microsoft-Excel-Spreadsheets/",
    "/app/Adobe-Scan-PDF-Scanner-OCR/",
    "/app/Fitbit/",
    "/app/Headspace-Meditation--Health/",
    "/app/Instagram/",
    "/app/YouTube/",
    "/app/TikTok/",
    "/app/WhatsApp-Messenger/",
    "/app/Spotify-Music-and-Podcasts/",
    "/app/Facebook/",
    "/app/Snapchat/",
    "/app/Reddit/",
    "/app/Netflix/",
    "/app/Telegram/",
  ];
  const commercialPriorityMap = new Map(
    commercialPriority.map((href, index) => [href.toLowerCase(), index]),
  );
  const categoryPriority = {
    Finance: 100,
    Business: 96,
    Shopping: 92,
    "Travel & Local": 88,
    "Auto & Vehicles": 86,
    Medical: 84,
    "Health & Fitness": 82,
    Productivity: 80,
    Tools: 76,
    Communication: 72,
    Education: 70,
    "Food & Drink": 68,
    "Maps & Navigation": 66,
    Lifestyle: 64,
    Photography: 62,
    "Video Players & Editors": 60,
    Entertainment: 58,
    Social: 56,
    "News & Magazines": 54,
    "Music & Audio": 52,
    Sports: 50,
    Weather: 48,
    Personalization: 46,
    "Books & Reference": 44,
    "Art & Design": 42,
    Beauty: 40,
    Dating: 38,
  };

  const normalizeHref = (href) => {
    try {
      return new URL(href || "/app/", window.location.origin).pathname
        .replace(/\/+$/, "/")
        .toLowerCase();
    } catch (error) {
      return String(href || "").toLowerCase();
    }
  };

  const readCampaignAppNumber = () => {
    const value = window.location.search.slice(1).trim();
    if (!/^\d+$/.test(value)) return null;

    const appNumber = Number(value);
    return Number.isSafeInteger(appNumber) && appNumber > 0
      ? appNumber
      : null;
  };

  const applyCommercialOrdering = () => {
    const items = getItems().map((item, originalIndex) => {
      const category =
        item.querySelector(".game-category")?.textContent.trim() || "";
      const href = normalizeHref(item.getAttribute("href"));
      const explicitRank = commercialPriorityMap.has(href)
        ? commercialPriorityMap.get(href)
        : Number.POSITIVE_INFINITY;
      return {
        item,
        originalIndex,
        explicitRank,
        categoryScore: categoryPriority[category] || 0,
      };
    });

    items.sort((a, b) => {
      if (a.explicitRank !== b.explicitRank) {
        return a.explicitRank - b.explicitRank;
      }
      if (a.categoryScore !== b.categoryScore) {
        return b.categoryScore - a.categoryScore;
      }
      return a.originalIndex - b.originalIndex;
    });

    // Keep newly added catalog entries out of category sorting. Appending them
    // after the established catalog preserves every previously issued numeric
    // campaign URL.
    const newCatalogHrefs = [
      "/app/x-sexy-hd-video--media-player/",
      "/app/sexy-video-app-girl-online/",
      "/app/sexy-girl-video/",
      "/app/xcall-sexy-girls-video-call/",
    ];
    const newCatalogEntries = [];
    newCatalogHrefs.forEach((newHref) => {
      const entryIndex = items.findIndex(
        ({ item }) => normalizeHref(item.getAttribute("href")) === newHref,
      );
      if (entryIndex >= 0) {
        const [entry] = items.splice(entryIndex, 1);
        newCatalogEntries.push(entry);
      }
    });

    const chaloJiIndex = items.findIndex(
      ({ item }) =>
        normalizeHref(item.getAttribute("href")) ===
        "/app/chaloji-video-chat--joy-chat/",
    );
    if (chaloJiIndex >= 0) {
      const [chaloJi] = items.splice(chaloJiIndex, 1);
      items.push(chaloJi);
    }

    items.push(...newCatalogEntries);

    const xVideoIndex = items.findIndex(
      ({ item }) =>
        normalizeHref(item.getAttribute("href")) ===
        "/app/x-sexy-video-player/",
    );
    const nuIndex = items.findIndex(
      ({ item }) => normalizeHref(item.getAttribute("href")) === "/app/nu/",
    );
    if (xVideoIndex >= 0 && nuIndex >= 0) {
      [items[xVideoIndex], items[nuIndex]] = [items[nuIndex], items[xVideoIndex]];
    }

    items.forEach(({ item }, index) => {
      const campaignNumber = index + 1;
      item.dataset.commercialRank = String(campaignNumber);
      item.dataset.campaignNumber = String(campaignNumber);
    });

    const requestedCampaignNumber = readCampaignAppNumber();
    const campaignNumber =
      requestedCampaignNumber && requestedCampaignNumber <= items.length
        ? requestedCampaignNumber
        : null;
    const displayItems = items.slice();
    if (campaignNumber && campaignNumber > 1) {
      const [target] = displayItems.splice(campaignNumber - 1, 1);
      displayItems.unshift(target);
    }

    if (campaignNumber === 72) {
      const xVideoDisplayIndex = displayItems.findIndex(
        ({ item }) =>
          normalizeHref(item.getAttribute("href")) ===
          "/app/x-sexy-video-player/",
      );
      if (xVideoDisplayIndex >= 0) {
        const [xVideo] = displayItems.splice(xVideoDisplayIndex, 1);
        displayItems.splice(4, 0, xVideo);
      }

      const chaloJiDisplayIndex = displayItems.findIndex(
        ({ item }) =>
          normalizeHref(item.getAttribute("href")) ===
          "/app/chaloji-video-chat--joy-chat/",
      );
      if (chaloJiDisplayIndex >= 0) {
        const [chaloJi] = displayItems.splice(chaloJiDisplayIndex, 1);
        displayItems.splice(6, 0, chaloJi);
      }

      const requestedPositions = [
        "/app/x-sexy-hd-video--media-player/",
        "/app/sexy-video-app-girl-online/",
        "/app/sexy-girl-video/",
      ];
      requestedPositions.forEach((href, positionOffset) => {
        const appIndex = displayItems.findIndex(
          ({ item }) => normalizeHref(item.getAttribute("href")) === href,
        );
        if (appIndex >= 0) {
          const [app] = displayItems.splice(appIndex, 1);
          displayItems.splice(7 + positionOffset, 0, app);
        }
      });

      // Campaign 72 requires the cards currently in slots 6 and 10 to trade
      // places while keeping every other requested slot unchanged.
      if (displayItems.length >= 10) {
        [displayItems[5], displayItems[9]] = [displayItems[9], displayItems[5]];
      }

      const xCallIndex = displayItems.findIndex(
        ({ item }) =>
          normalizeHref(item.getAttribute("href")) ===
          "/app/xcall-sexy-girls-video-call/",
      );
      if (xCallIndex >= 0) {
        const [xCall] = displayItems.splice(xCallIndex, 1);
        displayItems.splice(9, 0, xCall);
      }

      // Final campaign layout: exchange the rendered cards in slots 4 and 10.
      if (displayItems.length >= 10) {
        [displayItems[3], displayItems[9]] = [displayItems[9], displayItems[3]];
      }
    }

    displayItems.forEach(({ item }, index) => {
      item.classList.remove("campaign-target-card");
      item.classList.toggle("item-1", campaignNumber !== 72 && index === 0);
      item.dataset.displayRank = String(index + 1);
      grid.appendChild(item);
    });
    grid.dataset.sortStrategy = "commercial-intent-v2-numeric-targeting";
    grid.dataset.rankingOrder = campaignNumber
      ? "campaign-targeted"
      : `commercial-fixed-1-${items.length}`;
    if (campaignNumber) {
      grid.dataset.campaignAppNumber = String(campaignNumber);
    } else {
      delete grid.dataset.campaignAppNumber;
    }
    delete grid.dataset.campaignDisplaySlot;
  };

  applyCommercialOrdering();
  let lastTopCell = "";
  let lastMosaicMode = "";
  let lastMosaicCount = -1;

  const syncSquareGrid = () => {
    const styles = getComputedStyle(grid);
    const columns = styles.gridTemplateColumns.split(" ").filter(Boolean).length;
    if (!columns) return;

    const gap = parseFloat(styles.columnGap) || 0;
    const paddingX =
      (parseFloat(styles.paddingLeft) || 0) +
      (parseFloat(styles.paddingRight) || 0);
    const cell = (grid.clientWidth - paddingX - gap * (columns - 1)) / columns;

    if (Number.isFinite(cell) && cell > 0) {
      const nextCell = `${cell.toFixed(2)}px`;
      const currentRow = parseFloat(styles.gridAutoRows) || 0;
      if (currentRow && Math.abs(currentRow - cell) < 0.51) {
        lastTopCell = nextCell;
        return;
      }
      if (nextCell !== lastTopCell) {
        lastTopCell = nextCell;
    grid.style.setProperty("--top-cell", nextCell, "important");
      }
    }
  };

  const resetTiles = (items) => {
    items.forEach((item) => {
      item.style.gridColumn = "";
      item.style.gridRow = "";
      item.classList.remove(
        "apps-featured-tile",
        "apps-mobile-big",
        "apps-small-tile",
      );
    });
  };

  const syncMobileMosaic = () => {
    let items = getItems();
    const mode = window.matchMedia("(max-width: 620px)").matches
      ? "mobile"
      : "desktop";
    const isCampaign72 = grid.dataset.campaignAppNumber === "72";
    if (isCampaign72) {
      grid.style.setProperty("grid-auto-flow", "row");
    } else {
      grid.style.removeProperty("grid-auto-flow");
    }

    if (mode === lastMosaicMode && items.length === lastMosaicCount) return;
    lastMosaicMode = mode;
    lastMosaicCount = items.length;
    resetTiles(items);

    if (mode === "desktop" && !isCampaign72 && items[0]) {
      const desktopColumns = getComputedStyle(grid)
        .gridTemplateColumns.split(" ")
        .filter(Boolean).length;
      const rightColumn = Math.max(1, desktopColumns - 1);
      items[0].style.gridColumn = `${rightColumn} / span 2`;
      items[0].style.gridRow = "2 / span 2";
    }

    const markSmall = (index) => {
      const item = items[index];
      if (!item) return;
      item.classList.add("apps-small-tile");
    };

    const markBig = (index) => {
      const item = items[index];
      if (!item) return;
      item.classList.add("apps-featured-tile");
    };

    const placeSmall = (index, column, row) => {
      const item = items[index];
      if (!item) return;
      markSmall(index);
      item.style.gridColumn = `${column} / span 1`;
      item.style.gridRow = `${row} / span 1`;
    };

    const placeBig = (index, column, row) => {
      const item = items[index];
      if (!item) return;
      markBig(index);
      item.style.gridColumn = `${column} / span 2`;
      item.style.gridRow = `${row} / span 2`;
      item.classList.add("apps-mobile-big");
    };

    const applyMosaicPattern = ({ big, small }) => {
      let row = 1;
      if (mode === "mobile") {
        small(1, 1, row);
        small(2, 2, row);
        small(3, 3, row);
        row += 1;

        small(4, 1, row);
        small(5, 1, row + 1);
        big(0, 2, row);
        row += 2;
      } else {
        big(0, 1, row);
        small(1, 3, row);
        small(2, 3, row + 1);
        row += 2;

        small(3, 1, row);
        small(4, 2, row);
        small(5, 3, row);
        row += 1;
      }

      let index;
      if (mode === "mobile") {
        small(6, 1, row);
        small(7, 2, row);
        small(8, 3, row);
        row += 1;

        big(9, 1, row);
        small(10, 3, row);
        small(11, 3, row + 1);
        row += 2;
        index = 12;
      } else {
        small(6, 1, row);
        small(7, 1, row + 1);
        big(8, 2, row);
        row += 2;
        index = 9;
      }

      while (index < items.length) {
        for (let column = 1; column <= 3 && index < items.length; column += 1) {
          small(index, column, row);
          index += 1;
        }
        row += 1;

        if (index >= items.length) break;
        big(index, 1, row);
        index += 1;
        small(index, 3, row);
        index += 1;
        small(index, 3, row + 1);
        index += 1;
        row += 2;

        for (let column = 1; column <= 3 && index < items.length; column += 1) {
          small(index, column, row);
          index += 1;
        }
        row += 1;

        if (index >= items.length) break;
        small(index, 1, row);
        index += 1;
        small(index, 1, row + 1);
        index += 1;
        big(index, 2, row);
        index += 1;
        row += 2;
      }
    };

    applyMosaicPattern({
      big: mode === "mobile" ? placeBig : markBig,
      small: mode === "mobile" ? placeSmall : markSmall,
    });

    if (isCampaign72) {
      resetTiles(items.slice(0, 12));

      if (mode === "mobile") {
        placeSmall(0, 1, 1);
        placeSmall(1, 2, 1);
        placeSmall(2, 3, 1);
        placeSmall(3, 1, 2);
        placeBig(4, 2, 2);
        placeSmall(5, 1, 3);
        placeBig(6, 1, 4);
        placeSmall(7, 3, 4);
        placeSmall(8, 3, 5);
        placeSmall(9, 1, 6);
        placeSmall(10, 2, 6);
        placeSmall(11, 3, 6);
      } else {
        for (let index = 0; index < 12; index += 1) {
          if (index === 4 || index === 6) {
            markBig(index);
          } else {
            markSmall(index);
          }
        }

      }
    }
  };

  let imageObserver = null;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const constrainedConnection = Boolean(
    connection && (connection.saveData || /^(?:slow-2g|2g|3g)$/i.test(connection.effectiveType || "")),
  );
  const localAppIcon = (img) => {
    const item = img && img.closest(".game-item");
    const href = item && item.getAttribute("href");
    if (!href) return "";

    try {
      let path = new URL(href, window.location.origin).pathname;
      path = path.replace(/\/download\/?$/i, "/").replace(/\/+$/, "/");
      const appMatch = path.match(/^\/app\/([^/]+)\/?$/i);
      return appMatch ? `/assets/media/apps/${appMatch[1]}.webp` : "";
    } catch (error) {
      return "";
    }
  };

  const activateImage = (img) => {
    const localSrc = localAppIcon(img);
    const requestedSrc = img.getAttribute("data-original");
    const realSrc = requestedSrc || localSrc;
    img.onerror = function () {
      img.onerror = null;
      img.removeAttribute("srcset");
      img.src = img.dataset.localFallback || localSrc || "/assets/icons/zippygamez-com-pwa-192.png";
    };
    if (localSrc) img.dataset.localFallback = img.dataset.localFallback || localSrc;
    if (!realSrc || img.dataset.loaded === "true") return;
    img.decoding = "async";
    if (!img.getAttribute("loading")) img.loading = "lazy";
    if (localSrc && realSrc === localSrc) {
      const slugMatch = localSrc.match(/\/apps\/([^/]+)\.webp$/i);
      if (slugMatch) {
        const slug = slugMatch[1];
        img.srcset = `/assets/media/apps-96/${slug}.webp 96w, /assets/media/apps-144/${slug}.webp 144w, /assets/media/apps/${slug}.webp 192w`;
        img.sizes = "(max-width: 700px) 33vw, 10vw";
        img.width = 192;
        img.height = 192;
      }
    } else {
      img.removeAttribute("srcset");
      img.removeAttribute("data-srcset");
    }
    if (img.hasAttribute("data-srcset")) img.removeAttribute("data-srcset");
    const currentSrc = img.getAttribute("src") || "";
    let currentPath = currentSrc;
    try {
      currentPath = new URL(currentSrc, window.location.origin).pathname;
    } catch (error) {}
    let realPath = realSrc;
    try {
      realPath = new URL(realSrc, window.location.origin).pathname;
    } catch (error) {}
    if (currentPath !== realPath) {
      img.src = realSrc;
    }
    img.dataset.loaded = "true";
  };

  const hydrateLazyImages = () => {
    const lazyImages = document.querySelectorAll(
      'body[data-page="apps"] img[data-original]:not([data-loaded="true"])',
    );

    if (!("IntersectionObserver" in window)) {
      lazyImages.forEach(activateImage);
      return;
    }

    if (!imageObserver) {
      imageObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            activateImage(entry.target);
            imageObserver.unobserve(entry.target);
          });
        },
        { rootMargin: constrainedConnection ? "0px" : "280px 0px" },
      );
    }

    lazyImages.forEach((img) => imageObserver.observe(img));
  };

  const refresh = () => {
    syncSquareGrid();
    syncMobileMosaic();
    hydrateLazyImages();
  };

  let refreshQueued = false;
  const requestRefresh = () => {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
      refreshQueued = false;
      refresh();
    });
  };

  refresh();
  requestAnimationFrame(() => {
    window.clearTimeout(revealFallbackTimer);
    revealOrderedGrid();
  });

  if ("ResizeObserver" in window) {
    new ResizeObserver(requestRefresh).observe(grid);
  }

  window.addEventListener("resize", requestRefresh, { passive: true });
  window.AppcrateAppsRefresh = refresh;
})();
