import "@modelcontextprotocol/sdk/client/streamableHttp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ErrorCode,
  McpError,
  type ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import "dotenv/config";
import { z } from "zod";
import { t } from "../i18n";
import "../i18n/locales";

import { readFile } from "fs/promises";
import { COMMON } from "../constants";
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
import { ComfyClient } from "../utils/ws";
import { WorkflowConverter } from "../utils/workflow-converter";
import fs from "fs";
import path from "path";
import { api } from "../api/api";

// 初始化连接WebSocket
const client = new ComfyClient();
await client.connect();

// 初始化WorkflowConverter
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
    title: "获取项目核心手册",
    description: `高优先级资源。必须在初始化或涉及工具调用时优先读取。包含核心协议、错误处理及参数填充策略。`,
    inputSchema: {},
  },
  withMcpErrorHandling(async () => {
    const defaultRule = await readFile(COMMON.DEFAULT_RULE_PATH, "utf-8");

    return ResultToMcpResponse(
      ok(
        `核心手册已加载，请严格根据其中的协议与参数策略执行后续操作。`,
        defaultRule,
        {
          action: "cui_get_core_manual",
        },
      ),
    );
  }),
);

// 重载服务配置

/**
 * @METHOD
 * @description 获取工作流模型
 * @author LaiFQZzr
 * @date 2026/02/02 09:30
 */
// server.registerTool(
//   "cui_list_models",
//   {
//     title: "检索模型文件",
//     description: `列出可用模型。强制规则：填写 ckpt_name 等参数前，必须先调用此工具获取精确文件名。严禁猜测或臆造名称。`,
//     inputSchema: {
//       type_name: z.string().describe("所需模型类型"),
//     },
//   },
//   withMcpErrorHandling(async ({ type_name }) => {
//     return ResultToMcpStringResponse("这是模型结果" + type_name);
//   }),
// );

/**
 * @METHOD
 * @description 获取工作流任务目录，并且格式化（提炼）任务信息，任务信息保存本地及返回输出给 AGENT
 * @author LaiFQZzr
 * @date 2026/02/02 09:30
 */
