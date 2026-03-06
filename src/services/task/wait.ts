import { ExecutionResult } from "../../types/execute";
import { ComfyClient } from "../../utils/ws";
import { ExecutionProgress } from "./execution";

export interface WaitForExecutionOptions {
  client: ComfyClient;
  promptId: string;
  timeout?: number;
  onProgress?: (progress: ExecutionProgress) => void;
}

/**
 * 等待工作流执行完成
 */
export async function waitForExecutionCompletion(
  options: WaitForExecutionOptions,
): Promise<ExecutionResult> {
  const { client, promptId, timeout = 10 * 60 * 1000, onProgress } = options;
  const startTime = Date.now();

  console.error(`[等待执行] 开始监听 Prompt ID: ${promptId}`);

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
        if (data.output) {
          outputs[data.node] = data.output;
        }
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
      }
    };
  });
}

/**
 * 等待工作流执行中断
 */
export async function waitForExecutionInterrupt(
  options: WaitForExecutionOptions,
): Promise<ExecutionResult> {
  const { client, promptId, timeout = 20 * 1000 } = options;
  const startTime = Date.now();

  console.error(`[等待中断信号] 开始监听 Prompt ID: ${promptId}`);

  return new Promise((resolve, reject) => {
    let isCompleted = false;

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

    const originalHooks = {
      onExecutionInterrupted: client.hook.onExecutionInterrupted.bind(
        client.hook,
      ),
    };

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
      }
    };
  });
}

/**
 * 等待工作流开始执行
 */
export async function waitForExecutionStart(
  options: WaitForExecutionOptions,
): Promise<ExecutionResult> {
  const { client, promptId, timeout = 20 * 1000 } = options;
  const startTime = Date.now();

  console.error(`[等待开始信号] 开始监听 Prompt ID: ${promptId}`);

  return new Promise((resolve, reject) => {
    let isCompleted = false;

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

    const originalHooks = {
      onExecutionStart: client.hook.onExecutionStart.bind(client.hook),
    };

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
      }
    };
  });
}
