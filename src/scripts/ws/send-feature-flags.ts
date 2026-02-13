import { ComfyClient } from "../../utils/ws";

async function main() {
  const client = new ComfyClient();

  try {
    // 连接
    await client.connect();

    // 发送消息示例
    client.sendJson({
      type: "feature_flags",
      data: {
        supports_preview_metadata: true,
        supports_manager_v4_ui: true,
      },
    });
  } catch (error) {
    console.error("连接失败:", error);
  }
}

main();
