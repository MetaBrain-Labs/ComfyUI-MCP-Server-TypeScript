import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFile } from "fs/promises";
import { z } from "zod";
import { COMMON } from "../../constants";
import i18n from "../../i18n";
import { SourceType } from "../../types/common";
import { toolInspectionStatusMap } from "./tool-status-map";

export function registerPrompts(server: McpServer) {
  server.registerPrompt(
    "get_prompts",
    {
      title: i18n.t("tool.get_prompts.title"),
      description: i18n.t("tool.get_prompts.description"),
      argsSchema: {
        inspection_status: z
          .enum(["External", "InitialInspection", "CompleteInspection"])
          .describe(i18n.t("tool.get_prompts.inputSchema.inspection_status")),
      },
    },
    async ({ inspection_status }) => {
      let rule: string;

      try {
        if (inspection_status === "External") {
          rule = await readFile(COMMON.EXTERNAL_RULE_PATH, "utf-8");
        } else {
          rule = await readFile(COMMON.CATALOG_RULE_PATH, "utf-8");
        }
      } catch {
        rule = await readFile(COMMON.DEFAULT_RULE_PATH, "utf-8");
      }

      // 根据 inspection_status 获取可用的工具列表
      const toolsList = Object.entries(toolInspectionStatusMap)
        .filter(([_, statuses]) =>
          statuses.includes(inspection_status as SourceType),
        )
        .map(([toolName]) => toolName);

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: rule,
            },
          },
          {
            role: "assistant",
            content: {
              type: "text",
              text: toolsList.join(","),
            },
          },
        ],
      };
    },
  );
}
