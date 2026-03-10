import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { api } from "../../api/api";
import i18n from "../../i18n";
import { ok } from "../../types/result";
import { ResultToMcpResponse, withMcpErrorHandling } from "../../utils/mcp-helpers";

export function registerInterruptPrompt(server: McpServer) {
  server.registerTool(
    "interrupt_prompt",
    {
      title: i18n.t("tool.interrupt_prompt.title"),
      description: i18n.t("tool.interrupt_prompt.description"),
      inputSchema: {
        promptId: z
          .string()
          .describe(i18n.t("tool.interrupt_prompt.inputSchema.promptId")),
      },
    },
    withMcpErrorHandling(async ({ promptId }) => {
      const startTime = Date.now();
      const result = await api.interrupt(promptId);
      const executionTime = Date.now() - startTime;

      return ResultToMcpResponse(
        ok(
          i18n.t("tool.interrupt_prompt.success", { promptId }),
          result,
          { action: "interrupt_prompt" },
          executionTime,
        ),
      );
    }),
  );
}
