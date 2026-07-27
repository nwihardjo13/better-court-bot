import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });

try {
  console.log(`Chromium ${await browser.version()} launched successfully.`);
} finally {
  await browser.close();
}
