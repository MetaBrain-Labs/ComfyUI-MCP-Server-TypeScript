import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import i18n from "../../i18n";
import {
  executeCustomWorkflowTaskByPrompts,
  ExecutionProgress,
} from "../../services/task/execution";
import { waitForExecutionCompletion } from "../../services/task/wait";
import { error, errorWithDetail, ok } from "../../types/result";
import { buildComfyViewUrls } from "../../utils/mcp-helpers";
import { ResultToMcpResponse, withMcpErrorHandling } from "../../utils/mcp-helpers";
import { ComfyClient } from "../../utils/ws";

export function registerQueueCustomPrompt(server: McpServer, client: ComfyClient) {
  server.registerTool(
    "queue_custom_prompt",
    {
      title: i18n.t("tool.queue_custom_prompt.title"),
      description: i18n.t("tool.queue_custom_prompt.description"),
      inputSchema: {
        workflowName: z
          .string()
          .describe(i18n.t("tool.queue_custom_prompt.inputSchema.workflowName ")),
        isAsync: z
          .boolean()
          .default(false)
          .describe(i18n.t("tool.queue_custom_prompt.inputSchema.isAsync")),
        apiJson: z
          .record(z.string(), z.any())
          .optional()
          .describe(i18n.t("tool.queue_custom_prompt.inputSchema.apiJson")),
      },
    },
    withMcpErrorHandling(
      async ({ workflowName, isAsync, apiJson = {} }, extra) => {
        const startTime = Date.now();

        if (!client.isConnected()) {
          await client.connect();
        }
        if (!client.isConnected()) {
          throw new McpError(ErrorCode.InternalError, "WebSocket NOT CONNECTED");
        }

        const clientId = client.getClientId();
        const submitResult = await executeCustomWorkflowTaskByPrompts({
          prompts: apiJson,
          clientId,
        });

        console.error(`[工作流已提交] Prompt ID: ${submitResult.prompt_id}`);

        if (!isAsync) {
          const progressToken = extra?._meta?.progressToken as
            | number
            | string
            | undefined;

          if (progressToken) {
            console.error(`[进度通知] 已启用，Token: ${progressToken}`);
          } else {
            console.error(`[进度通知] 未启用（AGENT 未传入 progressToken）`);
          }

          const progressInterval = 2000;
          let lastProgressTime = 0;

          const onProgress = async (progress: ExecutionProgress) => {
            const now = Date.now();
            if (progressToken && now - lastProgressTime >= progressInterval) {
              lastProgressTime = now;
              const progressValue =
                progress.percent !== undefined
                  ? progress.percent / 100
                  : progress.stage === "completed"
                    ? 1
                    : 0.5;

              try {
                await extra?.sendNotification?.({
                  method: "notifications/progress",
                  params: {
                    progressToken,
                    progress: progressValue,
                    total: 1,
                    message: progress.message,
                  },
                });
                console.error(
                  `[进度通知] Token: ${progressToken}, Progress: ${(progressValue * 100).toFixed(1)}%`,
                );
              } catch (err) {
                console.error(`[进度通知] 发送失败:`, err);
              }
            }
          };

          const executionResult = await waitForExecutionCompletion({
            client,
            promptId: submitResult.prompt_id,
            timeout: 10 * 60 * 1000,
            onProgress,
          });

          if (!executionResult.success) {
            return ResultToMcpResponse(
              errorWithDetail(
                i18n.t("error.workflowExecuteFail", {
                  error: executionResult.error,
                }),
                `Prompt ID: ${submitResult.prompt_id}`,
              ),
            );
          }

          const executionTime = Date.now() - startTime;
          return ResultToMcpResponse(
            ok(
              i18n.t("tool.queue_custom_prompt.success", {
                workflowName,
                promptId: submitResult.prompt_id,
              }),
              {
                promptId: submitResult.prompt_id,
                img: buildComfyViewUrls(executionResult),
                outputs: executionResult.outputs,
              },
              { action: "queue_custom_prompt" },
              executionTime,
            ),
          );
        }

        const executionTime = Date.now() - startTime;
        return ResultToMcpResponse(
          ok(
            i18n.t("tool.queue_custom_prompt.success", {
              workflowName,
              promptId: submitResult.prompt_id,
            }),
            {
              promptId: submitResult.prompt_id,
              description: i18n.t("tool.queue_prompt.asyncSupplement"),
            },
            { action: "queue_custom_prompt" },
            executionTime,
          ),
        );
      },
    ),
  );
}
