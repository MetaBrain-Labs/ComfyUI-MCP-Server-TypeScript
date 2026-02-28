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
import { deterministicRandom, validateToken } from "../services/validateToken";
import { DynamicWorkflowToolData } from "../types/dynamic-tool";
import { error, errorWithDetail, errorWithToken, ok } from "../types/result";
import {
  buildComfyViewUrls,
  ResultToMcpResponse,
  ResultToMcpStringResponse,
  withMcpErrorHandling,
} from "../utils/mcp-helpers";
import { WorkflowConverter } from "../utils/workflow-converter";
import { ComfyClient } from "../utils/ws";

const client = new ComfyClient();
await client.connect();

const converter = new WorkflowConverter();
await converter.init();

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

/**
 * @METHOD
 * @description 提供通用Prompt
 * @author LaiFQZzr
 * @date 2026/02/24 15:47
 */
server.registerTool(
  "cui_get_core_manual",
  {
    title: i18n.t("tool.cui_get_core_manual.title"),
    description: i18n.t("tool.cui_get_core_manual.description"),
    inputSchema: {},
  },
  withMcpErrorHandling(async () => {
    const defaultRule = await readFile(COMMON.DEFAULT_RULE_PATH, "utf-8");
    return ResultToMcpResponse(
      ok(i18n.t("tool.cui_get_core_manual.success"), defaultRule, {
        action: "cui_get_core_manual",
      }),
    );
  }),
);

/**
 * @METHOD
 * @description 获取工作流任务目录，并且格式化（提炼）任务信息，任务信息保存本地及返回输出给 AGENT
 * @author LaiFQZzr
 * @date 2026/02/02 09:30
 */
server.registerTool(
  "cui_get_workflows_catalog",
  {
    title: i18n.t("tool.cui_get_workflows_catalog.title"),
    description: i18n.t("tool.cui_get_workflows_catalog.description"),
    inputSchema: {
      maxItems: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .default(10)
        .describe(
          i18n.t("tool.cui_get_workflows_catalog.inputSchema.maxItems"),
        ),
      token: z
        .string()
        .optional()
        .describe(i18n.t("tool.cui_get_workflows_catalog.inputSchema.token")),
      enableWorkflow: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          i18n.t("tool.cui_get_workflows_catalog.inputSchema.enableWorkflow"),
        ),
    },
  },
  withMcpErrorHandling(async ({ maxItems, token, enableWorkflow }) => {
    // token校验失败，启用默认Prompt
    if (!token || !validateToken({ token })) {
      const token = deterministicRandom({
        seed: "my-seed",
        referenceTime: Date.now(),
      });
      // 让AGENT去加载通用Prompt
      return ResultToMcpResponse(
        errorWithToken(
          i18n.t("error.notTokenError", {
            token,
          }),
          token,
        ),
      );
    }

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
    await collectAndSaveFormatTaskFromWorkflows(client, converter);

    const content = await readFile(COMMON.WORKFLOW_PATH, "utf-8");

    return ResultToMcpStringResponse(content);
  }),
);

/**
 * @METHOD
 * @description 获取指定工作流的详细 API 定义（输入节点、参数类型、默认值）。
 * @author LaiFQZzr
 * @date 2026/02/28 10:46
 */
server.registerTool(
  "cui_get_workflow_API",
  {
    title: i18n.t("tool.cui_get_workflow_API.title"),
    description: i18n.t("tool.cui_get_workflow_API.description"),
    inputSchema: {
      workflowName: z
        .string()
        .describe(i18n.t("tool.cui_get_workflow_API.inputSchema.workflowName")),
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
        i18n.t("tool.cui_get_workflow_API.success"),
        result,
        {
          action: "cui_get_workflow_API",
        },
        executionTime,
      ),
    );
  }),
);

/**
 * @METHOD
 * @description 根据prompt_id获取任务详情
 * @author LaiFQZzr
 * @date 2026/02/03 10:31
 */
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

/**
 * @METHOD
 * @description 基于历史任务创建动态 Workflow Tool
 *              该工具会分析历史任务的 prompts 结构，提取可配置参数，
 *              生成一个新的 MCP Tool，允许修改参数值但保持结构不变
 * @author LaiFQZzr
 * @date 2026/02/03 14:50
 */
