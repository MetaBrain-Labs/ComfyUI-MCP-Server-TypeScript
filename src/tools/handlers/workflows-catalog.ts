import { readFile } from "fs/promises";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { COMMON } from "../../constants";
import i18n from "../../i18n";
import {
  collectAndSaveFormatTask,
  collectAndSaveFormatTaskFromWorkflows,
  collectExternalWorkflowsFromDirectory,
  saveWorkflow,
} from "../../services";
import { ComfyClient } from "../../utils/ws";
import { WorkflowConverter } from "../../utils/workflow-converter";
import {
  ResultToMcpStringResponse,
  withMcpErrorHandling,
} from "../../utils/mcp-helpers";

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
        useExistingCatalog: z
          .boolean()
          .optional()
          .default(false)
          .describe(i18n.t("tool.get_workflows_catalog.inputSchema.useExistingCatalog")),
      },
    },
    withMcpErrorHandling(async ({ maxItems, useExistingCatalog }) => {
      // 如果 useExistingCatalog 为 true，直接返回已有的 workflow.json
      if (useExistingCatalog) {
        const content = await readFile(COMMON.WORKFLOW_PATH, "utf-8");
        return ResultToMcpStringResponse(content);
      }

      let hasMore: boolean = true;

      // 1. 收集历史任务（CompleteInspection）
      for (let i = 0; hasMore; i++) {
        hasMore = await collectAndSaveFormatTask({
          maxItems,
          offset: i * maxItems,
          append: i > 0,
        });
      }

      // 2. 收集用户工作流（InitialInspection）
      await collectAndSaveFormatTaskFromWorkflows(client, converter);

      // 3. 收集本地 workflow 目录的 External 类型工作流
      // 由于去重逻辑优先保留非 External 类型，External 只作为补充
      const externalResult = await collectExternalWorkflowsFromDirectory();
      const externalWorkflows = externalResult || [];

      // 只有当有 External 工作流时才保存
      if (externalWorkflows.length > 0) {
        await saveWorkflow(externalWorkflows, { append: true });
      }

      const content = await readFile(COMMON.WORKFLOW_PATH, "utf-8");
      return ResultToMcpStringResponse(content);
    }),
  );
}