server.registerTool(
  "cui_get_workflows_catalog",
  {
    title: "获取工作流目录",
    description: `响应 ComfyUI 需求（如“画图”）。检索最佳匹配工作流。严禁猜测 ID 或名称，必须基于检索结果。`,
    inputSchema: {
      maxItems: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .default(10)
        .describe(t("workflow.collectedContent.maxItems")),
      token: z
        .string()
        .optional()
        .describe(
          "AGENT正确加载SKILL后执行`generateToken.ts`脚本后获得的token",
        ),
      enableWorkflow: z
        .boolean()
        .optional()
        .default(false)
        .describe("是否获取用户的工作流信息"),
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
          `AGENT 没有正确加载 SKILL 相关资源，请通过 cui_get_core_manual tool 获取默认 Prompt 。后续对话中请将token(${token})保存到上下文中使用`,
          token,
        ),
      );
    }

    if (enableWorkflow) {
      await collectAndSaveFormatTaskFromWorkflows(client, converter);
    }

    let hasMore: boolean = true;
    let totalCollected = 0;
    let totalFailedTasks = 0;

    for (let i = 0; hasMore; i++) {
      const result = await collectAndSaveFormatTask({
        maxItems,
        offset: i * maxItems,
        append: i === 0 ? (enableWorkflow ? true : false) : true,
      });

      hasMore = result.detail.data?.pagination?.hasNextPage || false;

      if (result.detail.data?.itemsCollected) {
        totalCollected = totalCollected + result.detail.data?.itemsCollected;
      }

      if (result.detail.data?.failedTasks) {
        totalFailedTasks = totalFailedTasks + result.detail.data?.failedTasks;
      }
    }

    // 如果enableWorkflow为false，并且历史任务数量为0，那么强制调用一次从工作流中获取工作流
    if (!enableWorkflow && totalCollected - totalFailedTasks <= 0) {
      await collectAndSaveFormatTaskFromWorkflows(client, converter);
    }

    const content = await readFile(COMMON.WORKFLOW_PATH, "utf-8");

    return ResultToMcpStringResponse(content);
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
    title: "根据prompt_id获取任务详情",
    description: `根据prompt_id获取任务详情，包括prompt、outputs、status、meta等项内容`,
    inputSchema: {
      promptId: z.string().describe(t("workflow.promptId")),
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
        "工作流定义已获取，请利用返回的 JSON Schema 准确解析参数语义并严格遵守格式约束。",
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
  "cui_mount_dynamic_tool",
  {
    title: "挂载动态工具",
    description: `用于动态生成专用的工作流执行函数。调用成功后立即停止生成。等待 Host 刷新上下文后，于下一轮对话调用新生成的 cui_execute_dynamic_task_{workflow_name}。`,
    inputSchema: {
      promptId: z.string().describe("目标工作流名称"),
      toolName: z
        .string()
        .regex(
          /^[a-zA-Z0-9_-]+$/,
          "Tool 名称只能包含字母、数字、下划线、连字符",
        )
        .describe(
          "唯一工具后缀名（纯英文，如 flux_dev），用于生成工具名 cui_execute_dynamic_task_{workflow_name}，只能包含字母、数字、下划线、连字符",
        ),
      title: z.string().optional().describe("可选，Tool 的显示标题"),
      description: z.string().optional().describe("可选，Tool 的详细描述"),
    },
  },
  withMcpErrorHandling(async ({ promptId, toolName, title, description }) => {
    // 检查 Tool 名称是否已存在
    if (hasDynamicTool(toolName)) {
      return ResultToMcpResponse(
        error(`Tool "${toolName}" 已存在，请使用其他名称`),
      );
    }

    const startTime = Date.now();

    // 获取任务详情
    const result = await getTaskDetailByPromptId({
      promptId: promptId,
    });

    if (!result.success || !result.detail.data) {
      return ResultToMcpResponse(error("获取任务详情失败"));
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
        `成功创建动态 Tool: ${toolName}`,
        response,
        {
          action: "cui_mount_dynamic_tool",
        },
        executionTime,
      ),
    );
  }),
);

/**
 * @METHOD
 * @description 列出所有已创建的动态 Workflow Tools
 * @author LaiFQZzr
 * @date 2026/02/03 14:50
 */
// server.registerTool(
//   "cui_list_dynamic_tools",
//   {
//     title: "列出所有动态 Workflow Tools",
//     description: `获取所有通过 cui_mount_dynamic_tool 创建的动态 Tool 列表`,
//     inputSchema: {},
//   },
//   withMcpErrorHandling(async () => {
//     const startTime = Date.now();

//     const tools = getAllDynamicTools();

//     const executionTime = Date.now() - startTime;

//     const response: ListDynamicWorkflowToolData = {
//       count: tools.length,
//       tools: tools.map((tool) => ({
//         name: tool.name,
//         title: tool.title,
//         description: tool.description,
//         sourcePromptId: tool.sourcePromptId,
//         configurableParamsCount: tool.configurableParams.length,
//         createdAt: new Date(tool.createdAt).toISOString(),
//       })),
//     };

//     return ResultToMcpResponse(
//       ok(
//         `成功获取所有动态 Workflow Tools`,
//         response,
//         {
//           action: "cui_list_dynamic_tools",
//         },
//         executionTime,
//       ),
//     );
//   }),
// );

/**
 * @METHOD
 * @description 执行动态 Workflow Tool
 * @author LaiFQZzr
 * @date 2026/02/03 14:50
 */
