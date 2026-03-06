import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { api } from "../../api/api";
import i18n from "../../i18n";
import { ok } from "../../types/result";
import { ResultToMcpResponse, withMcpErrorHandling } from "../../utils/mcp-helpers";

export function registerGetSystemStatus(server: McpServer) {
  server.registerTool(
    "get_system_status",
    {
      title: i18n.t("tool.get_system_status.title"),
      description: i18n.t("tool.get_system_status.description"),
      inputSchema: {},
    },
    withMcpErrorHandling(async () => {
      const startTime = Date.now();
      const result = await api.getSystemStatus();
      const executionTime = Date.now() - startTime;

      return ResultToMcpResponse(
        ok(
          i18n.t("tool.get_system_status.success"),
          result,
          { action: "get_system_status" },
          executionTime,
        ),
      );
    }),
  );
}
