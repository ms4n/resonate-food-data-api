import puppeteer from "puppeteer";
import "dotenv/config";

async function fetchNutritionalData(foodSlug) {
  const nutritionalDataUrl = process.env.NUTRITIONAL_DATA_URL;
  const url = `${nutritionalDataUrl}${foodSlug}`;

  console.log(url);

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    console.log("Fetched URL!");

    // wait for the nutrition info to be present
    await page.waitForSelector(".nf", { timeout: 10000 });
    console.log("Nutrition data div is present!");

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
      macrosData[key] = await extractText(
        macrosSelectors[key],
        key.includes("total_") || key === "dietary_fiber" || key === "protein"
      );
    }

    console.log("Extracting information finished");

    // extract serving size
    const singleServingWeight = parseFloat(
      macrosData.single_serving_size.split("(")[1].split("g")[0]
    );
    const ratioPer100g = 100 / singleServingWeight;

    // calculate values per 100 grams
    const macros100g = {};
    for (const key in macrosData) {
      if (key !== "single_serving_size") {
        macros100g[`${key}_100g`] =
          Math.round(
            parseFloat(macrosData[key].split("g")[0]) * ratioPer100g * 10
          ) / 10;
        macros100g.calories_per_serving = parseFloat(macrosData.calories);
      } else {
        try {
          macros100g[key] = parseFloat(macrosData[key]);
        } catch (e) {
          macros100g[key] = macrosData[key];
        }
      }
    }

    macros100g.single_serving_size = singleServingWeight;

    return macros100g;
  } catch (error) {
    console.error("Error fetching nutritional data:", error);
  } finally {
    await browser.close();
  }
}

fetchNutritionalData("egg")
  .then((data) => console.log("Nutritional data fetched and stored:", data))
  .catch((err) => console.error(err));
