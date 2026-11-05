import { PrismaClient } from "@prisma/client";
import type { Page } from "@playwright/test";
import { expect, expectSaved, test } from "./admin-session";

// Admin → Tracking, end to end: every field saves and shows again, and each
// one reaches the storefront in the form its platform's documentation asks
// for. Third-party scripts are stubbed, so this asserts what the site sends
// them without depending on their servers. Serial, because all of it shares
// the single `tracking` setting.
test.describe.configure({ mode: "serial" });

const PRODUCT = "/product/kids-school-bag";

const fields: Record<string, string> = {
  "Meta pixel ID": "123456789012345",
  "Meta test event code": "test12345",
  "Google Tag Manager ID": "gtm-test123",
  "Google Analytics 4 ID": "G-TEST12345",
  "Google Ads ID": "AW-123456789",
  "Google Ads conversion label": "abcDEF",
  "Search Console verification":
    '<meta name="google-site-verification" content="verifyTOKEN_123-abc" />',
  "TikTok pixel ID": "C4A1B2C3D4E5F6G7H8I9",
  "TikTok test event code": "TEST54321",
  "Pinterest tag ID": "2612345678901",
  "Snap pixel ID": "12345678-1234-1234-1234-123456789012",
  "Microsoft Clarity ID": "abcdef1234",
  "Hotjar site ID": "1234567",
  "Code for <head>": `<!-- Facebook domain -->
<meta name="facebook-domain-verification" content="fbverify123" />
<script>window.__customHead = "a < b";</script>`,
  "Code for the start of <body>":
    '<div id="custom-body-marker"></div><script>window.__customBody = true;</script>',
};

const normalised: Record<string, string> = {
  "Meta test event code": "TEST12345",
  "Google Tag Manager ID": "GTM-TEST123",
  "Search Console verification": "verifyTOKEN_123-abc",
};

const thirdParty =
  /^https:\/\/(www\.googletagmanager\.com|connect\.facebook\.net|analytics\.tiktok\.com|s\.pinimg\.com|sc-static\.net|www\.clarity\.ms|static\.hotjar\.com)\//;

async function stubThirdParty(page: Page): Promise<string[]> {
  const requested: string[] = [];
  await page.route(thirdParty, (route) => {
    requested.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "text/javascript", body: "" });
  });
  return requested;
}

/** The data layer as plain JSON: gtag's `arguments` entries become arrays. */
function dataLayer(page: Page): Promise<Record<string, unknown>[]> {
  return page.evaluate(() =>
    (window.dataLayer ?? []).map((entry) =>
      Object.prototype.toString.call(entry) === "[object Arguments]"
        ? { gtag: Array.from(entry as ArrayLike<unknown>) }
        : entry,
    ),
  ) as Promise<Record<string, unknown>[]>;
}

async function expectEvent(page: Page, event: string) {
  await expect
    .poll(async () => (await dataLayer(page)).some((row) => row.event === event), {
      timeout: 10_000,
    })
    .toBe(true);
  const rows = await dataLayer(page);
  return rows.filter((row) => row.event === event).at(-1) as {
    event_id: string;
    ecommerce: {
      currency: string;
      value: number;
      transaction_id?: string;
      items: Record<string, unknown>[];
    };
  };
}

function fbqCalls(page: Page, event: string) {
  return page.evaluate(
    (name) => (window.fbq?.queue ?? []).filter((call) => call[1] === name),
    event,
  );
}

function save(page: Page) {
  return page.getByRole("button", { name: "Save", exact: true }).click();
}

test.afterAll(async () => {
  const prisma = new PrismaClient();
  await prisma.setting.deleteMany({
    where: { key: { in: ["secret.meta", "secret.tiktok"] } },
  });
  await prisma.$disconnect();
});

