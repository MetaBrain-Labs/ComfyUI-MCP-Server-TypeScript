import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import i18n from "../../i18n";
import { collectAndSaveFormatTaskFromExternal } from "../../services";
import { error, ok } from "../../types/result";
import {
  ResultToMcpResponse,
  withMcpErrorHandling,
} from "../../utils/mcp-helpers";
import { ComfyClient } from "../../utils/ws";

export function registerSaveCustomWorkflow(
  server: McpServer,
  client: ComfyClient,
) {
  server.registerTool(
    "save_custom_workflow",
    {
      title: i18n.t("tool.save_custom_workflow.title"),
      description: i18n.t("tool.save_custom_workflow.description"),
      inputSchema: {
        filename: z
          .string()
          .describe(i18n.t("tool.save_custom_workflow.inputSchema.filename")),
        apiJson: z
          .record(z.string(), z.any())
          .describe(i18n.t("tool.save_custom_workflow.inputSchema.apiJson")),
      },
    },
    withMcpErrorHandling(async ({ filename, apiJson }) => {
      const startTime = Date.now();

      const fileInfo = filename.split(".");
      if (fileInfo.length > 1 && !filename.endsWith(".json")) {
        return ResultToMcpResponse(
          error(
            i18n.t("error.hasExtendName", {
              current: "." + fileInfo[1],
              need: ".json",
            }),
          ),
        );
      }

      if (!filename.endsWith(".json")) {
        filename += ".json";
      }

      const { filePath, promptId } = await collectAndSaveFormatTaskFromExternal(
        filename,
        apiJson,
        client,
      );

      const executionTime = Date.now() - startTime;

      return ResultToMcpResponse(
        ok(
          i18n.t("tool.save_custom_workflow.success", { filePath }),
          { filePath, promptId },
          { action: "save_custom_workflow" },
          executionTime,
        ),
      );
    }),
  );
}
