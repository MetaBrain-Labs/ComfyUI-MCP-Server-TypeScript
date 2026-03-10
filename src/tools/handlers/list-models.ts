import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { api } from "../../api/api";
import i18n from "../../i18n";
import { error, ok } from "../../types/result";
import { ResultToMcpResponse, withMcpErrorHandling } from "../../utils/mcp-helpers";

export function registerListModels(server: McpServer) {
  server.registerTool(
    "list_models",
    {
      title: i18n.t("tool.list_models.title"),
      description: i18n.t("tool.list_models.description"),
      inputSchema: {
        typeName: z
          .string()
          .optional()
          .describe(i18n.t("tool.list_models.inputSchema.typeName")),
      },
    },
    withMcpErrorHandling(async ({ typeName }) => {
      const startTime = Date.now();
      const modelType = await api.getModelType();
      const hasModel = modelType.find((item) => item.name === typeName);

      if (!hasModel || !typeName) {
        return ResultToMcpResponse(
          error(
            i18n.t("error.notFoundModel", {
              models: modelType.map((item) => item.name).join(", "),
            }),
          ),
        );
      }

      const result = await api.getDetailModel(typeName);
      const executionTime = Date.now() - startTime;

      return ResultToMcpResponse(
        ok(
          result.length === 0
            ? i18n.t("tool.list_models.successButNoModel")
            : i18n.t("tool.list_models.success"),
          result,
          { action: "list_models" },
          executionTime,
        ),
      );
    }),
  );
}
