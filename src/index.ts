import app from "./app";
import { initializeBrowser } from "./utils/puppeteerUtil";
import { port } from "./config";

app.listen(port, async () => {
  await initializeBrowser();
  console.log(`Server running on port ${port}`);
});
