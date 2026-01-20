import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import server from ".";

/**
 * @METHOD
 * @description 提供给Claude Desktop使用的通道
 * @author LaiFQZzr
 * @date 2026/01/20 15:41
 */
async function main() {
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.error("✅ MCP Stdio Server is running");
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
