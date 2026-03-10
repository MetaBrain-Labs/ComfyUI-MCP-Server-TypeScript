import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import i18n from "../../i18n";
import { getTaskDetailByPromptId } from "../../services";
import { ok } from "../../types/result";
import { ResultToMcpResponse, withMcpErrorHandling } from "../../utils/mcp-helpers";

export function registerGetTaskDetail(server: McpServer) {
  server.registerTool(
    "cui_get_task_detail",
    {
      title: i18n.t("tool.cui_get_task_detail.title"),
      description: i18n.t("tool.cui_get_task_detail.description"),
      inputSchema: {
        promptId: z
          .string()
          .describe(i18n.t("tool.cui_get_task_detail.inputSchema.promptId")),
      },
    },
    withMcpErrorHandling(async ({ promptId }) => {
      const startTime = Date.now();
      const result = await getTaskDetailByPromptId({ promptId });
      const executionTime = Date.now() - startTime;

      return ResultToMcpResponse(
        ok(
          i18n.t("tool.cui_get_task_detail.success"),
          result,
          { action: "cui_get_task_detail" },
          executionTime,
        ),
      );
    }),
  );
}
