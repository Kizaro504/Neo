/* temporary integration QA: admin changes -> storefront -> checkout -> admin */
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
    if (result.result?.exceptionDetails) throw new Error(result.result.exceptionDetails.exception?.description || "Eval error");
    return result.result?.result?.value;
  };
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const check = (name, cond, detail = "") => console.log(cond ? "PASS" : "FAIL", name, detail || "");
  const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  await send("Runtime.enable");
  await send("Log.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false, screenWidth: 1440, screenHeight: 1000 });

  await send("Page.navigate", { url: `${BASE}/?qa=reset` });
  await wait(1800);
  await evaluate(`localStorage.clear(); sessionStorage.clear();`);
  await send("Page.navigate", { url: `${BASE}/admin.html` });
  await wait(1600);
  recording = true;

  check("Admin gate visible", await evaluate(`!document.querySelector('#loginGate').hidden`));
  await evaluate(`document.querySelector('#adminEmail').value='wrong@neo.gg'; document.querySelector('#adminPassword').value='bad'; document.querySelector('#adminLoginForm').requestSubmit();`);
  await wait(300);
  check("Wrong credentials rejected", (await evaluate(`document.querySelector('#loginError').textContent`)).includes("ACCESS DENIED"));

  await evaluate(`document.querySelector('#demoFill').click()`);
  await evaluate(`document.querySelector('#adminLoginForm').requestSubmit()`);
  await wait(1100);
  check("Admin login succeeds", await evaluate(`!document.querySelector('#adminApp').hidden`));
  check("Admin seeded orders", (await evaluate(`document.querySelectorAll('#recentOrdersBody tr').length`)) === 5);

  // Create a product through the admin drawer.
  await evaluate(`document.querySelector('[data-view="products"]').click()`);
  await wait(500);
  await evaluate(`document.querySelector('#addProductBtn').click()`);
  await wait(500);
  check("Product drawer opens", await evaluate(`document.querySelector('#productDrawer').classList.contains('is-open')`));
  await evaluate(`(() => {
    const set = (id, value) => { const el=document.getElementById(id); el.value=value; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); };
    set('pName','Neo Test Keyboard');
    set('pBrand','NEO LABS');
    set('pCategory','Peripherals');
    set('pArt','keyboard');
    set('pPrice','149');
    set('pWas','199');
    set('pStock','6');
    set('pRating','4.9');
    set('pReviews','42');
    set('pBadge','TEST DROP');
    set('pSpecs','HOT SWAP, 8K POLLING, RGB');
    set('pDescription','A temporary test keyboard for the integration QA.');
    set('pKeywords','test keyboard neo');
    set('pAccent','#7bd64f');
    set('pAccent2','#00ff66');
    document.querySelector('#productForm').requestSubmit();
  })()`);
  await wait(700);
  check("Product created in admin", (await evaluate(`document.querySelectorAll('#productsBody tr').length`)) === 11);
  check("Product persisted", (await evaluate(`window.NeoStore.getProducts(false).some(p => p.name === 'Neo Test Keyboard')`)));

  // Verify it on storefront.
  await send("Page.navigate", { url: `${BASE}/?qa=after-product` });
  await wait(2400);
  const storefrontHasTest = await evaluate(`Array.from(document.querySelectorAll('.product-card__title')).some(el => el.textContent.includes('Neo Test Keyboard'))`);
  check("Admin product appears on storefront", storefrontHasTest);
  check("Managed stock shown in armory", (await evaluate(`document.querySelector('#inStockCount').textContent`)) !== "164");

  // Back to admin and delete the test product.
  await send("Page.navigate", { url: `${BASE}/admin.html#products` });
  await wait(1800);
  check("Admin session persists on navigation", await evaluate(`!document.querySelector('#adminApp').hidden`));
  await evaluate(`document.querySelector('[data-view="products"]').click()`);
  await wait(300);
  const testRowExists = await evaluate(`Array.from(document.querySelectorAll('#productsBody tr')).some(tr => tr.textContent.includes('Neo Test Keyboard'))`);
  check("Test product listed", testRowExists);
  await evaluate(`(() => {
    const row = Array.from(document.querySelectorAll('#productsBody tr')).find(tr => tr.textContent.includes('Neo Test Keyboard'));
    row.querySelector('[data-delete-product]').click();
  })()`);
  await wait(300);
  await evaluate(`document.querySelector('#confirmOk').click()`);
  await wait(500);
  check("Product deletion succeeds", !(await evaluate(`window.NeoStore.getProducts(false).some(p => p.name === 'Neo Test Keyboard')`)));

  // Inventory stock change + storefront sold-out behavior.
  await evaluate(`document.querySelector('[data-view="inventory"]').click()`);
  await wait(450);
  const firstStockId = await evaluate(`document.querySelector('[data-stock-input]').dataset.stockInput`);
  await evaluate(`(() => { const input=document.querySelector('[data-stock-input]'); input.value='0'; input.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  await wait(500);
  check("Stock update persists", (await evaluate(`window.NeoStore.getProducts(false).find(p => p.id === ${JSON.stringify(firstStockId)}).stock`)) === 0);

  await send("Page.navigate", { url: `${BASE}/?qa=stock` });
  await wait(2400);
  const soldOutInfo = await evaluate(`(() => {
    const card = Array.from(document.querySelectorAll('.product-card')).find(c => c.dataset.productId === ${JSON.stringify(firstStockId)});
    return { exists: !!card, sold: card?.classList.contains('is-soldout'), disabled: card?.querySelector('[data-add]')?.disabled, label: card?.querySelector('.add-btn__text')?.textContent };
  })()`);
  check("Storefront honors sold-out stock", soldOutInfo.sold && soldOutInfo.disabled, JSON.stringify(soldOutInfo));

  // Restore stock to 3.
  await send("Page.navigate", { url: `${BASE}/admin.html#inventory` });
  await wait(1600);
  await evaluate(`document.querySelector('[data-view="inventory"]').click()`);
  await wait(400);
  await evaluate(`(() => { const input=Array.from(document.querySelectorAll('[data-stock-input]')).find(i=>i.dataset.stockInput===${JSON.stringify(firstStockId)}); input.value='3'; input.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  await wait(400);

  // Part pricing change.
  await evaluate(`document.querySelector('[data-inv-tab="parts"]').click()`);
  await wait(400);
  await evaluate(`(() => { const input=document.querySelector('#partsBody [data-part-price]'); input.value='499'; input.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  await wait(400);
  const cpuPrice = await evaluate(`window.NeoStore.getParts().find(p => p.category === 'cpu' && p.id === 'amd-9800x3d').price`);
  check("Part price admin update persists", cpuPrice === 499);

  await send("Page.navigate", { url: `${BASE}/?qa=parts` });
  await wait(2400);
  const optionPrice = await evaluate(`Array.from(document.querySelectorAll('.part-category[data-category="cpu"] .part-option')).find(el => el.textContent.includes('Ryzen 7 9800X3D'))?.querySelector('.part-option__price')?.textContent.trim()`);
  check("Storefront builder reads part price", optionPrice === "$499", optionPrice || "not found");

  // Restore part price.
  await send("Page.navigate", { url: `${BASE}/admin.html#inventory` });
  await wait(1500);
  await evaluate(`document.querySelector('[data-view="inventory"]').click(); document.querySelector('[data-inv-tab="parts"]').click()`);
  await wait(400);
  await evaluate(`(() => { const input=document.querySelector('#partsBody [data-part-price]'); input.value='479'; input.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  await wait(300);

  // Drop change.
  await evaluate(`document.querySelector('[data-view="drops"]').click()`);
  await wait(400);
  await evaluate(`(() => { const h=document.querySelector('#dropHeadlineTop'); h.value='TEST FRAME'; h.dispatchEvent(new Event('input',{bubbles:true})); const r=document.querySelector('#dropClaimedRange'); r.value='90'; r.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('#dropForm').requestSubmit(); })()`);
  await wait(500);
  await send("Page.navigate", { url: `${BASE}/?qa=drop` });
  await wait(2400);
  const dropInfo = await evaluate(`({ top: document.querySelector('#dropHeadingTop').textContent, claimed: document.querySelector('#dropClaimed').textContent })`);
  check("Storefront reads managed drop", dropInfo.top === "TEST FRAME" && dropInfo.claimed === "90%", JSON.stringify(dropInfo));

  // Restore drop.
  await send("Page.navigate", { url: `${BASE}/admin.html#drops` });
  await wait(1500);
  await evaluate(`document.querySelector('[data-view="drops"]').click()`);
  await wait(300);
  await evaluate(`(() => { const h=document.querySelector('#dropHeadlineTop'); h.value='THE FRAME'; const r=document.querySelector('#dropClaimedRange'); r.value='84'; document.querySelector('#dropForm').requestSubmit(); })()`);
  await wait(350);

  // Promo code creation and storefront use.
  await evaluate(`document.querySelector('[data-view="settings"]').click()`);
  await wait(350);
  await evaluate(`(() => { document.querySelector('#promoCode').value='TEST25'; document.querySelector('#promoRate').value='25'; document.querySelector('#promoLabel').value='QA LOOT'; document.querySelector('#promoForm').requestSubmit(); })()`);
  await wait(400);
  check("Promo created in admin", await evaluate(`window.NeoStore.getPromos().some(p => p.code === 'TEST25')`));

  await send("Page.navigate", { url: `${BASE}/?qa=promo` });
  await wait(2400);
  await evaluate(`document.querySelector('.product-card [data-add]').click()`);
  await wait(300);
  await evaluate(`document.querySelector('#cartTrigger').click()`);
  await wait(400);
  await evaluate(`(() => { document.querySelector('#promoInput').value='TEST25'; document.querySelector('#applyPromo').click(); })()`);
  await wait(400);
  check("Storefront applies admin promo", (await evaluate(`document.querySelector('#cartDiscount').textContent`)).startsWith("−$"));
  await evaluate(`document.querySelector('.cart-drawer [data-close="cart"]').click()`);
  await wait(250);

  // Checkout creates an order and decrements stock.
  const firstProductId = await evaluate(`document.querySelector('.product-card').dataset.productId`);
  const stockBefore = await evaluate(`window.NeoStore.getProducts(false).find(p=>p.id===${JSON.stringify(firstProductId)}).stock`);
  await evaluate(`document.querySelector('#cartTrigger').click()`);
  await wait(300);
  await evaluate(`document.querySelector('#checkoutBtn').click()`);
  await wait(1600);
  const orderRef = await evaluate(`document.querySelector('#orderRef').textContent`);
  check("Checkout creates NG order ref", orderRef.startsWith("NG-"), orderRef);
  check("Checkout success modal", await evaluate(`document.querySelector('#successModal').classList.contains('is-open')`));
  check("Checkout decrements stock", (await evaluate(`window.NeoStore.getProducts(false).find(p=>p.id===${JSON.stringify(firstProductId)}).stock`)) === stockBefore - 1);
  check("Order saved to admin store", await evaluate(`window.NeoStore.getOrders().some(o => o.id === ${JSON.stringify(orderRef)})`));
  await evaluate(`document.querySelector('#successModal [data-close="success"]').click()`);
  await wait(300);

  // Admin sees order and can update it.
  await send("Page.navigate", { url: `${BASE}/admin.html#orders` });
  await wait(1600);
  await evaluate(`document.querySelector('[data-view="orders"]').click()`);
  await wait(400);
  const orderListed = await evaluate(`Array.from(document.querySelectorAll('#ordersBody tr')).some(tr => tr.textContent.includes(${JSON.stringify(orderRef)}))`);
  check("New order appears in admin", orderListed);
  await evaluate(`(() => {
    const row = Array.from(document.querySelectorAll('#ordersBody tr')).find(tr => tr.textContent.includes(${JSON.stringify(orderRef)}));
    const select = row.querySelector('[data-order-status]');
    select.value='Shipped';
    select.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await wait(450);
  check("Admin can update order status", (await evaluate(`window.NeoStore.getOrders().find(o => o.id === ${JSON.stringify(orderRef)}).status`)) === "Shipped");

  // Newsletter -> customer management.
  await send("Page.navigate", { url: `${BASE}/?qa=news` });
  await wait(2400);
  await evaluate(`(() => { document.querySelector('#newsletterEmail').value='qa.operator@neogaming.gg'; document.querySelector('#newsletterConsent').checked=true; document.querySelector('#newsletterForm').requestSubmit(); })()`);
  await wait(500);
  check("Newsletter stores operator", await evaluate(`window.NeoStore.getSubscribers().some(s => s.email === 'qa.operator@neogaming.gg')`));
  await send("Page.navigate", { url: `${BASE}/admin.html#customers` });
  await wait(1600);
  await evaluate(`document.querySelector('[data-view="customers"]').click()`);
  await wait(400);
  check("Admin sees newsletter operator", await evaluate(`Array.from(document.querySelectorAll('#customersBody tr')).some(tr => tr.textContent.includes('qa.operator@neogaming.gg'))`));

  // Open drawers to verify visuals + no errors.
  await evaluate(`document.querySelector('[data-view="orders"]').click()`);
  await wait(300);
  await evaluate(`document.querySelector('#ordersBody [data-order-view]').click()`);
  await wait(400);
  check("Order detail drawer opens", await evaluate(`document.querySelector('#orderDrawer').classList.contains('is-open')`));
  await evaluate(`document.querySelector('[data-close-order]').click()`);
  await wait(250);

  check("No runtime errors", errors.length === 0, errors.join(" | "));

  // Reset all demo data to leave a clean deliverable state.
  await evaluate(`window.NeoStore.ensureSeeded(true)`);
  console.log("TEST_ORDER", orderRef);
  console.log("RESET_DONE");
  ws.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
