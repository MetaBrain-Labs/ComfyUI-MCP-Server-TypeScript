import { ComfyClient } from "../../utils/ws";

async function run() {
  const client = new ComfyClient();

  try {
    // 1. 建立连接
    await client.connect();

    // 2. 发送消息
    client.sendJson({
      type: "feature_flags",
      data: {
        supports_preview_metadata: true,
        supports_manager_v4_ui: true,
      },
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
