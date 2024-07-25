export interface MacrosData {
  food: string;
  singleServingSize: number;
  quantity: number;
  quantityUnit: string;
  calories: number;
  totalFat: number;
  totalCarbohydrates: number;
  dietaryFiber: number;
  protein: number;
  [key: string]: number | string;
}
