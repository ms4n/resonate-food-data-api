import express from "express";
import { getNutritionalInfo } from "./controllers/nutritionalController";

const app = express();

app.get("/nutritional-info", getNutritionalInfo);

export default app;