server.registerTool(
  "cui_mount_workflow",
  {
    title: i18n.t("tool.cui_mount_workflow.title"),
    description: i18n.t("tool.cui_mount_workflow.description"),
    inputSchema: {
      promptId: z
        .string()
        .describe(i18n.t("tool.cui_mount_workflow.inputSchema.promptId")),
      toolName: z
        .string()
        .regex(
          /^[a-zA-Z0-9_-]+$/,
          "Tool 名称只能包含字母、数字、下划线、连字符",
        )
        .describe(i18n.t("tool.cui_mount_workflow.inputSchema.toolName")),
      title: z
        .string()
        .optional()
        .describe(i18n.t("tool.cui_mount_workflow.inputSchema.title")),
      description: z
        .string()
        .optional()
        .describe(i18n.t("tool.cui_mount_workflow.inputSchema.description")),
    },
  },
  withMcpErrorHandling(async ({ promptId, toolName, title, description }) => {
    // 检查 Tool 名称是否已存在
    if (hasDynamicTool(toolName)) {
      return ResultToMcpResponse(
        error(
          i18n.t("error.toolAlreadyExistError", {
            toolName,
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
      toolName,
      promptId,
      workflow,
      title,
      description,
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
        i18n.t("tool.cui_mount_workflow.success", {
          toolName,
        }),
        response,
        {
          action: "cui_mount_workflow",
        },
        executionTime,
      ),
    );
  }),
);

/**
 * @METHOD
 * @description 执行动态 Workflow Tool
 * @author LaiFQZzr
 * @date 2026/02/03 14:50
 */
server.registerTool(
  "cui_execute_workflow",
  {
    title: i18n.t("tool.cui_execute_workflow.title"),
    description: i18n.t("tool.cui_execute_workflow.description"),
    inputSchema: {
      toolName: z
        .string()
        .describe(i18n.t("tool.cui_execute_workflow.inputSchema.toolName")),
      isAsync: z
        .boolean()
        .default(false)
        .describe(i18n.t("tool.cui_execute_workflow.inputSchema.isAsync")),
      params: z
        .record(z.string(), z.any())
        .optional()
        .describe(i18n.t("tool.cui_execute_workflow.inputSchema.params")),
    },
  },
  withMcpErrorHandling(async ({ toolName, isAsync, params = {} }, extra) => {
    const startTime = Date.now();

    const tool = getDynamicTool(toolName);

    if (!tool) {
      return ResultToMcpResponse(
        errorWithDetail(
          i18n.t("error.toolNotAlreadyExistError", {
            toolName,
          }),
          `availableTools: ${getAllDynamicTools().map((t) => t.name)}`,
        ),
      );
    }

    if (!client.isConnected()) {
      await client.connect();
    }

    if (!client.isConnected()) {
      throw new McpError(ErrorCode.InternalError, "WebSocket NOT CONNECTED");
    }

    // 获取拼接AGENT修改参数后的Prompt
    const execResult = await executeDynamicWorkflowTool(
      toolName,
      params,
      client,
    );

    // 根据拼接后的Prompt执行工作流
    const clientId = client.getClientId();

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
        client,
        promptId: submitResult.prompt_id,
        timeout: 10 * 60 * 1000,
        onProgress,
      });

      if (!executionResult.success) {
        deleteDynamicTool(toolName);

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
          i18n.t("tool.cui_execute_workflow.success"),
          {
            promptId: submitResult.prompt_id,
            img: buildComfyViewUrls(executionResult),
            outputs: executionResult.outputs,
          },
          {
            action: "cui_execute_workflow",
          },
          executionTime,
        ),
      );
    }

    const executionTime = Date.now() - startTime;

    return ResultToMcpResponse(
      ok(
        i18n.t("tool.cui_execute_workflow.success"),
        {
          promptId: submitResult.prompt_id,
          description: i18n.t("tool.cui_execute_workflow.asyncSupplement"),
        },
        {
          action: "cui_execute_workflow",
        },
        executionTime,
      ),
    );
  }),
);

/**
 * @METHOD
 * @description AGENT自行提供API_JSON，并执行工作流
 * @author LaiFQZzr
 * @date 2026/02/28 11:29
 */
server.registerTool(
  "cui_execute_custom_workflow",
  {
    title: i18n.t("tool.cui_execute_custom_workflow.title"),
    description: i18n.t("tool.cui_execute_custom_workflow.description"),
    inputSchema: {
      workflowName: z
        .string()
        .describe(
          i18n.t("tool.cui_execute_custom_workflow.inputSchema.workflowName "),
        ),
      isAsync: z
        .boolean()
        .default(false)
        .describe(
          i18n.t("tool.cui_execute_custom_workflow.inputSchema.isAsync"),
        ),
      apiJson: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          i18n.t("tool.cui_execute_custom_workflow.inputSchema.apiJson"),
        ),
    },
  },
  withMcpErrorHandling(async ({ workflowName, isAsync, apiJson }, extra) => {
    const startTime = Date.now();

    if (!client.isConnected()) {
      await client.connect();
    }

    if (!client.isConnected()) {
      throw new McpError(ErrorCode.InternalError, "WebSocket NOT CONNECTED");
    }

    // 根据拼接后的Prompt执行工作流
    const clientId = client.getClientId();

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
          i18n.t("tool.cui_execute_custom_workflow.success", {
            workflowName: workflowName,
            promptId: submitResult.prompt_id,
          }),
          {
            promptId: submitResult.prompt_id,
            img: buildComfyViewUrls(executionResult),
            outputs: executionResult.outputs,
          },
          {
            action: "cui_execute_custom_workflow",
          },
          executionTime,
        ),
      );
    }

    const executionTime = Date.now() - startTime;

    return ResultToMcpResponse(
      ok(
        i18n.t("tool.cui_execute_custom_workflow.success", {
          workflowName: workflowName,
          promptId: submitResult.prompt_id,
        }),
        {
          promptId: submitResult.prompt_id,
          description: i18n.t("tool.cui_execute_workflow.asyncSupplement"),
        },
        {
          action: "cui_execute_custom_workflow",
        },
        executionTime,
      ),
    );
  }),
);

