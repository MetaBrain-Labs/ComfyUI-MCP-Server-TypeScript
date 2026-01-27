import "dotenv/config";
import { collectAndSaveWorkflow } from "../../workflow";

const BASE_URL = process.env.COMFY_UI_SERVER_IP ?? "http://127.0.0.1:8188";

async function run() {
  const result = await collectAndSaveWorkflow({
    baseUrl: BASE_URL,
    offset: 0,
    maxItems: 3,
    append: true,
  });

  console.log("结果为：", result);
}

run();
