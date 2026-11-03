/* ==========================================================================
   NEO GAMING — shared store data layer
   Storefront + admin console both read and write these local records.
   The layer is intentionally backend-agnostic: swap the read/write functions
   for API calls when connecting a production database.
   ========================================================================== */

(function () {
  "use strict";

  const KEYS = {
    products: "neo_products_v1",
    orders: "neo_orders_v1",
    subscribers: "neo_subscribers_v1",
    settings: "neo_settings_v1",
    drop: "neo_drop_v1",
    parts: "neo_parts_v1",
    promos: "neo_promos_v1",
    catalogVersion: "neo_catalog_version_v1",
  };

  const DEFAULT_SETTINGS = {
    storeName: "Neo Gaming",
    legalName: "Neo Gaming",
    supportEmail: "support@neogaming.gg",
    adminEmail: "admin@neogaming.gg",
    freeShippingThreshold: 99,
    standardShipping: 12,
    lowStockThreshold: 4,
    announcement: "FREE NEXT-DAY DROP // ORDERS $99+ // NEO MEMBERS GET +5% LOOT",
    heroEyebrow: "NEXT-GEN DROP 04",
    currency: "USD",
    address: "Sector 7 // Neo District",
    authNote: "Demo admin session. Replace with server-side auth in production.",
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      const parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (err) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  function ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
  }

  function stockLabel(stock) {
    const value = Math.max(0, Number(stock) || 0);
    if (value === 0) return "SOLD OUT";
    if (value === 1) return "ONLY 1 LEFT";
    if (value <= 4) return `${value} LEFT IN STOCK`;
    return `${value} UNITS READY`;
  }

  function withMeta(product) {
    return {
      ...product,
      price: Number(product.price) || 0,
      was: Number(product.was) || 0,
      stock: Math.max(0, Number(product.stock) || 0),
      rating: Math.min(5, Math.max(0, Number(product.rating) || 4.8)),
      reviews: Math.max(0, Number(product.reviews) || 0),
      specs: Array.isArray(product.specs) ? product.specs : [],
      active: product.active !== false,
      stockLabel: stockLabel(product.stock),
    };
  }

  function defaultProducts() {
    const data = window.HX_DATA;
    if (!data) return [];
    return data.products.map((product, index) => ({
      ...clone(product),
      active: true,
      createdAt: Date.now() - (data.products.length - index) * 86400000,
    }));
  }

  function seededOrders(products) {
    const byId = new Map(products.map((product) => [product.id, product]));
    const defs = [
      {
        id: "NG-842190",
        name: "Aarav Mehta",
        email: "aarav.mehta@example.com",
        daysAgo: 0.18,
        status: "Processing",
        items: [["asus-rog-scar-18", 1]],
        promo: null,
      },
      {
        id: "NG-841877",
        name: "Mira Chen",
        email: "mira.chen@example.com",
        daysAgo: 0.65,
        status: "Packed",
        items: [["ps5-pro", 1], ["steelseries-arctis-nova-pro", 1]],
        promo: "NOVA10",
      },
      {
        id: "NG-841301",
        name: "Elias Varga",
        email: "elias.varga@example.com",
        daysAgo: 1.4,
        status: "Shipped",
        items: [["nvidia-rtx-5090", 1], ["rog-swift-oled-27", 1]],
        promo: null,
      },
      {
        id: "NG-840774",
        name: "Sana Karki",
        email: "sana.karki@example.com",
        daysAgo: 2.1,
        status: "Delivered",
        items: [["razer-blackwidow-v4-pro", 1]],
        promo: "RESISTANCE5",
      },
      {
        id: "NG-839982",
        name: "Theo Brooks",
        email: "theo.brooks@example.com",
        daysAgo: 3.8,
        status: "Delivered",
        items: [["xbox-series-x", 1], ["meta-quest-3", 1]],
        promo: null,
      },
      {
        id: "NG-839414",
        name: "Ishani Rao",
        email: "ishani.rao@example.com",
        daysAgo: 5.2,
        status: "Delivered",
        items: [["razer-blade-16", 1]],
        promo: "NOVA10",
      },
      {
        id: "NG-838601",
        name: "Noah Fischer",
        email: "noah.fischer@example.com",
        daysAgo: 7.4,
        status: "Cancelled",
        items: [["asus-astral-5080", 1]],
        promo: null,
      },
    ];

    return defs.map((definition) => {
      const items = definition.items
        .map(([productId, qty]) => {
          const product = byId.get(productId);
          if (!product) return null;
          return {
            productId: product.id,
            name: product.name,
            brand: product.brand,
            art: product.art,
            accent: product.accent,
            accent2: product.accent2,
            specs: product.specs,
            price: product.price,
            qty,
          };
        })
        .filter(Boolean);
      const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
      const promo = definition.promo
        ? (window.HX_DATA && window.HX_DATA.promoCodes && window.HX_DATA.promoCodes[definition.promo]) || null
        : null;
      const discount = promo ? Math.round(subtotal * promo.rate * 100) / 100 : 0;
      const shipping = subtotal - discount >= 99 ? 0 : 12;
      return {
        id: definition.id,
        customer: { name: definition.name, email: definition.email },
        items,
        subtotal,
        discount,
        shipping,
        total: Math.round((subtotal - discount + shipping) * 100) / 100,
        promo: definition.promo,
        status: definition.status,
        payment: "Card // simulated",
        source: "Storefront",
        createdAt: new Date(Date.now() - definition.daysAgo * 86400000).toISOString(),
        note: "",
      };
    });
  }

  function defaultSubscribers() {
    return [
      { email: "mira.chen@example.com", name: "Mira Chen", joinedAt: new Date(Date.now() - 2 * 86400000).toISOString(), source: "Newsletter", status: "Active" },
      { email: "theo.brooks@example.com", name: "Theo Brooks", joinedAt: new Date(Date.now() - 4 * 86400000).toISOString(), source: "Newsletter", status: "Active" },
      { email: "sana.karki@example.com", name: "Sana Karki", joinedAt: new Date(Date.now() - 6 * 86400000).toISOString(), source: "Checkout", status: "Active" },
      { email: "operator@neogaming.gg", name: "Operator Zero", joinedAt: new Date(Date.now() - 9 * 86400000).toISOString(), source: "Resistance", status: "Active" },
      { email: "noah.fischer@example.com", name: "Noah Fischer", joinedAt: new Date(Date.now() - 12 * 86400000).toISOString(), source: "Newsletter", status: "Active" },
    ];
  }

  function defaultDrop() {
    const data = window.HX_DATA;
    const base = data ? data.dropProduct : null;
    return {
      active: true,
      code: "NG-5090",
      edition: "NEBULA SERIES // 001",
      headlineTop: "THE FRAME",
      headlineBottom: "IS YOURS.",
      description:
        "One crate. 48 hours. The RTX 5090 Nebula Edition with a full custom loop, ready to obliterate 4K. When the bar hits 100%, it's gone for good.",
      productName: base ? base.name : "RTX 5090 Nebula Edition",
      productShort: "RTX 5090 NEBULA",
      price: base ? base.price : 3899,
      compareAt: base ? base.was : 4899,
      claimed: 84,
      unitsTotal: 5,
      viewers: 38,
      endsAt: Date.now() + 47.5 * 3600000,
      cta: "UNLOCK DEAL",
      active: true,
    };
  }

  function defaultPromos() {
    const codes = (window.HX_DATA && window.HX_DATA.promoCodes) || {};
    return Object.entries(codes).map(([code, promo], index) => ({
      code,
      rate: promo.rate,
      label: promo.label,
      active: true,
      uses: [18, 42, 9][index] || 0,
      createdAt: new Date(Date.now() - (index + 1) * 3 * 86400000).toISOString(),
    }));
  }

  function defaultParts() {
    const data = window.HX_DATA;
    if (!data) return [];
    return Object.entries(data.builderParts).flatMap(([category, list]) =>
      list.map((part) => ({
        category,
        id: part.id,
        brand: part.brand,
        name: part.name,
        spec: part.spec,
        price: part.price,
        active: true,
        stock: 12,
      }))
    );
  }

  function seedIfMissing(key, factory) {
    const current = read(key, null);
    if (current == null) {
      const value = factory();
      write(key, value);
      return value;
    }
    return current;
  }

  function ensureSeeded(force = false) {
    if (force) {
      Object.values(KEYS).forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch (err) {}
      });
    }
    const products = seedIfMissing(KEYS.products, () => defaultProducts());
    seedIfMissing(KEYS.orders, () => seededOrders(products));
    seedIfMissing(KEYS.subscribers, () => defaultSubscribers());
    seedIfMissing(KEYS.settings, () => ({ ...DEFAULT_SETTINGS }));
    seedIfMissing(KEYS.drop, () => defaultDrop());
    seedIfMissing(KEYS.parts, () => defaultParts());
    seedIfMissing(KEYS.promos, () => defaultPromos());
    write(KEYS.catalogVersion, 2);
    return true;
  }

  function getProducts(activeOnly = false) {
    const products = ensureArray(read(KEYS.products, defaultProducts()));
    const mapped = products.map((product, index) => withMeta({ ...product, order: Number(product.order) || index + 1 }));
    return activeOnly ? mapped.filter((product) => product.active) : mapped;
  }

  function saveProducts(products) {
    const normalized = ensureArray(products).map((product, index) => ({
      ...product,
      order: Number(product.order) || index + 1,
      active: product.active !== false,
    }));
    write(KEYS.products, normalized);
    write(KEYS.catalogVersion, Date.now());
    return normalized;
  }

  function upsertProduct(product) {
    const products = getProducts(false);
    const existingIndex = products.findIndex((item) => item.id === product.id);
    const normalized = withMeta({ ...product, id: product.id || `${slugify(product.name)}-${Date.now().toString(36).slice(-4)}` });
    if (existingIndex >= 0) products[existingIndex] = { ...products[existingIndex], ...normalized };
    else products.unshift({ ...normalized, order: 1, createdAt: new Date().toISOString() });
    saveProducts(products);
    return normalized;
  }

  function deleteProduct(id) {
    const products = getProducts(false).filter((product) => product.id !== id);
    saveProducts(products);
    return true;
  }

  function getOrders() {
    return ensureArray(read(KEYS.orders, []))
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function saveOrders(orders) {
    write(KEYS.orders, ensureArray(orders));
    return orders;
  }

  function addOrder(order) {
    const orders = getOrders();
    const record = {
      id: order.id || `NG-${Math.floor(100000 + Math.random() * 900000)}`,
      customer: order.customer || { name: "Guest Operator", email: "guest@neogaming.gg" },
      items: ensureArray(order.items),
      subtotal: Number(order.subtotal) || 0,
      discount: Number(order.discount) || 0,
      shipping: Number(order.shipping) || 0,
      total: Number(order.total) || 0,
      promo: order.promo || null,
      status: order.status || "Processing",
      payment: order.payment || "Card // simulated",
      source: order.source || "Storefront",
      createdAt: order.createdAt || new Date().toISOString(),
      note: order.note || "",
    };
    orders.unshift(record);
    saveOrders(orders);
    return record;
  }

  function updateOrder(id, patch) {
    const orders = getOrders();
    const index = orders.findIndex((order) => order.id === id);
    if (index < 0) return null;
    orders[index] = { ...orders[index], ...patch };
    saveOrders(orders);
    return orders[index];
  }

  function deleteOrder(id) {
    const orders = getOrders().filter((order) => order.id !== id);
    saveOrders(orders);
    return true;
  }

  function getSubscribers() {
    return ensureArray(read(KEYS.subscribers, [])).slice().sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));
  }

  function addSubscriber(email, name = "") {
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized) return null;
    const subscribers = getSubscribers();
    if (subscribers.some((subscriber) => subscriber.email.toLowerCase() === normalized)) {
      return subscribers.find((subscriber) => subscriber.email.toLowerCase() === normalized);
    }
    const record = {
      email: normalized,
      name: name || normalized.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      joinedAt: new Date().toISOString(),
      source: "Newsletter",
      status: "Active",
    };
    subscribers.unshift(record);
    write(KEYS.subscribers, subscribers);
    return record;
  }

  function saveSubscribers(subscribers) {
    write(KEYS.subscribers, ensureArray(subscribers));
    return subscribers;
  }

  function getSettings() {
    return { ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) };
  }

  function saveSettings(patch) {
    const next = { ...getSettings(), ...patch };
    write(KEYS.settings, next);
    return next;
  }

  function getDrop() {
    const base = defaultDrop();
    const saved = read(KEYS.drop, {});
    const merged = { ...base, ...saved };
    return {
      ...merged,
      claimed: Math.min(100, Math.max(0, Number(merged.claimed) || 0)),
      price: Number(merged.price) || base.price,
      compareAt: Number(merged.compareAt) || base.compareAt,
      unitsTotal: Number(merged.unitsTotal) || base.unitsTotal,
      viewers: Number(merged.viewers) || base.viewers,
      remainingPct: Math.max(0, 100 - Math.min(100, Number(merged.claimed) || 0)),
    };
  }

  function saveDrop(patch) {
    const next = { ...getDrop(), ...patch };
    write(KEYS.drop, next);
    return getDrop();
  }

  function getParts() {
    return ensureArray(read(KEYS.parts, defaultParts()));
  }

  function getPartMap() {
    const map = new Map();
    getParts().forEach((part) => {
      map.set(`${part.category}:${part.id}`, part);
    });
    return map;
  }

  function saveParts(parts) {
    write(KEYS.parts, ensureArray(parts));
    return parts;
  }

  function updatePart(category, id, patch) {
    const parts = getParts();
    const index = parts.findIndex((part) => part.category === category && part.id === id);
    if (index < 0) return null;
    parts[index] = { ...parts[index], ...patch };
    saveParts(parts);
    return parts[index];
  }

  function getPromos() {
    return ensureArray(read(KEYS.promos, defaultPromos()));
  }

  function getActivePromoMap() {
    return getPromos()
      .filter((promo) => promo.active !== false)
      .reduce((map, promo) => {
        map[String(promo.code).toUpperCase()] = {
          rate: Number(promo.rate) || 0,
          label: promo.label || promo.code,
        };
        return map;
      }, {});
  }

  function savePromos(promos) {
    write(KEYS.promos, ensureArray(promos));
    return promos;
  }

  function getCustomers() {
    const orders = getOrders();
    const subscribers = getSubscribers();
    const map = new Map();
    const ensure = (email, name = "") => {
      const key = String(email || "guest@neogaming.gg").toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          email: key,
          name: name || key.split("@")[0],
          orders: 0,
          spend: 0,
          joinedAt: null,
          lastOrder: null,
          source: "Storefront",
        });
      }
      return map.get(key);
    };
    subscribers.forEach((subscriber) => {
      const customer = ensure(subscriber.email, subscriber.name);
      customer.joinedAt = subscriber.joinedAt;
      customer.source = subscriber.source || "Newsletter";
    });
    orders.forEach((order) => {
      const customer = ensure(order.customer?.email, order.customer?.name);
      if (order.status !== "Cancelled") {
        customer.orders += 1;
        customer.spend += Number(order.total) || 0;
      }
      customer.lastOrder = order.createdAt;
      if (order.customer?.name) customer.name = order.customer.name;
    });
    return Array.from(map.values()).sort((a, b) => b.spend - a.spend);
  }

  function getStats() {
    const orders = getOrders();
    const products = getProducts(true);
    const settings = getSettings();
    const validOrders = orders.filter((order) => order.status !== "Cancelled");
    const revenue = validOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    const units = validOrders.reduce(
      (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + (Number(item.qty) || 0), 0),
      0
    );
    const lowStock = products.filter((product) => product.stock <= settings.lowStockThreshold).sort((a, b) => a.stock - b.stock);
    const series = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      const total = validOrders
        .filter((order) => {
          const created = new Date(order.createdAt);
          return created >= date && created < next;
        })
        .reduce((sum, order) => sum + (Number(order.total) || 0), 0);
      return {
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        value: Math.round(total),
      };
    });
    return {
      revenue,
      orderCount: orders.length,
      validOrderCount: validOrders.length,
      pendingOrders: orders.filter((order) => ["Processing", "Packed"].includes(order.status)).length,
      units,
      customers: getCustomers().length,
      lowStock,
      productCount: products.length,
      avgOrder: validOrders.length ? revenue / validOrders.length : 0,
      series,
    };
  }

  const api = {
    KEYS,
    DEFAULT_SETTINGS,
    ensureSeeded,
    read,
    write,
    makeId,
    slugify,
    stockLabel,
    getProducts,
    saveProducts,
    upsertProduct,
    deleteProduct,
    getOrders,
    saveOrders,
    addOrder,
    updateOrder,
    deleteOrder,
    getSubscribers,
    addSubscriber,
    saveSubscribers,
    getSettings,
    saveSettings,
    getDrop,
    saveDrop,
    getParts,
    getPartMap,
    saveParts,
    updatePart,
    getPromos,
    getActivePromoMap,
    savePromos,
    getCustomers,
    getStats,
  };

  window.NeoStore = api;
})();