/**
 * @METHOD
 * @description 取消运行中的工作流
 * @author LaiFQZzr
 * @date 2026/02/28 10:46
 */
server.registerTool(
  "cui_cancel_task",
  {
    title: i18n.t("tool.cui_cancel_task.title"),
    description: i18n.t("tool.cui_cancel_task.description"),
    inputSchema: {
      promptId: z
        .string()
        .describe(i18n.t("tool.cui_cancel_task.inputSchema.promptId")),
    },
  },
  withMcpErrorHandling(async ({ promptId }) => {
    const startTime = Date.now();

    const result = await api.interrupt(promptId);

    const executionTime = Date.now() - startTime;

    return ResultToMcpResponse(
      ok(
        i18n.t("tool.cui_cancel_task.success", {
          promptId,
        }),
        result,
        {
          action: "cui_cancel_task",
        },
        executionTime,
      ),
    );
  }),
);

/**
 * @METHOD
 * @description 查询任务执行状态及最终产物。
 * @author LaiFQZzr
 * @date 2026/02/28 14:38
 */
server.registerTool(
  "cui_get_task_result",
  {
    title: i18n.t("tool.cui_get_task_result.title"),
    description: i18n.t("tool.cui_get_task_result.description"),
    inputSchema: {
      promptId: z
        .string()
        .describe(i18n.t("tool.cui_get_task_result.inputSchema.promptId")),
    },
  },
  withMcpErrorHandling(async ({ promptId }) => {
    const startTime = Date.now();

    const result = await api.getDetailHistoryTasks(promptId);

    const executionTime = Date.now() - startTime;

    return ResultToMcpResponse(
      ok(
        i18n.t("tool.cui_get_task_result.success"),
        result,
        {
          action: "cui_get_task_result",
        },
        executionTime,
      ),
    );
  }),
);

/**
 * @METHOD
 * @description 获取系统状态
 * @author LaiFQZzr
 * @date 2026/02/28 15:22
 */
server.registerTool(
  "cui_get_system_status",
  {
    title: i18n.t("tool.cui_get_system_status.title"),
    description: i18n.t("tool.cui_get_system_status.description"),
    inputSchema: {},
  },
  withMcpErrorHandling(async ({}) => {
    const startTime = Date.now();

    const result = await api.getSystemStatus();

    const executionTime = Date.now() - startTime;

    return ResultToMcpResponse(
      ok(
        i18n.t("tool.cui_get_system_status.success"),
        result,
        {
          action: "cui_get_system_status",
        },
        executionTime,
      ),
    );
  }),
);

/**
 * @METHOD
 * @description 检索模型文件
 * @author LaiFQZzr
 * @date 2026/02/28 14:56
 */
server.registerTool(
  "cui_list_models",
  {
    title: i18n.t("tool.cui_list_models.title"),
    description: i18n.t("tool.cui_list_models.description"),
    inputSchema: {
      typeName: z
        .string()
        .optional()
        .describe(i18n.t("tool.cui_list_models.inputSchema.type_name")),
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
          ? i18n.t("tool.cui_list_models.successButNoModel")
          : i18n.t("tool.cui_list_models.success"),
        result,
        {
          action: "cui_list_models",
        },
        executionTime,
      ),
    );
  }),
);

/**
 * @METHOD
 * @description 导入资产到ComfyUI中
 * @author LaiFQZzr
 * @date 2026/02/25 16:08
 */
server.registerTool(
  "cui_upload_assets",
  {
    title: i18n.t("tool.cui_upload_assets.title"),
    description: i18n.t("tool.cui_upload_assets.description"),
    inputSchema: {
      fileSource: z
        .string()
        .describe(i18n.t("tool.cui_upload_assets.inputSchema.fileSource")),
      mimeType: z
        .string()
        .optional()
        .describe(i18n.t("tool.cui_upload_assets.inputSchema.mimeType")),
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
        finalFileName = urlWithoutQuery.split("/").pop() || "downloaded.png";
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
          i18n.t("tool.cui_upload_assets.success", {
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

export default server;