test("bad input is refused with a message, and nothing is saved", async ({ page }) => {
  await page.goto("/admin/tracking");
  const status = page.locator('p[role="status"]');

  await page.getByLabel("Meta test event code").fill("admin@unibaazar.com");
  await save(page);
  await expect(status).toContainText("Enter a Meta test code");
  await page.getByLabel("Meta test event code").fill("");

  await page.getByLabel("Code for <head>").fill("<script>var unclosed = 1;");
  await save(page);
  await expect(status).toContainText("never closed");

  await page.getByLabel("Code for <head>").fill("<div>not for the head</div>");
  await save(page);
  await expect(status).toContainText("can't go in the head");

  await page.getByLabel("Google Tag Manager ID").fill("GTM-TEST123");
  await page
    .getByLabel("Code for <head>")
    .fill(
      '<script async src="https://www.googletagmanager.com/gtm.js?id=GTM-TEST123"></script>',
    );
  await save(page);
  await expect(status).toContainText("load twice");
});

test("every field saves to the database and shows again after a reload", async ({
  page,
}) => {
  await page.goto("/admin/tracking");
  for (const [label, value] of Object.entries(fields)) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByLabel("Meta conversions API token").fill("meta-token-abcd");
  await page.getByLabel("TikTok events API token").fill("tiktok-token-wxyz");
  await save(page);
  await expectSaved(page);

  await page.reload();
  for (const [label, value] of Object.entries(fields)) {
    await expect(page.getByLabel(label, { exact: true })).toHaveValue(
      normalised[label] ?? value,
    );
  }
  // Secrets stay out of the form; the hint proves each one was stored.
  await expect(page.getByLabel("Meta conversions API token")).toHaveValue("");
  await expect(page.getByText("Saved, ending in …abcd.")).toBeVisible();
  await expect(page.getByText("Saved, ending in …wxyz.")).toBeVisible();
});

test("saved fields stay out of browser autofill", async ({ page }) => {
  await page.goto("/admin/tracking");
  await expect(page.getByLabel("Meta conversions API token")).toHaveAttribute(
    "autocomplete",
    "new-password",
  );
  await expect(page.getByLabel("Meta test event code")).toHaveAttribute(
    "autocomplete",
    "off",
  );
});

test("the raw HTML carries each tag where its platform requires it", async ({ page }) => {
  const response = await page.request.get("/");
  const html = await response.text();
  const [head, body] = html.split("</head>");

  await test.step("Search Console and custom head tags are in <head>", () => {
    expect(head).toContain(
      '<meta name="google-site-verification" content="verifyTOKEN_123-abc"',
    );
    expect(head).toContain(
      '<meta name="facebook-domain-verification" content="fbverify123"',
    );
    expect(head).toContain('window.__customHead = "a < b";');
  });

  await test.step("consent defaults come before GTM, and gtag uses real arguments", () => {
    const consent = head.indexOf("gtag('consent','default'");
    const gtm = head.indexOf("googletagmanager.com/gtm.js");
    expect(consent).toBeGreaterThan(-1);
    expect(gtm).toBeGreaterThan(consent);
    expect(head).toContain("function gtmGtag(){dataLayer.push(arguments);}");
    expect(head).toContain('"GTM-TEST123"');
    expect(head).toContain("gtag/js?id=G-TEST12345&amp;l=ubGtagLayer");
  });

  // Next.js puts its own empty hidden div first; everything of ours follows it.
  await test.step("GTM's noscript comes before any page content", () => {
    const noscript = body.indexOf("<noscript>");
    expect(noscript).toBeGreaterThan(-1);
    expect(body.slice(noscript)).toContain("ns.html?id=GTM-TEST123");
    expect(noscript).toBeLessThan(body.indexOf("custom-body-marker"));
    expect(noscript).toBeLessThan(body.indexOf("min-h-screen"));
  });

  await test.step("custom body code is near the start of <body>", () => {
    expect(body).toContain('<div id="custom-body-marker"></div>');
  });

  await test.step("the storefront CSP lets tags load; the admin's stays narrow", async () => {
    const storefront = response.headers()["content-security-policy"];
    expect(storefront).toContain(
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
    );
    const admin = await page.request.get("/admin/tracking");
    const adminPolicy = admin.headers()["content-security-policy"];
    expect(adminPolicy).not.toContain("https:;");
    expect(adminPolicy).not.toContain("googletagmanager");
  });
});

