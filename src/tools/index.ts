import "@modelcontextprotocol/sdk/client/streamableHttp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import "dotenv/config";
import { z } from "zod";

import fs from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { api } from "../api/api";
import { COMMON } from "../constants";
import i18n from "../i18n";
import {
  collectAndSaveFormatTask,
  collectAndSaveFormatTaskFromWorkflows,
  getTaskDetailByPromptId,
  saveAssetsByPromptId,
} from "../services";
import {
  createDynamicWorkflowTool,
  deleteDynamicTool,
  executeDynamicWorkflowTool,
  generateToolExampleParams,
  getAllDynamicTools,
  getDynamicTool,
  hasDynamicTool,
} from "../services/dynamic-tool";
import {
  executeCustomWorkflowTaskByPrompts,
  executeWorkflowTaskByPrompts,
  ExecutionProgress,
  waitForExecutionCompletion,
} from "../services/tasks";
import { DynamicWorkflowToolData } from "../types/dynamic-tool";
import { error, errorWithDetail, ok } from "../types/result";
import {
  buildComfyViewUrls,
  ResultToMcpResponse,
  ResultToMcpStringResponse,
  withMcpErrorHandling,
} from "../utils/mcp-helpers";
import { WorkflowConverter } from "../utils/workflow-converter";
import { ComfyClient } from "../utils/ws";
import { saveCustomWorkflow } from "../services/saveWorkflow";

export class ComfyMcpManager {
  private client: ComfyClient;
  private converter: WorkflowConverter;
  private isInitialized: boolean = false;

  constructor() {
    this.client = new ComfyClient();
    this.converter = new WorkflowConverter();
  }

  /**
   * @METHOD
   * @description 全局初始化，负责连接外部服务（只需在应用启动时调用一次）
   * @author LaiFQZzr
   */
  public async initialize() {
    if (this.isInitialized) return;

    await this.client.connect();
    console.error("ComfyClient 已连接");

    await this.converter.init();
    console.error("WorkflowConverter 已初始化");

    this.isInitialized = true;
  }

  /**
   * @METHOD
   * @description 为每个 MCP 客户端请求创建全新的 Server 实例
   * @author LaiFQZzr
   */
  public createSessionServer(): McpServer {
    /**
     * @METHOD
     * @description 创建 MCP 服务实例
     * @author LaiFQZzr
     * @date 2026/01/09 12:02
     */
    const server = new McpServer(
      {
        name: "comfy-ui-advanced",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {
            listChanged: true,
          },
          resources: {
            listChanged: true,
            subscribe: true,
          },
        },
      },
    );

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

    server.registerTool(
      "get_workflows_catalog",
      {
        title: i18n.t("tool.get_workflows_catalog.title"),
        description: i18n.t("tool.get_workflows_catalog.description"),
        inputSchema: {
          maxItems: z
            .number()
            .min(1)
            .max(10)
            .optional()
            .default(10)
            .describe(
              i18n.t("tool.get_workflows_catalog.inputSchema.maxItems"),
            ),
        },
      },
      withMcpErrorHandling(async ({ maxItems }) => {
        let hasMore: boolean = true;

        // 获取历史任务中为成功的任务
        for (let i = 0; hasMore; i++) {
          const result = await collectAndSaveFormatTask({
            maxItems,
            offset: i * maxItems,
            append: i > 0,
          });

          hasMore = result.detail.data?.pagination?.hasNextPage || false;
        }

        // 获取所有初始工作流对应的任务
        await collectAndSaveFormatTaskFromWorkflows(
          this.client,
          this.converter,
        );

        const content = await readFile(COMMON.WORKFLOW_PATH, "utf-8");

        return ResultToMcpStringResponse(content);
      }),
    );

    server.registerTool(
      "get_workflow_API",
      {
        title: i18n.t("tool.get_workflow_API.title"),
        description: i18n.t("tool.get_workflow_API.description"),
        inputSchema: {
          workflowName: z
            .string()
            .describe(i18n.t("tool.get_workflow_API.inputSchema.workflowName")),
        },
      },
      withMcpErrorHandling(async ({ workflowName }) => {
        if (!workflowName.endsWith(".json")) {
          return ResultToMcpResponse(
            error(
              i18n.t("error.getWorkflowFormatError", {
                workflowName,
              }),
            ),
          );
        }

        const startTime = Date.now();

        const result = await api.getDetailUserData(
          encodeURIComponent(workflowName),
        );

        const executionTime = Date.now() - startTime;

        return ResultToMcpResponse(
          ok(
            i18n.t("tool.get_workflow_API.success"),
            result,
            {
              action: "get_workflow_API",
            },
            executionTime,
          ),
        );
      }),
    );

