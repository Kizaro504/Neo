/* ==========================================================================
   NEO GAMING — commerce + rig forge runtime
   ========================================================================== */

(function () {
  "use strict";

  const D = window.HX_DATA;
  const Art = window.HXArt;

  if (!D || !Art) {
    console.error("NEO: data or art module failed to load.");
    return;
  }

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  const ICONS = {
    search: "i-search",
    cart: "i-cart",
    user: "i-user",
    heart: "i-heart",
    star: "i-star",
    check: "i-check",
    alert: "i-alert",
    arrow: "i-arrow-right",
    arrowUp: "i-arrow-up-right",
    close: "i-x",
    plus: "i-plus",
    minus: "i-minus",
    trash: "i-trash",
    sparkles: "i-sparkles",
    bolt: "i-bolt",
    copy: "i-copy",
    truck: "i-truck",
    shield: "i-shield",
    flame: "i-flame",
    lock: "i-lock",
    refresh: "i-refresh",
    download: "i-download",
    share: "i-share",
    mail: "i-mail",
    chevron: "i-chevron-down",
    play: "i-play",
  };

  const icon = (name, cls = "") =>
    `<svg class="icon ${cls}" aria-hidden="true"><use href="#${name}"></use></svg>`;

  const money0 = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  const money2 = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const esc = (value) =>
    String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const round2 = (n) => Math.round(n * 100) / 100;

  function hexToRgb(hex) {
    const clean = String(hex || "#00f0ff").replace("#", "");
    const full =
      clean.length === 3
        ? clean.split("").map((c) => c + c).join("")
        : clean.padEnd(6, "0").slice(0, 6);
    const num = parseInt(full, 16);
    if (Number.isNaN(num)) return "0, 240, 255";
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
  }

  function debounce(fn, wait) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /* ------------------------------------------------------------------------
     Persistence
     ------------------------------------------------------------------------ */
  const stores = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (err) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        /* storage can be unavailable in private mode */
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (err) {}
    },
  };

  /* Hydrate storefront content from the admin-managed data layer. */
  const StoreData = window.NeoStore;
  if (StoreData) {
    StoreData.ensureSeeded();
    const managedProducts = StoreData.getProducts(true);
    if (managedProducts.length) D.products = managedProducts;
    const managedDrop = StoreData.getDrop();
    const dropStock = Math.max(0, Math.round(managedDrop.unitsTotal * (1 - managedDrop.claimed / 100)));
    D.dropProduct = {
      ...D.dropProduct,
      name: managedDrop.productName || D.dropProduct.name,
      price: managedDrop.price,
      was: managedDrop.compareAt,
      description: managedDrop.description,
      stock: dropStock,
      stockLabel: dropStock > 0 ? `${dropStock} CRATES LEFT` : "DROP CLOSED",
    };
    const managedPromos = StoreData.getActivePromoMap();
    if (Object.keys(managedPromos).length) D.promoCodes = managedPromos;
    const partOverrides = StoreData.getPartMap();
    Object.keys(D.builderParts).forEach((category) => {
      const original = D.builderParts[category];
      const next = original
        .map((part) => {
          const override = partOverrides.get(`${category}:${part.id}`);
          return override
            ? { ...part, price: Number(override.price) || part.price, adminActive: override.active !== false }
            : { ...part, adminActive: true };
        })
        .filter((part) => part.adminActive);
      if (next.length) D.builderParts[category] = next;
    });
  }

  const STORE_SETTINGS = StoreData
    ? StoreData.getSettings()
    : {
        storeName: "Neo Gaming",
        supportEmail: "support@neogaming.gg",
        freeShippingThreshold: 99,
        standardShipping: 12,
        announcement: "FREE NEXT-DAY DROP // ORDERS $99+ // NEO MEMBERS GET +5% LOOT",
      };

  const productMap = new Map(D.products.map((product) => [product.id, product]));
  productMap.set(D.dropProduct.id, D.dropProduct);

  function findProduct(id) {
    return productMap.get(id) || D.products.find((p) => p.id === id) || null;
  }

  function getPart(category, id) {
    const list = D.builderParts[category] || [];
    return list.find((part) => part.id === id) || null;
  }

  function detectPreset(selections) {
    for (const [key, preset] of Object.entries(D.presets)) {
      const matches = Object.keys(preset.selections).every(
        (category) => preset.selections[category] === selections[category]
      );
      if (matches) return key;
    }
    return "custom";
  }

  function normalizeSelections(input) {
    const fallback = D.presets.apex.selections;
    return Object.fromEntries(
      D.builderCategories.map((category) => {
        const list = D.builderParts[category.id] || [];
        const candidate = input && input[category.id];
        const fallbackId = fallback[category.id];
        const id = list.some((part) => part.id === candidate)
          ? candidate
          : list.some((part) => part.id === fallbackId)
          ? fallbackId
          : list[0] && list[0].id;
        return [category.id, id];
      })
    );
  }

  function loadBuild() {
    let stored = null;
    try {
      const urlBuild = new URLSearchParams(window.location.search).get("build");
      if (urlBuild) {
        stored = JSON.parse(decodeURIComponent(escape(atob(urlBuild))));
      }
    } catch (err) {
      stored = null;
    }
    if (!stored) stored = stores.get("hx_build_v1", null);
    const selections = normalizeSelections(stored && stored.selections);
    const preset = detectPreset(selections);
    const resolution =
      stored && [1080, 1440, 2160].includes(Number(stored.resolution))
        ? Number(stored.resolution)
        : preset !== "custom"
        ? D.presets[preset].resolution
        : 1440;
    return { selections, preset, resolution };
  }

  const initialBuild = loadBuild();
  const initialCartRaw = stores.get("hx_cart_v1", []);
  const initialCart = Array.isArray(initialCartRaw)
    ? initialCartRaw
        .filter(
          (item) =>
            item &&
            Number(item.qty) > 0 &&
            ((item.productId && productMap.has(item.productId)) ||
              (item.custom && typeof item.custom.price === "number"))
        )
        .map((item) => ({ ...item, qty: clamp(Number(item.qty), 1, 9) }))
        .slice(0, 20)
    : [];

  const state = {
    theme: document.documentElement.dataset.theme === "light" ? "light" : "dark",
    sound: stores.get("hx_sound_v1", true),
    cart: initialCart,
    wishlist: new Set(stores.get("hx_wishlist_v1", [])),
    settings: STORE_SETTINGS,
    drop: StoreData ? StoreData.getDrop() : null,
    filters: {
      category: "All",
      maxPrice: Math.max(3500, Math.ceil(Math.max(0, ...(D.products || []).map((product) => product.price)) / 500) * 500),
      sort: "featured",
    },
    heroIndex: 0,
    heroTimer: null,
    heroPaused: false,
    build: initialBuild.selections,
    activePreset: initialBuild.preset,
    resolution: initialBuild.resolution,
    activeGame: "cyberpunk",
    openPartCats: new Set(["cpu"]),
    partQuery: "",
    partBrand: "All",
    partSort: "featured",
    modalProductId: null,
    modalQty: 1,
    promo: null,
    searchIndex: -1,
    searchItems: [],
    activeOverlay: null,
    lastFocus: null,
    lootUntil: Number(stores.get("hx_loot_until", 0)) || 0,
    user: stores.get("hx_user_v1", null),
    checkoutBusy: false,
  };

  /* ------------------------------------------------------------------------
     Audio engine — tiny synthesized HUD clicks, no external files
     ------------------------------------------------------------------------ */
  const Sound = {
    ctx: null,
    unlocked: false,
    unlock() {
      this.unlocked = true;
      if (state.sound) this.ensure();
    },
    ensure() {
      if (!state.sound || !this.unlocked) return null;
      try {
        if (!this.ctx) {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx) return null;
          this.ctx = new Ctx();
        }
        if (this.ctx.state === "suspended") this.ctx.resume();
        return this.ctx;
      } catch (err) {
        return null;
      }
    },
    tone(freq, duration = 0.05, type = "square", gain = 0.025, delay = 0, endFreq = null) {
      const ctx = this.ensure();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const vol = ctx.createGain();
        const start = ctx.currentTime + delay;
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        if (endFreq != null) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + duration);
        }
        vol.gain.setValueAtTime(0.0001, start);
        vol.gain.exponentialRampToValueAtTime(gain, start + 0.006);
        vol.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(vol);
        vol.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration + 0.02);
      } catch (err) {}
    },
    click() {
      this.tone(760, 0.035, "square", 0.018, 0, 1180);
    },
    select() {
      this.tone(420, 0.055, "triangle", 0.03, 0, 640);
      this.tone(880, 0.05, "sine", 0.018, 0.04);
    },
    success() {
      this.tone(520, 0.09, "triangle", 0.035, 0);
      this.tone(780, 0.1, "triangle", 0.03, 0.065);
      this.tone(1040, 0.16, "sine", 0.028, 0.13);
    },
    open() {
      this.tone(280, 0.09, "sine", 0.02, 0, 620);
      this.tone(840, 0.08, "triangle", 0.015, 0.05);
    },
    close() {
      this.tone(620, 0.08, "sine", 0.015, 0, 280);
    },
    error() {
      this.tone(210, 0.1, "sawtooth", 0.022, 0);
      this.tone(150, 0.15, "square", 0.016, 0.09);
    },
  };

  function updateSoundButton() {
    const button = $("#soundToggle");
    if (!button) return;
    button.classList.toggle("is-muted", !state.sound);
    button.setAttribute("aria-pressed", String(state.sound));
    button.setAttribute("aria-label", state.sound ? "Mute sound effects" : "Enable sound effects");
    button.setAttribute("data-tooltip", state.sound ? "SFX ON" : "SFX OFF");
  }

  /* ------------------------------------------------------------------------
     Theme
     ------------------------------------------------------------------------ */
  function applyTheme(theme) {
    state.theme = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = state.theme;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", state.theme === "light" ? "#edf1f9" : "#05070d");
    const button = $("#themeToggle");
    if (button) {
      const isLight = state.theme === "light";
      button.setAttribute("aria-pressed", String(isLight));
      button.setAttribute("aria-label", isLight ? "Switch to dark void theme" : "Activate RGB light theme");
      button.setAttribute("data-tooltip", isLight ? "VOID DARK" : "RGB LIGHT");
    }
    stores.set("hx_theme", state.theme);
    if (window.__hxParticles) window.__hxParticles.refreshColors();
  }

  /* ------------------------------------------------------------------------
     Toasts / effects
     ------------------------------------------------------------------------ */
  function toast(message, variant = "default", iconName = "i-check") {
    const stack = $("#toastStack");
    if (!stack) return;
    const node = document.createElement("div");
    node.className = `toast${variant === "success" ? " toast--success" : variant === "pink" ? " toast--pink" : ""}`;
    node.innerHTML = `<span class="toast__icon">${icon(iconName)}</span><span>${esc(message)}</span>`;
    stack.appendChild(node);
    window.setTimeout(() => {
      node.classList.add("is-out");
      window.setTimeout(() => node.remove(), 320);
    }, 3400);
    while (stack.children.length > 3) stack.firstElementChild.remove();
  }

  function pixelBurst(source, colors = ["#00f0ff", "#ff007a", "#00ff66", "#a855f7"]) {
    if (prefersReduced) return;
    const layer = $("#confettiLayer");
    if (!layer) return;
    const rect = source && source.getBoundingClientRect
      ? source.getBoundingClientRect()
      : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;
    for (let i = 0; i < 18; i++) {
      const piece = document.createElement("i");
      piece.className = "confetti-pixel";
      const angle = Math.random() * Math.PI * 2;
      const distance = 35 + Math.random() * 80;
      piece.style.left = `${originX}px`;
      piece.style.top = `${originY}px`;
      piece.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      piece.style.setProperty("--dy", `${Math.sin(angle) * distance + 30}px`);
      piece.style.setProperty("--rot", `${Math.random() * 540 - 270}deg`);
      piece.style.setProperty("--confetti-color", colors[i % colors.length]);
      piece.style.animationDelay = `${Math.random() * 0.06}s`;
      layer.appendChild(piece);
      window.setTimeout(() => piece.remove(), 1000);
    }
  }

  function floatingHeart(source) {
    if (!source) return;
    const rect = source.getBoundingClientRect();
    const node = document.createElement("span");
    node.className = "floating-heart";
    node.textContent = "+1";
    node.style.left = `${rect.left + rect.width / 2}px`;
    node.style.top = `${rect.top}px`;
    document.body.appendChild(node);
    window.setTimeout(() => node.remove(), 1100);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    } catch (err) {}
  }

  function downloadFile(filename, content, mime = "text/plain;charset=utf-8") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ------------------------------------------------------------------------
     Overlay manager
     ------------------------------------------------------------------------ */
  const overlays = {
    search: () => $("#searchOverlay"),
    cart: () => $("#cartDrawer"),
    product: () => $("#productModal"),
    profile: () => $("#profileModal"),
    loot: () => $("#lootModal"),
    info: () => $("#infoModal"),
    success: () => $("#successModal"),
  };

  function syncBodyLock() {
    const shouldLock = Boolean(state.activeOverlay) || $("#mobileMenu")?.classList.contains("is-open");
    document.body.classList.toggle("is-locked", shouldLock);
  }

  function focusFirst(overlayName) {
    const el = overlays[overlayName] && overlays[overlayName]();
    if (!el) return;
    const target =
      el.querySelector("[autofocus]") ||
      el.querySelector("input:not([type=hidden]):not([disabled])") ||
      el.querySelector("button:not([disabled])") ||
      el;
    window.setTimeout(() => {
      if (!target) return;
      try {
        target.focus({ preventScroll: true });
      } catch (err) {}
    }, 160);
  }

  function openOverlay(name) {
    if (!overlays[name]) return;
    if (state.activeOverlay && state.activeOverlay !== name) {
      closeOverlay(state.activeOverlay, false);
    }
    const overlay = overlays[name]();
    if (!overlay) return;
    state.lastFocus = document.activeElement;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    state.activeOverlay = name;
    syncBodyLock();
    Sound.open();
    focusFirst(name);
  }

  function closeOverlay(name, restoreFocus = true) {
    const overlay = overlays[name] && overlays[name]();
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    if (state.activeOverlay === name) state.activeOverlay = null;
    syncBodyLock();
    if (restoreFocus && state.lastFocus && typeof state.lastFocus.focus === "function") {
      const target = state.lastFocus;
      state.lastFocus = null;
      window.setTimeout(() => {
        try {
          target.focus({ preventScroll: true });
        } catch (err) {}
      }, 60);
    }
    Sound.close();
  }

  function closeActiveOverlay() {
    if (state.activeOverlay) closeOverlay(state.activeOverlay);
  }

  function trapFocus(event) {
    if (!state.activeOverlay || event.key !== "Tab") return;
    const overlay = overlays[state.activeOverlay]();
    if (!overlay) return;
    const focusable = $$(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      overlay
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* ------------------------------------------------------------------------
     Populate static illustrations
     ------------------------------------------------------------------------ */
  function paintCategoryArt() {
    const colors = {
      laptop: ["#00f0ff", "#ff007a"],
      console: ["#ff007a", "#a855f7"],
      gpu: ["#00ff66", "#00f0ff"],
      keyboard: ["#a855f7", "#ff007a"],
      vr: ["#39ffb0", "#00f0ff"],
    };
    $$("[data-category-art]").forEach((holder) => {
      const card = holder.closest(".category-card");
      const requested = card?.dataset.art || "laptop";
      const type = requested === "console" ? "console-ps" : requested;
      const pair = colors[requested] || colors.laptop;
      holder.innerHTML = Art.artMarkup(type, pair[0], pair[1]);
    });
    const dropArt = $("#dropArt");
    if (dropArt) {
      dropArt.innerHTML = Art.artMarkup(D.dropProduct.art, D.dropProduct.accent, D.dropProduct.accent2);
    }
  }

  /* ------------------------------------------------------------------------
     Hero slider
     ------------------------------------------------------------------------ */
  const heroRoot = $("#heroSlides");
  const heroDots = $("#heroDots");

  function renderHero() {
    if (!heroRoot) return;
    heroRoot.innerHTML = D.heroSlides
      .map(
        (slide, index) => `
        <article class="hero-slide ${index === 0 ? "is-active" : ""}" data-slide="${String(index + 1).padStart(2, "0")}" aria-hidden="${index === 0 ? "false" : "true"}">
          <div class="hero-slide__visual">
            ${Art.artMarkup(slide.art, slide.accent, slide.accent2)}
          </div>
          <div class="hero-slide__info">
            <div>
              <span class="hero-slide__brand">${esc(slide.brand)}</span>
              <h2 class="hero-slide__name">${esc(slide.name)}</h2>
              <p class="hero-slide__specs">${esc(slide.specs)}</p>
            </div>
            <div class="hero-slide__buy">
              <small>FROM</small>
              <strong>${money0.format(slide.price)}</strong>
              <button type="button" data-hero-add="${esc(slide.productId)}">ADD TO LOADOUT ${icon(ICONS.arrow)}</button>
            </div>
          </div>
        </article>`
      )
      .join("");

    if (heroDots) {
      heroDots.innerHTML = D.heroSlides
        .map(
          (slide, index) => `
          <button class="stage-dot ${index === 0 ? "is-active" : ""}" type="button" role="tab" aria-selected="${index === 0}" aria-label="View ${esc(slide.name)}" data-hero-dot="${index}"></button>`
        )
        .join("");
    }

    const total = $("#heroTotal");
    if (total) total.textContent = String(D.heroSlides.length).padStart(2, "0");
    setHeroSlide(0, true);
  }

  function setHeroSlide(index, immediate = false) {
    if (!heroRoot) return;
    const count = D.heroSlides.length;
    state.heroIndex = ((index % count) + count) % count;
    $$(".hero-slide", heroRoot).forEach((slide, i) => {
      slide.classList.toggle("is-active", i === state.heroIndex);
      slide.setAttribute("aria-hidden", String(i !== state.heroIndex));
    });
    $$("[data-hero-dot]", heroDots || document).forEach((dot, i) => {
      dot.classList.toggle("is-active", i === state.heroIndex);
      dot.setAttribute("aria-selected", String(i === state.heroIndex));
    });
    const slide = D.heroSlides[state.heroIndex];
    const name = $("#heroName");
    const code = $("#heroSlideCode");
    const current = $("#heroIndex");
    const fps = $("#heroFps");
    if (name) name.textContent = `${slide.brand.split("//")[0].trim()} ${slide.name}`;
    if (code) code.textContent = slide.code;
    if (current) current.textContent = String(state.heroIndex + 1).padStart(2, "0");
    if (fps) fps.textContent = slide.fps;
  }

  function nextHero(direction = 1) {
    setHeroSlide(state.heroIndex + direction);
    restartHeroTimer();
  }

  function restartHeroTimer() {
    if (state.heroTimer) {
      window.clearInterval(state.heroTimer);
      state.heroTimer = null;
    }
    if (prefersReduced) return;
    state.heroTimer = window.setInterval(() => {
      if (!state.heroPaused && !document.hidden && !state.activeOverlay) {
        setHeroSlide(state.heroIndex + 1);
      }
    }, 6800);
  }

  function initHero() {
    renderHero();
    $("#heroPrev")?.addEventListener("click", () => nextHero(-1));
    $("#heroNext")?.addEventListener("click", () => nextHero(1));
    heroDots?.addEventListener("click", (event) => {
      const dot = event.target.closest("[data-hero-dot]");
      if (!dot) return;
      setHeroSlide(Number(dot.dataset.heroDot));
      restartHeroTimer();
    });
    heroRoot?.addEventListener("click", (event) => {
      const add = event.target.closest("[data-hero-add]");
      if (add) {
        const product = findProduct(add.dataset.heroAdd);
        if (product) addToCart(product.id, 1, { sourceEl: add, celebrate: true });
      }
    });
    const stage = $("#heroStage");
    stage?.addEventListener("pointerenter", () => {
      state.heroPaused = true;
    });
    stage?.addEventListener("pointerleave", () => {
      state.heroPaused = false;
    });
    stage?.addEventListener("focusin", () => {
      state.heroPaused = true;
    });
    stage?.addEventListener("focusout", () => {
      state.heroPaused = false;
    });
    restartHeroTimer();
  }

  /* ------------------------------------------------------------------------
     Product catalog
     ------------------------------------------------------------------------ */
  function formattedProductPrice(product) {
    return money0.format(product.price);
  }

  function starRating(product) {
    return `<span class="product-card__rating" aria-label="${product.rating} out of 5 from ${product.reviews} reviews">
      ${icon(ICONS.star)} ${product.rating.toFixed(1)} <span>(${product.reviews})</span>
    </span>`;
  }

  function productBadge(product) {
    if (product.stock <= 0) {
      return `<span class="badge badge--discount">${icon(ICONS.flame)}SOLD OUT</span>`;
    }
    if (!product.badge) return "";
    const tone =
      product.badgeTone === "discount" ? "badge--discount" : product.badgeTone === "limited" ? "badge--limited" : "badge--new";
    return `<span class="badge ${tone}">${product.badgeTone === "discount" ? icon(ICONS.flame) : ""}${esc(product.badge)}</span>`;
  }

  function productCard(product) {
    const liked = state.wishlist.has(product.id);
    const soldOut = product.stock <= 0;
    return `
      <article class="product-card ${soldOut ? "is-soldout" : ""}" data-product-id="${esc(product.id)}" style="--card-accent:${product.accent || "#7bd64f"};--card-accent-rgb:${hexToRgb(product.accent)}">
        <div class="product-card__media">
          <div class="product-card__badges">${productBadge(product)}</div>
          <button class="product-card__wish ${liked ? "is-liked" : ""}" type="button" data-wish="${esc(product.id)}" aria-label="${liked ? "Remove" : "Add"} ${esc(product.name)} ${liked ? "from" : "to"} wishlist" aria-pressed="${liked}">
            ${icon(ICONS.heart)}
          </button>
          <div class="product-card__art">${Art.artMarkup(product.art, product.accent, product.accent2)}</div>
          <span class="product-card__stock ${product.stock > 3 ? "is-ok" : ""}"><i></i>${esc(product.stockLabel)}</span>
          <button class="product-card__quick" type="button" data-quick="${esc(product.id)}">QUICK SCAN ${icon(ICONS.arrowUp)}</button>
        </div>
        <div class="product-card__body">
          <div class="product-card__meta">
            <span class="product-card__brand">${esc(product.brand)}</span>
            ${starRating(product)}
          </div>
          <h3 class="product-card__title"><button type="button" data-quick="${esc(product.id)}">${esc(product.name)}</button></h3>
          <div class="product-card__specs">
            ${product.specs.map((spec, i) => `<span class="spec-pill ${i === 0 ? "spec-pill--accent" : ""}">${esc(spec)}</span>`).join("")}
          </div>
          <div class="product-card__foot">
            <div class="product-card__price">
              ${product.was ? `<del>${money0.format(product.was)}</del>` : ""}
              <strong>${money0.format(product.price)}</strong>
              ${product.was > product.price ? `<em>SAVE ${money0.format(product.was - product.price)}</em>` : ""}
            </div>
            <button class="add-btn" type="button" data-add="${esc(product.id)}" ${soldOut ? "disabled" : ""} aria-label="${soldOut ? "Sold out: " : "Add "}${esc(product.name)}${soldOut ? "" : " to loadout"}">
              ${icon(soldOut ? ICONS.alert : ICONS.cart)}<span class="add-btn__text">${soldOut ? "SOLD OUT" : "ADD TO LOADOUT"}</span>
            </button>
          </div>
        </div>
      </article>`;
  }

  function getFilteredProducts() {
    let list = D.products.filter((product) => {
      const inCategory = state.filters.category === "All" || product.category === state.filters.category;
      const inPrice = product.price <= state.filters.maxPrice;
      return inCategory && inPrice;
    });
    switch (state.filters.sort) {
      case "price-asc":
        list = list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = list.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list = list.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
        break;
      default:
        list = list.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
        break;
    }
    return list;
  }

  function renderProducts() {
    const grid = $("#productGrid");
    if (!grid) return;
    const list = getFilteredProducts();
    grid.innerHTML = list.map(productCard).join("");
    const empty = $("#noResults");
    if (empty) empty.hidden = list.length !== 0;
    grid.hidden = list.length === 0;
    const count = $("#resultCount");
    if (count) count.textContent = String(list.length);
    const code = $("#gridCode");
    if (code) {
      const categoryCode = {
        All: "A01",
        Laptops: "L02",
        Consoles: "C03",
        Components: "K04",
        Peripherals: "P05",
        "VR & Streaming": "V06",
      };
      code.textContent = `NG-${categoryCode[state.filters.category] || "A01"}`;
    }
    if (empty) empty.hidden = list.length !== 0;
    grid.hidden = list.length === 0;
    $$(".filter-tab").forEach((tab) => {
      const isActive = tab.dataset.filter === state.filters.category;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-pressed", String(isActive));
    });
  }

  function setCategoryFilter(category, scrollToShop = true) {
    state.filters.category = category;
    renderProducts();
    if (scrollToShop) {
      $("#shop")?.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
    }
  }

  function catalogCeiling() {
    const highest = Math.max(3500, ...(D.products || []).map((product) => Number(product.price) || 0));
    return Math.ceil(highest / 500) * 500;
  }

  function resetFilters() {
    state.filters.category = "All";
    state.filters.maxPrice = catalogCeiling();
    state.filters.sort = "featured";
    const range = $("#priceRange");
    if (range) {
      range.max = String(state.filters.maxPrice);
      range.value = String(state.filters.maxPrice);
    }
    const output = $("#priceOutput");
    if (output) output.textContent = money0.format(state.filters.maxPrice);
    const sort = $("#sortSelect");
    if (sort) sort.value = "featured";
    syncRangeFill();
    renderProducts();
    toast("Armory filters reset", "default", "i-refresh");
    Sound.select();
  }

  function syncRangeFill() {
    const range = $("#priceRange");
    if (!range) return;
    const min = Number(range.min) || 0;
    const max = Number(range.max) || 3500;
    const value = Number(range.value) || max;
    const percent = max === min ? 100 : ((value - min) / (max - min)) * 100;
    range.style.setProperty("--range-fill", `${percent}%`);
    const output = $("#priceOutput");
    if (output) output.textContent = money0.format(value);
  }

  function updateCatalogMeta() {
    const products = D.products || [];
    const totalStock = products.reduce((sum, product) => sum + (Number(product.stock) || 0), 0);
    const avgRating = products.length
      ? products.reduce((sum, product) => sum + (Number(product.rating) || 0), 0) / products.length
      : 0;
    const inStock = $("#inStockCount");
    if (inStock) inStock.textContent = String(totalStock);
    const rating = $("#dropRating");
    if (rating) rating.innerHTML = `${avgRating.toFixed(1)}<small>/5</small>`;
    $$(".filter-tab").forEach((tab) => {
      const category = tab.dataset.filter;
      const count = category === "All" ? products.length : products.filter((product) => product.category === category).length;
      const badge = tab.querySelector("span");
      if (badge) badge.textContent = String(count);
    });
    $$(".category-card").forEach((card) => {
      const category = card.dataset.category;
      const units = products
        .filter((product) => product.category === category)
        .reduce((sum, product) => sum + (Number(product.stock) || 0), 0);
      const status = card.querySelector(".category-card__status");
      if (status) {
        status.innerHTML = `<i class="status-dot"></i> ${units > 0 ? `${units} UNITS` : "OUT OF STOCK"}`;
      }
    });
    const subscribers = StoreData ? StoreData.getSubscribers().length : 0;
    const subscriberCount = $("#subscriberCount");
    if (subscriberCount) subscriberCount.textContent = (48219 + subscribers).toLocaleString("en-US");
  }

  function applyStorefrontSettings() {
    if (!state.settings) return;
    document.title = `${state.settings.storeName} — Build Beyond The Frame`;
    const supportLink = $("#supportMailLink");
    if (supportLink) supportLink.href = `mailto:${state.settings.supportEmail}`;
    const track = $("#announcementTrack");
    if (track) {
      const messages = String(state.settings.announcement || "")
        .split("//")
        .map((message) => message.trim())
        .filter(Boolean);
      if (messages.length) {
        const group = messages
          .map(
            (message, index) =>
              `<span>${index === 0 ? '<i class="status-dot"></i> ' : ""}${esc(message)}</span><span class="announcement__divider">//</span>`
          )
          .join("");
        track.innerHTML = group + group;
      }
    }
  }

  function applyManagedDrop() {
    if (!StoreData) return;
    const drop = StoreData.getDrop();
    const closed = !drop.active || drop.claimed >= 100 || (Number(drop.endsAt) || 0) <= Date.now();
    state.drop = drop;
    const status = $("#dropStatusChip");
    if (status) status.innerHTML = `<i class="live-pip"></i> ${closed ? "CLOSED" : "LIVE"}`;
    const headingTop = $("#dropHeadingTop");
    const headingBottom = $("#dropHeadingBottom");
    if (headingTop) headingTop.textContent = drop.headlineTop || "THE FRAME";
    if (headingBottom) headingBottom.textContent = drop.headlineBottom || "IS YOURS.";
    const description = $("#dropDescription");
    if (description) description.textContent = drop.description || "";
    const cta = $("#dropCtaText");
    if (cta) cta.textContent = closed ? (drop.claimed >= 100 ? "CRATE GONE" : "DROP CLOSED") : drop.cta || "UNLOCK DEAL";
    const unlock = $("#unlockDealBtn");
    if (unlock) {
      unlock.disabled = closed;
      unlock.setAttribute("aria-disabled", String(closed));
    }
    const code = $("#dropCode");
    if (code) code.textContent = `CRATE // ${drop.code || "NG-5090"}`;
    const edition = $("#dropEdition");
    if (edition) edition.textContent = drop.edition || "NEBULA SERIES // 001";
    const productName = $("#dropProductName");
    if (productName) {
      const parts = String(drop.productShort || "RTX 5090 NEBULA").split(" ");
      const last = parts.length > 1 ? parts.pop() : "";
      productName.innerHTML = `${esc(parts.join(" "))}${last ? ` <span>${esc(last)}</span>` : ""}`;
    }
    const compare = $("#dropCompare");
    if (compare) compare.textContent = money0.format(drop.compareAt || 0);
    const price = $("#dropPrice");
    if (price) price.textContent = money0.format(drop.price || 0);
    const save = $("#dropSave");
    if (save) save.textContent = `SAVE ${money0.format(Math.max(0, (drop.compareAt || 0) - (drop.price || 0)))}`;
    const claimed = $("#dropClaimed");
    if (claimed) claimed.textContent = `${Math.round(drop.claimed)}%`;
    const remaining = $("#dropRemaining");
    if (remaining) remaining.textContent = `${Math.round(drop.remainingPct)}%`;
    const fill = $("#dropProgressFill");
    if (fill) fill.style.width = `${clamp(drop.claimed, 0, 100)}%`;
    const viewers = $("#dropViewers");
    if (viewers) viewers.textContent = String(drop.viewers || 0);
    const banner = $(".drop-banner");
    if (banner) banner.classList.toggle("is-closed", closed);
  }

  function updateWishlistButton(productId) {
    $$(`[data-wish="${productId}"]`).forEach((button) => {
      const liked = state.wishlist.has(productId);
      button.classList.toggle("is-liked", liked);
      button.setAttribute("aria-pressed", String(liked));
      button.setAttribute(
        "aria-label",
        `${liked ? "Remove" : "Add"} ${findProduct(productId)?.name || "item"} ${liked ? "from" : "to"} wishlist`
      );
    });
  }

  function toggleWishlist(productId, button) {
    if (state.wishlist.has(productId)) {
      state.wishlist.delete(productId);
      toast("Removed from saved loadouts", "default", "i-heart");
    } else {
      state.wishlist.add(productId);
      toast("Saved to your wishlist", "pink", "i-heart");
      floatingHeart(button);
      pixelBurst(button, ["#ff007a", "#ff5fa2", "#a855f7"]);
    }
    stores.set("hx_wishlist_v1", Array.from(state.wishlist));
    updateWishlistButton(productId);
    button?.closest(".product-card")?.classList.add("is-wish-popped");
    window.setTimeout(() => button?.closest(".product-card")?.classList.remove("is-wish-popped"), 520);
    Sound.select();
  }

  /* ------------------------------------------------------------------------
     Product quick view
     ------------------------------------------------------------------------ */
  function openProductModal(product) {
    if (!product) return;
    state.modalProductId = product.id;
    state.modalQty = 1;
    const categoryCode = String(D.products.indexOf(product) + 1).padStart(3, "0");
    $("#productModalArt").innerHTML = Art.artMarkup(product.art, product.accent, product.accent2);
    $("#productModalCategory").textContent = `${product.category.toUpperCase()} // NG-${categoryCode}`;
    $("#productModalTitle").textContent = product.name;
    $("#productModalRating").innerHTML = `${icon(ICONS.star)} ${product.rating.toFixed(1)} <span>${"★".repeat(Math.round(product.rating))} · ${product.reviews} verified reviews</span>`;
    $("#productModalDesc").textContent = product.description;
    $("#productModalSpecs").innerHTML = product.specs
      .map((spec) => `<span class="spec-pill">${esc(spec)}</span>`)
      .join("");
    $("#productModalStock").innerHTML = `<i></i> ${esc(product.stockLabel)} · SHIPS NEXT BUSINESS DAY`;
    $("#productModalWas").textContent = product.was ? money0.format(product.was) : "";
    $("#productModalPrice").textContent = money0.format(product.price);
    $("#productModalSave").textContent = product.was ? `SAVE ${money0.format(product.was - product.price)}` : "";
    $("#modalQty").textContent = "1";
    openOverlay("product");
  }

  function addModalProduct() {
    const product = findProduct(state.modalProductId);
    if (!product) return;
    addToCart(product.id, state.modalQty, { celebrate: true });
    closeOverlay("product");
  }

  /* ------------------------------------------------------------------------
     Cart
     ------------------------------------------------------------------------ */
  function cartCount() {
    return state.cart.reduce((total, item) => total + item.qty, 0);
  }

  function getCartDisplay(item) {
    if (item.custom) return item.custom;
    const product = findProduct(item.productId);
    if (!product) return null;
    return {
      name: product.name,
      brand: product.brand,
      price: product.price,
      was: product.was,
      specs: product.specs,
      art: product.art,
      accent: product.accent,
      accent2: product.accent2,
      category: product.category,
      productId: product.id,
      isDrop: product.id === D.dropProduct.id,
    };
  }

  function getCartTotals() {
    const subtotal = state.cart.reduce((sum, item) => {
      const display = getCartDisplay(item);
      return sum + (display ? display.price * item.qty : 0);
    }, 0);
    const discount = state.promo ? round2(subtotal * state.promo.rate) : 0;
    const discounted = Math.max(0, subtotal - discount);
    const freeThreshold = Number(state.settings?.freeShippingThreshold) || 99;
    const baseShipping = Number(state.settings?.standardShipping);
    const shipping = state.cart.length === 0 || discounted >= freeThreshold ? 0 : Number.isFinite(baseShipping) ? baseShipping : 12;
    return {
      subtotal: round2(subtotal),
      discount,
      discounted: round2(discounted),
      shipping: round2(shipping),
      total: round2(discounted + shipping),
    };
  }

  function cartItemHTML(item) {
    const display = getCartDisplay(item);
    if (!display) return "";
    const linePrice = display.price * item.qty;
    return `<div class="cart-item" data-cart-key="${esc(item.key)}">
      <div class="cart-item__art">${Art.artMarkup(display.art, display.accent, display.accent2)}</div>
      <div class="cart-item__info">
        <div class="cart-item__meta"><span>${esc(display.brand)}</span><span>${display.isDrop ? "DROP EXCLUSIVE" : esc(display.category || "LOADOUT")}</span></div>
        <strong class="cart-item__name">${esc(display.name)}</strong>
        <span class="cart-item__specs">${esc((display.specs || []).join(" · "))}</span>
        <div class="cart-item__bottom">
          <div class="qty-control" aria-label="Quantity controls for ${esc(display.name)}">
            <button type="button" data-cart-dec="${esc(item.key)}" aria-label="Decrease quantity">${icon(ICONS.minus)}</button>
            <span>${item.qty}</span>
            <button type="button" data-cart-inc="${esc(item.key)}" aria-label="Increase quantity">${icon(ICONS.plus)}</button>
          </div>
          <span class="cart-item__price">${money2.format(linePrice)}</span>
          <button class="cart-item__remove" type="button" data-cart-remove="${esc(item.key)}" aria-label="Remove ${esc(display.name)}">${icon(ICONS.trash)}</button>
        </div>
      </div>
    </div>`;
  }

  function renderCart() {
    const container = $("#cartItems");
    const empty = $("#cartEmpty");
    const summary = $("#cartSummary");
    if (!container) return;
    const hasItems = state.cart.length > 0;
    if (hasItems) {
      container.innerHTML = state.cart.map(cartItemHTML).join("");
      container.hidden = false;
      if (empty) empty.hidden = true;
      if (summary) summary.hidden = false;
    } else {
      container.innerHTML = "";
      container.hidden = true;
      if (empty) empty.hidden = false;
      if (summary) summary.hidden = true;
    }

    const totals = getCartTotals();
    const count = cartCount();
    const badge = $("#cartCount");
    if (badge) {
      badge.textContent = String(count);
      badge.classList.remove("is-hot");
      if (count > 0) {
        void badge.offsetWidth;
        badge.classList.add("is-hot");
      }
    }
    const navTotal = $("#cartTotalNav");
    if (navTotal) navTotal.textContent = money2.format(totals.total);
    const trigger = $("#cartTrigger");
    if (trigger) trigger.setAttribute("aria-label", `Open cart, ${count} item${count === 1 ? "" : "s"}`);

    const subtotal = $("#cartSubtotal");
    const discount = $("#cartDiscount");
    const discountLine = $("#discountLine");
    const promoTag = $("#promoTag");
    const shipping = $("#cartShipping");
    const grand = $("#cartGrandTotal");
    if (subtotal) subtotal.textContent = money2.format(totals.subtotal);
    if (discount) discount.textContent = `−${money2.format(totals.discount)}`;
    if (discountLine) discountLine.hidden = !state.promo;
    if (promoTag) promoTag.textContent = state.promo ? `· ${state.promo.code}` : "";
    if (shipping) shipping.textContent = totals.shipping === 0 ? (hasItems ? "FREE" : "—") : money2.format(totals.shipping);
    if (grand) grand.textContent = money2.format(totals.total);

    const freeThreshold = Number(state.settings?.freeShippingThreshold) || 99;
    const remaining = Math.max(0, freeThreshold - totals.subtotal);
    const fill = $("#shippingFill");
    const message = $("#shippingMessage");
    if (fill) fill.style.width = `${clamp((totals.subtotal / freeThreshold) * 100, 0, 100)}%`;
    if (message) {
      if (!hasItems) {
        message.innerHTML = `<b>${money2.format(freeThreshold)}</b> from free express shipping`;
      } else if (remaining > 0) {
        message.innerHTML = `You're <b>${money2.format(remaining)}</b> from free express shipping`;
      } else {
        message.innerHTML = `FREE EXPRESS SHIPPING ${icon(ICONS.check)}`;
      }
    }

    const checkout = $("#checkoutBtn");
    if (checkout) checkout.disabled = !hasItems || state.checkoutBusy;
    stores.set("hx_cart_v1", state.cart);
  }

  function addToCart(productId, qty = 1, options = {}) {
    const product = findProduct(productId);
    if (!product) return;
    if (Number(product.stock) <= 0) {
      toast(`${product.name} is sold out`, "default", "i-alert");
      Sound.error();
      return;
    }
    const key = `p:${product.id}`;
    const existing = state.cart.find((item) => item.key === key);
    const safeQty = clamp(Number(qty) || 1, 1, 9);
    const maxStock = Number.isFinite(Number(product.stock)) ? Math.max(1, Number(product.stock)) : 9;
    if (existing) {
      const next = Math.min(9, maxStock, existing.qty + safeQty);
      if (next === existing.qty) {
        toast(`Only ${maxStock} unit${maxStock === 1 ? "" : "s"} available`, "default", "i-alert");
        return;
      }
      existing.qty = next;
    } else {
      state.cart.push({
        key,
        productId: product.id,
        qty: Math.min(safeQty, maxStock),
      });
    }
    renderCart();
    Sound.success();
    if (options.sourceEl) {
      const button = options.sourceEl;
      const original = button.innerHTML;
      button.classList.add("is-added");
      button.innerHTML = `${icon(ICONS.check)}<span class="add-btn__text">DEPLOYED</span>`;
      pixelBurst(button, ["#00f0ff", "#00ff66", "#ff007a"]);
      window.setTimeout(() => {
        button.classList.remove("is-added");
        button.innerHTML = original;
      }, 1500);
    }
    toast(`${product.name} added to your loadout`, "success", "i-cart");
    if (options.celebrate) {
      pixelBurst($("#cartTrigger") || document.body, ["#00f0ff", "#00ff66", "#ff007a"]);
    }
  }

  function addBuildToCart() {
    const calc = calculateBuild();
    if (calc.errors.length > 0) {
      toast("Resolve compatibility errors before deploying this rig", "default", "i-alert");
      Sound.error();
      $("#compatBlock")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (calc.warnings.length > 0) {
      toast("Power headroom warning — choose a stronger PSU before deployment", "default", "i-alert");
      Sound.error();
      $("#powerNote")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const signature = D.builderCategories
      .map((category) => state.build[category.id])
      .join("|");
    const key = `rig:${signature}:${state.resolution}`;
    const existing = state.cart.find((item) => item.key === key);
    if (existing) {
      existing.qty = Math.min(9, existing.qty + 1);
    } else {
      const name = `${calc.codename.split("//")[0].trim()} Custom Rig`;
      state.cart.push({
        key,
        qty: 1,
        custom: {
          name,
          brand: "NEO FORGE",
          price: calc.total,
          specs: [
            calc.parts.gpu ? calc.parts.gpu.name : "GPU",
            calc.parts.cpu ? calc.parts.cpu.name : "CPU",
            `${state.resolution === 2160 ? "4K" : state.resolution + "p"} READY`,
          ],
          art: "gpuNebula",
          accent: "#00ff66",
          accent2: "#00f0ff",
          category: "CUSTOM RIG",
          build: { ...state.build },
        },
      });
    }
    renderCart();
    Sound.success();
    pixelBurst($("#addRigBtn"), ["#00ff66", "#00f0ff", "#a855f7"]);
    toast("Entire rig added to your arsenal", "success", "i-cpu");
    window.setTimeout(() => openOverlay("cart"), 350);
  }

  function updateCartQuantity(key, delta) {
    const item = state.cart.find((entry) => entry.key === key);
    if (!item) return;
    item.qty = clamp(item.qty + delta, 1, 9);
    if (item.qty <= 0) {
      state.cart = state.cart.filter((entry) => entry.key !== key);
    }
    renderCart();
    Sound.click();
  }

  function removeCartItem(key) {
    const item = state.cart.find((entry) => entry.key === key);
    state.cart = state.cart.filter((entry) => entry.key !== key);
    renderCart();
    toast("Removed from arsenal", "default", "i-trash");
    Sound.close();
  }

  function applyPromo(code) {
    const normalized = String(code || "").trim().toUpperCase();
    const promo = D.promoCodes[normalized];
    const message = $("#promoMessage");
    if (!normalized) {
      if (message) {
        message.textContent = "Enter a loot code to apply.";
        message.classList.add("is-error");
      }
      return;
    }
    if (!promo) {
      state.promo = null;
      if (message) {
        message.textContent = "CODE INVALID // check your transmission.";
        message.classList.add("is-error");
      }
      renderCart();
      Sound.error();
      return;
    }
    state.promo = {
      code: normalized,
      rate: promo.rate,
      label: promo.label,
    };
    if (message) {
      message.textContent = `${promo.label} ACCEPTED — ${Math.round(promo.rate * 100)}% removed from subtotal.`;
      message.classList.remove("is-error");
    }
    const button = $("#applyPromo");
    if (button) button.textContent = "APPLIED";
    renderCart();
    Sound.success();
    toast(`${Math.round(promo.rate * 100)}% loot applied`, "success", "i-bolt");
  }

  function checkout() {
    if (state.checkoutBusy || state.cart.length === 0) return;
    state.checkoutBusy = true;
    const button = $("#checkoutBtn");
    if (button) {
      button.innerHTML = `<span>AUTHORIZING…</span>${icon(ICONS.lock)}`;
      button.disabled = true;
    }
    Sound.success();
    window.setTimeout(() => {
      const totals = getCartTotals();
      const orderItems = state.cart
        .map((item) => {
          const display = getCartDisplay(item);
          if (!display) return null;
          return {
            productId: display.productId || null,
            name: display.name,
            brand: display.brand,
            art: display.art,
            accent: display.accent,
            accent2: display.accent2,
            specs: display.specs || [],
            price: display.price,
            qty: item.qty,
          };
        })
        .filter(Boolean);
      const email = state.user?.email || "guest@neogaming.gg";
      const customerName =
        state.user?.name ||
        email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
      let orderRef = `NG-${Math.floor(100000 + Math.random() * 900000)}`;
      if (StoreData) {
        const order = StoreData.addOrder({
          id: orderRef,
          customer: { name: customerName, email },
          items: orderItems,
          subtotal: totals.subtotal,
          discount: totals.discount,
          shipping: totals.shipping,
          total: totals.total,
          promo: state.promo?.code || null,
          status: "Processing",
          payment: "Card // simulated",
          source: "Storefront",
          createdAt: new Date().toISOString(),
        });
        orderRef = order.id;
        const products = StoreData.getProducts(false);
        orderItems.forEach((item) => {
          if (!item.productId) return;
          const product = products.find((entry) => entry.id === item.productId);
          if (product) product.stock = Math.max(0, Number(product.stock) - item.qty);
        });
        StoreData.saveProducts(products);
        D.products = StoreData.getProducts(true);
        productMap.clear();
        D.products.forEach((product) => productMap.set(product.id, product));
        productMap.set(D.dropProduct.id, D.dropProduct);
      }
      const orderEl = $("#orderRef");
      if (orderEl) orderEl.textContent = orderRef;
      closeOverlay("cart", false);
      state.cart = [];
      state.promo = null;
      state.checkoutBusy = false;
      const promoMessage = $("#promoMessage");
      if (promoMessage) {
        promoMessage.textContent = "";
        promoMessage.classList.remove("is-error");
      }
      const apply = $("#applyPromo");
      if (apply) apply.textContent = "APPLY";
      const input = $("#promoInput");
      if (input) input.value = "";
      renderCart();
      renderProducts();
      updateCatalogMeta();
      if (button) {
        button.innerHTML = `<span>SECURE CHECKOUT</span>${icon(ICONS.lock)}`;
        button.disabled = false;
      }
      openOverlay("success");
      pixelBurst($("#cartTrigger"), ["#00ff66", "#00f0ff", "#ff007a"]);
      Sound.success();
    }, 1100);
  }

  /* ------------------------------------------------------------------------
     Search
     ------------------------------------------------------------------------ */
  function allSearchableProducts() {
    return [D.dropProduct, ...D.products];
  }

  function matchesSearch(product, query) {
    const haystack = `${product.name} ${product.brand} ${product.category} ${product.specs.join(" ")} ${product.keywords || ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  }

  function getSearchResults(query) {
    const trimmed = query.trim();
    if (!trimmed) {
      return [D.products[0], D.products[4], D.products[2], D.products[6]];
    }
    return allSearchableProducts()
      .filter((product) => matchesSearch(product, trimmed))
      .sort((a, b) => {
        const aName = a.name.toLowerCase().includes(trimmed.toLowerCase()) ? 0 : 1;
        const bName = b.name.toLowerCase().includes(trimmed.toLowerCase()) ? 0 : 1;
        return aName - bName || (b.rating || 0) - (a.rating || 0);
      })
      .slice(0, 7);
  }

  function renderSearch(query) {
    const results = $("#searchResults");
    if (!results) return;
    const items = getSearchResults(query);
    state.searchItems = items;
    state.searchIndex = -1;
    if (!items.length) {
      results.innerHTML = `<div class="search-empty">NO SIGNAL FOUND FOR "${esc(query)}"<br>Try “RTX 5090”, “OLED”, “PS5” or “Razer”.</div>`;
      return;
    }
    const label = query.trim() ? `${items.length} MATCH${items.length === 1 ? "" : "ES"} // INSTANT AUTOCOMPLETE` : "TRENDING IN THE ARMORY // TOP PICKS";
    results.innerHTML =
      `<div class="mono-label" style="padding:7px 8px 3px">${esc(label)}</div>` +
      items
        .map(
          (product, index) => `<button class="search-result" type="button" role="option" aria-selected="false" data-search-index="${index}" data-search-id="${esc(product.id)}">
            <span class="search-result__art">${Art.artMarkup(product.art, product.accent, product.accent2)}</span>
            <span class="search-result__copy">
              <strong>${esc(product.name)}</strong>
              <small>${esc(product.brand)} // ${esc(product.category)} // ${esc(product.specs[0] || "")}</small>
            </span>
            <span class="search-result__price">${money0.format(product.price)}</span>
            ${icon(ICONS.arrow, "search-result__arrow")}
          </button>`
        )
        .join("");
  }

  function openSearch(prefill = "") {
    const input = $("#searchInput");
    if (input) {
      input.value = prefill;
      renderSearch(prefill);
    }
    openOverlay("search");
    window.setTimeout(() => {
      input?.focus();
      input?.select();
    }, 160);
  }

  function openSearchProduct(product) {
    if (!product) return;
    closeOverlay("search", false);
    window.setTimeout(() => {
      if (product.id === D.dropProduct.id) {
        openInfo(
          "NEO // CRATE EXCLUSIVE",
          "NEBULA RTX 5090",
          `<p>The Nebula Edition is a hand-built RTX 5090 with a custom hardline loop, aurora coolant, and a one-of-one shroud. Only five crates exist.</p>
          <div class="spec-pills">${D.dropProduct.specs.map((spec) => `<span class="spec-pill">${esc(spec)}</span>`).join("")}</div>
          <p style="margin-top:16px"><strong>${money0.format(D.dropProduct.price)}</strong> · ${esc(D.dropProduct.stockLabel)}</p>
          <button class="btn btn--pink btn--full" type="button" data-add-drop>UNLOCK THIS CRATE ${icon(ICONS.arrow)}</button>`
        );
      } else {
        openProductModal(product);
      }
    }, 180);
  }

  function moveSearchFocus(direction) {
    if (!state.searchItems.length) return;
    state.searchIndex = (state.searchIndex + direction + state.searchItems.length) % state.searchItems.length;
    $$(".search-result", $("#searchResults")).forEach((result, index) => {
      result.classList.toggle("is-focused", index === state.searchIndex);
      result.setAttribute("aria-selected", String(index === state.searchIndex));
      if (index === state.searchIndex) result.scrollIntoView({ block: "nearest" });
    });
  }

  /* ------------------------------------------------------------------------
     Rig builder — calculation engine
     ------------------------------------------------------------------------ */
  function selectedParts() {
    return Object.fromEntries(
      D.builderCategories.map((category) => [category.id, getPart(category.id, state.build[category.id])])
    );
  }

  function requiredSelectedCount() {
    return D.builderCategories.filter(
      (category) => category.required && getPart(category.id, state.build[category.id])
    ).length;
  }

  function fpsFor(gameId, resolution) {
    const cpu = getPart("cpu", state.build.cpu);
    const gpu = getPart("gpu", state.build.gpu);
    const game = D.games[gameId];
    if (!cpu || !gpu || !game) return null;
    const res = Number(resolution);
    let gpuWeight = game.gpuWeight;
    if (res === 2160) gpuWeight += 0.13;
    if (res === 1080) gpuWeight -= 0.08;
    gpuWeight = clamp(gpuWeight, 0.15, 0.92);
    const weighted = gpuWeight * (gpu.score / 100) + (1 - gpuWeight) * (cpu.score / 100);
    const factor = 0.18 + 0.82 * weighted;
    return Math.max(1, Math.round(game.base[res] * factor));
  }

  function fpsGrade(fps) {
    if (fps >= 144) return { label: "ELITE", className: "is-elite", color: "#00ff66" };
    if (fps >= 90) return { label: "HIGH", className: "is-mid", color: "#a855f7" };
    if (fps >= 60) return { label: "PLAYABLE", className: "is-mid", color: "#a855f7" };
    return { label: "LIMITED", className: "is-low", color: "#ffb020" };
  }

  function calculateBuild(options = {}) {
    const parts = selectedParts();
    const errors = [];
    const warnings = [];
    const cpu = parts.cpu;
    const cooler = parts.cooler;
    const motherboard = parts.motherboard;
    const memory = parts.memory;
    const gpu = parts.gpu;
    const psu = parts.psu;
    const pcCase = parts.case;
    const addons = parts.addons;

    if (cpu && motherboard && cpu.socket !== motherboard.socket) {
      errors.push({
        type: "error",
        text: `Socket conflict: ${cpu.name} is ${cpu.socket}, board is ${motherboard.socket}.`,
      });
    }
    if (cpu && cooler && !cooler.sockets.includes(cpu.socket)) {
      errors.push({
        type: "error",
        text: `Cooler mounting kit does not support ${cpu.socket}.`,
      });
    }
    if (memory && motherboard && memory.type !== motherboard.ramType) {
      errors.push({
        type: "error",
        text: `Memory mismatch: ${memory.type} kit selected, board requires ${motherboard.ramType}.`,
      });
    }
    if (motherboard && pcCase && !pcCase.formFactors.includes(motherboard.formFactor)) {
      errors.push({
        type: "error",
        text: `${motherboard.formFactor} board will not fit the ${pcCase.name}.`,
      });
    }
    if (gpu && pcCase && gpu.length > pcCase.maxGpu) {
      errors.push({
        type: "error",
        text: `Clearance: ${gpu.name} is ${gpu.length}mm, case supports ${pcCase.maxGpu}mm.`,
      });
    }
    if (cooler && pcCase) {
      if (cooler.type === "AIO" && !pcCase.radiators.includes(cooler.radiator)) {
        errors.push({
          type: "error",
          text: `${cooler.radiator}mm radiator not supported by this case.`,
        });
      }
      if (cooler.type === "Air" && cooler.height > pcCase.maxCoolerHeight) {
        errors.push({
          type: "error",
          text: `Cooler height ${cooler.height}mm exceeds case limit of ${pcCase.maxCoolerHeight}mm.`,
        });
      }
    }

    const baseDraw =
      (cpu ? cpu.tdp : 0) +
      (gpu ? gpu.tdp : 0) +
      (motherboard ? 60 : 0) +
      (memory ? 10 : 0) +
      (parts.storage ? 8 : 0) +
      (cooler ? (cooler.type === "AIO" ? 20 : 5) : 0) +
      (pcCase ? 15 : 0) +
      (addons && addons.tdp ? addons.tdp : 0);
    const estimatedW = Math.round(baseDraw);
    const recommendedW = estimatedW ? Math.ceil((estimatedW * 1.3) / 50) * 50 : 0;

    if (psu && estimatedW > 0) {
      if (psu.wattage < estimatedW) {
        errors.push({
          type: "error",
          text: `PSU undersized: ${psu.wattage}W supply vs ${estimatedW}W estimated draw.`,
        });
      } else if (psu.wattage < recommendedW) {
        warnings.push({
          type: "warning",
          text: `Tight power headroom: ${psu.wattage}W supply, ${recommendedW}W recommended.`,
        });
      }
    }

    const requiredCount = requiredSelectedCount();
    const totalRequired = D.builderCategories.filter((category) => category.required).length;
    const complete = requiredCount === totalRequired;
    const subtotal = Object.values(parts).reduce((sum, part) => sum + (part ? part.price : 0), 0);
    const discount = round2(subtotal * 0.08);
    const total = round2(subtotal - discount);
    const selectedCount = Object.values(parts).filter((part) => part && part.price >= 0 && part.id !== "addon-none").length;

    let compatLabel;
    let score;
    let status = "ok";
    if (!complete) {
      status = "incomplete";
      compatLabel = `${requiredCount}/${totalRequired} SLOTS READY`;
      score = Math.round((requiredCount / totalRequired) * 55);
    } else if (errors.length) {
      status = "error";
      compatLabel = `${errors.length} COMPATIBILITY ${errors.length === 1 ? "ERROR" : "ERRORS"}`;
      score = Math.max(20, 100 - errors.length * 24 - warnings.length * 8);
    } else if (warnings.length) {
      status = "warning";
      compatLabel = `${warnings.length} POWER WARNING`;
      score = 86;
    } else {
      compatLabel = "100% COMPATIBLE";
      score = 100;
    }

    const messages = [];
    if (!complete) {
      messages.push({
        type: "warning",
        text: `Awaiting ${totalRequired - requiredCount} more component${totalRequired - requiredCount === 1 ? "" : "s"} for full validation.`,
      });
    }
    errors.slice(0, 3).forEach((entry) => messages.push(entry));
    warnings.slice(0, 2).forEach((entry) => messages.push(entry));
    if (!errors.length && !warnings.length && complete) {
      messages.push({
        type: "ok",
        text: "Sockets, memory, clearance and power validated.",
      });
      messages.push({
        type: "ok",
        text: "Forge bundle pricing and thermal profile active.",
      });
    }

    const headroom = psu ? psu.wattage - estimatedW : 0;
    const psuPercent = psu && psu.wattage > 0 ? clamp((estimatedW / psu.wattage) * 100, 0, 100) : 0;
    const thermal = cpu && cooler ? Math.round(clamp(100 - (cpu.tdp / cooler.tdpRating) * 55, 5, 95)) : 0;
    const fps = {};
    Object.keys(D.games).forEach((gameId) => {
      fps[gameId] = fpsFor(gameId, state.resolution);
    });

    const preset = state.activePreset;
    const presetLabel = preset && preset !== "custom" ? D.presets[preset].label : "CUSTOM";
    const resolutionLabel = state.resolution === 2160 ? "4K" : `${state.resolution}P`;
    const codename = `${presetLabel} // ${resolutionLabel}`;

    return {
      parts,
      errors,
      warnings,
      messages,
      estimatedW,
      recommendedW,
      headroom,
      psuPercent,
      thermal,
      subtotal,
      discount,
      total,
      selectedCount,
      requiredCount,
      complete,
      compatLabel,
      score,
      status,
      fps,
      codename,
      resolutionLabel,
    };
  }

  /* ------------------------------------------------------------------------
     Rig builder — rendering
     ------------------------------------------------------------------------ */
  function renderAccordion() {
    const holder = $("#partsAccordion");
    if (!holder) return;
    const query = state.partQuery.trim().toLowerCase();
    const brand = state.partBrand;
    const categories = D.builderCategories.map((category) => {
      const selected = getPart(category.id, state.build[category.id]);
      const all = D.builderParts[category.id] || [];
      let filtered = all.filter((part) => {
        const brandMatch = brand === "All" || part.brand === brand;
        const text = `${part.brand} ${part.name} ${part.spec}`.toLowerCase();
        const queryMatch = !query || text.includes(query);
        return brandMatch && queryMatch;
      });
      if (state.partSort === "price-asc") filtered = filtered.slice().sort((a, b) => a.price - b.price);
      if (state.partSort === "price-desc") filtered = filtered.slice().sort((a, b) => b.price - a.price);
      return { ...category, selected, filtered };
    });
    const visible = categories.filter((category) => {
      if (!query && brand === "All") return true;
      return category.filtered.length > 0;
    });

    if (!visible.length) {
      holder.innerHTML = `<div class="part-options-empty">NO COMPONENTS MATCH THIS QUERY. TRY ANOTHER BRAND OR SPEC.</div>`;
      return;
    }

    holder.innerHTML = visible
      .map((category, index) => {
        const open =
          state.openPartCats.has(category.id) ||
          (query.length > 0 && category.filtered.length > 0) ||
          (brand !== "All" && category.filtered.length > 0);
        const selected = category.selected;
        const selectedCopy = selected
          ? `<span class="check">✓</span>${esc(selected.name)}`
          : "NO COMPONENT SELECTED";
        return `<div class="part-category ${open ? "is-open" : ""}" data-category="${esc(category.id)}">
          <button class="part-category__head" type="button" aria-expanded="${open}" aria-controls="parts-${esc(category.id)}">
            <span class="part-category__num">${String(index + 1).padStart(2, "0")}</span>
            <span class="part-category__icon">${icon(category.icon)}</span>
            <span class="part-category__label">
              <strong>${esc(category.label)}</strong>
              <small class="${selected ? "is-selected" : ""}">${selectedCopy}</small>
            </span>
            <span class="part-category__price">${selected ? money0.format(selected.price) : "—"}</span>
            <span class="part-category__status ${selected ? "" : "is-empty"}">${selected ? "LOCKED" : "EMPTY"}</span>
            <span class="part-category__chev">${icon(ICONS.chevron)}</span>
          </button>
          <div class="part-category__body" id="parts-${esc(category.id)}">
            <div class="part-category__inner">
              <div class="part-options">
                ${category.filtered.length ? category.filtered
                  .map((part) => {
                    const isSelected = selected && selected.id === part.id;
                    return `<button class="part-option ${isSelected ? "is-selected" : ""}" type="button" data-part-cat="${esc(category.id)}" data-part-id="${esc(part.id)}" aria-pressed="${isSelected}">
                      <span class="part-option__icon">${icon(category.icon)}</span>
                      <span class="part-option__info">
                        <span class="part-option__brand">${esc(part.brand)} ${isSelected ? '<span class="check-mark">✓ INSTALLED</span>' : ""}</span>
                        <strong>${esc(part.name)}</strong>
                        <span class="part-option__specs">${esc(part.spec)}</span>
                      </span>
                      <span class="part-option__price">${part.price === 0 ? "INCLUDED" : money0.format(part.price)}<small>${category.id === "addons" ? "OPTIONAL" : "USD"}</small></span>
                    </button>`;
                  })
                  .join("") : `<div class="part-options-empty">NO SIGNAL — ADJUST SEARCH OR BRAND FILTER.</div>`}
              </div>
            </div>
          </div>
        </div>`;
      })
      .join("");

    const count = $("#selectedPartCount");
    if (count) count.textContent = String(requiredSelectedCount());
  }

  function renderHud() {
    const calc = calculateBuild();
    const $id = (id) => document.getElementById(id);

    const codename = $id("buildCodename");
    if (codename) codename.innerHTML = `${esc(calc.codename.split("//")[0].trim())} // <span>${esc(calc.codename.split("//")[1].trim())}</span>`;

    const compatLabel = $id("compatLabel");
    if (compatLabel) compatLabel.textContent = calc.compatLabel;
    const compatBlock = $id("compatBlock");
    if (compatBlock) {
      compatBlock.classList.toggle("has-errors", calc.errors.length > 0);
      compatBlock.classList.toggle("has-warnings", calc.errors.length === 0 && calc.warnings.length > 0);
    }
    const compatBar = $id("compatBar");
    if (compatBar?.firstElementChild) compatBar.firstElementChild.style.width = `${calc.score}%`;
    const compatMessages = $id("compatMessages");
    if (compatMessages) {
      compatMessages.innerHTML = calc.messages
        .map(
          (message) =>
            `<div class="compat-msg ${message.type === "error" ? "is-error" : message.type === "warning" ? "is-warning" : ""}">
              ${icon(message.type === "error" || message.type === "warning" ? ICONS.alert : ICONS.check)}
              <span>${esc(message.text)}</span>
            </div>`
        )
        .join("");
    }

    const powerValue = $id("powerValue");
    if (powerValue) powerValue.textContent = `${calc.estimatedW}W`;
    const powerEstimate = $id("powerEstimate");
    if (powerEstimate) powerEstimate.textContent = `${calc.estimatedW}W`;
    const powerRecommended = $id("powerRecommended");
    if (powerRecommended) powerRecommended.textContent = calc.recommendedW ? `${calc.recommendedW}W` : "—";
    const powerFill = $id("powerFill");
    if (powerFill) {
      powerFill.style.width = `${calc.psuPercent}%`;
      powerFill.style.background =
        calc.psuPercent > 85
          ? "linear-gradient(90deg, #ff8a3d, var(--danger))"
          : "linear-gradient(90deg, var(--green), var(--cyan))";
    }
    const powerNote = $id("powerNote");
    if (powerNote) {
      const psu = calc.parts.psu;
      if (!psu) {
        powerNote.innerHTML = `${icon(ICONS.alert)} Select a PSU to validate headroom`;
        powerNote.className = "hud-note is-warning";
      } else if (psu.wattage < calc.estimatedW) {
        powerNote.innerHTML = `${icon(ICONS.alert)} PSU UNDERSIZED — upgrade immediately`;
        powerNote.className = "hud-note is-error";
      } else if (psu.wattage < calc.recommendedW) {
        powerNote.innerHTML = `${icon(ICONS.alert)} ${psu.wattage}W PSU — low headroom`;
        powerNote.className = "hud-note is-warning";
      } else {
        powerNote.innerHTML = `${icon(ICONS.check)} ${psu.wattage}W PSU — ${calc.headroom}W headroom`;
        powerNote.className = "hud-note";
      }
    }

    const thermalValue = $id("thermalValue");
    const thermalRingValue = $id("thermalRingValue");
    const thermalRing = $id("thermalRing");
    if (thermalValue) thermalValue.textContent = `${calc.thermal}%`;
    if (thermalRingValue) thermalRingValue.textContent = String(calc.thermal);
    if (thermalRing) thermalRing.style.setProperty("--value", calc.thermal);
    const thermalNote = document.querySelector(".thermal-block .hud-note");
    if (thermalNote) {
      const cooler = calc.parts.cooler;
      const cpu = calc.parts.cpu;
      if (!cooler) {
        thermalNote.innerHTML = `${icon(ICONS.alert)} NO COOLER MOUNTED`;
      } else if (cooler.type === "AIO") {
        thermalNote.innerHTML = `${icon(ICONS.check)} AIO ${cooler.radiator}MM ACTIVE`;
      } else {
        thermalNote.innerHTML = `${icon(ICONS.check)} ${cooler.height}MM AIR COOLER`;
      }
      thermalNote.classList.toggle("is-warning", Boolean(cooler && cpu && cooler.tdpRating < cpu.tdp));
    }

    const mainGame = D.games[state.activeGame];
    const mainFps = calc.fps[state.activeGame];
    const fpsMain = $id("fpsMain");
    const fpsGame = $id("fpsGame");
    const fpsGradeEl = $id("fpsGrade");
    const fpsResLabel = $id("fpsResLabel");
    if (fpsMain) {
      fpsMain.textContent = mainFps == null ? "—" : String(mainFps);
      fpsMain.style.color = mainFps == null ? "var(--dim)" : fpsGrade(mainFps).color;
      fpsMain.style.textShadow = mainFps == null ? "none" : `0 0 20px ${fpsGrade(mainFps).color}55`;
    }
    if (fpsGame) fpsGame.textContent = mainGame.label;
    if (fpsResLabel) fpsResLabel.textContent = state.resolution === 2160 ? "4K" : `${state.resolution}P`;
    if (fpsGradeEl) {
      const grade = mainFps == null ? { label: "WAITING", color: "var(--dim)" } : fpsGrade(mainFps);
      fpsGradeEl.textContent = grade.label;
      fpsGradeEl.style.background = grade.color;
      fpsGradeEl.style.color = grade.color === "#ffb020" ? "#1a1200" : "#031015";
    }
    $$(".res-toggle button").forEach((button) => {
      button.classList.toggle("is-active", Number(button.dataset.res) === state.resolution);
    });
    const fpsBars = $id("fpsBars");
    if (fpsBars) {
      const maxScale = state.resolution === 1080 ? 500 : state.resolution === 1440 ? 300 : 160;
      fpsBars.innerHTML = Object.entries(D.games)
        .map(([gameId, game]) => {
          const fps = calc.fps[gameId];
          const grade = fps == null ? { className: "is-low" } : fpsGrade(fps);
          return `<button class="fps-row ${grade.className} ${state.activeGame === gameId ? "is-active" : ""}" type="button" data-game="${gameId}" aria-pressed="${state.activeGame === gameId}">
            <span class="fps-row__label">${esc(game.short)}</span>
            <span class="fps-row__track"><i style="width:${fps == null ? 0 : clamp((fps / maxScale) * 100, 1, 100)}%"></i></span>
            <span class="fps-row__value"><b>${fps == null ? "—" : fps}</b></span>
          </button>`;
        })
        .join("");
    }

    const partCount = $id("partCount");
    if (partCount) partCount.textContent = String(calc.selectedCount);
    const subtotal = $id("subtotalPrice");
    if (subtotal) subtotal.textContent = money0.format(calc.subtotal);
    const discount = $id("discountPrice");
    if (discount) discount.textContent = `−${money0.format(calc.discount)}`;
    const total = $id("totalPrice");
    if (total) total.textContent = money0.format(calc.total);

    const rigCpu = $id("rigCpu");
    const rigGpu = $id("rigGpu");
    const rigRam1 = $id("rigRam1");
    const rigRam2 = $id("rigRam2");
    const rigPsu = $id("rigPsu");
    if (rigCpu) rigCpu.classList.toggle("is-empty", !calc.parts.cpu);
    if (rigGpu) rigGpu.classList.toggle("is-empty", !calc.parts.gpu);
    if (rigRam1) rigRam1.classList.toggle("is-empty", !calc.parts.memory);
    if (rigRam2) rigRam2.classList.toggle("is-empty", !calc.parts.memory);
    if (rigPsu) rigPsu.classList.toggle("is-empty", !calc.parts.psu);
    const gpuLabel = rigGpu?.querySelector("b");
    if (gpuLabel) gpuLabel.textContent = calc.parts.gpu ? calc.parts.gpu.name.replace("GeForce ", "").slice(0, 16) : "EMPTY";
    const psuLabel = rigPsu?.querySelector("b");
    if (psuLabel) psuLabel.textContent = calc.parts.psu ? `${calc.parts.psu.wattage}W` : "EMPTY";

    $$(".preset").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.preset === state.activePreset);
    });

    stores.set("hx_build_v1", {
      selections: state.build,
      resolution: state.resolution,
      preset: state.activePreset,
    });

    return calc;
  }

  function applyPreset(presetKey, announce = true) {
    const preset = D.presets[presetKey];
    if (!preset) return;
    state.build = normalizeSelections(preset.selections);
    state.activePreset = presetKey;
    state.resolution = preset.resolution;
    state.openPartCats = new Set(["cpu"]);
    state.partQuery = "";
    state.partBrand = "All";
    state.partSort = "featured";
    const search = $("#partSearch");
    if (search) search.value = "";
    const brand = $("#brandFilter");
    if (brand) brand.value = "All";
    const sort = $("#partSort");
    if (sort) sort.value = "featured";
    renderAccordion();
    renderHud();
    if (announce) {
      toast(`${preset.label} preset deployed — ${state.resolution === 2160 ? "4K" : state.resolution + "p"} tuned`, "success", "i-bolt");
      Sound.success();
    }
  }

  function resetBuild() {
    applyPreset("apex", false);
    toast("Forge reset to APEX baseline", "default", "i-refresh");
    Sound.select();
  }

  function saveAndShareBuild() {
    const payload = {
      selections: state.build,
      resolution: state.resolution,
    };
    try {
      const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(payload)))));
      const url = `${window.location.origin}${window.location.pathname}?build=${encoded}#builder`;
      window.history.replaceState({}, "", `${window.location.pathname}?build=${encoded}#builder`);
      copyText(url).then(() => {
        toast("Build link copied to clipboard", "success", "i-share");
      });
      stores.set("hx_saved_build_v1", { ...payload, savedAt: Date.now() });
      $("#saveBuildBtn").innerHTML = `${icon(ICONS.check)} LINK COPIED`;
      window.setTimeout(() => {
        const button = $("#saveBuildBtn");
        if (button) button.innerHTML = `${icon(ICONS.share)} SAVE + SHARE`;
      }, 2200);
      Sound.success();
      pixelBurst($("#saveBuildBtn"), ["#00f0ff", "#00ff66", "#a855f7"]);
    } catch (err) {
      toast("Unable to generate share link", "default", "i-alert");
    }
  }

  function exportBuildCsv() {
    const calc = calculateBuild();
    const rows = [["CATEGORY", "COMPONENT", "BRAND", "SPECIFICATION", "PRICE_USD"]];
    D.builderCategories.forEach((category) => {
      const part = calc.parts[category.id];
      if (part) rows.push([category.label, part.name, part.brand, part.spec, part.price.toFixed(2)]);
    });
    rows.push([]);
    rows.push(["", "", "", "SUBTOTAL", calc.subtotal.toFixed(2)]);
    rows.push(["", "", "", "FORGE BUNDLE -8%", `-${calc.discount.toFixed(2)}`]);
    rows.push(["", "", "", "TOTAL", calc.total.toFixed(2)]);
    rows.push(["", "", "", "EST. SYSTEM DRAW", `${calc.estimatedW}W`]);
    rows.push(["", "", "", "RECOMMENDED PSU", `${calc.recommendedW}W`]);
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    downloadFile("neo-gaming-build.csv", csv, "text/csv;charset=utf-8");
    toast("Part list exported as CSV", "success", "i-download");
    Sound.success();
  }

  function initBuilder() {
    renderAccordion();
    renderHud();

    $("#partsAccordion")?.addEventListener("click", (event) => {
      const option = event.target.closest(".part-option");
      if (option) {
        const category = option.dataset.partCat;
        const partId = option.dataset.partId;
        if (!category || !partId) return;
        state.build[category] = partId;
        state.activePreset = detectPreset(state.build);
        state.openPartCats.add(category);
        renderAccordion();
        renderHud();
        $("#buildHud")?.classList.add("hud-flash");
        window.setTimeout(() => $("#buildHud")?.classList.remove("hud-flash"), 500);
        Sound.select();
        return;
      }
      const head = event.target.closest(".part-category__head");
      if (head) {
        const category = head.closest(".part-category")?.dataset.category;
        if (!category) return;
        if (state.openPartCats.has(category)) state.openPartCats.delete(category);
        else state.openPartCats.add(category);
        renderAccordion();
        Sound.click();
      }
    });

    $("#partSearch")?.addEventListener(
      "input",
      debounce((event) => {
        state.partQuery = event.target.value;
        renderAccordion();
      }, 90)
    );

    $("#brandFilter")?.addEventListener("change", (event) => {
      state.partBrand = event.target.value;
      renderAccordion();
      Sound.click();
    });

    $("#partSort")?.addEventListener("change", (event) => {
      state.partSort = event.target.value;
      renderAccordion();
      Sound.click();
    });

    $("#closeTip")?.addEventListener("click", () => {
      $(".builder-tip")?.classList.add("is-dismissed");
      Sound.click();
    });

    $$(".preset").forEach((button) => {
      button.addEventListener("click", () => applyPreset(button.dataset.preset));
    });

    $("#addRigBtn")?.addEventListener("click", addBuildToCart);
    $("#saveBuildBtn")?.addEventListener("click", saveAndShareBuild);
    $("#exportBuildBtn")?.addEventListener("click", exportBuildCsv);
    $("#printBuildBtn")?.addEventListener("click", () => {
      toast("Opening print-ready part list", "default", "i-copy");
      window.setTimeout(() => window.print(), 220);
    });
    $("#resetBuildBtn")?.addEventListener("click", resetBuild);

    $("#buildHud")?.addEventListener("click", (event) => {
      const res = event.target.closest("[data-res]");
      if (res) {
        state.resolution = Number(res.dataset.res);
        state.activePreset = detectPreset(state.build);
        if (state.activePreset !== "custom" && D.presets[state.activePreset].resolution !== state.resolution) {
          state.activePreset = "custom";
        }
        renderHud();
        Sound.select();
        return;
      }
      const game = event.target.closest("[data-game]");
      if (game) {
        state.activeGame = game.dataset.game;
        renderHud();
        Sound.select();
      }
    });

  }

  /* ------------------------------------------------------------------------
     Countdown / loot
     ------------------------------------------------------------------------ */
  function startOfNextDay() {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    if (end.getTime() <= now.getTime()) end.setDate(end.getDate() + 1);
    return end.getTime();
  }

  const managedDropEnd = state.drop && Number(state.drop.endsAt) > 0 ? Number(state.drop.endsAt) : 0;
  let saleEnd = managedDropEnd || startOfNextDay();

  function pad2(number) {
    return String(Math.max(0, number)).padStart(2, "0");
  }

  function updateCountdown() {
    const now = Date.now();
    if (now >= saleEnd && !managedDropEnd) saleEnd = startOfNextDay();
    const diff = Math.max(0, saleEnd - now);
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    const h = $("#cdHours");
    const m = $("#cdMinutes");
    const s = $("#cdSeconds");
    if (h) h.textContent = pad2(hours);
    if (m) m.textContent = pad2(minutes);
    if (s) s.textContent = pad2(seconds);
    updateLootTimer();
  }

  function updateLootTimer() {
    const timer = $("#lootTimer");
    if (!timer) return;
    if (!state.lootUntil) {
      timer.innerHTML = `<span class="status-dot"></span> CRATE READY FOR EXTRACTION`;
      return;
    }
    const remaining = state.lootUntil - Date.now();
    if (remaining <= 0) {
      timer.innerHTML = `<span class="status-dot"></span> NEXT CRATE READY NOW`;
      return;
    }
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    timer.innerHTML = `<span class="status-dot"></span> NEXT CRATE AVAILABLE IN ${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  }

  function syncLootModal() {
    const claimed = state.lootUntil > Date.now();
    const crate = $("#lootCrate");
    const reward = $("#lootReward");
    const button = $("#claimLootBtn");
    const copy = $("#lootCopy");
    if (claimed) {
      if (crate) crate.classList.add("is-opening");
      if (reward) reward.hidden = false;
      if (button) {
        button.disabled = true;
        button.innerHTML = `<span>REWARD SECURED</span>${icon(ICONS.check)}`;
      }
      if (copy) copy.textContent = "Your loot code is live for 24 hours. Apply it in the cart before the crate resets.";
    } else {
      if (crate) crate.classList.remove("is-opening");
      if (reward) reward.hidden = true;
      if (button) {
        button.disabled = false;
        button.innerHTML = `<span>OPEN THE CRATE</span>${icon(ICONS.sparkles)}`;
      }
      if (copy) copy.textContent = "One crate per 24 hours. Inside: a stackable 20% loot code for your next order.";
    }
    updateLootTimer();
  }

  function openLoot() {
    syncLootModal();
    openOverlay("loot");
    Sound.open();
  }

  function claimLoot() {
    if (state.lootUntil > Date.now()) return;
    const crate = $("#lootCrate");
    const button = $("#claimLootBtn");
    const reward = $("#lootReward");
    const copy = $("#lootCopy");
    if (crate) crate.classList.add("is-opening");
    if (button) {
      button.disabled = true;
      button.innerHTML = `<span>DECRYPTING CRATE…</span>${icon(ICONS.sparkles)}`;
    }
    Sound.success();
    window.setTimeout(() => {
      if (reward) reward.hidden = false;
      state.lootUntil = Date.now() + 86400000;
      stores.set("hx_loot_until", state.lootUntil);
      if (button) button.innerHTML = `<span>REWARD SECURED</span>${icon(ICONS.check)}`;
      if (copy) copy.textContent = "Your loot code is live for 24 hours. Apply it in the cart before the crate resets.";
      updateLootTimer();
      copyText("NEO-DAILY-20");
      toast("Loot code copied — 20% off staged for checkout", "pink", "i-sparkles");
      pixelBurst($("#lootCrate"), ["#ff007a", "#00f0ff", "#00ff66", "#a855f7"]);
      Sound.success();
    }, 900);
  }

  /* ------------------------------------------------------------------------
     Info modal content
     ------------------------------------------------------------------------ */
  const infoContent = {
    "Bench check": {
      kicker: "NEO // BENCH LINK",
      title: "TALK TO A REAL OPERATOR",
      body:
        "<p>Tell us the games, the resolution, and the budget. A human operator will assemble a no-nonsense spec sheet within 12 minutes.</p><ul><li>Live compatibility check</li><li>FPS targets at your exact resolution</li><li>No bot scripts. No upsell roulette.</li></ul><p><strong>comms@neogaming.gg</strong> · average reply 3m 42s</p>",
    },
    "Build help": {
      kicker: "NEO // FORGE SUPPORT",
      title: "GET YOUR RIG OVER THE LINE",
      body:
        "<p>Clearance, cabling, BIOS flashback, fan curves — if it can go wrong on a build, our bench team has already fixed it twice today.</p><ul><li>Socket + BIOS compatibility</li><li>Radiator and GPU clearance checks</li><li>Post-build stress testing available</li></ul><p>Use the Rig Forge compatibility HUD for instant validation, or open a live comms channel.</p>",
    },
    "Order tracking": {
      kicker: "NEO // LOGISTICS",
      title: "WHERE IS MY DROP?",
      body:
        "<p>Every order leaves Sector 7 with a tracked, insured dispatch. Next-day cut-off is 14:00 local time.</p><ul><li>Orders under 5kg ship express next day</li><li>Custom rigs ship within 48 hours after burn-in</li><li>Live tracking is emailed at dispatch</li></ul><p>Tracking link missing? Send your order reference to <strong>ops@neogaming.gg</strong>.</p>",
    },
    "Warranty claim": {
      kicker: "NEO // SHIELD PROTOCOL",
      title: "COVER WITHOUT THE RUNAROUND",
      body:
        "<p>All hardware carries a 2-year zero-dead-pixel cover. Custom rigs include labour and return shipping for the first 12 months.</p><ul><li>No pixel lottery — dead pixel means replacement</li><li>Advance swap on selected components</li><li>Free return shipping on DOA units</li></ul><p>Keep your order reference handy and open a channel with the support terminal.</p>",
    },
    Shipping: {
      kicker: "NEO // LOGISTICS",
      title: "SHIPPING & DROPS",
      body:
        "<p>Free express shipping on orders over $99. Orders placed before 14:00 ship the same business day.</p><ul><li>US / UK / EU tracked express lanes</li><li>Custom rigs: 48-hour burn-in before dispatch</li><li>Signature required on orders over $1,500</li></ul><p>Duties and taxes are calculated at checkout for supported regions.</p>",
    },
    Returns: {
      kicker: "NEO // REVERSE PROTOCOL",
      title: "30-DAY RETURNS",
      body:
        "<p>Changed your mind? Return unopened hardware within 30 days for a full refund. Opened components are accepted within 14 days subject to a bench inspection.</p><ul><li>Original packaging required</li><li>Custom-configured rigs are final sale after burn-in</li><li>Return shipping labels issued by support</li></ul>",
    },
    Warranty: {
      kicker: "NEO // SHIELD PROTOCOL",
      title: "2-YEAR COVER",
      body:
        "<p>Every NEO order is covered for two years against manufacturing defects and dead pixels. We do not require a receipt if your order is in our system.</p><ul><li>Zero-dead-pixel guarantee</li><li>Component-level replacement</li><li>Bench diagnostics included</li></ul>",
    },
    Financing: {
      kicker: "NEO // CREDIT LINK",
      title: "SPLIT THE COST",
      body:
        "<p>Finance orders from $499 with 0% APR over six months through our lending partners. Subject to status and region.</p><ul><li>Soft credit check only</li><li>No early repayment penalty</li><li>Instant decision at checkout</li></ul><p>Financing is indicative and not available on flash-drop crates.</p>",
    },
    Contact: {
      kicker: "NEO // COMMS",
      title: "OPEN A CHANNEL",
      body:
        "<p>Operators are online 24/7. Average response time is 3 minutes 42 seconds.</p><ul><li><strong>comms@neogaming.gg</strong> — orders and product advice</li><li><strong>ops@neogaming.gg</strong> — logistics and tracking</li><li><strong>forge@neogaming.gg</strong> — custom builds</li></ul><p>Sector 7 HQ · open by appointment.</p>",
    },
    Story: {
      kicker: "NEO // ORIGIN FILE",
      title: "BORN IN THE VOID",
      body:
        "<p>NEO GAMING started in a two-bay workshop with a thermal camera and a refusal to sell anything we had not benchmarked ourselves.</p><p>Today we ship hand-tested hardware to 48,000+ operators across 31 sectors. Same rule applies: if it bottlenecks, it does not make the drop.</p>",
    },
    Careers: {
      kicker: "NEO // RECRUITMENT",
      title: "JOIN THE RESISTANCE",
      body:
        "<p>We hire builders, bench technicians, and people who can spot a bad fan curve from across the room.</p><ul><li>Rig Builders — Sector 7</li><li>Bench Technicians — Remote / EU</li><li>Product Operations — US</li></ul><p>Send a build log and a short transmission to <strong>humans@neogaming.gg</strong>.</p>",
    },
    Press: {
      kicker: "NEO // MEDIA",
      title: "PRESS KIT",
      body:
        "<p>Logos, product renders, and founder bios are available for accredited media.</p><p>Contact <strong>press@neogaming.gg</strong> with your outlet, deadline and request. We usually respond within one business day.</p>",
    },
    Affiliates: {
      kicker: "NEO // RESISTANCE NETWORK",
      title: "AFFILIATE PROGRAM",
      body:
        "<p>Creators and community operators earn 5–8% on qualified hardware drops, plus early access to review units.</p><ul><li>Dedicated tracking links</li><li>Monthly loot payouts</li><li>Exclusive creator drops</li></ul><p>Apply via <strong>partners@neogaming.gg</strong>.</p>",
    },
    Privacy: {
      kicker: "NEO // DATA DIRECTIVE",
      title: "PRIVACY",
      body:
        "<p>We collect only what is required to dispatch your gear, support your account, and keep the storefront secure. We do not sell personal data.</p><p>This storefront is a demonstration experience. Cart and build data are stored locally in your browser and can be cleared at any time.</p>",
    },
    Terms: {
      kicker: "NEO // TERMS",
      title: "TERMS OF ENGAGEMENT",
      body:
        "<p>This is a fictional storefront built as a design and engineering demonstration. Product names, prices and availability are mock data for demonstration purposes.</p><p>No real transactions are processed. Cart, wishlist, theme and build preferences are stored locally in your browser only.</p>",
    },
    drop: {
      kicker: "NEO // DROP RULES",
      title: "48H LOOT PROTOCOL",
      body:
        "<p>The Nebula crate is live for 48 hours or until all five units are claimed. One crate per operator. Codes stack with member loot but not with other flash drops.</p><ul><li>84% of the allocation is already claimed</li><li>Checkout is first-come, first-served</li><li>All crates are final sale after burn-in</li></ul><p>When the countdown hits zero, the crate closes and will not be restocked.</p>",
    },
  };

  function openInfo(kicker, title, html) {
    const kick = $("#infoKicker");
    const heading = $("#infoTitle");
    const body = $("#infoBody");
    if (kick) kick.textContent = kicker;
    if (heading) heading.textContent = title;
    if (body) body.innerHTML = html;
    openOverlay("info");
    Sound.open();
  }

  function openNamedInfo(key) {
    const content =
      infoContent[key] || {
        kicker: "NEO // TERMINAL",
        title: String(key || "INFORMATION").toUpperCase(),
        body: "<p>This terminal is currently between transmissions. Try another channel.</p>",
      };
    openInfo(content.kicker, content.title, content.body);
  }

  /* ------------------------------------------------------------------------
     Support / footer / newsletter interaction
     ------------------------------------------------------------------------ */
  function initFooter() {
    $("#newsletterForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const emailInput = $("#newsletterEmail");
      const consent = $("#newsletterConsent");
      const message = $("#newsletterMessage");
      const value = emailInput?.value.trim() || "";
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if (!valid) {
        if (message) {
          message.textContent = "TRANSMISSION FAILED // enter a valid operator email.";
          message.classList.add("is-error");
        }
        emailInput?.focus();
        Sound.error();
        return;
      }
      if (consent && !consent.checked) {
        if (message) {
          message.textContent = "TRANSMISSION BLOCKED // consent is required.";
          message.classList.add("is-error");
        }
        Sound.error();
        return;
      }
      const form = $("#newsletterForm");
      form.innerHTML = `
        <div class="newsletter-success">
          <span class="newsletter-success__icon">${icon(ICONS.check)}</span>
          <span class="mono-label">TRANSMISSION RECEIVED</span>
          <h3>YOU'RE ON THE LIST.</h3>
          <p>Dispatch coordinates confirmed for <strong>${esc(value)}</strong>. Watch your inbox for the next drop.</p>
          <div class="newsletter-meta"><span><i class="status-dot"></i> OPERATOR CONNECTED</span><span>ENCRYPTED // AES-256</span></div>
        </div>`;
      stores.set("hx_newsletter_v1", { email: value, at: Date.now() });
      if (StoreData) StoreData.addSubscriber(value);
      const connected = $("#subscriberCount");
      if (connected) {
        const count = 48219 + (StoreData ? StoreData.getSubscribers().length : 0);
        connected.textContent = count.toLocaleString("en-US");
      }
      pixelBurst($(".newsletter-panel") || form, ["#00f0ff", "#00ff66", "#ff007a"]);
      Sound.success();
      toast("Resistance transmission received", "success", "i-mail");
    });

    $$("[data-legal]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        openNamedInfo(link.dataset.legal);
      });
    });

    $$(".support-card").forEach((card) => {
      card.addEventListener("click", () => openNamedInfo(card.dataset.support));
    });

    $$(".social").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const network = link.getAttribute("aria-label") || "social";
        toast(`${network} channel is available in the Resistance app`, "default", "i-share");
        link.classList.add("is-active");
        window.setTimeout(() => link.classList.remove("is-active"), 900);
        Sound.select();
      });
    });

    $("#backTop")?.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
      Sound.click();
    });

    $("#dropRulesBtn")?.addEventListener("click", () => openNamedInfo("drop"));
  }

  /* ------------------------------------------------------------------------
     Profile portal
     ------------------------------------------------------------------------ */
  function setPortalMode(mode) {
    $$("[data-portal]").forEach((tab) => {
      const active = tab.dataset.portal === mode;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    const label = document.querySelector("#profileModal .profile-modal__form > .mono-label");
    const submit = $("#loginForm button[type=submit]");
    if (submit) {
      submit.innerHTML =
        mode === "register"
          ? `<span>CREATE OPERATOR ID</span>${icon(ICONS.arrow)}`
          : `<span>ENTER THE RESISTANCE</span>${icon(ICONS.arrow)}`;
    }
    if (label) {
      label.textContent = mode === "register" ? "ENLISTMENT TERMINAL // NEW OPERATOR" : "ACCESS TERMINAL // SECURE";
    }
    const error = $("#loginError");
    if (error) error.textContent = "";
  }

  function initProfile() {
    const form = $("#loginForm");
    const reveal = $(".field-reveal");
    $$("[data-portal]").forEach((tab) => {
      tab.addEventListener("click", () => setPortalMode(tab.dataset.portal));
    });
    reveal?.addEventListener("click", () => {
      const input = $("#loginPassword");
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      reveal.textContent = show ? "HIDE" : "SHOW";
      Sound.click();
    });
    $$("[data-portal-social]").forEach((button) => {
      button.addEventListener("click", () => {
        const provider = button.dataset.portalSocial;
        state.user = { email: `operator@${provider.toLowerCase()}.gg`, provider };
        stores.set("hx_user_v1", state.user);
        closeOverlay("profile");
        toast(`${provider} identity linked — welcome back, operator`, "success", "i-user");
        Sound.success();
      });
    });
    $$("[data-forgot]").forEach((button) => {
      button.addEventListener("click", () => {
        closeOverlay("profile");
        openInfo(
          "NEO // RECOVERY UPLINK",
          "PASSCODE RECOVERY",
          "<p>Recovery is disabled on this demonstration terminal. In production, a single-use encrypted reset link would be sent to your operator email.</p><p>Try any email + a passcode of four or more characters to enter the portal.</p>"
        );
      });
    });

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = $("#loginEmail");
      const password = $("#loginPassword");
      const error = $("#loginError");
      const submit = form.querySelector("button[type=submit]");
      const emailValue = email?.value.trim() || "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
        if (error) error.textContent = "INVALID EMAIL // check the transmission address.";
        email?.focus();
        Sound.error();
        return;
      }
      if (!password || password.value.length < 4) {
        if (error) error.textContent = "PASSCODE TOO SHORT // minimum 4 characters.";
        password?.focus();
        Sound.error();
        return;
      }
      if (error) error.textContent = "";
      if (submit) {
        submit.disabled = true;
        submit.innerHTML = `<span>VERIFYING…</span>${icon(ICONS.lock)}`;
      }
      window.setTimeout(() => {
        state.user = { email: emailValue, provider: "email", level: 7 };
        stores.set("hx_user_v1", state.user);
        closeOverlay("profile");
        toast("Identity verified. Welcome to the Resistance.", "success", "i-user");
        pixelBurst($("#profileTrigger"), ["#00f0ff", "#00ff66", "#a855f7"]);
        if (submit) {
          submit.disabled = false;
          submit.innerHTML = `<span>ENTER THE RESISTANCE</span>${icon(ICONS.arrow)}`;
        }
        password.value = "";
        Sound.success();
      }, 900);
    });
  }

  /* ------------------------------------------------------------------------
     Global events and init
     ------------------------------------------------------------------------ */
  function initHeader() {
    const header = $("#siteHeader");
    const progress = $("#navProgress");
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const percent = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      if (progress) progress.style.width = `${percent}%`;
      header?.classList.toggle("is-scrolled", window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    $("#profileTrigger")?.addEventListener("click", () => {
      const email = $("#loginEmail");
      if (state.user && email && !email.value) email.value = state.user.email;
      openOverlay("profile");
    });

    $("#cartTrigger")?.addEventListener("click", () => {
      renderCart();
      openOverlay("cart");
    });

    $("#searchTrigger")?.addEventListener("click", () => openSearch());
    $("#mobileSearchTrigger")?.addEventListener("click", () => {
      closeMobileMenu();
      window.setTimeout(() => openSearch(), 260);
    });

    $("#themeToggle")?.addEventListener("click", () => {
      const next = state.theme === "light" ? "dark" : "light";
      applyTheme(next);
      toast(next === "light" ? "RGB LIGHT mode engaged" : "VOID DARK mode engaged", "default", next === "light" ? "i-sun" : "i-moon");
      Sound.select();
    });

    $("#soundToggle")?.addEventListener("click", () => {
      state.sound = !state.sound;
      stores.set("hx_sound_v1", state.sound);
      updateSoundButton();
      if (state.sound) Sound.success();
    });

    $$("[data-scroll]").forEach((link) => {
      link.addEventListener("click", (event) => {
        const target = link.dataset.scroll;
        const element = document.getElementById(target);
        if (!element) return;
        event.preventDefault();
        closeMobileMenu(false);
        element.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
        Sound.click();
      });
    });

    const sections = ["shop", "builder", "drops", "support"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if ("IntersectionObserver" in window) {
      const spy = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            $$(".nav__link").forEach((link) => {
              link.classList.toggle("is-active", link.dataset.scroll === entry.target.id);
            });
          });
        },
        { rootMargin: "-42% 0px -50% 0px", threshold: 0 }
      );
      sections.forEach((section) => spy.observe(section));
    }
  }

  function openMobileMenu() {
    const menu = $("#mobileMenu");
    if (!menu) return;
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    $("#menuToggle")?.setAttribute("aria-expanded", "true");
    syncBodyLock();
    Sound.open();
    window.setTimeout(() => menu.querySelector("a,button")?.focus({ preventScroll: true }), 120);
  }

  function closeMobileMenu(playSound = true) {
    const menu = $("#mobileMenu");
    if (!menu || !menu.classList.contains("is-open")) return;
    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    $("#menuToggle")?.setAttribute("aria-expanded", "false");
    syncBodyLock();
    if (playSound) Sound.close();
  }

  function initMobileMenu() {
    $("#menuToggle")?.addEventListener("click", () => {
      if ($("#mobileMenu")?.classList.contains("is-open")) closeMobileMenu();
      else openMobileMenu();
    });
    $("#mobileClose")?.addEventListener("click", () => closeMobileMenu());
    $$("#mobileMenu a").forEach((link) => link.addEventListener("click", () => closeMobileMenu(false)));
  }

  function initOverlayEvents() {
    document.addEventListener("click", (event) => {
      const closer = event.target.closest("[data-close]");
      if (closer) {
        closeOverlay(closer.dataset.close);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if ($("#mobileMenu")?.classList.contains("is-open")) {
          closeMobileMenu();
          return;
        }
        if (state.activeOverlay) {
          closeOverlay(state.activeOverlay);
          event.preventDefault();
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (state.activeOverlay === "search") closeOverlay("search");
        else openSearch();
      }
      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !/input|textarea|select/i.test(document.activeElement?.tagName || "")
      ) {
        event.preventDefault();
        openSearch();
      }
      if (event.key === "ArrowDown" && state.activeOverlay === "search") {
        event.preventDefault();
        moveSearchFocus(1);
      }
      if (event.key === "ArrowUp" && state.activeOverlay === "search") {
        event.preventDefault();
        moveSearchFocus(-1);
      }
      if (event.key === "Enter" && state.activeOverlay === "search") {
        const input = $("#searchInput");
        if (state.searchItems.length && document.activeElement === input) {
          event.preventDefault();
          openSearchProduct(state.searchItems[state.searchIndex >= 0 ? state.searchIndex : 0]);
        }
      }
      trapFocus(event);
    });
  }

  function initSearch() {
    const input = $("#searchInput");
    input?.addEventListener("input", () => {
      renderSearch(input.value);
    });
    $("#searchSuggest")?.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-query]");
      if (!chip) return;
      input.value = chip.dataset.query;
      renderSearch(chip.dataset.query);
      input.focus();
      Sound.select();
    });
    $("#searchResults")?.addEventListener("click", (event) => {
      const result = event.target.closest("[data-search-id]");
      if (!result) return;
      openSearchProduct(findProduct(result.dataset.searchId));
    });
    $("#searchResults")?.addEventListener("mousemove", (event) => {
      const result = event.target.closest("[data-search-index]");
      if (!result) return;
      const index = Number(result.dataset.searchIndex);
      if (index === state.searchIndex) return;
      state.searchIndex = index;
      $$(".search-result", $("#searchResults")).forEach((item, i) => {
        item.classList.toggle("is-focused", i === index);
        item.setAttribute("aria-selected", String(i === index));
      });
    });
  }

  function initCatalogEvents() {
    $("#productGrid")?.addEventListener("click", (event) => {
      const add = event.target.closest("[data-add]");
      if (add) {
        addToCart(add.dataset.add, 1, { sourceEl: add });
        return;
      }
      const wish = event.target.closest("[data-wish]");
      if (wish) {
        toggleWishlist(wish.dataset.wish, wish);
        return;
      }
      const quick = event.target.closest("[data-quick]");
      if (quick) {
        openProductModal(findProduct(quick.dataset.quick));
      }
    });

    $$(".filter-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        setCategoryFilter(tab.dataset.filter, false);
        Sound.click();
      });
    });

    $("#priceRange")?.addEventListener("input", (event) => {
      state.filters.maxPrice = Number(event.target.value);
      syncRangeFill();
      renderProducts();
    });

    $("#sortSelect")?.addEventListener("change", (event) => {
      state.filters.sort = event.target.value;
      renderProducts();
      Sound.click();
    });

    $("#resetFilters")?.addEventListener("click", resetFilters);

    $("#priceRange")?.addEventListener("change", () => Sound.click());

    $$(".category-card").forEach((card) => {
      card.addEventListener("click", () => {
        const category = card.dataset.category;
        if (!category) return;
        state.filters.category = category;
        state.filters.maxPrice = 3500;
        const range = $("#priceRange");
        if (range) range.value = "3500";
        syncRangeFill();
        renderProducts();
        $("#shop")?.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
        Sound.select();
        toast(`${category.replace("&amp;", "&")} sector locked`, "default", "i-grid");
      });
    });

    $$("[data-filter-link]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        setCategoryFilter(link.dataset.filterLink.replace("&amp;", "&"), true);
      });
    });

    $("#expandCatalog")?.addEventListener("click", () => {
      openInfo(
        "NEO // FULL CATALOG",
        "REQUEST THE FULL ARMORY",
        "<p>This live drop shows 10 curated loadouts. The full armory contains 164 units across laptops, consoles, components, peripherals and VR.</p><ul><li>Complete part catalog</li><li>Regional stock and drop ETAs</li><li>Custom build consultations</li></ul><p>Open a comms channel with <strong>armory@neogaming.gg</strong> and we will send the current catalog within one hour.</p>"
      );
    });

    $("#emptyShopBtn")?.addEventListener("click", () => {
      closeOverlay("cart", false);
      setCategoryFilter("All", true);
    });
  }

  function initCartEvents() {
    $("#cartItems")?.addEventListener("click", (event) => {
      const inc = event.target.closest("[data-cart-inc]");
      const dec = event.target.closest("[data-cart-dec]");
      const remove = event.target.closest("[data-cart-remove]");
      if (inc) updateCartQuantity(inc.dataset.cartInc, 1);
      if (dec) updateCartQuantity(dec.dataset.cartDec, -1);
      if (remove) removeCartItem(remove.dataset.cartRemove);
    });
    $("#applyPromo")?.addEventListener("click", () => applyPromo($("#promoInput")?.value));
    $("#promoInput")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyPromo(event.target.value);
      }
    });
    $("#checkoutBtn")?.addEventListener("click", checkout);
  }

  function initProductModalEvents() {
    $("#modalQtyMinus")?.addEventListener("click", () => {
      state.modalQty = clamp(state.modalQty - 1, 1, 9);
      $("#modalQty").textContent = String(state.modalQty);
      Sound.click();
    });
    $("#modalQtyPlus")?.addEventListener("click", () => {
      state.modalQty = clamp(state.modalQty + 1, 1, 9);
      $("#modalQty").textContent = String(state.modalQty);
      Sound.click();
    });
    $("#modalAddBtn")?.addEventListener("click", addModalProduct);
  }

  function initDropEvents() {
    $("#unlockDealBtn")?.addEventListener("click", () => {
      addToCart(D.dropProduct.id, 1, { sourceEl: $("#unlockDealBtn"), celebrate: true });
      window.setTimeout(() => openOverlay("cart"), 350);
    });
    $("#dailyLootBtn")?.addEventListener("click", openLoot);
    $("#claimLootBtn")?.addEventListener("click", claimLoot);
    $("#infoBody")?.addEventListener("click", (event) => {
      const addDrop = event.target.closest("[data-add-drop]");
      if (addDrop) {
        closeOverlay("info", false);
        addToCart(D.dropProduct.id, 1, { celebrate: true });
        window.setTimeout(() => openOverlay("cart"), 250);
      }
    });
  }

  function initGlobalClickSound() {
    document.addEventListener(
      "click",
      (event) => {
        if (!state.sound) return;
        const control = event.target.closest("button, a, .category-card, .support-card");
        if (!control) return;
        if (control.id === "soundToggle") return;
        if (control.matches("[data-add], [data-hero-add], [data-add-drop], #addRigBtn, #unlockDealBtn, #checkoutBtn, #claimLootBtn")) return;
        Sound.click();
      },
      { passive: true }
    );
  }

  function initCounters() {
    const counters = $$("[data-count]");
    if (!counters.length) return;
    const animate = (el) => {
      const target = Number(el.dataset.count);
      const decimals = Number(el.dataset.decimals || 0);
      if (!Number.isFinite(target)) return;
      if (prefersReduced) {
        el.textContent = target.toFixed(decimals);
        return;
      }
      const start = performance.now();
      const duration = 1400;
      const tick = (now) => {
        const progress = clamp((now - start) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = (target * eased).toFixed(decimals);
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (!("IntersectionObserver" in window)) {
      counters.forEach(animate);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animate(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((counter) => observer.observe(counter));
  }

  function initReveal() {
    const items = $$("[data-reveal]");
    if (!items.length) return;
    if (prefersReduced || !("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    items.forEach((item) => observer.observe(item));

    $$(
      ".category-card, .product-card, .part-category, .support-card, .newsletter-panel, .armory-toolbar"
    ).forEach((node) => {
      if (node.matches("[data-reveal]")) return;
      node.style.opacity = "0";
      node.style.transform = "translateY(18px)";
      node.style.transition = "opacity .7s cubic-bezier(.22,1,.36,1), transform .7s cubic-bezier(.22,1,.36,1)";
    });
    const cardObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const node = entry.target;
          node.style.opacity = "1";
          node.style.transform = "translateY(0)";
          cardObserver.unobserve(node);
          window.setTimeout(() => {
            node.style.removeProperty("opacity");
            node.style.removeProperty("transform");
            node.style.removeProperty("transition");
          }, 760);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );
    $$(
      ".category-card, .product-card, .part-category, .support-card, .newsletter-panel, .armory-toolbar"
    ).forEach((node) => cardObserver.observe(node));
  }

  function initParticles() {
    const canvas = $("#particleCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles = [];
    let raf = 0;
    let mouse = { x: -1000, y: -1000 };
    let palette = [];

    function refreshColors() {
      palette =
        state.theme === "light"
          ? ["rgba(0, 125, 138,", "rgba(206, 0, 98,", "rgba(0, 135, 68,"]
          : ["rgba(0, 240, 255,", "rgba(255, 0, 122,", "rgba(0, 255, 102,"];
      particles.forEach((p) => {
        p.color = palette[p.colorIndex % palette.length];
      });
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(clamp((width * height) / 36000, 26, 58));
      particles = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        r: Math.random() * 1.4 + 0.4,
        alpha: Math.random() * 0.35 + 0.14,
        colorIndex: index % 3,
        color: palette[index % palette.length],
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          const pull = (150 - dist) / 150;
          p.x += (dx / (dist || 1)) * pull * 0.55;
          p.y += (dy / (dist || 1)) * pull * 0.55;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.fill();
        for (let j = index + 1; j < particles.length; j++) {
          const q = particles[j];
          const lx = p.x - q.x;
          const ly = p.y - q.y;
          const length = Math.sqrt(lx * lx + ly * ly);
          if (length < 95) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `${p.color}${(1 - length / 95) * 0.055})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      });
      raf = requestAnimationFrame(draw);
    }

    refreshColors();
    resize();
    window.addEventListener("resize", debounce(resize, 160));
    window.addEventListener(
      "pointermove",
      (event) => {
        mouse = { x: event.clientX, y: event.clientY };
      },
      { passive: true }
    );
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else if (!prefersReduced) {
        raf = requestAnimationFrame(draw);
      }
    });
    if (prefersReduced) {
      draw();
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(draw);
    }
    window.__hxParticles = { refreshColors };
  }

  function initCursorGlow() {
    if (isTouch) return;
    document.body.classList.add("has-pointer");
    const glow = $("#cursorGlow");
    if (!glow) return;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let raf = 0;
    window.addEventListener(
      "pointermove",
      (event) => {
        targetX = event.clientX;
        targetY = event.clientY;
      },
      { passive: true }
    );
    const animate = () => {
      currentX += (targetX - currentX) * 0.1;
      currentY += (targetY - currentY) * 0.1;
      glow.style.transform = `translate(${currentX}px, ${currentY}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(animate);
    };
    animate();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else animate();
    });
  }

  function initMagnetic() {
    if (isTouch || prefersReduced) return;
    $$("[data-magnetic]").forEach((button) => {
      button.addEventListener("pointermove", (event) => {
        const rect = button.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 6;
        button.style.transform = `translate(${x}px, ${y}px)`;
      });
      button.addEventListener("pointerleave", () => {
        button.style.transform = "";
      });
    });
  }

  function restoreSavedSession() {
    if (state.user) {
      const pill = $("#profileTrigger");
      if (pill) pill.setAttribute("title", `Signed in as ${state.user.email}`);
    }
    if (state.lootUntil > Date.now()) {
      const copy = $("#lootCopy");
      if (copy) {
        copy.textContent = "Your loot code is live for 24 hours. Apply it in the cart before the crate resets.";
      }
    }
  }

  function init() {
    document.addEventListener("pointerdown", () => Sound.unlock(), { capture: true, once: true });
    document.addEventListener("keydown", () => Sound.unlock(), { capture: true, once: true });
    applyTheme(state.theme);
    updateSoundButton();
    paintCategoryArt();
    initHero();
    initHeader();
    initSearch();
    initCatalogEvents();
    initCartEvents();
    initProductModalEvents();
    initDropEvents();
    initBuilder();
    initFooter();
    initProfile();
    initMobileMenu();
    initOverlayEvents();
    initProductCatalogInitial();
    initCartInitial();
    applyStorefrontSettings();
    applyManagedDrop();
    updateCatalogMeta();
    initDropInitial();
    initCounters();
    initReveal();
    initParticles();
    initCursorGlow();
    initMagnetic();
    initGlobalClickSound();
    restoreSavedSession();
    updateCountdown();
    window.setInterval(updateCountdown, 1000);

    if (state.user) {
      const email = $("#loginEmail");
      if (email) email.value = state.user.email;
    }

    // Update any dynamic initial labels after the app shell is hydrated.
    const year = new Date().getFullYear();
    document.documentElement.style.setProperty("--current-year", year);
  }

  function initProductCatalogInitial() {
    const ceiling = catalogCeiling();
    const range = $("#priceRange");
    if (range) {
      range.max = String(ceiling);
      range.value = String(ceiling);
    }
    state.filters.maxPrice = ceiling;
    const output = $("#priceOutput");
    if (output) output.textContent = money0.format(ceiling);
    renderProducts();
    syncRangeFill();
    updateCatalogMeta();
  }

  function initCartInitial() {
    renderCart();
  }

  function initDropInitial() {
    const claimed = state.lootUntil > Date.now();
    const button = $("#claimLootBtn");
    if (claimed && button) {
      button.innerHTML = `<span>REWARD SECURED</span>${icon(ICONS.check)}`;
    }
    syncLootModal();
    updateLootTimer();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
