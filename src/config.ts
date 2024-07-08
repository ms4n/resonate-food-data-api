import * as dotenv from "dotenv";

dotenv.config();

export const supabaseUrl: string = process.env.SUPABASE_URL!;
export const supabaseKey: string = process.env.SUPABASE_KEY!;
export const nutritionalDataUrl: string = process.env.NUTRITIONAL_DATA_URL!;
export const port: number = parseInt(process.env.PORT || "8000", 10);
