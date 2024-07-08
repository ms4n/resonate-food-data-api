import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getBrowserInstance } from "../utils/puppeteerUtil";
import { supabaseUrl, supabaseKey, nutritionalDataUrl } from "../config";
import { MacrosData } from "../interfaces/macrosData";

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

async function fetchNutritionalData(foodItem: string): Promise<MacrosData> {
  try {
    const { data: existingData, error } = await supabase
      .from("nutrition_data")
      .select()
      .eq("food", foodItem)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error("Error fetching data from Supabase");
    }

    if (existingData) {
      return existingData as MacrosData;
    }

    const url = `${nutritionalDataUrl}${foodItem}`;
    const browser = await getBrowserInstance();
    const page = await browser.newPage();

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

      const { error: insertError } = await supabase
        .from("nutrition_data")
        .insert([{ food: foodItem, ...macrosData }]);

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

    return calculatedMacros;
  } catch (error) {
    console.error("Error calculating macro data:", error);
    throw error;
  }
}

export { calculateMacroData };
