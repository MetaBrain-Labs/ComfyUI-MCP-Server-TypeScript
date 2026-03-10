import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { api } from "../../api/api";
import i18n from "../../i18n";
import { error, ok } from "../../types/result";
import {
  ResultToMcpResponse,
  withMcpErrorHandling,
} from "../../utils/mcp-helpers";

export function registerGetWorkflowAPI(server: McpServer) {
  server.registerTool(
    "get_workflow_API",
    {
      title: i18n.t("tool.get_workflow_API.title"),
      description: i18n.t("tool.get_workflow_API.description"),
      inputSchema: {
        workflowPath: z
          .string()
          .describe(i18n.t("tool.get_workflow_API.inputSchema.workflowPath")),
      },
    },
    withMcpErrorHandling(async ({ workflowPath }) => {
      if (!workflowPath.endsWith(".json")) {
        return ResultToMcpResponse(
          error(i18n.t("error.getWorkflowFormatError", { workflowPath })),
        );
      }

      const startTime = Date.now();
      const result = await api.getDetailUserData(
        encodeURIComponent(workflowPath),
      );
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