test("custom code really runs, with no CSP or console errors from the tags", async ({
  page,
}) => {
  const blocked: string[] = [];
  page.on("console", (message) => {
    if (/Content Security Policy/i.test(message.text())) {
      blocked.push(message.text());
    }
  });
  await stubThirdParty(page);
  await page.goto("/", { waitUntil: "networkidle" });
  expect(await page.evaluate(() => "__customBody" in window)).toBe(true);
  expect(await page.evaluate(() => "__customHead" in window)).toBe(true);
  await page.getByRole("button", { name: "Accept" }).click();
  await page.waitForLoadState("networkidle");
  expect(blocked).toEqual([]);
});

test("Google loads under denied consent; other pixels wait for Accept", async ({
  page,
}) => {
  const requested = await stubThirdParty(page);
  await page.goto(PRODUCT, { waitUntil: "networkidle" });

  await test.step("before any choice", async () => {
    expect(requested.some((url) => url.includes("gtm.js?id=GTM-TEST123"))).toBe(true);
    expect(requested.some((url) => url.includes("fbevents.js"))).toBe(false);
    expect(requested.some((url) => url.includes("analytics.tiktok.com"))).toBe(false);
    const rows = await dataLayer(page);
    expect(rows[0].gtag).toEqual([
      "consent",
      "default",
      expect.objectContaining({ analytics_storage: "denied", ad_storage: "denied" }),
    ]);
  });

  await test.step("view_item is in the data layer in GA4's ecommerce shape", async () => {
    const view = await expectEvent(page, "view_item");
    expect(view.ecommerce.currency).toBe("BDT");
    expect(view.ecommerce.value).toBeGreaterThan(0);
    expect(view.ecommerce.items[0]).toEqual(
      expect.objectContaining({
        item_id: expect.any(String),
        item_name: "Kids School Bag",
        affiliation: "UniBaazar",
        item_category: expect.any(String),
        price: expect.any(Number),
        quantity: 1,
      }),
    );
  });

  await test.step("after Accept: consent updates and every pixel starts", async () => {
    await page.getByRole("button", { name: "Accept" }).click();
    await expect.poll(() => requested.join(" ")).toContain("fbevents.js");
    const joined = requested.join(" ");
    expect(joined).toContain("analytics.tiktok.com/i18n/pixel/events.js?sdkid=C4A1B2C3");
    expect(joined).toContain("s.pinimg.com/ct/core.js");
    expect(joined).toContain("sc-static.net/scevent.min.js");
    expect(joined).toContain("clarity.ms/tag/abcdef1234");
    expect(joined).toContain("hotjar-1234567.js");
    const rows = await dataLayer(page);
    const update = rows.find(
      (row) => Array.isArray(row.gtag) && row.gtag[1] === "update",
    );
    expect(update?.gtag).toEqual([
      "consent",
      "update",
      expect.objectContaining({ analytics_storage: "granted", ad_storage: "granted" }),
    ]);
  });

  await test.step("the ViewContent raised before Accept still reaches Meta", async () => {
    const [view] = await fbqCalls(page, "ViewContent");
    expect(view[2]).toEqual(
      expect.objectContaining({
        content_type: "product",
        currency: "BDT",
        content_ids: [expect.any(String)],
      }),
    );
    expect(view[3]).toEqual({ eventID: expect.any(String) });
  });

  await test.step("TikTok, Pinterest and Snap are initialised and receive it", async () => {
    const queued = await page.evaluate(() => ({
      tiktok: Array.from(window.ttq ?? []),
      pinterest: window.pintrk?.queue ?? [],
      snap: (window.snaptr?.queue ?? []).map((call) => Array.from(call as unknown[])),
    }));
    expect(JSON.stringify(queued.tiktok)).toContain('"ViewContent"');
    expect(queued.pinterest[0]).toEqual(["load", "2612345678901"]);
    expect(JSON.stringify(queued.pinterest)).toContain('"pagevisit"');
    expect(queued.snap[0][0]).toBe("init");
    expect(JSON.stringify(queued.snap)).toContain('"VIEW_CONTENT"');
  });

  await test.step("Meta PageView has an id, and pushState can't double it", async () => {
    expect((await fbqCalls(page, "PageView")).length).toBe(1);
    expect(await page.evaluate(() => window.fbq?.disablePushState)).toBe(true);
  });
});

