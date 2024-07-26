import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getBrowserInstance } from "../utils/puppeteerUtil";
import { supabaseUrl, supabaseKey } from "../config";
import { MacrosData } from "../interfaces/macrosData";

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

async function fetchNutritionalData(foodItem: string): Promise<MacrosData> {
  try {
    const { data: existingData, error } = await supabase
      .from("nutrition_data")
      .select("*")
      .eq("food_id", foodItem)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error("Error fetching data from Supabase");
    }

    if (existingData) {
      return existingData as MacrosData;
    }

    const url = `https://www.nutritionix.com/food/${foodItem}`;
    const browser = await getBrowserInstance();
    const page = await browser.newPage();

    try {
      // Request interception to block unnecessary resources
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        ["image", "stylesheet", "font"].includes(req.resourceType())
          ? req.abort()
          : req.continue();
      });

      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".nf", { timeout: 10000 });

      // Extract all food macro data
      const macrosData: MacrosData = await page.evaluate((foodItem) => {
        const nfElement = document.querySelector(".nf");
        if (!nfElement) {
          throw new Error("Nutrition facts element not found");
        }

        const parseFloat = (value: string): number =>
          Number(value.match(/\d+(\.\d+)?/)?.[0] ?? 0);

        const getData = (selector: string): string =>
          nfElement.querySelector(selector)?.textContent?.trim() ??
          "Data not available";

        const servingUnitText =
          nfElement
            .querySelector(".nf-serving-unit-name")
            ?.childNodes[0].textContent?.trim()
            .replace(/[\n\t]+/g, "")
            .replace(/\s*\($/, "") ?? "";

        const quantity = parseFloat(
          (
            nfElement.querySelector(
              "input.nf-unitQuantityBox"
            ) as HTMLInputElement
          )?.value ?? "1"
        );

        return {
          food_id: foodItem,
          food_name: document.title.split("Calories in ")[1]?.trim(),
          single_serving_size: parseFloat(
            getData('span[itemprop="servingSize"]')
          ),
          quantity: quantity,
          quantity_unit: servingUnitText,
          calories: parseFloat(getData('span.nf-pr[itemprop="calories"]')),
          total_fat: parseFloat(getData('span[itemprop="fatContent"]')),
          total_carbohydrates: parseFloat(
            getData('span[itemprop="carbohydrateContent"]')
          ),
          dietary_fiber: parseFloat(getData('span[itemprop="fiberContent"]')),
          protein: parseFloat(getData('span[itemprop="proteinContent"]')),
        } as MacrosData;
      }, foodItem);

      //  Insert data into Supabase
      const { error: insertError } = await supabase
        .from("nutrition_data")
        .upsert([
          {
            food_id: macrosData.food_id,
            food_name: macrosData.food_name,
            single_serving_size: macrosData.single_serving_size,
            quantity: macrosData.quantity,
            quantity_unit: macrosData.quantity_unit,
            calories: macrosData.calories,
            total_fat: macrosData.total_fat,
            total_carbohydrates: macrosData.total_carbohydrates,
            dietary_fiber: macrosData.dietary_fiber,
            protein: macrosData.protein,
          },
        ]);

      if (insertError) {
        console.error(insertError);
        throw new Error("Error inserting data into Supabase");
      }

      return macrosData;
    } catch (error) {
      console.error("Error fetching/scraping nutritional data:", error);
      throw error;
    } finally {
      await page.close();
    }
  } catch (error) {
    console.error("Error fetching nutritional data from Supabase:", error);
    throw error;
  }
}

export { fetchNutritionalData };
