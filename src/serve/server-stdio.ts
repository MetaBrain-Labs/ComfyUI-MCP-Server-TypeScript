import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import server from ".";

async function main() {
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.error("✅ MCP Stdio Server is running");
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
