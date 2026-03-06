import fs from "fs";
import path from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { api } from "../../api/api";
import i18n from "../../i18n";
import { error, ok } from "../../types/result";
import { ResultToMcpResponse, withMcpErrorHandling } from "../../utils/mcp-helpers";

export function registerUploadAssets(server: McpServer) {
  server.registerTool(
    "upload_assets",
    {
      title: i18n.t("tool.upload_assets.title"),
      description: i18n.t("tool.upload_assets.description"),
      inputSchema: {
        fileSource: z
          .string()
          .describe(i18n.t("tool.upload_assets.inputSchema.fileSource")),
        mimeType: z
          .string()
          .optional()
          .describe(i18n.t("tool.upload_assets.inputSchema.mimeType")),
      },
    },
    withMcpErrorHandling(async ({ fileSource, mimeType }) => {
      try {
        const startTime = Date.now();
        let buffer;
        let finalFileName = "uploaded_image.png";
        const isUrl = /^https?:\/\//i.test(fileSource);

        if (isUrl) {
          const res = await fetch(fileSource);
          if (!res.ok) {
            return ResultToMcpResponse(
              error(
                i18n.t("error.downloadAssetsFail", { status: res.status }),
              ),
            );
          }
          const arrayBuffer = await res.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
          const urlWithoutQuery = fileSource.split("?")[0];
          finalFileName = urlWithoutQuery.split("/").pop() || "downloaded.png";
        } else {
          if (!fs.existsSync(fileSource)) {
            return ResultToMcpResponse(
              error(i18n.t("error.fileNotExistError", { fileSource })),
            );
          }
          buffer = fs.readFileSync(fileSource);
          finalFileName = path.basename(fileSource);
        }

        const form = new FormData();
        const blob = new Blob([buffer], {
          type: mimeType || "application/octet-stream",
        });
        form.append("image", blob, finalFileName);

        const response = await api.uploadImg(form);
        const executionTime = Date.now() - startTime;

        return ResultToMcpResponse(
          ok(
            i18n.t("tool.upload_assets.success", { finalFileName }),
            response,
            { action: "cui_upload_file" },
            executionTime,
          ),
        );
      } catch (err: any) {
        return ResultToMcpResponse(
          error(
            i18n.t("error.uploadFail", { message: err.message }),
          ),
        );
      }
    }),
  );
}