    server.registerTool(
      "cui_get_task_detail",
      {
        title: i18n.t("tool.cui_get_task_detail.title"),
        description: i18n.t("tool.cui_get_task_detail.description"),
        inputSchema: {
          promptId: z
            .string()
            .describe(i18n.t("tool.cui_get_task_detail.inputSchema.promptId")),
        },
      },
      withMcpErrorHandling(async ({ promptId }) => {
        const startTime = Date.now();

        const result = await getTaskDetailByPromptId({
          promptId: promptId,
        });

        const executionTime = Date.now() - startTime;

        return ResultToMcpResponse(
          ok(
            i18n.t("tool.cui_get_task_detail.success"),
            result,
            {
              action: "cui_get_task_detail",
            },
            executionTime,
          ),
        );
      }),
    );

    server.registerTool(
      "mount_workflow",
      {
        title: i18n.t("tool.mount_workflow.title"),
        description: i18n.t("tool.mount_workflow.description"),
        inputSchema: {
          promptId: z
            .string()
            .describe(i18n.t("tool.mount_workflow.inputSchema.promptId")),
          workflowName: z
            .string()
            .regex(
              /^[a-zA-Z0-9_-]+$/,
              "Tool 名称只能包含字母、数字、下划线、连字符",
            )
            .describe(i18n.t("tool.mount_workflow.inputSchema.workflowName")),
        },
      },
      withMcpErrorHandling(async ({ promptId, workflowName }) => {
        // 检查 Tool 名称是否已存在
        if (hasDynamicTool(workflowName)) {
          return ResultToMcpResponse(
            error(
              i18n.t("error.toolAlreadyExistError", {
                workflowName,
              }),
            ),
          );
        }

        const startTime = Date.now();

        // 获取任务详情
        const result = await getTaskDetailByPromptId({
          promptId: promptId,
        });

        if (!result.success || !result.detail.data) {
          return ResultToMcpResponse(error(i18n.t("error.getTaskDetailFail")));
        }

        const workflow = result.detail.data;

        // 创建动态 Tool
        const tool = createDynamicWorkflowTool(
          workflowName,
          promptId,
          workflow,
        );

        // 构建响应
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
            i18n.t("tool.mount_workflow.success", {
              workflowName,
            }),
            response,
            {
              action: "mount_workflow",
            },
            executionTime,
          ),
        );
      }),
    );

    server.registerTool(
      "queue_prompt",
      {
        title: i18n.t("tool.queue_prompt.title"),
        description: i18n.t("tool.queue_prompt.description"),
        inputSchema: {
          workflowName: z
            .string()
            .describe(i18n.t("tool.queue_prompt.inputSchema.workflowName")),
          isAsync: z
            .boolean()
            .default(false)
            .describe(i18n.t("tool.queue_prompt.inputSchema.isAsync")),
          params: z
            .record(z.string(), z.any())
            .optional()
            .describe(i18n.t("tool.queue_prompt.inputSchema.params")),
        },
      },
      withMcpErrorHandling(
        async ({ workflowName, isAsync, params = {} }, extra) => {
          const startTime = Date.now();

          const tool = getDynamicTool(workflowName);

          if (!tool) {
            return ResultToMcpResponse(
              errorWithDetail(
                i18n.t("error.toolNotAlreadyExistError", {
                  workflowName,
                }),
                `availableTools: ${getAllDynamicTools().map((t) => t.name)}`,
              ),
            );
          }

          if (!this.client.isConnected()) {
            await this.client.connect();
          }

          if (!this.client.isConnected()) {
            throw new McpError(
              ErrorCode.InternalError,
              "WebSocket NOT CONNECTED",
            );
          }

          // 获取拼接AGENT修改参数后的Prompt
          const execResult = await executeDynamicWorkflowTool(
            workflowName,
            params,
            this.client,
          );

          // 根据拼接后的Prompt执行工作流
          const clientId = this.client.getClientId();

          const submitResult = await executeWorkflowTaskByPrompts({
            prompts: execResult,
            clientId: clientId,
          });

          console.error(`[工作流已提交] Prompt ID: ${submitResult.prompt_id}`);

          if (!isAsync) {
            // 获取 progressToken，用于发送进度通知
            // 注意：AGENT 需要在调用工具时在 _meta.progressToken 中传入 token
            const progressToken = extra?._meta?.progressToken as
              | number
              | string
              | undefined;

            if (progressToken) {
              console.error(`[进度通知] 已启用，Token: ${progressToken}`);
            } else {
              console.error(`[进度通知] 未启用（AGENT 未传入 progressToken）`);
            }

            const progressInterval = 2000; // 最小进度通知间隔 (毫秒)
            let lastProgressTime = 0;

            // 进度回调函数
            const onProgress = async (progress: ExecutionProgress) => {
              const now = Date.now();
              // 限制进度通知频率，避免过于频繁
              if (progressToken && now - lastProgressTime >= progressInterval) {
                lastProgressTime = now;
                // 计算进度值 (0-1 之间)
                const progressValue =
                  progress.percent !== undefined
                    ? progress.percent / 100
                    : progress.stage === "completed"
                      ? 1
                      : 0.5;

                try {
                  // 发送进度通知到 AGENT
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
              client: this.client,
              promptId: submitResult.prompt_id,
              timeout: 10 * 60 * 1000,
              onProgress,
            });

            if (!executionResult.success) {
              deleteDynamicTool(workflowName);

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
                i18n.t("tool.queue_prompt.success"),
                {
                  promptId: submitResult.prompt_id,
                  img: buildComfyViewUrls(executionResult),
                  outputs: executionResult.outputs,
                },
                {
                  action: "queue_prompt",
                },
                executionTime,
              ),
            );
          }

          const executionTime = Date.now() - startTime;

          return ResultToMcpResponse(
            ok(
              i18n.t("tool.queue_prompt.success"),
              {
                promptId: submitResult.prompt_id,
                description: i18n.t("tool.queue_prompt.asyncSupplement"),
              },
              {
                action: "queue_prompt",
              },
              executionTime,
            ),
          );
        },
      ),
    );

    server.registerTool(
      "queue_custom_prompt",
      {
        title: i18n.t("tool.queue_custom_prompt.title"),
        description: i18n.t("tool.queue_custom_prompt.description"),
        inputSchema: {
          workflowName: z
            .string()
            .describe(
              i18n.t("tool.queue_custom_prompt.inputSchema.workflowName "),
            ),
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
        async ({ workflowName, isAsync, apiJson }, extra) => {
          const startTime = Date.now();

          if (!this.client.isConnected()) {
            await this.client.connect();
          }

          if (!this.client.isConnected()) {
            throw new McpError(
              ErrorCode.InternalError,
              "WebSocket NOT CONNECTED",
            );
          }

          // 根据拼接后的Prompt执行工作流
          const clientId = this.client.getClientId();

          const submitResult = await executeCustomWorkflowTaskByPrompts({
            prompts: apiJson,
            clientId: clientId,
          });

          console.error(`[工作流已提交] Prompt ID: ${submitResult.prompt_id}`);

          if (!isAsync) {
            // 获取 progressToken，用于发送进度通知
            // 注意：AGENT 需要在调用工具时在 _meta.progressToken 中传入 token
            const progressToken = extra?._meta?.progressToken as
              | number
              | string
              | undefined;

            if (progressToken) {
              console.error(`[进度通知] 已启用，Token: ${progressToken}`);
            } else {
              console.error(`[进度通知] 未启用（AGENT 未传入 progressToken）`);
            }

            const progressInterval = 2000; // 最小进度通知间隔 (毫秒)
            let lastProgressTime = 0;

            // 进度回调函数
            const onProgress = async (progress: ExecutionProgress) => {
              const now = Date.now();
              // 限制进度通知频率，避免过于频繁
              if (progressToken && now - lastProgressTime >= progressInterval) {
                lastProgressTime = now;
                // 计算进度值 (0-1 之间)
                const progressValue =
                  progress.percent !== undefined
                    ? progress.percent / 100
                    : progress.stage === "completed"
                      ? 1
                      : 0.5;

                try {
                  // 发送进度通知到 AGENT
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
              client: this.client,
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
                  workflowName: workflowName,
                  promptId: submitResult.prompt_id,
                }),
                {
                  promptId: submitResult.prompt_id,
                  img: buildComfyViewUrls(executionResult),
                  outputs: executionResult.outputs,
                },
                {
                  action: "queue_custom_prompt",
                },
                executionTime,
              ),
            );
          }

          const executionTime = Date.now() - startTime;

          return ResultToMcpResponse(
            ok(
              i18n.t("tool.queue_custom_prompt.success", {
                workflowName: workflowName,
                promptId: submitResult.prompt_id,
              }),
              {
                promptId: submitResult.prompt_id,
                description: i18n.t("tool.queue_prompt.asyncSupplement"),
              },
              {
                action: "queue_custom_prompt",
              },
              executionTime,
            ),
          );
        },
      ),
    );

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

        const filePath = await saveCustomWorkflow(filename, apiJson);

        const executionTime = Date.now() - startTime;

        return ResultToMcpResponse(
          ok(
            i18n.t("tool.save_custom_workflow.success", {
              filePath,
            }),
            {},
            {
              action: "save_custom_workflow",
            },
            executionTime,
          ),
        );
      }),
    );

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
            .describe(
              i18n.t("tool.save_task_assets.inputSchema.destinationDir"),
            ),
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
              error(
                i18n.t("error.dirNotExist", {
                  destinationDir,
                }),
              ),
            );
          }

          const stat = fs.statSync(destinationDir);

          if (!stat.isDirectory()) {
            return ResultToMcpResponse(
              error(
                i18n.t("error.notDir", {
                  destinationDir,
                }),
              ),
            );
          }

          try {
            fs.accessSync(destinationDir, fs.constants.W_OK);
          } catch {
            return ResultToMcpResponse(
              error(
                i18n.t("error.notWritableDir", {
                  destinationDir,
                }),
              ),
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
            i18n.t("tool.save_task_assets.success", {
              assetsNames,
              filePath,
            }),
            {},
            {
              action: "save_task_assets",
            },
            executionTime,
          ),
        );
      }),
    );

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
            i18n.t("tool.interrupt_prompt.success", {
              promptId,
            }),
            result,
            {
              action: "interrupt_prompt",
            },
            executionTime,
          ),
        );
      }),
    );

    server.registerTool(
      "get_prompt_result",
      {
        title: i18n.t("tool.get_prompt_result.title"),
        description: i18n.t("tool.get_prompt_result.description"),
        inputSchema: {
          promptId: z
            .string()
            .describe(i18n.t("tool.get_prompt_result.inputSchema.promptId")),
        },
      },
      withMcpErrorHandling(async ({ promptId }) => {
        const startTime = Date.now();

        const result = await api.getDetailHistoryTasks(promptId);

        const executionTime = Date.now() - startTime;

        return ResultToMcpResponse(
          ok(
            i18n.t("tool.get_prompt_result.success"),
            result,
            {
              action: "get_prompt_result",
            },
            executionTime,
          ),
        );
      }),
    );

    server.registerTool(
      "get_system_status",
      {
        title: i18n.t("tool.get_system_status.title"),
        description: i18n.t("tool.get_system_status.description"),
        inputSchema: {},
      },
      withMcpErrorHandling(async ({}) => {
        const startTime = Date.now();

        const result = await api.getSystemStatus();

        const executionTime = Date.now() - startTime;

        return ResultToMcpResponse(
          ok(
            i18n.t("tool.get_system_status.success"),
            result,
            {
              action: "get_system_status",
            },
            executionTime,
          ),
        );
      }),
    );

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
            {
              action: "list_models",
            },
            executionTime,
          ),
        );
      }),
    );

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
                  i18n.t("error.downloadAssetsFail", {
                    status: res.status,
                  }),
                ),
              );
            }

            // 获取文件流并转为 Buffer
            const arrayBuffer = await res.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);

            // 尝试从 URL 中提取文件名 (去除查询参数如 ?v=1)
            const urlWithoutQuery = fileSource.split("?")[0];
            finalFileName =
              urlWithoutQuery.split("/").pop() || "downloaded.png";
          } else {
            // 检查文件是否存在
            if (!fs.existsSync(fileSource)) {
              return ResultToMcpResponse(
                error(
                  i18n.t("error.fileNotExistError", {
                    fileSource,
                  }),
                ),
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
              i18n.t("tool.upload_assets.success", {
                finalFileName,
              }),
              response,
              {
                action: "cui_upload_file",
              },
              executionTime,
            ),
          );
        } catch (err: any) {
          return ResultToMcpResponse(
            error(
              i18n.t("error.uploadFail", {
                message: err.message,
              }),
            ),
          );
        }
      }),
    );

    return server;
  }

  /**
   * @METHOD
   * @description 关闭所有底层连接（优雅退出时调用）
   */
  public shutdown() {
    if (this.isInitialized) {
      this.client.close();
      console.error("Manager 底层资源已清理");
    }
  }
}

export const mcpManager = new ComfyMcpManager();
