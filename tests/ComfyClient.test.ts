import { ComfyClient } from "./comfy-client";

async function main() {
  const client = new ComfyClient();

  // 自定义 Hook 处理
  client.hook.onProgress = (data) => {
    console.log(`进度: ${data.value}/${data.max}`);
  };

  client.hook.onExecuted = (data) => {
    console.log("任务完成:", data);
  };

  try {
    // 连接
    await client.connect();

    // 发送消息示例
    client.sendJson({
      type: "custom_command",
      data: { action: "test" },
    });

    // 保持连接...
    // 在实际应用中，你可能需要根据业务逻辑决定何时关闭
  } catch (error) {
    console.error("连接失败:", error);
  }
}

main();
