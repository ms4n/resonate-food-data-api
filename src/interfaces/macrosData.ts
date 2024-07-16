export interface MacrosData {
  single_serving_size: number;
  food: string;
  calories: number;
  total_fat: number;
  total_carbohydrates: number;
  dietary_fiber: number;
  protein: number;
  [key: string]: number | string;
}
