import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { api } from "../../api/api";
import i18n from "../../i18n";
import { ok } from "../../types/result";
import { ResultToMcpResponse, withMcpErrorHandling } from "../../utils/mcp-helpers";

export function registerGetPromptResult(server: McpServer) {
  server.registerTool(
    "get_prompt_result",
    {
      title: i18n.t("tool.get_prompt_result.title"),
      description: i18n.t("tool.get_prompt_result.description"),
      inputSchema: {
        promptId: z
          .string()
          .describe(i18n.t("tool.get_prompt_result.inputSchema.promptId")),
      },
    },
    withMcpErrorHandling(async ({ promptId }) => {
      const startTime = Date.now();
      const result = await api.getDetailHistoryTasks(promptId);
      const executionTime = Date.now() - startTime;

      return ResultToMcpResponse(
        ok(
          i18n.t("tool.get_prompt_result.success"),
          result,
          { action: "get_prompt_result" },
          executionTime,
        ),
      );
    }),
  );
}
