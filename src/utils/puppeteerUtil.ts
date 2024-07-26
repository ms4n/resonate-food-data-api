import puppeteer, { Browser } from "puppeteer";

let browser: Browser | null = null;

export async function initializeBrowser() {
  if (!browser) {
    try {
      browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    } catch (error) {
      console.error("Failed to launch browser:", error);
      process.exit(1); // Exit the process if the browser fails to launch
    }
  }
}

export async function getBrowserInstance(): Promise<Browser> {
  await initializeBrowser();
  return browser!;
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

process.on("SIGINT", async () => {
  await closeBrowser();
  process.exit();
});

process.on("SIGTERM", async () => {
  await closeBrowser();
  process.exit();
});
