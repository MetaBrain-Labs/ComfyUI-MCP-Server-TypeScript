import axios from "axios";
import "dotenv/config";

const BASE_URL = process.env.COMFY_UI_SERVER_IP ?? "http://127.0.0.1:8188";

async function run() {
  const url = `${BASE_URL}/history?max_items=3&offset=0`;

  console.log("🔍 GET", url);

  try {
    const res = await axios.get(url);

    console.log("✅ Status:", res.status);
    console.log("📦 Data:");
    console.dir(res.data, { depth: null });

    if (typeof res.data !== "object") {
      throw new Error("Unexpected response format");
    }

    const items = Object.keys(res.data);
    console.log(`🧮 History items count: ${items.length}`);
  } catch (err: any) {
    console.error("❌ Request failed");

    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data);
    } else {
      console.error(err.message);
    }

    process.exitCode = 1;
  }
}

run();
