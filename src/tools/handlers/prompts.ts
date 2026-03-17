import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFile } from "fs/promises";
import { z } from "zod";
import { COMMON } from "../../constants";

export function registerPrompts(server: McpServer) {
  server.registerPrompt(
    "get_prompts",
    {
      title: "根据注入状态获取相关信息",
      description:
        "根据注入状态（External、CompleteInspection、InitialInspection）获取可使用Tools以及相关prompt",
      argsSchema: {
        inspection_status: z
          .enum(["External", "InitialInspection", "CompleteInspection"])
          .describe("注入状态"),
      },
    },
    async ({ inspection_status }) => {
      let rule: string;
      let toolsList: string[] = [];

      try {
        if (inspection_status === "External") {
          rule = await readFile(COMMON.EXTERNAL_RULE_PATH, "utf-8");
        } else {
          rule = await readFile(COMMON.CATALOG_RULE_PATH, "utf-8");
        }
      } catch {
        rule = await readFile(COMMON.DEFAULT_RULE_PATH, "utf-8");
      }

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
