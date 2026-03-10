import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import i18n from "../../i18n";
import { getTaskDetailByPromptId } from "../../services";
import {
  createDynamicWorkflowTool,
  generateToolExampleParams,
  hasDynamicTool,
} from "../../services/dynamic-tool";
import { DynamicWorkflowToolData } from "../../types/dynamic-tool";
import { error, ok } from "../../types/result";
import {
  ResultToMcpResponse,
  withMcpErrorHandling,
} from "../../utils/mcp-helpers";

export function registerMountWorkflow(server: McpServer) {
  server.registerTool(
    "mount_workflow",
    {
      title: i18n.t("tool.mount_workflow.title"),
      description: i18n.t("tool.mount_workflow.description"),
      inputSchema: {
        promptId: z
          .string()
          .describe(i18n.t("tool.mount_workflow.inputSchema.promptId")),
        toolName: z
          .string()
          .regex(
            /^[a-zA-Z0-9_-]+$/,
            "Tool 名称只能包含字母、数字、下划线、连字符",
          )
          .describe(i18n.t("tool.mount_workflow.inputSchema.toolName")),
      },
    },
    withMcpErrorHandling(async ({ promptId, toolName }) => {
      if (hasDynamicTool(toolName)) {
        return ResultToMcpResponse(
          error(i18n.t("error.toolAlreadyExistError", { toolName })),
        );
      }

      const startTime = Date.now();
      const result = await getTaskDetailByPromptId({ promptId });

      if (!result.success || !result.detail.data) {
        return ResultToMcpResponse(error(i18n.t("error.getTaskDetailFail")));
      }

      const workflow = result.detail.data;
      const tool = createDynamicWorkflowTool(toolName, promptId, workflow);

      const response: DynamicWorkflowToolData = {
        name: tool.name,
        title: tool.title,
        description: tool.description,
        sourcePromptId: tool.sourcePromptId,
        configurableParamsCount: tool.configurableParams.length,
        configurableParams: tool.configurableParams.map((p) => ({
          key: `${p.nodeId}_${p.inputKey}`,
          path: p.path,
          type: p.type,
          defaultValue: p.defaultValue,
          description: p.description,
          nodeTitle: p.nodeTitle,
          classType: p.classType,
          paramType: p.inputKey,
          required: p.required,
        })),
        requiredParams: tool.configurableParams
          .filter((p) => p.required)
          .map((p) => `${p.nodeId}_${p.inputKey}`),
        exampleUsage: generateToolExampleParams(tool),
      };

      const executionTime = Date.now() - startTime;

      return ResultToMcpResponse(
        ok(
          i18n.t("tool.mount_workflow.success", { toolName }),
          response,
          { action: "mount_workflow" },
          executionTime,
        ),
      );
    }),
  );
}
