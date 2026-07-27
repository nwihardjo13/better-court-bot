import { chromium } from "playwright";
import { buildSlotUrl } from "./better-api.js";

async function launchContext(config) {
  return chromium.launchPersistentContext(config.profileDir, {
    headless: config.headless,
    viewport: { width: 1440, height: 1080 }
  });
}

async function useFreshPage(context) {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.bringToFront();
  return page;
}

export async function openLoginSession(config) {
  const context = await launchContext(config);
  const page = await useFreshPage(context);

  const url =
    `${config.baseWebUrl}/location/${config.venueSlug}/${config.activitySlug}/${config.targetDates[0]}/by-time`;
  await page.goto(url, { waitUntil: "domcontentloaded" });

  console.log("Browser open. Log in manually and keep this profile for later runs.");
  console.log(`Profile dir: ${config.profileDir}`);
  console.log("Press Ctrl+C when finished.");

  await new Promise(() => {});
}

export async function openMatchingSlotPage(slot, config) {
  const context = await launchContext(config);
  try {
    const page = await useFreshPage(context);
    const slotUrl = buildSlotUrl(slot, config);
    await page.goto(slotUrl, { waitUntil: "domcontentloaded" });
    await page.getByText("Your selection:").waitFor({ timeout: 15000 });
    console.log(`Opened slot page: ${slotUrl}`);
  } finally {
    if (config.headless) {
      await context.close();
    }
  }
}

export async function addMatchingSlotToBasket(slot, config) {
  const context = await launchContext(config);
  try {
    const page = await useFreshPage(context);
    const slotUrl = buildSlotUrl(slot, config);
    await page.goto(slotUrl, { waitUntil: "domcontentloaded" });
    await page.getByText("Your selection:").waitFor({ timeout: 15000 });

    const addToBasket = page.getByRole("button", { name: /^Add to basket$/i });
    await addToBasket.click();
    await page.waitForURL(/\/basket(\/checkout)?$/, { timeout: 15000 });

    console.log(`Added slot to basket: ${slot.date.raw} ${slot.starts_at.format_24_hour}`);
  } finally {
    if (config.headless) {
      await context.close();
    }
  }
}
