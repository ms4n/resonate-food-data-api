import { Request, Response } from "express";
import { calculateMacroData } from "../services/nutritionalService";

export async function getNutritionalInfo(req: Request, res: Response) {
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
}
