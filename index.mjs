import puppeteer from "puppeteer";
import "dotenv/config";

async function fetchNutritionalData(foodItem) {
  const nutritionalDataUrl = process.env.NUTRITIONAL_DATA_URL;
  const url = `${nutritionalDataUrl}${foodItem}`;

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // wait for the nutrition info to be present
    await page.waitForSelector(".nf", { timeout: 10000 });

    // extract text content
    async function extractText(selector, useXPath = false) {
      if (useXPath) {
        const element = await page.evaluateHandle((xpath) => {
          const results = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          );
          if (results.snapshotLength > 0) {
            return results.snapshotItem(0).textContent.trim();
          }
          return null;
        }, selector);

        return element ? element.jsonValue() : "Data not available";
      } else {
        const element = await page.$(selector);
        return element
          ? await page.evaluate((el) => el.textContent.trim(), element)
          : "Data not available";
      }
    }

    // selectors for required macros
    const macrosSelectors = {
      single_serving_size: ".nf-serving-unit-name",
      calories: 'span.nf-pr[itemprop="calories"]',
      total_fat:
        '//span[contains(text(), "Total Fat")]/following-sibling::span',
      total_carbohydrates:
        '//span[contains(text(), "Total Carbohydrates")]/following-sibling::span',
      dietary_fiber:
        '//span[contains(text(), "Dietary Fiber")]/following-sibling::span',
      protein: '//span[contains(text(), "Protein")]/following-sibling::span',
    };

    //extract all the required macros
    const macrosData = {};
    for (const key in macrosSelectors) {
      const useXPath =
        key.includes("total_") || key === "dietary_fiber" || key === "protein";
      const valueText = await extractText(macrosSelectors[key], useXPath);

      if (key === "single_serving_size") {
        const servingSize = parseFloat(valueText.split("(")[1].split("g")[0]);
        macrosData[key] = servingSize;
      } else {
        macrosData[key] = parseFloat(valueText);
      }
    }

    return macrosData;
  } catch (error) {
    console.error("Error fetching nutritional data:", error);
  } finally {
    await browser.close();
  }
}

async function calculateMacroData(foodItem, count, weight) {
 
}

fetchNutritionalData("chicken-breast")
  .then((data) => console.log("Nutritional data fetched and stored:", data))
  .catch((err) => console.error(err));
