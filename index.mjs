import { createClient } from "@supabase/supabase-js";
import puppeteer from "puppeteer";
import "dotenv/config";

import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchNutritionalData(foodItem) {
  try {
    // check if the nutritional data exists in db
    const { data: existingData, error } = await supabase
      .from("NUTRITION_DATA")
      .select()
      .eq("food", foodItem)
      .single();

    if (error) {
      throw new Error("Error fetching data from Supabase");
    }

    if (existingData) {
      console.log(`Nutritional data found in Supabase for ${foodItem}`);
      return {
        single_serving_size: existingData.single_serving_size,
        calories: existingData.calories,
        total_fat: existingData.total_fat,
        total_carbohydrates: existingData.total_carbohydrates,
        dietary_fiber: existingData.dietary_fiber,
        protein: existingData.protein,
      };
    }

    // if data doesn't exist, scrape and insert into db
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

      // extract all the required macros
      const macrosData = {};
      for (const key in macrosSelectors) {
        const useXPath =
          key.includes("total_") ||
          key === "dietary_fiber" ||
          key === "protein";
        const valueText = await extractText(macrosSelectors[key], useXPath);

        if (key === "single_serving_size") {
          const servingSize = parseFloat(valueText.split("(")[1].split("g")[0]);
          macrosData[key] = servingSize;
        } else {
          macrosData[key] = parseFloat(valueText);
        }
      }

      // insert data into Supabase
      const { data, error: insertError } = await supabase
        .from("NUTRITION_DATA")
        .insert([
          {
            food: foodItem,
            single_serving_size: macrosData.single_serving_size,
            calories: macrosData.calories,
            total_fat: macrosData.total_fat,
            total_carbohydrates: macrosData.total_carbohydrates,
            dietary_fiber: macrosData.dietary_fiber,
            protein: macrosData.protein,
          },
        ]);

      if (insertError) {
        throw new Error("Error inserting data into Supabase");
      }

      console.log(`Nutritional data fetched and stored for ${foodItem}`);

      return macrosData;
    } catch (error) {
      console.error("Error fetching nutritional data:", error);
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("Error fetching nutritional data from Supabase:", error);
    throw error;
  }
}

async function calculateMacroData(foodItem, count, weight) {
  try {
    const macrosData = await fetchNutritionalData(foodItem);
    const calculatedMacros = {};
    const factor = count ? count : weight / macrosData.single_serving_size;

    if (count) {
      calculatedMacros["count"] = count;
    } else {
      calculatedMacros["weight"] = weight;
    }

    for (const key in macrosData) {
      if (key !== "single_serving_size") {
        calculatedMacros[key] = Math.round(macrosData[key] * factor * 10) / 10;
      }
    }

    return calculatedMacros;
  } catch (error) {
    console.error("Error calculating macro data:", error);
    throw error;
  }
}

calculateMacroData("egg", 2, null)
  .then((data) => console.log("Nutritional data fetched and stored:", data))
  .catch((err) => console.error(err));