test("a returning shopper's first event isn't lost on a full page load", async ({
  page,
}) => {
  await stubThirdParty(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Accept" }).click();

  await page.goto(PRODUCT, { waitUntil: "networkidle" });
  await expect.poll(async () => (await fbqCalls(page, "ViewContent")).length).toBe(1);
  await expect.poll(async () => (await fbqCalls(page, "PageView")).length).toBe(1);
});

test("Reject sends nothing further, and no pixel loads", async ({ page }) => {
  const requested = await stubThirdParty(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Reject" }).click();

  const logged: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/tracking")) {
      logged.push(request.url());
    }
  });
  await page.goto(PRODUCT, { waitUntil: "networkidle" });
  expect(requested.some((url) => url.includes("fbevents.js"))).toBe(false);
  expect(logged).toEqual([]);
  const rows = await dataLayer(page);
  expect(rows.some((row) => row.event === "view_item")).toBe(false);
});

test("a full purchase: cart events, begin_checkout, purchase, and no repeat on reload", async ({
  page,
}) => {
  await stubThirdParty(page);
  await page.goto(PRODUCT, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Accept" }).click();

  await page.getByRole("button", { name: "Add to cart" }).click();
  const added = await expectEvent(page, "add_to_cart");
  const sku = added.ecommerce.items[0].item_id;
  // GTM must see each event once: gtag's own commands live on another layer.
  const layer = await dataLayer(page);
  expect(layer.filter((row) => row.event === "add_to_cart")).toHaveLength(1);
  expect(
    layer.filter((row) => Array.isArray(row.gtag) && row.gtag[0] === "event"),
  ).toEqual([]);
  expect(added.ecommerce.value).toBeGreaterThan(0);
  expect((await fbqCalls(page, "AddToCart"))[0][2]).toEqual(
    expect.objectContaining({ content_ids: [sku], currency: "BDT" }),
  );

  await page.goto("/cart");
  await expectEvent(page, "view_cart");
  const checkoutLink = page.getByRole("link", { name: "Checkout" });
  await expect(checkoutLink).toBeVisible();
  await checkoutLink.click({ force: true });
  await expect(page).toHaveURL(/\/checkout$/);
  const begin = await expectEvent(page, "begin_checkout");
  expect(begin.ecommerce.items[0].item_id).toBe(sku);

  await page.locator('input[name="name"]').fill(`Tracking Test ${Date.now()}`);
  await page.locator('input[name="phone"]').fill(`017${String(Date.now()).slice(-8)}`);
  await page.locator('textarea[name="address"]').fill("House 1, Road 1, Dhaka");
  await page.getByRole("button", { name: "Place order" }).click({ force: true });
  await expect(page).toHaveURL(/\/order-success\//, { timeout: 20_000 });

  const purchase = await expectEvent(page, "purchase");
  const orderId = page.url().split("/order-success/")[1];
  expect(purchase.ecommerce.transaction_id).toBe(orderId);
  expect(purchase.ecommerce.value).toBeGreaterThan(0);
  expect(purchase.ecommerce.items[0].item_id).toBe(sku);
  expect(purchase.ecommerce).toMatchObject({ currency: "BDT", tax: 0 });
  const customer = (purchase.ecommerce as unknown as { customer: Record<string, string> })
    .customer;
  expect(customer).toMatchObject({
    name: expect.stringContaining("Tracking Test"),
    phone: expect.stringMatching(/^017/),
    phone_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
    address_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
  });
  const [metaPurchase] = await fbqCalls(page, "Purchase");
  expect(metaPurchase[3]).toEqual({ eventID: orderId });

  await page.reload({ waitUntil: "networkidle" });
  const rows = await dataLayer(page);
  expect(rows.some((row) => row.event === "purchase")).toBe(false);
});

test("clearing the fields removes every tag from the storefront", async ({ page }) => {
  await page.goto("/admin/tracking");
  for (const label of Object.keys(fields)) {
    await page.getByLabel(label, { exact: true }).fill("");
  }
  await save(page);
  await expectSaved(page);

  const html = await (await page.request.get("/")).text();
  expect(html).not.toContain("googletagmanager");
  expect(html).not.toContain("google-site-verification");
  expect(html).not.toContain("fbverify123");
});
