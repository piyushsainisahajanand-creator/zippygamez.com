(function () {
  var isAppDetail = document.body && document.body.getAttribute("data-section") === "apps";
  if (!isAppDetail) return;

  if (!document.getElementById("appcrate-apps-similar-label")) {
    var labelStyle = document.createElement("style");
    labelStyle.id = "appcrate-apps-similar-label";
    labelStyle.textContent =
      'body[data-section="apps"] .page-left section:has(> .game-list) h5::after{content:"24 Apps"}';
    document.head.appendChild(labelStyle);
  }

  var similarGrid = document.querySelector(".page-left section > .game-list");
  var hotGrid = document.querySelector(".page-right .right-list");
  if (!similarGrid && !hotGrid) return;

  function siteRoot() {
    if (typeof window.AppcrateSiteRoot === "function") return window.AppcrateSiteRoot();
    if (window.__APPCRATE_SITE_ROOT__) return window.__APPCRATE_SITE_ROOT__;
    var path = window.location.pathname || "/";
    var markers = ["/topgames/", "/playgames/", "/app/", "/article/", "/page/", "/assets/"];
    for (var i = 0; i < markers.length; i += 1) {
      var index = path.indexOf(markers[i]);
      if (index >= 0) {
        window.__APPCRATE_SITE_ROOT__ = path.slice(0, index + 1);
        return window.__APPCRATE_SITE_ROOT__;
      }
    }
    window.__APPCRATE_SITE_ROOT__ = path.replace(/[^/]+$/, "") || "/";
    return window.__APPCRATE_SITE_ROOT__;
  }

  function siteUrl(path) {
    if (typeof window.AppcrateSiteUrl === "function") return window.AppcrateSiteUrl(path);
    return siteRoot() + String(path || "").replace(/^\//, "");
  }

  var catalogUrls = [
    siteUrl("assets/data/apps-lite.json?v=remote-first-20260811"),
    "/assets/data/apps-lite.json?v=remote-first-20260811",
  ];

  var currentPath = appPathKey(window.location.pathname);
  var currentCategory = cleanText(
    document.querySelector(".detail-info .app-title .developer") &&
      document.querySelector(".detail-info .app-title .developer").textContent
  );
  var commercialPriority = [
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
    "/app/Telegram/"
  ];
  var categoryPriority = {
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
    Dating: 38
  };
  var commercialPriorityMap = commercialPriority.reduce(function (map, href, index) {
    map[normalizePath(href)] = index;
    return map;
  }, {});

  function normalizePath(path) {
    return String(path || "")
      .replace(/\/download\/?$/i, "/")
      .replace(/\/index\.html$/i, "/")
      .replace(/\/+$/, "/")
      .toLowerCase();
  }

  function appPathKey(pathname) {
    var match = String(pathname || "").match(/\/app\/([^/]+)/i);
    return match ? "/app/" + decodeURIComponent(match[1]).toLowerCase() + "/" : normalizePath(pathname);
  }

  function appSlugFromHref(href) {
    var match = String(href || "").match(/\/app\/([^/?#]+)/i);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function localAppHref(href) {
    var slug = appSlugFromHref(href);
    return slug ? siteUrl("app/" + slug + "/index.html") : href || "#";
  }

  function localAsset(path) {
    if (!path) return "";
    if (String(path).indexOf("/assets/") === 0) return siteUrl(String(path).replace(/^\//, ""));
    return path;
  }

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function escapeHTML(value) {
    return cleanText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function localPwaIcon(link) {
    var slug = appSlugFromHref(link);
    return slug ? siteUrl("assets/media/apps/" + slug + ".webp") : "";
  }

  function commercialRank(app) {
    var explicitRank = Object.prototype.hasOwnProperty.call(commercialPriorityMap, app.path)
      ? commercialPriorityMap[app.path]
      : Number.POSITIVE_INFINITY;
    return {
      explicitRank: explicitRank,
      categoryScore: categoryPriority[app.category] || 0,
      originalIndex: app.originalIndex
    };
  }

  function compareCommercial(a, b) {
    var rankA = commercialRank(a);
    var rankB = commercialRank(b);
    if (rankA.explicitRank !== rankB.explicitRank) {
      return rankA.explicitRank - rankB.explicitRank;
    }
    if (rankA.categoryScore !== rankB.categoryScore) {
      return rankB.categoryScore - rankA.categoryScore;
    }
    return rankA.originalIndex - rankB.originalIndex;
  }

  function rankSimilar(apps) {
    return apps.slice().sort(function (a, b) {
      var aMatches = currentCategory && a.category === currentCategory ? 1 : 0;
      var bMatches = currentCategory && b.category === currentCategory ? 1 : 0;
      if (aMatches !== bMatches) return bMatches - aMatches;
      return compareCommercial(a, b);
    });
  }

  function collectApps(records) {
    return (Array.isArray(records) ? records : [])
      .map(function (record, originalIndex) {
        var link = record.href || "";
        var slug = appSlugFromHref(link);
        var remoteIcon = String(record.icon || "").trim();
        return {
          href: localAppHref(link),
          path: appPathKey(link),
          title: cleanText(record.title),
          category: cleanText(record.category),
          icon: remoteIcon || localPwaIcon(link) || "",
          // Prefer the remote Play icon when the local webp is unavailable.
          localIcon: remoteIcon || localAsset(record.localIcon) || localPwaIcon(link) || "",
          slug: slug,
          originalIndex: Number.isInteger(record.originalIndex) ? record.originalIndex : originalIndex
        };
      })
      .filter(function (app) {
        return app.href && app.title && app.icon && app.path !== currentPath;
      });
  }

  function responsiveIconAttributes(app) {
    // Only use local responsive srcset when the primary icon is already a local asset.
    // Missing local media must not override remote Google Play icons.
    if (!String(app.icon || "").includes("/assets/media/apps")) return "";
    var slug = app.slug || appSlugFromHref(app.href);
    if (!slug) return "";
    var safe = escapeHTML(slug);
    return (
      ' srcset="' +
      escapeHTML(siteUrl("assets/media/apps-96/" + safe + ".webp")) +
      " 96w, " +
      escapeHTML(siteUrl("assets/media/apps-144/" + safe + ".webp")) +
      " 144w, " +
      escapeHTML(siteUrl("assets/media/apps/" + safe + ".webp")) +
      ' 192w" sizes="96px" width="192" height="192"'
    );
  }

  function card(app, compact) {
    var responsiveAttributes = responsiveIconAttributes(app);
    var remoteIcon = /^https?:\/\//i.test(String(app.icon || ""));
    var fallbackIcon = escapeHTML(
      remoteIcon
        ? app.icon
        : app.localIcon || siteUrl("assets/icons/zippygamez-com-pwa-192.png"),
    );
    if (compact) {
      return [
        '<a class="game-item-column" href="', escapeHTML(app.href), '">',
          '<div class="app-icon"><img loading="lazy" decoding="async" src="', escapeHTML(app.icon), '"', responsiveAttributes, ' data-local-fallback="', fallbackIcon, '" referrerpolicy="no-referrer" alt="', escapeHTML(app.title), ' icon" onerror="this.onerror=null;this.removeAttribute(\'srcset\');this.src=this.dataset.localFallback||\'\';"></div>',
          '<div class="right-info">',
            '<h2>', escapeHTML(app.title), '</h2>',
            '<p class="cate">', escapeHTML(app.category || "App"), '</p>',
          '</div>',
          '<div class="download-icon" aria-hidden="true"><span>View</span></div>',
        '</a>'
      ].join("");
    }

    return [
      '<a class="game-item" href="', escapeHTML(app.href), '">',
        '<div class="game-icon"><img loading="lazy" decoding="async" src="', escapeHTML(app.icon), '"', responsiveAttributes, ' data-local-fallback="', fallbackIcon, '" referrerpolicy="no-referrer" alt="', escapeHTML(app.title), ' icon" onerror="this.onerror=null;this.removeAttribute(\'srcset\');this.src=this.dataset.localFallback||\'\';"></div>',
        '<span class="game-title">', escapeHTML(app.title), '</span>',
      '</a>'
    ].join("");
  }

  function render(target, apps, count, compact) {
    if (!target) return;
    var selection = apps.slice(0, count);
    if (!selection.length) {
      target.hidden = true;
      return;
    }
    target.hidden = false;
    target.innerHTML = selection.map(function (app) {
      return card(app, compact);
    }).join("");
  }

  function fetchFirstOk(urls) {
    return urls.reduce(function (promise, url) {
      return promise.then(function (result) {
        if (result) return result;
        return fetch(url)
          .then(function (response) {
            return response.ok ? response : null;
          })
          .catch(function () {
            return null;
          });
      });
    }, Promise.resolve(null));
  }

  fetchFirstOk(catalogUrls)
    .then(function (response) {
      if (!response) throw new Error("App index unavailable");
      return response.json();
    })
    .then(function (records) {
      var apps = collectApps(records);
      var similarApps = rankSimilar(apps);
      var similarSelection = similarApps.slice(0, 24);
      var similarPaths = similarSelection.reduce(function (paths, app) {
        paths[app.path] = true;
        return paths;
      }, {});
      var hotApps = apps
        .filter(function (app) { return !similarPaths[app.path]; })
        .sort(compareCommercial);
      render(similarGrid, similarSelection, 24, false);
      render(hotGrid, hotApps, 8, true);
    })
    .catch(function () {
      if (similarGrid) similarGrid.hidden = true;
      if (hotGrid) hotGrid.hidden = true;
    });
})();
