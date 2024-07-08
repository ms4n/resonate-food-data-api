import puppeteer, { Browser } from "puppeteer";

let browser: Browser | null = null;

export async function initializeBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
}

export async function getBrowserInstance(): Promise<Browser> {
  await initializeBrowser();
  return browser!;
}
