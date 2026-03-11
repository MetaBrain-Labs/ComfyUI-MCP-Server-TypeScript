import fs from "fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { COMMON } from "../../constants";
import i18n from "../../i18n";
import { saveAssetsByPromptId } from "../../services";
import { error, ok } from "../../types/result";
import {
  ResultToMcpResponse,
  withMcpErrorHandling,
} from "../../utils/mcp-helpers";

export function registerSaveTaskAssets(server: McpServer) {
  server.registerTool(
    "save_task_assets",
    {
      title: i18n.t("tool.save_task_assets.title"),
      description: i18n.t("tool.save_task_assets.description"),
      inputSchema: {
        promptId: z
          .string()
          .describe(i18n.t("tool.save_task_assets.inputSchema.promptId")),
        destinationDir: z
          .string()
          .optional()
          .describe(i18n.t("tool.save_task_assets.inputSchema.destinationDir")),
        overwrite: z
          .boolean()
          .optional()
          .default(false)
          .describe(i18n.t("tool.save_task_assets.inputSchema.overwrite")),
      },
    },
    withMcpErrorHandling(async ({ promptId, destinationDir, overwrite }) => {
      const startTime = Date.now();

      if (destinationDir) {
        if (!fs.existsSync(destinationDir)) {
          return ResultToMcpResponse(
            error(i18n.t("error.dirNotExist", { destinationDir })),
          );
        }

        const stat = fs.statSync(destinationDir);
        if (!stat.isDirectory()) {
          return ResultToMcpResponse(
            error(i18n.t("error.notDir", { destinationDir })),
          );
        }

        try {
          fs.accessSync(destinationDir, fs.constants.W_OK);
        } catch {
          return ResultToMcpResponse(
            error(i18n.t("error.notWritableDir", { destinationDir })),
          );
        }
      } else {
        if (!fs.existsSync(COMMON.ASSETS_DIR)) {
          fs.mkdirSync(COMMON.ASSETS_DIR, { recursive: true });
        }
      }

      const { assetsNames, filePath } = await saveAssetsByPromptId(
        promptId,
        overwrite,
        destinationDir,
      );

      const executionTime = Date.now() - startTime;

      return ResultToMcpResponse(
        ok(
          i18n.t("tool.save_task_assets.success", { assetsNames, filePath }),
          {},
          { action: "save_task_assets" },
          executionTime,
        ),
      );
    }),
  );
}
