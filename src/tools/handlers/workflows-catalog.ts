import { readFile } from "fs/promises";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { COMMON } from "../../constants";
import i18n from "../../i18n";
import {
  collectAndSaveFormatTask,
  collectAndSaveFormatTaskFromWorkflows,
} from "../../services";
import { ComfyClient } from "../../utils/ws";
import { WorkflowConverter } from "../../utils/workflow-converter";
import { ResultToMcpStringResponse, withMcpErrorHandling } from "../../utils/mcp-helpers";

export function registerGetWorkflowsCatalog(
  server: McpServer,
  client: ComfyClient,
  converter: WorkflowConverter,
) {
  server.registerTool(
    "get_workflows_catalog",
    {
      title: i18n.t("tool.get_workflows_catalog.title"),
      description: i18n.t("tool.get_workflows_catalog.description"),
      inputSchema: {
        maxItems: z
          .number()
          .min(1)
          .max(10)
          .optional()
          .default(10)
          .describe(i18n.t("tool.get_workflows_catalog.inputSchema.maxItems")),
      },
    },
    withMcpErrorHandling(async ({ maxItems }) => {
      let hasMore: boolean = true;

      for (let i = 0; hasMore; i++) {
        const result = await collectAndSaveFormatTask({
          maxItems,
          offset: i * maxItems,
          append: i > 0,
        });
        hasMore = result.detail.data?.pagination?.hasNextPage || false;
      }

      await collectAndSaveFormatTaskFromWorkflows(client, converter);

      const content = await readFile(COMMON.WORKFLOW_PATH, "utf-8");
      return ResultToMcpStringResponse(content);
    }),
  );
}
