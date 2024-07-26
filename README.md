# resonate-food-data-api

This is a simple Node.js and Express.js application with TypeScript for fetching nutritional information about food items. The app uses Supabase for data storage and Puppeteer for web scraping.

## Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/ms4n/resonate-food-data-api.git
   cd resonate-food-data-api
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Create a `.env` file in the root directory and add your Supabase URL and key:
   ```env
   PORT=8000

   SUPABASE_URL=<your_supabase_url>
   SUPABASE_KEY=<your_supabase_key>
   ```

4. Build the TypeScript files:
   ```sh
   npm run build
   ```

5. Start the server:
   ```sh
   npm start
   ```


## Usage

Fetch nutritional information for a specific food item by sending a GET request to the following endpoint:

### Endpoint

**GET** `/nutritional-info`

### Query Parameter

- `foodItem`: The name of the food item (e.g., `fish`).

### Example Request

```http
GET http://localhost:8000/nutritional-info?foodItem=fish
```

### Example Response

```json
{
  "food_id": "fish",
  "food_name": "Fish",
  "single_serving_size": 170,
  "quantity": 1,
  "quantity_unit": "medium fillet (6 oz)",
  "calories": 218,
  "total_fat": 4.5,
  "total_carbohydrates": 0,
  "dietary_fiber": 0,
  "protein": 44
}
```

## Configuration

- **Supabase**: Ensure you have your Supabase URL and Key in the `.env` file.
- **Puppeteer**: Used for web scraping nutritional data from external sources.
