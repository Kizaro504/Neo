/* ==========================================================================
   NEO GAMING — COMMAND CONSOLE RUNTIME
   ========================================================================== */

(function () {
  "use strict";

  const D = window.HX_DATA;
  const Art = window.HXArt;
  const Store = window.NeoStore;

  if (!D || !Art || !Store) {
    console.error("NEO ADMIN: required data modules failed to load.");
    return;
  }

  const ADMIN_EMAIL = "admin@neogaming.gg";
  const ADMIN_PASSWORD = "NEO-ADMIN-2026";
  const SESSION_KEY = "neo_admin_session_v1";
  const REMEMBER_KEY = "neo_admin_remember_v1";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

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

  const VIEW_META = {
    dashboard: { kicker: "COMMAND // OVERVIEW", title: "Store Overview" },
    products: { kicker: "CATALOG // HARDWARE", title: "Products" },
    orders: { kicker: "COMMERCE // FULFILLMENT", title: "Orders" },
    inventory: { kicker: "STOCK // RIG FORGE", title: "Inventory" },
    drops: { kicker: "CAMPAIGNS // FLASH", title: "Loot Drop" },
    customers: { kicker: "AUDIENCE // OPERATORS", title: "Customers" },
    settings: { kicker: "SYSTEM // CONFIG", title: "Settings" },
  };

  const state = {
    authed: false,
    view: "dashboard",
    inventoryTab: "hardware",
    productQuery: "",
    productCategory: "All",
    productStatus: "All",
    orderQuery: "",
    orderStatus: "All",
    customerQuery: "",
    inventoryQuery: "",
    partQuery: "",
    partCategory: "All",
    currentOrderId: null,
    editingProductId: null,
    confirmCallback: null,
    timersStarted: false,
  };

  /* ------------------------------------------------------------------------
     Utilities
     ------------------------------------------------------------------------ */
  function relativeTime(iso) {
    if (!iso) return "—";
    const delta = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(delta)) return "—";
    if (delta < 60000) return "just now";
    if (delta < 3600000) return `${Math.floor(delta / 60000)}m ago`;
    if (delta < 86400000) return `${Math.floor(delta / 3600000)}h ago`;
    if (delta < 7 * 86400000) return `${Math.floor(delta / 86400000)}d ago`;
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  }

  function shortDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase();
  }

  function dateTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function toLocalInputValue(timestamp) {
    const date = new Date(Number(timestamp) || Date.now());
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function formatCountdown(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function statusSlug(status) {
    return String(status || "").toLowerCase().replace(/\s+/g, "-");
  }

  function orderTotal(order) {
    return Number(order.total) || 0;
  }

  function itemCount(order) {
    return (order.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }

  function toast(message, type = "success") {
    const stack = $("#adminToastStack");
    if (!stack) return;
    const node = document.createElement("div");
    node.className = `admin-toast${type === "error" ? " is-error" : ""}`;
    node.innerHTML = `${icon(type === "error" ? "a-alert" : "a-check")}<span>${esc(message)}</span>`;
    stack.appendChild(node);
    window.setTimeout(() => {
      node.classList.add("is-out");
      window.setTimeout(() => node.remove(), 280);
    }, 3200);
    while (stack.children.length > 3) stack.firstElementChild.remove();
  }

  function downloadCsv(filename, rows) {
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell == null ? "" : cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
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
     Auth
     ------------------------------------------------------------------------ */
  function getRemembered() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "granted" || localStorage.getItem(REMEMBER_KEY) === "granted";
    } catch (err) {
      return false;
    }
  }

  function setAuthenticated(remember) {
    try {
      sessionStorage.setItem(SESSION_KEY, "granted");
      if (remember) localStorage.setItem(REMEMBER_KEY, "granted");
      else localStorage.removeItem(REMEMBER_KEY);
    } catch (err) {}
    state.authed = true;
  }

  function clearAuth() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(REMEMBER_KEY);
    } catch (err) {}
    state.authed = false;
  }

  function showLogin() {
    $("#loginGate").hidden = false;
    $("#adminApp").hidden = true;
    syncLock();
    window.setTimeout(() => $("#adminEmail")?.focus(), 100);
  }

  function openConsole(fromBoot = false) {
    $("#loginGate").hidden = true;
    $("#adminApp").hidden = false;
    $("#adminPassword").value = "";
    $("#loginError").textContent = "";
    state.authed = true;
    syncGlobalLabels();
    syncNavCounts();
    updateDateLabel();
    bindAdminEvents();
    const requested = (window.location.hash || "").replace("#", "");
    navigate(VIEW_META[requested] ? requested : "dashboard", false);
    startTimers();
    if (!fromBoot) {
      toast("Command console online");
      window.setTimeout(() => $("#viewTitle")?.focus?.(), 200);
    }
  }

  function bindLoginEvents() {
    const form = $("#adminLoginForm");
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = $("#adminEmail").value.trim().toLowerCase();
      const password = $("#adminPassword").value;
      const error = $("#loginError");
      const submit = $("#loginSubmit");
      if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        error.textContent = "ACCESS DENIED // email or passcode does not match this console.";
        error.style.animation = "none";
        void error.offsetWidth;
        error.style.animation = "viewIn .25s var(--ease-out)";
        $("#adminPassword").select();
        toast("Access denied. Use the demo credentials shown below.", "error");
        return;
      }
      error.textContent = "";
      const remember = $("#rememberAdmin").checked;
      setAuthenticated(remember);
      if (submit) {
        submit.disabled = true;
        submit.innerHTML = `<span>VERIFYING…</span>${icon("a-lock")}`;
      }
      window.setTimeout(() => {
        if (submit) {
          submit.disabled = false;
          submit.innerHTML = `<span>ENTER CONSOLE</span>${icon("a-arrow")}`;
        }
        openConsole();
      }, 520);
    });

    $("#demoFill")?.addEventListener("click", () => {
      $("#adminEmail").value = ADMIN_EMAIL;
      $("#adminPassword").value = ADMIN_PASSWORD;
      $("#adminPassword").focus();
      toast("Demo credentials loaded");
    });

    $("#passwordReveal")?.addEventListener("click", () => {
      const password = $("#adminPassword");
      const showing = password.type === "text";
      password.type = showing ? "password" : "text";
      $("#passwordReveal").textContent = showing ? "SHOW" : "HIDE";
    });

    $("#forgotAdmin")?.addEventListener("click", () => {
      toast("Demo credentials are shown below the sign-in button.", "info");
    });
  }

  /* ------------------------------------------------------------------------
     Navigation / global labels
     ------------------------------------------------------------------------ */
  function syncGlobalLabels() {
    const settings = Store.getSettings();
    const storeName = settings.storeName || "Neo Gaming";
    const sidebarStore = $(".sidebar-store strong");
    if (sidebarStore) sidebarStore.textContent = storeName;
    const dashStore = $("#dashboardStoreName");
    if (dashStore) dashStore.textContent = storeName;
    document.title = `${storeName.toUpperCase()} // Command Console`;
  }

  function syncNavCounts() {
    const products = Store.getProducts(true);
    const orders = Store.getOrders();
    const threshold = Store.getSettings().lowStockThreshold;
    const lowStock = products.filter((product) => product.stock <= threshold);
    const pending = orders.filter((order) => ["Processing", "Packed"].includes(order.status));
    const update = (name, value) => {
      const node = document.querySelector(`[data-count="${name}"]`);
      if (node) node.textContent = String(value);
    };
    update("products", products.length);
    update("orders", orders.length);
    update("lowstock", lowStock.length);
    const notif = $("#notifBadge");
    if (notif) notif.textContent = String(lowStock.length + pending.length);
    const sync = $("#sidebarSync");
    if (sync) sync.textContent = "JUST NOW";
  }

  function updateDateLabel() {
    const label = $("#todayLabel");
    if (!label) return;
    label.textContent = new Date().toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).toUpperCase();
  }

  function navigate(view, updateHash = true) {
    if (!VIEW_META[view]) view = "dashboard";
    state.view = view;
    $$(".side-link").forEach((link) => link.classList.toggle("is-active", link.dataset.view === view));
    $$(".admin-view").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.viewPanel === view));
    const meta = VIEW_META[view];
    $("#viewKicker").textContent = meta.kicker;
    $("#viewTitle").textContent = meta.title;
    if (updateHash) {
      try {
        history.replaceState({}, "", `${window.location.pathname}${window.location.search}#${view}`);
      } catch (err) {}
    }
    closeMobileSidebar();
    renderView(view);
    syncNavCounts();
    window.scrollTo(0, 0);
  }

  function renderView(view) {
    switch (view) {
      case "products":
        renderProducts();
        break;
      case "orders":
        renderOrders();
        break;
      case "inventory":
        renderInventory();
        break;
      case "drops":
        renderDrop();
        break;
      case "customers":
        renderCustomers();
        break;
      case "settings":
        renderSettings();
        break;
      default:
        renderDashboard();
    }
  }

  function openMobileSidebar() {
    $("#adminSidebar").classList.add("is-open");
    $("#sidebarScrim").classList.add("is-open");
    syncLock();
  }

  function closeMobileSidebar() {
    $("#adminSidebar").classList.remove("is-open");
    $("#sidebarScrim").classList.remove("is-open");
    syncLock();
  }

  function syncLock() {
    const overlayOpen = Boolean(document.querySelector(".admin-drawer.is-open, .admin-modal.is-open"));
    const sidebarOpen = $("#adminSidebar")?.classList.contains("is-open");
    document.body.classList.toggle("is-locked", overlayOpen || Boolean(sidebarOpen));
  }

  /* ------------------------------------------------------------------------
     Dashboard
     ------------------------------------------------------------------------ */
  function renderDashboard() {
    const stats = Store.getStats();
    const settings = Store.getSettings();
    const orders = Store.getOrders();
    const drop = Store.getDrop();
    const customers = Store.getCustomers();
    syncGlobalLabels();
    updateDateLabel();

    $("#kpiGrid").innerHTML = [
      {
        icon: "a-dollar",
        label: "GROSS REVENUE",
        value: money0.format(stats.revenue),
        meta: `${stats.validOrderCount} completed-value orders`,
      },
      {
        icon: "a-orders",
        label: "ORDERS",
        value: String(stats.orderCount),
        meta: `${stats.pendingOrders} awaiting fulfillment`,
      },
      {
        icon: "a-box",
        label: "UNITS SOLD",
        value: String(stats.units),
        meta: `${stats.productCount} active products`,
      },
      {
        icon: "a-users",
        label: "OPERATORS",
        value: String(customers.length),
        meta: `${money0.format(stats.avgOrder)} average order`,
      },
    ]
      .map(
        (item) => `<article class="kpi-card">
          <div class="kpi-card__top">
            <span class="kpi-card__icon">${icon(item.icon)}</span>
            <span class="kpi-trend">${icon("a-trend")} LIVE</span>
          </div>
          <span class="kpi-card__label">${esc(item.label)}</span>
          <strong class="kpi-card__value">${esc(item.value)}</strong>
          <span class="kpi-card__meta">${esc(item.meta)}</span>
        </article>`
      )
      .join("");

    const series = stats.series;
    const max = Math.max(1, ...series.map((point) => point.value));
    const chartTotal = series.reduce((sum, point) => sum + point.value, 0);
    $("#chartTotal").textContent = money0.format(chartTotal);
    $("#salesChart").innerHTML = series
      .map((point) => {
        const height = point.value ? Math.max(5, Math.round((point.value / max) * 100)) : 2;
        return `<div class="chart-col">
          <div class="chart-bar-wrap">
            <div class="chart-bar" style="height:${height}%"><span class="chart-value">${money0.format(point.value)}</span></div>
          </div>
          <span class="chart-label">${esc(point.label)}</span>
        </div>`;
      })
      .join("");
    const first = series[0]?.label || "—";
    const last = series[series.length - 1]?.label || "—";
    $("#chartRange").textContent = `${first.toUpperCase()} — ${last.toUpperCase()} // ROLLING`;
    $("#lowStockCount").textContent = `${stats.lowStock.length} ITEM${stats.lowStock.length === 1 ? "" : "S"}`;

    $("#recentOrdersBody").innerHTML = orders
      .slice(0, 5)
      .map(
        (order) => `<tr>
          <td><button class="text-button" type="button" data-order-view="${esc(order.id)}">${esc(order.id)}</button></td>
          <td><div class="table-customer"><strong>${esc(order.customer?.name || "Guest")}</strong><span>${esc(order.customer?.email || "")}</span></div></td>
          <td><span class="table-items">${itemCount(order)} ITEM${itemCount(order) === 1 ? "" : "S"}</span></td>
          <td><span class="status-pill status-pill--${statusSlug(order.status)}"><i></i>${esc(order.status)}</span></td>
          <td><span class="table-price">${money2.format(orderTotal(order))}</span></td>
        </tr>`
      )
      .join("") || `<tr><td colspan="5"><div class="admin-empty">No orders yet.</div></td></tr>`;

    $("#lowStockList").innerHTML =
      stats.lowStock
        .slice(0, 4)
        .map(
          (product) => `<div class="low-stock-item">
            <span class="low-stock-item__art">${Art.artMarkup(product.art, product.accent, product.accent2)}</span>
            <span class="low-stock-item__copy"><strong>${esc(product.name)}</strong><span>${esc(product.brand)} · ${esc(product.category)}</span></span>
            <span class="stock-pill ${product.stock === 0 ? "is-out" : ""}">${product.stock === 0 ? "SOLD OUT" : `${product.stock} LEFT`}</span>
            <button type="button" data-edit-product="${esc(product.id)}" aria-label="Edit ${esc(product.name)}">${icon("a-edit")}</button>
          </div>`
        )
        .join("") || `<div class="admin-empty">Stock levels are healthy.</div>`;

    $("#dropOverviewArt").innerHTML = Art.artMarkup("gpuNebula", "#ff4d8d", "#00e5ff");
    $("#dropOverviewName").textContent = drop.productShort || "RTX 5090 NEBULA";
    $("#dropOverviewPrice").innerHTML = `${money0.format(drop.price)} <s>${money0.format(drop.compareAt)}</s>`;
    $("#dropOverviewClaimed").textContent = `${Math.round(drop.claimed)}% CLAIMED`;
    $("#dropOverviewRemaining").textContent = `${Math.round(drop.remainingPct)}% LEFT`;
    $("#dropOverviewBar").style.width = `${clamp(drop.claimed, 0, 100)}%`;
    const dropLive = $("#dropLiveStatus");
    const dropClosed = !drop.active || drop.claimed >= 100 || drop.endsAt <= Date.now();
    dropLive.className = `status-pill ${dropClosed ? "status-pill--cancelled" : "status-pill--live"}`;
    dropLive.innerHTML = `<i></i> ${dropClosed ? "CLOSED" : "LIVE"}`;
    updateDropClocks();
    syncNavCounts();
  }

  /* ------------------------------------------------------------------------
     Products
     ------------------------------------------------------------------------ */
  function filteredProducts() {
    const products = Store.getProducts(false);
    const threshold = Store.getSettings().lowStockThreshold;
    const query = state.productQuery.trim().toLowerCase();
    return products.filter((product) => {
      const queryMatch =
        !query ||
        `${product.name} ${product.brand} ${product.category} ${(product.specs || []).join(" ")}`.toLowerCase().includes(query);
      const categoryMatch = state.productCategory === "All" || product.category === state.productCategory;
      let statusMatch = true;
      if (state.productStatus === "active") statusMatch = product.active && product.stock > 0;
      if (state.productStatus === "inactive") statusMatch = !product.active;
      if (state.productStatus === "low") statusMatch = product.active && product.stock > 0 && product.stock <= threshold;
      if (state.productStatus === "sold") statusMatch = product.active && product.stock <= 0;
      return queryMatch && categoryMatch && statusMatch;
    });
  }

  function productStatusCell(product, threshold) {
    if (!product.active) return `<span class="status-pill status-pill--hidden"><i></i>HIDDEN</span>`;
    if (product.stock <= 0) return `<span class="status-pill status-pill--cancelled"><i></i>SOLD OUT</span>`;
    if (product.stock <= threshold) return `<span class="status-pill status-pill--processing"><i></i>LOW STOCK</span>`;
    return `<span class="status-pill status-pill--active"><i></i>ACTIVE</span>`;
  }

  function renderProducts() {
    const all = Store.getProducts(false);
    const visible = filteredProducts();
    const threshold = Store.getSettings().lowStockThreshold;
    const active = all.filter((product) => product.active);
    const low = active.filter((product) => product.stock <= threshold);
    const inventoryValue = all.reduce((sum, product) => sum + product.price * product.stock, 0);
    $("#productStats").innerHTML = [
      { icon: "a-box", value: all.length, label: "TOTAL PRODUCTS" },
      { icon: "a-eye", value: active.length, label: "LIVE IN STORE" },
      { icon: "a-alert", value: low.length, label: "LOW STOCK" },
      { icon: "a-dollar", value: money0.format(inventoryValue), label: "INVENTORY VALUE" },
    ]
      .map(
        (stat) => `<div class="mini-stat">${icon(stat.icon)}<div><strong>${esc(stat.value)}</strong><span>${esc(stat.label)}</span></div></div>`
      )
      .join("");

    $("#productsBody").innerHTML = visible
      .map((product) => {
        const stockClass = product.stock <= 0 ? "is-out" : product.stock <= threshold ? "is-low" : "";
        return `<tr>
          <td><div class="product-cell">
            <span class="product-cell__art">${Art.artMarkup(product.art, product.accent, product.accent2)}</span>
            <span class="product-cell__copy"><strong>${esc(product.name)}</strong><span>${esc(product.brand)} · ${esc(product.badge || "NO BADGE")}</span></span>
          </div></td>
          <td><span class="category-tag">${esc(product.category)}</span></td>
          <td><span class="table-stock ${stockClass}"><i></i>${product.stock}</span></td>
          <td><span class="table-price">${money0.format(product.price)}</span></td>
          <td>${productStatusCell(product, threshold)}</td>
          <td><div class="row-actions">
            <button class="row-action" type="button" data-edit-product="${esc(product.id)}" aria-label="Edit ${esc(product.name)}">${icon("a-edit")}</button>
            <button class="row-action" type="button" data-toggle-product="${esc(product.id)}" aria-label="${product.active ? "Hide" : "Publish"} ${esc(product.name)}">${icon(product.active ? "a-eye" : "a-check")}</button>
            <button class="row-action is-danger" type="button" data-delete-product="${esc(product.id)}" aria-label="Delete ${esc(product.name)}">${icon("a-trash")}</button>
          </div></td>
        </tr>`;
      })
      .join("");
    $("#productResultCount").textContent = `${visible.length} ITEM${visible.length === 1 ? "" : "S"}`;
    $("#productsEmpty").hidden = visible.length > 0;
    syncNavCounts();
  }

  function openProductDrawer(productId = null) {
    const product = productId ? Store.getProducts(false).find((item) => item.id === productId) : null;
    state.editingProductId = product?.id || null;
    $("#productDrawerTitle").textContent = product ? "Edit product" : "Add product";
    $("#productFormError").textContent = "";
    $("#pId").value = product?.id || "";
    $("#pName").value = product?.name || "";
    $("#pBrand").value = product?.brand || "";
    $("#pCategory").value = product?.category || "Laptops";
    $("#pArt").value = product?.art || "laptop";
    $("#pPrice").value = product?.price ?? "";
    $("#pWas").value = product?.was || "";
    $("#pStock").value = product?.stock ?? 5;
    $("#pRating").value = product?.rating ?? 4.8;
    $("#pReviews").value = product?.reviews ?? 0;
    $("#pBadge").value = product?.badge || "";
    $("#pBadgeTone").value = product?.badgeTone || "new";
    $("#pAccent").value = product?.accent || "#7bd64f";
    $("#pAccentText").value = product?.accent || "#7bd64f";
    $("#pAccent2").value = product?.accent2 || "#00f0ff";
    $("#pAccent2Text").value = product?.accent2 || "#00f0ff";
    $("#pSpecs").value = (product?.specs || []).join(", ");
    $("#pDescription").value = product?.description || "";
    $("#pKeywords").value = product?.keywords || "";
    $("#pActive").checked = product ? product.active !== false : true;
    updateProductPreview();
    openDrawer("productDrawer");
    window.setTimeout(() => $("#pName")?.focus(), 180);
  }

  function updateProductPreview() {
    const name = $("#pName")?.value.trim() || "Untitled product";
    const brand = $("#pBrand")?.value.trim() || "NEW PRODUCT";
    const category = $("#pCategory")?.value || "LAPTOPS";
    const art = $("#pArt")?.value || "laptop";
    const accent = $("#pAccentText")?.value || "#7bd64f";
    const accent2 = $("#pAccent2Text")?.value || "#00f0ff";
    const price = Number($("#pPrice")?.value) || 0;
    $("#productFormArt").innerHTML = Art.artMarkup(art, accent, accent2);
    $("#productFormCategory").textContent = `${category.toUpperCase()} // ${brand.toUpperCase()}`;
    $("#productFormName").textContent = name;
    $("#productFormPrice").textContent = money0.format(price);
  }

  function saveProduct(event) {
    event.preventDefault();
    const error = $("#productFormError");
    const name = $("#pName").value.trim();
    const brand = $("#pBrand").value.trim();
    const price = Number($("#pPrice").value);
    if (!name || !brand) {
      error.textContent = "Name and brand are required.";
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      error.textContent = "Enter a valid price.";
      return;
    }
    error.textContent = "";
    const existingProducts = Store.getProducts(false);
    const existing = state.editingProductId
      ? existingProducts.find((product) => product.id === state.editingProductId)
      : null;
    let id = existing?.id || Store.slugify(name);
    if (!existing && existingProducts.some((product) => product.id === id)) {
      id = `${id}-${Date.now().toString(36).slice(-4)}`;
    }
    const was = Number($("#pWas").value) || 0;
    const product = {
      ...(existing || {}),
      id,
      name,
      brand,
      category: $("#pCategory").value,
      art: $("#pArt").value,
      price,
      was: was > price ? was : 0,
      stock: Math.max(0, Number($("#pStock").value) || 0),
      rating: clamp(Number($("#pRating").value) || 0, 0, 5),
      reviews: Math.max(0, Number($("#pReviews").value) || 0),
      badge: $("#pBadge").value.trim(),
      badgeTone: $("#pBadgeTone").value,
      accent: $("#pAccentText").value.trim() || "#7bd64f",
      accent2: $("#pAccent2Text").value.trim() || "#00f0ff",
      specs: $("#pSpecs").value.split(",").map((spec) => spec.trim()).filter(Boolean),
      description: $("#pDescription").value.trim(),
      keywords: $("#pKeywords").value.trim(),
      active: $("#pActive").checked,
      order: existing?.order || 1,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    Store.upsertProduct(product);
    closeDrawer("productDrawer");
    renderProducts();
    renderDashboard();
    renderNavCountsSafe();
    toast(existing ? "Product updated" : "Product created");
  }

  function deleteProduct(productId) {
    const product = Store.getProducts(false).find((item) => item.id === productId);
    if (!product) return;
    openConfirm({
      title: "Delete product?",
      text: `${product.name} will be removed from the storefront. Existing order records keep their snapshots.`,
      label: "DELETE PRODUCT",
      onConfirm: () => {
        Store.deleteProduct(productId);
        renderProducts();
        renderDashboard();
        syncNavCounts();
        toast("Product deleted", "success");
      },
    });
  }

  function toggleProduct(productId) {
    const product = Store.getProducts(false).find((item) => item.id === productId);
    if (!product) return;
    Store.upsertProduct({ ...product, active: !product.active });
    renderProducts();
    renderDashboard();
    toast(product.active ? "Product hidden from storefront" : "Product published to storefront");
  }

  /* ------------------------------------------------------------------------
     Orders
     ------------------------------------------------------------------------ */
  function filteredOrders() {
    const orders = Store.getOrders();
    const query = state.orderQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const haystack = `${order.id} ${order.customer?.name || ""} ${order.customer?.email || ""} ${(order.items || [])
        .map((item) => item.name)
        .join(" ")}`.toLowerCase();
      const queryMatch = !query || haystack.includes(query);
      const statusMatch = state.orderStatus === "All" || order.status === state.orderStatus;
      return queryMatch && statusMatch;
    });
  }

  function renderOrders() {
    const orders = Store.getOrders();
    const visible = filteredOrders();
    const processing = orders.filter((order) => order.status === "Processing").length;
    const transit = orders.filter((order) => ["Packed", "Shipped"].includes(order.status)).length;
    const delivered = orders.filter((order) => order.status === "Delivered").length;
    $("#orderStats").innerHTML = [
      { icon: "a-orders", value: orders.length, label: "TOTAL ORDERS" },
      { icon: "a-inventory", value: processing, label: "PROCESSING" },
      { icon: "a-truck", value: transit, label: "PACKED / SHIPPED" },
      { icon: "a-check", value: delivered, label: "DELIVERED" },
    ]
      .map(
        (stat) => `<div class="mini-stat">${icon(stat.icon)}<div><strong>${esc(stat.value)}</strong><span>${esc(stat.label)}</span></div></div>`
      )
      .join("");
    $("#ordersBody").innerHTML = visible
      .map(
        (order) => `<tr>
          <td><button class="text-button" type="button" data-order-view="${esc(order.id)}">${esc(order.id)}</button></td>
          <td><div class="table-customer"><strong>${esc(order.customer?.name || "Guest")}</strong><span>${esc(order.customer?.email || "")}</span></div></td>
          <td><span class="table-items">${itemCount(order)} ITEM${itemCount(order) === 1 ? "" : "S"}</span></td>
          <td><span class="table-date">${shortDate(order.createdAt)}</span></td>
          <td>
            <select class="status-select" data-order-status="${esc(order.id)}" aria-label="Update status for ${esc(order.id)}">
              ${["Processing", "Packed", "Shipped", "Delivered", "Cancelled"]
                .map((status) => `<option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>`)
                .join("")}
            </select>
          </td>
          <td><span class="table-price">${money2.format(orderTotal(order))}</span></td>
          <td><div class="row-actions"><button class="row-action" type="button" data-order-view="${esc(order.id)}" aria-label="View ${esc(order.id)}">${icon("a-eye")}</button></div></td>
        </tr>`
      )
      .join("");
    $("#orderResultCount").textContent = `${visible.length} ORDER${visible.length === 1 ? "" : "S"}`;
    $("#ordersEmpty").hidden = visible.length > 0;
    syncNavCounts();
  }

  function openOrder(orderId) {
    const order = Store.getOrders().find((entry) => entry.id === orderId);
    if (!order) return;
    state.currentOrderId = order.id;
    $("#orderDrawerTitle").textContent = order.id;
    $("#orderDetailBody").innerHTML = `
      <div class="order-detail-id">
        <strong>${esc(order.id)}</strong>
        <span class="status-pill status-pill--${statusSlug(order.status)}"><i></i>${esc(order.status)}</span>
      </div>
      <div class="order-detail-block">
        <div class="order-detail-block__head"><span>CUSTOMER</span><strong>${dateTime(order.createdAt)}</strong></div>
        <div class="order-customer"><div class="avatar">${esc((order.customer?.name || "G").slice(0, 2).toUpperCase())}</div><div><strong>${esc(order.customer?.name || "Guest")}</strong><span>${esc(order.customer?.email || "")}</span></div></div>
      </div>
      <div class="order-detail-block">
        <div class="order-detail-block__head"><span>LINE ITEMS</span><strong>${itemCount(order)} UNITS</strong></div>
        ${(order.items || [])
          .map(
            (item) => `<div class="order-item">
              <span class="order-item__art">${Art.artMarkup(item.art || "gpu", item.accent || "#7bd64f", item.accent2 || "#00f0ff")}</span>
              <span class="order-item__copy"><strong>${esc(item.name)}</strong><span>${esc(item.brand || "")} · QTY ${item.qty}</span></span>
              <span class="order-item__price">${money2.format((Number(item.price) || 0) * (Number(item.qty) || 0))}</span>
            </div>`
          )
          .join("")}
      </div>
      <div class="order-detail-block">
        <div class="order-detail-block__head"><span>PAYMENT SUMMARY</span><strong>${esc(order.payment || "Card // simulated")}</strong></div>
        <div class="order-totals">
          <div><span>SUBTOTAL</span><strong>${money2.format(order.subtotal)}</strong></div>
          <div><span>DISCOUNT${order.promo ? ` · ${esc(order.promo)}` : ""}</span><strong>−${money2.format(order.discount || 0)}</strong></div>
          <div><span>SHIPPING</span><strong>${order.shipping ? money2.format(order.shipping) : "FREE"}</strong></div>
          <div class="order-total"><span>TOTAL</span><strong>${money2.format(order.total)}</strong></div>
        </div>
      </div>
      <div class="order-detail-block">
        <div class="order-detail-block__head"><span>INTERNAL NOTE</span><strong>PRIVATE</strong></div>
        <label class="admin-field"><span class="sr-only">Internal note</span><textarea id="orderNote" rows="3" placeholder="Add a fulfillment note…">${esc(order.note || "")}</textarea></label>
        <div class="order-status-editor">
          <select id="orderDetailStatus" aria-label="Order status">
            ${["Processing", "Packed", "Shipped", "Delivered", "Cancelled"]
              .map((status) => `<option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>`)
              .join("")}
          </select>
          <button class="admin-btn admin-btn--primary" type="button" data-save-order="${esc(order.id)}">${icon("a-save")} SAVE</button>
        </div>
      </div>
    `;
    openDrawer("orderDrawer");
  }

  function saveOrderDetail(orderId) {
    const status = $("#orderDetailStatus")?.value;
    const note = $("#orderNote")?.value || "";
    if (!status) return;
    Store.updateOrder(orderId, { status, note });
    closeDrawer("orderDrawer");
    renderOrders();
    renderDashboard();
    toast("Order updated");
  }

  /* ------------------------------------------------------------------------
     Inventory
     ------------------------------------------------------------------------ */
  function renderInventory() {
    if (state.inventoryTab === "parts") renderParts();
    else renderHardwareInventory();
    syncNavCounts();
  }

  function renderHardwareInventory() {
    const products = Store.getProducts(false);
    const threshold = Store.getSettings().lowStockThreshold;
    const query = state.inventoryQuery.trim().toLowerCase();
    const list = products.filter((product) => !query || `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(query));
    $("#inventoryBody").innerHTML = list
      .map(
        (product) => `<tr>
          <td><div class="product-cell"><span class="product-cell__art">${Art.artMarkup(product.art, product.accent, product.accent2)}</span><span class="product-cell__copy"><strong>${esc(product.name)}</strong><span>${esc(product.brand)}</span></span></div></td>
          <td><span class="category-tag">${esc(product.category)}</span><br><span class="table-date">${esc(product.id)}</span></td>
          <td><span class="table-stock ${product.stock <= 0 ? "is-out" : product.stock <= threshold ? "is-low" : ""}"><i></i>${product.stock} UNITS</span></td>
          <td><span class="table-items">${threshold} UNITS</span></td>
          <td><div class="stock-adjust"><button type="button" data-stock-step="-1" data-product-id="${esc(product.id)}" aria-label="Decrease stock">−</button><input type="number" min="0" step="1" value="${product.stock}" data-stock-input="${esc(product.id)}" aria-label="Stock for ${esc(product.name)}" /><button type="button" data-stock-step="1" data-product-id="${esc(product.id)}" aria-label="Increase stock">+</button></div></td>
        </tr>`
      )
      .join("");
    $("#inventoryCount").textContent = `${list.length} SKU${list.length === 1 ? "" : "S"}`;
  }

  function saveStock(productId, value) {
    const products = Store.getProducts(false);
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    product.stock = Math.max(0, Number(value) || 0);
    Store.saveProducts(products);
    renderProducts();
    syncNavCounts();
    toast(`${product.name} stock set to ${product.stock}`);
  }

  function renderParts() {
    const parts = Store.getParts();
    const query = state.partQuery.trim().toLowerCase();
    const list = parts.filter((part) => {
      const queryMatch = !query || `${part.name} ${part.brand} ${part.category} ${part.spec || ""}`.toLowerCase().includes(query);
      const categoryMatch = state.partCategory === "All" || part.category === state.partCategory;
      return queryMatch && categoryMatch;
    });
    const catLabel = (category) => D.builderCategories.find((entry) => entry.id === category)?.label || category.toUpperCase();
    $("#partsBody").innerHTML = list
      .map(
        (part) => `<tr>
          <td><div class="table-customer"><strong>${esc(part.name)}</strong><span>${esc(part.brand)} · ${esc(part.spec || "")}</span></div></td>
          <td><span class="category-tag">${esc(catLabel(part.category))}</span></td>
          <td><input class="price-input" type="number" min="0" step="1" value="${Number(part.price) || 0}" data-part-price="${esc(part.id)}" data-part-cat="${esc(part.category)}" aria-label="Price for ${esc(part.name)}" /></td>
          <td><label class="switch-mini"><input type="checkbox" ${part.active !== false ? "checked" : ""} data-part-active="${esc(part.id)}" data-part-cat="${esc(part.category)}" aria-label="Visibility for ${esc(part.name)}" /><span></span></label></td>
          <td><span class="status-pill ${part.active !== false ? "status-pill--active" : "status-pill--hidden"}"><i></i>${part.active !== false ? "VISIBLE" : "HIDDEN"}</span></td>
        </tr>`
      )
      .join("");
    $("#partsCount").textContent = `${list.length} PART${list.length === 1 ? "" : "S"}`;
  }

  /* ------------------------------------------------------------------------
     Drop editor
     ------------------------------------------------------------------------ */
  function renderDrop() {
    const drop = Store.getDrop();
    $("#dropActive").checked = drop.active !== false;
    $("#dropHeadlineTop").value = drop.headlineTop || "";
    $("#dropHeadlineBottom").value = drop.headlineBottom || "";
    $("#dropDescription").value = drop.description || "";
    $("#dropProductShort").value = drop.productShort || "";
    $("#dropCtaInput").value = drop.cta || "";
    $("#dropCodeInput").value = drop.code || "";
    $("#dropEditionInput").value = drop.edition || "";
    $("#dropPriceInput").value = drop.price;
    $("#dropCompareInput").value = drop.compareAt;
    $("#dropUnitsInput").value = drop.unitsTotal;
    $("#dropViewersInput").value = drop.viewers;
    $("#dropClaimedRange").value = drop.claimed;
    $("#dropClaimedValue").textContent = `${Math.round(drop.claimed)}%`;
    $("#dropEndsAt").value = toLocalInputValue(drop.endsAt);
    updateDropPreview();
  }

  function readDropForm() {
    const endsAt = $("#dropEndsAt").value ? new Date($("#dropEndsAt").value).getTime() : Date.now() + 48 * 3600000;
    return {
      active: $("#dropActive").checked,
      headlineTop: $("#dropHeadlineTop").value.trim(),
      headlineBottom: $("#dropHeadlineBottom").value.trim(),
      description: $("#dropDescription").value.trim(),
      productShort: $("#dropProductShort").value.trim(),
      cta: $("#dropCtaInput").value.trim(),
      code: $("#dropCodeInput").value.trim(),
      edition: $("#dropEditionInput").value.trim(),
      price: Math.max(0, Number($("#dropPriceInput").value) || 0),
      compareAt: Math.max(0, Number($("#dropCompareInput").value) || 0),
      unitsTotal: Math.max(1, Number($("#dropUnitsInput").value) || 1),
      viewers: Math.max(0, Number($("#dropViewersInput").value) || 0),
      claimed: clamp(Number($("#dropClaimedRange").value) || 0, 0, 100),
      endsAt: Number.isFinite(endsAt) ? endsAt : Date.now() + 48 * 3600000,
    };
  }

  function updateDropPreview() {
    const drop = readDropForm();
    $("#dropClaimedValue").textContent = `${Math.round(drop.claimed)}%`;
    $("#dropPreviewArt").innerHTML = Art.artMarkup("gpuNebula", "#ff4d8d", "#00e5ff");
    $("#dropPreviewTag").textContent = drop.edition || "NEBULA SERIES // 001";
    $("#dropPreviewTitle").textContent = drop.productShort || "RTX 5090 NEBULA";
    $("#dropPreviewPrice").textContent = money0.format(drop.price);
    $("#dropPreviewCompare").textContent = money0.format(drop.compareAt);
    $("#dropPreviewClaim").textContent = `${Math.round(drop.claimed)}%`;
    $("#dropPreviewBar").style.width = `${drop.claimed}%`;
    $("#dropPreviewEnd").textContent = dateTime(drop.endsAt);
    const closed = !drop.active || drop.claimed >= 100 || drop.endsAt <= Date.now();
    const status = $("#dropPreviewStatus");
    status.className = `status-pill ${closed ? "status-pill--cancelled" : "status-pill--live"}`;
    status.innerHTML = `<i></i> ${closed ? "CLOSED" : "LIVE"}`;
    updateDropClocks();
  }

  function saveDrop(event) {
    event.preventDefault();
    const drop = readDropForm();
    Store.saveDrop(drop);
    updateDropPreview();
    renderDashboard();
    toast("Loot drop saved and live");
  }

  function updateDropClocks() {
    const drop = Store.getDrop();
    const left = Math.max(0, Number(drop.endsAt) - Date.now());
    const clock = formatCountdown(left);
    const adminClock = $("#adminDropCountdown");
    if (adminClock) adminClock.textContent = clock;
    const mini = $("#dropMiniCountdown");
    if (mini) mini.textContent = clock;
  }

  /* ------------------------------------------------------------------------
     Customers
     ------------------------------------------------------------------------ */
  function renderCustomers() {
    const customers = Store.getCustomers();
    const subscribers = Store.getSubscribers();
    const query = state.customerQuery.trim().toLowerCase();
    const visible = customers.filter((customer) => !query || `${customer.name} ${customer.email}`.toLowerCase().includes(query));
    const repeat = customers.filter((customer) => customer.orders > 1).length;
    const spend = customers.reduce((sum, customer) => sum + customer.spend, 0);
    $("#customerStats").innerHTML = [
      { icon: "a-users", value: customers.length, label: "KNOWN OPERATORS" },
      { icon: "a-mail", value: subscribers.length, label: "NEWSLETTER MEMBERS" },
      { icon: "a-trend", value: repeat, label: "REPEAT BUYERS" },
      { icon: "a-dollar", value: money0.format(customers.length ? spend / customers.length : 0), label: "AVG SPEND" },
    ]
      .map(
        (stat) => `<div class="mini-stat">${icon(stat.icon)}<div><strong>${esc(stat.value)}</strong><span>${esc(stat.label)}</span></div></div>`
      )
      .join("");
    $("#customersBody").innerHTML = visible
      .map(
        (customer) => `<tr>
          <td><div class="customer-cell"><div class="avatar">${esc((customer.name || "N").slice(0, 2).toUpperCase())}</div><div><strong>${esc(customer.name || "Operator")}</strong><span>${esc(customer.email)}</span></div></div></td>
          <td><span class="category-tag">${esc(customer.source || "Storefront")}</span></td>
          <td><span class="table-items">${customer.orders}</span></td>
          <td><span class="table-price">${money0.format(customer.spend)}</span></td>
          <td><span class="table-date">${customer.lastOrder ? shortDate(customer.lastOrder) : "—"}</span></td>
          <td><span class="table-date">${customer.joinedAt ? shortDate(customer.joinedAt) : "—"}</span></td>
        </tr>`
      )
      .join("");
    $("#customersEmpty").hidden = visible.length > 0;
  }

  function addSubscriber(event) {
    event.preventDefault();
    const input = $("#subscriberEmail");
    const email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast("Enter a valid operator email", "error");
      input.focus();
      return;
    }
    const before = Store.getSubscribers().length;
    const subscriber = Store.addSubscriber(email);
    const after = Store.getSubscribers().length;
    input.value = "";
    renderCustomers();
    syncNavCounts();
    toast(after > before ? `${subscriber.email} added to the dispatch` : "That operator is already connected");
  }

  /* ------------------------------------------------------------------------
     Settings / promo
     ------------------------------------------------------------------------ */
  function populateSettingsForm() {
    const settings = Store.getSettings();
    $("#settingStoreName").value = settings.storeName;
    $("#settingSupportEmail").value = settings.supportEmail;
    $("#settingFreeShipping").value = settings.freeShippingThreshold;
    $("#settingStandardShipping").value = settings.standardShipping;
    $("#settingLowStock").value = settings.lowStockThreshold;
    $("#settingAnnouncement").value = settings.announcement;
  }

  function renderSettings() {
    populateSettingsForm();
    renderPromoList();
  }

  function saveSettings(event) {
    event.preventDefault();
    const email = $("#settingSupportEmail").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast("Enter a valid support email", "error");
      return;
    }
    Store.saveSettings({
      storeName: $("#settingStoreName").value.trim() || "Neo Gaming",
      supportEmail: email,
      freeShippingThreshold: Math.max(0, Number($("#settingFreeShipping").value) || 0),
      standardShipping: Math.max(0, Number($("#settingStandardShipping").value) || 0),
      lowStockThreshold: Math.max(1, Number($("#settingLowStock").value) || 4),
      announcement: $("#settingAnnouncement").value.trim(),
    });
    syncGlobalLabels();
    toast("Store settings saved");
  }

  function renderPromoList() {
    const promos = Store.getPromos();
    $("#promoList").innerHTML =
      promos
        .map(
          (promo) => `<div class="promo-row">
            <div class="promo-row__copy"><code>${esc(promo.code)}</code><span>${esc(promo.label || "STANDARD LOOT")} · ${Number(promo.uses) || 0} USES</span></div>
            <span class="promo-rate">${Math.round((Number(promo.rate) || 0) * 100)}%</span>
            <label class="switch-mini"><input type="checkbox" data-promo-active="${esc(promo.code)}" ${promo.active !== false ? "checked" : ""} aria-label="Toggle ${esc(promo.code)}" /><span></span></label>
            <button class="promo-row__delete" type="button" data-delete-promo="${esc(promo.code)}" aria-label="Delete ${esc(promo.code)}">${icon("a-trash")}</button>
          </div>`
        )
        .join("") || `<div class="admin-empty">No promo codes configured.</div>`;
  }

  function addPromo(event) {
    event.preventDefault();
    const code = $("#promoCode").value.trim().toUpperCase();
    const percent = Number($("#promoRate").value);
    const label = $("#promoLabel").value.trim() || "Custom loot";
    if (!code || !Number.isFinite(percent) || percent < 1 || percent > 100) {
      toast("Enter a code and a discount between 1–100%", "error");
      return;
    }
    const promos = Store.getPromos();
    if (promos.some((promo) => String(promo.code).toUpperCase() === code)) {
      toast("That promo code already exists", "error");
      return;
    }
    promos.push({ code, rate: percent / 100, label, active: true, uses: 0, createdAt: new Date().toISOString() });
    Store.savePromos(promos);
    $("#promoForm").reset();
    renderPromoList();
    toast(`${code} added to the loot engine`);
  }

  function togglePromo(code, active) {
    const promos = Store.getPromos().map((promo) => (String(promo.code).toUpperCase() === code ? { ...promo, active } : promo));
    Store.savePromos(promos);
    renderPromoList();
    toast(`${code} ${active ? "activated" : "paused"}`);
  }

  function deletePromo(code) {
    openConfirm({
      title: "Delete promo code?",
      text: `${code} will stop working at checkout immediately.`,
      label: "DELETE CODE",
      onConfirm: () => {
        Store.savePromos(Store.getPromos().filter((promo) => String(promo.code).toUpperCase() !== code));
        renderPromoList();
        toast(`${code} removed`, "success");
      },
    });
  }

  /* ------------------------------------------------------------------------
     Drawers / dialogs
     ------------------------------------------------------------------------ */
  function openDrawer(id) {
    const drawer = document.getElementById(id);
    if (!drawer) return;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    syncLock();
  }

  function closeDrawer(id) {
    const drawer = document.getElementById(id);
    if (!drawer) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    syncLock();
  }

  function openConfirm(config) {
    state.confirmCallback = config.onConfirm;
    $("#confirmTitle").textContent = config.title || "Confirm action";
    $("#confirmText").textContent = config.text || "This action cannot be undone.";
    $("#confirmOk").textContent = config.label || "CONFIRM";
    $("#confirmDialog").classList.add("is-open");
    $("#confirmDialog").setAttribute("aria-hidden", "false");
    syncLock();
  }

  function closeConfirm() {
    $("#confirmDialog").classList.remove("is-open");
    $("#confirmDialog").setAttribute("aria-hidden", "true");
    state.confirmCallback = null;
    syncLock();
  }

  /* ------------------------------------------------------------------------
     Events
     ------------------------------------------------------------------------ */
  let adminBound = false;

  function bindAdminEvents() {
    if (adminBound) return;
    adminBound = true;

    $$(".side-link").forEach((link) => {
      link.addEventListener("click", () => navigate(link.dataset.view));
    });
    $$("[data-view-jump]").forEach((button) => {
      button.addEventListener("click", () => navigate(button.dataset.viewJump));
    });
    $$("[data-go-products]").forEach((button) => {
      button.addEventListener("click", () => {
        navigate("products");
        window.setTimeout(() => openProductDrawer(), 120);
      });
    });
    $("#refreshDashboardBtn")?.addEventListener("click", () => {
      renderDashboard();
      toast("Command metrics refreshed");
    });
    $("#notificationsBtn")?.addEventListener("click", () => {
      const stats = Store.getStats();
      toast(`${stats.pendingOrders} orders need action · ${stats.lowStock.length} products low on stock`, stats.lowStock.length ? "info" : "success");
    });
    $("#sidebarToggle")?.addEventListener("click", openMobileSidebar);
    $("#sidebarClose")?.addEventListener("click", closeMobileSidebar);
    $("#sidebarScrim")?.addEventListener("click", closeMobileSidebar);
    $("#logoutBtn")?.addEventListener("click", () => {
      clearAuth();
      closeMobileSidebar();
      showLogin();
      toast("Console session closed");
    });

    $("#addProductBtn")?.addEventListener("click", () => openProductDrawer());
    $("#productSearch")?.addEventListener("input", (event) => {
      state.productQuery = event.target.value;
      renderProducts();
    });
    $("#productCategoryFilter")?.addEventListener("change", (event) => {
      state.productCategory = event.target.value;
      renderProducts();
    });
    $("#productStatusFilter")?.addEventListener("change", (event) => {
      state.productStatus = event.target.value;
      renderProducts();
    });
    $("#productsBody")?.addEventListener("click", (event) => {
      const edit = event.target.closest("[data-edit-product]");
      const toggle = event.target.closest("[data-toggle-product]");
      const remove = event.target.closest("[data-delete-product]");
      if (edit) openProductDrawer(edit.dataset.editProduct);
      if (toggle) toggleProduct(toggle.dataset.toggleProduct);
      if (remove) deleteProduct(remove.dataset.deleteProduct);
    });
    $("#lowStockList")?.addEventListener("click", (event) => {
      const edit = event.target.closest("[data-edit-product]");
      if (edit) openProductDrawer(edit.dataset.editProduct);
    });
    $("#productForm")?.addEventListener("submit", saveProduct);
    $("#productForm")?.addEventListener("input", (event) => {
      if (event.target.id === "pAccent" || event.target.id === "pAccent2") {
        const target = event.target.id === "pAccent" ? "#pAccentText" : "#pAccent2Text";
        $(target).value = event.target.value;
      }
      updateProductPreview();
    });
    $("#pAccentText")?.addEventListener("input", (event) => {
      if (/^#[0-9a-f]{6}$/i.test(event.target.value)) $("#pAccent").value = event.target.value;
      updateProductPreview();
    });
    $("#pAccent2Text")?.addEventListener("input", (event) => {
      if (/^#[0-9a-f]{6}$/i.test(event.target.value)) $("#pAccent2").value = event.target.value;
      updateProductPreview();
    });
    $$("[data-close-product]").forEach((node) => node.addEventListener("click", () => closeDrawer("productDrawer")));
    $$("[data-close-order]").forEach((node) => node.addEventListener("click", () => closeDrawer("orderDrawer")));
    $$("[data-close-confirm]").forEach((node) => node.addEventListener("click", closeConfirm));

    $("#orderSearch")?.addEventListener("input", (event) => {
      state.orderQuery = event.target.value;
      renderOrders();
    });
    $("#orderStatusFilter")?.addEventListener("change", (event) => {
      state.orderStatus = event.target.value;
      renderOrders();
    });
    $("#ordersBody")?.addEventListener("change", (event) => {
      const select = event.target.closest("[data-order-status]");
      if (!select) return;
      Store.updateOrder(select.dataset.orderStatus, { status: select.value });
      renderOrders();
      renderDashboard();
      toast(`${select.dataset.orderStatus} marked ${select.value}`);
    });
    $("#ordersBody")?.addEventListener("click", (event) => {
      const view = event.target.closest("[data-order-view]");
      if (view) openOrder(view.dataset.orderView);
    });
    $("#recentOrdersBody")?.addEventListener("click", (event) => {
      const view = event.target.closest("[data-order-view]");
      if (view) openOrder(view.dataset.orderView);
    });
    $("#orderDetailBody")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-save-order]");
      if (button) saveOrderDetail(button.dataset.saveOrder);
    });
    $("#exportOrdersBtn")?.addEventListener("click", () => {
      const rows = [["ORDER", "DATE", "CUSTOMER", "EMAIL", "STATUS", "ITEMS", "SUBTOTAL", "DISCOUNT", "SHIPPING", "TOTAL"]];
      Store.getOrders().forEach((order) =>
        rows.push([
          order.id,
          order.createdAt,
          order.customer?.name || "",
          order.customer?.email || "",
          order.status,
          itemCount(order),
          order.subtotal,
          order.discount,
          order.shipping,
          order.total,
        ])
      );
      downloadCsv("neo-gaming-orders.csv", rows);
      toast("Orders exported as CSV");
    });

    $$("[data-inv-tab]").forEach((tab) => {
      tab.addEventListener("click", () => {
        state.inventoryTab = tab.dataset.invTab;
        $$("[data-inv-tab]").forEach((entry) => entry.classList.toggle("is-active", entry === tab));
        $("#inventoryHardwarePanel").hidden = state.inventoryTab !== "hardware";
        $("#inventoryPartsPanel").hidden = state.inventoryTab !== "parts";
        renderInventory();
      });
    });
    $("#inventorySearch")?.addEventListener("input", (event) => {
      state.inventoryQuery = event.target.value;
      renderHardwareInventory();
    });
    $("#inventoryBody")?.addEventListener("change", (event) => {
      const input = event.target.closest("[data-stock-input]");
      if (input) saveStock(input.dataset.stockInput, input.value);
    });
    $("#inventoryBody")?.addEventListener("click", (event) => {
      const step = event.target.closest("[data-stock-step]");
      if (!step) return;
      const row = step.closest("tr");
      const input = row.querySelector("[data-stock-input]");
      const id = step.dataset.productId;
      const value = Math.max(0, Number(input.value) + Number(step.dataset.stockStep));
      input.value = String(value);
      saveStock(id, value);
    });
    $("#partSearchAdmin")?.addEventListener("input", (event) => {
      state.partQuery = event.target.value;
      renderParts();
    });
    $("#partCategoryFilter")?.addEventListener("change", (event) => {
      state.partCategory = event.target.value;
      renderParts();
    });
    $("#partsBody")?.addEventListener("change", (event) => {
      const price = event.target.closest("[data-part-price]");
      const active = event.target.closest("[data-part-active]");
      if (price) {
        Store.updatePart(price.dataset.partCat, price.dataset.partPrice, { price: Math.max(0, Number(price.value) || 0) });
        toast("Component price saved");
      }
      if (active) {
        Store.updatePart(active.dataset.partCat, active.dataset.partActive, { active: active.checked });
        renderParts();
        toast(`Component ${active.checked ? "published" : "hidden"}`);
      }
    });

    $("#dropForm")?.addEventListener("submit", saveDrop);
    [
      "dropActive",
      "dropHeadlineTop",
      "dropHeadlineBottom",
      "dropDescription",
      "dropProductShort",
      "dropCtaInput",
      "dropCodeInput",
      "dropEditionInput",
      "dropPriceInput",
      "dropCompareInput",
      "dropUnitsInput",
      "dropViewersInput",
      "dropClaimedRange",
      "dropEndsAt",
    ].forEach((id) => {
      document.getElementById(id)?.addEventListener("input", updateDropPreview);
      document.getElementById(id)?.addEventListener("change", updateDropPreview);
    });
    $("#startDropBtn")?.addEventListener("click", () => {
      const drop = Store.getDrop();
      Store.saveDrop({ ...drop, active: true, endsAt: Date.now() + 48 * 3600000 });
      renderDrop();
      renderDashboard();
      toast("48-hour drop window opened");
    });
    $("#closeDropBtn")?.addEventListener("click", () => {
      openConfirm({
        title: "Close the loot drop?",
        text: "The storefront crate will show as closed and the CTA will be disabled.",
        label: "CLOSE DROP",
        onConfirm: () => {
          Store.saveDrop({ ...Store.getDrop(), active: false, endsAt: Date.now() });
          renderDrop();
          renderDashboard();
          toast("Loot drop closed", "success");
        },
      });
    });

    $("#customerSearch")?.addEventListener("input", (event) => {
      state.customerQuery = event.target.value;
      renderCustomers();
    });
    $("#addSubscriberForm")?.addEventListener("submit", addSubscriber);
    $("#exportCustomersBtn")?.addEventListener("click", () => {
      const rows = [["NAME", "EMAIL", "SOURCE", "ORDERS", "SPEND", "JOINED", "LAST ORDER"]];
      Store.getCustomers().forEach((customer) =>
        rows.push([
          customer.name,
          customer.email,
          customer.source,
          customer.orders,
          customer.spend,
          customer.joinedAt || "",
          customer.lastOrder || "",
        ])
      );
      downloadCsv("neo-gaming-customers.csv", rows);
      toast("Customers exported as CSV");
    });

    $("#storeSettingsForm")?.addEventListener("submit", saveSettings);
    $("#promoForm")?.addEventListener("submit", addPromo);
    $("#promoList")?.addEventListener("change", (event) => {
      const active = event.target.closest("[data-promo-active]");
      if (active) togglePromo(active.dataset.promoActive, active.checked);
    });
    $("#promoList")?.addEventListener("click", (event) => {
      const remove = event.target.closest("[data-delete-promo]");
      if (remove) deletePromo(remove.dataset.deletePromo);
    });
    $("#resetDemoBtn")?.addEventListener("click", () => {
      openConfirm({
        title: "Reset all demo data?",
        text: "This restores the seeded catalog, sample orders, customers, parts, promos and drop settings. Your current edits will be lost.",
        label: "RESET EVERYTHING",
        onConfirm: () => {
          Store.ensureSeeded(true);
          syncGlobalLabels();
          syncNavCounts();
          populateSettingsForm();
          renderPromoList();
          renderView(state.view);
          toast("Demo store reset", "success");
        },
      });
    });

    $("#confirmOk")?.addEventListener("click", () => {
      const callback = state.confirmCallback;
      closeConfirm();
      if (typeof callback === "function") callback();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if ($("#confirmDialog").classList.contains("is-open")) {
        closeConfirm();
        return;
      }
      if ($("#productDrawer").classList.contains("is-open")) {
        closeDrawer("productDrawer");
        return;
      }
      if ($("#orderDrawer").classList.contains("is-open")) {
        closeDrawer("orderDrawer");
        return;
      }
      closeMobileSidebar();
    });

    window.addEventListener("hashchange", () => {
      const requested = (window.location.hash || "").replace("#", "");
      if (VIEW_META[requested] && requested !== state.view) navigate(requested, false);
    });

    window.addEventListener("storage", () => {
      syncNavCounts();
      if (state.authed) renderView(state.view);
    });
  }

  function renderNavCountsSafe() {
    syncNavCounts();
  }

  function startTimers() {
    if (state.timersStarted) return;
    state.timersStarted = true;
    window.setInterval(() => {
      updateDropClocks();
      const now = new Date();
      const label = $("#todayLabel");
      if (label) {
        label.textContent = now
          .toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
          .toUpperCase();
      }
    }, 1000);
  }

  function initPartCategoryOptions() {
    const select = $("#partCategoryFilter");
    if (!select || select.options.length > 1) return;
    D.builderCategories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.label;
      select.appendChild(option);
    });
  }

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */
  function boot() {
    Store.ensureSeeded();
    bindLoginEvents();
    bindAdminEvents();
    initPartCategoryOptions();
    updateDateLabel();
    if (getRemembered()) {
      openConsole(true);
    } else {
      showLogin();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
