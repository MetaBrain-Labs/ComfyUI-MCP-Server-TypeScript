import { readFile } from "fs/promises";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { COMMON } from "../../constants";
import i18n from "../../i18n";
import { ok } from "../../types/result";
import {
  ResultToMcpResponse,
  withMcpErrorHandling,
} from "../../utils/mcp-helpers";

export function registerGetCoreManual(server: McpServer) {
  server.registerTool(
    "get_core_manual",
    {
      title: i18n.t("tool.get_core_manual.title"),
      description: i18n.t("tool.get_core_manual.description"),
      inputSchema: {},
    },
    withMcpErrorHandling(async () => {
      const defaultRule = await readFile(COMMON.DEFAULT_RULE_PATH, "utf-8");
      return ResultToMcpResponse(
        ok(i18n.t("tool.get_core_manual.success"), defaultRule, {
          action: "get_core_manual",
        }),
      );
    }),
  );
}
