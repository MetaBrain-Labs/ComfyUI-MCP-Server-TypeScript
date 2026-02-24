import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types";
import { api } from "../api/api";
import {
  ExecutePromptRequest,
  ExecutePromptResult,
  ExecutionResult,
} from "../types/execute";
import {
  ComfyPromptConfig,
  ComfyTaskItem,
  ComfyTaskResponse,
} from "../types/task";
import { ComfyClient } from "../utils/ws";

export interface FetchTasksOptions {
  maxItems?: number;
  offset?: number;
}

export interface FetchTaskOptions {
  promptId: string;
}

export interface ExecuteTaskOptions {
  prompts: ComfyPromptConfig;
  clientId: string;
}

export interface WaitForExecutionOptions {
  client: ComfyClient;
  promptId: string;
  timeout?: number;
  onProgress?: (progress: ExecutionProgress) => void;
}

/** 执行进度信息 */
export interface ExecutionProgress {
  /** 当前执行阶段 */
  stage: "starting" | "executing" | "progress" | "completed" | "error";
  /** 提示信息 */
  message: string;
  /** 当前进度 (0-100) */
  percent?: number;
  /** 当前执行的节点 ID */
  nodeId?: string;
  /** 当前值 (如采样步数当前值) */
  current?: number;
  /** 最大值 (如采样步数总步数) */
  max?: number;
  /** 已执行时间 (毫秒) */
  elapsedTime?: number;
}

/**
 * @METHOD
 * @description 获取历史任务（支持分页）
 * @author LaiFQZzr
 * @date 2026/01/20 11:50
 */
export async function fetchHistoryTasks(
  options: FetchTasksOptions,
): Promise<{ successTasks: ComfyTaskResponse; total: number; fail: number }> {
  const { maxItems, offset } = options;

  const res = await api.pageHistoryTasks(maxItems, offset);

  const total = Object.entries(res).length;

  const successTasks = Object.fromEntries(
    Object.entries(res).filter(
      ([uuid, item]) => item.status.status_str === "success",
    ),
  ) as ComfyTaskResponse;

  const fail = total - Object.entries(successTasks).length;

  return { successTasks, total, fail };
}

/**
 * @METHOD
 * @description 获取指定promptIds对应的历史任务信息
 * @author LaiFQZzr
 * @date 2026/02/12 15:44
 */
