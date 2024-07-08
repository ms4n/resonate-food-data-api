export interface MacrosData {
  single_serving_size: number;
  calories: number;
  total_fat: number;
  total_carbohydrates: number;
  dietary_fiber: number;
  protein: number;
  [key: string]: number;
}

export interface FetchNutritionalDataResponse {
  single_serving_size: number;
  calories: number;
  total_fat: number;
  total_carbohydrates: number;
  dietary_fiber: number;
  protein: number;
}
