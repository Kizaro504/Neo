/* temporary QA for Neo Gaming storefront + admin */
const fs = require("fs");
const PORT = 9335;
const BASE = "http://127.0.0.1:4173";

(async () => {
  const targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const errors = [];
  let recording = false;

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
      return;
    }
    if (!recording) return;
    if (message.method === "Runtime.exceptionThrown") {
      errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    }
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
      errors.push(message.params.args.map((a) => a.value || a.description || a.type).join(" "));
    }
    if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
      errors.push(message.params.entry.text);
    }
  });

  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const callId = ++id;
      pending.set(callId, resolve);
      ws.send(JSON.stringify({ id: callId, method, params }));
    });

  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.result?.exceptionDetails) throw new Error(result.result.exceptionDetails.exception?.description || "Evaluation error");
    return result.result?.result?.value;
  };
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const viewport = async (width, height, mobile = false) => {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile,
      screenWidth: width,
      screenHeight: height,
    });
    await wait(400);
  };
  const shot = async (name) => {
    const result = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
    fs.writeFileSync(`screenshots/${name}.png`, Buffer.from(result.result.data, "base64"));
    console.log("shot", name);
  };
  const log = (name, value) => console.log(name, JSON.stringify(value));

  await send("Runtime.enable");
  await send("Log.enable");
  await send("Page.enable");
  await viewport(1440, 1000);
  await send("Page.navigate", { url: `${BASE}/?qa=neo` });
  await wait(2500);
  recording = true;
  await wait(500);

  const storeInfo = await evaluate(`(() => {
    const logo = document.querySelector('.brand__logo--dark');
    return {
      title: document.title,
      logoLoaded: !!logo && logo.complete && logo.naturalWidth > 0,
      logoNatural: logo ? [logo.naturalWidth, logo.naturalHeight] : null,
      logoDisplay: logo ? [logo.clientWidth, logo.clientHeight] : null,
      hero: document.querySelectorAll('.hero-slide').length,
      products: document.querySelectorAll('.product-card').length,
      firstProduct: document.querySelector('.product-card__title')?.textContent.trim(),
      inStock: document.querySelector('#inStockCount')?.textContent,
      dropName: document.querySelector('#dropProductName')?.textContent.trim(),
      dropStatus: document.querySelector('#dropStatusChip')?.textContent.trim(),
      storeKeys: Object.keys(localStorage).filter(k => k.startsWith('neo_')),
    };
  })()`);
  log("STOREFRONT", storeInfo);
  await shot("neo-storefront");

  // Admin page
  await send("Page.navigate", { url: `${BASE}/admin.html` });
  await wait(2000);
  const loginInfo = await evaluate(`(() => ({
    loginVisible: !document.querySelector('#loginGate').hidden,
    appHidden: document.querySelector('#adminApp').hidden,
    logoLoaded: (() => { const i=document.querySelector('.login-brand img'); return !!i && i.complete && i.naturalWidth>0; })(),
    title: document.title
  }))()`);
  log("ADMIN_LOGIN", loginInfo);
  await shot("neo-admin-login");

  await evaluate(`document.querySelector('#demoFill').click()`);
  await wait(200);
  await evaluate(`document.querySelector('#adminLoginForm').requestSubmit()`);
  await wait(1300);
  const dashInfo = await evaluate(`(() => ({
    appVisible: !document.querySelector('#adminApp').hidden,
    kpis: document.querySelectorAll('.kpi-card').length,
    revenue: document.querySelector('.kpi-card__value')?.textContent,
    recentRows: document.querySelectorAll('#recentOrdersBody tr').length,
    lowStockRows: document.querySelectorAll('#lowStockList .low-stock-item').length,
    viewTitle: document.querySelector('#viewTitle')?.textContent,
    dropName: document.querySelector('#dropOverviewName')?.textContent,
    partFilterOptions: document.querySelector('#partCategoryFilter')?.options.length
  }))()`);
  log("ADMIN_DASHBOARD", dashInfo);
  await shot("neo-admin-dashboard");

  // Product view
  await evaluate(`document.querySelector('[data-view="products"]').click()`);
  await wait(700);
  await shot("neo-admin-products");
  const productInfo = await evaluate(`(() => ({
    rows: document.querySelectorAll('#productsBody tr').length,
    stats: document.querySelectorAll('#productStats .mini-stat').length,
    firstCell: document.querySelector('#productsBody .product-cell__copy strong')?.textContent
  }))()`);
  log("ADMIN_PRODUCTS", productInfo);

  // Orders view
  await evaluate(`document.querySelector('[data-view="orders"]').click()`);
  await wait(700);
  await shot("neo-admin-orders");
  log("ADMIN_ORDERS", await evaluate(`({rows: document.querySelectorAll('#ordersBody tr').length, stats: document.querySelectorAll('#orderStats .mini-stat').length})`));

  // Drop view
  await evaluate(`document.querySelector('[data-view="drops"]').click()`);
  await wait(700);
  await shot("neo-admin-drop");
  log("ADMIN_DROP", await evaluate(`({headline: document.querySelector('#dropHeadlineTop').value, countdown: document.querySelector('#adminDropCountdown').textContent})`));

  // Settings view
  await evaluate(`document.querySelector('[data-view="settings"]').click()`);
  await wait(700);
  await shot("neo-admin-settings");
  log("ADMIN_SETTINGS", await evaluate(`({promos: document.querySelectorAll('#promoList .promo-row').length, storeName: document.querySelector('#settingStoreName').value})`));

  // Customers
  await evaluate(`document.querySelector('[data-view="customers"]').click()`);
  await wait(600);
  await shot("neo-admin-customers");
  log("ADMIN_CUSTOMERS", await evaluate(`({rows: document.querySelectorAll('#customersBody tr').length, stats: document.querySelectorAll('#customerStats .mini-stat').length})`));

  // Inventory
  await evaluate(`document.querySelector('[data-view="inventory"]').click()`);
  await wait(600);
  await shot("neo-admin-inventory");
  log("ADMIN_INVENTORY", await evaluate(`({rows: document.querySelectorAll('#inventoryBody tr').length, partsTab: !!document.querySelector('[data-inv-tab="parts"]')})`));
  await evaluate(`document.querySelector('[data-inv-tab="parts"]').click()`);
  await wait(500);
  await shot("neo-admin-parts");
  log("ADMIN_PARTS", await evaluate(`({rows: document.querySelectorAll('#partsBody tr').length, options: document.querySelector('#partCategoryFilter').options.length})`));

  // Mobile storefront
  await viewport(390, 844, true);
  await send("Page.navigate", { url: `${BASE}/?qa=neo-mobile` });
  await wait(2400);
  await evaluate(`window.scrollTo(0,0)`);
  await wait(400);
  await shot("neo-mobile-storefront");

  await viewport(390, 844, true);
  await send("Page.navigate", { url: `${BASE}/admin.html` });
  await wait(1800);
  await shot("neo-admin-mobile-login");
  await evaluate(`document.querySelector('#demoFill').click()`);
  await evaluate(`document.querySelector('#adminLoginForm').requestSubmit()`);
  await wait(1300);
  await shot("neo-admin-mobile-dashboard");

  console.log("ERRORS", JSON.stringify(errors, null, 2));
  ws.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
