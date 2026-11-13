import { expect, test } from "@playwright/test";

const example = "Metro Piramide → Città dell'Altra Economia";

test("la mappa carica con l'attribuzione OpenStreetMap visibile", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".leaflet-control-attribution")).toContainText("OpenStreetMap");
  await expect(page.locator(".leaflet-control-attribution")).toBeInViewport();
  const scrollsSideways = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(scrollsSideways).toBe(false);
});

// Usa i provider reali (Valhalla e Overpass, con snapshot di riserva): richiede la rete.
test("un tragitto reale produce percorsi con distanza, durata e copertura, senza claim di sicurezza", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: example }).click();
  await expect(page.getByRole("heading", { name: /percors[oi] disponibil[ei]/ })).toBeVisible({ timeout: 40_000 });
  await expect(page.getByText(/\d+(,\d)? km · \d+ min|\d+ m · \d+ min/).first()).toBeVisible();
  await expect(page.getByText("Copertura delle evidenze").first()).toBeVisible();
  await expect(page.getByText(/Fonte: OpenStreetMap/)).toBeVisible();
  const text = (await page.locator("body").innerText()).toLowerCase();
  expect(text).not.toMatch(/percorso (più )?sicuro|strada sicura|a rischio|pericolos/);
});

test("un errore del provider diventa un messaggio leggibile, non dati falsi", async ({ page }) => {
  await page.route("**/api/routes", (route) =>
    route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "rate_limited", message: "Il servizio di routing ha raggiunto il limite di richieste." } }),
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: example }).click();
  await expect(page.getByRole("alert").filter({ hasText: "limite di richieste" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /disponibil/ })).toHaveCount(0);
});

test("senza chiave l'assistente dichiara di non essere configurato", async ({ page }) => {
  await page.route("**/api/agent", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "agent_unavailable", message: "Assistente non configurato: manca ANTHROPIC_API_KEY." } }),
    }),
  );
  await page.goto("/");
  await page.getByLabel("Domanda per l'assistente").fill("Da Piramide al Mattatoio");
  await page.getByRole("button", { name: "Chiedi", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Assistente non configurato" })).toBeVisible();
});
