import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types";
import axios from "axios";
import { ExecutePromptResult, ExecutionResult } from "../interface/execute";
import { ComfyPromptConfig, ComfyTaskResponse } from "../interface/task";
import { ComfyClient } from "../ws";

export interface FetchTasksOptions {
  baseUrl: string;
  maxItems?: number;
  offset?: number;
}

export interface FetchTaskOptions {
  baseUrl: string;
  promptId: string;
}

export interface ExecuteTaskOptions {
  baseUrl: string;
  prompts: ComfyPromptConfig;
  clientId?: string;
}

export interface WaitForExecutionOptions {
  client: ComfyClient;
  promptId: string;
  timeout?: number;
}

/**
 * @METHOD
 * @description 获取历史任务（支持分页）
 * @author LaiFQZzr
 * @date 2026/01/20 11:50
 */
export async function fetchHistoryTasks(
  options: FetchTasksOptions,
): Promise<ComfyTaskResponse> {
  const { baseUrl, maxItems = 3, offset = 0 } = options;

  const url = `${baseUrl}/history?max_items=${maxItems}&offset=${offset}`;

  const res = await axios.get<ComfyTaskResponse>(url);

  if (typeof res.data !== "object" || res.data === null) {
    throw new McpError(
      ErrorCode.InternalError,
      "Invalid history tasks response",
    );
  }

  const successTasks = Object.fromEntries(
    Object.entries(res.data).filter(
      ([uuid, item]) => item.status.status_str === "success",
    ),
  ) as ComfyTaskResponse;

  return successTasks;
}

/**
 * @METHOD
 * @description 获取历史任务（支持分页）
 * @author LaiFQZzr
 * @date 2026/01/20 11:50
 */
export async function fetchTaskByPromptId(
  options: FetchTaskOptions,
): Promise<ComfyPromptConfig> {
  const { baseUrl, promptId } = options;

  const url = `${baseUrl}/history/${promptId}`;

  const res = await axios.get<ComfyTaskResponse>(url);

  if (typeof res.data !== "object" || res.data === null) {
    throw new McpError(
      ErrorCode.InternalError,
      "Invalid detail tasks response",
    );
  }

  const successTasks = Object.fromEntries(
    Object.entries(res.data).filter(
      ([uuid, item]) => item.status.status_str === "success",
    ),
  ) as ComfyTaskResponse;

  if (successTasks === null) {
    throw new McpError(
      ErrorCode.InternalError,
      "Invalid detail tasks response",
    );
  }

  return Object.values(successTasks)[0].prompt[2];
}

/**
 * @METHOD
 * @description 执行工作流任务
 * @author LaiFQZzr
 * @date 2026/02/04 15:59
 */
export async function executeWorkflowTaskByPrompts(
  options: ExecuteTaskOptions,
): Promise<ExecutePromptResult> {
  const { baseUrl, prompts, clientId } = options;

  const url = `${baseUrl}/prompt`;
  const data: any = { prompt: { ...prompts } };

  // 如果有 clientId，传递给服务器以关联 WebSocket 消息
  if (clientId) {
    data.client_id = clientId;
  }

  const res = await axios.post<ExecutePromptResult>(url, data);

  if (res.status !== 200) {
    throw new McpError(ErrorCode.InternalError, `执行工作流失败`);
  }

  return res.data;
}

/**
 * @METHOD
 * @description 等待工作流执行完成
 *              通过 WebSocket 监听执行状态，直到收到 execution_success 或 execution_error
 * @author LaiFQZzr
 * @date 2026/02/04 17:10
 */