export async function fetchUserWorkflow(
  availableWorkflow: string[],
): Promise<ComfyTaskResponse> {
  let historyTasks: [string, ComfyTaskItem][] = [];

  for (const promptId of availableWorkflow) {
    const res = await api.getDetailHistoryTasks(promptId);

    historyTasks = historyTasks.concat(Object.entries(res));
  }

  const successTasks = Object.fromEntries(historyTasks) as ComfyTaskResponse;

  if (successTasks === null) {
    throw new McpError(
      ErrorCode.InternalError,
      "Invalid detail tasks response",
    );
  }

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
  const { promptId } = options;

  const res = await api.getDetailHistoryTasks(promptId);

  const successTasks = Object.fromEntries(
    Object.entries(res).filter(([uuid, item]) => {
      if (item.status.status_str === "success") {
        return true;
      } else {
        const isExecutionInterrupted = item.status.messages.filter((item) => {
          return item[0] === "execution_interrupted";
        });
        return isExecutionInterrupted.length > 0;
      }
    }),
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
  const { prompts, clientId } = options;

  if (!clientId) {
    throw new McpError(
      ErrorCode.InternalError,
      `不存在WS客户端ID，请检查是否正确连接WS服务器`,
    );
  }

  const data: ExecutePromptRequest = {
    client_id: clientId,
    prompt: prompts,
  };

  const res = await api.prompt(data);

  return res;
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
  const { client, promptId, timeout = 10 * 60 * 1000, onProgress } = options;
  const startTime = Date.now();

  console.error(`[等待执行] 开始监听 Prompt ID: ${promptId}`);

  // 发送进度报告的辅助函数
  const reportProgress = (progress: ExecutionProgress) => {
    if (onProgress) {
      onProgress({
        ...progress,
        elapsedTime: Date.now() - startTime,
      });
    }
  };

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
        reportProgress({
          stage: "starting",
          message: "工作流开始执行",
          percent: 0,
        });
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
        reportProgress({
          stage: "executing",
          message: `正在执行节点: ${data.node}`,
          nodeId: data.node,
        });
      } else {
        console.error(
          `[执行节点] prompt_id 不匹配: 收到 ${data.prompt_id}, 期望 ${promptId}`,
        );
      }
    };

    client.hook.onProgress = (data) => {
      originalHooks.onProgress(data);
      if (data.prompt_id === promptId) {
        const percent = Math.round((data.value / data.max) * 100);
        console.error(`[进度更新] ${data.value}/${data.max} (${percent}%)`);
        reportProgress({
          stage: "progress",
          message: `节点 ${data.node} 执行中: ${data.value}/${data.max}`,
          percent,
          nodeId: data.node,
          current: data.value,
          max: data.max,
        });
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
        reportProgress({
          stage: "completed",
          message: "工作流执行完成",
          percent: 100,
        });
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
        const errorMsg =
          data.exception_message || data.error || JSON.stringify(data);
        reportProgress({
          stage: "error",
          message: `执行出错: ${errorMsg}`,
        });
        resolve({
          success: false,
          promptId,
          error: errorMsg,
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

/**
 * @METHOD
 * @description 等待工作流执行中断
 * @author LaiFQZzr
 * @date 2026/02/13 11:20
 */
export async function waitForExecutionInterrupt(
  options: WaitForExecutionOptions,
): Promise<ExecutionResult> {
  const { client, promptId, timeout = 10 * 1000 } = options;
  const startTime = Date.now();

  console.error(`[等待中断信号] 开始监听 Prompt ID: ${promptId}`);

  return new Promise((resolve, reject) => {
    let isCompleted = false;

    // 设置超时
    const timeoutTimer = setTimeout(() => {
      if (!isCompleted) {
        isCompleted = true;
        cleanup();
        resolve({
          success: false,
          promptId,
          error: `工作流等待中断信号超时（${timeout / 1000}秒）`,
          executionTime: Date.now() - startTime,
        });
      }
    }, timeout);

    // 保存原始钩子函数
    const originalHooks = {
      onExecutionInterrupted: client.hook.onExecutionInterrupted.bind(
        client.hook,
      ),
    };

    // 清理函数：恢复原始钩子
    const cleanup = () => {
      clearTimeout(timeoutTimer);
      client.hook.onExecutionInterrupted = originalHooks.onExecutionInterrupted;
    };

    client.hook.onExecutionInterrupted = (data) => {
      console.error(`[onExecutionInterrupted] 收到消息:`, data);
      originalHooks.onExecutionInterrupted(data);
      if (data.prompt_id === promptId && !isCompleted) {
        isCompleted = true;
        cleanup();
        console.error(`[执行中断] Prompt ID: ${promptId}`);
        resolve({
          success: true,
          promptId,
          error: "工作流已收到中断信号",
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

/**
 * @METHOD
 * @description 等待工作流开始执行
 * @author LaiFQZzr
 * @date 2026/02/13 11:21
 */
export async function waitForExecutionStart(
  options: WaitForExecutionOptions,
): Promise<ExecutionResult> {
  const { client, promptId, timeout = 10 * 1000 } = options;
  const startTime = Date.now();

  console.error(`[等待开始信号] 开始监听 Prompt ID: ${promptId}`);

  return new Promise((resolve, reject) => {
    let isCompleted = false;

    // 设置超时
    const timeoutTimer = setTimeout(() => {
      if (!isCompleted) {
        isCompleted = true;
        cleanup();
        resolve({
          success: false,
          promptId,
          error: `工作流等待开始信号超时（${timeout / 1000}秒）`,
          executionTime: Date.now() - startTime,
        });
      }
    }, timeout);

    // 保存原始钩子函数
    const originalHooks = {
      onExecutionStart: client.hook.onExecutionStart.bind(client.hook),
    };

    // 清理函数：恢复原始钩子
    const cleanup = () => {
      clearTimeout(timeoutTimer);
      client.hook.onExecutionStart = originalHooks.onExecutionStart;
    };

    client.hook.onExecutionStart = (data) => {
      console.error(`[onExecutionStart] 收到消息:`, data);
      originalHooks.onExecutionStart(data);
      if (data.prompt_id === promptId && !isCompleted) {
        isCompleted = true;
        cleanup();
        console.error(`[执行开始] Prompt ID: ${promptId}`);
        resolve({
          success: true,
          promptId,
          error: "工作流已收到开始信号",
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
