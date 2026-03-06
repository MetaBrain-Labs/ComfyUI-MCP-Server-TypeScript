import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types";
import { api } from "../../api/api";
import {
  ExecutePromptRequest,
  ExecutePromptResult,
} from "../../types/execute";
import { ComfyPromptConfig } from "../../types/task";

export interface ExecuteTaskOptions {
  prompts: ComfyPromptConfig;
  clientId: string;
}

/** 执行进度信息 */
export interface ExecutionProgress {
  stage: "starting" | "executing" | "progress" | "completed" | "error";
  message: string;
  percent?: number;
  nodeId?: string;
  current?: number;
  max?: number;
  elapsedTime?: number;
}

/**
 * 执行工作流任务
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

  return await api.prompt(data);
}

/**
 * 执行自定义工作流任务
 */
export async function executeCustomWorkflowTaskByPrompts(
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

  return await api.prompt(data);
}
