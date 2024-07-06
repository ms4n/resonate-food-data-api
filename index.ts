import express from "express";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import puppeteer, { Browser } from "puppeteer";
import * as dotenv from "dotenv";

dotenv.config();

interface MacrosData {
  single_serving_size: number;
  calories: number;
  total_fat: number;
  total_carbohydrates: number;
  dietary_fiber: number;
  protein: number;
  [key: string]: number;
}

interface FetchNutritionalDataResponse {
  single_serving_size: number;
  calories: number;
  total_fat: number;
  total_carbohydrates: number;
  dietary_fiber: number;
  protein: number;
}

const supabaseUrl: string = process.env.SUPABASE_URL!;
const supabaseKey: string = process.env.SUPABASE_KEY!;
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

let browser: Browser | null = null;

async function initializeBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
}

async function fetchNutritionalData(foodItem: string): Promise<MacrosData> {
  try {
    const { data: existingData, error } = await supabase
      .from("nutrition_data")
      .select()
      .eq("food", foodItem)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is the code for "Row not found"
      throw new Error("Error fetching data from Supabase");
    }

    if (existingData) {
      return {
        single_serving_size: existingData.single_serving_size,
        calories: existingData.calories,
        total_fat: existingData.total_fat,
        total_carbohydrates: existingData.total_carbohydrates,
        dietary_fiber: existingData.dietary_fiber,
        protein: existingData.protein,
      };
    }

    const nutritionalDataUrl: string = process.env.NUTRITIONAL_DATA_URL!;
    const url = `${nutritionalDataUrl}${foodItem}`;

    await initializeBrowser();
    const page = await browser!.newPage();

    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });

      await page.waitForSelector(".nf", { timeout: 10000 });

      async function extractText(
        selector: string,
        useXPath = false
      ): Promise<string> {
        if (useXPath) {
          const element = await page.evaluateHandle((xpath: string) => {
            const results = document.evaluate(
              xpath,
              document,
              null,
              XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
              null
            );
            if (results.snapshotLength > 0) {
              return results.snapshotItem(0)?.textContent?.trim() ?? "";
            }
            return null;
          }, selector);

          return element
            ? ((await element.jsonValue()) as string)
            : "Data not available";
        } else {
          const element = await page.$(selector);
          return element
            ? await page.evaluate(
                (el: Element) => el.textContent?.trim() ?? "",
                element
              )
            : "Data not available";
        }
      }

      const macrosSelectors: Record<string, string> = {
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

      const macrosData: MacrosData = {} as MacrosData;
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

      const { data, error: insertError } = await supabase
        .from("nutrition_data")
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

      return macrosData;
    } catch (error) {
      console.error("Error fetching nutritional data:", error);
      throw error;
    } finally {
      await page.close();
    }
  } catch (error) {
    console.error("Error fetching nutritional data from Supabase:", error);
    throw error;
  }
}

async function calculateMacroData(
  foodItem: string,
  count: number | null,
  weight: number | null
): Promise<Partial<MacrosData>> {
  try {
    const macrosData = await fetchNutritionalData(foodItem);
    const calculatedMacros: Partial<MacrosData> = {};
    const factor = count ? count : weight! / macrosData.single_serving_size;

    if (count) {
      calculatedMacros["count"] = count;
    } else {
      calculatedMacros["weight"] = weight!;
    }

    for (const key in macrosData) {
      if (key !== "single_serving_size") {
        calculatedMacros[key] = Math.round(macrosData[key] * factor * 10) / 10;
      }
    }

    return calculatedMacros as MacrosData;
  } catch (error) {
    console.error("Error calculating macro data:", error);
    throw error;
  }
}

const app = express();
const port = 8000;

app.get("/nutritional-info", async (req, res) => {
  const { foodItem, count, weight } = req.query;

  if (!foodItem || (!count && !weight)) {
    return res
      .status(400)
      .json({ error: "Please provide foodItem and either count or weight" });
  }

  try {
    const result = await calculateMacroData(
      foodItem as string,
      count ? parseInt(count as string) : null,
      weight ? parseFloat(weight as string) : null
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Error calculating macro data" });
  }
});

app.listen(port, async () => {
  await initializeBrowser();
  console.log(`Server running on port ${port}`);
});
