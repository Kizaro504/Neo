/* temporary final verification for Neo Gaming */
const fs = require("fs");
const PORT = 9337;
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
  const send = (method, params = {}) => new Promise((resolve) => {
    const callId = ++id;
    pending.set(callId, resolve);
    ws.send(JSON.stringify({ id: callId, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.result?.exceptionDetails) throw new Error(result.result.exceptionDetails.exception?.description || "Eval error");
    return result.result?.result?.value;
  };
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const shot = async (name) => {
    const result = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
    fs.writeFileSync(`screenshots/${name}.png`, Buffer.from(result.result.data, "base64"));
    console.log("shot", name);
  };
  const check = (name, cond, detail = "") => console.log(cond ? "PASS" : "FAIL", name, detail || "");
  const viewport = async (width, height, mobile = false) => {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile, screenWidth: width, screenHeight: height });
    await wait(350);
  };

  await send("Runtime.enable");
  await send("Log.enable");
  await send("Page.enable");
  await viewport(1440, 1000);

  // Fresh seed + clean screenshots.
  await send("Page.navigate", { url: `${BASE}/?qa=final-neo` });
  await wait(1800);
  await evaluate(`localStorage.clear(); sessionStorage.clear(); localStorage.removeItem('neo_admin_remember_v1'); sessionStorage.removeItem('neo_admin_session_v1');`);
  await send("Page.reload", { ignoreCache: true });
  await wait(2800);
  recording = true;
  await evaluate(`window.scrollTo(0,0)`);
  await wait(300);
  await shot("neo-final-storefront");

  // Admin login.
  await send("Page.navigate", { url: `${BASE}/admin.html` });
  await wait(1800);
  await evaluate(`document.querySelector('#demoFill').click()`);
  await evaluate(`document.querySelector('#adminLoginForm').requestSubmit()`);
  await wait(1100);
  await shot("neo-final-admin");

  // Part price readback with formatting normalized.
  await evaluate(`window.NeoStore.saveParts(window.NeoStore.getParts().map(p => p.category === 'cpu' && p.id === 'amd-9800x3d' ? {...p, price: 499} : p))`);
  await send("Page.navigate", { url: `${BASE}/?qa=partprice` });
  await wait(2200);
  const priceText = await evaluate(`Array.from(document.querySelectorAll('.part-category[data-category="cpu"] .part-option')).find(el => el.textContent.includes('Ryzen 7 9800X3D'))?.querySelector('.part-option__price')?.childNodes[0]?.textContent.trim()`);
  check("Builder applies admin part price", priceText === "$499", priceText || "not found");
  await evaluate(`window.NeoStore.saveParts(window.NeoStore.getParts().map(p => p.category === 'cpu' && p.id === 'amd-9800x3d' ? {...p, price: 479} : p))`);

  // Settings readback.
  await send("Page.navigate", { url: `${BASE}/?qa=settings` });
  await wait(2200);
  const announcement = await evaluate(`document.querySelector('#announcementTrack').textContent`);
  check("Announcement loads from settings", announcement.includes("FREE NEXT-DAY DROP"), announcement.slice(0, 70));
  const supportHref = await evaluate(`document.querySelector('#supportMailLink').getAttribute('href')`);
  check("Support mail is managed", supportHref === "mailto:support@neogaming.gg", supportHref);

  // Product modal + cart still functional after rebrand.
  await evaluate(`document.querySelector('.product-card [data-quick]').click()`);
  await wait(450);
  check("Quick view opens", await evaluate(`document.querySelector('#productModal').classList.contains('is-open')`));
  await evaluate(`document.querySelector('#productModal [data-close="product"]').click()`);
  await wait(250);
  await evaluate(`document.querySelector('.product-card [data-add]').click()`);
  await wait(300);
  check("Cart still works", (await evaluate(`document.querySelector('#cartCount').textContent`)) === "1");
  await evaluate(`document.querySelector('#cartTrigger').click()`);
  await wait(400);
  await shot("neo-final-cart");
  await evaluate(`document.querySelector('.cart-drawer [data-close="cart"]').click()`);
  await wait(250);

  // Mobile storefront + admin.
  await viewport(390, 844, true);
  await send("Page.navigate", { url: `${BASE}/?qa=mobile-neo` });
  await wait(2400);
  await evaluate(`window.scrollTo(0,0)`);
  await wait(300);
  await shot("neo-final-mobile");
  const overflow = await evaluate(`({sw:document.documentElement.scrollWidth, iw:innerWidth})`);
  check("No mobile horizontal overflow", overflow.sw <= overflow.iw, JSON.stringify(overflow));

  await send("Page.navigate", { url: `${BASE}/admin.html` });
  await wait(1400);
  check("Admin mobile session active", await evaluate(`!document.querySelector('#adminApp').hidden`));
  await shot("neo-final-admin-mobile");
  await evaluate(`document.querySelector('#sidebarToggle').click()`);
  await wait(400);
  await shot("neo-final-admin-menu");

  // Reset to clean seeded data at the end.
  await evaluate(`window.NeoStore.ensureSeeded(true)`);
  console.log("ERRORS", JSON.stringify(errors));
  ws.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
