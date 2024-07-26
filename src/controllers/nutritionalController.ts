import { Request, Response } from "express";
import { fetchNutritionalData } from "../services/nutritionalService";

export async function getNutritionalInfo(req: Request, res: Response) {
  const foodItem = req.query.foodItem;

  if (!foodItem) {
    return res.status(400).json({ error: "Please provide foodItem" });
  }

  try {
    const result = await fetchNutritionalData(foodItem as string);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Error fetching/scraping nutritional data" });
  }
}
