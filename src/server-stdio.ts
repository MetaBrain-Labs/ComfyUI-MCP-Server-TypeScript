import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { mcpManager } from "./tools";

/**
 * @METHOD
 * @description 提供给Claude Desktop使用的通道
 */
async function main() {
  const transport = new StdioServerTransport();

  const currentServer = mcpManager.createSessionServer();

  await mcpManager.initialize();

  await currentServer.connect(transport);

  console.error("MCP Stdio Server is running");
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
