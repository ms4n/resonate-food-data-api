export interface MacrosData {
  food_id: string;
  food_name: string;
  single_serving_size: number;
  quantity: number;
  quantity_unit: string;
  calories: number;
  total_fat: number;
  total_carbohydrates: number;
  dietary_fiber: number;
  protein: number;
  [key: string]: number | string;
}
