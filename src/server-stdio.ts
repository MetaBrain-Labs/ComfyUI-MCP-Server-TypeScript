import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { mcpManager } from "./tools";

/**
 * @METHOD
 * @description 提供给Claude Desktop使用的通道
 * @author LaiFQZzr
 * @date 2026/01/20 15:41
 */
async function main() {
  const transport = new StdioServerTransport();

  const currentServer = mcpManager.createSessionServer();

  await currentServer.connect(transport);

  console.error("MCP Stdio Server is running");
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