server.registerTool(
  "cui_execute_dynamic_tool",
  {
    title: "执行工作流任务（动态构建后的工具函数）",
    description: `执行 {workflow_name} 的专用工具。仅填充用户可见参数。准确映射，禁止臆造字段。`,
    inputSchema: {
      toolName: z
        .string()
        .describe(
          "执行 {workflow_name} 的专用工具。仅填充用户可见参数。准确映射，禁止臆造字段。",
        ),
      isAsync: z
        .boolean()
        .default(false)
        .describe("是否以异步方式执行任务，默认为否，仅用户明确要求时改为是。"),
      params: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          "要修改的参数，key 格式为 nodeId_inputKey，未提供的参数使用默认值",
        ),
    },
  },
  withMcpErrorHandling(async ({ toolName, isAsync, params = {} }, extra) => {
    const startTime = Date.now();

    const tool = getDynamicTool(toolName);

    if (!tool) {
      return ResultToMcpResponse(
        errorWithDetail(
          `Tool "${toolName}" 不存在`,
          `availableTools: ${getAllDynamicTools().map((t) => t.name)}`,
        ),
      );
    }

    if (!client.isConnected()) {
      await client.connect();
    }

    if (!client.isConnected()) {
      throw new McpError(ErrorCode.InternalError, "WebSocket服务器未连接");
    }

    // 获取拼接AGENT修改参数后的Prompt
    const execResult = await executeDynamicWorkflowTool(
      toolName,
      params,
      client,
    );

    // 根据拼接后的Prompt执行工作流
    const clientId = client.getClientId();
    console.error(`[工作流提交] Client ID: ${clientId}`);

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
            `工作流执行失败: ${executionResult.error}`,
            `Prompt ID: ${submitResult.prompt_id}`,
          ),
        );
      }

      const executionTime = Date.now() - startTime;

      return ResultToMcpResponse(
        ok(
          "成功执行动态 Workflow Tool",
          {
            promptId: submitResult.prompt_id,
            img: buildComfyViewUrls(executionResult),
            outputs: executionResult.outputs,
          },
          {
            action: "cui_execute_dynamic_tool",
          },
          executionTime,
        ),
      );
    }

    const executionTime = Date.now() - startTime;

    return ResultToMcpResponse(
      ok(
        "成功执行动态 Workflow Tool",
        {
          promptId: submitResult.prompt_id,
          description:
            "选择异步执行，请用户一段时间后手动访问ComfyUI查看结果，对话结束",
        },
        {
          action: "cui_execute_dynamic_tool",
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
    title: "ComfyUI导入资产",
    description:
      "当用户提供一张图片的本地路径或网络链接时，调用此工具将图片上传并处理。",
    inputSchema: {
      fileSource: z
        .string()
        .describe("图片的本地绝对路径或网络 URL 链接（http/https）"),
      description: z
        .string()
        .optional()
        .describe(
          "用户对这次上传图片的描述，后续AGENT可参考这个描述来决定在多结点需要Asset替换时替换的结点",
        ),
      mimeType: z
        .string()
        .optional()
        .describe("图片类型(可选)，默认 image/png"),
    },
  },
  withMcpErrorHandling(async ({ fileSource, description, mimeType }) => {
    try {
      const startTime = Date.now();

      let buffer;
      let finalFileName = "uploaded_image.png";

      const isUrl = /^https?:\/\//i.test(fileSource);

      if (isUrl) {
        const res = await fetch(fileSource);

        if (!res.ok) {
          return ResultToMcpResponse(
            error(`无法下载网络图片，HTTP状态码: ${res.status}`),
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
            error(`本地文件不存在，请检查路径是否正确: ${fileSource}`),
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
          `图片：${finalFileName} 已成功导入ComfyUI Assets中`,
          { response, description },
          {
            action: "cui_upload_file",
          },
          executionTime,
        ),
      );
    } catch (err: any) {
      return ResultToMcpResponse(
        error(`导入ComfyUI Assets失败: ${err.message}`),
      );
    }
  }),
);

/**
 * @METHOD
 * @description 将工作流格式化任务注册为 AGENT 可见资源
 * @author LaiFQZzr
 * @date 2026/02/02 09:36
 */
server.registerResource(
  "workflow_tasks",
  COMMON.WORKFLOW_RESOURCE_URI,
  {
    title: "本地 Workflow 文件",
    description: "AGENT 生成并保存的工作流文件",
    mimeType: "application/json",
  },
  async (uri): Promise<ReadResourceResult> => {
    try {
      const content = await readFile(COMMON.WORKFLOW_PATH, "utf-8");

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: content,
          },
        ],
      };
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: "[]",
            },
          ],
        };
      }

      throw err;
    }
  },
);

export default server;