export async function waitForExecutionCompletion(
  options: WaitForExecutionOptions,
): Promise<ExecutionResult> {
  const { client, promptId, timeout = 5 * 60 * 1000 } = options;
  const startTime = Date.now();

  console.error(`[等待执行] 开始监听 Prompt ID: ${promptId}`);

  return new Promise((resolve, reject) => {
    let isCompleted = false;
    const outputs: Record<string, any> = {};

    // 设置超时
    const timeoutTimer = setTimeout(() => {
      if (!isCompleted) {
        isCompleted = true;
        cleanup();
        resolve({
          success: false,
          promptId,
          error: `工作流执行超时（${timeout / 1000}秒）`,
          executionTime: Date.now() - startTime,
        });
      }
    }, timeout);

    // 保存原始钩子函数
    const originalHooks = {
      onExecutionStart: client.hook.onExecutionStart.bind(client.hook),
      onNodeExecuting: client.hook.onNodeExecuting.bind(client.hook),
      onProgress: client.hook.onProgress.bind(client.hook),
      onExecuted: client.hook.onExecuted.bind(client.hook),
      onExecutionSuccess: client.hook.onExecutionSuccess.bind(client.hook),
      onExecutionError: client.hook.onExecutionError.bind(client.hook),
      onExecutionInterrupted: client.hook.onExecutionInterrupted.bind(
        client.hook,
      ),
    };

    // 清理函数：恢复原始钩子
    const cleanup = () => {
      clearTimeout(timeoutTimer);
      client.hook.onExecutionStart = originalHooks.onExecutionStart;
      client.hook.onNodeExecuting = originalHooks.onNodeExecuting;
      client.hook.onProgress = originalHooks.onProgress;
      client.hook.onExecuted = originalHooks.onExecuted;
      client.hook.onExecutionSuccess = originalHooks.onExecutionSuccess;
      client.hook.onExecutionError = originalHooks.onExecutionError;
      client.hook.onExecutionInterrupted = originalHooks.onExecutionInterrupted;
    };

    // 重写钩子函数来监听执行状态
    client.hook.onExecutionStart = (data) => {
      console.error(`[onExecutionStart] 收到消息:`, data);
      originalHooks.onExecutionStart(data);
      if (data.prompt_id === promptId) {
        console.error(`[执行开始] Prompt ID: ${promptId}`);
      } else {
        console.error(
          `[执行开始] prompt_id 不匹配: 收到 ${data.prompt_id}, 期望 ${promptId}`,
        );
      }
    };

    client.hook.onNodeExecuting = (data) => {
      console.error(`[onNodeExecuting] 收到消息:`, data);
      originalHooks.onNodeExecuting(data);
      if (data.prompt_id === promptId && data.node) {
        console.error(`[执行节点] Node: ${data.node}`);
      } else {
        console.error(
          `[执行节点] prompt_id 不匹配: 收到 ${data.prompt_id}, 期望 ${promptId}`,
        );
      }
    };

    client.hook.onProgress = (data) => {
      originalHooks.onProgress(data);
      if (data.prompt_id === promptId) {
        const percent = ((data.value / data.max) * 100).toFixed(1);
        console.error(`[进度更新] ${data.value}/${data.max} (${percent}%)`);
      }
    };

    client.hook.onExecuted = (data) => {
      console.error(`[onExecuted] 收到消息:`, data);
      originalHooks.onExecuted(data);
      if (data.prompt_id === promptId) {
        console.error(`[节点完成] Node: ${data.node}`);
        // 收集输出
        if (data.output) {
          outputs[data.node] = data.output;
        }
      } else {
        console.error(
          `[节点完成] prompt_id 不匹配: 收到 ${data.prompt_id}, 期望 ${promptId}`,
        );
      }
    };

    client.hook.onExecutionSuccess = (data) => {
      console.error(`[onExecutionSuccess] 收到消息:`, data);
      originalHooks.onExecutionSuccess(data);
      if (data.prompt_id === promptId && !isCompleted) {
        isCompleted = true;
        cleanup();
        console.error(`[执行成功] Prompt ID: ${promptId}`);
        resolve({
          success: true,
          promptId,
          outputs,
          executionTime: Date.now() - startTime,
        });
      } else if (data.prompt_id !== promptId) {
        console.error(
          `[执行成功] prompt_id 不匹配: 收到 ${data.prompt_id}, 期望 ${promptId}`,
        );
      }
    };

    client.hook.onExecutionError = (data) => {
      console.error(`[onExecutionError] 收到消息:`, data);
      originalHooks.onExecutionError(data);
      if (data.prompt_id === promptId && !isCompleted) {
        isCompleted = true;
        cleanup();
        console.error(`[执行错误] Prompt ID: ${promptId}`, data);
        resolve({
          success: false,
          promptId,
          error: data.exception_message || data.error || JSON.stringify(data),
          executionTime: Date.now() - startTime,
        });
      } else if (data.prompt_id !== promptId) {
        console.error(
          `[执行错误] prompt_id 不匹配: 收到 ${data.prompt_id}, 期望 ${promptId}`,
        );
      }
    };

    client.hook.onExecutionInterrupted = (data) => {
      console.error(`[onExecutionInterrupted] 收到消息:`, data);
      originalHooks.onExecutionInterrupted(data);
      if (data.prompt_id === promptId && !isCompleted) {
        isCompleted = true;
        cleanup();
        console.error(`[执行中断] Prompt ID: ${promptId}`);
        resolve({
          success: false,
          promptId,
          error: "工作流执行被中断",
          executionTime: Date.now() - startTime,
        });
      } else if (data.prompt_id !== promptId) {
        console.error(
          `[执行中断] prompt_id 不匹配: 收到 ${data.prompt_id}, 期望 ${promptId}`,
        );
      }
    };
  });
}
