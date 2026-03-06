import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { api } from "../../api/api";
import i18n from "../../i18n";
import { error, ok } from "../../types/result";
import { ResultToMcpResponse, withMcpErrorHandling } from "../../utils/mcp-helpers";

export function registerGetWorkflowAPI(server: McpServer) {
  server.registerTool(
    "get_workflow_API",
    {
      title: i18n.t("tool.get_workflow_API.title"),
      description: i18n.t("tool.get_workflow_API.description"),
      inputSchema: {
        workflowName: z
          .string()
          .describe(i18n.t("tool.get_workflow_API.inputSchema.workflowName")),
      },
    },
    withMcpErrorHandling(async ({ workflowName }) => {
      if (!workflowName.endsWith(".json")) {
        return ResultToMcpResponse(
          error(i18n.t("error.getWorkflowFormatError", { workflowName })),
        );
      }

      const startTime = Date.now();
      const result = await api.getDetailUserData(encodeURIComponent(workflowName));
      const executionTime = Date.now() - startTime;

      return ResultToMcpResponse(
        ok(
          i18n.t("tool.get_workflow_API.success"),
          result,
          { action: "get_workflow_API" },
          executionTime,
        ),
      );
    }),
  );
}
